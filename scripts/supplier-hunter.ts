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
  console.log("🕵️ Starting Lens Multisearch Hunter (Restored Original)...");

  if (!process.env.PROXY_SERVER || !process.env.PROXY_USERNAME) {
      console.error("❌ Error: Missing PROXY secrets.");
      process.exit(1);
  }

  // Find products without a supplier
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
        '--window-size=1366,768',
        `--proxy-server=http://${process.env.PROXY_SERVER}`
    ]
  });

  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(90000); 
  
  await page.authenticate({
    username: process.env.PROXY_USERNAME,
    password: process.env.PROXY_PASSWORD
  });

  await page.setViewport({ width: 1366, height: 768 });

  for (const product of productsToHunt) {
    try {
        console.log(`\n🔍 Hunting: ${product.title}`);

        // 1. CONSTRUCT THE MAGIC LENS URL
        // This combines the Image + The Keyword "aliexpress"
        const lensUrl = `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(product.imageUrl)}&q=aliexpress`;
        
        console.log("   📸 Visiting Lens Multisearch...");
        await page.goto(lensUrl, { waitUntil: 'domcontentloaded' });
        
        // 2. Handle Google Consent (The usual blocker)
        try {
            // Added German/Polish keywords to ensure it clicks on your proxy
            const consentButton = await page.$x("//button[contains(., 'Reject') or contains(., 'I agree') or contains(., 'ablehnen') or contains(., 'akzeptieren') or contains(., 'Zaakceptuj') or contains(., 'Odrzuć')]");
            if (consentButton.length > 0) {
                console.log("   🍪 Clicking Cookie Consent...");
                await consentButton[0].click();
                await page.waitForNavigation({ waitUntil: 'domcontentloaded' });
            }
        } catch (err) {}

        await randomSleep(3000, 6000); // Wait for Lens/Search to load

        // 3. EXTRACT FIRST RESULT (Original Logic)
        // The result of this Lens URL is a Google Search Result Page.
        // We just need the first organic link to AliExpress.
        const foundLink = await page.evaluate(() => {
            const anchors = Array.from(document.querySelectorAll('a'));
            
            const productLinks = anchors
                .map(a => a.href)
                .filter(href => href && href.includes('aliexpress.com/item'));

            // The first one is usually the most relevant visual match
            return productLinks.length > 0 ? productLinks[0] : null;
        });

        if (!foundLink) {
            console.log("   ❌ No AliExpress link found in Lens results.");
            // Log Title to debug
            const title = await page.title();
            console.log(`   (Page Title: ${title})`);
            
            await prisma.product.update({
                where: { id: product.id },
                data: { lastSourced: new Date() }
            });
            continue;
        }

        console.log(`   🔗 Found: ${foundLink}`);

        // 4. VISIT ALIEXPRESS
        await page.goto(foundLink, { waitUntil: 'domcontentloaded', timeout: 90000 });
        await page.evaluate(() => { window.scrollBy(0, 500); });
        await randomSleep(3000, 6000); 

        // 5. EXTRACT PRICE
        const priceText = await page.evaluate(() => {
            const selectors = [
                '.product-price-value', 
                '.price--current--I3Gb7_V', 
                '.uniform-banner-box-price',
                '.product-price-current',
                '[itemprop="price"]',
                '.money'
            ];
            for (const s of selectors) {
                const el = document.querySelector(s);
                if (el && el.innerText && /\d/.test(el.innerText)) return el.innerText;
            }
            return null;
        });

        if (priceText) {
            // Simple cleanup logic
            const cleanPrice = parseFloat(priceText.toString().replace(/[^0-9.]/g, ''));
            console.log(`   💰 Price: $${cleanPrice}`);

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
            console.log("   ⚠️ Link valid, but price hidden.");
            await prisma.product.update({
                where: { id: product.id },
                data: { supplierUrl: foundLink, lastSourced: new Date() }
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