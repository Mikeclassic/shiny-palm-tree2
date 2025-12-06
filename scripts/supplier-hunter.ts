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
  console.log("🕵️ Starting Supplier Hunter (Bing Greedy Mode)...");

  if (!process.env.PROXY_SERVER) {
      console.error("❌ Error: Missing PROXY secrets.");
      process.exit(1);
  }

  // Find products
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
  page.setDefaultNavigationTimeout(120000); 
  
  await page.authenticate({
    username: process.env.PROXY_USERNAME,
    password: process.env.PROXY_PASSWORD
  });

  await page.setViewport({ width: 1366, height: 768 });

  // 1. Verify Proxy Works
  try {
    console.log("   📡 Connecting to Proxy...");
    await page.goto('http://ipv4.webshare.io/', { waitUntil: 'domcontentloaded' });
    const ip = await page.evaluate(() => document.body.innerText);
    console.log(`   ✅ Proxy Active. IP: ${ip.trim()}`);
  } catch (e) {
    console.log("   ⚠️ Proxy check slow, continuing anyway...");
  }

  for (const product of productsToHunt) {
    try {
        console.log(`\n🔍 Hunting: ${product.title}`);

        // 2. Bing Search (site:aliexpress.com)
        const searchUrl = `https://www.bing.com/search?q=site:aliexpress.com+${encodeURIComponent(product.title)}`;
        
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
        await randomSleep(3000, 5000);

        // 3. GREEDY LINK EXTRACTION (The Fix)
        // Grab ALL links on the page and filter for AliExpress items.
        const foundLink = await page.evaluate(() => {
            const anchors = Array.from(document.querySelectorAll('a'));
            
            const productLinks = anchors
                .map(a => a.href)
                .filter(href => href && (href.includes('aliexpress.com/item') || href.includes('/i/')));

            return productLinks.length > 0 ? productLinks[0] : null;
        });

        if (!foundLink) {
            console.log("   ❌ No AliExpress link found on Bing.");
            const title = await page.title();
            console.log(`   (Page Title: ${title})`);

            await prisma.product.update({
                where: { id: product.id },
                data: { lastSourced: new Date() }
            });
            continue;
        }

        console.log(`   🔗 Found: ${foundLink}`);

        // 4. Visit AliExpress
        await page.goto(foundLink, { waitUntil: 'domcontentloaded', timeout: 120000 });
        await page.evaluate(() => { window.scrollBy(0, 500); }); 
        await randomSleep(3000, 6000); 

        // 5. Extract Price
        const priceText = await page.evaluate(() => {
            const selectors = [
                '.product-price-value', 
                '.price--current--I3Gb7_V', 
                '.uniform-banner-box-price',
                '.product-price-current',
                '[itemprop="price"]',
                '.money',
                'meta[name="description"]'
            ];
            
            for (const s of selectors) {
                const el = document.querySelector(s);
                // Check meta tags
                if (s.includes('meta') && el) {
                    const content = el.getAttribute('content');
                    if (content && content.match(/\$\d+\.\d+/)) return content.match(/\$\d+\.\d+/)[0];
                }
                // Check visual elements
                if (el && el.innerText && /\d/.test(el.innerText)) return el.innerText;
            }
            return null;
        });

        if (priceText) {
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