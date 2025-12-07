// @ts-nocheck
import { PrismaClient } from '@prisma/client';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const prisma = new PrismaClient();

const randomSleep = (min = 2000, max = 5000) => {
  const ms = Math.floor(Math.random() * (max - min + 1) + min);
  return new Promise(resolve => setTimeout(resolve, ms));
};

async function main() {
  console.log("🕵️ Starting Hunter (Cookie Force + Search Result Bypass)...");

  if (!process.env.PROXY_SERVER || !process.env.PROXY_USERNAME) {
      console.error("❌ Error: Missing PROXY secrets.");
      process.exit(1);
  }

  const productsToHunt = await prisma.product.findMany({
    where: { supplierUrl: null },
    take: 10, 
    orderBy: { createdAt: 'desc' }
  });

  if (productsToHunt.length === 0) {
    console.log("✅ All products have suppliers!");
    return;
  }

  // 1. LAUNCH BROWSER
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--window-size=1920,1080',
        `--proxy-server=http://${process.env.PROXY_SERVER}`
    ]
  });

  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(60000); 
  
  await page.authenticate({
    username: process.env.PROXY_USERNAME,
    password: process.env.PROXY_PASSWORD
  });

  // Set Desktop Viewport
  await page.setViewport({ width: 1920, height: 1080 });

  for (const product of productsToHunt) {
    try {
        console.log(`\n🔍 Hunting: ${product.title}`);

        // ============================================================
        // STEP 1: GOOGLE LENS (Preserved Working Logic)
        // ============================================================
        const lensUrl = `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(product.imageUrl)}&q=aliexpress`;
        
        await page.goto(lensUrl, { waitUntil: 'domcontentloaded' });
        
        // Handle Consent (Including Polish/German keys)
        try {
            const consentButton = await page.$x("//button[contains(., 'Reject') or contains(., 'I agree') or contains(., 'Odrzuć') or contains(., 'Zaakceptuj') or contains(., 'Zgadzam') or contains(., 'Alle ablehnen')]");
            if (consentButton.length > 0) {
                await consentButton[0].click();
                await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 5000 }).catch(() => {});
            }
        } catch (err) {}

        await randomSleep(3000, 6000); 

        const foundLink = await page.evaluate(() => {
            const anchors = Array.from(document.querySelectorAll('a'));
            const link = anchors.find(a => a.href && a.href.includes('aliexpress.com/item'));
            return link ? link.href : null;
        });

        if (!foundLink) {
            console.log("   ❌ No AliExpress link found.");
            await prisma.product.update({ where: { id: product.id }, data: { lastSourced: new Date() }});
            continue;
        }

        // Extract ID
        const idMatch = foundLink.match(/\/item\/(\d+)\.html/);
        const itemId = idMatch ? idMatch[1] : null;

        if (!itemId) {
            console.log("   ⚠️ Link found but no ID. Skipping.");
            continue;
        }

        console.log(`   🆔 Item ID: ${itemId}`);

        // ============================================================
        // STEP 2: COOKIE FORCE (The Fix)
        // ============================================================
        // We set a cookie to force "Global English USD" settings.
        // This prevents the redirect to "pl.aliexpress" which triggers the block.
        
        const cookie = {
            name: 'aep_usuc_f',
            value: 'site=glo&c_tp=USD&region=US&b_locale=en_US',
            domain: '.aliexpress.com',
            path: '/',
            secure: true,
        };
        await page.setCookie(cookie);

        // ============================================================
        // STEP 3: SEARCH RESULT BYPASS
        // ============================================================
        // Instead of the product page, we go to the Search Page for this specific ID.
        // The Search Page is lighter and less blocked.
        
        const searchUrl = `https://www.aliexpress.com/wholesale?SearchText=${itemId}`;
        console.log(`   🔗 Searching via: ${searchUrl}`);

        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 45000 });
        await randomSleep(2000, 4000);

        // Extract Price from the First Search Result
        const priceData = await page.evaluate(() => {
            // Strategy 1: Look for the specific "price" class in the first result card
            // Search results are usually in a container like #root or .search-item-card-wrapper-gallery
            
            // Try finding any text that looks like a price in the main container
            const mainContainer = document.querySelector('#root') || document.body;
            const text = mainContainer.innerText;
            
            // Look for "US $12.34" or "$12.34" near the top (since we searched precise ID)
            const match = text.match(/(?:US\s?\$|\$)\s?(\d+(\.\d+)?)/);
            
            if (match) return match[1];
            
            // Strategy 2: Look for specific price elements often used in search cards
            const priceEls = document.querySelectorAll('[class*="price-"], [class*="Price-"]');
            for (const el of priceEls) {
                if (el.innerText && el.innerText.includes('$')) {
                    return el.innerText.replace(/[^0-9.]/g, '');
                }
            }
            
            return null;
        });

        if (priceData) {
            const cleanPrice = parseFloat(priceData);
            console.log(`   💰 Price Found: $${cleanPrice}`);

            await prisma.product.update({
                where: { id: product.id },
                data: {
                    supplierUrl: foundLink, // Save original link
                    supplierPrice: cleanPrice,
                    lastSourced: new Date()
                }
            });
            console.log("   ✅ Saved.");
        } else {
            console.log("   ⚠️ Price not found on search page (might be blocked).");
            // Save link anyway
            await prisma.product.update({ where: { id: product.id }, data: { supplierUrl: foundLink, lastSourced: new Date() }});
        }

    } catch (e) {
        console.error(`   ❌ Error: ${e.message}`);
    }
  }

  await browser.close();
  await prisma.$disconnect();
  console.log("\n🏁 Hunt Complete.");
}

main();