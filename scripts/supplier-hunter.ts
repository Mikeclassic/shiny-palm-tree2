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
  console.log("🐴 Starting Trojan Horse Protocol (Desktop Lens -> Facebook Bot)...");

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
        // PHASE 1: THE SCOUT (Desktop Google Lens)
        // ============================================================
        // We use a standard Desktop User Agent to ensure Google shows links.
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1920, height: 1080 });

        const lensUrl = `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(product.imageUrl)}&q=aliexpress`;
        await page.goto(lensUrl, { waitUntil: 'domcontentloaded' });
        
        // Handle Google Consent (EU/Germany)
        try {
             const btns = await page.$x("//button[contains(., 'Reject') or contains(., 'refuser') or contains(., 'ablehnen') or contains(., 'I agree')]");
             if (btns.length > 0) await btns[0].click();
        } catch(e) {}

        await randomSleep(2000, 4000);

        // EXTRACTION: Look for Anchor Tags (The method that worked before)
        const foundLink = await page.evaluate(() => {
            const anchors = Array.from(document.querySelectorAll('a'));
            const link = anchors.find(a => a.href && a.href.includes('aliexpress.com/item'));
            return link ? link.href : null;
        });

        if (!foundLink) {
            console.log("   ❌ No AliExpress link found via Lens.");
            await prisma.product.update({ where: { id: product.id }, data: { lastSourced: new Date() }});
            continue;
        }

        console.log(`   🔗 Found Link: ${foundLink}`);

        // Clean URL to base version
        // Convert "fr.aliexpress.com" -> "www.aliexpress.com" for consistency
        let targetUrl = foundLink.replace(/\/\/[a-z]{2}\.aliexpress\.com/, '//www.aliexpress.com');
        targetUrl = targetUrl.split('?')[0]; // Remove tracking params
        
        // ============================================================
        // PHASE 2: THE TROJAN (Facebook Bot Identity)
        // ============================================================
        // We switch identity to "facebookexternalhit". 
        // AliExpress WHITELISTS this agent to allow social media previews.
        
        console.log("   👻 Switching to Facebook Bot Identity...");
        await page.setUserAgent('facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)');
        
        // Block heavy assets to speed up
        await page.setRequestInterception(true);
        const interceptor = (req) => {
            const type = req.resourceType();
            if (['image', 'stylesheet', 'font', 'media'].includes(type)) req.abort();
            else req.continue();
        };
        page.on('request', interceptor);

        try {
            await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        } catch (e) {
            console.log("   ⚠️ Navigation timeout (checking meta tags anyway...)");
        }

        page.off('request', interceptor);
        await page.setRequestInterception(false);

        // ============================================================
        // PHASE 3: META TAG EXTRACTION
        // ============================================================
        // We grab the "Open Graph" tags which contain the clean price.
        
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
            console.log(`   💰 Price Found: ${metaData.price} ${metaData.currency || 'USD'}`);
            
            // Normalize price (handle "35,50")
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
            // Log a snippet of the page to debug block
            const bodySnippet = await page.evaluate(() => document.body.innerText.substring(0, 100));
            console.log(`   (Debug: "${bodySnippet.replace(/\n/g, ' ')}...")`);
            
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