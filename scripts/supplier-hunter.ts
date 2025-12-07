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
  console.log("🕵️ Starting Supplier Hunter (Enhanced Query + URL Only)...");

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
  
  await page.authenticate({
    username: process.env.PROXY_USERNAME,
    password: process.env.PROXY_PASSWORD
  });

  await page.setViewport({ width: 1920, height: 1080 });

  for (const product of productsToHunt) {
    try {
        console.log(`\n🔍 Hunting: ${product.title}`);

        // ============================================================
        // STEP 1: GOOGLE LENS (Enhanced Query)
        // ============================================================
        // We add "site:aliexpress.com [Title]" to the visual search.
        // This forces Google to look for the exact product on the exact site.
        const query = `site:aliexpress.com ${product.title}`;
        const lensUrl = `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(product.imageUrl)}&q=${encodeURIComponent(query)}`;
        
        console.log("   📸 Visiting Lens Multisearch...");
        await page.goto(lensUrl, { waitUntil: 'domcontentloaded' });
        
        // Handle Consent (Includes Polish/German/English/French)
        try {
            const consentButton = await page.$x("//button[contains(., 'Reject') or contains(., 'I agree') or contains(., 'Odrzuć') or contains(., 'Zaakceptuj') or contains(., 'Zgadzam') or contains(., 'Alle ablehnen') or contains(., 'Tout refuser')]");
            if (consentButton.length > 0) {
                console.log("   🍪 Clicking Consent...");
                await consentButton[0].click();
                await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 5000 }).catch(() => {});
            }
        } catch (err) {}

        await randomSleep(3000, 6000); 

        // Extract Link using the proven querySelector logic
        const foundLink = await page.evaluate(() => {
            const anchors = Array.from(document.querySelectorAll('a'));
            
            const productLinks = anchors
                .map(a => a.href)
                .filter(href => href && href.includes('aliexpress.com/item'));

            // Return the first match
            return productLinks.length > 0 ? productLinks[0] : null;
        });

        if (foundLink) {
            console.log(`   🔗 Found: ${foundLink}`);

            // ============================================================
            // STEP 2: SAVE URL (Skip Price Check)
            // ============================================================
            await prisma.product.update({
                where: { id: product.id },
                data: {
                    supplierUrl: foundLink,
                    lastSourced: new Date()
                }
            });
            console.log("   ✅ Saved URL.");
        } else {
            console.log("   ❌ No AliExpress link found.");
            // Mark as sourced so we don't retry immediately
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