import { db } from "@/lib/db";
import BackgroundStudio from "@/components/BackgroundStudio";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function BackgroundChangerPage() {
  // Fetch products from database
  // We prioritize items that are "in stock" or recently added
  const products = await db.product.findMany({
    take: 100, // Load 100 recent items
    orderBy: { createdAt: 'desc' },
    select: {
        id: true,
        title: true,
        imageUrl: true,
    }
  });

  return (
    <BackgroundStudio userProducts={products} />
  );
}