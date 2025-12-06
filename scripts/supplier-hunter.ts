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
  console.log("🕵️ Starting Supplier Hunter (DDG HTML Mode)...");

  if (!process.env.PROXY_SERVER) {
      console.error("❌ Error: Missing PROXY secrets.");
      process.exit(1);
  }

  // Find products to hunt
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
        '--window-size=1366,768',
        `--proxy-server=http://${process.env.PROXY_SERVER}`,
        // FORCE ENGLISH LANGUAGE (Crucial for Proxies)
        '--lang=en-US,en' 
    ]
  });

  const page = await browser.newPage();
  
  // Set extra headers to ensure we get English results
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9'
  });

  page.setDefaultNavigationTimeout(60000); 
  
  await page.authenticate({
    username: process.env.PROXY_USERNAME,
    password: process.env.PROXY_PASSWORD
  });

  await page.setViewport({ width: 1366, height: 768 });

  for (const product of productsToHunt) {
    try {
        console.log(`\n🔍 Hunting: ${product.title}`);

        // 1. DuckDuckGo HTML (The most reliable for bots)
        // We use site:aliexpress.com to force exact matches
        const searchUrl = `https://html.duckduckgo.com/html/?q=site:aliexpress.com+${encodeURIComponent(product.title)}`;
        
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
        await randomSleep(2000, 3000);

        // 2. Extract Link
        const foundLink = await page.evaluate(() => {
            // In DDG HTML, results are in 'a.result__a'
            const anchors = Array.from(document.querySelectorAll('a.result__a'));
            
            const productLinks = anchors
                .map(a => a.href)
                .filter(href => href && (href.includes('aliexpress.com/item') || href.includes('/i/')));

            return productLinks.length > 0 ? productLinks[0] : null;
        });

        if (!foundLink) {
            console.log("   ❌ No result found on DDG.");
            // Log body to debug if blocked
            const content = await page.content();
            if(content.includes("If you are a human")) console.log("   ⚠️ DDG Captcha detected.");

            await prisma.product.update({
                where: { id: product.id },
                data: { lastSourced: new Date() }
            });
            continue;
        }

        console.log(`   🔗 Found: ${foundLink}`);

        // 3. Visit AliExpress
        // We set a high timeout because residential proxies can be slow loading Ali
        await page.goto(foundLink, { waitUntil: 'domcontentloaded', timeout: 90000 });
        
        await page.evaluate(() => { window.scrollBy(0, 500); }); 
        await randomSleep(3000, 5000); 

        // 4. Extract Price
        const priceText = await page.evaluate(() => {
            const selectors = [
                '.product-price-value', 
                '.price--current--I3Gb7_V', 
                '.uniform-banner-box-price',
                '.product-price-current',
                '[itemprop="price"]',
                '.money' 
            ];
            
            for (const s of selectors) {
                const el = document.querySelector(s);
                // Ensure text contains a number
                if (el && el.innerText && /\d/.test(el.innerText)) return el.innerText;
            }
            return null;
        });

        if (priceText) {
            const cleanPrice = parseFloat(priceText.replace(/[^0-9.]/g, ''));
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