"use client";

import { useState } from "react";
import { Search, Wand2, ExternalLink, Loader2, Eye } from "lucide-react"; 
import ListingWizard from "./ListingWizard";

export default function ProductGrid({ initialProducts }: { initialProducts: any[] }) {
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  if (initialProducts.length === 0) {
    return (
        <div className="p-20 border border-dashed border-gray-800 rounded-xl text-center text-gray-500 bg-gray-900/20">
            <Search size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-xl font-medium">No products found in this category.</p>
        </div>
    );
  }

  return (
    <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {initialProducts.map((product) => {
                const hasSupplier = !!product.supplierUrl;
                const botChecked = !!product.lastSourced;
                const manualLensUrl = `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(product.imageUrl)}`;

                return (
                <div key={product.id} className="group bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-purple-500/50 transition duration-300 flex flex-col relative">
                    <div className="h-64 relative overflow-hidden bg-black">
                        <img 
                            src={product.imageUrl} 
                            alt={product.title} 
                            className="w-full h-full object-cover group-hover:scale-110 transition duration-500" 
                            loading="lazy"
                        />
                        {product.aesthetic && (
                            <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white border border-white/10">
                                {product.aesthetic}
                            </div>
                        )}

                        <button 
                            onClick={() => setSelectedProduct(product)}
                            className="absolute bottom-3 right-3 bg-purple-600 hover:bg-purple-500 text-white p-2 rounded-full shadow-lg transform translate-y-12 group-hover:translate-y-0 transition duration-300 flex items-center gap-2 px-4 font-bold text-xs z-10"
                        >
                            <Wand2 size={14} /> Magic List
                        </button>
                    </div>
                    
                    <div className="p-5 flex flex-col flex-1">
                        <h3 className="font-bold text-sm line-clamp-2 mb-4 h-10 leading-tight" title={product.title}>
                            {product.title}
                        </h3>
                        
                        <div className="mt-auto pt-4 border-t border-gray-800">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Resell Price</span>
                                <span className="text-xl font-mono text-white">${product.price}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                {/* PRIMARY ACTION: SUPPLIER */}
                                {hasSupplier ? (
                                    <a 
                                        href={product.supplierUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="col-span-1 flex items-center justify-center gap-1 bg-green-600 hover:bg-green-500 text-white py-2.5 rounded-xl text-[10px] font-bold transition shadow-lg shadow-green-900/20 px-2 text-center"
                                    >
                                        <ExternalLink size={12} /> View Stock 📦
                                    </a>
                                ) : botChecked ? (
                                    <a 
                                        href={manualLensUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="col-span-1 flex items-center justify-center gap-1 bg-gray-800 hover:bg-gray-700 text-orange-400 py-2.5 rounded-xl text-[10px] font-bold transition border border-gray-700 px-2 text-center"
                                    >
                                        <Search size={12} /> Deep Search 🔎
                                    </a>
                                ) : (
                                    <div className="col-span-1 flex items-center justify-center gap-1 bg-gray-900 text-gray-500 py-2.5 rounded-xl text-[10px] font-bold border border-gray-800 cursor-wait px-2 text-center">
                                        <Loader2 size={12} className="animate-spin" /> AI Hunting...
                                    </div>
                                )}

                                {/* SECONDARY ACTION: SPY */}
                                <a 
                                    href={product.sourceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="col-span-1 flex items-center justify-center gap-1 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white py-2.5 rounded-xl text-[10px] font-bold transition border border-gray-700 px-2 text-center"
                                >
                                    <Eye size={12} /> Spy Competitor
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            )})}
        </div>

        {selectedProduct && (
            <ListingWizard 
                product={selectedProduct} 
                onClose={() => setSelectedProduct(null)} 
            />
        )}
    </>
  );
}