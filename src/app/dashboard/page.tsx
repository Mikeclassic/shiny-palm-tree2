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
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* COMPACT HEADER (Mobile Optimized) */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-6 md:pb-8">
        <div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-brand-900 tracking-tight">Product Feed</h2>
            <p className="text-sm text-slate-500 mt-1">Daily trends & supplier connections.</p>
        </div>
        
        {/* KPI CARD - Smaller on mobile */}
        <div className="bg-white border border-slate-200 p-3 md:p-4 rounded-xl flex items-center gap-3 md:gap-4 shadow-sm self-start md:self-auto">
            <div className="p-2 md:p-3 bg-brand-50 rounded-lg text-brand-600">
                <Database size={20} />
            </div>
            <div>
                <p className="text-[10px] md:text-xs text-slate-500 uppercase font-bold tracking-wider">Total Items</p>
                <p className="text-xl md:text-2xl font-extrabold text-brand-900 leading-none">{totalCount}</p>
            </div>
        </div>
      </div>

      {/* CONTROLS */}
      <div className="flex flex-col gap-4 md:gap-6">
        <DashboardFilters topCategories={topCategories} currentTab={tab} />

        {/* TABS - Compact padding for mobile */}
        <div className="flex gap-2 border-b border-slate-200 overflow-x-auto no-scrollbar pb-1">
            <Link 
                href={`/dashboard?q=${query}&tab=all&type=${type}&page=1`} 
                className={`flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 border-b-2 font-medium text-xs md:text-sm whitespace-nowrap transition-all ${tab === 'all' ? 'border-brand-900 text-brand-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
                <ShoppingBag size={14} /> All Products
            </Link>
            <Link 
                href={`/dashboard?q=${query}&tab=ali&type=${type}&page=1`} 
                className={`flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 border-b-2 font-medium text-xs md:text-sm whitespace-nowrap transition-all ${tab === 'ali' ? 'border-green-600 text-green-700 bg-green-50/50' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
                <Globe size={14} /> AliExpress Verified
            </Link>
            <Link 
                href={`/dashboard?q=${query}&tab=other&type=${type}&page=1`} 
                className={`flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 border-b-2 font-medium text-xs md:text-sm whitespace-nowrap transition-all ${tab === 'other' ? 'border-orange-500 text-orange-600 bg-orange-50/50' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
                <AlertCircle size={14} /> Other Suppliers
            </Link>
        </div>
      </div>

      <ProductGrid initialProducts={products} />

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 md:gap-4 pt-4 md:pt-8 pb-8">
            <Link 
                href={page > 1 ? `/dashboard?page=${page - 1}&q=${query}&tab=${tab}&type=${type}` : '#'}
                className={`flex items-center gap-2 px-3 py-2 md:px-4 rounded-lg font-bold text-xs md:text-sm transition ${page > 1 ? 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
            >
                <ChevronLeft size={14} /> Prev
            </Link>
            
            <form action={jumpPageAction} className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm">
                <span className="text-xs md:text-sm text-slate-500">Page</span>
                <input 
                    name="page" 
                    defaultValue={page} 
                    className="w-10 md:w-12 bg-slate-50 border border-slate-200 rounded text-center text-xs md:text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-action py-1 font-bold"
                />
                <span className="text-xs md:text-sm text-slate-500">of {totalPages}</span>
            </form>

            <Link 
                href={page < totalPages ? `/dashboard?page=${page + 1}&q=${query}&tab=${tab}&type=${type}` : '#'}
                className={`flex items-center gap-2 px-3 py-2 md:px-4 rounded-lg font-bold text-xs md:text-sm transition ${page < totalPages ? 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
            >
                Next <ChevronRight size={14} />
            </Link>
        </div>
      )}
    </div>
  );
}