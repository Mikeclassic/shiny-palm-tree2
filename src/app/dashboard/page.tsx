import { db } from "@/lib/db";
import { Database, Search, ShoppingBag, Globe, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import ProductGrid from "@/components/ProductGrid";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Dashboard({
  searchParams,
}: {
  searchParams: { q?: string; tab?: string; page?: string };
}) {
  const query = searchParams.q || "";
  const tab = searchParams.tab || "all"; 
  const page = Number(searchParams.page) || 1;
  const pageSize = 24;

  const where: any = {};
  
  if (query) {
    where.title = { contains: query, mode: 'insensitive' };
  }

  // TAB LOGIC
  if (tab === "ali") {
    where.supplierUrl = { not: null };
  } else if (tab === "other") {
    where.supplierUrl = null;
    where.lastSourced = { not: null };
  }

  const totalCount = await db.product.count({ where });
  
  // SORTING APPLIED TO ALL TABS
  const products = await db.product.findMany({
    where,
    take: pageSize,
    skip: (page - 1) * pageSize,
    orderBy: [
        { lastSourced: 'desc' }, // 1. Items the bot just checked (Success or Fail) appear first
        { createdAt: 'desc' }    // 2. Then new items
    ]
  });

  const totalPages = Math.ceil(totalCount / pageSize);

  async function searchAction(formData: FormData) {
    "use server";
    const q = formData.get("q");
    redirect(`/dashboard?q=${q}&tab=${tab}&page=1`);
  }

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
                <p className="text-xs text-gray-400 uppercase font-bold">Total Items</p>
                <p className="text-xl font-mono text-white font-bold">{totalCount}</p>
            </div>
        </div>
      </div>

      {/* TABS & SEARCH */}
      <div className="flex flex-col gap-6">
        <form action={searchAction} className="relative">
            <Search className="absolute left-4 top-3.5 text-gray-500" size={20} />
            <input 
                name="q" 
                defaultValue={query}
                placeholder="Search products..." 
                className="w-full bg-gray-900 border border-gray-800 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
            />
        </form>

        <div className="flex gap-2 overflow-x-auto pb-2">
            <Link 
                href={`/dashboard?q=${query}&tab=all&page=1`} 
                className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm whitespace-nowrap transition ${tab === 'all' ? 'bg-white text-black' : 'bg-gray-900 text-gray-400 hover:text-white'}`}
            >
                <ShoppingBag size={16} /> All Products
            </Link>
            <Link 
                href={`/dashboard?q=${query}&tab=ali&page=1`} 
                className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm whitespace-nowrap transition ${tab === 'ali' ? 'bg-green-500 text-white' : 'bg-gray-900 text-gray-400 hover:text-white'}`}
            >
                <Globe size={16} /> AliExpress Verified
            </Link>
            <Link 
                href={`/dashboard?q=${query}&tab=other&page=1`} 
                className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm whitespace-nowrap transition ${tab === 'other' ? 'bg-orange-500 text-white' : 'bg-gray-900 text-gray-400 hover:text-white'}`}
            >
                <AlertCircle size={16} /> Other Suppliers
            </Link>
        </div>
      </div>

      <ProductGrid initialProducts={products} />

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 pt-8 border-t border-gray-800">
            <Link 
                href={page > 1 ? `/dashboard?page=${page - 1}&q=${query}&tab=${tab}` : '#'}
                className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition ${page > 1 ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-gray-900 text-gray-600 cursor-not-allowed'}`}
            >
                <ChevronLeft size={18} /> Previous
            </Link>
            
            <span className="text-sm font-mono text-gray-500">
                Page <span className="text-white">{page}</span> of {totalPages}
            </span>

            <Link 
                href={page < totalPages ? `/dashboard?page=${page + 1}&q=${query}&tab=${tab}` : '#'}
                className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition ${page < totalPages ? 'bg-white text-black hover:bg-gray-200' : 'bg-gray-900 text-gray-600 cursor-not-allowed'}`}
            >
                Next <ChevronRight size={18} />
            </Link>
        </div>
      )}
    </div>
  );
}