import React, { useState, useEffect, useCallback } from 'react';
import { 
  AdminTrafficStats, DailyTrafficItem, PageTrafficItem, PageViewEvent 
} from '../../types';
import { api } from '../../services/api';
import { 
  Users, Eye, Activity, TrendingUp, Monitor, Smartphone, 
  Tablet, Globe, RefreshCw, Calendar, ArrowUpRight, Compass,
  Layers, Clock, ShieldCheck, CheckCircle2
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  Tooltip, CartesianGrid, Legend, BarChart, Bar 
} from 'recharts';

interface TrafficStatsProps {
  onShowToast?: (message: string) => void;
}

export const TrafficStats: React.FC<TrafficStatsProps> = ({ onShowToast }) => {
  const [trafficData, setTrafficData] = useState<AdminTrafficStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '14d' | 'all'>('14d');
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');

  const fetchTrafficStats = useCallback(async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    setError(null);
    try {
      const data = await api.getAdminTrafficStats();
      setTrafficData(data);
    } catch (err: any) {
      console.error('Failed to load traffic stats', err);
      setError(err.message || 'Unable to retrieve traffic statistics.');
      if (onShowToast) {
        onShowToast('Could not load traffic analytics.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [onShowToast]);

  useEffect(() => {
    fetchTrafficStats();
    // Auto-refresh stats every 30 seconds while on this tab
    const interval = setInterval(() => {
      fetchTrafficStats(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchTrafficStats]);

  // Format daily traffic according to selected time range
  const chartData = React.useMemo(() => {
    if (!trafficData || !trafficData.dailyTraffic) return [];
    const daily = trafficData.dailyTraffic;
    if (timeRange === '7d') {
      return daily.slice(-7);
    }
    return daily;
  }, [trafficData, timeRange]);

  // Device calculations
  const deviceTotals = React.useMemo(() => {
    const devices = trafficData?.trafficByDevice || { desktop: 0, mobile: 0, tablet: 0 };
    const total = (devices.desktop || 0) + (devices.mobile || 0) + (devices.tablet || 0);
    const getPercent = (count: number) => (total > 0 ? Math.round((count / total) * 100) : 0);

    return {
      desktop: { count: devices.desktop || 0, percent: getPercent(devices.desktop || 0) },
      mobile: { count: devices.mobile || 0, percent: getPercent(devices.mobile || 0) },
      tablet: { count: devices.tablet || 0, percent: getPercent(devices.tablet || 0) },
      total,
    };
  }, [trafficData]);

  if (loading && !trafficData) {
    return (
      <div id="traffic-stats-loading" className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-sm">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
        <p className="text-sm font-bold text-slate-800">Aggregating visitor telemetry...</p>
        <p className="text-xs text-slate-400 mt-1">Collecting page views, unique sessions, and referrer metrics.</p>
      </div>
    );
  }

  return (
    <div id="traffic-stats-container" className="space-y-6">
      {/* Header with Control Bar */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Telemetry
            </span>
            <span className="text-xs text-slate-400 font-medium">Auto-refreshes every 30s</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Website Traffic & Visitor Stats</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time daily visits, unique page views, landing pages, and referrer traffic channels.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Time Range Selector */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              id="traffic-filter-7d"
              onClick={() => setTimeRange('7d')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                timeRange === '7d' 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Last 7 Days
            </button>
            <button
              id="traffic-filter-14d"
              onClick={() => setTimeRange('14d')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                timeRange === '14d' 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Last 14 Days
            </button>
          </div>

          {/* Chart Type Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              id="traffic-chart-area"
              onClick={() => setChartType('area')}
              className={`px-2.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                chartType === 'area' 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Area Trend"
            >
              Trend
            </button>
            <button
              id="traffic-chart-bar"
              onClick={() => setChartType('bar')}
              className={`px-2.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                chartType === 'bar' 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Daily Bars"
            >
              Bars
            </button>
          </div>

          {/* Refresh Button */}
          <button
            id="traffic-refresh-btn"
            onClick={() => fetchTrafficStats()}
            disabled={refreshing}
            className="px-3.5 py-2 rounded-2xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Updating...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 font-semibold">
          {error}
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Page Views */}
        <div id="stat-total-views" className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-indigo-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Total Page Views</span>
            <div className="w-9 h-9 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 mt-2 tracking-tight">
            {(trafficData?.totalPageViews || 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium flex items-center gap-1">
            <span className="text-emerald-600 font-bold">All-Time</span> visits recorded
          </div>
        </div>

        {/* Unique Visitors */}
        <div id="stat-unique-visitors" className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Unique Visitors</span>
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 mt-2 tracking-tight">
            {(trafficData?.totalUniqueVisitors || 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">
            Distinct visitor device sessions
          </div>
        </div>

        {/* Today's Visits */}
        <div id="stat-today-views" className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-violet-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Today's Visits</span>
            <div className="w-9 h-9 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center border border-violet-100">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 mt-2 tracking-tight">
            {(trafficData?.todayPageViews || 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">
            Views logged past 24 hours
          </div>
        </div>

        {/* Today's Unique Visitors */}
        <div id="stat-today-uniques" className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-amber-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Today's Uniques</span>
            <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 mt-2 tracking-tight">
            {(trafficData?.todayUniqueVisitors || 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">
            Unique persons today
          </div>
        </div>

        {/* Avg Views per Visitor */}
        <div id="stat-avg-views" className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-cyan-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Avg Depth</span>
            <div className="w-9 h-9 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center border border-cyan-100">
              <Compass className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 mt-2 tracking-tight">
            {trafficData?.averageViewsPerVisitor || '1.0'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">
            Page views / unique visitor
          </div>
        </div>
      </div>

      {/* Main Chart: Daily Page Views vs Unique Visitors */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Daily Traffic Trend</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Aggregated daily page views versus unique visitor sessions over time.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-bold">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-indigo-600"></span>
              <span className="text-slate-700">Total Page Views</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
              <span className="text-slate-700">Unique Visitors</span>
            </div>
          </div>
        </div>

        {chartData.length === 0 || trafficData?.totalPageViews === 0 ? (
          <div className="py-16 text-center border border-dashed border-slate-200 rounded-2xl">
            <Globe className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">No visitor telemetry recorded yet</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              As users browse your catalog, search for pins, and explore collections, daily traffic will graph here automatically.
            </p>
          </div>
        ) : (
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'area' ? (
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="uniquesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(val) => val.slice(5)} 
                    stroke="#94a3b8" 
                    fontSize={11} 
                    tickLine={false} 
                  />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0f172a', 
                      borderColor: '#1e293b', 
                      borderRadius: '16px', 
                      color: '#fff',
                      fontSize: '12px',
                      padding: '10px 14px'
                    }}
                    labelStyle={{ color: '#94a3b8', fontWeight: 600, marginBottom: '4px' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="pageViews" 
                    name="Page Views" 
                    stroke="#4f46e5" 
                    strokeWidth={2.5} 
                    fillOpacity={1} 
                    fill="url(#viewsGradient)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="uniqueVisitors" 
                    name="Unique Visitors" 
                    stroke="#10b981" 
                    strokeWidth={2.5} 
                    fillOpacity={1} 
                    fill="url(#uniquesGradient)" 
                  />
                </AreaChart>
              ) : (
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(val) => val.slice(5)} 
                    stroke="#94a3b8" 
                    fontSize={11} 
                    tickLine={false} 
                  />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0f172a', 
                      borderColor: '#1e293b', 
                      borderRadius: '16px', 
                      color: '#fff',
                      fontSize: '12px',
                      padding: '10px 14px'
                    }}
                    labelStyle={{ color: '#94a3b8', fontWeight: 600, marginBottom: '4px' }}
                  />
                  <Bar dataKey="pageViews" name="Page Views" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="uniqueVisitors" name="Unique Visitors" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* 2-Column Analytics: Top Visited Pages + Devices & Referrers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Column 1: Top Visited Pages */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Globe className="w-4 h-4 text-indigo-600" />
                Top Visited Discovery Pages
              </h3>
              <span className="text-xs font-bold text-slate-400">By View Volume</span>
            </div>

            {!trafficData?.topPages || trafficData.topPages.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No page view logs recorded yet.
              </div>
            ) : (
              <div className="space-y-3">
                {trafficData.topPages.slice(0, 8).map((page, index) => (
                  <div key={page.path || index} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <span className="w-5 text-[11px] font-bold text-slate-400 text-right">{index + 1}.</span>
                        <code className="font-mono text-[11px] font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md truncate max-w-[280px]">
                          {page.path}
                        </code>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-extrabold text-slate-900">{page.views} views</span>
                        <span className="text-[10px] font-bold text-slate-400 w-10 text-right">
                          {page.percentage}%
                        </span>
                      </div>
                    </div>
                    {/* Visual Progress Bar */}
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden ml-7 max-w-[calc(100%-28px)]">
                      <div 
                        className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(100, Math.max(5, page.percentage))}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Includes root feed, product permalinks, categories, and boards.</span>
          </div>
        </div>

        {/* Column 2: Devices & Traffic Sources */}
        <div className="space-y-6">
          {/* Device Distribution Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-base font-extrabold text-slate-900 mb-4 flex items-center gap-2">
              <Monitor className="w-4 h-4 text-indigo-600" />
              Visitor Device Breakdown
            </h3>

            <div className="grid grid-cols-3 gap-3">
              {/* Desktop */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center mx-auto mb-2">
                  <Monitor className="w-4 h-4" />
                </div>
                <div className="text-lg font-black text-slate-900">{deviceTotals.desktop.percent}%</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Desktop</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{deviceTotals.desktop.count} views</div>
              </div>

              {/* Mobile */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-2">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div className="text-lg font-black text-slate-900">{deviceTotals.mobile.percent}%</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mobile</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{deviceTotals.mobile.count} views</div>
              </div>

              {/* Tablet */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-2">
                  <Tablet className="w-4 h-4" />
                </div>
                <div className="text-lg font-black text-slate-900">{deviceTotals.tablet.percent}%</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tablet</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{deviceTotals.tablet.count} views</div>
              </div>
            </div>
          </div>

          {/* Traffic Referrers Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-base font-extrabold text-slate-900 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              Traffic Inbound Referrers
            </h3>

            {!trafficData?.trafficByReferrer || Object.keys(trafficData.trafficByReferrer).length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                No external inbound referrers recorded.
              </div>
            ) : (
              <div className="space-y-2.5">
                {Object.entries(trafficData.trafficByReferrer)
                  .sort((a, b) => Number(b[1]) - Number(a[1]))
                  .map(([source, count]) => (
                    <div key={source} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0">
                      <span className="font-bold text-slate-700 truncate max-w-[240px]">{source}</span>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-slate-100 text-slate-800">
                        {count} visits
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Live Visitor Stream Log */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              Recent Live Visitor Activity
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Chronological log of the latest 50 page loads and discovery interactions.
            </p>
          </div>
          <span className="text-xs font-bold text-slate-500">
            {trafficData?.recentVisits?.length || 0} events
          </span>
        </div>

        {!trafficData?.recentVisits || trafficData.recentVisits.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-xs border border-dashed border-slate-200 rounded-2xl">
            No live visits recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-extrabold sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3">Visited Path</th>
                  <th className="py-2.5 px-3">Device</th>
                  <th className="py-2.5 px-3">Referrer</th>
                  <th className="py-2.5 px-3">Session Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {trafficData.recentVisits.map((event) => {
                  const dateObj = new Date(event.timestamp);
                  const timeFormatted = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                  const dateFormatted = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' });

                  return (
                    <tr key={event.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-600 font-medium">
                        <span className="font-bold text-slate-800">{timeFormatted}</span>
                        <span className="text-[10px] text-slate-400 block">{dateFormatted}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <code className="font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                          {event.path}
                        </code>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 capitalize">
                          {event.deviceType === 'mobile' ? (
                            <Smartphone className="w-3 h-3 text-emerald-600" />
                          ) : event.deviceType === 'tablet' ? (
                            <Tablet className="w-3 h-3 text-amber-600" />
                          ) : (
                            <Monitor className="w-3 h-3 text-indigo-600" />
                          )}
                          {event.deviceType}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 max-w-[180px] truncate text-slate-600">
                        {event.referrer || 'Direct'}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                          {event.visitorId.slice(0, 12)}...
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
