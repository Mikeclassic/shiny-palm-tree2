import { db } from "@/lib/db";
import { Database, ShoppingBag, Globe, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import ProductGrid from "@/components/ProductGrid";
import DashboardFilters from "@/components/DashboardFilters"; // <--- Import the new component

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Dashboard({
  searchParams,
}: {
  searchParams: { q?: string; tab?: string; page?: string; type?: string };
}) {
  const query = searchParams.q || "";
  const tab = searchParams.tab || "all"; 
  const type = searchParams.type || "all";
  const page = Number(searchParams.page) || 1;
  const pageSize = 24;

  // --- 1. BUILD QUERY ---
  const where: any = {};
  
  if (query) {
    where.title = { contains: query, mode: 'insensitive' };
  }

  if (type !== "all") {
    where.productType = type;
  }

  if (tab === "ali") {
    where.supplierUrl = { not: null };
  } else if (tab === "other") {
    where.supplierUrl = null;
    where.lastSourced = { not: null };
  }

  // --- 2. FETCH DATA ---
  
  // Get Categories for the Dropdown
  const topCategories = await db.product.groupBy({
    by: ['productType'],
    _count: { productType: true },
    orderBy: { _count: { productType: 'desc' } },
    take: 10,
    where: { productType: { not: null } }
  });

  const totalCount = await db.product.count({ where });
  
  const products = await db.product.findMany({
    where,
    take: pageSize,
    skip: (page - 1) * pageSize,
    orderBy: [
        { lastSourced: { sort: 'desc', nulls: 'last' } }, 
        { createdAt: 'desc' }    
    ]
  });

  const totalPages = Math.ceil(totalCount / pageSize);

  // Server Action for Pagination Jumping
  async function jumpPageAction(formData: FormData) {
    "use server";
    const newPage = formData.get("page");
    redirect(`/dashboard?q=${query}&tab=${tab}&type=${type}&page=${newPage}`);
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

      {/* CONTROLS AREA */}
      <div className="flex flex-col gap-6">
        
        {/* NEW CLIENT COMPONENT FOR SEARCH & FILTER */}
        <DashboardFilters topCategories={topCategories} currentTab={tab} />

        {/* TABS */}
        <div className="flex gap-2 overflow-x-auto pb-2">
            <Link 
                href={`/dashboard?q=${query}&tab=all&type=${type}&page=1`} 
                className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm whitespace-nowrap transition ${tab === 'all' ? 'bg-white text-black' : 'bg-gray-900 text-gray-400 hover:text-white'}`}
            >
                <ShoppingBag size={16} /> All Products
            </Link>
            <Link 
                href={`/dashboard?q=${query}&tab=ali&type=${type}&page=1`} 
                className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm whitespace-nowrap transition ${tab === 'ali' ? 'bg-green-500 text-white' : 'bg-gray-900 text-gray-400 hover:text-white'}`}
            >
                <Globe size={16} /> AliExpress Verified
            </Link>
            <Link 
                href={`/dashboard?q=${query}&tab=other&type=${type}&page=1`} 
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
                href={page > 1 ? `/dashboard?page=${page - 1}&q=${query}&tab=${tab}&type=${type}` : '#'}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition ${page > 1 ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-gray-900 text-gray-600 cursor-not-allowed'}`}
            >
                <ChevronLeft size={16} /> Prev
            </Link>
            
            <form action={jumpPageAction} className="flex items-center gap-2 bg-gray-900 px-4 py-2 rounded-lg border border-gray-800">
                <span className="text-sm text-gray-500">Page</span>
                <input 
                    name="page" 
                    defaultValue={page} 
                    className="w-12 bg-black border border-gray-700 rounded text-center text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500 py-1"
                />
                <span className="text-sm text-gray-500">of {totalPages}</span>
            </form>

            <Link 
                href={page < totalPages ? `/dashboard?page=${page + 1}&q=${query}&tab=${tab}&type=${type}` : '#'}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition ${page < totalPages ? 'bg-white text-black hover:bg-gray-200' : 'bg-gray-900 text-gray-600 cursor-not-allowed'}`}
            >
                Next <ChevronRight size={16} />
            </Link>
        </div>
      )}
    </div>
  );
}