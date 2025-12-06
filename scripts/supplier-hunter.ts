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
  console.log("🕵️ Starting Hunter (Original URL Logic + Advanced Price Extraction)...");

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

  // 1. LAUNCH BROWSER (Standard Desktop for Google Lens)
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

  // Start as Desktop (Required for Lens to work)
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
  await page.setViewport({ width: 1920, height: 1080 });

  for (const product of productsToHunt) {
    try {
        console.log(`\n🔍 Hunting: ${product.title}`);

        // ============================================================
        // STEP 1: URL EXTRACTION (PRESERVED EXACTLY AS IS)
        // ============================================================
        const lensUrl = `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(product.imageUrl)}&q=aliexpress`;
        
        console.log("   📸 Visiting Lens Multisearch...");
        await page.goto(lensUrl, { waitUntil: 'domcontentloaded' });
        
        // Handle Consent (Including Polish/German keys)
        try {
            const consentButton = await page.$x("//button[contains(., 'Reject') or contains(., 'I agree') or contains(., 'Odrzuć') or contains(., 'Zaakceptuj') or contains(., 'Zgadzam')]");
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

        // ============================================================
        // STEP 2: MULTI-LAYER PRICE EXTRACTION
        // ============================================================
        
        // 1. Switch to Facebook Bot (Bypasses Login Wall)
        console.log("   👻 Switching to Facebook Identity...");
        await page.setUserAgent('facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)');

        // 2. Optimization: Block images for speed
        await page.setRequestInterception(true);
        const interceptor = (req) => {
            if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) req.abort();
            else req.continue();
        };
        page.on('request', interceptor);

        // 3. Visit the Link
        try {
            await page.goto(foundLink, { waitUntil: 'domcontentloaded', timeout: 45000 });
        } catch (e) {
            console.log("   ⚠️ Navigation timeout (Checking content anyway...)");
        }

        // Cleanup interception
        page.off('request', interceptor);
        await page.setRequestInterception(false);

        // 4. Extract Price (The Upgrade)
        const priceData = await page.evaluate(() => {
            // Helper to clean prices (e.g., "45,99 zł" -> 45.99)
            const parsePrice = (str) => {
                if (!str) return null;
                let raw = str.toString();
                // If comma exists but no dot, replace comma with dot (European format)
                if (raw.includes(',') && !raw.includes('.')) raw = raw.replace(',', '.');
                const num = parseFloat(raw.replace(/[^0-9.]/g, ''));
                return (isNaN(num) || num === 0) ? null : num;
            };

            // STRATEGY A: Meta Tags (Facebook Standard)
            const metaPrice = document.querySelector('meta[property="og:price:amount"]')?.getAttribute('content');
            if (metaPrice) return { source: 'Meta Tag', price: parsePrice(metaPrice) };

            // STRATEGY B: JSON-LD (Google Standard - hidden in script tags)
            try {
                const scripts = document.querySelectorAll('script[type="application/ld+json"]');
                for (const s of scripts) {
                    const json = JSON.parse(s.innerText);
                    // Check for Product -> Offers
                    if (json['@type'] === 'Product' && json.offers) {
                        const val = Array.isArray(json.offers) ? json.offers[0].price : json.offers.price;
                        if (val) return { source: 'JSON-LD', price: parsePrice(val) };
                    }
                }
            } catch(e) {}

            // STRATEGY C: Text Regex (Fallback for "pl.aliexpress" etc)
            // Looks for currency symbols followed by numbers or vice versa
            const text = document.body.innerText;
            // Matches: "zł 45.00", "US $10", "10,00 €"
            const match = text.match(/(?:zł|US\s?\$|€|£)\s*([\d.,]+)/i) || text.match(/([\d.,]+)\s*(?:zł|€|£)/i);
            
            if (match) {
                // Determine which group captured the number
                const numStr = match[1] || match[0]; 
                return { source: 'Text Scan', price: parsePrice(numStr) };
            }

            return null;
        });

        // Reset User Agent for next loop
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');

        if (priceData && priceData.price) {
            console.log(`   💰 Price Found: ${priceData.price} (via ${priceData.source})`);

            await prisma.product.update({
                where: { id: product.id },
                data: {
                    supplierUrl: foundLink,
                    supplierPrice: priceData.price,
                    lastSourced: new Date()
                }
            });
            console.log("   ✅ Saved.");
        } else {
            console.log("   ⚠️ Price hidden. (Page Title: " + await page.title() + ")");
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