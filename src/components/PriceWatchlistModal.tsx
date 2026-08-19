import React, { useState } from 'react';
import { Product, WatchlistProduct } from '../types';
import { formatPrice } from '../utils/formatters';
import { 
  Bell, BellRing, Trash2, ArrowUpRight, CheckCircle2, 
  TrendingDown, Mail, X, ShoppingBag, Sparkles, AlertCircle 
} from 'lucide-react';

interface PriceWatchlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  watchlist: WatchlistProduct[];
  onRemoveFromWatchlist: (productId: string) => void;
  onUpdateWatchlistTarget: (productId: string, targetPrice: number, email?: string) => void;
  onOpenProduct: (product: Product) => void;
  onShowToast: (msg: string) => void;
}

export const PriceWatchlistModal: React.FC<PriceWatchlistModalProps> = ({
  isOpen,
  onClose,
  products,
  watchlist,
  onRemoveFromWatchlist,
  onUpdateWatchlistTarget,
  onOpenProduct,
  onShowToast,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [targetInput, setTargetInput] = useState<string>('');
  const [emailInput, setEmailInput] = useState<string>('');

  if (!isOpen) return null;

  const watchlistItemsWithProducts = watchlist.map(w => {
    const product = products.find(p => p.id === w.productId);
    const currentPrice = product?.price || w.initialPrice || 0;
    const isDiscounted = Boolean(product?.originalPrice && product.price && product.originalPrice > product.price);
    const discountPercent = isDiscounted && product?.originalPrice && product?.price
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : 0;
    const hitTarget = Boolean(w.targetPrice && currentPrice <= w.targetPrice);

    return {
      watchlist: w,
      product,
      currentPrice,
      isDiscounted,
      discountPercent,
      hitTarget,
    };
  });

  const handleStartEdit = (w: WatchlistProduct) => {
    setEditingId(w.productId);
    setTargetInput(w.targetPrice ? String(w.targetPrice) : '');
    setEmailInput(w.notifyEmail || '');
  };

  const handleSaveTarget = (productId: string) => {
    const num = parseFloat(targetInput);
    if (!isNaN(num) && num > 0) {
      onUpdateWatchlistTarget(productId, num, emailInput.trim() || undefined);
      setEditingId(null);
      onShowToast(`Price alert target updated to ${formatPrice(num, 'INR')}!`);
    } else {
      setEditingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        id="price-watchlist-modal"
        className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-rose-50/50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center border border-rose-200 shadow-2xs">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                Price Drop Watchlist
                <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold">
                  {watchlist.length} {watchlist.length === 1 ? 'Pin' : 'Pins'}
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Track discounts and get notified when prices drop below your budget in ₹ (INR).
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {watchlistItemsWithProducts.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <Bell className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1">Your Price Watchlist is empty</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5">
                Click the bell icon on any product card or discovery modal to monitor price reductions and deal alerts.
              </p>
              <button
                onClick={onClose}
                className="px-5 py-2 rounded-full bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-all shadow-md shadow-rose-600/20 cursor-pointer"
              >
                Explore Aesthetic Pins
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {watchlistItemsWithProducts.map(({ watchlist: w, product, currentPrice, isDiscounted, discountPercent, hitTarget }) => (
                <div key={w.productId} className="py-3.5 flex items-center justify-between gap-4 group">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <img
                      src={product?.imageUrl || 'https://images.unsplash.com/photo-1593062096033-9a26b09da705?w=400'}
                      alt={product?.name || 'Product'}
                      className="w-14 h-14 rounded-xl object-cover flex-shrink-0 border border-slate-200"
                    />
                    <div className="min-w-0">
                      <h4 
                        onClick={() => product && onOpenProduct(product)}
                        className="text-xs font-bold text-slate-900 hover:text-rose-600 transition-colors cursor-pointer truncate max-w-xs md:max-w-md"
                      >
                        {product?.name || 'Curated Aesthetic Item'}
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        {product?.retailer || 'Official Retailer'} • Added {new Date(w.addedAt).toLocaleDateString()}
                      </p>
                      
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-extrabold text-slate-900">
                          {formatPrice(currentPrice, 'INR')}
                        </span>
                        {product?.originalPrice && product.originalPrice > currentPrice && (
                          <span className="text-[11px] text-slate-400 line-through">
                            {formatPrice(product.originalPrice, 'INR')}
                          </span>
                        )}
                        {discountPercent > 0 && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 text-[10px] font-bold">
                            <TrendingDown className="w-3 h-3" /> -{discountPercent}%
                          </span>
                        )}
                        {hitTarget && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3" /> Target Met!
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right side controls */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {editingId === w.productId ? (
                      <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold text-slate-500">₹</span>
                          <input
                            type="number"
                            value={targetInput}
                            onChange={(e) => setTargetInput(e.target.value)}
                            placeholder="Target ₹"
                            className="w-20 px-1.5 py-1 text-xs font-semibold bg-white border border-slate-300 rounded-lg focus:outline-rose-500"
                          />
                        </div>
                        <button
                          onClick={() => handleSaveTarget(w.productId)}
                          className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 cursor-pointer"
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <div className="text-right">
                        <button
                          onClick={() => handleStartEdit(w)}
                          className="text-[11px] font-semibold text-slate-500 hover:text-slate-900 underline block cursor-pointer"
                        >
                          Target: {w.targetPrice ? formatPrice(w.targetPrice, 'INR') : 'Set Target'}
                        </button>
                        {w.notifyEmail && (
                          <span className="text-[10px] text-slate-400 truncate max-w-[100px] block">
                            {w.notifyEmail}
                          </span>
                        )}
                      </div>
                    )}

                    <button
                      onClick={() => onRemoveFromWatchlist(w.productId)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Remove from watchlist"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Price tracking synchronizes across active sessions.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
