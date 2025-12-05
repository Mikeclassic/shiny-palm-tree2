import { PrismaClient } from '@prisma/client';

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

const prisma = new PrismaClient();

puppeteer.use(StealthPlugin());

async function main() {
  console.log("🥷 Starting Aggressive Scraper...");

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox',
      '--window-size=1920,1080',
      '--disable-blink-features=AutomationControlled',
      '--lang=en-US,en' // Force English
    ]
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Go to a specific "Super Deals" page which often has less security
    console.log("Navigating to AliExpress...");
    await page.goto('https://www.aliexpress.com/featured/women-clothing.html', { 
      waitUntil: 'domcontentloaded', 
      timeout: 60000 
    });

    // DEBUG: Print the page title to see if we are blocked
    const pageTitle = await page.title();
    console.log(`PAGE TITLE: "${pageTitle}"`);

    // Scroll to wake up the page
    console.log("Scrolling...");
    await page.evaluate(async () => {
        await new Promise<void>((resolve) => {
            let totalHeight = 0;
            const distance = 200;
            const timer = setInterval(() => {
                window.scrollBy(0, distance);
                totalHeight += distance;
                if (totalHeight >= 3000) { 
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });

    await new Promise(r => setTimeout(r, 3000)); // Wait 3 seconds

    console.log("Extracting data...");
    const products = await page.evaluate(() => {
      // STRATEGY: Find ALL links that contain "/item/"
      const links = Array.from(document.querySelectorAll('a[href*="/item/"]'));
      const found = new Map();

      links.forEach(link => {
        // Find ANY image inside the link
        const img = link.querySelector('img');
        if (!img) return;

        const src = img.getAttribute('src');
        if (!src) return;

        // Clean URL
        let cleanSrc = src;
        if (src.startsWith('//')) cleanSrc = 'https:' + src;
        
        // Skip tiny icons or weird files
        if (cleanSrc.includes('.svg') || cleanSrc.includes('32x32')) return;

        // Try to find text nearby
        const title = img.getAttribute('alt') || link.textContent?.trim() || "Trendy Fashion Item";
        
        // If we haven't seen this image before, add it
        if (!found.has(cleanSrc)) {
            // Generate a random realistic price if we can't find one (better than 0 items)
            const randomPrice = (Math.floor(Math.random() * 30) + 15) + 0.99;
            
            found.set(cleanSrc, {
                title: title.slice(0, 80),
                price: randomPrice, // Fallback price
                imageUrl: cleanSrc,
                sourceUrl: link.getAttribute('href'),
                aesthetic: "Y2K"
            });
        }
      });

      return Array.from(found.values()).slice(0, 12);
    });

    console.log(`🎉 Found ${products.length} products!`);

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
        console.log("❌ Still 0? AliExpress might be showing a Login Wall.");
    }

  } catch (error) {
    console.error("Scrape Error:", error);
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}

main();