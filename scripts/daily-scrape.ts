import { PrismaClient } from '@prisma/client';

// We use 'require' here to avoid TypeScript module issues with these plugins
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

const prisma = new PrismaClient();

// Add stealth plugin to hide "I am a robot"
puppeteer.use(StealthPlugin());

async function main() {
  console.log("🥷 Starting Stealth Scraper...");

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox',
      '--window-size=1920,1080',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  try {
    const page = await browser.newPage();
    
    // 1. Set a realistic Viewport
    await page.setViewport({ width: 1920, height: 1080 });

    // 2. Go to AliExpress
    console.log("Navigating to AliExpress Category...");
    await page.goto('https://www.aliexpress.com/w/wholesale-y2k-clothes.html?sortType=total_tranpro_desc', { 
      waitUntil: 'networkidle2', 
      timeout: 60000 
    });

    // 3. HUMAN BEHAVIOR: Scroll down to trigger Lazy Loading
    console.log("Scrolling to load items...");
    await page.evaluate(async () => {
        await new Promise<void>((resolve) => {
            let totalHeight = 0;
            const distance = 100;
            const timer = setInterval(() => {
                // @ts-ignore
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if (totalHeight >= 2000) { 
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });

    // Wait a bit for the new items to populate
    await new Promise(r => setTimeout(r, 2000));

    // 4. Extract Real Data
    console.log("Extracting data...");
    const products = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a[href*="/item/"]'));
      
      const uniqueItems = new Map();

      anchors.forEach(anchor => {
        const img = anchor.querySelector('img');
        if (!img) return;

        // FIX: Use textContent instead of innerText for TypeScript compatibility
        const container = anchor.closest('div[class*="card"]'); 
        const priceText = container ? (container.textContent || "") : "";
        const priceMatch = priceText.match(/[\d,]+\.\d{2}/);

        const src = img.getAttribute('src');
        const title = img.getAttribute('alt') || "Trendy Fashion Item";
        
        let cleanSrc = src;
        if (src && src.startsWith('//')) cleanSrc = 'https:' + src;

        if (cleanSrc && !uniqueItems.has(cleanSrc)) {
             uniqueItems.set(cleanSrc, {
                title: title.slice(0, 80),
                price: priceMatch ? parseFloat(priceMatch[0].replace(/,/g, '')) : 24.99,
                imageUrl: cleanSrc,
                sourceUrl: anchor.getAttribute('href'),
                aesthetic: "Y2K"
            });
        }
      });

      return Array.from(uniqueItems.values()).slice(0, 15);
    });

    console.log(`🎉 Found ${products.length} REAL products!`);

    // 5. Save to DB
    if (products.length > 0) {
      await prisma.product.deleteMany({});
      
      for (const p of products) {
        let finalUrl = p.sourceUrl || "";
        if (finalUrl.startsWith('//')) finalUrl = 'https:' + finalUrl;
        if (!finalUrl.startsWith('http')) finalUrl = 'https://aliexpress.com' + finalUrl;

        await prisma.product.create({
          data: {
            title: p.title,
            price: p.price,
            imageUrl: p.imageUrl,
            sourceUrl: finalUrl,
            aesthetic: "Y2K"
          }
        });
      }
      console.log("Database updated.");
    } else {
        console.log("Warning: No products found.");
    }

  } catch (error) {
    console.error("Scrape Error:", error);
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}

main();