import { PrismaClient } from '@prisma/client';
import puppeteer from 'puppeteer';

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Starting Real AliExpress Scrape...");

  // Launch the browser
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox'] // Required for GitHub Actions
  });
  
  const page = await browser.newPage();

  // Set a real user agent so AliExpress doesn't block us
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

  try {
    // 1. Go to AliExpress search for "Y2K Clothing", sorted by Orders (Most Sold)
    console.log("Navigating to AliExpress...");
    // We use a specific search URL sorted by "orders"
    await page.goto('https://www.aliexpress.com/w/wholesale-y2k-clothing.html?sortType=total_tranpro_desc&g=y', { waitUntil: 'networkidle2', timeout: 60000 });

    // 2. Wait for products to load
    // We look for the main search result container
    await page.waitForSelector('.search-card-item', { timeout: 10000 });

    // 3. Extract Data
    console.log("Extracting products...");
    const products = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.search-card-item'));
      
      return items.slice(0, 12).map(item => { // Get top 12
        const titleEl = item.querySelector('h1') || item.querySelector('.multi--titleText--nXeOvyr');
        const priceEl = item.querySelector('.multi--price-sale--U-S0jtj') || item.querySelector('.manhattan--price-sale--1CCSZfK');
        const imgEl = item.querySelector('.multi--image--2b571Kk') || item.querySelector('.manhattan--img--3PznAFM');
        const linkEl = item.querySelector('a');

        // Clean up price (remove currency symbols)
        let priceRaw = priceEl?.textContent || "0";
        const price = parseFloat(priceRaw.replace(/[^0-9.]/g, ''));

        // Get Image URL (handle lazy loading)
        let imageUrl = imgEl?.getAttribute('src');
        if (imageUrl && imageUrl.startsWith('//')) imageUrl = 'https:' + imageUrl;
        
        // Clean high-res images usually end in _.webp or similar, we keep them as is
        
        return {
          title: titleEl?.textContent?.trim() || "Trending Y2K Item",
          price: isNaN(price) ? 19.99 : price,
          imageUrl: imageUrl || "",
          sourceUrl: linkEl?.href || "https://aliexpress.com",
          aesthetic: "Y2K"
        };
      });
    });

    console.log(`Found ${products.length} products.`);

    // 4. Save to Database
    if (products.length > 0) {
      // Optional: Clear old mock data
      await prisma.product.deleteMany({});

      for (const p of products) {
        if (!p.imageUrl) continue; // Skip broken images

        await prisma.product.create({
          data: {
            title: p.title.substring(0, 100), // Limit title length
            price: p.price,
            imageUrl: p.imageUrl,
            sourceUrl: p.sourceUrl,
            aesthetic: "Y2K"
          }
        });
        console.log(`Saved: ${p.title.substring(0, 20)}...`);
      }
    } else {
      console.log("No products found. CSS Selectors might have changed.");
    }

  } catch (error) {
    console.error("Scraping failed:", error);
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}

main();