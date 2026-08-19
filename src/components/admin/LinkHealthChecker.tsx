import React, { useEffect, useState } from 'react';
import { LinkHealthReport, LinkHealthItem } from '../../types';
import { api } from '../../services/api';
import { 
  Activity, CheckCircle2, AlertTriangle, XCircle, RefreshCw, 
  ExternalLink, Wrench, ShieldCheck, Search, Filter 
} from 'lucide-react';

interface LinkHealthCheckerProps {
  onShowToast: (msg: string) => void;
}

export const LinkHealthChecker: React.FC<LinkHealthCheckerProps> = ({ onShowToast }) => {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<LinkHealthReport | null>(null);
  const [filter, setFilter] = useState<'all' | 'broken' | 'missing_tag' | 'redirect' | 'healthy'>('all');
  const [search, setSearch] = useState('');
  const [fixingId, setFixingId] = useState<string | null>(null);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const data = await api.checkLinkHealth();
      setReport(data);
      onShowToast(`Scanned ${data.totalLinks} links: ${data.healthyCount} healthy, ${data.missingTagCount} missing tags, ${data.brokenCount} broken.`);
    } catch (err: any) {
      onShowToast(err?.message || 'Failed to scan link health');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const handleFixLink = async (productId: string) => {
    setFixingId(productId);
    try {
      await api.fixAffiliateLink(productId);
      onShowToast('Affiliate tracking parameters auto-repaired successfully!');
      fetchReport();
    } catch (err: any) {
      onShowToast(err?.message || 'Failed to auto-fix link');
    } finally {
      setFixingId(null);
    }
  };

  const filteredItems = (report?.results || []).filter((item) => {
    if (filter !== 'all' && item.status !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      return (
        item.productName.toLowerCase().includes(q) ||
        item.retailer.toLowerCase().includes(q) ||
        item.affiliateLink.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div id="link-health-checker-widget" className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-6">
      {/* Top Header & Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center border border-rose-200">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              Affiliate Link Health & 404 Scanner
            </h3>
            <p className="text-xs text-slate-500">
              Audit outbound partner links, Amazon tag attribution, redirect chains, and missing affiliate parameters.
            </p>
          </div>
        </div>

        <button
          onClick={fetchReport}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Auditing Catalog...' : 'Run Full Link Scan'}</span>
        </button>
      </div>

      {/* Metrics Banner */}
      {report && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">Healthy Links</span>
              <p className="text-lg font-extrabold text-emerald-900">{report.healthyCount}</p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-amber-800 tracking-wider">Missing Tags</span>
              <p className="text-lg font-extrabold text-amber-900">{report.missingTagCount}</p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-indigo-800 tracking-wider">Shortlinks / 301</span>
              <p className="text-lg font-extrabold text-indigo-900">{report.redirectCount}</p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-100 text-rose-700">
              <XCircle className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-rose-800 tracking-wider">Broken / Dead</span>
              <p className="text-lg font-extrabold text-rose-900">{report.brokenCount}</p>
            </div>
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {(['all', 'missing_tag', 'broken', 'redirect', 'healthy'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-colors cursor-pointer ${
                filter === tab
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search product or URL..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-rose-500"
          />
        </div>
      </div>

      {/* Table Results */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="p-3.5">Product & Retailer</th>
              <th className="p-3.5">Status</th>
              <th className="p-3.5">Audit Diagnostics</th>
              <th className="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-slate-400">
                  No links matching current filter.
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <tr key={item.productId} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3.5">
                    <span className="font-bold text-slate-900 block truncate max-w-xs">{item.productName}</span>
                    <span className="text-[11px] text-slate-400">{item.retailer}</span>
                  </td>

                  <td className="p-3.5">
                    {item.status === 'healthy' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        <CheckCircle2 className="w-3 h-3" /> Healthy
                      </span>
                    )}
                    {item.status === 'missing_tag' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                        <AlertTriangle className="w-3 h-3" /> Missing Tag
                      </span>
                    )}
                    {item.status === 'redirect' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                        <ShieldCheck className="w-3 h-3" /> Shortlink
                      </span>
                    )}
                    {item.status === 'broken' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
                        <XCircle className="w-3 h-3" /> Broken / Dead
                      </span>
                    )}
                  </td>

                  <td className="p-3.5">
                    <p className="text-slate-700 font-medium">{item.message}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 font-mono truncate max-w-sm">
                      {item.affiliateLink || 'No link assigned'}
                    </p>
                  </td>

                  <td className="p-3.5 text-right space-x-2">
                    {item.status === 'missing_tag' && (
                      <button
                        onClick={() => handleFixLink(item.productId)}
                        disabled={fixingId === item.productId}
                        className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] transition-colors cursor-pointer inline-flex items-center gap-1"
                      >
                        <Wrench className="w-3 h-3" />
                        <span>Auto-Fix Tag</span>
                      </button>
                    )}

                    {item.affiliateLink && (
                      <a
                        href={item.affiliateLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg inline-block transition-colors"
                        title="Test Outbound URL"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
