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
  
  // Get initial values from URL
  const initialQ = searchParams.get("q") || "";
  const initialType = searchParams.get("type") || "all";

  const [query, setQuery] = useState(initialQ);

  // Function to push new URL params
  const updateParams = (newQuery: string, newType: string) => {
    const params = new URLSearchParams();
    if (newQuery) params.set("q", newQuery);
    if (newType && newType !== "all") params.set("type", newType);
    params.set("tab", currentTab);
    params.set("page", "1"); // Reset to page 1 on filter change
    
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
    <form onSubmit={handleSearch} className="flex gap-4">
      {/* Search Input */}
      <div className="relative flex-1">
        <Search className="absolute left-4 top-3.5 text-gray-500" size={20} />
        <input 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products..." 
          className="w-full bg-gray-900 border border-gray-800 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
        />
      </div>
      
      {/* Type Dropdown */}
      <div className="relative w-64">
        <Filter className="absolute left-4 top-3.5 text-gray-500" size={16} />
        <select 
          value={initialType}
          onChange={handleTypeChange}
          className="w-full h-full bg-gray-900 border border-gray-800 rounded-xl py-3 pl-12 pr-8 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 appearance-none cursor-pointer text-sm font-medium"
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
      <button type="submit" className="bg-white text-black font-bold px-6 rounded-xl hover:bg-gray-200 transition">
        Search
      </button>
    </form>
  );
}