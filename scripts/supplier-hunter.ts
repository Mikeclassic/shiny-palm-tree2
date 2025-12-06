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
  console.log("🕵️ Starting DuckDuckGo Supplier Hunter...");

  // 1. Find products needing a supplier
  const productsToHunt = await prisma.product.findMany({
    where: { supplierUrl: null },
    take: 3, 
    orderBy: { createdAt: 'desc' }
  });

  if (productsToHunt.length === 0) {
    console.log("✅ All products have suppliers!");
    return;
  }

  console.log(`🎯 Targeting ${productsToHunt.length} products...`);

  const browser = await puppeteer.launch({
    headless: "new",
    args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--window-size=1366,768'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  for (const product of productsToHunt) {
    try {
        console.log(`\n🔍 Hunting: ${product.title}`);

        // --- THE FIX: USE DUCKDUCKGO HTML VERSION ---
        // Google blocks GitHub Actions IPs. DDG is much friendlier.
        // We use /html/ mode for faster, raw results.
        const searchUrl = `https://duckduckgo.com/html/?q=site:aliexpress.com+${encodeURIComponent(product.title)}`;
        
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
        await randomSleep(2000, 3000);

        // 2. Extract Link from DDG Results
        const foundLink = await page.evaluate(() => {
            // Find all anchor tags
            const anchors = Array.from(document.querySelectorAll('a'));
            
            // Look for AliExpress Item links
            const productLinks = anchors
                .map(a => a.href)
                .filter(href => href && href.includes('aliexpress.com/item'));

            return productLinks.length > 0 ? productLinks[0] : null;
        });

        if (!foundLink) {
            console.log("   ❌ No result found on DuckDuckGo.");
            // Mark as checked to prevent infinite loops on failed items
            await prisma.product.update({
                where: { id: product.id },
                data: { lastSourced: new Date() }
            });
            continue;
        }

        console.log(`   🔗 Found Link: ${foundLink}`);

        // 3. Visit AliExpress
        await page.goto(foundLink, { waitUntil: 'domcontentloaded' });
        
        // Anti-bot scroll
        await page.evaluate(() => { window.scrollBy(0, 500); });
        await randomSleep(3000, 5000); 

        // 4. Extract Price
        const priceText = await page.evaluate(() => {
            const selectors = [
                '.product-price-value', 
                '.price--current--I3Gb7_V', 
                '[class*="price--current"]',
                '.uniform-banner-box-price',
                '.product-price-current',
                '[itemprop="price"]',
                'div[class*="price"]' // fallback broad selector
            ];
            
            for (const s of selectors) {
                const el = document.querySelector(s);
                if (el && el.innerText && el.innerText.includes('$')) return el.innerText;
            }
            return null;
        });

        if (priceText) {
            const cleanPrice = parseFloat(priceText.replace(/[^0-9.]/g, ''));
            console.log(`   💰 Found Price: $${cleanPrice}`);

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
            console.log("   ⚠️ Link valid, but price hidden/dynamic.");
            await prisma.product.update({
                where: { id: product.id },
                data: { supplierUrl: foundLink, lastSourced: new Date() }
            });
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