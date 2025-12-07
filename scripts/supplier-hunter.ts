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
  console.log("🕵️ Starting Hunter (Restored Polish URL Logic + Search Price)...");

  if (!process.env.PROXY_SERVER || !process.env.PROXY_USERNAME) {
      console.error("❌ Error: Missing PROXY secrets.");
      process.exit(1);
  }

  // Find products without a supplier
  const productsToHunt = await prisma.product.findMany({
    where: { supplierUrl: null },
    take: 10, 
    orderBy: { createdAt: 'desc' }
  });

  if (productsToHunt.length === 0) {
    console.log("✅ All products have suppliers!");
    return;
  }

  // 1. LAUNCH BROWSER (Using the exact config that worked)
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

  await page.setViewport({ width: 1920, height: 1080 });

  for (const product of productsToHunt) {
    try {
        console.log(`\n🔍 Hunting: ${product.title}`);

        // ============================================================
        // STEP 1: EXACT RESTORED URL LOGIC (DO NOT TOUCH)
        // ============================================================
        const lensUrl = `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(product.imageUrl)}&q=aliexpress`;
        
        console.log("   📸 Visiting Lens Multisearch...");
        await page.goto(lensUrl, { waitUntil: 'domcontentloaded' });
        
        // POLISH/GERMAN CONSENT HANDLER (From the working version)
        try {
            const consentButton = await page.$x("//button[contains(., 'Reject') or contains(., 'I agree') or contains(., 'Odrzuć') or contains(., 'Zaakceptuj') or contains(., 'Zgadzam')]");
            if (consentButton.length > 0) {
                console.log("   🍪 Clicking Consent...");
                await consentButton[0].click();
                // Critical Wait that was missing in the last attempt
                await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 5000 }).catch(() => {});
            }
        } catch (err) {}

        await randomSleep(3000, 6000); 

        const foundLink = await page.evaluate(() => {
            const anchors = Array.from(document.querySelectorAll('a'));
            const productLinks = anchors
                .map(a => a.href)
                .filter(href => href && href.includes('aliexpress.com/item'));
            return productLinks.length > 0 ? productLinks[0] : null;
        });

        if (!foundLink) {
            console.log("   ❌ No AliExpress link found.");
            await prisma.product.update({ where: { id: product.id }, data: { lastSourced: new Date() }});
            continue;
        }

        // ============================================================
        // STEP 2: SAFE PRICE EXTRACTION (Cookie + Search Result)
        // ============================================================
        
        // Extract ID from the found link
        const idMatch = foundLink.match(/\/item\/(\d+)\.html/);
        const itemId = idMatch ? idMatch[1] : null;

        if (!itemId) {
            console.log("   ⚠️ Link found but no ID. Skipping price check.");
            // Still save the URL because we found it!
            await prisma.product.update({ where: { id: product.id }, data: { supplierUrl: foundLink, lastSourced: new Date() }});
            continue;
        }

        console.log(`   🔗 Found ID: ${itemId}`);

        // 1. Set Global Cookie (Prevents "Slide to Verify" redirect loop)
        const cookie = {
            name: 'aep_usuc_f',
            value: 'site=glo&c_tp=USD&region=US&b_locale=en_US',
            domain: '.aliexpress.com',
            path: '/',
            secure: true,
        };
        await page.setCookie(cookie);

        // 2. Go to Search Page (Lighter than Product Page)
        const searchUrl = `https://www.aliexpress.com/wholesale?SearchText=${itemId}`;
        
        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 45000 });
        await randomSleep(2000, 4000);

        // 3. Extract Price from Search Result Card
        const priceData = await page.evaluate(() => {
            // Find the first element that looks like a price with a $ sign
            // Search pages usually use specific classes like "multi--price-sale--"
            const allDivs = Array.from(document.querySelectorAll('div'));
            
            for (const div of allDivs) {
                const text = div.innerText;
                // Strict check for "US $12.34" format which appears on Global English site
                if (text.includes('$') && /\d+\.\d+/.test(text) && text.length < 20) {
                    return text.replace(/[^0-9.]/g, '');
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
                    supplierUrl: foundLink,
                    supplierPrice: cleanPrice,
                    lastSourced: new Date()
                }
            });
            console.log("   ✅ Saved.");
        } else {
            console.log("   ⚠️ Price not found on search page (saving URL only).");
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