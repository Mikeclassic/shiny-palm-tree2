// @ts-nocheck
import { PrismaClient } from '@prisma/client';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

// Enable Stealth Mode (Hides "Navigator.webdriver" and other bot signals)
puppeteer.use(StealthPlugin());

const prisma = new PrismaClient();

// Helper: Sleep for a random amount of time (Human behavior)
const randomSleep = (min = 1000, max = 3000) => {
  const ms = Math.floor(Math.random() * (max - min + 1) + min);
  return new Promise(resolve => setTimeout(resolve, ms));
};

async function main() {
  console.log("🕵️ Starting Stealth Supplier Hunter...");

  const productsToHunt = await prisma.product.findMany({
    where: { supplierUrl: null },
    take: 3, // Low batch size to stay under radar
    orderBy: { createdAt: 'desc' }
  });

  if (productsToHunt.length === 0) {
    console.log("✅ All products have suppliers!");
    return;
  }

  console.log(`🎯 Targeting ${productsToHunt.length} products with Stealth Mode...`);

  const browser = await puppeteer.launch({
    headless: "new", // "new" is faster, but false is safer for debugging if needed
    args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled', // Extra evasion
        '--window-size=1920,1080'
    ]
  });

  const page = await browser.newPage();
  
  // Set Viewport to standard Desktop
  await page.setViewport({ width: 1920, height: 1080 });

  // Use a high-quality recent User Agent
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  for (const product of productsToHunt) {
    try {
        console.log(`\n🔍 Hunting: ${product.title}`);

        // 1. Google Search
        const searchUrl = `https://www.google.com/search?q=site:aliexpress.com+${encodeURIComponent(product.title)}`;
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
        
        await randomSleep(2000, 4000); // Think like a human

        // 2. Extract Link
        const firstLink = await page.$eval('a[href*="aliexpress.com/item"]', el => el.href).catch(() => null);

        if (!firstLink) {
            console.log("   ❌ No AliExpress result found.");
            continue;
        }

        console.log(`   🔗 Visiting: ${firstLink}`);

        // 3. Visit AliExpress
        await page.goto(firstLink, { waitUntil: 'domcontentloaded' });
        
        // Human Scroll: Scroll down a bit to trigger lazy loading
        await page.evaluate(() => { window.scrollBy(0, 500); });
        await randomSleep(3000, 5000); // Wait for price to load

        // 4. Extract Price (Robust Selectors)
        const priceText = await page.evaluate(() => {
            const selectors = [
                '.product-price-value', 
                '.price--current--I3Gb7_V', 
                '[class*="price--current"]',
                '.uniform-banner-box-price',
                '.product-price-current'
            ];
            
            for (const s of selectors) {
                const el = document.querySelector(s);
                if (el && el.innerText) return el.innerText;
            }
            return null;
        });

        if (priceText) {
            const cleanPrice = parseFloat(priceText.replace(/[^0-9.]/g, ''));
            console.log(`   💰 Found Price: $${cleanPrice}`);

            await prisma.product.update({
                where: { id: product.id },
                data: {
                    supplierUrl: firstLink,
                    supplierPrice: cleanPrice,
                    lastSourced: new Date()
                }
            });
            console.log("   ✅ Saved.");
        } else {
            console.log("   ⚠️ Price not found (Anti-bot might be active or layout changed).");
            // Save URL anyway
            await prisma.product.update({
                where: { id: product.id },
                data: { supplierUrl: firstLink, lastSourced: new Date() }
            });
        }

    } catch (e) {
        console.error(`   ❌ Error: ${e.message}`);
    }
  }

  await browser.close();
  await prisma.$disconnect();
  console.log("\n🏁 Stealth Hunt Complete.");
}

main();