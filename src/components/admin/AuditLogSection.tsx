import React, { useState, useMemo } from 'react';
import { AuditLog } from '../../types';
import { 
  Activity, Search, Filter, RefreshCw, Download, 
  PlusCircle, Trash2, Edit3, ToggleLeft, Layers, 
  Settings, ShieldAlert, CheckCircle2, ArrowUpDown, 
  Calendar, UserCheck, Sparkles, FileText, Check, Copy
} from 'lucide-react';

interface AuditLogSectionProps {
  logs: AuditLog[];
  onRefresh: () => void;
  onShowToast: (message: string) => void;
}

export const AuditLogSection: React.FC<AuditLogSectionProps> = ({
  logs,
  onRefresh,
  onShowToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Categorize log action types for badge styling & categorization
  const getActionCategory = (action: string): 'addition' | 'deletion' | 'status' | 'update' | 'bulk' | 'system' => {
    const act = action.toLowerCase();
    if (act.includes('created') || act.includes('added') || act.includes('duplicated')) return 'addition';
    if (act.includes('delete') || act.includes('removed')) return 'deletion';
    if (act.includes('status')) return 'status';
    if (act.includes('bulk')) return 'bulk';
    if (act.includes('updated') || act.includes('edit')) return 'update';
    return 'system';
  };

  // High-level statistics
  const stats = useMemo(() => {
    const total = logs.length;
    const additions = logs.filter(l => getActionCategory(l.action) === 'addition').length;
    const statusChanges = logs.filter(l => getActionCategory(l.action) === 'status').length;
    const deletions = logs.filter(l => getActionCategory(l.action) === 'deletion').length;
    const uniqueAdmins = new Set(logs.map(l => l.adminName || l.adminId)).size;

    return { total, additions, statusChanges, deletions, uniqueAdmins };
  }, [logs]);

  // Filter and Sort Logs
  const filteredLogs = useMemo(() => {
    let list = [...logs];

    // Filter by action category
    if (actionFilter !== 'ALL') {
      list = list.filter(l => {
        const cat = getActionCategory(l.action);
        if (actionFilter === 'ADDITIONS') return cat === 'addition';
        if (actionFilter === 'STATUS') return cat === 'status';
        if (actionFilter === 'DELETIONS') return cat === 'deletion';
        if (actionFilter === 'UPDATES') return cat === 'update';
        if (actionFilter === 'BULK') return cat === 'bulk';
        if (actionFilter === 'SYSTEM') return cat === 'system';
        return true;
      });
    }

    // Filter by text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(l =>
        l.action.toLowerCase().includes(q) ||
        l.targetEntity.toLowerCase().includes(q) ||
        l.adminName?.toLowerCase().includes(q) ||
        l.details?.toLowerCase().includes(q) ||
        l.targetId?.toLowerCase().includes(q)
      );
    }

    // Sort Order
    list.sort((a, b) => {
      const tA = new Date(a.timestamp).getTime();
      const tB = new Date(b.timestamp).getTime();
      return sortOrder === 'newest' ? tB - tA : tA - tB;
    });

    return list;
  }, [logs, actionFilter, searchQuery, sortOrder]);

  // Action badge UI generator
  const renderActionBadge = (action: string) => {
    const cat = getActionCategory(action);
    switch (cat) {
      case 'addition':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
            <PlusCircle className="w-3 h-3 text-emerald-600" />
            {action}
          </span>
        );
      case 'deletion':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
            <Trash2 className="w-3 h-3 text-rose-600" />
            {action}
          </span>
        );
      case 'status':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
            <ToggleLeft className="w-3 h-3 text-amber-600" />
            {action}
          </span>
        );
      case 'bulk':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200 shadow-2xs">
            <Layers className="w-3 h-3 text-purple-600" />
            {action}
          </span>
        );
      case 'update':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
            <Edit3 className="w-3 h-3 text-blue-600" />
            {action}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs">
            <Settings className="w-3 h-3 text-slate-500" />
            {action}
          </span>
        );
    }
  };

  // Format relative timestamp
  const formatRelativeTime = (isoString: string) => {
    try {
      const now = Date.now();
      const time = new Date(isoString).getTime();
      const diffSec = Math.floor((now - time) / 1000);

      if (diffSec < 60) return 'Just now';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
      if (diffSec < 172800) return 'Yesterday';
      return `${Math.floor(diffSec / 86400)}d ago`;
    } catch {
      return 'Recently';
    }
  };

  // Export Audit Log as CSV
  const handleExportCsv = () => {
    try {
      const headers = ['ID', 'Timestamp', 'Admin Name', 'Action', 'Target Entity', 'Target ID', 'Details'];
      const rows = filteredLogs.map(l => [
        `"${l.id}"`,
        `"${new Date(l.timestamp).toISOString()}"`,
        `"${(l.adminName || 'Admin').replace(/"/g, '""')}"`,
        `"${l.action.replace(/"/g, '""')}"`,
        `"${l.targetEntity.replace(/"/g, '""')}"`,
        `"${(l.targetId || '').replace(/"/g, '""')}"`,
        `"${(l.details || '').replace(/"/g, '""')}"`
      ]);

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `pinfind-audit-log-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      onShowToast('Exported audit log as CSV successfully!');
    } catch (e: any) {
      onShowToast(`Failed to export audit log: ${e.message}`);
    }
  };

  // Export Audit Log as JSON
  const handleExportJson = () => {
    try {
      const blob = new Blob([JSON.stringify(filteredLogs, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `pinfind-audit-log-${Date.now()}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      onShowToast('Exported audit log as JSON successfully!');
    } catch (e: any) {
      onShowToast(`Failed to export JSON: ${e.message}`);
    }
  };

  const copyLogDetails = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    onShowToast('Copied log details to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header & Overview */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shadow-2xs">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                Administrator Audit Trail & Activity Log
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Verifiable real-time record of all product additions, deletions, status transitions, and catalog modifications for complete administrative transparency.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={onRefresh}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Refresh log from server"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
            <button
              onClick={handleExportCsv}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Export as CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
            <button
              onClick={handleExportJson}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              title="Export as JSON"
            >
              <FileText className="w-3.5 h-3.5 text-rose-400" />
              <span>JSON Dump</span>
            </button>
          </div>
        </div>

        {/* High-Level Metric Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Total Logged</span>
            <div className="text-xl font-black text-slate-900 mt-1">{stats.total}</div>
            <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">Audit Records</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/70">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">Additions</span>
            <div className="text-xl font-black text-emerald-900 mt-1">{stats.additions}</div>
            <span className="text-[10px] text-emerald-700 font-medium mt-0.5 block">Pins Created</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/70">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700">Status Changes</span>
            <div className="text-xl font-black text-amber-900 mt-1">{stats.statusChanges}</div>
            <span className="text-[10px] text-amber-700 font-medium mt-0.5 block">Publish / Archive</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200/70">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-700">Deletions</span>
            <div className="text-xl font-black text-rose-900 mt-1">{stats.deletions}</div>
            <span className="text-[10px] text-rose-700 font-medium mt-0.5 block">Items Purged</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200/70 col-span-2 sm:col-span-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-700">Active Admins</span>
            <div className="text-xl font-black text-indigo-900 mt-1">{stats.uniqueAdmins}</div>
            <span className="text-[10px] text-indigo-700 font-medium mt-0.5 block">Authorized Actors</span>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="relative w-full md:w-80">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search actions, products, admins, details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 hover:text-slate-600"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto flex-wrap justify-between md:justify-end">
            <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200 text-xs">
              <Filter className="w-3 h-3 text-slate-400 ml-1.5" />
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 py-1 pr-2 pl-1 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Event Types</option>
                <option value="ADDITIONS">Product Additions & Duplicates</option>
                <option value="STATUS">Status Transitions</option>
                <option value="DELETIONS">Deletions & Purges</option>
                <option value="UPDATES">Product Modifications</option>
                <option value="BULK">Bulk Operations</option>
                <option value="SYSTEM">System & Settings</option>
              </select>
            </div>

            <button
              onClick={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1.5 cursor-pointer transition-colors"
              title={`Currently showing ${sortOrder} first. Click to toggle.`}
            >
              <ArrowUpDown className="w-3 h-3 text-slate-500" />
              <span>{sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Log Feed & Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <Activity className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">No audit log records match your filter</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              {searchQuery || actionFilter !== 'ALL'
                ? 'Try clearing your search query or selecting a different event category filter.'
                : 'Administrative actions such as product creations, deletions, and status toggles will be recorded here automatically.'}
            </p>
            {(searchQuery || actionFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setActionFilter('ALL');
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="p-4 pl-6">Action</th>
                  <th className="p-4">Target Entity</th>
                  <th className="p-4">Admin</th>
                  <th className="p-4">Details / Metadata</th>
                  <th className="p-4">Timestamp</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => {
                  const relativeTime = formatRelativeTime(log.timestamp);
                  const fullDate = new Date(log.timestamp).toLocaleString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  });

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors group">
                      {/* Action Badge */}
                      <td className="p-4 pl-6 whitespace-nowrap">
                        {renderActionBadge(log.action)}
                      </td>

                      {/* Target Entity */}
                      <td className="p-4">
                        <div className="font-bold text-slate-900 text-xs">
                          {log.targetEntity}
                        </div>
                        {log.targetId && (
                          <span className="font-mono text-[10px] text-slate-400 block mt-0.5">
                            ID: {log.targetId}
                          </span>
                        )}
                      </td>

                      {/* Admin User */}
                      <td className="p-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[10px] font-extrabold text-indigo-700">
                            {(log.adminName || 'A').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-xs text-slate-800 block leading-tight">
                              {log.adminName || 'Primary Administrator'}
                            </span>
                            <span className="text-[10px] text-slate-400 leading-tight">
                              Admin ID: {log.adminId}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Details & Diffs */}
                      <td className="p-4">
                        {log.details ? (
                          <div className="inline-block max-w-xs sm:max-w-sm lg:max-w-md bg-slate-50 border border-slate-200/80 rounded-lg px-2.5 py-1 text-[11px] font-mono text-slate-600 break-words">
                            {log.details}
                          </div>
                        ) : (
                          <span className="text-slate-300 font-mono text-[11px]">—</span>
                        )}
                      </td>

                      {/* Timestamp with relative hint */}
                      <td className="p-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs text-slate-800 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{relativeTime}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                          {fullDate}
                        </span>
                      </td>

                      {/* Quick Copy / Action */}
                      <td className="p-4 pr-6 text-right whitespace-nowrap">
                        <button
                          onClick={() => copyLogDetails(log.id, `[${fullDate}] ${log.action} - ${log.targetEntity} by ${log.adminName} (Details: ${log.details || 'None'})`)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Copy audit log line"
                        >
                          {copiedId === log.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer info bar */}
        <div className="bg-slate-50/80 border-t border-slate-200 p-4 px-6 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing <strong className="text-slate-800">{filteredLogs.length}</strong> of{' '}
            <strong className="text-slate-800">{logs.length}</strong> total logged actions
          </span>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Audit Logging Active</span>
          </div>
        </div>
      </div>
    </div>
  );
};
