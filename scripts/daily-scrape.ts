import { PrismaClient } from '@prisma/client';
import * as cheerio from 'cheerio';

const prisma = new PrismaClient();

// 50+ Real Y2K/Streetwear Stores (Shopify)
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
    "https://halsbrook.com", // Vintage vibe
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
    "https://stussy.com", // Often custom, but sometimes Shopify
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
    
    // --- Accessories & Niche ---
    "https://l loungeunderwear.com",
    "https://skinnydiplondon.com",
    "https://starface.world",
    "https://wakemake.kr",
    "https://en.stylenanda.com",
    "https://mixxmix.com"
];

async function main() {
  console.log("🔥 Starting 'Best-Sellers' Spy Protocol on 50+ Stores...");
  
  // REMOVED: await prisma.product.deleteMany({}); 
  // We keep history now!

  let newProducts = 0;
  let skippedProducts = 0;

  // We shuffle stores so we don't always scrape the same ones first if script times out
  const shuffledStores = TARGET_STORES.sort(() => 0.5 - Math.random());

  for (const storeUrl of shuffledStores) {
    try {
        // console.log(`\n🕵️  Spying on Best Sellers: ${storeUrl}...`);

        // 1. Fetch "Best Selling" HTML
        // Most Shopify stores use /collections/all?sort_by=best-selling
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout per store

        const htmlRes = await fetch(`${storeUrl}/collections/all?sort_by=best-selling`, {
            signal: controller.signal,
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' }
        }).catch(() => null);
        
        clearTimeout(timeoutId);
        if (!htmlRes || !htmlRes.ok) continue;

        const html = await htmlRes.text();
        const $ = cheerio.load(html);

        // 2. Extract Handles
        const productHandles = new Set<string>();
        $('a[href*="/products/"]').each((_, element) => {
            const href = $(element).attr('href');
            if (href) {
                // Clean url: /products/cool-shirt?variant=123 -> cool-shirt
                const handle = href.split('/products/')[1]?.split('?')[0];
                if (handle) productHandles.add(handle);
            }
        });

        // 3. Process Top 3 Best Sellers per store
        const topHandles = Array.from(productHandles).slice(0, 3);
        
        if (topHandles.length > 0) process.stdout.write(`\n${storeUrl.replace('https://', '')}: `);

        for (const handle of topHandles) {
            try {
                const productUrl = `${storeUrl}/products/${handle}`;
                
                // CHECK IF EXISTS (Deduplication)
                const exists = await prisma.product.findUnique({
                    where: { sourceUrl: productUrl }
                });

                if (exists) {
                    process.stdout.write("-"); // Skipped
                    skippedProducts++;
                    continue;
                }

                // FETCH DETAILS
                const jsonUrl = `${storeUrl}/products/${handle}.json`;
                const productRes = await fetch(jsonUrl);
                if (!productRes.ok) continue;

                const data = await productRes.json();
                const item = data.product;

                if (!item || !item.images || item.images.length === 0) continue;

                // SAVE
                await prisma.product.create({
                    data: {
                        title: item.title,
                        price: parseFloat(item.variants?.[0]?.price || "0"),
                        imageUrl: item.images[0].src,
                        sourceUrl: productUrl,
                        aesthetic: "Trending 🔥"
                    }
                });
                process.stdout.write("+"); // Added
                newProducts++;

            } catch (err) {
                // Silent fail on individual items
            }
        }

    } catch (e) {
        // Silent fail on store
    }
  }

  console.log(`\n\n✅ JOB DONE: Added ${newProducts} new winning products. (Skipped ${skippedProducts} duplicates)`);
  await prisma.$disconnect();
}

main();