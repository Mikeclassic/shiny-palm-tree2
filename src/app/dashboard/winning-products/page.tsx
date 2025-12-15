import { db } from "@/lib/db";
import { Flame, TrendingUp, Target, Sparkles } from "lucide-react";
import WinningProductCard from "@/components/WinningProductCard";

export const dynamic = 'force-dynamic';

export default async function WinningProductsPage() {
  // Get products with high viral scores or good profit margins
  const winningProducts = await db.product.findMany({
    where: {
      OR: [
        { viralScore: { gte: 70 } },
        { profitMarginPct: { gte: 40 } }
      ],
      supplierPrice: { not: null }
    },
    orderBy: [
      { viralScore: { sort: 'desc', nulls: 'last' } },
      { profitMarginPct: { sort: 'desc', nulls: 'last' } }
    ],
    take: 50
  });

  const todayWinners = winningProducts.filter(p => {
    const lastCheck = new Date(p.lastTrendCheck || p.createdAt);
    const today = new Date();
    return lastCheck.toDateString() === today.toDateString();
  });

  const avgScore = winningProducts.length > 0
    ? winningProducts.reduce((sum, p) => sum + (p.viralScore || 0), 0) / winningProducts.length
    : 0;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-6 sm:p-8 text-white">
        <div className="flex items-center gap-3 mb-4">
          <Flame size={32} />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Winning Products</h1>
            <p className="text-orange-100 text-sm sm:text-base">
              High-profit potential products curated for dropshipping success
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:gap-4 mt-6">
          <div className="bg-white/10 backdrop-blur rounded-lg p-3 sm:p-4">
            <div className="text-xl sm:text-2xl font-bold">{todayWinners.length}</div>
            <div className="text-xs sm:text-sm text-orange-100">New Today</div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-lg p-3 sm:p-4">
            <div className="text-xl sm:text-2xl font-bold">{winningProducts.length}</div>
            <div className="text-xs sm:text-sm text-orange-100">Total Winners</div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-lg p-3 sm:p-4">
            <div className="text-xl sm:text-2xl font-bold">
              {avgScore.toFixed(0)}
            </div>
            <div className="text-xs sm:text-sm text-orange-100">Avg Score</div>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <Sparkles className="text-blue-600 shrink-0" size={20} />
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">How It Works</h3>
            <p className="text-sm text-blue-800">
              Products are scored based on demand (reviews/orders), profit margins, competition, and ratings.
              Scores 70+ indicate high winning potential. Click any product to import it instantly!
            </p>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      {winningProducts.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-300 rounded-xl p-12 text-center">
          <Target size={48} className="mx-auto text-slate-400 mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No winning products yet</h3>
          <p className="text-slate-600">
            Import products with good profit margins to see them here, or check back later for AI-curated winners!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {winningProducts.map((product) => (
            <WinningProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
