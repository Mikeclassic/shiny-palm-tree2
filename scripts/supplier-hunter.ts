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
  console.log("🕵️ Starting Hybrid Hunter (Desktop Lens + Network Sniffer)...");

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

  console.log(`🎯 Targeting ${productsToHunt.length} products...`);

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

  // 1. AUTHENTICATE
  await page.authenticate({
    username: process.env.PROXY_USERNAME,
    password: process.env.PROXY_PASSWORD
  });

  // 2. SET DESKTOP VIEWPORT & USER AGENT (Crucial for Lens)
  await page.setViewport({ width: 1920, height: 1080 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');

  // 3. PRE-SET ALIEXPRESS COOKIES (Force USD/English)
  await page.setCookie({
      name: 'aep_usuc_f',
      value: 'site=glo&c_tp=USD&region=US&b_locale=en_US',
      domain: '.aliexpress.com'
  });

  for (const product of productsToHunt) {
    try {
        console.log(`\n🔍 Hunting: ${product.title}`);

        // --- STEP 1: GOOGLE LENS (Desktop) ---
        const lensUrl = `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(product.imageUrl)}&q=aliexpress`;
        
        await page.goto(lensUrl, { waitUntil: 'domcontentloaded' });
        
        // Handle Consent
        try {
            const consentButton = await page.$x("//button[contains(., 'Reject all') or contains(., 'I agree')]");
            if (consentButton.length > 0) await consentButton[0].click();
        } catch (err) {}

        await randomSleep(3000, 5000);

        // Extract Link (Desktop Selector)
        let foundLink = await page.evaluate(() => {
            const anchors = Array.from(document.querySelectorAll('a'));
            // Look for "aliexpress.com/item" inside the HREF
            const productLinks = anchors
                .map(a => a.href)
                .filter(href => href && href.includes('aliexpress.com/item'));
            return productLinks.length > 0 ? productLinks[0] : null;
        });

        if (!foundLink) {
            console.log("   ❌ No AliExpress link found.");
            // Log title to debug if Google is blocking us
            const title = await page.title();
            console.log(`   (Page Title: ${title})`);
            
            await prisma.product.update({ where: { id: product.id }, data: { lastSourced: new Date() }});
            continue;
        }

        // Clean URL to Global
        foundLink = foundLink.replace(/\/\/[a-z]{2}\.aliexpress\.com/, '//www.aliexpress.com');
        console.log(`   🔗 Visiting: ${foundLink}`);

        // --- STEP 2: NETWORK SNIFFER (The "Invisible" Price) ---
        // We listen to background data packets. This bypasses the HTML/CSS completely.
        let capturedPrice = 0;
        
        const responseListener = async (response) => {
            const url = response.url();
            // Listen for API calls that contain price data
            if (url.includes('mtop') || url.includes('calc') || url.includes('price')) {
                try {
                    const text = await response.text();
                    // Regex to find "minPrice": 12.34 or "price": "12.34"
                    const match = text.match(/"(actMinPrice|minPrice|price|formatedAmount)"\s*:\s*"?(\d+(\.\d+)?)"?/);
                    if (match && match[2]) {
                        const p = parseFloat(match[2]);
                        if (p > 0.1) capturedPrice = p;
                    }
                } catch(e) {}
            }
        };

        page.on('response', responseListener);

        // Navigate
        try {
            await page.goto(foundLink, { waitUntil: 'networkidle2', timeout: 45000 });
        } catch (e) {
            console.log("   ⚠️ Navigation timeout (Continuing if price captured...)");
        }

        // Wait a bit for late packets
        await randomSleep(2000, 4000);
        page.off('response', responseListener);

        // --- STEP 3: FALLBACK (Window Variable) ---
        if (capturedPrice === 0) {
            capturedPrice = await page.evaluate(() => {
                try {
                    // Check Global Window Variable (AliExpress standard)
                    if (window.runParams && window.runParams.data) {
                         const d = window.runParams.data;
                         if (d.priceModule?.minActivityAmount?.value) return d.priceModule.minActivityAmount.value;
                         if (d.productInfoComponent?.price?.minPrice) return d.productInfoComponent.price.minPrice;
                    }
                    // Check Meta Tag
                    const meta = document.querySelector('meta[property="og:price:amount"]');
                    if (meta) return parseFloat(meta.getAttribute('content'));
                    
                    // Check Visible Text (Last Resort)
                    const text = document.body.innerText;
                    const m = text.match(/US\s?\$(\d+(\.\d+)?)/);
                    if (m) return parseFloat(m[1]);
                    
                } catch (e) {}
                return 0;
            });
        }

        // --- RESULT ---
        if (capturedPrice > 0) {
            console.log(`   💰 Price Found: $${capturedPrice}`);
            await prisma.product.update({
                where: { id: product.id },
                data: {
                    supplierUrl: foundLink,
                    supplierPrice: capturedPrice,
                    lastSourced: new Date()
                }
            });
            console.log("   ✅ Saved.");
        } else {
            console.log("   ⚠️ Price hidden. (Page might be blocked or Login Wall)");
            const title = await page.title();
            console.log(`   (Page Title: ${title})`);
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