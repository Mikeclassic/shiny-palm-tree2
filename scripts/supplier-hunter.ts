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
  console.log("🕵️ Starting Hunter (Consensus Protocol: Lens URL -> Search Page Price)...");

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

  // 1. LAUNCH BROWSER (Standard Desktop)
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

  // Standard User Agent (Best for Lens & Search Pages)
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
  await page.setViewport({ width: 1920, height: 1080 });

  for (const product of productsToHunt) {
    try {
        console.log(`\n🔍 Hunting: ${product.title}`);

        // ============================================================
        // STEP 1: URL EXTRACTION (PRESERVED - DO NOT TOUCH)
        // ============================================================
        const lensUrl = `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(product.imageUrl)}&q=aliexpress`;
        
        console.log("   📸 Visiting Lens Multisearch...");
        await page.goto(lensUrl, { waitUntil: 'domcontentloaded' });
        
        // Handle Consent (Polish/German/English/French)
        try {
            const consentButton = await page.$x("//button[contains(., 'Reject') or contains(., 'I agree') or contains(., 'Odrzuć') or contains(., 'Zaakceptuj') or contains(., 'Zgadzam') or contains(., 'Alle ablehnen') or contains(., 'Tout refuser')]");
            if (consentButton.length > 0) {
                console.log("   🍪 Clicking Consent...");
                await consentButton[0].click();
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

        console.log(`   🔗 Found: ${foundLink}`);

        // Extract ID
        const idMatch = foundLink.match(/\/item\/(\d+)\.html/);
        const itemId = idMatch ? idMatch[1] : null;

        if (!itemId) {
            console.log("   ⚠️ Link found but no ID. Saving URL only.");
            await prisma.product.update({ where: { id: product.id }, data: { supplierUrl: foundLink, lastSourced: new Date() }});
            continue;
        }

        // ============================================================
        // STEP 2: SEARCH PAGE BYPASS (The Reddit Method)
        // ============================================================
        
        // A. FORCE COOKIE (Critical for Proxy Stability)
        // This makes sure we get the Global site, not a broken local version
        await page.setCookie({
            name: 'aep_usuc_f',
            value: 'site=glo&c_tp=USD&region=US&b_locale=en_US',
            domain: '.aliexpress.com',
            path: '/'
        });

        // B. VISIT SEARCH RESULT PAGE
        // This page is much lighter and harder to block than the item page
        const searchUrl = `https://www.aliexpress.com/wholesale?SearchText=${itemId}`;
        console.log(`   🔎 Checking Search Page: ${searchUrl}`);
        
        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 45000 });
        await randomSleep(2000, 4000);

        // C. ROBUST EXTRACTION (Search Card)
        const priceFound = await page.evaluate(() => {
            // Try to find the specific price container in search results
            // Classes often change, so we look for structure or symbols
            
            // 1. Look for text containing "US $" or "$" followed by digits
            const bodyText = document.body.innerText;
            const match = bodyText.match(/(?:US\s?\$|\$)\s?(\d+(\.\d+)?)/);
            
            if (match) return match[1];

            // 2. Fallback: Look for specific price classes if text search fails
            const priceEls = document.querySelectorAll('[class*="price-"], [class*="Price-"]');
            for (const el of priceEls) {
                // Check if it looks like a price (contains numbers and symbol)
                if (el.innerText.match(/\d/) && (el.innerText.includes('$') || el.innerText.includes('US'))) {
                    return el.innerText.replace(/[^0-9.]/g, '');
                }
            }
            return null;
        });

        if (priceFound) {
            const cleanPrice = parseFloat(priceFound);
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
            // LOGGING THE PAGE TITLE AS REQUESTED
            const title = await page.title();
            console.log(`   ⚠️ Price not found. (Page Title: "${title}")`);
            
            // Save URL anyway
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