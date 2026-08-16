import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Product, Board, ClickEvent } from '../types';
import { 
  X, ExternalLink, Bookmark, Share2, Check, Sparkles, 
  TrendingUp, ShieldCheck, Tag, Heart, ArrowUpRight, 
  ChevronLeft, ChevronRight, Copy, Flame, Zap
} from 'lucide-react';
import { SaveToBoardDropdown } from './SaveToBoardDropdown';
import { SharePopover } from './SharePopover';
import { calculateProductSpike } from '../services/storage';
import confetti from 'canvas-confetti';

interface ProductDetailModalProps {
  product: Product;
  allProducts: Product[];
  currentProductList?: Product[];
  boards: Board[];
  clicks?: ClickEvent[];
  isSaved: boolean;
  onClose: () => void;
  onSelectProduct: (product: Product) => void;
  onTrackClick: (product: Product, location: 'detail_primary_btn' | 'related_pin_btn') => void;
  onToggleSave: (productId: string) => void;
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
  onClose,
  onSelectProduct,
  onTrackClick,
  onToggleSave,
  onSaveToBoard,
  onCreateAndSaveBoard,
  onSelectTag,
  onSelectCategory,
  onShowToast,
}) => {
  const [showBoardDropdown, setShowBoardDropdown] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

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

  // Find related products (same category or shared tags, excluding current)
  const relatedProducts = allProducts
    .filter(p => p.id !== product.id && (p.category === product.category || p.tags.some(t => product.tags.includes(t))))
    .slice(0, 6);

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

            {/* Top Right Action Buttons: Share & Save */}
            <div className="flex items-center gap-2 relative">
              <button
                id="detail-share-btn"
                onClick={handleOpenShare}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                title="Share this product"
              >
                <Share2 className="w-3.5 h-3.5 text-slate-600" />
                <span>Share</span>
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
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                      <div>
                        <span className="text-xs uppercase font-semibold text-slate-400 block mb-0.5">Estimated Price</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-black text-slate-900">
                            {product.currency || '$'}{product.price}
                          </span>
                          {product.originalPrice && product.originalPrice > product.price && (
                            <span className="text-sm font-medium text-slate-400 line-through">
                              {product.currency || '$'}{product.originalPrice}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-500 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200">
                        Prices may vary on {product.retailer}
                      </span>
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

            {/* Related Products / "More Like This" Section */}
            {relatedProducts.length > 0 && (
              <div className="pt-8 border-t border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">More Aesthetic Finds Like This</h2>
                    <p className="text-xs text-slate-500">Curated recommendations from {product.category}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  {relatedProducts.map(rel => (
                    <div
                      key={rel.id}
                      onClick={() => onSelectProduct(rel)}
                      className="group cursor-pointer rounded-2xl bg-slate-50 border border-slate-200/80 p-2 hover:shadow-md transition-all flex flex-col"
                    >
                      <div className="relative aspect-square rounded-xl overflow-hidden bg-slate-100 mb-2">
                        <img
                          src={rel.imageUrl}
                          alt={rel.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="flex-1 flex flex-col justify-between">
                        <h4 className="text-xs font-semibold text-slate-900 line-clamp-1 group-hover:text-rose-600 transition-colors">
                          {rel.name}
                        </h4>
                        <div className="mt-1 flex items-center justify-between text-[11px]">
                          <span className="text-slate-400 font-medium">{rel.retailer}</span>
                          {rel.price && <span className="font-bold text-slate-900">${rel.price}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
