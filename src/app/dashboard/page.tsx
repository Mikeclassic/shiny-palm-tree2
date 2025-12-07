import { db } from "@/lib/db";
import DashboardClient from "@/components/DashboardClient";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Dashboard() {
  // 1. Fetch EVERYTHING (sorted by relevance)
  // We fetch a high limit (e.g., 500) so the user has plenty to work with instantly.
  const products = await db.product.findMany({
    take: 500, 
    orderBy: [
        { lastSourced: { sort: 'desc', nulls: 'last' } }, 
        { createdAt: 'desc' }    
    ]
  });

  const totalCount = await db.product.count();

  // 2. Hand off to the Client Component for instant interaction
  return (
    <DashboardClient products={products} totalCount={totalCount} />
  );
}