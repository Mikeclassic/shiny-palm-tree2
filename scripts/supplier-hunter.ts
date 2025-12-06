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
  console.log("🇫🇷 Starting Native Mimicry Hunter (French/EUR Protocol)...");

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
        '--lang=fr-FR,fr', // Tell Chrome we are French
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

  await page.setViewport({ width: 1920, height: 1080 });

  // 3. SET FRENCH HEADERS (Crucial for Proxy Match)
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': 'https://www.google.fr/'
  });

  // NOTE: We do NOT force US cookies anymore. We let the French proxy dictate the region.

  // 4. WARM UP ON FRENCH HOMEPAGE
  console.log("   ☕ Warming up on fr.aliexpress.com...");
  try {
      await page.goto('https://fr.aliexpress.com/', { waitUntil: 'domcontentloaded' });
      await randomSleep(2000, 4000);
      
      // Close "Accept Cookies" or "Welcome" French modals
      try {
          const closeBtn = await page.$x("//div[contains(@class, 'close-layer') or contains(@class, 'pop-close-btn') or contains(text(), 'Accepter')]");
          if (closeBtn.length > 0) await closeBtn[0].click();
      } catch (e) {}
  } catch (e) {
      console.log("   ⚠️ Warm-up glitch (ignoring)...");
  }

  for (const product of productsToHunt) {
    try {
        console.log(`\n🔍 Hunting: ${product.title}`);

        // --- STEP 1: GOOGLE LENS ---
        const lensUrl = `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(product.imageUrl)}&q=aliexpress`;
        await page.goto(lensUrl, { waitUntil: 'domcontentloaded' });
        
        // Handle Consent (French "Tout refuser" or "J'accepte")
        try {
            const consentButton = await page.$x("//button[contains(., 'Reject') or contains(., 'agree') or contains(., 'accepte') or contains(., 'refuser')]");
            if (consentButton.length > 0) await consentButton[0].click();
        } catch (err) {}

        await randomSleep(3000, 5000);

        // Find Link
        let foundLink = await page.evaluate(() => {
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

        // --- STEP 2: LOCALIZE URL (Force FR Domain) ---
        // Convert "www.aliexpress.com" -> "fr.aliexpress.com" to match the proxy
        let targetUrl = foundLink.replace('//www.aliexpress', '//fr.aliexpress');
        // Ensure it doesn't duplicate if it was already fr
        if (!targetUrl.includes('fr.aliexpress')) {
             targetUrl = targetUrl.replace('aliexpress.com', 'fr.aliexpress.com');
        }
        
        console.log(`   🔗 Visiting: ${targetUrl}`);

        try {
            await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
        } catch (e) {
            console.log("   ⚠️ Navigation timeout (Proceeding check)...");
        }

        await randomSleep(2000, 4000);

        // --- STEP 3: PRICE EXTRACTION (EURO & FR FORMAT) ---
        const priceData = await page.evaluate(() => {
            try {
                // Method 1: Global Data (runParams)
                if (window.runParams && window.runParams.data) {
                    const d = window.runParams.data;
                    const priceObj = d.priceModule?.minActivityAmount || d.priceModule?.maxAmount || d.productInfoComponent?.price;
                    if (priceObj) {
                        return priceObj.value || priceObj.minPrice;
                    }
                }
                
                // Method 2: Schema (JSON-LD)
                const scripts = document.querySelectorAll('script[type="application/ld+json"]');
                for (const s of scripts) {
                    const json = JSON.parse(s.innerText);
                    if (json['@type'] === 'Product' && json.offers) {
                        return Array.isArray(json.offers) ? json.offers[0].price : json.offers.price;
                    }
                }

                // Method 3: Visual Text (Euro Specific)
                // Looks for "12,34 €" or "€12,34"
                const text = document.body.innerText;
                // Regex matches: digits, maybe dot/comma, maybe spaces, then Euro symbol (or vice versa)
                const match = text.match(/(\d+[\.,]\d+)\s*€|€\s*(\d+[\.,]\d+)/);
                if (match) return match[1] || match[2];
                
                // Fallback for "US $" if page defaulted to English
                const usMatch = text.match(/US\s?\$(\d+(\.\d+)?)/);
                if (usMatch) return usMatch[1];

            } catch (e) { return null; }
            return null;
        });

        if (priceData) {
            // Clean Price: French uses comma for decimals (12,99 -> 12.99)
            let rawString = priceData.toString();
            if (rawString.includes(',') && !rawString.includes('.')) {
                rawString = rawString.replace(',', '.');
            }
            // Remove non-numeric/dot
            const cleanPrice = parseFloat(rawString.replace(/[^0-9.]/g, ''));

            console.log(`   💰 Price Found: €${cleanPrice} (Saved as number)`);

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
            const bodyLen = await page.evaluate(() => document.body.innerText.length);
            console.log(`   ⚠️ Price hidden. (Body Size: ${bodyLen})`);
            
            // Still save the URL so the user can check manually
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