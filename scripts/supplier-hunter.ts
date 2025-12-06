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
  console.log("🔍 Starting Google Cache Protocol (No-Click Extraction)...");

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

        // --- STEP 1: GOOGLE LENS (To find the ID) ---
        const lensUrl = `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(product.imageUrl)}&q=aliexpress`;
        await page.goto(lensUrl, { waitUntil: 'domcontentloaded' });
        
        // Handle Consent
        try {
            const consentButton = await page.$x("//button[contains(., 'Reject all') or contains(., 'I agree') or contains(., 'Tout refuser')]");
            if (consentButton.length > 0) await consentButton[0].click();
        } catch (err) {}

        await randomSleep(2000, 3000);

        // Find AliExpress Link to get the ID
        let foundLink = await page.evaluate(() => {
            const anchors = Array.from(document.querySelectorAll('a'));
            const productLinks = anchors
                .map(a => a.href)
                .filter(href => href && href.includes('aliexpress.com/item'));
            return productLinks.length > 0 ? productLinks[0] : null;
        });

        if (!foundLink) {
            console.log("   ❌ No AliExpress link found via Lens.");
            await prisma.product.update({ where: { id: product.id }, data: { lastSourced: new Date() }});
            continue;
        }

        // Extract ID (e.g., 10050012345678)
        const idMatch = foundLink.match(/\/item\/(\d+)\.html/);
        if (!idMatch) {
            console.log("   ⚠️ Could not parse Item ID from link.");
            continue;
        }
        const itemId = idMatch[1];
        console.log(`   🆔 Item ID: ${itemId}`);

        // --- STEP 2: GOOGLE SEARCH THE ID ---
        // We search the ID directly. The price is often in the meta description.
        console.log(`   🌎 Searching Google for ID: ${itemId}...`);
        
        // Note: We use 'site:aliexpress.com' to ensure we get the official listing
        await page.goto(`https://www.google.com/search?q=${itemId}+site:aliexpress.com`, { waitUntil: 'domcontentloaded' });
        await randomSleep(2000, 4000);

        // --- STEP 3: READ THE SEARCH RESULT SNIPPET ---
        const priceFound = await page.evaluate(() => {
            // Get all text from the search results
            // Google snippets usually put price in a span or div
            const bodyText = document.body.innerText;
            
            // Regex Strategies based on your screenshot
            const strategies = [
                /US\s?\$(\d+(\.\d+)?)/,      // Matches: US$38.55 or US $38.55
                /\$(\d+(\.\d+)?)/,           // Matches: $38.55
                /(\d+[\.,]\d+)\s?€/,         // Matches: 35,50 € (European)
                /€\s?(\d+[\.,]\d+)/          // Matches: €35.50
            ];

            for (const regex of strategies) {
                const match = bodyText.match(regex);
                if (match) {
                    return match[1] || match[0];
                }
            }
            return null;
        });

        if (priceFound) {
            // Clean the number
            let rawString = priceFound.toString();
            // Fix comma decimals if present (European format)
            if (rawString.includes(',') && !rawString.includes('.')) {
                rawString = rawString.replace(',', '.');
            }
            // Remove non-numeric chars except dot
            const cleanPrice = parseFloat(rawString.replace(/[^0-9.]/g, ''));

            if (cleanPrice > 0.1) {
                console.log(`   💰 Price Found on Google: $${cleanPrice}`);
                
                await prisma.product.update({
                    where: { id: product.id },
                    data: {
                        supplierUrl: foundLink, // We keep the original link we found in step 1
                        supplierPrice: cleanPrice,
                        lastSourced: new Date()
                    }
                });
                console.log("   ✅ Saved.");
            } else {
                 console.log("   ⚠️ Price detected was invalid/zero.");
            }
        } else {
            console.log("   ⚠️ Price not visible in search results.");
            // Still save the link so user can check manually
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