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
  console.log("🦁 Starting Expert Hunter (Warm-up Protocol)...");

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

  await page.setViewport({ width: 1920, height: 1080 });

  // 3. WARM-UP PHASE (Critical Step)
  // We visit the homepage FIRST to get legitimate cookies for the Proxy's IP region.
  console.log("   ☕ Warming up cookies on Homepage...");
  try {
      await page.goto('https://www.aliexpress.com/', { waitUntil: 'domcontentloaded' });
      await randomSleep(2000, 4000);
      
      // Close "Welcome" popup if it exists
      try {
          const closeBtn = await page.$x("//div[contains(@class, 'close-layer') or contains(@class, 'pop-close-btn')]");
          if (closeBtn.length > 0) await closeBtn[0].click();
      } catch (e) {}
      
  } catch (e) {
      console.log("   ⚠️ Homepage warm-up failed, continuing anyway...");
  }

  for (const product of productsToHunt) {
    try {
        console.log(`\n🔍 Hunting: ${product.title}`);

        // --- STEP 1: GOOGLE LENS ---
        const lensUrl = `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(product.imageUrl)}&q=aliexpress`;
        
        // Use Google as Referer
        await page.setExtraHTTPHeaders({ 'Referer': 'https://www.google.com/' });
        
        await page.goto(lensUrl, { waitUntil: 'domcontentloaded' });
        
        // Handle Google Consent
        try {
            const consentButton = await page.$x("//button[contains(., 'Reject all') or contains(., 'I agree') or contains(., 'Tout refuser')]");
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

        // --- STEP 2: NORMALIZE URL ---
        // We force WWW but we DO NOT inject "US" cookies. We let the warm-up cookies handle the region.
        foundLink = foundLink.replace(/\/\/[a-z]{2}\.aliexpress\.com/, '//www.aliexpress.com');
        console.log(`   🔗 Link: ${foundLink}`);

        // --- STEP 3: NAVIGATE WITH REFERER ---
        // This tells AliExpress we came from Google Search, which is trusted.
        await page.setExtraHTTPHeaders({ 'Referer': 'https://www.google.com/' });

        try {
            await page.goto(foundLink, { waitUntil: 'domcontentloaded', timeout: 45000 });
        } catch (e) {
            console.log("   ⚠️ Navigation timeout (Checking content...)");
        }

        await randomSleep(3000, 5000);

        // --- STEP 4: DIAGNOSE BLOCKING ---
        const bodyText = await page.evaluate(() => document.body.innerText);
        const bodyLen = bodyText.length;
        
        if (bodyLen < 2000) {
            console.log(`   ⚠️ BLOCKED. Page Size: ${bodyLen} chars.`);
            console.log(`   📄 Page Says: "${bodyText.substring(0, 100).replace(/\n/g, ' ')}..."`);
            
            // If it's a "Slide to verify" or "Click to verify", we might need a captcha solver service.
            // But for now, we just skip.
            await prisma.product.update({ where: { id: product.id }, data: { supplierUrl: foundLink, lastSourced: new Date() }});
            continue;
        }

        // --- STEP 5: EXTRACTION ---
        const priceData = await page.evaluate(() => {
            try {
                // Method 1: Global Data
                if (window.runParams && window.runParams.data) {
                    const d = window.runParams.data;
                    if (d.priceModule?.minActivityAmount?.value) return d.priceModule.minActivityAmount.value;
                    if (d.productInfoComponent?.price?.minPrice) return d.productInfoComponent.price.minPrice;
                }
                
                // Method 2: Regex on Body (Works for any currency/language)
                // Looks for digits following a currency symbol
                const text = document.body.innerText;
                const match = text.match(/[\$€£]\s*(\d+([.,]\d+)?)/);
                if (match && match[1]) return match[1];

            } catch (e) { return null; }
            return null;
        });

        if (priceData) {
            // Clean price (handle commas for EU proxies)
            let cleanPrice = 0;
            let rawString = priceData.toString();
            
            // If "12,34" -> "12.34"
            if (rawString.includes(',') && !rawString.includes('.')) {
                rawString = rawString.replace(',', '.');
            }
            cleanPrice = parseFloat(rawString.replace(/[^0-9.]/g, ''));

            console.log(`   💰 Price Found: ${cleanPrice}`);

            await prisma.product.update({
                where: { id: product.id },
                data: {
                    supplierUrl: foundLink,
                    supplierPrice: cleanPrice,
                    lastSourced: new Date()
                }
            });
            console.log("   ✅ Saved.");
        } else {
            console.log("   ⚠️ Price not found (Structure changed or OOS).");
            await prisma.product.update({ where: { id: product.id }, data: { supplierUrl: foundLink, lastSourced: new Date() }});
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