// @ts-nocheck
import { PrismaClient } from '@prisma/client';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const prisma = new PrismaClient();

// Helper to pause execution
const randomSleep = (min = 2000, max = 5000) => {
  const ms = Math.floor(Math.random() * (max - min + 1) + min);
  return new Promise(resolve => setTimeout(resolve, ms));
};

async function main() {
  console.log("🕵️ Starting Lens Multisearch Hunter (Visual Protocol)...");

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

  // Launch browser with aggressive anti-detection args
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

  // Authenticate Proxy
  await page.authenticate({
    username: process.env.PROXY_USERNAME,
    password: process.env.PROXY_PASSWORD
  });

  await page.setViewport({ width: 1920, height: 1080 });

  // 1. FORCE COOKIES: English Language & USD Currency
  await page.setCookie({
      name: 'aep_usuc_f',
      value: 'site=glo&c_tp=USD&region=US&b_locale=en_US',
      domain: '.aliexpress.com'
  });

  for (const product of productsToHunt) {
    try {
        console.log(`\n🔍 Hunting: ${product.title}`);
        
        // --- STEP 1: GOOGLE LENS SEARCH ---
        const lensUrl = `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(product.imageUrl)}&q=aliexpress`;
        
        await page.goto(lensUrl, { waitUntil: 'domcontentloaded' });
        
        // Click Google "Agree" if present
        try {
            const consentButton = await page.$x("//button[contains(., 'Reject all') or contains(., 'I agree')]");
            if (consentButton.length > 0) await consentButton[0].click();
        } catch (err) {}

        await randomSleep(2000, 4000);

        // Extract the best AliExpress Link
        let foundLink = await page.evaluate(() => {
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

        // Clean URL: Force Global Site (www) instead of localized (fr, es, etc)
        foundLink = foundLink.replace(/\/\/[a-z]{2}\.aliexpress\.com/, '//www.aliexpress.com');
        console.log(`   🔗 Visiting: ${foundLink}`);

        // --- STEP 2: VISIT ALIEXPRESS ---
        // Retry logic: If page fails to load, try one more time
        try {
            await page.goto(foundLink, { waitUntil: 'domcontentloaded', timeout: 45000 });
        } catch (e) {
            console.log("   ⚠️ Timeout, retrying...");
            await page.goto(foundLink, { waitUntil: 'domcontentloaded', timeout: 45000 });
        }

        // Wait for page logic to settle
        await randomSleep(3000, 5000);
        
        // Scroll to trigger lazy loading (Choice items need this)
        await page.evaluate(() => { window.scrollBy(0, 500); });
        await randomSleep(1000, 2000);

        const pageTitle = await page.title();
        console.log(`   📄 Title: "${pageTitle.substring(0, 50)}..."`);

        if (!pageTitle || pageTitle === "") {
             console.log("   ⚠️ Empty title detected. Page might be blocked.");
        }

        // --- STEP 3: "HUMAN VISION" PRICE EXTRACTION ---
        const priceFound = await page.evaluate(() => {
            // HELPER: Clean price text to a float
            const parsePrice = (str) => {
                if (!str) return 0;
                // Remove non-numeric chars except dot
                return parseFloat(str.replace(/[^0-9.]/g, ''));
            };

            // 1. META TAGS (Fastest & Most Reliable if present)
            const metaPrice = document.querySelector('meta[property="og:price:amount"]');
            if (metaPrice) {
                const p = parsePrice(metaPrice.getAttribute('content'));
                if (p > 0) return { source: "Meta Tag", price: p };
            }

            // 2. JSON-LD (Google's way)
            const scripts = document.querySelectorAll('script[type="application/ld+json"]');
            for (const script of scripts) {
                try {
                    const json = JSON.parse(script.innerText);
                    if (json['@type'] === 'Product' && json.offers) {
                        const val = Array.isArray(json.offers) ? json.offers[0].price : json.offers.price;
                        if (val) return { source: "JSON-LD", price: parsePrice(val) };
                    }
                } catch (e) {}
            }

            // 3. VISUAL ALGORITHM (The "Life or Death" Fallback)
            // Find ALL elements that look like a price (contain $)
            const allElements = document.querySelectorAll('*');
            let candidates = [];

            allElements.forEach(el => {
                // Must be visible
                if (!el.offsetParent) return;
                
                // Get direct text content
                const text = el.innerText || "";
                
                // Regex: Looks for "US $" or "$" followed by digits
                // Matches: "$10.99", "US $10.99", "10.99"
                if (text.match(/(?:US\s?\$|\$)\s*([\d,\.]+)/i)) {
                    const match = text.match(/(?:US\s?\$|\$)\s*([\d,\.]+)/i);
                    const val = parsePrice(match[1]);
                    
                    if (val > 0.1) { // Filter out $0.00 junk
                        // Calculate visual weight (Font Size)
                        const style = window.getComputedStyle(el);
                        const fontSize = parseFloat(style.fontSize);
                        
                        candidates.push({
                            price: val,
                            size: fontSize || 0,
                            text: text
                        });
                    }
                }
            });

            // Sort by Size (Largest to Smallest) -> The main price is usually the biggest text
            candidates.sort((a, b) => b.size - a.size);

            if (candidates.length > 0) {
                return { source: "Visual Scan", price: candidates[0].price };
            }

            return null;
        });

        if (priceFound) {
            console.log(`   💰 Price Found: $${priceFound.price} (via ${priceFound.source})`);

            await prisma.product.update({
                where: { id: product.id },
                data: {
                    supplierUrl: foundLink,
                    supplierPrice: priceFound.price,
                    lastSourced: new Date()
                }
            });
            console.log("   ✅ Saved to Database.");
        } else {
            console.log("   ⚠️ Price still hidden. Logging HTML sample for debugging...");
            // Log body text length to see if page actually loaded content
            const bodyLen = await page.evaluate(() => document.body.innerText.length);
            console.log(`   (Page Body Length: ${bodyLen} chars)`);
            
            await prisma.product.update({ where: { id: product.id }, data: { supplierUrl: foundLink, lastSourced: new Date() }});
        }

    } catch (e) {
        console.error(`   ❌ Unexpected Error: ${e.message}`);
    }
  }

  await browser.close();
  await prisma.$disconnect();
  console.log("\n🏁 Hunt Complete.");
}

main();