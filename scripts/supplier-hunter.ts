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
  console.log("🕵️ Starting Lens Multisearch Hunter (Pro Protocol)...");

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
  
  await page.authenticate({
    username: process.env.PROXY_USERNAME,
    password: process.env.PROXY_PASSWORD
  });

  await page.setViewport({ width: 1920, height: 1080 });

  // 1. SET COOKIES TO FORCE ENGLISH & USD
  // This prevents 'fr.aliexpress' redirection and currency formatting issues
  await page.setCookie({
      name: 'aep_usuc_f',
      value: 'site=glo&c_tp=USD&region=US&b_locale=en_US',
      domain: '.aliexpress.com'
  });

  for (const product of productsToHunt) {
    try {
        console.log(`\n🔍 Hunting: ${product.title}`);
        const lensUrl = `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(product.imageUrl)}&q=aliexpress`;
        
        await page.goto(lensUrl, { waitUntil: 'domcontentloaded' });
        
        // Handle Google Consent
        try {
            const consentButton = await page.$x("//button[contains(., 'Reject all') or contains(., 'I agree')]");
            if (consentButton.length > 0) await consentButton[0].click();
        } catch (err) {}

        await randomSleep(2000, 4000);

        // Extract Link
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

        // 2. NORMALIZE URL (Force Global English Site)
        // Convert 'fr.aliexpress.com' -> 'www.aliexpress.com'
        foundLink = foundLink.replace(/\/\/[a-z]{2}\.aliexpress\.com/, '//www.aliexpress.com');
        console.log(`   🔗 Visiting: ${foundLink}`);

        await page.goto(foundLink, { waitUntil: 'networkidle2', timeout: 60000 });
        
        // 3. DEBUG: Check if we are blocked
        const pageTitle = await page.title();
        console.log(`   📄 Page Title: "${pageTitle}"`);
        
        if (pageTitle.includes("Login") || pageTitle.includes("Security")) {
            console.log("   🚫 Blocked by Login Wall. Skipping...");
            continue;
        }

        await randomSleep(3000, 5000); 

        // 4. EXTRACT PRICE (The "Pro" Way: window.runParams)
        const priceData = await page.evaluate(() => {
            try {
                // METHOD A: Check Global Javascript Variable (Most accurate)
                // AliExpress stores data in 'runParams'
                if (window.runParams && window.runParams.data) {
                    const data = window.runParams.data;
                    // Path 1: Price Module
                    if (data.priceModule && data.priceModule.minActivityAmount) {
                        return data.priceModule.minActivityAmount.value;
                    }
                    if (data.priceModule && data.priceModule.maxAmount) {
                        return data.priceModule.maxAmount.value;
                    }
                    // Path 2: Product Info Component
                    if (data.productInfoComponent && data.productInfoComponent.price) {
                         return data.productInfoComponent.price.minPrice;
                    }
                }

                // METHOD B: JSON-LD
                const scripts = document.querySelectorAll('script[type="application/ld+json"]');
                for (const script of scripts) {
                    const json = JSON.parse(script.innerText);
                    if (json['@type'] === 'Product' && json.offers) {
                        const price = Array.isArray(json.offers) ? json.offers[0].price : json.offers.price;
                        if(price) return price;
                    }
                }

                // METHOD C: Regex Search on Body (Last Resort)
                // Looks for "US $12.34" pattern
                const bodyText = document.body.innerText;
                const match = bodyText.match(/US\s?\$(\d+(\.\d+)?)/);
                if (match && match[1]) return match[1];

            } catch (e) { return null; }
            return null;
        });

        if (priceData) {
            const cleanPrice = parseFloat(priceData.toString().replace(/[^0-9.]/g, ''));
            console.log(`   💰 Price Found: $${cleanPrice}`);

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
            console.log("   ⚠️ Price hidden/unavailable.");
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