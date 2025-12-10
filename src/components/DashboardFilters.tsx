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
    <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 md:gap-4">
      {/* Search Input */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-2.5 md:top-3.5 text-slate-400" size={16} />
        <input 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search..." 
          className="w-full bg-white border border-slate-200 rounded-lg md:rounded-xl py-2 md:py-3 pl-10 pr-4 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-action/50 focus:border-action transition shadow-sm"
        />
      </div>
      
      <div className="flex gap-2">
          {/* Type Dropdown */}
          <div className="relative flex-1 sm:w-64">
            <Filter className="absolute left-3 top-2.5 md:top-3.5 text-slate-400" size={14} />
            <select 
              value={initialType}
              onChange={handleTypeChange}
              className="w-full h-full bg-white border border-slate-200 rounded-lg md:rounded-xl py-2 md:py-3 pl-9 pr-8 text-slate-700 focus:outline-none focus:ring-2 focus:ring-action/50 appearance-none cursor-pointer text-xs md:text-sm font-medium shadow-sm"
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
          <button type="submit" className="bg-brand-900 text-white font-bold px-4 md:px-8 py-2 md:py-3 rounded-lg md:rounded-xl hover:bg-brand-800 transition shadow-lg shadow-brand-900/20 active:scale-95 text-xs md:text-sm">
            Search
          </button>
      </div>
    </form>
  );
}