import React, { useState } from 'react';
import { Product, ClickEvent } from '../../types';
import { formatPrice } from '../../utils/formatters';
import { DollarSign, TrendingUp, Sparkles, Percent, Target, HelpCircle, ArrowUpRight, BarChart3 } from 'lucide-react';

interface AffiliateEarningsEstimatorProps {
  products: Product[];
  clicks: ClickEvent[];
}

export const AffiliateEarningsEstimator: React.FC<AffiliateEarningsEstimatorProps> = ({
  products,
  clicks,
}) => {
  const [conversionRate, setConversionRate] = useState<number>(2.5); // 2.5% standard e-commerce conv rate
  const [averageCommissionRate, setAverageCommissionRate] = useState<number>(6.0); // 6% average affiliate commission
  const [projectedMonthlyTraffic, setProjectedMonthlyTraffic] = useState<number>(15000); // 15k monthly page views

  const totalClicksCount = clicks.length || products.reduce((acc, p) => acc + (p.clicksCount || 0), 0);
  const averageProductPrice = products.length > 0
    ? products.reduce((acc, p) => acc + (p.price || 0), 0) / products.length
    : 2500;

  // Realized Historical Estimations
  const estimatedConversions = Math.round(totalClicksCount * (conversionRate / 100));
  const estimatedGrossMerchandiseValue = estimatedConversions * averageProductPrice;
  const estimatedRealizedRevenue = estimatedGrossMerchandiseValue * (averageCommissionRate / 100);

  // Projected Forward Estimations (Monthly based on traffic)
  const projectedMonthlyOutboundClicks = Math.round(projectedMonthlyTraffic * 0.12); // ~12% CTR to merchant
  const projectedMonthlyOrders = Math.round(projectedMonthlyOutboundClicks * (conversionRate / 100));
  const projectedMonthlyGMV = projectedMonthlyOrders * averageProductPrice;
  const projectedMonthlyEarnings = projectedMonthlyGMV * (averageCommissionRate / 100);

  return (
    <div id="affiliate-earnings-estimator-widget" className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-6">
      {/* Widget Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center border border-emerald-200">
          <TrendingUp className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            Affiliate Revenue & Commission Estimator
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold uppercase tracking-wider">
              INR (₹) Forecast
            </span>
          </h3>
          <p className="text-xs text-slate-500">
            Real-time projection model based on verified click telemetry, catalog average order value (AOV), and affiliate tiers.
          </p>
        </div>
      </div>

      {/* Control Sliders Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
        <div>
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1.5">
            <span>Estimated Retailer Conv. Rate</span>
            <span className="text-rose-600 font-extrabold">{conversionRate}%</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="8.0"
            step="0.1"
            value={conversionRate}
            onChange={(e) => setConversionRate(parseFloat(e.target.value))}
            className="w-full accent-rose-600 cursor-pointer"
          />
          <span className="text-[10px] text-slate-400">Industry baseline: 1.5% - 3.5%</span>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1.5">
            <span>Average Commission Rate</span>
            <span className="text-emerald-700 font-extrabold">{averageCommissionRate}%</span>
          </div>
          <input
            type="range"
            min="1.0"
            max="15.0"
            step="0.5"
            value={averageCommissionRate}
            onChange={(e) => setAverageCommissionRate(parseFloat(e.target.value))}
            className="w-full accent-emerald-600 cursor-pointer"
          />
          <span className="text-[10px] text-slate-400">Amazon/Direct: 4% - 10%</span>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1.5">
            <span>Projected Monthly Views</span>
            <span className="text-slate-900 font-extrabold">{projectedMonthlyTraffic.toLocaleString('en-IN')}</span>
          </div>
          <input
            type="range"
            min="1000"
            max="100000"
            step="1000"
            value={projectedMonthlyTraffic}
            onChange={(e) => setProjectedMonthlyTraffic(parseInt(e.target.value, 10))}
            className="w-full accent-slate-900 cursor-pointer"
          />
          <span className="text-[10px] text-slate-400">Pinterest + Organic + Direct</span>
        </div>
      </div>

      {/* Projection Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Historical Click GMV */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 text-white shadow-lg">
          <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1">
            Current Outbound Clicks
          </span>
          <div className="text-2xl font-extrabold mb-1">
            {totalClicksCount.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-400">
            Across {products.length} published Pins
          </p>
        </div>

        {/* Realized Revenue */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-lg">
          <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-100 block mb-1">
            Est. Historical Earnings
          </span>
          <div className="text-2xl font-extrabold mb-1">
            {formatPrice(estimatedRealizedRevenue, 'INR')}
          </div>
          <p className="text-[11px] text-emerald-100/80">
            From {formatPrice(estimatedGrossMerchandiseValue, 'INR')} GMV
          </p>
        </div>

        {/* Projected Monthly GMV */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1">
            Projected Monthly GMV
          </span>
          <div className="text-2xl font-extrabold text-slate-900 mb-1">
            {formatPrice(projectedMonthlyGMV, 'INR')}
          </div>
          <p className="text-[11px] text-slate-500">
            ~{projectedMonthlyOrders} orders/month
          </p>
        </div>

        {/* Projected Monthly Earnings */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold tracking-widest text-rose-700 block mb-1">
            Projected Monthly Payout
          </span>
          <div className="text-2xl font-extrabold text-rose-600 mb-1">
            {formatPrice(projectedMonthlyEarnings, 'INR')}
          </div>
          <p className="text-[11px] text-rose-800/80">
            Based on current {conversionRate}% conv.
          </p>
        </div>
      </div>
    </div>
  );
};
