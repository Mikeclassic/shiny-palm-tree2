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
  console.log("🕵️ Starting Proxy Supplier Hunter (DDG Mode)...");

  if (!process.env.PROXY_SERVER || !process.env.PROXY_USERNAME) {
      console.error("❌ Error: Missing PROXY secrets.");
      process.exit(1);
  }

  // Find products
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

  // Launch Browser with Webshare Proxy
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--window-size=1366,768',
        `--proxy-server=http://${process.env.PROXY_SERVER}` // Webshare format
    ]
  });

  const page = await browser.newPage();
  
  // Authenticate Webshare
  await page.authenticate({
    username: process.env.PROXY_USERNAME,
    password: process.env.PROXY_PASSWORD
  });

  await page.setViewport({ width: 1366, height: 768 });

  for (const product of productsToHunt) {
    try {
        console.log(`\n🔍 Hunting: ${product.title}`);

        // 1. DuckDuckGo HTML Search (Bypasses Google Consent Walls)
        // We use site:aliexpress.com to force exact matches
        const searchUrl = `https://html.duckduckgo.com/html/?q=site:aliexpress.com+${encodeURIComponent(product.title)}`;
        
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await randomSleep(2000, 4000);

        // 2. Extract Link
        const foundLink = await page.evaluate(() => {
            // DDG HTML results are clean links
            const anchors = Array.from(document.querySelectorAll('.result__a'));
            
            const productLinks = anchors
                .map(a => a.href)
                .filter(href => href && href.includes('aliexpress.com/item'));

            return productLinks.length > 0 ? productLinks[0] : null;
        });

        if (!foundLink) {
            console.log("   ❌ No result found.");
            await prisma.product.update({
                where: { id: product.id },
                data: { lastSourced: new Date() }
            });
            continue;
        }

        console.log(`   🔗 Found: ${foundLink}`);

        // 3. Visit AliExpress
        await page.goto(foundLink, { waitUntil: 'domcontentloaded', timeout: 60000 });
        
        // Scroll slightly
        await page.evaluate(() => { window.scrollBy(0, 300); });
        await randomSleep(3000, 5000); 

        // 4. Extract Price (Robust)
        const priceText = await page.evaluate(() => {
            const selectors = [
                '.product-price-value', 
                '.price--current--I3Gb7_V', 
                '.uniform-banner-box-price',
                '.product-price-current',
                '[itemprop="price"]',
                '.money' // Generic fallback
            ];
            
            for (const s of selectors) {
                const el = document.querySelector(s);
                if (el && el.innerText && /\d/.test(el.innerText)) return el.innerText;
            }
            return null;
        });

        if (priceText) {
            // Clean "$15.99" -> 15.99
            const cleanPrice = parseFloat(priceText.replace(/[^0-9.]/g, ''));
            
            if (isNaN(cleanPrice)) {
                 console.log(`   ⚠️ Price found but invalid format: ${priceText}`);
                 throw new Error("Invalid Price");
            }

            console.log(`   💰 Price: $${cleanPrice}`);

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
            console.log("   ⚠️ Link valid, but price hidden.");
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