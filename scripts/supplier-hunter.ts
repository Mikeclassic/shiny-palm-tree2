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
  console.log("🕵️ Starting Hunter (Working URL Logic + Google Cache Price)...");

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

  await page.setViewport({ width: 1920, height: 1080 });

  for (const product of productsToHunt) {
    try {
        console.log(`\n🔍 Hunting: ${product.title}`);

        // ============================================================
        // STEP 1: URL EXTRACTION (EXACT WORKING LOGIC)
        // ============================================================
        const lensUrl = `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(product.imageUrl)}&q=aliexpress`;
        
        console.log("   📸 Visiting Lens Multisearch...");
        await page.goto(lensUrl, { waitUntil: 'domcontentloaded' });
        
        // Handle Consent (Polish/German/English)
        try {
            const consentButton = await page.$x("//button[contains(., 'Reject') or contains(., 'I agree') or contains(., 'Odrzuć') or contains(., 'Zaakceptuj') or contains(., 'Zgadzam') or contains(., 'Alle ablehnen')]");
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

        // ============================================================
        // STEP 2: PRICE VIA GOOGLE CACHE (BYPASS ALIEXPRESS)
        // ============================================================
        
        // Extract ID
        const idMatch = foundLink.match(/\/item\/(\d+)\.html/);
        const itemId = idMatch ? idMatch[1] : null;

        if (!itemId) {
            console.log("   ⚠️ Link found (ID missing). Saving link only.");
            await prisma.product.update({ where: { id: product.id }, data: { supplierUrl: foundLink, lastSourced: new Date() }});
            continue;
        }

        console.log(`   🔗 Found ID: ${itemId}`);
        console.log("   🌎 Checking Google Cache for Price...");

        // Search Google for the specific ID to see the price snippet
        await page.goto(`https://www.google.com/search?q=site:aliexpress.com+${itemId}`, { waitUntil: 'domcontentloaded' });
        
        // Handle Consent AGAIN (because it's a new domain visit)
        try {
            const consentButton = await page.$x("//button[contains(., 'Reject') or contains(., 'I agree') or contains(., 'Odrzuć') or contains(., 'Zaakceptuj') or contains(., 'Zgadzam') or contains(., 'Alle ablehnen')]");
            if (consentButton.length > 0) {
                await consentButton[0].click();
                await randomSleep(2000, 3000);
            }
        } catch (err) {}

        await randomSleep(2000, 4000);

        const priceFound = await page.evaluate(() => {
            const text = document.body.innerText;
            // Regex for various currencies (US $, zł, €)
            // Matches: "US $12.34", "12,34 zł", "€ 12.34"
            const patterns = [
                /(?:US\s?\$|\$|€|£|zł)\s*(\d+([.,]\d+)?)/i,
                /(\d+([.,]\d+)?)\s*(?:zł|€|£)/i
            ];

            for (const p of patterns) {
                const match = text.match(p);
                if (match) {
                    // Extract the number part
                    let raw = match[1] || match[0];
                    // Clean non-numeric except dot/comma
                    raw = raw.replace(/[^0-9.,]/g, '');
                    return raw;
                }
            }
            return null;
        });

        if (priceFound) {
            // Normalize European format (12,99 -> 12.99)
            let cleanString = priceFound;
            if (cleanString.includes(',') && !cleanString.includes('.')) {
                cleanString = cleanString.replace(',', '.');
            }
            const priceVal = parseFloat(cleanString);

            console.log(`   💰 Price Found on Google: ${priceVal}`);

            await prisma.product.update({
                where: { id: product.id },
                data: {
                    supplierUrl: foundLink,
                    supplierPrice: priceVal,
                    lastSourced: new Date()
                }
            });
            console.log("   ✅ Saved.");
        } else {
            console.log("   ⚠️ Price not found in Google Snippet. Saving URL only.");
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