import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Product, Board, ClickEvent } from '../types';
import { 
  X, ExternalLink, Bookmark, Share2, Check, Sparkles, 
  TrendingUp, ShieldCheck, Tag, Heart, ArrowUpRight, 
  ChevronLeft, ChevronRight, Copy, Flame, Zap, Scan, Bell, BellRing, Code,
  CreditCard, ChevronDown, ChevronUp, Clock, TrendingDown, Info
} from 'lucide-react';
import { SaveToBoardDropdown } from './SaveToBoardDropdown';
import { SharePopover } from './SharePopover';
import { calculateProductSpike } from '../services/storage';
import { formatPrice } from '../utils/formatters';
import { formatOfferHeadline } from '../utils/offerEngine';
import confetti from 'canvas-confetti';

interface ProductDetailModalProps {
  product: Product;
  allProducts: Product[];
  currentProductList?: Product[];
  boards: Board[];
  clicks?: ClickEvent[];
  isSaved: boolean;
  isWatchlisted?: boolean;
  onClose: () => void;
  onSelectProduct: (product: Product) => void;
  onTrackClick: (product: Product, location: 'detail_primary_btn' | 'related_pin_btn') => void;
  onToggleSave: (productId: string) => void;
  onToggleWatchlist?: (product: Product) => void;
  onFindSimilar?: (product: Product) => void;
  onOpenEmbed?: (product: Product) => void;
  onSaveToBoard: (boardId: string, productId: string) => void;
  onCreateAndSaveBoard: (boardName: string, productId: string) => void;
  onSelectTag: (tag: string) => void;
  onSelectCategory: (category: string) => void;
  onShowToast: (message: string) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  allProducts,
  currentProductList = allProducts,
  boards,
  clicks = [],
  isSaved,
  isWatchlisted = false,
  onClose,
  onSelectProduct,
  onTrackClick,
  onToggleSave,
  onToggleWatchlist,
  onFindSimilar,
  onOpenEmbed,
  onSaveToBoard,
  onCreateAndSaveBoard,
  onSelectTag,
  onSelectCategory,
  onShowToast,
}) => {
  const [showBoardDropdown, setShowBoardDropdown] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showBankOffers, setShowBankOffers] = useState(true);

  // Compute 24-hour click spike indicator
  const { hasClickSpike, spikePercentage } = useMemo(() => {
    return calculateProductSpike(product, clicks);
  }, [product, clicks]);

  // Determine current position in the active browsing list
  const activeList = currentProductList.length > 0 ? currentProductList : allProducts;
  const currentIndex = activeList.findIndex(p => p.id === product.id);
  const totalCount = activeList.length;

  const handlePrevProduct = useCallback(() => {
    if (activeList.length <= 1) return;
    const prevIdx = currentIndex <= 0 ? activeList.length - 1 : currentIndex - 1;
    onSelectProduct(activeList[prevIdx]);
  }, [activeList, currentIndex, onSelectProduct]);

  const handleNextProduct = useCallback(() => {
    if (activeList.length <= 1) return;
    const nextIdx = currentIndex >= activeList.length - 1 ? 0 : currentIndex + 1;
    onSelectProduct(activeList[nextIdx]);
  }, [activeList, currentIndex, onSelectProduct]);

  // Keyboard navigation shortcuts: 'Esc' to close, 'Left' / 'Right' to navigate
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
        if (e.key === 'Escape') {
          target.blur();
        }
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevProduct();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextProduct();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, handlePrevProduct, handleNextProduct]);

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleVisitSite = () => {
    onTrackClick(product, 'detail_primary_btn');
    window.open(product.affiliateLink, '_blank', 'noopener,noreferrer');
  };

  const handleOpenShare = () => {
    // If native share is available and user is on mobile touch device, offer native share
    if (typeof navigator !== 'undefined' && navigator.share && window.innerWidth < 768) {
      navigator.share({
        title: `Discover ${product.name} on PinFind`,
        text: `Curated aesthetic find: ${product.name} - ${product.shortDescription}`,
        url: `${window.location.origin}${window.location.pathname}#p/${product.slug}`,
      }).then(() => {
        onShowToast('Shared successfully!');
      }).catch((err) => {
        if (err.name !== 'AbortError') {
          setShowShareModal(true);
        }
      });
    } else {
      setShowShareModal(true);
    }
  };

  const handleQuickSave = () => {
    onToggleSave(product.id);
    if (!isSaved) {
      try {
        confetti({
          particleCount: 30,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#e11d48', '#f59e0b', '#3b82f6']
        });
      } catch {
        // ignore
      }
    }
  };

  // Find similar pins from the same category (excluding current item)
  const similarCategoryPins = useMemo(() => {
    return allProducts
      .filter(p => p.id !== product.id && p.category.toLowerCase() === product.category.toLowerCase() && p.status === 'PUBLISHED')
      .slice(0, 8);
  }, [allProducts, product.id, product.category]);

  const handleShareTwitter = () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}#p/${product.slug}`;
    const shareText = `Discover ${product.name} on PinFind - Curated in ${product.category}`;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
      '_blank',
      'noopener,noreferrer,width=600,height=500'
    );
  };

  const handleSharePinterest = () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}#p/${product.slug}`;
    const shareText = `Curated Find: ${product.name} - ${product.shortDescription}`;
    window.open(
      `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(shareUrl)}&media=${encodeURIComponent(product.imageUrl)}&description=${encodeURIComponent(shareText)}`,
      '_blank',
      'noopener,noreferrer,width=750,height=600'
    );
  };

  const handleCopyDirectLink = async () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}#p/${product.slug}`;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = shareUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      onShowToast('Direct product URL copied to clipboard!');
    } catch {
      onShowToast('Failed to copy link. Please open Share dialog.');
    }
  };

  return (
    <>
      <div 
        id="product-detail-modal-backdrop"
        className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-sm flex justify-center p-2 sm:p-4 md:p-6"
        onClick={onClose}
      >
        {/* Floating Left / Right Slideshow Navigation Buttons (Desktop) */}
        {activeList.length > 1 && (
          <>
            <button
              id="slideshow-prev-floating-btn"
              onClick={(e) => {
                e.stopPropagation();
                handlePrevProduct();
              }}
              title="Previous Discovery (← Left Arrow)"
              className="hidden lg:flex fixed left-4 top-1/2 -translate-y-1/2 z-55 w-12 h-12 rounded-full bg-white/90 hover:bg-white text-slate-800 shadow-xl items-center justify-center border border-slate-200/80 transition-all hover:scale-110 cursor-pointer group"
            >
              <ChevronLeft className="w-6 h-6 group-hover:-translate-x-0.5 transition-transform" />
            </button>

            <button
              id="slideshow-next-floating-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleNextProduct();
              }}
              title="Next Discovery (→ Right Arrow)"
              className="hidden lg:flex fixed right-4 top-1/2 -translate-y-1/2 z-55 w-12 h-12 rounded-full bg-white/90 hover:bg-white text-slate-800 shadow-xl items-center justify-center border border-slate-200/80 transition-all hover:scale-110 cursor-pointer group"
            >
              <ChevronRight className="w-6 h-6 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </>
        )}

        <div
          id="product-detail-container"
          className="relative w-full max-w-5xl 2xl:max-w-6xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Sticky Header Controls with Slideshow indicator & Shortcut hints */}
          <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md px-4 sm:px-6 py-3 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                id="detail-back-btn"
                onClick={onClose}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                title="Close (Esc)"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Slideshow Progress & Navigation */}
              {activeList.length > 1 && (
                <div className="flex items-center gap-1.5 bg-slate-100/80 px-2.5 py-1 rounded-full border border-slate-200/60 text-xs">
                  <button
                    onClick={handlePrevProduct}
                    className="p-0.5 rounded-full hover:bg-white text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                    title="Previous find (←)"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-bold text-slate-700 text-[11px] px-1 whitespace-nowrap">
                    {currentIndex + 1} / {totalCount}
                  </span>
                  <button
                    onClick={handleNextProduct}
                    className="p-0.5 rounded-full hover:bg-white text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                    title="Next find (→)"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Keyboard Shortcuts Hint Badge (Desktop) */}
              <div className="hidden md:flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
                <span className="px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200">←</span>
                <span className="px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200">→</span>
                <span>to browse</span>
                <span className="text-slate-300">•</span>
                <span className="px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200">Esc</span>
                <span>close</span>
              </div>
            </div>

            {/* Top Right Action Buttons: Lens, Watchlist, Embed, Share & Save */}
            <div className="flex items-center gap-1.5 sm:gap-2 relative">
              {/* AI Lens: Find Similar */}
              {onFindSimilar && (
                <button
                  id="detail-lens-btn"
                  onClick={() => onFindSimilar(product)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                  title="Find Similar Aesthetics (AI Lens)"
                >
                  <Scan className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Find Similar</span>
                </button>
              )}

              {/* Price Drop Alert */}
              {onToggleWatchlist && (
                <button
                  id="detail-watchlist-btn"
                  onClick={() => onToggleWatchlist(product)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                    isWatchlisted
                      ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                      : 'bg-slate-100 text-slate-700 hover:bg-amber-50 hover:text-amber-700'
                  }`}
                  title="Track Price Drop Alerts"
                >
                  {isWatchlisted ? <BellRing className="w-3.5 h-3.5 text-amber-600" /> : <Bell className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">{isWatchlisted ? 'Watching' : 'Price Alert'}</span>
                </button>
              )}

              {/* Embed Widget Snippet */}
              {onOpenEmbed && (
                <button
                  id="detail-embed-btn"
                  onClick={() => onOpenEmbed(product)}
                  className="p-2 rounded-full text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                  title="Embed Widget"
                >
                  <Code className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                id="detail-share-btn"
                onClick={handleOpenShare}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                title="Share this product"
              >
                <Share2 className="w-3.5 h-3.5 text-slate-600" />
                <span className="hidden sm:inline">Share</span>
              </button>

              <button
                id="detail-save-btn"
                onClick={handleQuickSave}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all shadow-xs cursor-pointer ${
                  isSaved
                    ? 'bg-rose-600 text-white hover:bg-rose-700'
                    : 'bg-slate-900 text-white hover:bg-slate-800'
                }`}
              >
                <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-white' : ''}`} />
                <span>{isSaved ? 'Saved' : 'Save Pin'}</span>
              </button>

              <button
                id="detail-save-dropdown-trigger"
                onClick={() => setShowBoardDropdown(!showBoardDropdown)}
                className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                title="Save to board"
              >
                ▼
              </button>

              {showBoardDropdown && (
                <SaveToBoardDropdown
                  productId={product.id}
                  boards={boards}
                  onSaveToBoard={onSaveToBoard}
                  onCreateAndSave={onCreateAndSaveBoard}
                  onClose={() => setShowBoardDropdown(false)}
                />
              )}
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="overflow-y-auto p-4 sm:p-6 md:p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-10">
              {/* Left Column: Visual Pin Presentation */}
              <div className="md:col-span-6 flex flex-col">
                <div className="relative rounded-3xl overflow-hidden bg-slate-100 border border-slate-200 shadow-inner group">
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-auto max-h-[580px] object-cover mx-auto transition-transform duration-500 group-hover:scale-102"
                  />
                  
                  {/* Visual badges */}
                  <div className="absolute top-4 left-4 flex flex-col gap-2">
                    {hasClickSpike && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 text-white shadow-lg border border-amber-300/40">
                        <Flame className="w-4 h-4 text-amber-200 fill-amber-200" /> +{spikePercentage}% 24h Click Spike
                      </span>
                    )}
                    {product.isTrending && !hasClickSpike && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-rose-600 text-white shadow-md">
                        <TrendingUp className="w-3.5 h-3.5" /> Trending Discovery
                      </span>
                    )}
                    {product.isStaffPick && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-slate-900 text-amber-300 shadow-md">
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Curated Pick
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Editorial Details & Direct Affiliate CTAs */}
              <div className="md:col-span-6 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  {/* Category & Retailer Row */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <button
                      onClick={() => {
                        onSelectCategory(product.category);
                        onClose();
                      }}
                      className="px-3.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-full text-xs font-bold uppercase tracking-wider text-slate-700 transition-colors cursor-pointer"
                    >
                      {product.category}
                    </button>

                    <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                      <span>Retailer:</span>
                      <span className="font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                        {product.retailer || 'Verified Merchant'}
                      </span>
                    </div>
                  </div>

                  {/* Title */}
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                    {product.name}
                  </h1>

                  {/* Pricing & Value Box */}
                  {product.price !== undefined && (
                    <div className="space-y-3">
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                        <div>
                          <span className="text-xs uppercase font-semibold text-slate-400 block mb-0.5">
                            {product.originalPrice && product.originalPrice > product.price ? 'Special Offer Price' : 'Selling Price'}
                          </span>
                          <div className="flex items-baseline gap-2.5">
                            <span className="text-3xl font-black text-slate-900">
                              {formatPrice(product.price, product.currency)}
                            </span>
                            {product.originalPrice && product.originalPrice > product.price && (
                              <>
                                <span className="text-sm font-medium text-slate-400 line-through">
                                  {formatPrice(product.originalPrice, product.currency)}
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-rose-600 text-white">
                                  {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[11px] font-semibold text-slate-500 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 block">
                            On {product.retailer || 'Merchant'}
                          </span>
                          {product.availability === 'OUT_OF_STOCK' && (
                            <span className="text-[10px] font-bold text-red-600 mt-1 block">
                              Currently Out of Stock
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Best Card Offer Highlight Banner */}
                      {product.bestOffer && (
                        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent border border-emerald-500/30 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <span className="p-2 rounded-xl bg-emerald-600 text-white shrink-0">
                              <CreditCard className="w-4 h-4" />
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-emerald-950">
                                  Best Offer: {product.bestOffer.bank} ({product.bestOffer.cardType})
                                </span>
                                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-emerald-600 text-white">
                                  Save {formatPrice(product.bestOffer.discountAmount, product.currency)}
                                </span>
                              </div>
                              <p className="text-[11px] font-medium text-emerald-900 mt-0.5">
                                {product.bestOffer.discountText}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-[10px] uppercase font-bold text-emerald-700 block">Effective Price</span>
                            <span className="text-base font-black text-emerald-950">
                              {formatPrice(product.bestOffer.effectivePrice, product.currency)}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Expandable Bank Offers Accordion */}
                      {product.offers && product.offers.length > 0 && (
                        <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
                          <button
                            type="button"
                            onClick={() => setShowBankOffers(!showBankOffers)}
                            className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100/80 flex items-center justify-between text-xs font-bold text-slate-800 transition-colors"
                          >
                            <span className="flex items-center gap-2">
                              <CreditCard className="w-4 h-4 text-emerald-600" />
                              <span>Verified Bank & Card Offers ({product.offers.length})</span>
                            </span>
                            {showBankOffers ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                          </button>

                          {showBankOffers && (
                            <div className="p-3 divide-y divide-slate-100 max-h-56 overflow-y-auto">
                              {product.offers.map((offer) => (
                                <div key={offer.id} className="py-2.5 first:pt-0 last:pb-0 text-xs space-y-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-slate-900">{offer.bank}</span>
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                        {offer.cardType}
                                      </span>
                                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                        offer.discountType === 'CASHBACK' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                                      }`}>
                                        {offer.discountType === 'PERCENTAGE' && `${offer.discountPercentage}% OFF`}
                                        {offer.discountType === 'FLAT' && `Flat ${formatPrice(offer.flatDiscount || 0, product.currency)} OFF`}
                                        {offer.discountType === 'CASHBACK' && `Cashback: ${formatPrice(offer.cashback || offer.flatDiscount || 0, product.currency)}`}
                                        {offer.discountType === 'EMI_DISCOUNT' && `EMI Offer`}
                                      </span>
                                    </div>

                                    {offer.calculatedDiscount && offer.calculatedDiscount > 0 ? (
                                      <span className="font-bold text-emerald-700 text-xs">
                                        -{formatPrice(offer.calculatedDiscount, product.currency)}
                                      </span>
                                    ) : null}
                                  </div>

                                  <p className="text-slate-600 text-[11px] leading-relaxed">
                                    {offer.terms || formatOfferHeadline(offer, product.currency)}
                                  </p>

                                  <div className="flex items-center gap-3 text-[10px] text-slate-400">
                                    {offer.minimumTransaction && (
                                      <span>Min. Spend: {formatPrice(offer.minimumTransaction, product.currency)}</span>
                                    )}
                                    {offer.maximumDiscount && (
                                      <span>Max. Cap: {formatPrice(offer.maximumDiscount, product.currency)}</span>
                                    )}
                                    {offer.expiryDate && (
                                      <span>Expires: {new Date(offer.expiryDate).toLocaleDateString()}</span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Price History Points if available */}
                      {product.priceHistory && product.priceHistory.length > 1 && (
                        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs space-y-2">
                          <span className="font-bold text-slate-700 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            Recent Price History
                          </span>
                          <div className="flex items-center gap-2 overflow-x-auto py-1">
                            {product.priceHistory.slice(-5).map((pt, idx) => (
                              <div key={idx} className="px-2.5 py-1 rounded-xl bg-white border border-slate-200 shrink-0 text-center">
                                <span className="text-[10px] text-slate-400 block">{pt.formattedDate || new Date(pt.date).toLocaleDateString()}</span>
                                <span className="font-black text-slate-900 text-xs">{formatPrice(pt.price, product.currency)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Primary Outbound Affiliate CTA */}
                  <div className="space-y-2 pt-2">
                    <button
                      id="detail-main-visit-site-btn"
                      onClick={handleVisitSite}
                      className="w-full flex items-center justify-center gap-2.5 py-4 px-6 rounded-2xl text-base font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xl shadow-rose-600/20 transition-all duration-200 transform active:scale-[0.99] group cursor-pointer"
                    >
                      <span>Visit Site on {product.retailer || 'Merchant'}</span>
                      <ArrowUpRight className="w-5 h-5 stroke-[2.5] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </button>

                    {/* Social Share & Direct Link Bar */}
                    <div className="p-3 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                          <Share2 className="w-3.5 h-3.5 text-indigo-600" />
                          Share this Pin
                        </span>
                        <button
                          onClick={handleOpenShare}
                          className="text-[11px] font-bold text-slate-500 hover:text-slate-800 transition-colors"
                        >
                          All Share Options →
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <button
                          id="detail-copy-link-action-btn"
                          type="button"
                          onClick={handleCopyDirectLink}
                          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold transition-all shadow-xs cursor-pointer group"
                          title="Copy Direct Product URL"
                        >
                          <Copy className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-800" />
                          <span>Copy URL</span>
                        </button>

                        <button
                          id="detail-share-pinterest-btn"
                          type="button"
                          onClick={handleSharePinterest}
                          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#E60023] hover:bg-[#ad081b] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                          title="Share to Pinterest"
                        >
                          <span className="font-serif font-black text-xs">P</span>
                          <span>Pinterest</span>
                        </button>

                        <button
                          id="detail-share-twitter-btn"
                          type="button"
                          onClick={handleShareTwitter}
                          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                          title="Share to X / Twitter"
                        >
                          <span className="font-bold text-xs">𝕏</span>
                          <span>Twitter</span>
                        </button>
                      </div>
                    </div>

                    {/* Store Curation Disclosure Micro-Banner */}
                    <div className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 text-[11px] text-slate-500 leading-relaxed">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong className="font-semibold text-slate-700">Curated Store Link:</strong> Connects you directly to the verified merchant listing with live pricing and availability.
                      </span>
                    </div>
                  </div>

                  {/* Short & Detailed Description */}
                  <div className="space-y-3 pt-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">About this Find</h3>
                    <p className="text-slate-700 leading-relaxed text-sm md:text-base">
                      {product.shortDescription}
                    </p>

                    {product.detailedNotes && (
                      <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/60 text-slate-800 text-sm leading-relaxed space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-amber-900 text-xs uppercase tracking-wide">
                          <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Curator's Styling Notes
                        </div>
                        <p className="text-slate-700 text-xs sm:text-sm">
                          {product.detailedNotes}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Tags */}
                  {product.tags && product.tags.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Aesthetic Tags</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {product.tags.map(tag => (
                          <button
                            key={tag}
                            onClick={() => {
                              onSelectTag(tag);
                              onClose();
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                          >
                            <Tag className="w-3 h-3 text-slate-400" /> #{tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Engagement Stats Bar */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5">
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                      <strong className="text-slate-800">{product.clicksCount || 0}</strong> outbound clicks
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500/20" />
                      <strong className="text-slate-800">{product.savesCount || 0}</strong> saves
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Curated {new Date(product.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Similar Pins Section (Filtered by same category) */}
            <div id="similar-pins-section" className="pt-8 border-t border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-rose-600" />
                    Similar Pins in {product.category}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Discover more curated aesthetic finds from the <strong className="text-slate-700">{product.category}</strong> collection
                  </p>
                </div>
                <button
                  onClick={() => {
                    onSelectCategory(product.category);
                    onClose();
                  }}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>Explore all in {product.category}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {similarCategoryPins.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3.5">
                  {similarCategoryPins.map(sim => (
                    <div
                      key={sim.id}
                      onClick={() => onSelectProduct(sim)}
                      className="group cursor-pointer rounded-2xl bg-white border border-slate-200/90 p-2.5 hover:shadow-lg hover:border-slate-300 transition-all flex flex-col justify-between transform hover:-translate-y-0.5"
                    >
                      <div className="relative aspect-[4/5] rounded-xl overflow-hidden bg-slate-100 mb-2">
                        <img
                          src={sim.imageUrl}
                          alt={sim.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {sim.isTrending && (
                          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-600 text-white shadow-xs">
                            Trending
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                          {sim.retailer || product.category}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900 line-clamp-1 group-hover:text-rose-600 transition-colors">
                          {sim.name}
                        </h4>
                        <div className="mt-1 flex items-center justify-between text-xs">
                          {sim.price !== undefined && (
                            <span className="font-extrabold text-slate-900">
                              {formatPrice(sim.price, sim.currency)}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400">
                            {sim.clicksCount || 0} clicks
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center bg-slate-50 rounded-2xl border border-slate-200/60 text-xs text-slate-400">
                  <span>No other items currently published in {product.category}.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Share Popover / Modal */}
      {showShareModal && (
        <SharePopover
          product={product}
          onClose={() => setShowShareModal(false)}
          onShowToast={onShowToast}
        />
      )}
    </>
  );
};
