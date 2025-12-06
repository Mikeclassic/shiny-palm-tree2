// @ts-nocheck
import { PrismaClient } from '@prisma/client';
import * as cheerio from 'cheerio';

const prisma = new PrismaClient();

const TARGET_STORES = [
    // --- Y2K / Grunge / Alt ---
    "https://tunnelvision.tv",
    "https://us.mingalondon.com",
    "https://www.disturbia.co.uk",
    "https://www.dollskill.com",
    "https://cyberdog.net",
    "https://motelrocks.com",
    "https://jadedldn.com",
    "https://theraggedpriest.com",
    "https://lazyocf.com",
    "https://unifclothing.com",
    "https://killstar.com",
    "https://punkrave.ch",
    "https://demonia.com",
    "https://vampirefreaks.com",
    "https://kreepsville666.com",
    "https://restylie.ca", 
    "https://blackcraftcult.com",
    "https://dropdead.world",
    "https://shoptery.com",
    "https://thekawaiifactory.com",
    "https://shoptruthordare.com",
    "https://velvet-thorns.com",
    "https://marywyattlondon.com",
    "https://pretty-attitude.com",
    "https://koifootwear.com",
    "https://borndead.clothing",

    // --- Streetwear / Skate / Hype ---
    "https://teddyfresh.com",
    "https://www.ripndipclothing.com",
    "https://kith.com",
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
    "https://mnml.la",
    "https://fearofgod.com",
    "https://madhappy.com",
    "https://representclo.com",
    "https://palaceskateboards.com", 
    
    // --- Trendy / Fast Fashion / Influencer ---
    "https://www.fashionnova.com",
    "https://princesspolly.com",
    "https://ohpolly.com",
    "https://publicdesire.com",
    "https://goodamerican.com",
    "https://skims.com",
    "https://whitefoxboutique.com",
    "https://meshki.us",
    "https://houseofcb.com",
    "https://boandtee.com",
    "https://us.loungeunderwear.com",
    "https://skinnydiplondon.com",

    // --- Aesthetic / Cute / Asian ---
    "https://colourpop.com",
    "https://blackmilkclothing.com",
    "https://iheartraves.com",
    "https://aelfriceden.com",
    "https://www.emmiol.com",
    "https://halsbrook.com",
    "https://lucyandyak.com",
    "https://bigbudpress.com",
    "https://dangerfield.com.au",
    "https://gorman.ws",
    "https://starface.world",
    "https://wakemake.kr",
    "https://en.stylenanda.com",
    "https://mixxmix.com",
    "https://chuuz.com",
    "https://yesstyle.com", // Often has hidden Shopify structure
    "https://smokonow.com"
];

async function main() {
  console.log(`🔥 Starting Massive Spy Protocol on ${TARGET_STORES.length} stores...`);
  
  let newProducts = 0;
  let skippedProducts = 0;

  // Shuffle stores to ensure variety even if script times out
  const shuffledStores = TARGET_STORES.sort(() => 0.5 - Math.random());

  for (const storeUrl of shuffledStores) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); 

        // 1. Get Best Sellers HTML
        const htmlRes = await fetch(`${storeUrl}/collections/all?sort_by=best-selling`, {
            signal: controller.signal,
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' }
        }).catch(() => null);
        
        clearTimeout(timeoutId);

        if (!htmlRes || !htmlRes.ok) continue;

        const html = await htmlRes.text();
        const $ = cheerio.load(html);

        // 2. Find Handles
        const productHandles = new Set<string>();
        $('a[href*="/products/"]').each((_, element) => {
            const href = $(element).attr('href');
            if (href) {
                const handle = href.split('/products/')[1]?.split('?')[0];
                if (handle) productHandles.add(handle);
            }
        });

        // 3. INCREASED LIMIT TO 5 ITEMS
        const topHandles = Array.from(productHandles).slice(0, 5);

        if(topHandles.length > 0) process.stdout.write(`\n${storeUrl.replace('https://', '')}: `);

        for (const handle of topHandles) {
            const productUrl = `${storeUrl}/products/${handle}`;
            
            // Deduplication
            const exists = await prisma.product.findFirst({
                where: { sourceUrl: productUrl }
            });

            if (exists) {
                process.stdout.write("-"); 
                skippedProducts++;
                continue;
            }

            // Fetch Details
            const jsonUrl = `${storeUrl}/products/${handle}.json`;
            const productRes = await fetch(jsonUrl);
            if (!productRes.ok) continue;

            const data = await productRes.json();
            const item = data.product;

            if (!item || !item.images || item.images.length === 0) continue;

            // Save
            await prisma.product.create({
                data: {
                    title: item.title,
                    price: parseFloat(item.variants?.[0]?.price || "0"),
                    imageUrl: item.images[0].src,
                    sourceUrl: productUrl,
                    aesthetic: "Trending 🔥"
                }
            });
            process.stdout.write("+"); 
            newProducts++;
        }
    } catch (e) {
        // Ignore errors
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