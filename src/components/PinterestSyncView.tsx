import React, { useState, useEffect } from 'react';
import { Product, PinterestBoardItem, PinterestSyncState } from '../types';
import { api } from '../services/api';
import { formatPrice } from '../utils/formatters';
import { 
  Share2, ExternalLink, RefreshCw, Plus, FolderPlus, 
  Sparkles, Check, Copy, ArrowUpRight, ShieldCheck, 
  Sliders, Rss, Layers, CheckSquare, Square, Zap, Globe, AlertCircle, Trash2
} from 'lucide-react';
import { PinterestSyncModal } from './PinterestSyncModal';

interface PinterestSyncViewProps {
  products: Product[];
  onShowToast: (message: string) => void;
  onRefreshProducts: () => void;
}

export const PinterestSyncView: React.FC<PinterestSyncViewProps> = ({
  products,
  onShowToast,
  onRefreshProducts,
}) => {
  const [syncState, setSyncState] = useState<PinterestSyncState | null>(null);
  const [boards, setBoards] = useState<PinterestBoardItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [filterSync, setFilterSync] = useState<'ALL' | 'EXPORTED' | 'UNSYNCED'>('ALL');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  
  // Single export modal
  const [exportModalProduct, setExportModalProduct] = useState<Product | null>(null);
  const [showBulkExportModal, setShowBulkExportModal] = useState(false);

  // New Board Form
  const [showNewBoardForm, setShowNewBoardForm] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [newBoardDesc, setNewBoardDesc] = useState('');
  const [newBoardPrivacy, setNewBoardPrivacy] = useState<'PUBLIC' | 'SECRET'>('PUBLIC');
  const [isCreatingBoard, setIsCreatingBoard] = useState(false);

  // Copied feed link state
  const [copiedFeed, setCopiedFeed] = useState<string | null>(null);

  const loadPinterestStatus = async () => {
    setIsLoading(true);
    try {
      const state = await api.getPinterestStatus();
      setSyncState(state);
      if (state.isConnected) {
        const boardList = await api.getPinterestBoards();
        setBoards(boardList);
      }
    } catch (e: any) {
      console.error('Failed to load Pinterest status:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPinterestStatus();
  }, []);

  const handleConnectOAuth = async () => {
    setIsConnecting(true);
    try {
      const { url } = await api.getPinterestAuthUrl();
      const popupWidth = 600;
      const popupHeight = 720;
      const left = window.screenX + (window.outerWidth - popupWidth) / 2;
      const top = window.screenY + (window.outerHeight - popupHeight) / 2;
      
      const popup = window.open(
        url,
        'pinterest_oauth_window',
        `width=${popupWidth},height=${popupHeight},left=${left},top=${top},scrollbars=yes`
      );

      const messageListener = async (event: MessageEvent) => {
        if (event.data?.type === 'PINTEREST_AUTH_SUCCESS') {
          window.removeEventListener('message', messageListener);
          if (popup && !popup.closed) popup.close();
          onShowToast('Connected to Pinterest successfully!');
          await loadPinterestStatus();
          setIsConnecting(false);
        } else if (event.data?.type === 'PINTEREST_AUTH_ERROR') {
          window.removeEventListener('message', messageListener);
          if (popup && !popup.closed) popup.close();
          onShowToast(`Pinterest connection error: ${event.data.error || 'Authorization failed'}`);
          setIsConnecting(false);
        }
      };

      window.addEventListener('message', messageListener);

      const timer = setInterval(async () => {
        if (!popup || popup.closed) {
          clearInterval(timer);
          window.removeEventListener('message', messageListener);
          await loadPinterestStatus();
          setIsConnecting(false);
        }
      }, 2000);
    } catch (err: any) {
      onShowToast(`OAuth initiation failed: ${err.message}`);
      setIsConnecting(false);
    }
  };

  const handleConnectDemo = async () => {
    setIsConnecting(true);
    try {
      const state = await api.connectPinterestDemo();
      setSyncState(state);
      const boardList = await api.getPinterestBoards();
      setBoards(boardList);
      onShowToast('Connected to Pinterest Account (@curator_studio)!');
    } catch (err: any) {
      onShowToast(`Failed to connect demo account: ${err.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Disconnect your Pinterest account? This will halt automatic pin sync.')) return;
    try {
      await api.disconnectPinterest();
      setSyncState({
        isConnected: false,
        profile: null,
        syncedBoards: [],
        autoSyncOnPublish: false,
      });
      setBoards([]);
      onShowToast('Pinterest account disconnected.');
    } catch (err: any) {
      onShowToast(`Failed to disconnect: ${err.message}`);
    }
  };

  const handleToggleAutoSync = async (enabled: boolean) => {
    try {
      const updated = await api.updatePinterestSettings({ autoSyncOnPublish: enabled });
      setSyncState(updated);
      onShowToast(enabled ? 'Auto-sync on product publish enabled!' : 'Auto-sync disabled.');
    } catch (err: any) {
      onShowToast(`Update failed: ${err.message}`);
    }
  };

  const handleSetDefaultBoard = async (boardId: string) => {
    try {
      const updated = await api.updatePinterestSettings({ defaultBoardId: boardId });
      setSyncState(updated);
      onShowToast('Default destination board updated!');
    } catch (err: any) {
      onShowToast(`Update failed: ${err.message}`);
    }
  };

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBoardName.trim()) return;
    setIsCreatingBoard(true);
    try {
      const created = await api.createPinterestBoard(newBoardName.trim(), newBoardDesc.trim(), newBoardPrivacy);
      setBoards(prev => [created, ...prev]);
      setShowNewBoardForm(false);
      setNewBoardName('');
      setNewBoardDesc('');
      onShowToast(`Board "${created.name}" created on Pinterest!`);
    } catch (err: any) {
      onShowToast(`Board creation failed: ${err.message}`);
    } finally {
      setIsCreatingBoard(false);
    }
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFeed(type);
    onShowToast(`Copied ${type} URL to clipboard!`);
    setTimeout(() => setCopiedFeed(null), 2500);
  };

  // Filtered products list for table
  const filteredProducts = products.filter(p => {
    if (filterSync === 'EXPORTED') return p.exportedToPinterest === true;
    if (filterSync === 'UNSYNCED') return !p.exportedToPinterest;
    return true;
  });

  const handleToggleSelect = (id: string) => {
    setSelectedProductIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedProductIds.length === filteredProducts.length) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(filteredProducts.map(p => p.id));
    }
  };

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const xmlFeedUrl = `${origin}/api/catalog/feed.xml`;
  const jsonFeedUrl = `${origin}/api/catalog/pinterest-feed.json`;

  const totalExported = products.filter(p => p.exportedToPinterest).length;
  const syncPercentage = products.length > 0 ? Math.round((totalExported / products.length) * 100) : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Pinterest Banner */}
      <div className="bg-gradient-to-r from-rose-900 via-rose-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-rose-600 text-white flex items-center gap-1.5 shadow-sm">
              <Share2 className="w-3.5 h-3.5" /> Pinterest Cloud Sync & Catalog Feed
            </span>
            <span className="text-xs text-rose-200/80 font-medium">Native OAuth 2.0 Integration</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
            Pinterest Board Sync & Multi-Platform Export
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Export curated product photography, styling descriptions, and direct merchant destination links to your Pinterest boards with real-time metadata syncing.
          </p>
        </div>

        {/* Quick Connection Controls */}
        <div className="relative z-10 flex flex-wrap items-center gap-3">
          {syncState?.isConnected ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadPinterestStatus}
                className="px-4 py-2.5 rounded-2xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/10 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Sync Status</span>
              </button>
              <button
                type="button"
                onClick={handleDisconnect}
                className="px-4 py-2.5 rounded-2xl text-xs font-bold bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-400/20 transition-all cursor-pointer"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={handleConnectOAuth}
                disabled={isConnecting}
                className="px-5 py-3 rounded-2xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/30 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isConnecting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                <span>Connect Pinterest Account</span>
              </button>
              <button
                type="button"
                onClick={handleConnectDemo}
                disabled={isConnecting}
                className="px-4 py-3 rounded-2xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/15 flex items-center gap-2 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Instant Demo Connect</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sync Metric Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Account Status</span>
            <ShieldCheck className={`w-4 h-4 ${syncState?.isConnected ? 'text-emerald-600' : 'text-slate-400'}`} />
          </div>
          <div className="text-2xl font-black text-slate-900 truncate">
            {syncState?.isConnected ? `@${syncState.profile?.username || 'pinfind_curator'}` : 'Not Linked'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {syncState?.isConnected ? 'Active OAuth 2.0 Token' : 'Click connect above to link'}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Pinterest User ID</span>
            <Share2 className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-lg font-mono font-bold text-slate-800 truncate">
            {syncState?.isConnected && syncState.profile?.id ? syncState.profile.id : 'pin_curator_demo'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>{syncState?.isConnected ? 'Authenticated Profile' : 'Demo Mode ID'}</span>
            {syncState?.profile?.id && (
              <button
                type="button"
                onClick={() => copyToClipboard(syncState.profile!.id, 'User ID')}
                className="text-[10px] font-bold text-rose-600 hover:text-rose-800 cursor-pointer"
              >
                Copy ID
              </button>
            )}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Destination Boards</span>
            <Layers className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{boards.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">
            {boards.find(b => b.id === syncState?.defaultBoardId)?.name || 'Default board active'}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Auto-Sync on Publish</span>
            <Zap className={`w-4 h-4 ${syncState?.autoSyncOnPublish ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`} />
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-lg font-black text-slate-900">
              {syncState?.autoSyncOnPublish ? 'Enabled' : 'Disabled'}
            </span>
            <button
              type="button"
              onClick={() => handleToggleAutoSync(!syncState?.autoSyncOnPublish)}
              className={`px-3 py-1 rounded-full text-xs font-extrabold cursor-pointer transition-colors ${
                syncState?.autoSyncOnPublish
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              {syncState?.autoSyncOnPublish ? 'Turn Off' : 'Turn On'}
            </button>
          </div>
        </div>
      </div>

      {/* Pinterest Account & User ID Overview Banner */}
      {syncState?.isConnected && syncState.profile && (
        <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <img
              src={syncState.profile.profile_image || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"}
              alt="Pinterest Avatar"
              className="w-14 h-14 rounded-2xl object-cover border-2 border-rose-500/50 shadow-md"
            />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">@{syncState.profile.username}</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-400/30 uppercase tracking-wider">
                  {syncState.profile.account_type || 'BUSINESS_CREATOR'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Active
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                <span>User ID: <strong className="font-mono text-slate-200">{syncState.profile.id}</strong></span>
                <span>•</span>
                <span>Website: <strong className="text-slate-200">{syncState.profile.website_url || 'https://pinfind.store'}</strong></span>
                <span>•</span>
                <span>Connected: <strong className="text-slate-200">{new Date(syncState.profile.connectedAt).toLocaleDateString()}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => copyToClipboard(syncState.profile!.id, 'Pinterest User ID')}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/10 flex items-center gap-1.5 cursor-pointer transition-all"
            >
              {copiedFeed === 'Pinterest User ID' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedFeed === 'Pinterest User ID' ? 'User ID Copied!' : 'Copy User ID'}</span>
            </button>
            <button
              type="button"
              onClick={() => copyToClipboard(syncState.profile!.username, 'Pinterest Username')}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm flex items-center gap-1.5 cursor-pointer transition-all"
            >
              {copiedFeed === 'Pinterest Username' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedFeed === 'Pinterest Username' ? 'Username Copied!' : 'Copy @Username'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Boards Management & RSS/XML Feed Endpoints Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Synced Boards Manager */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-rose-600" />
                Pinterest Boards ({boards.length})
              </h3>
              <p className="text-xs text-slate-400">
                Managed boards in your linked Pinterest account.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowNewBoardForm(!showNewBoardForm)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 flex items-center gap-1 cursor-pointer transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Board</span>
            </button>
          </div>

          {/* New Board Form */}
          {showNewBoardForm && (
            <form onSubmit={handleCreateBoard} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 animate-in fade-in">
              <h4 className="text-xs font-bold text-slate-900">Create New Board on Pinterest</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Board Name (e.g. Minimalist Decor)"
                  value={newBoardName}
                  onChange={e => setNewBoardName(e.target.value)}
                  required
                  className="px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none font-bold"
                />
                <select
                  value={newBoardPrivacy}
                  onChange={(e: any) => setNewBoardPrivacy(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 font-bold focus:outline-none"
                >
                  <option value="PUBLIC">Public</option>
                  <option value="SECRET">Secret</option>
                </select>
              </div>
              <input
                type="text"
                placeholder="Description (optional)"
                value={newBoardDesc}
                onChange={e => setNewBoardDesc(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewBoardForm(false)}
                  className="px-3 py-1 text-xs font-semibold text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingBoard || !newBoardName.trim()}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer disabled:opacity-50"
                >
                  {isCreatingBoard ? 'Creating...' : 'Create on Pinterest'}
                </button>
              </div>
            </form>
          )}

          {/* Boards List */}
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {boards.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-slate-200 rounded-2xl">
                <p className="text-xs text-slate-400">
                  {syncState?.isConnected
                    ? 'No boards created yet. Click "Create Board" above.'
                    : 'Connect your Pinterest account to view and manage boards.'}
                </p>
              </div>
            ) : (
              boards.map(b => {
                const isDefault = b.id === syncState?.defaultBoardId;
                return (
                  <div
                    key={b.id}
                    className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition-colors ${
                      isDefault ? 'bg-rose-50/50 border-rose-200' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 truncate">📌 {b.name}</span>
                        {isDefault && (
                          <span className="px-2 py-0.2 rounded-full text-[9px] font-extrabold bg-rose-600 text-white">
                            Default
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 font-medium">({b.privacy || 'PUBLIC'})</span>
                      </div>
                      {b.description && <p className="text-[11px] text-slate-500 truncate">{b.description}</p>}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!isDefault && (
                        <button
                          type="button"
                          onClick={() => handleSetDefaultBoard(b.id)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 cursor-pointer"
                        >
                          Set Default
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Pinterest Catalog & Ingestion Feeds */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Rss className="w-4 h-4 text-amber-600" />
              Live Catalog Data Feeds
            </h3>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Live Sync Active
            </span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Use these standardized feed endpoints in Pinterest Business Catalog Manager to automatically ingest your products into Pinterest's merchant shopping tab.
          </p>

          <div className="space-y-3 pt-1">
            {/* RSS / XML Feed */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">Pinterest RSS / XML Product Feed</span>
                <span className="text-[10px] text-slate-400 font-mono">XML 2.0</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={xmlFeedUrl}
                  className="w-full px-3 py-1.5 text-[11px] font-mono text-slate-600 bg-white border border-slate-200 rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(xmlFeedUrl, 'XML Feed')}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 flex items-center gap-1 cursor-pointer flex-shrink-0"
                >
                  {copiedFeed === 'XML Feed' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedFeed === 'XML Feed' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* JSON Feed */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">Pinterest JSON Merchant Catalog Feed</span>
                <span className="text-[10px] text-slate-400 font-mono">REST JSON</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={jsonFeedUrl}
                  className="w-full px-3 py-1.5 text-[11px] font-mono text-slate-600 bg-white border border-slate-200 rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(jsonFeedUrl, 'JSON Feed')}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 flex items-center gap-1 cursor-pointer flex-shrink-0"
                >
                  {copiedFeed === 'JSON Feed' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedFeed === 'JSON Feed' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Products Sync Table & Bulk Action Bar */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Share2 className="w-4 h-4 text-rose-600" />
              Catalog Products Pinterest Sync Status
            </h3>
            <p className="text-xs text-slate-400">
              Manage cross-platform synchronization for each individual pin in your catalog.
            </p>
          </div>

          {/* Sync Filter Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setFilterSync('ALL')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                filterSync === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({products.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterSync('EXPORTED')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                filterSync === 'EXPORTED' ? 'bg-white text-rose-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Exported ({totalExported})
            </button>
            <button
              type="button"
              onClick={() => setFilterSync('UNSYNCED')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                filterSync === 'UNSYNCED' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Unsynced ({products.length - totalExported})
            </button>
          </div>
        </div>

        {/* Bulk Action Bar */}
        {selectedProductIds.length > 0 && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-rose-600" />
              <span className="text-xs font-bold text-rose-950">
                {selectedProductIds.length} Products selected for Pinterest sync
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowBulkExportModal(true)}
                className="px-4 py-2 rounded-xl text-xs font-extrabold bg-rose-600 hover:bg-rose-700 text-white shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Export {selectedProductIds.length} Pins to Pinterest</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedProductIds([])}
                className="px-2 py-1 text-xs text-slate-500 hover:text-slate-800"
              >
                Deselect All
              </button>
            </div>
          </div>
        )}

        {/* Products Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-2xl">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="p-3.5 w-10 text-center">
                  <button onClick={handleSelectAll} className="cursor-pointer">
                    {selectedProductIds.length === filteredProducts.length && filteredProducts.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-rose-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </th>
                <th className="p-3.5">Product</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Store / Merchant</th>
                <th className="p-3.5">Pinterest Status</th>
                <th className="p-3.5">Live Pin Link</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((p) => {
                const isSelected = selectedProductIds.includes(p.id);
                return (
                  <tr
                    key={p.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isSelected ? 'bg-rose-50/30' : ''
                    }`}
                  >
                    <td className="p-3.5 text-center">
                      <button onClick={() => handleToggleSelect(p.id)} className="cursor-pointer">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-rose-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300" />
                        )}
                      </button>
                    </td>

                    {/* Image & Title */}
                    <td className="p-3.5">
                      <div className="flex items-center gap-3 min-w-[200px]">
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          className="w-10 h-10 rounded-lg object-cover bg-slate-100 flex-shrink-0"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 truncate max-w-[220px]">{p.name}</div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[200px]">
                            {formatPrice(p.price, p.currency)} • {p.retailer}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="p-3.5 whitespace-nowrap text-slate-700 font-medium">
                      {p.category}
                    </td>

                    {/* Retailer */}
                    <td className="p-3.5 whitespace-nowrap text-slate-600 font-medium">
                      {p.retailer}
                    </td>

                    {/* Sync Status Badge */}
                    <td className="p-3.5 whitespace-nowrap">
                      {p.exportedToPinterest ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                          <Check className="w-3 h-3 stroke-[3]" /> Synced to Board
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                          Not Synced
                        </span>
                      )}
                    </td>

                    {/* Live Pin Link */}
                    <td className="p-3.5 whitespace-nowrap">
                      {p.pinterestPinUrl ? (
                        <a
                          href={p.pinterestPinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:underline"
                        >
                          <span>View on Pinterest</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-[11px] text-slate-400">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="p-3.5 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setExportModalProduct(p)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          p.exportedToPinterest
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            : 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs'
                        }`}
                      >
                        {p.exportedToPinterest ? 'Re-sync Pin' : 'Export to Pinterest'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Single Pin Export Modal */}
      {exportModalProduct && (
        <PinterestSyncModal
          product={exportModalProduct}
          isOpen={true}
          onClose={() => setExportModalProduct(null)}
          onShowToast={onShowToast}
          onProductUpdated={() => {
            onRefreshProducts();
            loadPinterestStatus();
          }}
        />
      )}

      {/* Bulk Pins Export Modal */}
      {showBulkExportModal && (
        <PinterestSyncModal
          products={products.filter(p => selectedProductIds.includes(p.id))}
          isOpen={true}
          onClose={() => {
            setShowBulkExportModal(false);
            setSelectedProductIds([]);
          }}
          onShowToast={onShowToast}
          onProductUpdated={() => {
            onRefreshProducts();
            loadPinterestStatus();
          }}
        />
      )}
    </div>
  );
};
