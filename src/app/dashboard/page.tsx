import { db } from "@/lib/db";
import { ArrowUpRight, Database, Search, Filter, ChevronLeft, ChevronRight, X } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

// Force dynamic rendering so search works instantly
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Dashboard({
  searchParams,
}: {
  searchParams: { q?: string; page?: string; aesthetic?: string };
}) {
  // 1. Parse Search Params
  const query = searchParams.q || "";
  const page = Number(searchParams.page) || 1;
  const aesthetic = searchParams.aesthetic || "";
  const pageSize = 24;

  // 2. Build Query Filters
  const where: any = {};
  if (query) {
    where.title = { contains: query, mode: 'insensitive' };
  }
  if (aesthetic && aesthetic !== "All") {
    where.aesthetic = aesthetic;
  }

  // 3. Fetch Data
  const totalCount = await db.product.count({ where });
  const products = await db.product.findMany({
    where,
    take: pageSize,
    skip: (page - 1) * pageSize,
    orderBy: { createdAt: 'desc' }
  });

  const totalPages = Math.ceil(totalCount / pageSize);

  // 4. Client Action for Search (Embedded helper)
  async function searchAction(formData: FormData) {
    "use server";
    const q = formData.get("q");
    const aesthetic = formData.get("aesthetic");
    redirect(`/dashboard?q=${q}&aesthetic=${aesthetic}&page=1`);
  }

  return (
    <div className="space-y-8">
      {/* HEADER & STATS */}
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

      {/* SEARCH & FILTER BAR */}
      <form action={searchAction} className="bg-gray-900/50 p-4 rounded-2xl border border-gray-800 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
            <Search className="absolute left-4 top-3.5 text-gray-500" size={20} />
            <input 
                name="q" 
                defaultValue={query}
                placeholder="Search products (e.g. 'Hello Kitty', 'Goth', 'Hoodie')..." 
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
                <Link href="/dashboard" className="flex items-center justify-center bg-gray-800 text-gray-400 px-4 rounded-xl hover:bg-gray-700 hover:text-white transition" title="Clear Filters">
                    <X size={20} />
                </Link>
            )}
        </div>
      </form>

      {/* PRODUCTS GRID */}
      {products.length === 0 ? (
        <div className="p-20 border border-dashed border-gray-800 rounded-xl text-center text-gray-500 bg-gray-900/20">
            <Search size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-xl font-medium">No products found.</p>
            <p className="text-sm mt-2 opacity-60">Try adjusting your search or filters.</p>
            {(query || aesthetic) && (
                <Link href="/dashboard" className="inline-block mt-4 text-purple-400 hover:text-purple-300">
                    Clear all filters
                </Link>
            )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product) => (
            <div key={product.id} className="group bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-purple-500/50 transition duration-300 flex flex-col">
                <div className="h-64 relative overflow-hidden bg-black">
                    <img 
                        src={product.imageUrl} 
                        alt={product.title} 
                        className="w-full h-full object-cover group-hover:scale-110 transition duration-500" 
                        loading="lazy"
                    />
                    <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white border border-white/10">
                        {product.aesthetic}
                    </div>
                </div>
                <div className="p-5 flex flex-col flex-1">
                    <h3 className="font-bold text-sm line-clamp-2 mb-4 h-10 leading-tight" title={product.title}>
                        {product.title}
                    </h3>
                    <div className="mt-auto flex justify-between items-end border-t border-gray-800 pt-4">
                        <div>
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Price</p>
                            <p className="text-xl font-mono text-white">${product.price}</p>
                        </div>
                        <a 
                            href={product.sourceUrl} 
                            target="_blank" 
                            className="bg-white text-black p-2 rounded-full hover:bg-purple-400 hover:scale-110 transition shadow-lg shadow-purple-900/20"
                        >
                            <ArrowUpRight size={18} />
                        </a>
                    </div>
                </div>
            </div>
            ))}
        </div>
      )}

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