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
  console.log("🎯 Starting Proven Lens Protocol (Reverted to Working Logic)...");

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

  // 1. LAUNCH BROWSER (Desktop Mode)
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
        let foundPrice = 0;

        // ============================================================
        // STEP 1: GOOGLE LENS (The Method That Worked)
        // ============================================================
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
        
        const lensUrl = `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(product.imageUrl)}&q=aliexpress`;
        await page.goto(lensUrl, { waitUntil: 'domcontentloaded' });

        // CRITICAL: Handle German/EU Consent Wall
        // If this is not clicked, Lens results never load.
        try {
             const btns = await page.$x("//button[contains(., 'Reject') or contains(., 'refuser') or contains(., 'ablehnen') or contains(., 'agree') or contains(., 'akzeptieren') or contains(., 'Zustimmen')]");
             if (btns.length > 0) {
                 console.log("   🍪 Clicking Consent Button...");
                 await btns[0].click();
                 await randomSleep(2000, 3000); // Wait for reload
             }
        } catch(e) {}
        
        await randomSleep(3000, 5000); // Wait for images to process

        // REVERTED LOGIC: Use querySelectorAll (This found the ID in your 12:52 AM log)
        targetUrl = await page.evaluate(() => {
            const anchors = Array.from(document.querySelectorAll('a'));
            // Find any link containing aliexpress.com/item
            const link = anchors.find(a => a.href && a.href.includes('aliexpress.com/item'));
            return link ? link.href : null;
        });

        if (!targetUrl) {
            console.log("   ❌ No AliExpress link found in Lens results.");
            // Fallback: Try Text Search only if Lens completely failed
             console.log("   ⚠️ Trying Text Search Fallback...");
             const query = `${product.title} site:aliexpress.com`;
             await page.goto(`https://www.google.com/search?q=${encodeURIComponent(query)}`, { waitUntil: 'domcontentloaded' });
             await randomSleep(2000, 3000);
             targetUrl = await page.evaluate(() => {
                const anchors = Array.from(document.querySelectorAll('a'));
                const link = anchors.find(a => a.href && a.href.includes('aliexpress.com/item'));
                return link ? link.href : null;
            });
        }

        if (!targetUrl) {
             console.log("   ❌ Item not found.");
             await prisma.product.update({ where: { id: product.id }, data: { lastSourced: new Date() }});
             continue;
        }

        // Clean ID
        const idMatch = targetUrl.match(/\/item\/(\d+)\.html/);
        const itemId = idMatch ? idMatch[1] : null;
        
        if (!itemId) {
            console.log("   ⚠️ Link found but no ID: " + targetUrl);
            continue;
        }

        const cleanLink = `https://www.aliexpress.com/item/${itemId}.html`;
        console.log(`   🔗 Found: ${cleanLink}`);

        // ============================================================
        // STEP 2: GOOGLE SEARCH SNIPPET (Your Preferred Method)
        // ============================================================
        console.log("   🌎 Checking Google Snippet for Price...");
        // Force US English to see "$"
        await page.goto(`https://www.google.com/search?q=${itemId}+site:aliexpress.com&gl=us&hl=en`, { waitUntil: 'domcontentloaded' });
        await randomSleep(2000, 4000);

        foundPrice = await page.evaluate(() => {
            const text = document.body.innerText;
            // Regex for US Price or Euro Price
            const patterns = [
                /US\s?\$(\d+(\.\d+)?)/,
                /\$(\d+(\.\d+)?)/,
                /€\s?(\d+([.,]\d+)?)/
            ];
            for (const p of patterns) {
                const match = text.match(p);
                if (match) {
                    let raw = match[1] || match[0];
                    if (raw.includes(',') && !raw.includes('.')) raw = raw.replace(',', '.');
                    return parseFloat(raw.replace(/[^0-9.]/g, ''));
                }
            }
            return 0;
        });

        // ============================================================
        // STEP 3: FACEBOOK BACKUP (If Google result was empty)
        // ============================================================
        if (foundPrice === 0) {
            console.log("   ⚠️ Google Snippet empty. Trying Facebook Bot Bypass...");
            
            await page.setUserAgent('facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)');
            
            // Block images to load fast
            await page.setRequestInterception(true);
            const interceptor = (req) => {
                if (['image', 'media'].includes(req.resourceType())) req.abort();
                else req.continue();
            };
            page.on('request', interceptor);

            try {
                await page.goto(cleanLink, { waitUntil: 'domcontentloaded', timeout: 30000 });
                
                foundPrice = await page.evaluate(() => {
                    const meta = document.querySelector('meta[property="og:price:amount"]');
                    return meta ? parseFloat(meta.getAttribute('content')) : 0;
                });
            } catch (e) {
                console.log("   ⚠️ Navigation timeout on backup.");
            }
            page.off('request', interceptor);
            await page.setRequestInterception(false);
        }

        // SAVE
        if (foundPrice > 0.1) {
            console.log(`   💰 Price Found: $${foundPrice}`);
            await prisma.product.update({
                where: { id: product.id },
                data: {
                    supplierUrl: cleanLink,
                    supplierPrice: foundPrice,
                    lastSourced: new Date()
                }
            });
            console.log("   ✅ Saved.");
        } else {
            console.log("   ⚠️ Price not found.");
            // Save link anyway
            await prisma.product.update({ where: { id: product.id }, data: { supplierUrl: cleanLink, lastSourced: new Date() }});
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