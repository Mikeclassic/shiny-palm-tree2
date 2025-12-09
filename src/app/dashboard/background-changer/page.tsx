import { db } from "@/lib/db";
import BackgroundStudio from "@/components/BackgroundStudio";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function BackgroundChangerPage() {
  // Increased limit to ensure search works across more items
  const products = await db.product.findMany({
    take: 1000, 
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