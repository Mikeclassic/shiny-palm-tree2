"use client";

import { useState, useMemo } from "react";
import { Database, Search, ShoppingBag, Globe, AlertCircle } from "lucide-react";
import ProductGrid from "@/components/ProductGrid";

interface DashboardClientProps {
  products: any[];
  totalCount: number;
}

export default function DashboardClient({ products, totalCount }: DashboardClientProps) {
  const [tab, setTab] = useState("all"); // 'all', 'ali', 'other'
  const [query, setQuery] = useState("");

  // INSTANT FILTERING LOGIC
  const filteredProducts = useMemo(() => {
    let result = products;

    // 1. Filter by Tab
    if (tab === "ali") {
      result = result.filter(p => p.supplierUrl);
    } else if (tab === "other") {
      result = result.filter(p => !p.supplierUrl && p.lastSourced);
    }

    // 2. Filter by Search
    if (query) {
      const lowerQuery = query.toLowerCase();
      result = result.filter(p => p.title.toLowerCase().includes(lowerQuery));
    }

    return result;
  }, [products, tab, query]);

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-gray-800 pb-8">
        <div>
            <h2 className="text-3xl font-bold">Product Intelligence 🧠</h2>
            <p className="text-gray-400 mt-2">Manage your inventory and supplier connections.</p>
        </div>
        
        <div className="bg-gray-900 border border-gray-700 p-4 rounded-xl flex items-center gap-4 shadow-lg shadow-black/50">
            <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400">
                <Database size={24} />
            </div>
            <div>
                <p className="text-xs text-gray-400 uppercase font-bold">Total Database</p>
                <p className="text-xl font-mono text-white font-bold">{totalCount}</p>
            </div>
        </div>
      </div>

      {/* INSTANT CONTROLS */}
      <div className="flex flex-col gap-6">
        <div className="relative">
            <Search className="absolute left-4 top-3.5 text-gray-500" size={20} />
            <input 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search loaded products..." 
                className="w-full bg-gray-900 border border-gray-800 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
            />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
            <button 
                onClick={() => setTab("all")}
                className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm whitespace-nowrap transition ${tab === 'all' ? 'bg-white text-black' : 'bg-gray-900 text-gray-400 hover:text-white'}`}
            >
                <ShoppingBag size={16} /> All Products
            </button>
            <button 
                onClick={() => setTab("ali")}
                className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm whitespace-nowrap transition ${tab === 'ali' ? 'bg-green-500 text-white' : 'bg-gray-900 text-gray-400 hover:text-white'}`}
            >
                <Globe size={16} /> AliExpress Verified
            </button>
            <button 
                onClick={() => setTab("other")}
                className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm whitespace-nowrap transition ${tab === 'other' ? 'bg-orange-500 text-white' : 'bg-gray-900 text-gray-400 hover:text-white'}`}
            >
                <AlertCircle size={16} /> Other Suppliers
            </button>
        </div>
      </div>

      {/* RENDER GRID */}
      <ProductGrid initialProducts={filteredProducts} />
      
      <p className="text-center text-gray-600 text-xs mt-8">
        Showing {filteredProducts.length} of {products.length} loaded items
      </p>
    </div>
  );
}