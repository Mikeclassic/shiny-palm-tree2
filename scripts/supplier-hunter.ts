// @ts-nocheck
import { PrismaClient } from '@prisma/client';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { KnownDevices } from 'puppeteer'; // Built-in device descriptors

puppeteer.use(StealthPlugin());

const prisma = new PrismaClient();
const iPhone = KnownDevices['iPhone 13 Pro']; // Pretend to be an iPhone

const randomSleep = (min = 2000, max = 5000) => {
  const ms = Math.floor(Math.random() * (max - min + 1) + min);
  return new Promise(resolve => setTimeout(resolve, ms));
};

async function main() {
  console.log("📱 Starting Mobile Hunter (JSON Intercept Protocol)...");

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

  const browser = await puppeteer.launch({
    headless: "new",
    args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        `--proxy-server=http://${process.env.PROXY_SERVER}`
    ]
  });

  const page = await browser.newPage();
  
  // 1. ACTIVATE IPHONE MODE
  await page.emulate(iPhone);
  
  // 2. SET PROXY AUTH
  await page.authenticate({
    username: process.env.PROXY_USERNAME,
    password: process.env.PROXY_PASSWORD
  });

  // 3. FORCE MOBILE COOKIES (Global English)
  await page.setCookie({
    name: 'aep_usuc_f',
    value: 'site=glo&c_tp=USD&region=US&b_locale=en_US',
    domain: '.aliexpress.com'
  });

  // 4. ADD HUMAN HEADERS
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://www.google.com/',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'cross-site',
  });

  for (const product of productsToHunt) {
    try {
        console.log(`\n🔍 Hunting: ${product.title}`);
        
        // --- STEP 1: GOOGLE LENS (Mobile View) ---
        const lensUrl = `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(product.imageUrl)}&q=aliexpress`;
        await page.goto(lensUrl, { waitUntil: 'domcontentloaded' });
        
        await randomSleep(2000, 4000);

        // Extract Link (Mobile Google Layout is different, we use generic anchor search)
        let foundLink = await page.evaluate(() => {
            const anchors = Array.from(document.querySelectorAll('a[href*="aliexpress.com/item"]'));
            return anchors.length > 0 ? anchors[0].href : null;
        });

        if (!foundLink) {
            console.log("   ❌ No AliExpress link found.");
            await prisma.product.update({ where: { id: product.id }, data: { lastSourced: new Date() }});
            continue;
        }

        // Clean URL to force mobile but global
        // We actually KEEP it as is, or ensure it's standard. 
        // Mobile user agent will automatically redirect to 'm.aliexpress' or responsive view.
        console.log(`   🔗 Visiting: ${foundLink}`);

        // --- STEP 2: NETWORK TRAP (JSON INTERCEPTION) ---
        // We listen for the "price" data packet before the page even finishes rendering.
        let capturedPrice = 0;
        
        const responseListener = async (response) => {
            const url = response.url();
            // AliExpress Mobile APIs often contain these keywords
            if (url.includes('mtop') || url.includes('h5')) {
                try {
                    const json = await response.json();
                    // Deep search for "price" in the JSON tree
                    const str = JSON.stringify(json);
                    const match = str.match(/"(actMinPrice|minPrice|price)"\s*:\s*"?(\d+(\.\d+)?)"?/);
                    if (match && match[2]) {
                        const p = parseFloat(match[2]);
                        if (p > 0) capturedPrice = p;
                    }
                } catch(e) {}
            }
        };

        page.on('response', responseListener);

        try {
            await page.goto(foundLink, { waitUntil: 'networkidle2', timeout: 45000 });
        } catch (e) {
            console.log("   ⚠️ Navigation timeout (might be okay if we caught the JSON)");
        }
        
        page.off('response', responseListener);

        // --- STEP 3: FALLBACK EXTRACTION ---
        if (capturedPrice === 0) {
            // If network trap failed, try reading the screen
            capturedPrice = await page.evaluate(() => {
                // Look for big numbers with "$" sign
                const text = document.body.innerText;
                const match = text.match(/US\s?\$(\d+(\.\d+)?)/);
                if (match) return parseFloat(match[1]);
                
                // Look for specific mobile classes
                const el = document.querySelector('.price-text, .uniform-banner-box-price');
                if (el) return parseFloat(el.innerText.replace(/[^0-9.]/g, ''));
                
                return 0;
            });
        }

        // CHECK IF BLOCKED
        const bodyLen = await page.evaluate(() => document.body.innerText.length);
        if (bodyLen < 2000) {
             console.log(`   ⚠️ Page blocked (Size: ${bodyLen}). Trying next...`);
             continue;
        }

        if (capturedPrice > 0) {
            console.log(`   💰 Price Found: $${capturedPrice}`);
            await prisma.product.update({
                where: { id: product.id },
                data: {
                    supplierUrl: foundLink,
                    supplierPrice: capturedPrice,
                    lastSourced: new Date()
                }
            });
            console.log("   ✅ Saved.");
        } else {
            console.log("   ⚠️ Price not found.");
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