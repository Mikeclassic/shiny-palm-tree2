// @ts-nocheck
import { PrismaClient } from '@prisma/client';
import * as cheerio from 'cheerio';

const prisma = new PrismaClient();

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function main() {
  console.log("📝 Starting Description Backfill Protocol...");

  // 1. Find products that are missing the original description
  const products = await prisma.product.findMany({
    where: {
        originalDesc: null // Only target un-updated items
    },
    orderBy: { createdAt: 'desc' }
  });

  if (products.length === 0) {
    console.log("✅ All products already have descriptions!");
    return;
  }

  console.log(`🎯 Found ${products.length} products to update.`);

  let updated = 0;
  let errors = 0;

  for (const product of products) {
    try {
        // Construct the JSON URL (Shopify Trick)
        // e.g., https://brand.com/products/shirt -> https://brand.com/products/shirt.json
        const jsonUrl = `${product.sourceUrl}.json`;
        
        const res = await fetch(jsonUrl);
        if (!res.ok) {
            console.log(`   ❌ 404/Error for: ${product.title}`);
            errors++;
            continue;
        }

        const data = await res.json();
        const bodyHtml = data.product?.body_html;

        if (bodyHtml) {
            // Clean HTML tags to get raw text
            const $ = cheerio.load(bodyHtml);
            const cleanText = $.text().trim();

            if (cleanText) {
                await prisma.product.update({
                    where: { id: product.id },
                    data: { originalDesc: cleanText }
                });
                process.stdout.write("✅"); // Green check for success
                updated++;
            }
        } else {
             process.stdout.write("⚠️"); // Warning if empty
        }

    } catch (e) {
        process.stdout.write("❌");
        errors++;
    }

    // Be nice to the servers
    await sleep(500);
  }

  console.log(`\n\n🏁 Backfill Complete.`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Failed/404: ${errors}`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());