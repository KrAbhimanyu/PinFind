import React, { useState, useEffect } from 'react';
import { Product, PinterestBoardItem, PinterestSyncState } from '../types';
import { api } from '../services/api';
import { 
  Share2, ExternalLink, Check, RefreshCw, Plus, 
  FolderPlus, Sparkles, X, AlertCircle, ArrowUpRight,
  ShieldCheck, Lock, Globe
} from 'lucide-react';

interface PinterestSyncModalProps {
  product?: Product | null;
  products?: Product[];
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (message: string) => void;
  onProductUpdated?: (updatedProduct: Product) => void;
}

export const PinterestSyncModal: React.FC<PinterestSyncModalProps> = ({
  product,
  products = [],
  isOpen,
  onClose,
  onShowToast,
  onProductUpdated,
}) => {
  const isBulk = !product && products.length > 0;
  const targetProducts = product ? [product] : products;

  const [pinterestStatus, setPinterestStatus] = useState<PinterestSyncState | null>(null);
  const [boards, setBoards] = useState<PinterestBoardItem[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Single pin customization
  const [pinTitle, setPinTitle] = useState(product?.name || '');
  const [pinNote, setPinNote] = useState(product?.shortDescription || '');
  const [destinationUrl, setDestinationUrl] = useState(product?.affiliateLink || product?.productUrl || '');

  // Board creation form
  const [showCreateBoard, setShowCreateBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [newBoardDesc, setNewBoardDesc] = useState('');
  const [newBoardPrivacy, setNewBoardPrivacy] = useState<'PUBLIC' | 'SECRET'>('PUBLIC');
  const [isCreatingBoard, setIsCreatingBoard] = useState(false);

  // Export results
  const [exportResult, setExportResult] = useState<{
    pinId?: string;
    pinUrl?: string;
    exportedCount?: number;
    pins?: { id: string; url: string; name: string }[];
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadPinterestData();
      if (product) {
        setPinTitle(product.name);
        setPinNote(product.shortDescription || (product.detailedNotes || ''));
        setDestinationUrl(product.affiliateLink || product.productUrl || '');
      }
      setExportResult(null);
    }
  }, [isOpen, product]);

  const loadPinterestData = async () => {
    setIsLoading(true);
    try {
      const status = await api.getPinterestStatus();
      setPinterestStatus(status);
      if (status.isConnected) {
        const boardList = await api.getPinterestBoards();
        setBoards(boardList);
        if (boardList.length > 0) {
          const defaultBoard = boardList.find(b => b.id === status.defaultBoardId) || boardList[0];
          setSelectedBoardId(defaultBoard.id);
        }
      }
    } catch (e: any) {
      console.error('Pinterest status check failed:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectOAuth = async () => {
    setIsConnecting(true);
    try {
      const { url } = await api.getPinterestAuthUrl();
      
      // Setup message listener for OAuth popup callback
      const popupWidth = 600;
      const popupHeight = 720;
      const left = window.screenX + (window.outerWidth - popupWidth) / 2;
      const top = window.screenY + (window.outerHeight - popupHeight) / 2;
      
      const popup = window.open(
        url,
        'pinterest_oauth_flow',
        `width=${popupWidth},height=${popupHeight},left=${left},top=${top},scrollbars=yes`
      );

      const messageListener = async (event: MessageEvent) => {
        if (event.data?.type === 'PINTEREST_AUTH_SUCCESS') {
          window.removeEventListener('message', messageListener);
          if (popup && !popup.closed) popup.close();
          onShowToast('Connected to Pinterest successfully!');
          await loadPinterestData();
          setIsConnecting(false);
        } else if (event.data?.type === 'PINTEREST_AUTH_ERROR') {
          window.removeEventListener('message', messageListener);
          if (popup && !popup.closed) popup.close();
          onShowToast(`Pinterest connection error: ${event.data.error || 'Authorization failed'}`);
          setIsConnecting(false);
        }
      };

      window.addEventListener('message', messageListener);

      // Fallback timer to check if popup closed without postMessage
      const checkPopup = setInterval(async () => {
        if (!popup || popup.closed) {
          clearInterval(checkPopup);
          window.removeEventListener('message', messageListener);
          await loadPinterestData();
          setIsConnecting(false);
        }
      }, 2000);
    } catch (err: any) {
      onShowToast(`Failed to open Pinterest OAuth: ${err.message}`);
      setIsConnecting(false);
    }
  };

  const handleConnectDemo = async () => {
    setIsConnecting(true);
    try {
      const state = await api.connectPinterestDemo();
      setPinterestStatus(state);
      const boardList = await api.getPinterestBoards();
      setBoards(boardList);
      if (boardList.length > 0) {
        setSelectedBoardId(boardList[0].id);
      }
      onShowToast('Connected to Pinterest Account (@curator_studio)!');
    } catch (e: any) {
      onShowToast(`Connection failed: ${e.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleCreateNewBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBoardName.trim()) return;
    setIsCreatingBoard(true);
    try {
      const created = await api.createPinterestBoard(newBoardName.trim(), newBoardDesc.trim(), newBoardPrivacy);
      setBoards(prev => [created, ...prev]);
      setSelectedBoardId(created.id);
      setShowCreateBoard(false);
      setNewBoardName('');
      setNewBoardDesc('');
      onShowToast(`Board "${created.name}" created on Pinterest!`);
    } catch (err: any) {
      onShowToast(`Failed to create board: ${err.message}`);
    } finally {
      setIsCreatingBoard(false);
    }
  };

  const handleExecuteExport = async () => {
    if (!selectedBoardId) {
      onShowToast('Please select a destination Pinterest board');
      return;
    }

    setIsExporting(true);
    try {
      if (product) {
        const res = await api.exportProductToPinterest({
          productId: product.id,
          boardId: selectedBoardId,
          customTitle: pinTitle.trim() || undefined,
          customNote: pinNote.trim() || undefined,
        });

        setExportResult({
          pinId: res.pinId,
          pinUrl: res.pinUrl,
        });

        if (onProductUpdated && res.product) {
          onProductUpdated(res.product);
        }

        onShowToast(`Exported "${product.name}" to Pinterest board!`);
      } else if (isBulk) {
        const res = await api.bulkExportToPinterest({
          productIds: targetProducts.map(p => p.id),
          boardId: selectedBoardId,
        });

        setExportResult({
          exportedCount: res.exportedCount,
          pins: res.exportedPins,
        });

        onShowToast(`Bulk exported ${res.exportedCount} products to Pinterest board!`);
      }
    } catch (err: any) {
      onShowToast(`Pinterest export failed: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6 sm:p-8 space-y-6 relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-600 flex items-center justify-center text-white shadow-md shadow-rose-600/30">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345-.09.375-.291 1.199-.334 1.357-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <span>Pinterest Pin Exporter</span>
                <span className="text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                  {isBulk ? `Bulk (${targetProducts.length} Items)` : 'Single Pin'}
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Sync product photos, metadata, and direct merchant links to Pinterest boards.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status / Connect Step */}
        {!pinterestStatus?.isConnected ? (
          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Share2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Connect Your Pinterest Account</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                Connect via Pinterest OAuth to automatically export product pins with verified direct store links directly to your boards.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleConnectOAuth}
                disabled={isConnecting}
                className="w-full sm:w-auto px-5 py-3 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center gap-2 shadow-md shadow-rose-600/20 cursor-pointer transition-all disabled:opacity-50"
              >
                {isConnecting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                <span>Authorize via Pinterest OAuth</span>
              </button>

              <button
                type="button"
                onClick={handleConnectDemo}
                disabled={isConnecting}
                className="w-full sm:w-auto px-5 py-3 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Instant Demo Connect</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Connected Account Bar */}
            <div className="bg-slate-900 text-white rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-600 flex items-center justify-center font-black text-sm">
                  {pinterestStatus.profile?.username ? pinterestStatus.profile.username.charAt(0).toUpperCase() : 'P'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm">@{pinterestStatus.profile?.username || 'pinterest_curator'}</span>
                    <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                      Connected
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {boards.length} Boards available • {pinterestStatus.totalPinsExported || 0} Pins Exported
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadPinterestData}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-slate-200 flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh Boards</span>
                </button>
              </div>
            </div>

            {/* Board Selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                  Select Pinterest Board *
                </label>
                <button
                  type="button"
                  onClick={() => setShowCreateBoard(!showCreateBoard)}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create New Board</span>
                </button>
              </div>

              {/* New Board Inline Form */}
              {showCreateBoard && (
                <form onSubmit={handleCreateNewBoard} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 animate-in fade-in">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <FolderPlus className="w-4 h-4 text-rose-600" />
                    New Pinterest Board
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Board Name (e.g. Modern Home Finds)"
                      value={newBoardName}
                      onChange={e => setNewBoardName(e.target.value)}
                      required
                      className="px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none"
                    />
                    <select
                      value={newBoardPrivacy}
                      onChange={(e: any) => setNewBoardPrivacy(e.target.value)}
                      className="px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 font-bold focus:outline-none"
                    >
                      <option value="PUBLIC">Public Board</option>
                      <option value="SECRET">Secret Board</option>
                    </select>
                  </div>
                  <input
                    type="text"
                    placeholder="Board Description (optional)"
                    value={newBoardDesc}
                    onChange={e => setNewBoardDesc(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCreateBoard(false)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isCreatingBoard || !newBoardName.trim()}
                      className="px-4 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer disabled:opacity-50"
                    >
                      {isCreatingBoard ? 'Creating...' : 'Save Board'}
                    </button>
                  </div>
                </form>
              )}

              <select
                value={selectedBoardId}
                onChange={e => setSelectedBoardId(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              >
                {boards.length === 0 ? (
                  <option value="">No boards found. Create a board above.</option>
                ) : (
                  boards.map(b => (
                    <option key={b.id} value={b.id}>
                      📌 {b.name} ({b.privacy || 'PUBLIC'}) {b.pinCount ? `• ${b.pinCount} pins` : ''}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Single Product Preview & Customization */}
            {product && (
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="sm:col-span-4 aspect-square rounded-xl overflow-hidden bg-slate-200">
                  <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                </div>
                <div className="sm:col-span-8 space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Pin Title</label>
                    <input
                      type="text"
                      value={pinTitle}
                      onChange={e => setPinTitle(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Pin Note / Description</label>
                    <textarea
                      rows={2}
                      value={pinNote}
                      onChange={e => setPinNote(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Destination URL (Direct Store Link)</label>
                    <input
                      type="url"
                      value={destinationUrl}
                      onChange={e => setDestinationUrl(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none font-mono text-[11px] text-slate-600"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Bulk Products Preview */}
            {isBulk && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">
                    {targetProducts.length} Products Queued for Pinterest Export:
                  </span>
                </div>
                <div className="flex gap-2 overflow-x-auto py-2">
                  {targetProducts.map(p => (
                    <div key={p.id} className="w-16 flex-shrink-0 text-center space-y-1">
                      <img src={p.imageUrl} alt={p.name} className="w-16 h-16 rounded-xl object-cover border border-slate-200" />
                      <span className="text-[10px] text-slate-700 font-bold truncate block">{p.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Success Result Box */}
            {exportResult && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-2 animate-in fade-in">
                <div className="flex items-center gap-2 font-black text-xs">
                  <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                  <span>Successfully exported to Pinterest!</span>
                </div>
                {exportResult.pinUrl && (
                  <div className="pt-1">
                    <a
                      href={exportResult.pinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                    >
                      <span>View Live Pin on Pinterest</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
                {exportResult.pins && (
                  <p className="text-xs text-emerald-800">
                    Exported {exportResult.pins.length} items directly to your board.
                  </p>
                )}
              </div>
            )}

            {/* Submit Export CTA */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Close
              </button>

              <button
                type="button"
                onClick={handleExecuteExport}
                disabled={isExporting || !selectedBoardId}
                className="px-6 py-3 rounded-2xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/25 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isExporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Syncing with Pinterest...</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4" />
                    <span>{isBulk ? `Export ${targetProducts.length} Pins to Pinterest` : 'Export Pin to Pinterest'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
