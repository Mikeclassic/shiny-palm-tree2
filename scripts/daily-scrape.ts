import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// We target REAL Y2K Fashion Brands that use Shopify.
// We can access their product feed directly via JSON (The "Spy Method").
const TARGET_STORES = [
  "https://tunnelvision.tv",      // Famous Y2K Brand
  "https://us.mingalondon.com",   // Streetwear
  "https://www.disturbia.co.uk",   // Grunge/Goth
"https://www.fashionnova.com",
  "https://teddyfresh.com",
  "https://www.ripndipclothing.com",
"https://www.gymshark.com/products.json",
"https://kith.com/products.json",
"https://colourpop.com/products.json"
];

async function main() {
  console.log("🕵️ Starting Shopify Spy Protocol...");
  
  // Clear old data
  await prisma.product.deleteMany({});
  
  let totalProducts = 0;

  for (const storeUrl of TARGET_STORES) {
    try {
        console.log(`\n📡 Connecting to feed: ${storeUrl}...`);
        
        // Native Fetch (Node 18+) - No Puppeteer needed for this method
        const response = await fetch(`${storeUrl}/products.json?limit=10`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        if (!response.ok) {
            console.log(`Failed to fetch from ${storeUrl}: ${response.status}`);
            continue;
        }

        const data = await response.json();
        const items = data.products || [];

        console.log(`Found ${items.length} items from ${storeUrl}`);

        for (const item of items) {
            // 1. Get Image
            const imageUrl = item.images?.[0]?.src;
            if (!imageUrl) continue;

            // 2. Get Price (Shopify stores variants, we take the first one)
            const variant = item.variants?.[0];
            const price = variant?.price ? parseFloat(variant.price) : 29.99;

            // 3. Get URL
            const productUrl = `${storeUrl}/products/${item.handle}`;

            // 4. Save to DB
            await prisma.product.create({
                data: {
                    title: item.title,
                    price: price,
                    imageUrl: imageUrl,
                    sourceUrl: productUrl,
                    aesthetic: "Y2K" // You can write logic to guess this later
                }
            });
            process.stdout.write("."); // Progress dot
            totalProducts++;
        }
    } catch (e) {
        console.error(`Error scraping ${storeUrl}:`, e);
    }
  }

  console.log(`\n\n✅ SUCCESS: Database populated with ${totalProducts} REAL products.`);
  await prisma.$disconnect();
}

main();