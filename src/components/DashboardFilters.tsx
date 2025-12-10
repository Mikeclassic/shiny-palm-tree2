"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Filter } from "lucide-react";

interface DashboardFiltersProps {
  topCategories: { productType: string | null; _count: { productType: number } }[];
  currentTab: string;
}

export default function DashboardFilters({ topCategories, currentTab }: DashboardFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const initialQ = searchParams.get("q") || "";
  const initialType = searchParams.get("type") || "all";

  const [query, setQuery] = useState(initialQ);

  const updateParams = (newQuery: string, newType: string) => {
    const params = new URLSearchParams();
    if (newQuery) params.set("q", newQuery);
    if (newType && newType !== "all") params.set("type", newType);
    params.set("tab", currentTab);
    params.set("page", "1");
    router.push(`/dashboard?${params.toString()}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams(query, initialType);
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value;
    updateParams(query, newType);
  };

  return (
    <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
      {/* Search Input */}
      <div className="relative flex-1">
        <Search className="absolute left-4 top-3.5 text-slate-400" size={20} />
        <input 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products by keyword..." 
          className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-12 pr-4 text-slate-900 focus:outline-none focus:ring-2 focus:ring-action/50 focus:border-action transition shadow-sm"
        />
      </div>
      
      {/* Type Dropdown */}
      <div className="relative sm:w-64">
        <Filter className="absolute left-4 top-3.5 text-slate-400" size={16} />
        <select 
          value={initialType}
          onChange={handleTypeChange}
          className="w-full h-full bg-white border border-slate-200 rounded-xl py-3 pl-12 pr-8 text-slate-700 focus:outline-none focus:ring-2 focus:ring-action/50 appearance-none cursor-pointer text-sm font-medium shadow-sm"
        >
          <option value="all">All Categories</option>
          <hr />
          {topCategories.map((c) => (
            <option key={c.productType} value={c.productType!}>
              {c.productType} ({c._count.productType})
            </option>
          ))}
        </select>
      </div>
      
      {/* Search Button */}
      <button type="submit" className="bg-brand-900 text-white font-bold px-8 py-3 rounded-xl hover:bg-brand-800 transition shadow-lg shadow-brand-900/20 active:scale-95">
        Search
      </button>
    </form>
  );
}