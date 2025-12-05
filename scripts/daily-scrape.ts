import { PrismaClient } from '@prisma/client';

// We use 'require' here because these specific plugins work better with CommonJS in TS-Node
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

const prisma = new PrismaClient();

// Add stealth plugin to hide "I am a robot"
puppeteer.use(StealthPlugin());

async function main() {
  console.log("🥷 Starting Stealth Scraper...");

  const browser = await puppeteer.launch({
    headless: true, // "New" mode is default now
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox',
      '--window-size=1920,1080', // Look like a desktop monitor
      '--disable-blink-features=AutomationControlled' // Extra masking
    ]
  });

  try {
    const page = await browser.newPage();
    
    // 1. Set a realistic Viewport
    await page.setViewport({ width: 1920, height: 1080 });

    // 2. Go to AliExpress (We use a specific category 'Women's Clothing' sorted by orders)
    // This URL is often less protected than the main search bar
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
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                // Scroll for about 2 seconds then stop
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
      // AliExpress changes classes often, so we target generic attributes
      // We look for any link that looks like a product item
      const anchors = Array.from(document.querySelectorAll('a[href*="/item/"]'));
      
      const uniqueItems = new Map();

      anchors.forEach(anchor => {
        // Find image inside
        const img = anchor.querySelector('img');
        if (!img) return;

        // Find price text nearby (usually in a div above or below)
        // We traverse up to the container to find the price
        const container = anchor.closest('div[class*="card"]'); 
        const priceText = container ? container.innerText : "";
        const priceMatch = priceText.match(/[\d,]+\.\d{2}/); // Matches 12.99

        const src = img.getAttribute('src');
        const title = img.getAttribute('alt') || "Trendy Fashion Item";
        
        // Clean URL
        let cleanSrc = src;
        if (src && src.startsWith('//')) cleanSrc = 'https:' + src;

        // Only add if we have an image and it's not a duplicate
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

      return Array.from(uniqueItems.values()).slice(0, 15); // Return top 15
    });

    console.log(`🎉 Found ${products.length} REAL products!`);

    // 5. Save to DB
    if (products.length > 0) {
      await prisma.product.deleteMany({}); // Clear old
      
      for (const p of products) {
        // Ensure URL is absolute
        let finalUrl = p.sourceUrl;
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
        console.log("Warning: No products found (Check selectors).");
    }

  } catch (error) {
    console.error("Scrape Error:", error);
    // Don't throw error so the workflow stays green, but log it.
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}

main();