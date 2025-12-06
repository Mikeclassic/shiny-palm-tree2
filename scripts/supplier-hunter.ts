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
  console.log("🌍 Starting Universal Hunter (Language Agnostic Protocol)...");

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

  // 1. LAUNCH BROWSER
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

  // 2. AUTHENTICATE PROXY
  await page.authenticate({
    username: process.env.PROXY_USERNAME,
    password: process.env.PROXY_PASSWORD
  });

  for (const product of productsToHunt) {
    try {
        console.log(`\n🔍 Hunting: ${product.title}`);
        let targetUrl = null;

        // ============================================================
        // STEP 1: FIND ID (REGEX SCAN)
        // We ignore visual links and scan source code for "100500..."
        // ============================================================
        
        const lensUrl = `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(product.imageUrl)}&q=aliexpress`;
        await page.goto(lensUrl, { waitUntil: 'domcontentloaded' });
        
        // Blindly click "Reject/Agree" buttons regardless of language
        try {
            // "button" tag that is NOT an icon, usually the consent button
            await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                for (const b of buttons) {
                    // Click the first button that looks like a privacy consent (usually at bottom)
                    if (b.innerText.length > 3 && b.innerText.length < 30) {
                        b.click();
                        return;
                    }
                }
            });
        } catch(e) {}
        
        await randomSleep(2000, 4000);

        // EXTRACTION: Scan full HTML for 16-digit ID
        const itemId = await page.evaluate(() => {
            const html = document.body.innerHTML;
            // Regex for AliExpress Item ID (always starts with 1005, 16 digits total)
            const match = html.match(/100500\d{10}/); 
            return match ? match[0] : null;
        });

        if (!itemId) {
            console.log("   ❌ No AliExpress ID found in source code.");
            await prisma.product.update({ where: { id: product.id }, data: { lastSourced: new Date() }});
            continue;
        }

        console.log(`   🆔 Found ID: ${itemId}`);
        targetUrl = `https://www.aliexpress.com/item/${itemId}.html`;

        // ============================================================
        // STEP 2: FACEBOOK BOT BYPASS
        // We use Facebook UA to bypass the Login Wall
        // ============================================================
        console.log("   👻 Impersonating Facebook Bot...");
        await page.setUserAgent('facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)');

        // Block images to load fast
        await page.setRequestInterception(true);
        const interceptor = (req) => {
            if (['image', 'media', 'font', 'stylesheet'].includes(req.resourceType())) req.abort();
            else req.continue();
        };
        page.on('request', interceptor);

        try {
            await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        } catch (e) {
            console.log("   ⚠️ Navigation timeout (checking meta anyway...)");
        }

        page.off('request', interceptor);
        await page.setRequestInterception(false);

        // ============================================================
        // STEP 3: META TAG EXTRACTION
        // We read "og:price:amount" which is always a number (e.g. "12.50")
        // ============================================================
        const metaData = await page.evaluate(() => {
            const getMeta = (prop) => {
                const el = document.querySelector(`meta[property="${prop}"]`);
                return el ? el.getAttribute('content') : null;
            };
            return {
                price: getMeta('og:price:amount'),
                currency: getMeta('og:price:currency')
            };
        });

        if (metaData.price) {
            console.log(`   💰 Price Found: ${metaData.price} ${metaData.currency || ''}`);
            
            // Normalize: 12,50 -> 12.50
            let raw = metaData.price.replace(',', '.');
            let cleanPrice = parseFloat(raw);

            await prisma.product.update({
                where: { id: product.id },
                data: {
                    supplierUrl: targetUrl,
                    supplierPrice: cleanPrice,
                    lastSourced: new Date()
                }
            });
            console.log("   ✅ Saved.");
        } else {
            console.log("   ⚠️ Price hidden (Product might be OOS or blocked).");
            await prisma.product.update({ where: { id: product.id }, data: { supplierUrl: targetUrl, lastSourced: new Date() }});
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