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
  console.log("🦎 Starting Chameleon Hunter (Desktop Search -> Mobile Visit)...");

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

  // Launch with maximum stealth arguments
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled', // Critical: Hides "Chrome is being controlled by test software"
        '--window-size=1920,1080',
        `--proxy-server=http://${process.env.PROXY_SERVER}`
    ]
  });

  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(60000); 

  // 1. AUTHENTICATE PROXY
  await page.authenticate({
    username: process.env.PROXY_USERNAME,
    password: process.env.PROXY_PASSWORD
  });

  // 2. APPLY ANTI-DETECT PATCH (Removes 'navigator.webdriver' flag)
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
    });
  });

  for (const product of productsToHunt) {
    try {
        console.log(`\n🔍 Hunting: ${product.title}`);

        // ==========================================
        // PHASE 1: DESKTOP MODE (Find the Link)
        // ==========================================
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');

        const lensUrl = `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(product.imageUrl)}&q=aliexpress`;
        
        try {
            await page.goto(lensUrl, { waitUntil: 'domcontentloaded' });
        } catch(e) {
            console.log("   ⚠️ Google Lens Timeout (might still have loaded)");
        }
        
        // Handle Google Consent
        try {
            const consentButton = await page.$x("//button[contains(., 'Reject all') or contains(., 'I agree') or contains(., 'Tout refuser')]");
            if (consentButton.length > 0) await consentButton[0].click();
        } catch (err) {}

        await randomSleep(2000, 4000);

        // Robust Link Extraction (Handles Google Search & Lens Grid)
        let foundLink = await page.evaluate(() => {
            const anchors = Array.from(document.querySelectorAll('a'));
            // Filter for AliExpress Item links (ignore login/categories)
            const productLinks = anchors
                .map(a => a.href)
                .filter(href => href && href.includes('aliexpress.com/item') && !href.includes('login') && !href.includes('account'));
            return productLinks.length > 0 ? productLinks[0] : null;
        });

        if (!foundLink) {
            console.log("   ❌ No AliExpress link found.");
            await prisma.product.update({ where: { id: product.id }, data: { lastSourced: new Date() }});
            continue;
        }

        // Clean URL (Remove extra params)
        const cleanUrl = foundLink.split('?')[0];
        console.log(`   🔗 Found: ${cleanUrl}`);

        // ==========================================
        // PHASE 2: MOBILE MODE (Visit AliExpress)
        // ==========================================
        // We pretend to be an iPhone. Mobile sites are 10x easier to scrape.
        
        await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
        await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1');
        
        // Force English/USD on Mobile
        await page.setCookie({
            name: 'aep_usuc_f',
            value: 'site=glo&c_tp=USD&region=US&b_locale=en_US',
            domain: '.aliexpress.com'
        });

        // Setup Network Trap (Listen for JSON Price Data)
        let capturedPrice = 0;
        const responseListener = async (response) => {
            const url = response.url();
            // Mobile APIs (mtop = Taobao/Ali Mobile Protocol)
            if (url.includes('mtop') || url.includes('calc') || url.includes('getWapItemDetail')) {
                try {
                    const text = await response.text();
                    // Regex for various JSON price formats
                    const match = text.match(/"(actMinPrice|minPrice|price|formatedAmount)"\s*:\s*"?(\d+(\.\d+)?)"?/);
                    if (match && match[2]) {
                        const p = parseFloat(match[2]);
                        if (p > 0.1) capturedPrice = p;
                    }
                } catch(e) {}
            }
        };

        page.on('response', responseListener);

        console.log("   📱 Switching to Mobile View & Visiting...");
        
        try {
            await page.goto(cleanUrl, { waitUntil: 'networkidle2', timeout: 45000 });
        } catch (e) {
            console.log("   ⚠️ Navigation Timeout (Checking if price captured...)");
        }

        await randomSleep(3000, 5000);
        page.off('response', responseListener);

        // --- FALLBACK: SCRAPE VISIBLE MOBILE TEXT ---
        if (capturedPrice === 0) {
            capturedPrice = await page.evaluate(() => {
                // 1. Check for specific mobile classes
                const selectors = [
                    '.price-text', 
                    '.uniform-banner-box-price', 
                    '.product-price-current',
                    '[class*="price"]' // Wildcard fallback
                ];
                
                for (const sel of selectors) {
                    const el = document.querySelector(sel);
                    if (el && el.innerText) {
                        const txt = el.innerText;
                        // Extract number from "$ 12.34" or "US $12.34"
                        const match = txt.match(/[\d\.,]+/);
                        if (match) {
                            // Fix comma decimals (12,34 -> 12.34)
                            const clean = parseFloat(match[0].replace(',', '.'));
                            if (!isNaN(clean) && clean > 0) return clean;
                        }
                    }
                }
                return 0;
            });
        }

        // --- FINAL CHECK ---
        if (capturedPrice > 0) {
            console.log(`   💰 Price Found: $${capturedPrice}`);
            await prisma.product.update({
                where: { id: product.id },
                data: {
                    supplierUrl: cleanUrl,
                    supplierPrice: capturedPrice,
                    lastSourced: new Date()
                }
            });
            console.log("   ✅ Saved.");
        } else {
            console.log("   ⚠️ Price hidden.");
            // Log Page Title to see if blocked
            const title = await page.title();
            const bodyLen = await page.evaluate(() => document.body.innerText.length);
            console.log(`   (Debug: Title="${title}", BodyLen=${bodyLen})`);
            
            // Still save URL even if price is missing
            await prisma.product.update({ where: { id: product.id }, data: { supplierUrl: cleanUrl, lastSourced: new Date() }});
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