// @ts-nocheck
import { PrismaClient } from '@prisma/client';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const prisma = new PrismaClient();

const randomSleep = (min = 1000, max = 3000) => {
  const ms = Math.floor(Math.random() * (max - min + 1) + min);
  return new Promise(resolve => setTimeout(resolve, ms));
};

async function main() {
  console.log("⚡ Starting Social Imposter Protocol (Facebook UA Bypass)...");

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

        // ============================================================
        // PHASE 1: NUCLEAR ID EXTRACTION (Google Lens)
        // ============================================================
        // We use a standard Desktop User Agent for Google to render the results correctly.
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
        
        const lensUrl = `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(product.imageUrl)}&q=aliexpress`;
        await page.goto(lensUrl, { waitUntil: 'domcontentloaded' });
        
        // Anti-Consent (EU/Germany)
        try {
             const btns = await page.$x("//button[contains(., 'Reject') or contains(., 'refuser') or contains(., 'ablehnen')]");
             if (btns.length > 0) await btns[0].click();
        } catch(e) {}

        await randomSleep(2000, 4000);

        // EXTRACTION: We scan the full HTML string for the ID pattern.
        // AliExpress IDs always start with "1005" and are 16 digits long.
        const itemId = await page.evaluate(() => {
            const html = document.body.innerHTML;
            // Regex to find 100500... followed by digits
            const match = html.match(/100500\d{10}/); 
            return match ? match[0] : null;
        });

        if (!itemId) {
            console.log("   ❌ No AliExpress ID found in Lens data.");
            await prisma.product.update({ where: { id: product.id }, data: { lastSourced: new Date() }});
            continue;
        }

        console.log(`   🆔 Found ID: ${itemId}`);
        const targetUrl = `https://www.aliexpress.com/item/${itemId}.html`;

        // ============================================================
        // PHASE 2: THE FACEBOOK SPOOF (Bypass Block)
        // ============================================================
        // We switch identity to "facebookexternalhit".
        // AliExpress DOES NOT block this agent because they want link previews on Social Media.
        
        await page.setUserAgent('facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)');
        
        console.log(`   👻 Impersonating Facebook Bot to visit URL...`);
        
        // We intercept requests to block images/css for speed
        await page.setRequestInterception(true);
        const interceptor = (req) => {
            if (['image', 'stylesheet', 'font'].includes(req.resourceType())) req.abort();
            else req.continue();
        };
        page.on('request', interceptor);

        try {
            await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        } catch (e) {
            console.log("   ⚠️ Navigation timeout (Checking meta tags anyway...)");
        }
        
        page.off('request', interceptor);
        await page.setRequestInterception(false);

        // ============================================================
        // PHASE 3: META TAG EXTRACTION
        // ============================================================
        // Social bots read "Open Graph" (og) tags. AliExpress always populates these for Facebook.
        
        const metaData = await page.evaluate(() => {
            const getMeta = (prop) => {
                const el = document.querySelector(`meta[property="${prop}"]`);
                return el ? el.getAttribute('content') : null;
            };
            return {
                price: getMeta('og:price:amount'),
                currency: getMeta('og:price:currency'),
                title: getMeta('og:title')
            };
        });

        if (metaData.price) {
            console.log(`   💰 Price Found via Meta: ${metaData.price} ${metaData.currency}`);
            
            // Normalize price (handle "35,50" vs "35.50")
            let cleanPrice = parseFloat(metaData.price.replace(',', '.'));

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
            console.log("   ⚠️ Meta tags hidden.");
            // Log 200 chars of body to debug
            const bodySnippet = await page.evaluate(() => document.body.innerText.substring(0, 200));
            console.log(`   (Debug Body: ${bodySnippet.replace(/\n/g, '')})`);
            
            // Save URL anyway
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