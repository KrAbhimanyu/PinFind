import React, { useState, useMemo } from 'react';
import { Product, ClickEvent } from '../types';
import { 
  BarChart3, TrendingUp, ExternalLink, MousePointerClick, 
  Layers, ShoppingBag, Clock, Laptop, Smartphone, 
  Trash2, ArrowUpRight, DollarSign, ShieldAlert, Sparkles,
  Zap, Calendar, Activity
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface AnalyticsViewProps {
  products: Product[];
  clicks: ClickEvent[];
  onClearClicks: () => void;
  onOpenProduct: (product: Product) => void;
  onShowToast: (message: string) => void;
}

type TimeRange = '24h' | '7d' | '30d';

interface HourlyDataPoint {
  hourLabel: string;
  displayTime: string;
  clicks: number;
  mobileClicks: number;
  desktopClicks: number;
  topMerchant: string;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  products,
  clicks,
  onClearClicks,
  onOpenProduct,
  onShowToast,
}) => {
  const [filterRetailer, setFilterRetailer] = useState<string>('all');
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('24h');

  // Compute key analytics KPIs
  const totalClicks = clicks.length;
  const uniqueProductsClicked = new Set(clicks.map(c => c.productId)).size;
  
  // Group by Retailer
  const retailerCounts: Record<string, number> = {};
  clicks.forEach(c => {
    const ret = c.retailer || 'Direct';
    retailerCounts[ret] = (retailerCounts[ret] || 0) + 1;
  });

  // Group by Referrer Location
  const locationCounts: Record<string, number> = {};
  clicks.forEach(c => {
    const loc = c.referrerLocation || 'card_quick_button';
    locationCounts[loc] = (locationCounts[loc] || 0) + 1;
  });

  // Group by Device Type
  const desktopClicks = clicks.filter(c => c.deviceType === 'desktop').length;
  const mobileClicks = clicks.filter(c => c.deviceType === 'mobile' || c.deviceType === 'tablet').length;

  // Hourly Sparkline Data Computation for Recharts
  const { hourlyChartData, peakHourInfo, timeRangeTotalClicks, avgClicksPerHour } = useMemo(() => {
    const now = Date.now();
    const dataPoints: HourlyDataPoint[] = [];

    if (selectedTimeRange === '24h') {
      // 24 one-hour buckets ending at current hour
      for (let i = 23; i >= 0; i--) {
        const bucketStart = now - (i + 1) * 3600000;
        const bucketEnd = now - i * 3600000;
        const bucketDate = new Date(bucketEnd);
        
        const matchingClicks = clicks.filter(c => {
          const t = new Date(c.timestamp).getTime();
          return t >= bucketStart && t < bucketEnd;
        });

        // Top merchant in this bucket
        const merchants: Record<string, number> = {};
        matchingClicks.forEach(c => {
          const r = c.retailer || 'Direct';
          merchants[r] = (merchants[r] || 0) + 1;
        });
        const topMerchant = Object.entries(merchants).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Direct';

        const hourNum = bucketDate.getHours();
        const ampm = hourNum >= 12 ? 'PM' : 'AM';
        const formattedHour = `${hourNum % 12 === 0 ? 12 : hourNum % 12} ${ampm}`;

        dataPoints.push({
          hourLabel: i % 4 === 0 || i === 0 ? formattedHour : '',
          displayTime: `${bucketDate.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${formattedHour}`,
          clicks: matchingClicks.length,
          mobileClicks: matchingClicks.filter(c => c.deviceType === 'mobile' || c.deviceType === 'tablet').length,
          desktopClicks: matchingClicks.filter(c => c.deviceType === 'desktop').length,
          topMerchant,
        });
      }
    } else if (selectedTimeRange === '7d') {
      // 7 daily buckets divided into morning/afternoon intervals (14 points)
      for (let i = 13; i >= 0; i--) {
        const bucketStart = now - (i + 1) * 12 * 3600000;
        const bucketEnd = now - i * 12 * 3600000;
        const bucketDate = new Date(bucketEnd);

        const matchingClicks = clicks.filter(c => {
          const t = new Date(c.timestamp).getTime();
          return t >= bucketStart && t < bucketEnd;
        });

        const hourNum = bucketDate.getHours();
        const ampm = hourNum >= 12 ? 'PM' : 'AM';
        const dayStr = bucketDate.toLocaleDateString([], { weekday: 'short' });

        dataPoints.push({
          hourLabel: i % 2 === 0 ? dayStr : '',
          displayTime: `${bucketDate.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${ampm}`,
          clicks: matchingClicks.length,
          mobileClicks: matchingClicks.filter(c => c.deviceType === 'mobile' || c.deviceType === 'tablet').length,
          desktopClicks: matchingClicks.filter(c => c.deviceType === 'desktop').length,
          topMerchant: 'Amazon / Etsy',
        });
      }
    } else {
      // 30 days breakdown (30 daily data points)
      for (let i = 29; i >= 0; i--) {
        const bucketStart = now - (i + 1) * 24 * 3600000;
        const bucketEnd = now - i * 24 * 3600000;
        const bucketDate = new Date(bucketEnd);

        const matchingClicks = clicks.filter(c => {
          const t = new Date(c.timestamp).getTime();
          return t >= bucketStart && t < bucketEnd;
        });

        dataPoints.push({
          hourLabel: i % 5 === 0 || i === 0 ? bucketDate.toLocaleDateString([], { month: 'short', day: 'numeric' }) : '',
          displayTime: bucketDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }),
          clicks: matchingClicks.length,
          mobileClicks: matchingClicks.filter(c => c.deviceType === 'mobile' || c.deviceType === 'tablet').length,
          desktopClicks: matchingClicks.filter(c => c.deviceType === 'desktop').length,
          topMerchant: 'Verified Retailers',
        });
      }
    }

    const rangeTotal = dataPoints.reduce((acc, curr) => acc + curr.clicks, 0);
    const avg = dataPoints.length > 0 ? (rangeTotal / dataPoints.length).toFixed(1) : '0';

    let maxPoint = dataPoints[0];
    dataPoints.forEach(p => {
      if (!maxPoint || p.clicks > maxPoint.clicks) {
        maxPoint = p;
      }
    });

    return {
      hourlyChartData: dataPoints,
      peakHourInfo: maxPoint && maxPoint.clicks > 0 ? maxPoint : null,
      timeRangeTotalClicks: rangeTotal,
      avgClicksPerHour: avg,
    };
  }, [clicks, selectedTimeRange]);

  // Top products sorted by clicks
  const topProducts = [...products]
    .sort((a, b) => (b.clicksCount || 0) - (a.clicksCount || 0))
    .slice(0, 10);

  // Filtered click logs
  const filteredClicks = filterRetailer === 'all' 
    ? clicks 
    : clicks.filter(c => c.retailer === filterRetailer);

  // Estimated affiliate earnings (standard 4.5% avg commission benchmark on estimated average cart of $65)
  const estimatedClicksValue = (totalClicks * 0.08 * 65 * 0.045).toFixed(2);

  return (
    <div id="analytics-view-container" className="max-w-[1600px] w-full mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase tracking-wider bg-emerald-600 text-white">
              Real-time Analytics
            </span>
            <span className="text-xs text-slate-500 font-medium">Outbound Affiliate Link Tracking</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Affiliate Click & Conversion Performance
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Every click to Amazon, Etsy, Nordstrom, and merchant websites is logged with device, timestamp, and pin location.
          </p>
        </div>

        {clicks.length > 0 && (
          <button
            onClick={() => {
              if (window.confirm('Clear all recorded affiliate click history?')) {
                onClearClicks();
                onShowToast('Click history reset.');
              }
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-rose-700 hover:bg-rose-50 border border-slate-200 transition-colors self-start sm:self-auto cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear Log
          </button>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Outbound Clicks */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Outbound Clicks</span>
            <MousePointerClick className="w-5 h-5 text-rose-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">{totalClicks}</div>
          <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Real-time active tracking
          </p>
        </div>

        {/* Unique Products Clicked */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Active Products</span>
            <Layers className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">{uniqueProductsClicked}</div>
          <p className="text-[11px] text-slate-400 mt-1">
            Out of {products.length} curated pins
          </p>
        </div>

        {/* Estimated Value Generated */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Est. Commission Pool</span>
            <DollarSign className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">${estimatedClicksValue}</div>
          <p className="text-[11px] text-slate-400 mt-1">
            Based on 4.5% avg retail affiliate model
          </p>
        </div>

        {/* Device Distribution */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Device Breakdown</span>
            <Laptop className="w-5 h-5 text-slate-700" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-slate-900">{desktopClicks} <span className="text-xs font-normal text-slate-500">Desk</span></span>
            <span className="text-slate-300">/</span>
            <span className="text-xl font-bold text-slate-900">{mobileClicks} <span className="text-xs font-normal text-slate-500">Mob</span></span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2 flex">
            <div 
              className="bg-slate-900 h-full" 
              style={{ width: `${totalClicks ? (desktopClicks / totalClicks) * 100 : 50}%` }}
            />
            <div 
              className="bg-rose-500 h-full" 
              style={{ width: `${totalClicks ? (mobileClicks / totalClicks) * 100 : 50}%` }}
            />
          </div>
        </div>
      </div>

      {/* Hourly Affiliate Click Distribution Sparkline (Recharts) */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-100">
                <Activity className="w-4 h-4" />
              </span>
              <h2 className="text-lg font-bold text-slate-900">
                Hourly Affiliate Click Velocity & Sparkline
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              Temporal distribution of shopper outbound redirects across merchant links
            </p>
          </div>

          {/* Time Range Selector Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl self-start sm:self-auto border border-slate-200/60">
            {(['24h', '7d', '30d'] as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setSelectedTimeRange(range)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedTimeRange === range
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {range === '24h' ? 'Last 24 Hours' : range === '7d' ? 'Last 7 Days' : 'Last 30 Days'}
              </button>
            ))}
          </div>
        </div>

        {/* Mini Stats Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/70">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Clicks in Window</span>
            <span className="text-lg font-extrabold text-slate-900">{timeRangeTotalClicks} clicks</span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Avg Click Rate</span>
            <span className="text-lg font-extrabold text-slate-900">{avgClicksPerHour} <span className="text-xs font-normal text-slate-500">/ interval</span></span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Peak Activity Slot</span>
            <span className="text-sm font-bold text-rose-600 truncate block">
              {peakHourInfo ? `${peakHourInfo.displayTime} (${peakHourInfo.clicks})` : 'Stable baseline'}
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Real-time Velocity</span>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-lg">
              <Zap className="w-3 h-3 text-emerald-600" /> Active stream
            </span>
          </div>
        </div>

        {/* Recharts Area Sparkline Chart */}
        <div className="h-56 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={hourlyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="clickSparkGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#e11d48" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#e11d48" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
              <XAxis 
                dataKey="hourLabel" 
                tickLine={false} 
                axisLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }}
              />
              <YAxis 
                allowDecimals={false}
                tickLine={false} 
                axisLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 11 }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as HourlyDataPoint;
                    return (
                      <div className="bg-slate-900 text-white p-3 rounded-2xl shadow-xl border border-slate-800 text-xs space-y-1.5 min-w-[170px]">
                        <div className="font-bold text-amber-300 border-b border-slate-800 pb-1 flex items-center justify-between">
                          <span>{data.displayTime}</span>
                          <span className="text-slate-400 font-mono text-[10px]">Hourly Log</span>
                        </div>
                        <div className="flex items-center justify-between pt-0.5">
                          <span className="text-slate-300">Outbound Clicks:</span>
                          <span className="font-extrabold text-white text-sm">{data.clicks}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>Mobile / Desktop:</span>
                          <span>{data.mobileClicks} mob • {data.desktopClicks} desk</span>
                        </div>
                        {data.topMerchant && (
                          <div className="text-[10px] text-slate-400 pt-0.5 truncate">
                            Top retailer: <strong className="text-slate-200">{data.topMerchant}</strong>
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="clicks"
                stroke="#e11d48"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#clickSparkGradient)"
                activeDot={{ r: 6, fill: '#e11d48', stroke: '#ffffff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Breakdown by Retailer & Referrer Button Section */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Retailer Share */}
        <div className="md:col-span-6 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-slate-600" /> Outbound Clicks by Retailer / Merchant
            </h3>
            <span className="text-xs text-slate-400">{Object.keys(retailerCounts).length} Merchants</span>
          </div>

          <div className="space-y-3">
            {Object.entries(retailerCounts).length === 0 ? (
              <p className="text-xs text-slate-400 italic">No clicks recorded yet. Click "Visit Site" on any product to test!</p>
            ) : (
              Object.entries(retailerCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([merchant, count]) => {
                  const percentage = totalClicks ? Math.round((count / totalClicks) * 100) : 0;
                  return (
                    <div key={merchant} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800">{merchant}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">{count} clicks</span>
                          <span className="text-slate-400 font-mono">({percentage}%)</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-slate-900 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>

        {/* Clicks by UI Source Component */}
        <div className="md:col-span-6 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <MousePointerClick className="w-4 h-4 text-slate-600" /> Outbound CTR by UI Trigger Location
            </h3>
            <span className="text-xs text-slate-400">Interaction heatmap</span>
          </div>

          <div className="space-y-3">
            {Object.entries(locationCounts).map(([loc, count]) => {
              const labelMap: Record<string, string> = {
                'card_quick_button': 'Pinterest Card "Visit Site →" Button',
                'card_hover_button': 'Card Overlay Quick Action',
                'detail_primary_btn': 'Product Detail Page Primary CTA',
                'trending_carousel': 'Trending Discovery Strip',
                'related_pin_btn': '"More Like This" Recommendations'
              };
              const percentage = totalClicks ? Math.round((count / totalClicks) * 100) : 0;
              return (
                <div key={loc} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">{labelMap[loc] || loc}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{count}</span>
                      <span className="text-slate-400 font-mono">({percentage}%)</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-rose-500 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top 10 Most Clicked Catalog Products */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Top Performing Curated Products</h3>
            <p className="text-xs text-slate-500">Highest volume traffic drivers ordered by outbound clicks</p>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 bg-amber-50 text-amber-900 rounded-lg border border-amber-200">
            Top 10 Leaderboard
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {topProducts.map((prod, rank) => (
            <div
              key={prod.id}
              onClick={() => onOpenProduct(prod)}
              className="group cursor-pointer rounded-2xl bg-slate-50 hover:bg-white border border-slate-200 p-3 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="relative aspect-square rounded-xl overflow-hidden bg-slate-200 mb-2">
                <img src={prod.imageUrl} alt={prod.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                <span className="absolute top-2 left-2 w-6 h-6 rounded-full bg-slate-900/90 text-white text-xs font-bold flex items-center justify-center backdrop-blur-xs">
                  #{rank + 1}
                </span>
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 line-clamp-1 group-hover:text-rose-600 transition-colors">
                  {prod.name}
                </h4>
                <div className="mt-1 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">{prod.retailer}</span>
                  <span className="font-bold text-emerald-700 bg-emerald-100/60 px-1.5 py-0.2 rounded">
                    {prod.clicksCount || 0} clicks
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live Outbound Click Log Stream */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-600" /> Outbound Click Event Stream
            </h3>
            <p className="text-xs text-slate-500">Every recorded merchant redirection event</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold">Filter Merchant:</span>
            <select
              value={filterRetailer}
              onChange={(e) => setFilterRetailer(e.target.value)}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-300 bg-slate-50 focus:outline-none"
            >
              <option value="all">All Merchants</option>
              {Object.keys(retailerCounts).map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="max-h-72 overflow-y-auto space-y-2">
          {filteredClicks.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No matching click logs found.</p>
          ) : (
            filteredClicks.slice(0, 40).map((click) => (
              <div
                key={click.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/60 text-xs transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                  <div className="truncate">
                    <span className="font-bold text-slate-900">{click.productName}</span>
                    <span className="text-slate-400 mx-2">•</span>
                    <span className="font-semibold text-slate-600">{click.retailer}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 flex-shrink-0 text-slate-400 text-[11px]">
                  <span className="hidden sm:inline bg-white px-2 py-0.5 rounded border border-slate-200 font-mono text-slate-600">
                    {click.deviceType}
                  </span>
                  <span className="font-medium text-slate-500">
                    {new Date(click.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  <a
                    href={click.destinationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 text-slate-400 hover:text-rose-600"
                    title="Direct Affiliate Link"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
