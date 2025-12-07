// @ts-nocheck
import { PrismaClient } from '@prisma/client';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const prisma = new PrismaClient();

// ROTATING IDENTITIES
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
];

// HUMAN DELAY (15 to 30 Seconds)
const longSleep = () => {
  const ms = Math.floor(Math.random() * (15000) + 15000); 
  return new Promise(resolve => setTimeout(resolve, ms));
};

// --- KEYWORD LOGIC ---
const checkTitleMatch = (originalTitle: string, foundTitle: string) => {
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'for', 'of', 'in', 'with', 'to', 'at', 'men', 'mens', 'women', 'womens', 'new', 'hot', 'sale', 'fashion', 'der', 'die', 'und', 'für', 'mit', 'le', 'la', 'et', 'pour', 'avec', 'i', 'w', 'z', 'dla', 'na'];
    const clean = (str: string) => str.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2 && !stopWords.includes(w));
    const originalWords = clean(originalTitle);
    const foundWords = clean(foundTitle);
    
    if (originalWords.length === 0) return { match: true, reason: "No keywords" };
    const matchingWords = originalWords.filter(w => foundWords.includes(w));
    
    return matchingWords.length > 0 
        ? { match: true, reason: `Matched: [${matchingWords.join(', ')}]` } 
        : { match: false, reason: `Mismatch` };
};

async function main() {
  console.log("🐢 Starting Deep Stealth Hunter (Auto-Resume Mode)...");

  if (!process.env.PROXY_SERVER) {
      console.error("❌ Error: Missing PROXY secrets.");
      process.exit(1);
  }

  const scriptStartTime = new Date();
  let consecutiveFailures = 0;
  let totalProcessed = 0;

  while (true) {
      // CIRCUIT BREAKER: Pause if blocked 3 times in a row
      if (consecutiveFailures >= 3) {
          console.log("\n🛑 High Block Rate detected (Soft Ban).");
          console.log("🧊 Pausing for 10 minutes to let Proxy cool down...");
          
          // Wait 10 minutes (600,000 ms)
          await new Promise(resolve => setTimeout(resolve, 600000));
          
          consecutiveFailures = 0; // Reset counter
          console.log("▶️ Resuming operations...");
      }

      // FETCH 1 ITEM AT A TIME
      const product = await prisma.product.findFirst({
        where: {
            OR: [
                { lastSourced: null },
                { lastSourced: { lt: scriptStartTime } }
            ]
        },
        orderBy: { lastSourced: { sort: 'asc', nulls: 'first' } }
      });

      if (!product) {
          console.log("✅ All products checked.");
          break;
      }

      totalProcessed++;
      console.log(`\n[${totalProcessed}] Audit: ${product.title}`);

      // 1. LAUNCH FRESH BROWSER (Single Use)
      const randomUA = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
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

      try {
          const page = await browser.newPage();
          page.setDefaultNavigationTimeout(60000);
          await page.authenticate({ username: process.env.PROXY_USERNAME, password: process.env.PROXY_PASSWORD });
          await page.setUserAgent(randomUA);
          await page.setViewport({ width: 1920, height: 1080 });

          // 2. GOOGLE LENS
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

          // Wait for results to load
          await new Promise(resolve => setTimeout(resolve, 5000));

          // 3. EXTRACT
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

          // 4. VERIFY & SAVE
          if (result) {
              consecutiveFailures = 0; // Success! Reset failures.
              const check = checkTitleMatch(product.title, result.title);

              if (check.match) {
                  console.log(`   🔗 Link Found: ${result.href}`);
                  console.log(`   ✅ Verified`);
                  
                  await prisma.product.update({
                      where: { id: product.id },
                      data: { supplierUrl: result.href, lastSourced: new Date() }
                  });
              } else {
                  console.log(`   ❌ Mismatch: ${check.reason}`);
                  await prisma.product.update({
                      where: { id: product.id },
                      data: { supplierUrl: null, lastSourced: new Date() }
                  });
              }
          } else {
              console.log("   ❌ No Link Found (Possible Block or Not Found)");
              consecutiveFailures++; // Failure. Increment counter.
              await prisma.product.update({
                  where: { id: product.id },
                  data: { lastSourced: new Date() }
              });
          }

      } catch (e) {
          console.error(`   ⚠️ Error: ${e.message}`);
          consecutiveFailures++;
      } finally {
          await browser.close();
          console.log("   💤 Cooling down (15-30s)...");
          await longSleep();
      }
  }

  await prisma.$disconnect();
  console.log("\n🏁 Done.");
}

main();