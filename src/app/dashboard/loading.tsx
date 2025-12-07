import { Database, Search, ShoppingBag, Globe, AlertCircle } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* HEADER SKELETON */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-gray-800 pb-8">
        <div>
            <div className="h-8 w-48 bg-gray-800 rounded-lg mb-2"></div>
            <div className="h-4 w-64 bg-gray-800 rounded-lg"></div>
        </div>
        
        <div className="bg-gray-900 border border-gray-700 p-4 rounded-xl flex items-center gap-4">
            <div className="p-3 bg-blue-900/20 rounded-lg">
                <Database size={24} className="text-gray-700" />
            </div>
            <div>
                <div className="h-3 w-20 bg-gray-800 rounded mb-1"></div>
                <div className="h-6 w-12 bg-gray-800 rounded"></div>
            </div>
        </div>
      </div>

      {/* TABS & SEARCH SKELETON */}
      <div className="flex flex-col gap-6">
        <div className="relative">
            <Search className="absolute left-4 top-3.5 text-gray-700" size={20} />
            <div className="w-full h-12 bg-gray-900 border border-gray-800 rounded-xl"></div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
            {[1, 2, 3].map((i) => (
                <div key={i} className="h-11 w-40 bg-gray-900 rounded-full border border-gray-800"></div>
            ))}
        </div>
      </div>

      {/* GRID SKELETON */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden h-[400px]">
                <div className="h-64 bg-gray-800"></div>
                <div className="p-5 space-y-4">
                    <div className="h-4 w-3/4 bg-gray-800 rounded"></div>
                    <div className="h-4 w-1/2 bg-gray-800 rounded"></div>
                    <div className="grid grid-cols-2 gap-2 mt-4">
                        <div className="h-10 bg-gray-800 rounded-xl"></div>
                        <div className="h-10 bg-gray-800 rounded-xl"></div>
                    </div>
                </div>
            </div>
        ))}
      </div>
    </div>
  );
}