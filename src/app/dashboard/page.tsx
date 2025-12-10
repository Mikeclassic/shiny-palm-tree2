import { db } from "@/lib/db";
import { Database, ShoppingBag, Globe, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import ProductGrid from "@/components/ProductGrid";
import DashboardFilters from "@/components/DashboardFilters";

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

  const where: any = {};
  if (query) where.title = { contains: query, mode: 'insensitive' };
  if (type !== "all") where.productType = type;
  if (tab === "ali") where.supplierUrl = { not: null };
  else if (tab === "other") { where.supplierUrl = null; where.lastSourced = { not: null }; }

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

  async function jumpPageAction(formData: FormData) {
    "use server";
    const newPage = formData.get("page");
    redirect(`/dashboard?q=${query}&tab=${tab}&type=${type}&page=${newPage}`);
  }

  return (
    <div className="space-y-4 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* HEADER & KPI - More Compact on Mobile */}
      <div className="flex flex-row items-center justify-between gap-2 border-b border-slate-200 pb-4 md:pb-8">
        <div>
            <h2 className="text-xl md:text-3xl font-extrabold text-brand-900 tracking-tight">Product Feed</h2>
            <p className="text-xs md:text-sm text-slate-500 mt-1 hidden sm:block">Daily trends & supplier connections.</p>
        </div>
        
        {/* KPI CARD - Tiny on mobile */}
        <div className="bg-white border border-slate-200 px-3 py-2 md:p-4 rounded-lg md:rounded-xl flex items-center gap-2 md:gap-4 shadow-sm shrink-0">
            <div className="hidden md:block p-3 bg-brand-50 rounded-lg text-brand-600">
                <Database size={20} />
            </div>
            <div className="text-right md:text-left">
                <p className="text-[10px] md:text-xs text-slate-500 uppercase font-bold tracking-wider">Total</p>
                <p className="text-lg md:text-2xl font-extrabold text-brand-900 leading-none">{totalCount}</p>
            </div>
        </div>
      </div>

      {/* CONTROLS */}
      <div className="flex flex-col gap-4">
        <DashboardFilters topCategories={topCategories} currentTab={tab} />

        {/* TABS - NOW A GRID (Fits on screen, no scroll) */}
        <div className="grid grid-cols-3 gap-1 md:gap-2 border-b border-slate-200 pb-1">
            <Link 
                href={`/dashboard?q=${query}&tab=all&type=${type}&page=1`} 
                className={`flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 px-1 py-2 md:px-6 md:py-3 border-b-2 font-medium text-[10px] md:text-sm text-center transition-all ${tab === 'all' ? 'border-brand-900 text-brand-900' : 'border-transparent text-slate-400 hover:text-slate-700'}`}
            >
                <ShoppingBag size={14} className="md:w-4 md:h-4" /> 
                <span>All Products</span>
            </Link>
            <Link 
                href={`/dashboard?q=${query}&tab=ali&type=${type}&page=1`} 
                className={`flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 px-1 py-2 md:px-6 md:py-3 border-b-2 font-medium text-[10px] md:text-sm text-center transition-all ${tab === 'ali' ? 'border-green-600 text-green-700 bg-green-50/50' : 'border-transparent text-slate-400 hover:text-slate-700'}`}
            >
                <Globe size={14} className="md:w-4 md:h-4" /> 
                {/* Shortened text for mobile */}
                <span className="hidden md:inline">AliExpress Verified</span>
                <span className="md:hidden">AliExpress</span>
            </Link>
            <Link 
                href={`/dashboard?q=${query}&tab=other&type=${type}&page=1`} 
                className={`flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 px-1 py-2 md:px-6 md:py-3 border-b-2 font-medium text-[10px] md:text-sm text-center transition-all ${tab === 'other' ? 'border-orange-500 text-orange-600 bg-orange-50/50' : 'border-transparent text-slate-400 hover:text-slate-700'}`}
            >
                <AlertCircle size={14} className="md:w-4 md:h-4" /> 
                 {/* Shortened text for mobile */}
                <span className="hidden md:inline">Other Suppliers</span>
                <span className="md:hidden">Others</span>
            </Link>
        </div>
      </div>

      <ProductGrid initialProducts={products} />

      {/* PAGINATION - Compact */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 md:gap-4 pt-2 md:pt-8 pb-8">
            <Link 
                href={page > 1 ? `/dashboard?page=${page - 1}&q=${query}&tab=${tab}&type=${type}` : '#'}
                className={`flex items-center gap-1 md:gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-bold text-xs md:text-sm transition ${page > 1 ? 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
            >
                <ChevronLeft size={14} /> Prev
            </Link>
            
            <form action={jumpPageAction} className="flex items-center gap-2 bg-white px-2 py-1 md:px-3 md:py-2 rounded-lg border border-slate-200 shadow-sm">
                <span className="text-[10px] md:text-sm text-slate-500 uppercase font-bold">Page</span>
                <input 
                    name="page" 
                    defaultValue={page} 
                    className="w-8 md:w-12 bg-slate-50 border border-slate-200 rounded text-center text-xs md:text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-action py-1 font-bold"
                />
                <span className="text-[10px] md:text-sm text-slate-500">/ {totalPages}</span>
            </form>

            <Link 
                href={page < totalPages ? `/dashboard?page=${page + 1}&q=${query}&tab=${tab}&type=${type}` : '#'}
                className={`flex items-center gap-1 md:gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-bold text-xs md:text-sm transition ${page < totalPages ? 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
            >
                Next <ChevronRight size={14} />
            </Link>
        </div>
      )}
    </div>
  );
}