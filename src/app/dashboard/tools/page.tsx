import { db } from "@/lib/db";
import { Database, Search, Filter, ChevronLeft, ChevronRight, X } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import ProductGrid from "@/components/ProductGrid";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Dashboard({
  searchParams,
}: {
  searchParams: { q?: string; page?: string; aesthetic?: string };
}) {
  const query = searchParams.q || "";
  const page = Number(searchParams.page) || 1;
  const aesthetic = searchParams.aesthetic || "";
  const pageSize = 24;

  const where: any = {};
  if (query) {
    where.title = { contains: query, mode: 'insensitive' };
  }
  if (aesthetic && aesthetic !== "All") {
    where.aesthetic = aesthetic;
  }

  const totalCount = await db.product.count({ where });
  const products = await db.product.findMany({
    where,
    take: pageSize,
    skip: (page - 1) * pageSize,
    orderBy: { createdAt: 'desc' }
  });

  const totalPages = Math.ceil(totalCount / pageSize);

  async function searchAction(formData: FormData) {
    "use server";
    const q = formData.get("q");
    const aesthetic = formData.get("aesthetic");
    redirect(`/dashboard?q=${q}&aesthetic=${aesthetic}&page=1`);
  }

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-gray-800 pb-8">
        <div>
            <h2 className="text-3xl font-bold">Winning Products 🔥</h2>
            <p className="text-gray-400 mt-2">Curated high-margin items from 100+ top stores.</p>
        </div>
        
        <div className="bg-gray-900 border border-gray-700 p-4 rounded-xl flex items-center gap-4 shadow-lg shadow-black/50">
            <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400">
                <Database size={24} />
            </div>
            <div>
                <p className="text-xs text-gray-400 uppercase font-bold">Database Size</p>
                <p className="text-xl font-mono text-white font-bold">
                    {totalCount} <span className="text-gray-500 text-sm">items</span>
                </p>
            </div>
        </div>
      </div>

      {/* SEARCH BAR */}
      <form action={searchAction} className="bg-gray-900/50 p-4 rounded-2xl border border-gray-800 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
            <Search className="absolute left-4 top-3.5 text-gray-500" size={20} />
            <input 
                name="q" 
                defaultValue={query}
                placeholder="Search products..." 
                className="w-full bg-black border border-gray-700 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
            />
        </div>
        
        <div className="flex gap-4">
            <div className="relative">
                <Filter className="absolute left-4 top-3.5 text-gray-500" size={20} />
                <select 
                    name="aesthetic" 
                    defaultValue={aesthetic}
                    className="bg-black border border-gray-700 rounded-xl py-3 pl-12 pr-8 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 appearance-none h-full cursor-pointer"
                >
                    <option value="">All Aesthetics</option>
                    <option value="Trending 🔥">Trending 🔥</option>
                    <option value="Y2K">Y2K</option>
                </select>
            </div>
            
            <button type="submit" className="bg-white text-black font-bold px-6 py-3 rounded-xl hover:bg-gray-200 transition">
                Search
            </button>
            
            {(query || aesthetic) && (
                <Link href="/dashboard" className="flex items-center justify-center bg-gray-800 text-gray-400 px-4 rounded-xl hover:bg-gray-700 hover:text-white transition">
                    <X size={20} />
                </Link>
            )}
        </div>
      </form>

      {/* THIS IS THE FIX: Using the interactive component instead of static mapping */}
      <ProductGrid initialProducts={products} />

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 pt-8 border-t border-gray-800">
            <Link 
                href={page > 1 ? `/dashboard?page=${page - 1}&q=${query}&aesthetic=${aesthetic}` : '#'}
                className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition ${page > 1 ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-gray-900 text-gray-600 cursor-not-allowed'}`}
            >
                <ChevronLeft size={18} /> Previous
            </Link>
            
            <span className="text-sm font-mono text-gray-500">
                Page <span className="text-white">{page}</span> of {totalPages}
            </span>

            <Link 
                href={page < totalPages ? `/dashboard?page=${page + 1}&q=${query}&aesthetic=${aesthetic}` : '#'}
                className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition ${page < totalPages ? 'bg-white text-black hover:bg-gray-200' : 'bg-gray-900 text-gray-600 cursor-not-allowed'}`}
            >
                Next <ChevronRight size={18} />
            </Link>
        </div>
      )}
    </div>
  );
}