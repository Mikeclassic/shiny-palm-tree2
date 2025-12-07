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
    // 1. Common "Stop Words" to ignore (English/German/French/Polish common)
    const stopWords = [
        'the', 'a', 'an', 'and', 'or', 'for', 'of', 'in', 'with', 'to', 'at', 
        'men', 'mens', 'women', 'womens', 'new', 'hot', 'sale', 'fashion', 
        'der', 'die', 'und', 'für', 'mit', // German
        'le', 'la', 'et', 'pour', 'avec',   // French
        'i', 'w', 'z', 'dla', 'na'          // Polish
    ];

    // 2. Cleaning Function
    const clean = (str: string) => {
        return str.toLowerCase()
            .replace(/[^a-z0-9\s]/g, '') // Remove punctuation
            .split(/\s+/) // Split by space
            .filter(w => w.length > 2 && !stopWords.includes(w)); // Remove short/stop words
    };

    const originalWords = clean(originalTitle);
    const foundWords = clean(foundTitle);

    // 3. Comparison
    // If original has no unique keywords, we skip filtering (safety net)
    if (originalWords.length === 0) return { match: true, reason: "No keywords to check" };

    // Find intersection
    const matchingWords = originalWords.filter(w => foundWords.includes(w));

    // 4. Threshold: At least 1 keyword must match
    if (matchingWords.length > 0) {
        return { match: true, reason: `Matched keywords: [${matchingWords.join(', ')}]` };
    }

    return { 
        match: false, 
        reason: `Mismatch. Expected keywords: [${originalWords.join(', ')}] vs Found: [${foundWords.slice(0, 5).join(', ')}...]` 
    };
};

async function main() {
  console.log("🕵️ Starting Hunter (URL + Keyword Verification)...");

  if (!process.env.PROXY_SERVER || !process.env.PROXY_USERNAME) {
      console.error("❌ Error: Missing PROXY secrets.");
      process.exit(1);
  }

  // Find fresh products only
  const productsToHunt = await prisma.product.findMany({
    where: { 
        supplierUrl: null,
        lastSourced: null 
    },
    take: 10, 
    orderBy: { createdAt: 'desc' }
  });

  if (productsToHunt.length === 0) {
    console.log("✅ No new products to hunt.");
    return;
  }

  console.log(`🎯 Targeting ${productsToHunt.length} new products...`);

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

  for (const product of productsToHunt) {
    try {
        console.log(`\n🔍 Hunting: ${product.title}`);

        // ============================================================
        // STEP 1: VISUAL SEARCH
        // ============================================================
        // Note: We use specific text query to help the visual search context
        const query = `site:aliexpress.com ${product.title}`;
        const lensUrl = `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(product.imageUrl)}&q=${encodeURIComponent(query)}`;
        
        console.log("   📸 Visiting Lens Multisearch...");
        await page.goto(lensUrl, { waitUntil: 'domcontentloaded' });
        
        // Consent Handler
        try {
            const consentButton = await page.$x("//button[contains(., 'Reject') or contains(., 'I agree') or contains(., 'Odrzuć') or contains(., 'Zaakceptuj') or contains(., 'Zgadzam') or contains(., 'Alle ablehnen') or contains(., 'Tout refuser')]");
            if (consentButton.length > 0) {
                console.log("   🍪 Clicking Consent...");
                await consentButton[0].click();
                await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 5000 }).catch(() => {});
            }
        } catch (err) {}

        await randomSleep(3000, 6000); 

        // ============================================================
        // STEP 2: EXTRACTION WITH TEXT
        // ============================================================
        const result = await page.evaluate(() => {
            const anchors = Array.from(document.querySelectorAll('a'));
            // Find links that go to aliexpress items
            const hits = anchors.filter(a => a.href && a.href.includes('aliexpress.com/item'));
            
            if (hits.length > 0) {
                const best = hits[0]; // Take top result
                return {
                    href: best.href,
                    // Grab text from inside the link, or aria-label, or title attribute
                    title: best.innerText || best.getAttribute('aria-label') || best.title || ""
                };
            }
            return null;
        });

        if (result) {
            // ============================================================
            // STEP 3: KEYWORD VERIFICATION
            // ============================================================
            const check = checkTitleMatch(product.title, result.title);

            if (check.match) {
                console.log(`   🔗 Found: ${result.href}`);
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
                console.log(`      (Found Title: "${result.title.substring(0, 50)}...")`);
                
                // Mark as sourced (but null URL) so we don't retry immediately
                await prisma.product.update({
                    where: { id: product.id },
                    data: { lastSourced: new Date() }
                });
            }

        } else {
            console.log("   ❌ No AliExpress link found.");
            await prisma.product.update({
                where: { id: product.id },
                data: { lastSourced: new Date() }
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