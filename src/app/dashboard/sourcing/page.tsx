import { db } from "@/lib/db";
import { ExternalLink, RefreshCw, DollarSign } from "lucide-react";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SourcingPage() {
  const sourcedProducts = await db.product.findMany({
    where: {
        supplierUrl: { not: null }
    },
    orderBy: { lastSourced: 'desc' }
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4 border-b border-gray-800 pb-6">
        <div className="p-3 bg-green-500/10 rounded-lg text-green-400">
            <DollarSign size={24} />
        </div>
        <div>
            <h2 className="text-3xl font-bold">Supplier Connections</h2>
            <p className="text-gray-400 mt-1">Automated matches found by the Hunter Bot.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sourcedProducts.map((product) => {
            const price = product.supplierPrice || 0;
            const profit = (product.price - price).toFixed(2);
            
            return (
            <div key={product.id} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden flex flex-col">
                <div className="flex h-48">
                    {/* Left: Original */}
                    <div className="w-1/2 relative border-r border-gray-800">
                        <img src={product.imageUrl} className="w-full h-full object-cover opacity-80" />
                        <span className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 text-[10px] rounded text-white font-bold">Resell</span>
                    </div>
                    {/* Right: Supplier Data */}
                    <div className="w-1/2 bg-black flex flex-col items-center justify-center p-4 text-center">
                        <p className="text-xs text-gray-500 uppercase font-bold">Sourcing Cost</p>
                        <p className="text-2xl font-mono text-green-400 font-bold">${price > 0 ? price : "?"}</p>
                        <p className="text-[10px] text-gray-600 mt-1">AliExpress</p>
                    </div>
                </div>

                <div className="p-5 flex-1 flex flex-col">
                    <h3 className="font-bold text-sm line-clamp-2 mb-4 h-10">{product.title}</h3>
                    
                    <div className="mt-auto space-y-3">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-400">Resell Price:</span>
                            <span className="text-white font-mono">${product.price}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm font-bold border-t border-gray-800 pt-3">
                            <span className="text-gray-400">Est. Profit:</span>
                            <span className="text-green-400">+${profit}</span>
                        </div>
                        
                        <a 
                            href={product.supplierUrl!} 
                            target="_blank" 
                            className="flex items-center justify-center gap-2 w-full bg-green-600 hover:bg-green-500 text-white py-3 rounded-xl font-bold transition mt-4"
                        >
                            Buy from Supplier <ExternalLink size={14} />
                        </a>
                    </div>
                </div>
            </div>
            );
        })}

        {sourcedProducts.length === 0 && (
            <div className="col-span-full p-20 text-center text-gray-500 border border-dashed border-gray-800 rounded-xl bg-gray-900/20">
                <RefreshCw className="mx-auto mb-4 animate-spin-slow opacity-20" size={48} />
                <p className="text-lg font-medium">The Bot is hunting...</p>
                <p className="text-sm mt-2 opacity-60">This page will populate automatically every 6 hours.</p>
            </div>
        )}
      </div>
    </div>
  );
}