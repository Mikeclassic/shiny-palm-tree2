"use client";
import { useState, useEffect } from "react";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Loader2
} from "lucide-react";

interface ProfitCalculatorCompactProps {
  productId: string;
  supplierPrice: number;
  currentPrice: number;
  onPriceUpdate?: (newPrice: number) => void;
}

export default function ProfitCalculatorCompact({
  productId,
  supplierPrice,
  currentPrice,
  onPriceUpdate
}: ProfitCalculatorCompactProps) {
  const [sellingPrice, setSellingPrice] = useState(currentPrice);
  const [profitData, setProfitData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    calculateProfit();
  }, [sellingPrice]);

  const calculateProfit = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/products/calculate-profit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierPrice,
          sellingPrice,
          platform: 'shopify',
          shippingMethod: 'standard'
        })
      });
      const data = await res.json();
      setProfitData(data);
    } catch (error) {
      console.error('Profit calculation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!profitData) {
    return (
      <div className="bg-slate-50 rounded-lg p-3 flex items-center justify-center">
        <Loader2 className="animate-spin text-slate-400" size={16} />
      </div>
    );
  }

  const isHealthyMargin = profitData.profitMargin >= 30;
  const isLowMargin = profitData.profitMargin < 20;

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      {/* Compact View */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 hover:bg-slate-50 transition text-left"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign size={16} className="text-green-600" />
            <span className="text-sm font-medium text-slate-700">Profit</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className={`text-sm font-bold ${
                isHealthyMargin ? 'text-green-600' :
                isLowMargin ? 'text-red-600' :
                'text-blue-600'
              }`}>
                ${profitData.netProfit.toFixed(2)}
              </div>
              <div className="text-xs text-slate-500">
                {profitData.profitMargin.toFixed(0)}% margin
              </div>
            </div>
            {isHealthyMargin ? (
              <TrendingUp className="text-green-600" size={16} />
            ) : isLowMargin ? (
              <TrendingDown className="text-red-600" size={16} />
            ) : (
              <CheckCircle className="text-blue-600" size={16} />
            )}
          </div>
        </div>
      </button>

      {/* Expanded View */}
      {expanded && (
        <div className="border-t border-slate-200 p-4 space-y-3 bg-slate-50">
          {/* Price Input */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Selling Price
            </label>
            <div className="relative">
              <DollarSign
                className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"
                size={14}
              />
              <input
                type="number"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
                className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg text-sm font-medium"
                step="0.01"
              />
            </div>
          </div>

          {/* Cost Breakdown */}
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Product Cost</span>
              <span className="font-medium">${supplierPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Platform Fees</span>
              <span className="font-medium">${profitData.costBreakdown.fees.platformFees.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Payment Processing</span>
              <span className="font-medium">${profitData.costBreakdown.fees.paymentProcessing.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Shipping (Est.)</span>
              <span className="font-medium">${profitData.costBreakdown.fees.shipping.toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-300 font-semibold text-slate-900">
              <span>Net Profit</span>
              <span className={
                isHealthyMargin ? 'text-green-600' :
                isLowMargin ? 'text-red-600' :
                'text-blue-600'
              }>
                ${profitData.netProfit.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Recommendation */}
          <div className={`flex gap-2 p-2 rounded-lg text-xs ${
            isLowMargin ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-200'
          }`}>
            <AlertCircle
              className={isLowMargin ? 'text-red-600' : 'text-blue-600'}
              size={14}
            />
            <p className={`flex-1 ${isLowMargin ? 'text-red-900' : 'text-blue-900'}`}>
              {profitData.recommendation}
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => setSellingPrice(profitData.breakEvenPrice * 1.3)}
              className="flex-1 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 rounded text-xs font-medium transition"
            >
              30% Margin
            </button>
            <button
              onClick={() => setSellingPrice(profitData.breakEvenPrice * 1.5)}
              className="flex-1 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 rounded text-xs font-medium transition"
            >
              50% Margin
            </button>
          </div>

          {onPriceUpdate && sellingPrice !== currentPrice && (
            <button
              onClick={() => onPriceUpdate(sellingPrice)}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold text-sm"
            >
              Update Price
            </button>
          )}
        </div>
      )}
    </div>
  );
}
