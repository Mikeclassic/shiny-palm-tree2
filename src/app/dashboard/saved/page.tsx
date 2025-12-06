import { db } from "@/lib/db";
import { Bookmark, Search } from "lucide-react";
import ProductGrid from "@/components/ProductGrid";
import Link from "next/link";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SavedPage() {
  const savedProducts = await db.product.findMany({
    where: {
        generatedDesc: { not: null }
    },
    // FIX: Changed from 'updatedAt' to 'createdAt' to prevent build error
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4 border-b border-gray-800 pb-6">
        <div className="p-3 bg-purple-500/10 rounded-lg text-purple-400">
            <Bookmark size={24} />
        </div>
        <div>
            <h2 className="text-3xl font-bold">Saved Listings</h2>
            <p className="text-gray-400 mt-1">Items you have already generated AI descriptions for.</p>
        </div>
      </div>

      {savedProducts.length === 0 ? (
        <div className="p-20 border border-dashed border-gray-800 rounded-xl text-center text-gray-500 bg-gray-900/20">
            <Bookmark size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-xl font-medium">No saved listings yet.</p>
            <p className="text-sm mt-2 opacity-60">Go to the Dashboard and use the "Magic List" button on a product.</p>
            <Link href="/dashboard" className="inline-block mt-6 bg-white text-black font-bold px-6 py-3 rounded-full hover:bg-gray-200 transition">
                Go to Dashboard
            </Link>
        </div>
      ) : (
        <ProductGrid initialProducts={savedProducts} />
      )}
    </div>
  );
}