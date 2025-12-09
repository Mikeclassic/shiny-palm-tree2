// @ts-nocheck
import { PrismaClient } from '@prisma/client';
import * as cheerio from 'cheerio';

const prisma = new PrismaClient();

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function main() {
  console.log("📝 Starting Full Data Enrichment (Desc + Tags + Categories)...");

  // 1. Find products that are missing ANY of the key data points
  const products = await prisma.product.findMany({
    where: {
        OR: [
            { originalDesc: null },
            { productType: null }, // If this is null, we haven't scraped the new metadata yet
        ]
    },
    orderBy: { createdAt: 'desc' }
  });

  if (products.length === 0) {
    console.log("✅ All products are fully enriched!");
    return;
  }

  console.log(`🎯 Found ${products.length} products to enrich.`);

  let updated = 0;
  let errors = 0;

  for (const product of products) {
    try {
        // Shopify JSON Endpoint
        const jsonUrl = `${product.sourceUrl}.json`;
        
        const res = await fetch(jsonUrl);
        if (!res.ok) {
            process.stdout.write("x");
            errors++;
            continue;
        }

        const data = await res.json();
        const item = data.product;

        if (item) {
            // 1. Extract Description
            const $ = cheerio.load(item.body_html || "");
            const cleanDesc = $.text().trim() || item.title;

            // 2. Extract Tags (Shopify returns string "tag1, tag2", Prisma needs Array)
            let cleanTags: string[] = [];
            if (typeof item.tags === 'string') {
                cleanTags = item.tags.split(',').map((t: string) => t.trim());
            } else if (Array.isArray(item.tags)) {
                cleanTags = item.tags;
            }

            // 3. Check Availability
            const isAvailable = item.variants?.some((v: any) => v.available === true) ?? true;

            // 4. Update Database
            await prisma.product.update({
                where: { id: product.id },
                data: { 
                    originalDesc: cleanDesc,
                    productType: item.product_type,
                    vendor: item.vendor,
                    tags: cleanTags,
                    publishedAt: item.published_at ? new Date(item.published_at) : null,
                    isSoldOut: !isAvailable
                }
            });
            process.stdout.write("•"); // Dot for success
            updated++;
        } else {
             process.stdout.write("?"); // Empty response
        }

    } catch (e) {
        process.stdout.write("!");
        errors++;
    }

    // Be nice to the servers (avoid rate limits)
    await sleep(300);
  }

  console.log(`\n\n🏁 Enrichment Complete.`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Failed/404: ${errors}`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());