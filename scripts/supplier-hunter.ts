// @ts-nocheck
import { PrismaClient } from '@prisma/client';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const prisma = new PrismaClient();

// Increased delays to mimic human research speed
const randomSleep = (min = 4000, max = 8000) => {
  const ms = Math.floor(Math.random() * (max - min + 1) + min);
  return new Promise(resolve => setTimeout(resolve, ms));
};

const BATCH_SIZE = 5; // Process 5 items, then restart browser

// --- KEYWORD OVERLAP LOGIC ---
const checkTitleMatch = (originalTitle: string, foundTitle: string) => {
    const stopWords = [
        'the', 'a', 'an', 'and', 'or', 'for', 'of', 'in', 'with', 'to', 'at', 
        'men', 'mens', 'women', 'womens', 'new', 'hot', 'sale', 'fashion', 
        'der', 'die', 'und', 'für', 'mit', // German
        'le', 'la', 'et', 'pour', 'avec',   // French
        'i', 'w', 'z', 'dla', 'na'          // Polish
    ];

    const clean = (str: string) => {
        return str.toLowerCase()
            .replace(/[^a-z0-9\s]/g, '') 
            .split(/\s+/) 
            .filter(w => w.length > 2 && !stopWords.includes(w)); 
    };

    const originalWords = clean(originalTitle);
    const foundWords = clean(foundTitle);

    if (originalWords.length === 0) return { match: true, reason: "No keywords to check" };

    const matchingWords = originalWords.filter(w => foundWords.includes(w));

    if (matchingWords.length > 0) {
        return { match: true, reason: `Matched keywords: [${matchingWords.join(', ')}]` };
    }

    return { 
        match: false, 
        reason: `Mismatch. Expected: [${originalWords.join(', ')}] vs Found: [${foundWords.slice(0, 5).join(', ')}...]` 
    };
};

async function main() {
  console.log("🛡️ Starting Safe Auditor (Browser Recycling Mode)...");

  if (!process.env.PROXY_SERVER || !process.env.PROXY_USERNAME) {
      console.error("❌ Error: Missing PROXY secrets.");
      process.exit(1);
  }

  // CAPTURE START TIME for the loop
  const scriptStartTime = new Date();
  let totalProcessed = 0;

  // INFINITE LOOP (Until DB is done)
  while (true) {
      
      // 1. FETCH BATCH
      // We assume anything checked AFTER scriptStartTime is "done" for this run.
      const productsBatch = await prisma.product.findMany({
        take: BATCH_SIZE, 
        where: {
            OR: [
                { lastSourced: null },
                { lastSourced: { lt: scriptStartTime } }
            ]
        },
        orderBy: {
            lastSourced: { sort: 'asc', nulls: 'first' }
        }
      });

      if (productsBatch.length === 0) {
          console.log("✅ All products processed. Exiting.");
          break;
      }

      console.log(`\n🔄 Launching Fresh Browser Session for ${productsBatch.length} items...`);

      // 2. LAUNCH FRESH BROWSER FOR THIS BATCH
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

      await page.setViewport({ width: 1920, height: 1080 });

      // 3. PROCESS BATCH
      for (const product of productsBatch) {
        totalProcessed++;
        try {
            console.log(`\n[${totalProcessed}] Audit: ${product.title}`);

            // STEP 1: VISUAL SEARCH
            // Using specific site query to help Google Lens focus
            const query = `site:aliexpress.com ${product.title}`;
            const lensUrl = `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(product.imageUrl)}&q=${encodeURIComponent(query)}`;
            
            await page.goto(lensUrl, { waitUntil: 'domcontentloaded' });
            
            // Consent Handler (Multi-Language)
            try {
                const consentButton = await page.$x("//button[contains(., 'Reject') or contains(., 'I agree') or contains(., 'Odrzuć') or contains(., 'Zaakceptuj') or contains(., 'Zgadzam') or contains(., 'Alle ablehnen') or contains(., 'Tout refuser')]");
                if (consentButton.length > 0) {
                    await consentButton[0].click();
                    // Wait slightly longer after consent to behave human-like
                    await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 5000 }).catch(() => {});
                }
            } catch (err) {}

            await randomSleep(3000, 6000); // Slower pacing

            // STEP 2: LINK EXTRACTION
            const result = await page.evaluate(() => {
                const anchors = Array.from(document.querySelectorAll('a'));
                const hits = anchors.filter(a => a.href && a.href.includes('aliexpress.com/item'));
                
                if (hits.length > 0) {
                    const best = hits[0];
                    return {
                        href: best.href,
                        title: best.innerText || best.getAttribute('aria-label') || best.title || ""
                    };
                }
                return null;
            });

            // STEP 3: VERIFICATION & SAVE
            if (result) {
                const check = checkTitleMatch(product.title, result.title);

                if (check.match) {
                    console.log(`   🔗 Link Found: ${result.href}`);
                    console.log(`   ✅ Verified: ${check.reason}`);
                    
                    await prisma.product.update({
                        where: { id: product.id },
                        data: {
                            supplierUrl: result.href,
                            lastSourced: new Date()
                        }
                    });
                } else {
                    console.log(`   ❌ Ditching Link: ${check.reason}`);
                    await prisma.product.update({
                        where: { id: product.id },
                        data: { 
                            supplierUrl: null, 
                            lastSourced: new Date() 
                        }
                    });
                }
            } else {
                console.log("   ❌ No Link Found.");
                await prisma.product.update({
                    where: { id: product.id },
                    data: { 
                        lastSourced: new Date() 
                    }
                });
            }

        } catch (e) {
            console.error(`   ❌ Error: ${e.message}`);
        }
      }

      // 4. CLOSE BROWSER & COOL DOWN
      // This is the key: We kill the browser to clear all Google tracking cookies
      console.log("💤 Cooling down for 15 seconds to protect proxy...");
      await browser.close();
      
      // Force a hard pause before opening the next browser
      await new Promise(resolve => setTimeout(resolve, 15000));
  }

  await prisma.$disconnect();
  console.log("\n🏁 Full Database Audit Complete.");
}

main();