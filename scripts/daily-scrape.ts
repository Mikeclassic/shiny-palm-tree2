import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// This simulates finding "Winning Products". 
// In a real scenario, you would scrape AliExpress/Depop/TikTok here.
const MOCK_WINNERS = [
  { title: "Y2K Star Zip Hoodie", price: 24.99, imageUrl: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=500&q=60", aesthetic: "Y2K" },
  { title: "Vintage Carhartt Jacket", price: 85.00, imageUrl: "https://images.unsplash.com/photo-1551028919-ac7d21422db7?auto=format&fit=crop&w=500&q=60", aesthetic: "Vintage" },
  { title: "Baggy Cyber Jeans", price: 45.00, imageUrl: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=500&q=60", aesthetic: "Cyber" },
  { title: "Coquette Bow Top", price: 18.50, imageUrl: "https://images.unsplash.com/photo-1620799140408-ed5341cd2431?auto=format&fit=crop&w=500&q=60", aesthetic: "Coquette" }
];

async function main() {
  console.log("Starting Scrape...");
  // Clear old products to keep the feed fresh
  await prisma.product.deleteMany({});
  
  for (const item of MOCK_WINNERS) {
    await prisma.product.create({
      data: {
        title: item.title,
        price: item.price,
        imageUrl: item.imageUrl,
        sourceUrl: "https://aliexpress.com", // Placeholder
        aesthetic: item.aesthetic
      }
    });
  }
  console.log("Feed Updated.");
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
