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
  console.log("🕵️ Starting Lens Multisearch Hunter...");

  if (!process.env.PROXY_SERVER || !process.env.PROXY_USERNAME) {
      console.error("❌ Error: Missing PROXY secrets.");
      process.exit(1);
  }

  // Find products without a supplier
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
  
  // Increase timeout to handle AliExpress redirects
  page.setDefaultNavigationTimeout(60000); 
  
  await page.authenticate({
    username: process.env.PROXY_USERNAME,
    password: process.env.PROXY_PASSWORD
  });

  await page.setViewport({ width: 1366, height: 768 });

  for (const product of productsToHunt) {
    try {
        console.log(`\n🔍 Hunting: ${product.title}`);

        // 1. CONSTRUCT THE MAGIC LENS URL
        const lensUrl = `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(product.imageUrl)}&q=aliexpress`;
        
        console.log("   📸 Visiting Lens Multisearch...");
        await page.goto(lensUrl, { waitUntil: 'domcontentloaded' });
        
        // 2. Handle Google Consent
        try {
            const consentButton = await page.$x("//button[contains(., 'Reject all') or contains(., 'I agree')]");
            if (consentButton.length > 0) {
                await consentButton[0].click();
                await page.waitForNavigation({ waitUntil: 'domcontentloaded' });
            }
        } catch (err) {}

        await randomSleep(3000, 5000);

        // 3. EXTRACT FIRST RESULT
        const foundLink = await page.evaluate(() => {
            const anchors = Array.from(document.querySelectorAll('a'));
            const productLinks = anchors
                .map(a => a.href)
                .filter(href => href && href.includes('aliexpress.com/item'));
            return productLinks.length > 0 ? productLinks[0] : null;
        });

        if (!foundLink) {
            console.log("   ❌ No AliExpress link found in Lens results.");
            await prisma.product.update({
                where: { id: product.id },
                data: { lastSourced: new Date() }
            });
            continue;
        }

        console.log(`   🔗 Found: ${foundLink}`);

        // 4. VISIT ALIEXPRESS (Improved Loading Strategy)
        // 'networkidle2' waits until the price API calls are finished
        await page.goto(foundLink, { waitUntil: 'networkidle2', timeout: 60000 });
        
        // Scroll down to trigger lazy loading of "Choice" prices
        await page.evaluate(() => { window.scrollBy(0, 600); });
        
        // Attempt to close "Welcome" popups which might block reading
        try {
            const closeBtn = await page.$x("//div[contains(@class, 'pop-close-btn') or contains(@class, 'close-layer')]");
            if (closeBtn.length > 0) await closeBtn[0].click();
        } catch (e) {}

        await randomSleep(2000, 4000); 

        // 5. EXTRACT PRICE (Advanced Method)
        const priceData = await page.evaluate(() => {
            // STRATEGY 1: Check JSON-LD (Structured Data)
            // This is how Google sees the price. It is extremely reliable.
            try {
                const scripts = document.querySelectorAll('script[type="application/ld+json"]');
                for (const script of scripts) {
                    const data = JSON.parse(script.innerText);
                    // Look for Product schema
                    if (data['@type'] === 'Product' || data['@context']?.includes('schema.org')) {
                        const offers = data.offers;
                        // Offers can be an array or object
                        if (Array.isArray(offers)) {
                            return { val: offers[0].price, src: 'json-ld' };
                        } else if (offers && offers.price) {
                            return { val: offers.price, src: 'json-ld' };
                        }
                    }
                }
            } catch (e) { console.log("JSON-LD failed", e); }

            // STRATEGY 2: Meta Tags (Open Graph)
            try {
                const metaPrice = document.querySelector('meta[property="og:price:amount"]');
                if (metaPrice) return { val: metaPrice.getAttribute('content'), src: 'meta' };
            } catch(e) {}

            // STRATEGY 3: Visual Selectors (Wildcards)
            // We search for classes *containing* 'price--current' instead of exact matches
            const selectors = [
                '[class*="price--current"]',  // Catches .price--current--XyZ
                '.product-price-value',
                '.uniform-banner-box-price', // Common on "Choice" items
                '[itemprop="price"]',
                '.sku-price' // Mobile view specific
            ];
            
            for (const s of selectors) {
                const el = document.querySelector(s);
                if (el && el.innerText && /\d/.test(el.innerText)) {
                    return { val: el.innerText, src: 'css' };
                }
            }
            
            return null;
        });

        if (priceData && priceData.val) {
            // Clean the price string
            let rawString = priceData.val.toString();
            
            // Handle European formatting (e.g. "3,65" -> "3.65")
            // If comma exists but no dot, assume comma is decimal separator
            if (rawString.includes(',') && !rawString.includes('.')) {
                rawString = rawString.replace(',', '.');
            }

            // Remove currency symbols and other text
            const cleanPrice = parseFloat(rawString.replace(/[^0-9.]/g, ''));

            console.log(`   💰 Price: $${cleanPrice} (via ${priceData.src})`);

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
            console.log("   ⚠️ Link valid, but price hidden (Anti-bot active or OOS).");
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