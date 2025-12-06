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
  console.log("♻️ Restoring Original Link Hunter + Search Engine Pricing...");

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

  // 1. LAUNCH BROWSER (Standard Desktop Configuration)
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
  
  // 2. AUTHENTICATE
  await page.authenticate({
    username: process.env.PROXY_USERNAME,
    password: process.env.PROXY_PASSWORD
  });

  await page.setViewport({ width: 1920, height: 1080 });

  for (const product of productsToHunt) {
    try {
        console.log(`\n🔍 Hunting: ${product.title}`);

        // ============================================================
        // STEP 1: RESTORED ORIGINAL LINK FINDING (Google Lens)
        // ============================================================
        // This logic is reverted to exactly what worked in your first log.
        const lensUrl = `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(product.imageUrl)}&q=aliexpress`;
        
        console.log("   📸 Visiting Lens Multisearch...");
        await page.goto(lensUrl, { waitUntil: 'domcontentloaded' });
        
        // Handle Consent (Expanded to include German/French just in case)
        try {
            const consentButton = await page.$x("//button[contains(., 'Reject') or contains(., 'refuser') or contains(., 'ablehnen') or contains(., 'I agree') or contains(., 'akzeptieren')]");
            if (consentButton.length > 0) {
                await consentButton[0].click();
                await randomSleep(2000, 3000);
            }
        } catch (err) {}

        await randomSleep(3000, 5000); // Wait for results to load

        // The Original Logic to extract the link
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
            await prisma.product.update({ where: { id: product.id }, data: { lastSourced: new Date() }});
            continue;
        }

        console.log(`   🔗 Found: ${foundLink}`);

        // ============================================================
        // STEP 2: SAFE PRICE EXTRACTION (Avoid AliExpress Block)
        // ============================================================
        // Instead of visiting AliExpress (which blocks your proxy), we extract the ID
        // and check Google/Bing Cache, which is safer.

        const idMatch = foundLink.match(/\/item\/(\d+)\.html/);
        const itemId = idMatch ? idMatch[1] : null;

        if (!itemId) {
            console.log("   ⚠️ Link found, but ID unparseable. Saving link only.");
            await prisma.product.update({ where: { id: product.id }, data: { supplierUrl: foundLink, lastSourced: new Date() }});
            continue;
        }

        console.log(`   🆔 Item ID: ${itemId}`);
        console.log("   🌎 Checking Search Engine Snippets for Price...");
        
        // We search Bing because it's very lenient with proxies and shows prices clearly
        const bingUrl = `https://www.bing.com/search?q=site%3Aaliexpress.com+${itemId}`;
        await page.goto(bingUrl, { waitUntil: 'domcontentloaded' });
        await randomSleep(2000, 3000);

        const foundPrice = await page.evaluate(() => {
            const text = document.body.innerText;
            // Regex to find prices in the search snippet
            const patterns = [
                /US\s?\$(\d+(\.\d+)?)/,       // US $10.00
                /\$(\d+(\.\d+)?)/,            // $10.00
                /€\s?(\d+([.,]\d+)?)/,        // € 10,00
                /(\d+([.,]\d+)?)\s?€/         // 10,00 €
            ];

            for (const p of patterns) {
                const match = text.match(p);
                if (match) {
                    let raw = match[1] || match[0];
                    // Clean European formatting (10,00 -> 10.00)
                    if (raw.includes(',') && !raw.includes('.')) raw = raw.replace(',', '.');
                    return parseFloat(raw.replace(/[^0-9.]/g, ''));
                }
            }
            return 0;
        });

        if (foundPrice > 0) {
            console.log(`   💰 Price Found: $${foundPrice}`);
            await prisma.product.update({
                where: { id: product.id },
                data: {
                    supplierUrl: foundLink,
                    supplierPrice: foundPrice,
                    lastSourced: new Date()
                }
            });
            console.log("   ✅ Saved.");
        } else {
            console.log("   ⚠️ Price not found in snippets. Saving URL only.");
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