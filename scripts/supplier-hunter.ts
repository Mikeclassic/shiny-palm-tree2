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
  console.log("🕵️ Starting Hybrid Supplier Hunter...");

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
  
  // High timeout for proxies
  page.setDefaultNavigationTimeout(90000); 
  
  await page.authenticate({
    username: process.env.PROXY_USERNAME,
    password: process.env.PROXY_PASSWORD
  });

  await page.setViewport({ width: 1366, height: 768 });

  for (const product of productsToHunt) {
    try {
        console.log(`\n🔍 Hunting: ${product.title}`);

        // STEP 1: WARM UP (Visit Home to get Cookies)
        try {
            await page.goto('https://www.google.com', { waitUntil: 'domcontentloaded' });
            await randomSleep(1000, 2000);

            // Handle Cookies (If any)
            const consentButton = await page.$x("//button[contains(., 'Reject all') or contains(., 'I agree') or contains(., 'Accept all')]");
            if (consentButton.length > 0) {
                console.log("   🍪 Clicking Cookie Consent...");
                await consentButton[0].click();
                await randomSleep(2000, 3000);
            }
        } catch (e) {
            console.log("   ⚠️ Homepage load glitch (ignoring)...");
        }

        // STEP 2: DIRECT SEARCH (More reliable than typing)
        // We use the trust established in Step 1 to load the search URL directly
        const searchUrl = `https://www.google.com/search?q=site:aliexpress.com+${encodeURIComponent(product.title)}`;
        console.log("   🚀 Loading Search Results...");
        
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
        await randomSleep(3000, 5000); // Wait for JS to render results

        // Check if we hit a captcha/block
        const pageTitle = await page.title();
        if (pageTitle.includes("Verify") || pageTitle.includes("Captcha")) {
            console.log("   🛑 Proxy blocked by Captcha. Skipping...");
            continue;
        }

        // STEP 3: GREEDY LINK EXTRACTION
        const foundLink = await page.evaluate(() => {
            const anchors = Array.from(document.querySelectorAll('a'));
            
            // Find ANY link that goes to an AliExpress item
            const productLinks = anchors
                .map(a => a.href)
                .filter(href => href && (href.includes('aliexpress.com/item') || href.includes('/i/'))); // /i/ is also used

            return productLinks.length > 0 ? productLinks[0] : null;
        });

        if (!foundLink) {
            console.log("   ❌ No AliExpress link found.");
            await prisma.product.update({
                where: { id: product.id },
                data: { lastSourced: new Date() }
            });
            continue;
        }

        console.log(`   🔗 Found: ${foundLink}`);

        // STEP 4: VISIT SUPPLIER
        await page.goto(foundLink, { waitUntil: 'domcontentloaded', timeout: 90000 });
        await page.evaluate(() => { window.scrollBy(0, 500); }); // Trigger lazy loads
        await randomSleep(3000, 6000); 

        // STEP 5: EXTRACT PRICE
        const priceText = await page.evaluate(() => {
            const selectors = [
                '.product-price-value', 
                '.price--current--I3Gb7_V', 
                '.uniform-banner-box-price',
                '.product-price-current',
                '[itemprop="price"]',
                '.money',
                // Script tag fallback (Very reliable)
                'script[type="application/ld+json"]'
            ];
            
            for (const s of selectors) {
                const el = document.querySelector(s);
                
                // If it's the JSON-LD script
                if (s.includes('json') && el) {
                    try {
                        const json = JSON.parse(el.innerText);
                        if (json.offers && json.offers.price) return json.offers.price;
                        if (json.offers && json.offers[0] && json.offers[0].price) return json.offers[0].price;
                    } catch(e) {}
                }

                // If it's a visible element
                if (el && el.innerText && /\d/.test(el.innerText)) return el.innerText;
            }
            return null;
        });

        if (priceText) {
            const cleanPrice = parseFloat(priceText.toString().replace(/[^0-9.]/g, ''));
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