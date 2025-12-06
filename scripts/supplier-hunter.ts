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
  console.log("🕵️ Starting Hunter (Lens URL + Facebook Price Protocol)...");

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

  // Start as a normal Desktop User (Crucial for Lens to work)
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
  await page.setViewport({ width: 1920, height: 1080 });

  for (const product of productsToHunt) {
    try {
        console.log(`\n🔍 Hunting: ${product.title}`);

        // ============================================================
        // STEP 1: URL EXTRACTION (PRESERVED EXACTLY AS WORKING)
        // ============================================================
        const lensUrl = `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(product.imageUrl)}&q=aliexpress`;
        
        console.log("   📸 Visiting Lens Multisearch...");
        await page.goto(lensUrl, { waitUntil: 'domcontentloaded' });
        
        // Handle Consent (Includes Polish keys: Odrzuć/Zaakceptuj)
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
        // STEP 2: PRICE EXTRACTION (FACEBOOK PROTOCOL)
        // ============================================================
        
        // SWITCH IDENTITY: Pretend to be Facebook to bypass AliExpress blocks
        console.log("   👻 Switching to Facebook Identity...");
        await page.setUserAgent('facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)');

        // Optimization: Block images/css to speed up the "bot" visit
        await page.setRequestInterception(true);
        const interceptor = (req) => {
            if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) req.abort();
            else req.continue();
        };
        page.on('request', interceptor);

        // Visit AliExpress
        try {
            await page.goto(foundLink, { waitUntil: 'domcontentloaded', timeout: 45000 });
        } catch (e) {
            console.log("   ⚠️ Navigation timeout (Checking meta tags anyway...)");
        }

        page.off('request', interceptor);
        await page.setRequestInterception(false);

        // Extract Price from Meta Tags (Open Graph)
        const priceData = await page.evaluate(() => {
            const getMeta = (prop) => {
                const el = document.querySelector(`meta[property="${prop}"]`);
                return el ? el.getAttribute('content') : null;
            };
            return {
                amount: getMeta('og:price:amount'),
                currency: getMeta('og:price:currency')
            };
        });

        // Reset User Agent back to Desktop for the next loop (Important!)
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');

        if (priceData.amount) {
            // Fix Comma Decimals (European/Polish format)
            let raw = priceData.amount.toString();
            if (raw.includes(',') && !raw.includes('.')) raw = raw.replace(',', '.');
            
            const cleanPrice = parseFloat(raw.replace(/[^0-9.]/g, ''));
            const currency = priceData.currency || '';

            console.log(`   💰 Price: ${cleanPrice} ${currency}`);

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
            console.log("   ⚠️ Price hidden (Meta tags missing).");
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