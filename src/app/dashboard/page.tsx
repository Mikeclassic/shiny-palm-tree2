import { db } from "@/lib/db";
import { ArrowUpRight } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const products = await db.product.findMany({
    take: 9,
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold">Winning Products 🔥</h2>
        <p className="text-gray-400 mt-2">Curated high-margin items updated daily.</p>
      </div>

      {products.length === 0 ? (
        <div className="p-10 border border-dashed border-gray-800 rounded-xl text-center text-gray-500">
            <p>No products found yet.</p>
            <p className="text-sm mt-2">Go to GitHub Actions and run "Daily Product Scraper" manually to populate data.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
            <div key={product.id} className="group bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-purple-500/50 transition duration-300">
                <div className="h-64 relative overflow-hidden">
                    <img 
                        src={product.imageUrl} 
                        alt={product.title} 
                        className="w-full h-full object-cover group-hover:scale-110 transition duration-500" 
                    />
                    <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white border border-white/10">
                        {product.aesthetic}
                    </div>
                </div>
                <div className="p-5">
                    <h3 className="font-bold text-lg truncate mb-1">{product.title}</h3>
                    <div className="flex justify-between items-end mt-4">
                        <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wide">Market Price</p>
                            <p className="text-2xl font-mono text-white">${product.price}</p>
                        </div>
                        <button className="bg-white text-black p-2 rounded-full hover:bg-purple-400 transition">
                            <ArrowUpRight size={20} />
                        </button>
                    </div>
                </div>
            </div>
            ))}
        </div>
      )}
    </div>
  );
}
