// @ts-nocheck
import { PrismaClient } from '@prisma/client';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const prisma = new PrismaClient();

// List of modern User Agents to rotate identities
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:123.0) Gecko/20100101 Firefox/123.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
];

const randomSleep = (min = 5000, max = 10000) => {
  const ms = Math.floor(Math.random() * (max - min + 1) + min);
  return new Promise(resolve => setTimeout(resolve, ms));
};

const BATCH_SIZE = 4; // Reduced batch size slightly for safety

// --- KEYWORD OVERLAP LOGIC ---
const checkTitleMatch = (originalTitle: string, foundTitle: string) => {
    const stopWords = [
        'the', 'a', 'an', 'and', 'or', 'for', 'of', 'in', 'with', 'to', 'at', 
        'men', 'mens', 'women', 'womens', 'new', 'hot', 'sale', 'fashion', 
        'der', 'die', 'und', 'für', 'mit', 'le', 'la', 'et', 'pour', 'avec', 'i', 'w', 'z', 'dla', 'na'          
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
  console.log("🛡️ Starting Polymorphic Auditor (Anti-Ban Protocol)...");

  if (!process.env.PROXY_SERVER || !process.env.PROXY_USERNAME) {
      console.error("❌ Error: Missing PROXY secrets.");
      process.exit(1);
  }

  const scriptStartTime = new Date();
  let totalProcessed = 0;
  let consecutiveFailures = 0;

  while (true) {
      // 0. SMART COOLING LOGIC
      // If we failed 3 times in a row, the IP is likely hot. Wait it out.
      if (consecutiveFailures >= 3) {
          console.log("\n🔥 High Failure Rate Detected (Soft Ban).");
          console.log("🧊 Cooling down for 2 minutes to reset Google reputation...");
          await new Promise(resolve => setTimeout(resolve, 120000)); // 2 minutes
          consecutiveFailures = 0; // Reset counter
          console.log("▶️ Resuming...");
      }

      // 1. FETCH BATCH
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

      // Pick a random identity for this session
      const randomUA = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
      console.log(`\n🎭 New Identity: ${randomUA.substring(0, 40)}...`);

      // 2. LAUNCH BROWSER
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

      // Apply Random Identity
      await page.setUserAgent(randomUA);
      await page.setViewport({ width: 1920, height: 1080 });

      // 3. PROCESS BATCH
      for (const product of productsBatch) {
        totalProcessed++;
        try {
            console.log(`\n[${totalProcessed}] Audit: ${product.title}`);

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

            await randomSleep(4000, 8000); // Increased safety delay

            // Extraction
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

            // Verification
            if (result) {
                // SUCCESS: Reset failure counter
                consecutiveFailures = 0; 
                
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
                // FAILURE: Increment counter
                consecutiveFailures++;
                
                await prisma.product.update({
                    where: { id: product.id },
                    data: { 
                        lastSourced: new Date() 
                    }
                });
            }

        } catch (e) {
            console.error(`   ❌ Error: ${e.message}`);
            consecutiveFailures++;
        }
      }

      console.log("💤 Cooling down for 10s...");
      await browser.close();
      await new Promise(resolve => setTimeout(resolve, 10000));
  }

  await prisma.$disconnect();
  console.log("\n🏁 Full Database Audit Complete.");
}

main();