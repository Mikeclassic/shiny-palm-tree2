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
  console.log("🔄 Starting FULL DATABASE AUDIT (Redoing Everything)...");

  if (!process.env.PROXY_SERVER || !process.env.PROXY_USERNAME) {
      console.error("❌ Error: Missing PROXY secrets.");
      process.exit(1);
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
  
  await page.authenticate({
    username: process.env.PROXY_USERNAME,
    password: process.env.PROXY_PASSWORD
  });

  await page.setViewport({ width: 1920, height: 1080 });

  // 2. CAPTURE START TIME
  // We use this to know when we have looped through the whole DB
  const scriptStartTime = new Date();
  let processedCount = 0;

  console.log("🕒 Batching through the entire database...");

  while (true) {
      // 3. FETCH BATCH (Smart Sort)
      // nulls: 'first' -> Ensures we do NEW products before fixing OLD ones
      // lastSourced: 'asc' -> Ensures we fix the oldest checked items first
      const productsBatch = await prisma.product.findMany({
        take: 5, 
        where: {
            // Only pick items that haven't been touched IN THIS RUN yet
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
          console.log("✅ All products processed in this run.");
          break;
      }

      for (const product of productsBatch) {
        processedCount++;
        try {
            console.log(`\n[${processedCount}] Audit: ${product.title}`);

            // STEP 1: VISUAL SEARCH (Enhanced Query)
            const query = `site:aliexpress.com ${product.title}`;
            const lensUrl = `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(product.imageUrl)}&q=${encodeURIComponent(query)}`;
            
            await page.goto(lensUrl, { waitUntil: 'domcontentloaded' });
            
            // Consent Handler
            try {
                const consentButton = await page.$x("//button[contains(., 'Reject') or contains(., 'I agree') or contains(., 'Odrzuć') or contains(., 'Zaakceptuj') or contains(., 'Zgadzam') or contains(., 'Alle ablehnen') or contains(., 'Tout refuser')]");
                if (consentButton.length > 0) {
                    await consentButton[0].click();
                    await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 5000 }).catch(() => {});
                }
            } catch (err) {}

            await randomSleep(2000, 5000); 

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

            // STEP 3: VERIFICATION
            if (result) {
                const check = checkTitleMatch(product.title, result.title);

                if (check.match) {
                    console.log(`   🔗 Link Found: ${result.href}`);
                    console.log(`   ✅ Verified: ${check.reason}`);
                    
                    await prisma.product.update({
                        where: { id: product.id },
                        data: {
                            supplierUrl: result.href,
                            lastSourced: new Date() // Updates timestamp so it won't be picked again this run
                        }
                    });
                } else {
                    console.log(`   ❌ Ditching Link: ${check.reason}`);
                    await prisma.product.update({
                        where: { id: product.id },
                        data: { 
                            supplierUrl: null, // Wipe bad data
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
  }

  await browser.close();
  await prisma.$disconnect();
  console.log("\n🏁 Full Database Audit Complete.");
}

main();