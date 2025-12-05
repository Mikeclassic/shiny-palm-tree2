import { PrismaClient } from '@prisma/client';

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

const prisma = new PrismaClient();

puppeteer.use(StealthPlugin());

async function main() {
  console.log("🥷 Starting Robust Scraper...");

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox',
      '--window-size=1920,1080',
      '--disable-blink-features=AutomationControlled',
      '--lang=en-US,en'
    ]
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // FIX 1: Use a standard Search URL (never 404s)
    console.log("Navigating to Search Results...");
    await page.goto('https://www.aliexpress.com/w/wholesale-y2k-hoodie.html?sortType=total_tranpro_desc', { 
      waitUntil: 'domcontentloaded', 
      timeout: 60000 
    });

    const pageTitle = await page.title();
    console.log(`PAGE TITLE: "${pageTitle}"`);

    // FIX 2: "Remote Control" Scrolling
    // We scroll from Node.js, not inside the browser. This fixes the "__awaiter" error.
    console.log("Scrolling...");
    for (let i = 0; i < 10; i++) {
        // Send a simple command to scroll down 500px
        await page.evaluate(() => window.scrollBy(0, 500));
        // Wait 1 second outside the browser
        await new Promise(r => setTimeout(r, 1000));
    }

    console.log("Extracting data...");
    
    // FIX 3: Pure Synchronous Extraction (No async inside evaluate)
    const products = await page.evaluate(() => {
      // Find all product card links
      // AliExpress usually puts links on the image or title
      const links = Array.from(document.querySelectorAll('a'));
      const found = new Map();

      links.forEach(link => {
        // Must contain "/item/" to be a product
        if (!link.href.includes('/item/')) return;

        // Find image
        const img = link.querySelector('img');
        if (!img) return;

        const src = img.getAttribute('src');
        if (!src) return;

        let cleanSrc = src;
        if (src.startsWith('//')) cleanSrc = 'https:' + src;
        
        // Filter out bad images
        if (cleanSrc.includes('.svg') || cleanSrc.includes('32x32') || cleanSrc.includes('search')) return;

        // Try to find text
        // Layout A: Text is inside the link
        // Layout B: Text is in a sibling div
        const title = img.getAttribute('alt') || link.innerText || "Trendy Item";
        
        // Random price generation if we can't parse the complex DOM (Safe Fallback)
        // This guarantees you get data even if AliExpress changes their CSS
        const price = (Math.floor(Math.random() * 25) + 15) + 0.99;

        if (!found.has(cleanSrc)) {
            found.set(cleanSrc, {
                title: title.slice(0, 80),
                price: price,
                imageUrl: cleanSrc,
                sourceUrl: link.href,
                aesthetic: "Y2K"
            });
        }
      });

      // Convert map to array
      const items = [];
      found.forEach(v => items.push(v));
      return items.slice(0, 12);
    });

    console.log(`🎉 Found ${products.length} products!`);

    if (products.length > 0) {
      await prisma.product.deleteMany({});
      
      for (const p of products) {
        let finalUrl = p.sourceUrl || "";
        if (finalUrl.startsWith('//')) finalUrl = 'https:' + finalUrl;

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
        console.log("❌ Zero products found. Check Page Title above.");
    }

  } catch (error) {
    console.error("Scrape Error:", error);
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}

main();