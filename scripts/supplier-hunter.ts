// @ts-nocheck
import { PrismaClient } from '@prisma/client';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

// Enable Stealth - critical for avoiding the "Welcome" captcha
puppeteer.use(StealthPlugin());

const prisma = new PrismaClient();

const randomSleep = (min = 2000, max = 5000) => {
  const ms = Math.floor(Math.random() * (max - min + 1) + min);
  return new Promise(resolve => setTimeout(resolve, ms));
};

async function main() {
  console.log("🦅 Starting Desktop Hunter (Consistency Protocol)...");

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

  // 1. LAUNCH BROWSER (Standard Desktop Config)
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

  // 3. SET CONSISTENT DESKTOP FINGERPRINT
  // We set this ONCE and never change it.
  await page.setViewport({ width: 1920, height: 1080 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

  // 4. INJECT COOKIES (Force English/USD)
  // This prevents the redirect to 'fr.aliexpress' login pages
  await page.setCookie({
      name: 'aep_usuc_f',
      value: 'site=glo&c_tp=USD&region=US&b_locale=en_US',
      domain: '.aliexpress.com'
  });

  for (const product of productsToHunt) {
    try {
        console.log(`\n🔍 Hunting: ${product.title}`);

        // --- STEP 1: GOOGLE LENS ---
        const lensUrl = `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(product.imageUrl)}&q=aliexpress`;
        await page.goto(lensUrl, { waitUntil: 'domcontentloaded' });
        
        // Handle Google Consent Popup
        try {
            const consentButton = await page.$x("//button[contains(., 'Reject all') or contains(., 'I agree') or contains(., 'Tout refuser')]");
            if (consentButton.length > 0) await consentButton[0].click();
        } catch (err) {}

        await randomSleep(3000, 5000);

        // Find Link
        let foundLink = await page.evaluate(() => {
            const anchors = Array.from(document.querySelectorAll('a'));
            // Look for aliexpress.com/item links
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

        // --- STEP 2: SANITIZE URL (CRITICAL FIX) ---
        // Convert "fr.aliexpress.com/item/123.html" -> "www.aliexpress.com/item/123.html"
        // This stops the server from detecting a mismatch between your US Cookies and the French URL.
        const idMatch = foundLink.match(/\/item\/(\d+)\.html/);
        let targetUrl = foundLink;
        
        if (idMatch && idMatch[1]) {
            targetUrl = `https://www.aliexpress.com/item/${idMatch[1]}.html`;
            console.log(`   🔗 Normalized Link: ${targetUrl}`);
        } else {
            console.log(`   🔗 Visiting (Raw): ${foundLink}`);
        }

        // --- STEP 3: NAVIGATE ---
        try {
            await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
        } catch (e) {
            console.log("   ⚠️ Navigation warning (proceeding to check content)...");
        }

        // Humanize: Scroll down slightly to trigger JS loading
        await page.evaluate(() => window.scrollBy(0, 500));
        await randomSleep(2000, 4000);

        // --- STEP 4: DATA EXTRACTION (The Desktop Method) ---
        // On Desktop, AliExpress puts data in 'window.runParams'. We prefer this over HTML parsing.
        const priceData = await page.evaluate(() => {
            try {
                // Method A: RunParams (Global Variable)
                if (window.runParams && window.runParams.data) {
                    const d = window.runParams.data;
                    if (d.priceModule?.minActivityAmount?.value) return d.priceModule.minActivityAmount.value;
                    if (d.productInfoComponent?.price?.minPrice) return d.productInfoComponent.price.minPrice;
                }
                
                // Method B: Schema.org (JSON-LD)
                const scripts = document.querySelectorAll('script[type="application/ld+json"]');
                for (const s of scripts) {
                    const json = JSON.parse(s.innerText);
                    if (json['@type'] === 'Product' && json.offers) {
                        return Array.isArray(json.offers) ? json.offers[0].price : json.offers.price;
                    }
                }

                // Method C: Visual Text (Fallback)
                const text = document.body.innerText;
                // Regex for "US $12.99"
                const match = text.match(/US\s?\$(\d+(\.\d+)?)/);
                if (match) return match[1];

            } catch (e) { return null; }
            return null;
        });

        if (priceData) {
            const cleanPrice = parseFloat(priceData.toString().replace(/[^0-9.]/g, ''));
            console.log(`   💰 Price Found: $${cleanPrice}`);

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
            // Debugging the Block
            const pageTitle = await page.title();
            const bodyLen = await page.evaluate(() => document.body.innerText.length);
            console.log(`   ⚠️ Price hidden. Title: "${pageTitle}", Body Size: ${bodyLen}`);
            
            // If body is tiny, we were blocked. If body is large, we just missed the CSS.
            // We save the URL anyway so the user can manually check.
            await prisma.product.update({ 
                where: { id: product.id }, 
                data: { supplierUrl: targetUrl, lastSourced: new Date() }
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