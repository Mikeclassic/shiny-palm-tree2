"use client";

import { useState } from "react";
import Image from "next/image";
import { Search, Wand2, ExternalLink, Loader2, Eye, AlertCircle, Sparkles, Upload } from "lucide-react";
import ListingWizard from "./ListingWizard";
import PublishModal from "./PublishModal";

export default function ProductGrid({ initialProducts }: { initialProducts: any[] }) {
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [publishingProduct, setPublishingProduct] = useState<any>(null);

  if (initialProducts.length === 0) {
    return (
        <div className="p-20 border border-dashed border-slate-300 rounded-xl text-center text-slate-500 bg-white">
            <Search size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-xl font-medium">No products found.</p>
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
                <div key={product.id} className="group bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:border-brand-200 transition-all duration-300 flex flex-col relative h-full">
                    {/* IMAGE AREA */}
                    <div className="h-64 relative overflow-hidden bg-slate-100">
                        <Image 
                            src={product.imageUrl} 
                            alt={product.title}
                            fill
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                            className="object-cover group-hover:scale-105 transition duration-700"
                            loading="lazy"
                        />
                        
                        {product.aesthetic && (
                            <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-brand-900 border border-slate-200 shadow-sm z-10 uppercase tracking-wider">
                                {product.aesthetic}
                            </div>
                        )}

                        <div className="absolute bottom-3 right-3 flex gap-2 transform translate-y-12 group-hover:translate-y-0 transition-all duration-300 z-10">
                            <button
                                onClick={() => setPublishingProduct(product)}
                                className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg flex items-center gap-2 px-3 py-2 rounded-full font-bold text-xs"
                                title="Publish to store"
                            >
                                <Upload size={14} /> Publish
                            </button>
                            <button
                                onClick={() => setSelectedProduct(product)}
                                className="bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white shadow-lg flex items-center gap-2 px-4 py-2 rounded-full font-bold text-xs"
                            >
                                <Sparkles size={14} className="text-yellow-300 fill-yellow-300" /> Edit
                            </button>
                        </div>
                    </div>
                    
                    {/* DETAILS AREA */}
                    <div className="p-5 flex flex-col flex-1">
                        <h3 className="font-bold text-slate-800 text-sm line-clamp-2 mb-4 h-10 leading-snug" title={product.title}>
                            {product.title}
                        </h3>
                        
                        <div className="mt-auto pt-4 border-t border-slate-100 space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Resell Price</span>
                                <span className="text-xl font-extrabold text-brand-900">${product.price}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                {/* PRIMARY ACTION */}
                                {hasSupplier ? (
                                    <a 
                                        href={product.supplierUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="col-span-1 flex items-center justify-center gap-1 bg-green-100 hover:bg-green-200 text-green-700 py-2.5 rounded-lg text-[10px] font-bold transition px-2 text-center"
                                    >
                                        <ExternalLink size={12} /> View Stock
                                    </a>
                                ) : botChecked ? (
                                    <a 
                                        href={manualLensUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="col-span-1 flex items-center justify-center gap-1 bg-orange-50 hover:bg-orange-100 text-orange-600 py-2.5 rounded-lg text-[10px] font-bold transition border border-orange-200 px-2 text-center"
                                    >
                                        <Search size={12} /> Deep Search
                                    </a>
                                ) : (
                                    <div className="col-span-1 flex items-center justify-center gap-1 bg-slate-100 text-slate-400 py-2.5 rounded-lg text-[10px] font-bold cursor-wait px-2 text-center">
                                        <Loader2 size={12} className="animate-spin" /> Hunting...
                                    </div>
                                )}

                                {/* SECONDARY ACTION */}
                                <a 
                                    href={product.sourceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="col-span-1 flex items-center justify-center gap-1 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 py-2.5 rounded-lg text-[10px] font-bold transition px-2 text-center"
                                >
                                    <Eye size={12} /> Competitor
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

        {publishingProduct && (
            <PublishModal
                productId={publishingProduct.id}
                productTitle={publishingProduct.title}
                onClose={() => setPublishingProduct(null)}
            />
        )}
    </>
  );
}