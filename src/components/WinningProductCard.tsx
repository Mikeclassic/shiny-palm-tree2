"use client";
import { useState } from "react";
import { Flame, DollarSign, Star, Upload, TrendingUp, ExternalLink } from "lucide-react";
import Image from "next/image";

export default function WinningProductCard({ product }: { product: any }) {
  const [expanded, setExpanded] = useState(false);

  const scoreColor =
    product.viralScore >= 90 ? 'text-red-600 bg-red-100 border-red-200' :
    product.viralScore >= 80 ? 'text-orange-600 bg-orange-100 border-orange-200' :
    product.viralScore >= 70 ? 'text-yellow-600 bg-yellow-100 border-yellow-200' :
    'text-green-600 bg-green-100 border-green-200';

  const potentialBadge =
    product.viralPotential === 'high' ? 'bg-red-100 text-red-700 border-red-200' :
    product.viralPotential === 'medium' ? 'bg-orange-100 text-orange-700 border-orange-200' :
    'bg-yellow-100 text-yellow-700 border-yellow-200';

  const profit = product.price - (product.supplierPrice || 0) - 9;
  const profitMargin = product.profitMarginPct || ((profit / product.price) * 100);

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-xl transition group">
      {/* Image */}
      <div className="relative aspect-square bg-slate-100">
        <Image
          src={product.imageUrl}
          alt={product.title}
          fill
          className="object-cover group-hover:scale-105 transition duration-300"
        />

        {/* Viral Score Badge */}
        {product.viralScore && (
          <div className={`absolute top-3 right-3 backdrop-blur rounded-lg px-3 py-2 shadow-lg border ${scoreColor}`}>
            <div className="flex items-center gap-2">
              <Flame size={16} />
              <span className="text-lg font-bold">
                {product.viralScore}
              </span>
            </div>
          </div>
        )}

        {/* Potential Badge */}
        {product.viralPotential && (
          <div className={`absolute top-3 left-3 px-3 py-1 rounded-full text-[10px] font-bold border ${potentialBadge}`}>
            {product.viralPotential.toUpperCase()}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <h3 className="font-semibold text-sm line-clamp-2 min-h-[40px]">
          {product.title}
        </h3>

        {/* Profit Info */}
        <div className="p-2 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <DollarSign size={14} className="text-green-600" />
              <span className="text-xs text-green-700 font-semibold">Profit</span>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-green-600">
                ${profit.toFixed(0)}
              </div>
              <div className="text-[10px] text-green-600">
                {profitMargin.toFixed(0)}% margin
              </div>
            </div>
          </div>
        </div>

        {/* Reasons (expandable) */}
        {product.viralReasons && product.viralReasons.length > 0 && (
          <div>
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              {expanded ? 'Hide' : 'Show'} why this wins ({product.viralReasons.length})
            </button>

            {expanded && (
              <div className="mt-2 space-y-1">
                {product.viralReasons.map((reason: string, i: number) => (
                  <div key={i} className="text-xs text-slate-600 flex items-start gap-2">
                    <span className="mt-0.5">•</span>
                    <span>{reason}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Stats */}
        {(product.supplierRating || product.supplierReviews) && (
          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-200 text-xs">
            {product.supplierRating && (
              <div className="flex items-center gap-1.5">
                <Star size={14} className="text-yellow-500 fill-yellow-500" />
                <div>
                  <div className="text-[10px] text-slate-500">Rating</div>
                  <div className="font-semibold">
                    {product.supplierRating.toFixed(1)}
                  </div>
                </div>
              </div>
            )}

            {product.supplierReviews && (
              <div className="flex items-center gap-1.5">
                <TrendingUp size={14} className="text-blue-500" />
                <div>
                  <div className="text-[10px] text-slate-500">Orders</div>
                  <div className="font-semibold">
                    {product.supplierReviews > 1000
                      ? `${(product.supplierReviews / 1000).toFixed(1)}k`
                      : product.supplierReviews}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {product.supplierUrl && (
            <a
              href={product.supplierUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-lg transition font-medium text-xs"
            >
              <ExternalLink size={14} />
              Supplier
            </a>
          )}
          <a
            href={`/dashboard?q=${encodeURIComponent(product.title.split(' ').slice(0, 3).join(' '))}`}
            className="flex-1 flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white py-2.5 rounded-lg transition font-semibold text-xs"
          >
            <Upload size={14} />
            View Details
          </a>
        </div>
      </div>
    </div>
  );
}
