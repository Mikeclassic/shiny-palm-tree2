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
  console.log("🕵️ Starting Visual Supplier Hunter (Bing Image Mode)...");

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
        `--proxy-server=http://${process.env.PROXY_SERVER}`
    ]
  });

  const page = await browser.newPage();
  
  // Set headers to look like a real browser visiting Bing
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://www.bing.com/'
  });

  page.setDefaultNavigationTimeout(120000); // 2 mins for slow proxies
  
  await page.authenticate({
    username: process.env.PROXY_USERNAME,
    password: process.env.PROXY_PASSWORD
  });

  await page.setViewport({ width: 1366, height: 768 });

  for (const product of productsToHunt) {
    try {
        console.log(`\n🔍 Visual Hunting: ${product.title}`);

        // 1. CONSTRUCT BING VISUAL SEARCH URL
        // We feed the product image directly to Bing. 
        // This bypasses text mismatch issues entirely.
        const imageUrl = encodeURIComponent(product.imageUrl);
        const searchUrl = `https://www.bing.com/images/search?view=detailv2&iss=sbi&form=SBIHMP&q=imgurl:${imageUrl}`;
        
        console.log("   📸 Uploading Image to Bing...");
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
        await randomSleep(3000, 6000);

        // 2. EXTRACT ALIEXPRESS LINKS
        // Bing "Visual Search" results are often in list items with specific attributes
        const foundLink = await page.evaluate(() => {
            // Get all links on the page
            const anchors = Array.from(document.querySelectorAll('a'));
            
            // Filter for AliExpress product pages
            const aliLinks = anchors
                .map(a => a.href)
                .filter(href => href && (href.includes('aliexpress.com/item') || href.includes('aliexpress.com/i/')));

            // Return the first one (Bing usually sorts by visual similarity)
            return aliLinks.length > 0 ? aliLinks[0] : null;
        });

        if (!foundLink) {
            console.log("   ❌ No visual match found on AliExpress.");
            
            // Fallback: Try Text Search on Bing if Visual fails
            console.log("   🔄 Trying Text Search Fallback...");
            const textUrl = `https://www.bing.com/search?q=${encodeURIComponent(product.title)} aliexpress`; // Simple query
            await page.goto(textUrl, { waitUntil: 'domcontentloaded' });
            await randomSleep(2000, 4000);
            
            const textLink = await page.evaluate(() => {
                const anchors = Array.from(document.querySelectorAll('li.b_algo h2 a, li.b_algo a'));
                const links = anchors.map(a => a.href).filter(h => h && h.includes('aliexpress.com/item'));
                return links.length > 0 ? links[0] : null;
            });

            if(textLink) {
                console.log(`   🔗 Found via Text: ${textLink}`);
                await processAliExpressPage(page, textLink, product);
            } else {
                console.log("   ❌ Text search also failed.");
                await prisma.product.update({
                    where: { id: product.id },
                    data: { lastSourced: new Date() }
                });
            }
            continue;
        }

        console.log(`   🔗 Found via Visual: ${foundLink}`);
        await processAliExpressPage(page, foundLink, product);

    } catch (e) {
        console.error(`   ❌ Error: ${e.message}`);
    }
  }

  await browser.close();
  await prisma.$disconnect();
  console.log("\n🏁 Hunt Complete.");
}

// Helper function to extract price and save
async function processAliExpressPage(page, link, product) {
    try {
        await page.goto(link, { waitUntil: 'domcontentloaded', timeout: 90000 });
        await page.evaluate(() => { window.scrollBy(0, 500); });
        await randomSleep(3000, 5000);

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
                    supplierUrl: link,
                    supplierPrice: cleanPrice,
                    lastSourced: new Date()
                }
            });
            console.log("   ✅ Saved.");
        } else {
            console.log("   ⚠️ Link valid, price hidden.");
            await prisma.product.update({
                where: { id: product.id },
                data: { supplierUrl: link, lastSourced: new Date() }
            });
        }
    } catch(e) {
        console.log("   ⚠️ Failed to load AliExpress page:", e.message);
    }
}

main();