// @ts-nocheck
import { PrismaClient } from '@prisma/client';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const prisma = new PrismaClient();

// --- YOUR 20 WEBSHARE PROXIES ---
const PROXY_POOL = [
    { server: '45.56.179.232', port: '9436', user: 'axawcrtj-staticresidential', pass: 'ppln6eov54sp' },
    { server: '45.56.183.91', port: '8413', user: 'axawcrtj-staticresidential', pass: 'ppln6eov54sp' },
    { server: '9.142.41.79', port: '6249', user: 'axawcrtj-staticresidential', pass: 'ppln6eov54sp' },
    { server: '46.203.161.177', port: '5674', user: 'axawcrtj-staticresidential', pass: 'ppln6eov54sp' },
    { server: '45.56.161.191', port: '9067', user: 'axawcrtj-staticresidential', pass: 'ppln6eov54sp' },
    { server: '130.180.228.59', port: '6343', user: 'axawcrtj-staticresidential', pass: 'ppln6eov54sp' },
    { server: '216.98.255.22', port: '6644', user: 'axawcrtj-staticresidential', pass: 'ppln6eov54sp' },
    { server: '46.203.80.77', port: '6075', user: 'axawcrtj-staticresidential', pass: 'ppln6eov54sp' },
    { server: '63.141.62.103', port: '6396', user: 'axawcrtj-staticresidential', pass: 'ppln6eov54sp' },
    { server: '9.142.208.77', port: '5743', user: 'axawcrtj-staticresidential', pass: 'ppln6eov54sp' },
    { server: '45.56.137.70', port: '9135', user: 'axawcrtj-staticresidential', pass: 'ppln6eov54sp' },
    { server: '64.52.31.102', port: '6289', user: 'axawcrtj-staticresidential', pass: 'ppln6eov54sp' },
    { server: '9.142.9.231', port: '5388', user: 'axawcrtj-staticresidential', pass: 'ppln6eov54sp' },
    { server: '9.142.8.9', port: '5666', user: 'axawcrtj-staticresidential', pass: 'ppln6eov54sp' },
    { server: '9.142.8.177', port: '5834', user: 'axawcrtj-staticresidential', pass: 'ppln6eov54sp' },
    { server: '192.46.189.176', port: '6169', user: 'axawcrtj-staticresidential', pass: 'ppln6eov54sp' },
    { server: '130.180.233.45', port: '7616', user: 'axawcrtj-staticresidential', pass: 'ppln6eov54sp' },
    { server: '9.142.209.108', port: '5274', user: 'axawcrtj-staticresidential', pass: 'ppln6eov54sp' },
    { server: '72.46.139.187', port: '6747', user: 'axawcrtj-staticresidential', pass: 'ppln6eov54sp' },
    { server: '72.1.154.34', port: '7925', user: 'axawcrtj-staticresidential', pass: 'ppln6eov54sp' }
];

// ROTATING BROWSER IDENTITIES
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
];

// HUMAN DELAY
const longSleep = () => {
  const ms = Math.floor(Math.random() * (8000) + 5000); 
  return new Promise(resolve => setTimeout(resolve, ms));
};

// KEYWORD LOGIC
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
  console.log(`🏹 Starting Hunter with ${PROXY_POOL.length} Rotating Static Proxies...`);

  let consecutiveFailures = 0;
  let totalProcessed = 0;

  while (true) {
      // CIRCUIT BREAKER
      if (consecutiveFailures >= 5) {
          console.log("\n🛑 High Failure Rate (5 in a row). Pausing 2 mins to rotate...");
          await new Promise(resolve => setTimeout(resolve, 120000)); 
          consecutiveFailures = 0; 
          console.log("▶️ Resuming...");
      }

      // FETCH 1 NEW ITEM
      // Targets items that have NEVER been sourced yet
      const product = await prisma.product.findFirst({
        where: { lastSourced: null },
        orderBy: { createdAt: 'desc' }
      });

      if (!product) {
          console.log("✅ No new products to hunt.");
          break;
      }

      totalProcessed++;
      console.log(`\n[${totalProcessed}] Hunting: ${product.title}`);

      // 1. SELECT RANDOM PROXY
      const proxy = PROXY_POOL[Math.floor(Math.random() * PROXY_POOL.length)];
      // console.log(`   🔌 Using Proxy: ${proxy.server}`); // Uncomment to debug which IP is used

      // 2. LAUNCH FRESH BROWSER
      const randomUA = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
      const browser = await puppeteer.launch({
        headless: "new",
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--window-size=1920,1080',
            `--proxy-server=http://${proxy.server}:${proxy.port}`
        ]
      });

      try {
          const page = await browser.newPage();
          page.setDefaultNavigationTimeout(60000);
          
          // Authenticate with specific proxy credentials
          await page.authenticate({ username: proxy.user, password: proxy.pass });
          
          await page.setUserAgent(randomUA);
          await page.setViewport({ width: 1920, height: 1080 });

          // 3. GOOGLE LENS (Text + Image Query)
          const query = `site:aliexpress.com ${product.title}`;
          const lensUrl = `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(product.imageUrl)}&q=${encodeURIComponent(query)}`;
          
          await page.goto(lensUrl, { waitUntil: 'domcontentloaded' });

          // Universal Consent Handler
          try {
              const consentButton = await page.$x("//button[contains(., 'Reject') or contains(., 'I agree') or contains(., 'Odrzuć') or contains(., 'Zaakceptuj') or contains(., 'Zgadzam') or contains(., 'Alle ablehnen') or contains(., 'Tout refuser') or contains(., 'Accept')]");
              if (consentButton.length > 0) {
                  await consentButton[0].click();
                  await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 5000 }).catch(() => {});
              }
          } catch (err) {}

          await new Promise(resolve => setTimeout(resolve, 4000));

          // 4. EXTRACT
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

          // 5. VERIFY & SAVE
          if (result) {
              consecutiveFailures = 0; 
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
              console.log("   ❌ No Link Found.");
              consecutiveFailures++;
              await prisma.product.update({
                  where: { id: product.id },
                  data: { lastSourced: new Date() }
              });
          }

      } catch (e) {
          console.error(`   ⚠️ Error: ${e.message}`);
          consecutiveFailures++;

          // Handle Proxy Connection Errors specifically
          if (e.message.includes('ERR_TUNNEL_CONNECTION_FAILED') || e.message.includes('ERR_PROXY_CONNECTION_FAILED')) {
              console.log("   🔌 Proxy failed. Switching IP next round...");
              // We do NOT mark as sourced here, so it retries with a new IP
          } else {
              console.log("   ⏭️ Skipping item due to error...");
              await prisma.product.update({
                  where: { id: product.id },
                  data: { lastSourced: new Date() }
              });
          }

      } finally {
          await browser.close();
          console.log("   💤 Cooling down...");
          await longSleep();
      }
  }

  await prisma.$disconnect();
  console.log("\n🏁 Done.");
}

main();