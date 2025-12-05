import { PrismaClient } from '@prisma/client';
import * as cheerio from 'cheerio';

const prisma = new PrismaClient();

const TARGET_STORES = [
    // --- The Big Players ---
    "https://tunnelvision.tv",
    "https://us.mingalondon.com",
    "https://www.disturbia.co.uk",
    "https://www.fashionnova.com",
    "https://teddyfresh.com",
    "https://www.ripndipclothing.com",
    "https://kith.com",
    "https://colourpop.com",
    "https://blackmilkclothing.com",
    "https://dropdead.world",
    
    // --- Y2K & Aesthetic ---
    "https://www.dollskill.com",
    "https://cyberdog.net",
    "https://iheartraves.com",
    "https://aelfriceden.com",
    "https://www.emmiol.com",
    "https://motelrocks.com",
    "https://jadedldn.com",
    "https://theraggedpriest.com",
    "https://lazyocf.com",
    "https://unifclothing.com",
    "https://halsbrook.com",
    "https://lucyandyak.com",
    "https://bigbudpress.com",
    "https://dangerfield.com.au",
    "https://gorman.ws",

    // --- Streetwear & Skate ---
    "https://hufworldwide.com",
    "https://primitiveskate.com",
    "https://thehundreds.com",
    "https://diamondsupplyco.com",
    "https://marketstudios.com",
    "https://pleasuresnow.com",
    "https://golfwang.com",
    "https://stussy.com",
    "https://obeyclothing.com",
    "https://brain-dead.com",
    "https://online-ceramics.com",
    
    // --- Dark / Gothic / Alt ---
    "https://killstar.com",
    "https://punkrave.ch",
    "https://demonia.com",
    "https://vampirefreaks.com",
    "https://kreepsville666.com",
    "https://restylie.ca", 
    "https://blackcraftcult.com",
    
    // --- Accessories / Other ---
    "https://us.loungeunderwear.com",
    "https://skinnydiplondon.com",
    "https://starface.world",
    "https://wakemake.kr",
    "https://en.stylenanda.com",
    "https://mixxmix.com"
];

async function main() {
  console.log("🔥 Starting 'Best-Sellers' Spy Protocol...");
  
  // 1. DELETE COMMAND REMOVED. 
  // We no longer wipe the database. We append new items.

  let newProducts = 0;
  let skippedProducts = 0;

  // Shuffle stores so we don't always scrape the same ones if time runs out
  const shuffledStores = TARGET_STORES.sort(() => 0.5 - Math.random());

  for (const storeUrl of shuffledStores) {
    try {
        // 2. TIMEOUT CONTROLLER (Prevents hanging forever on one store)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); 

        // 3. FETCH BEST SELLERS HTML
        const htmlRes = await fetch(`${storeUrl}/collections/all?sort_by=best-selling`, {
            signal: controller.signal,
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' }
        }).catch(() => null);
        
        clearTimeout(timeoutId);

        if (!htmlRes || !htmlRes.ok) continue;

        const html = await htmlRes.text();
        const $ = cheerio.load(html);

        // 4. FIND HANDLES
        const productHandles = new Set<string>();
        $('a[href*="/products/"]').each((_, element) => {
            const href = $(element).attr('href');
            if (href) {
                const handle = href.split('/products/')[1]?.split('?')[0];
                if (handle) productHandles.add(handle);
            }
        });

        const topHandles = Array.from(productHandles).slice(0, 3); // Top 3 per store

        if(topHandles.length > 0) process.stdout.write(`\n${storeUrl}: `);

        for (const handle of topHandles) {
            const productUrl = `${storeUrl}/products/${handle}`;
            
            // 5. CHECK IF EXISTS (Deduplication)
            const exists = await prisma.product.findUnique({
                where: { sourceUrl: productUrl }
            });

            if (exists) {
                process.stdout.write("-"); // Skip
                skippedProducts++;
                continue;
            }

            // 6. FETCH DETAILS
            const jsonUrl = `${storeUrl}/products/${handle}.json`;
            const productRes = await fetch(jsonUrl);
            if (!productRes.ok) continue;

            const data = await productRes.json();
            const item = data.product;

            if (!item || !item.images || item.images.length === 0) continue;

            // 7. SAVE TO DB
            await prisma.product.create({
                data: {
                    title: item.title,
                    price: parseFloat(item.variants?.[0]?.price || "0"),
                    imageUrl: item.images[0].src,
                    sourceUrl: productUrl,
                    aesthetic: "Trending 🔥"
                }
            });
            process.stdout.write("+"); // Add
            newProducts++;
        }
    } catch (e) {
        // Ignore errors for individual stores
    }
  }

  console.log(`\n\n✅ JOB DONE: Added ${newProducts} products. Skipped ${skippedProducts} duplicates.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });