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
  console.log("🦖 Starting Omnivore Hunter (Source Scan + Multi-Engine)...");

  if (!process.env.PROXY_SERVER || !process.env.PROXY_USERNAME) {
      console.error("❌ Error: Missing PROXY secrets.");
      process.exit(1);
  }

  const productsToHunt = await prisma.product.findMany({
    where: { supplierUrl: null },
    take: 3, 
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

  // 2. AUTHENTICATE PROXY
  await page.authenticate({
    username: process.env.PROXY_USERNAME,
    password: process.env.PROXY_PASSWORD
  });

  await page.setViewport({ width: 1920, height: 1080 });

  for (const product of productsToHunt) {
    try {
        console.log(`\n🔍 Hunting: ${product.title}`);

        // --- STEP 1: GOOGLE LENS (ID EXTRACTION) ---
        const lensUrl = `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(product.imageUrl)}&q=aliexpress`;
        await page.goto(lensUrl, { waitUntil: 'domcontentloaded' });
        
        // Handle Consent
        try {
            const consentButton = await page.$x("//button[contains(., 'Reject all') or contains(., 'I agree') or contains(., 'Tout refuser') or contains(., 'Alle ablehnen')]");
            if (consentButton.length > 0) await consentButton[0].click();
        } catch (err) {}

        await randomSleep(2000, 4000);

        // STRATEGY: SCAN SOURCE CODE FOR ID
        // AliExpress IDs are 15-16 digits and usually start with 1005
        let itemId = await page.evaluate(() => {
            // 1. Try Links
            const anchors = Array.from(document.querySelectorAll('a'));
            const link = anchors.find(a => a.href.includes('aliexpress.com/item'));
            if (link) {
                const match = link.href.match(/\/item\/(\d+)\.html/);
                if (match) return match[1];
            }

            // 2. Try Source Code Regex (The "Nuclear" Option)
            // This finds the ID even if the link is hidden in JSON or redirects
            const bodyText = document.body.innerHTML;
            const idMatch = bodyText.match(/1005\d{12}/); // Matches 1005 + 12 digits
            if (idMatch) return idMatch[0];

            return null;
        });

        if (!itemId) {
            console.log("   ❌ No AliExpress ID found in source code.");
            await prisma.product.update({ where: { id: product.id }, data: { lastSourced: new Date() }});
            continue;
        }

        console.log(`   🆔 Found Item ID: ${itemId}`);
        const cleanLink = `https://www.aliexpress.com/item/${itemId}.html`;

        // --- STEP 2: SEARCH ENGINE PRICE CHECK ---
        let foundPrice = 0;

        // ATTEMPT A: GOOGLE (Forced US English)
        console.log("   🌎 Checking Google (US Mode)...");
        // &gl=us (Geo Location US) &hl=en (Language English) -> Critical for parsing
        await page.goto(`https://www.google.com/search?q=${itemId}+site:aliexpress.com&gl=us&hl=en`, { waitUntil: 'domcontentloaded' });
        await randomSleep(2000, 3000);
        
        foundPrice = await extractPriceFromPage(page);

        // ATTEMPT B: BING (Fallback if Google fails)
        if (foundPrice === 0) {
            console.log("   ⚠️ Google failed. Checking Bing...");
            await page.goto(`https://www.bing.com/search?q=site%3Aaliexpress.com+${itemId}`, { waitUntil: 'domcontentloaded' });
            await randomSleep(2000, 3000);
            foundPrice = await extractPriceFromPage(page);
        }

        // --- STEP 3: SAVE RESULTS ---
        if (foundPrice > 0) {
            console.log(`   💰 Price Found: $${foundPrice}`);
            await prisma.product.update({
                where: { id: product.id },
                data: {
                    supplierUrl: cleanLink,
                    supplierPrice: foundPrice,
                    lastSourced: new Date()
                }
            });
            console.log("   ✅ Saved.");
        } else {
            console.log("   ⚠️ Price not found in search snippets.");
            // Save link anyway
            await prisma.product.update({ where: { id: product.id }, data: { supplierUrl: cleanLink, lastSourced: new Date() }});
        }

    } catch (e) {
        console.error(`   ❌ Error: ${e.message}`);
    }
  }

  await browser.close();
  await prisma.$disconnect();
  console.log("\n🏁 Hunt Complete.");
}

// Helper: Scans page text for Price patterns
async function extractPriceFromPage(page) {
    return await page.evaluate(() => {
        const text = document.body.innerText;
        // Strategies:
        // 1. "US $12.34"
        // 2. "$12.34"
        // 3. "EUR 12,34"
        const patterns = [
            /US\s?\$(\d+(\.\d+)?)/,
            /\$(\d+(\.\d+)?)/,
            /€\s?(\d+([.,]\d+)?)/,
            /(\d+([.,]\d+)?)\s?€/
        ];

        for (const p of patterns) {
            const match = text.match(p);
            if (match) {
                // Return the raw number string
                let raw = match[1] || match[0];
                // Fix European commas
                if (raw.includes(',') && !raw.includes('.')) raw = raw.replace(',', '.');
                const val = parseFloat(raw.replace(/[^0-9.]/g, ''));
                if (val > 0.1) return val;
            }
        }
        return 0;
    });
}

main();