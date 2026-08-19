import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Product, Board, ClickEvent } from '../types';
import { ExternalLink, Bookmark, Share2, Check, Sparkles, TrendingUp, TrendingDown, Heart, Zap, Flame, Tag, Scan, Bell, BellRing, Code, CreditCard } from 'lucide-react';
import { SaveToBoardDropdown } from './SaveToBoardDropdown';
import { SharePopover } from './SharePopover';
import { calculateProductSpike } from '../services/storage';
import { formatPrice } from '../utils/formatters';
import confetti from 'canvas-confetti';

interface ProductCardProps {
  product: Product;
  boards: Board[];
  clicks?: ClickEvent[];
  isSaved: boolean;
  isWatchlisted?: boolean;
  index?: number;
  onOpenDetail: (product: Product) => void;
  onTrackClick: (product: Product, location: 'card_quick_button' | 'card_hover_button') => void;
  onToggleSave: (productId: string) => void;
  onToggleWatchlist?: (product: Product, e: React.MouseEvent) => void;
  onFindSimilar?: (product: Product, e: React.MouseEvent) => void;
  onOpenEmbed?: (product: Product, e: React.MouseEvent) => void;
  onSaveToBoard: (boardId: string, productId: string) => void;
  onCreateAndSaveBoard: (boardName: string, productId: string) => void;
  onShowToast: (message: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  boards,
  clicks = [],
  isSaved,
  isWatchlisted = false,
  index,
  onOpenDetail,
  onTrackClick,
  onToggleSave,
  onToggleWatchlist,
  onFindSimilar,
  onOpenEmbed,
  onSaveToBoard,
  onCreateAndSaveBoard,
  onShowToast,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showBoardDropdown, setShowBoardDropdown] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);
  // Eager load the first 4 cards for instant above-the-fold render; lazy-observe everything else
  const [isInView, setIsInView] = useState<boolean>(() => typeof index === 'number' && index < 4);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // IntersectionObserver-based lazy loading
  useEffect(() => {
    if (isInView) return;

    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
      setIsInView(true);
      return;
    }

    const element = containerRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '250px 0px',
        threshold: 0.01,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [isInView]);

  // Compute 24-hour click spike indicator
  const { hasClickSpike, spikePercentage } = useMemo(() => {
    return calculateProductSpike(product, clicks);
  }, [product, clicks]);

  // Compute sale / price drop discount
  const isOnSale = Boolean(
    product.originalPrice &&
    product.price &&
    product.originalPrice > product.price
  );
  const discountPercent = isOnSale
    ? Math.round(((product.originalPrice! - product.price!) / product.originalPrice!) * 100)
    : 0;

  const handleVisitSite = (e: React.MouseEvent) => {
    e.stopPropagation();
    onTrackClick(product, 'card_quick_button');
    window.open(product.affiliateLink, '_blank', 'noopener,noreferrer');
  };

  const handleQuickSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleSave(product.id);
    if (!isSaved) {
      try {
        confetti({
          particleCount: 25,
          spread: 50,
          origin: { y: 0.8 },
          colors: ['#e11d48', '#fbbf24', '#ffffff']
        });
      } catch {
        // ignore
      }
    }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}${window.location.pathname}#p/${product.slug}`;

    if (typeof navigator !== 'undefined' && navigator.share && window.innerWidth < 768) {
      navigator.share({
        title: `Discover ${product.name} on PinFind`,
        text: `Curated aesthetic find: ${product.name}`,
        url,
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

  // Determine height aspect ratio styling
  const aspectClass = {
    tall: 'aspect-[3/4.6]',
    portrait: 'aspect-[3/4]',
    square: 'aspect-[1/1]',
    wide: 'aspect-[4/3]'
  }[product.aspectRatio || 'portrait'];

  return (
    <>
      <div
        id={`product-card-${product.id}`}
        tabIndex={0}
        role="button"
        data-pin-card="true"
        data-product-id={product.id}
        data-pin-index={index}
        aria-label={`${product.name}${product.retailer ? ` by ${product.retailer}` : ''}${product.price !== undefined ? `, ${formatPrice(product.price, product.currency)}` : ''}. Press Enter to view details.`}
        onClick={() => onOpenDetail(product)}
        onKeyDown={(e) => {
          if (e.target === e.currentTarget) {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onOpenDetail(product);
            } else if (e.key.toLowerCase() === 's') {
              e.preventDefault();
              handleQuickSave(e as any);
            }
          }
        }}
        className="group relative break-inside-avoid mb-6 cursor-pointer rounded-3xl bg-slate-50 border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col hover:-translate-y-1 focus:outline-none focus-visible:ring-4 focus-visible:ring-rose-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 focus-visible:shadow-2xl focus-visible:-translate-y-1"
      >
        {/* Image Container with IntersectionObserver and Hover Controls */}
        <div 
          ref={containerRef}
          className={`relative w-full ${aspectClass} overflow-hidden bg-slate-100/90`}
        >
          {/* Skeleton Shimmer while element is off-screen or image is actively decoding/loading */}
          {(!isInView || !imageLoaded) && !imageError && (
            <div className="absolute inset-0 bg-slate-200/60 animate-shimmer" />
          )}

          {/* Lazy-Loaded Image tag rendered only once in viewport proximity */}
          {isInView && !imageError && (
            <img
              src={product.imageUrl}
              alt={product.name}
              loading="lazy"
              decoding="async"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
              className={`w-full h-full object-cover transition-all duration-700 ease-out group-hover:scale-105 ${
                imageLoaded ? 'opacity-100' : 'opacity-0 scale-95'
              }`}
            />
          )}

          {/* Fallback Graphic if external image URL fails or is blocked */}
          {imageError && (
            <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-200 flex flex-col items-center justify-center p-4 text-center">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-500 border border-rose-200 flex items-center justify-center mb-2 shadow-2xs">
                <Tag className="w-5 h-5" />
              </div>
              <span className="font-bold text-xs text-slate-800 line-clamp-1">{product.name}</span>
              <span className="text-[10px] text-slate-400 mt-0.5">{product.retailer || 'Aesthetic Find'}</span>
            </div>
          )}

          {/* Gradient dark overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/10 to-slate-950/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />

          {/* Top Left Badges */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10 max-w-[80%]">
            {product.priceDrop && (
              <span 
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white shadow-md border border-emerald-400/40"
                title={`Price dropped by ${formatPrice(product.priceDrop.amount, product.currency)} (${product.priceDrop.percentage}%)`}
              >
                <TrendingDown className="w-3 h-3 text-white" /> -{formatPrice(product.priceDrop.amount, product.currency)}
              </span>
            )}
            {isOnSale && !product.priceDrop && (
              <span 
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white shadow-md border border-rose-400/40"
                title={`On Sale: ${discountPercent}% off original price`}
              >
                <Tag className="w-3 h-3 text-white" /> -{discountPercent}% OFF
              </span>
            )}
            {hasClickSpike && (
              <span 
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 text-white shadow-md border border-amber-300/40"
                title={`Trending Spike: +${spikePercentage}% outbound clicks in the last 24 hours`}
              >
                <Flame className="w-3 h-3 text-amber-200 fill-amber-200" /> +{spikePercentage}% Spike
              </span>
            )}
            {product.isTrending && !hasClickSpike && !isOnSale && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-white/95 text-rose-600 backdrop-blur-md shadow-xs border border-rose-100">
                <TrendingUp className="w-3 h-3 text-rose-500" /> Trending
              </span>
            )}
            {product.isStaffPick && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-slate-900/90 text-amber-300 backdrop-blur-md shadow-xs">
                <Sparkles className="w-3 h-3 text-amber-300" /> Curated
              </span>
            )}
          </div>

          {/* Top Right Save, Lens & Watchlist Controls */}
          <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
            {/* Visual Lens: Find Similar */}
            {onFindSimilar && (
              <button
                id={`lens-btn-${product.id}`}
                onClick={(e) => onFindSimilar(product, e)}
                title="Find Similar Aesthetics (AI Lens)"
                className="p-2 rounded-full bg-white/90 text-slate-700 hover:text-rose-600 hover:bg-white backdrop-blur-md transition-all duration-200 shadow-xs md:opacity-0 md:group-hover:opacity-100 cursor-pointer"
              >
                <Scan className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Price Watchlist Alert */}
            {onToggleWatchlist && (
              <button
                id={`watchlist-btn-${product.id}`}
                onClick={(e) => onToggleWatchlist(product, e)}
                title={isWatchlisted ? 'Watching Price Drop (Alert active)' : 'Notify on Price Drop (₹)'}
                className={`p-2 rounded-full backdrop-blur-md transition-all duration-200 shadow-xs cursor-pointer ${
                  isWatchlisted
                    ? 'bg-amber-500 text-white hover:bg-amber-600 scale-105 opacity-100'
                    : 'bg-white/90 text-slate-700 hover:text-amber-600 hover:bg-white md:opacity-0 md:group-hover:opacity-100'
                }`}
              >
                {isWatchlisted ? <BellRing className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
              </button>
            )}

            <button
              id={`save-btn-${product.id}`}
              onClick={handleQuickSave}
              title={isSaved ? "Remove from saved" : "Save Pin"}
              className={`p-2 rounded-full backdrop-blur-md transition-all duration-200 shadow-xs cursor-pointer ${
                isSaved
                  ? 'bg-rose-600 text-white hover:bg-rose-700 scale-105'
                  : 'bg-white/90 text-slate-700 hover:text-rose-600 hover:bg-white md:opacity-0 md:group-hover:opacity-100'
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-white' : ''}`} />
            </button>

            <button
              id={`boards-dropdown-trigger-${product.id}`}
              onClick={(e) => {
                e.stopPropagation();
                setShowBoardDropdown(!showBoardDropdown);
              }}
              title="Save to specific board"
              className="p-2 rounded-full bg-white/90 text-slate-700 hover:text-slate-950 hover:bg-white backdrop-blur-md transition-all duration-200 shadow-xs md:opacity-0 md:group-hover:opacity-100 cursor-pointer"
            >
              <span className="text-[10px] font-bold leading-none px-0.5">▼</span>
            </button>
          </div>

          {/* Board Selection Dropdown */}
          {showBoardDropdown && (
            <SaveToBoardDropdown
              productId={product.id}
              boards={boards}
              onSaveToBoard={onSaveToBoard}
              onCreateAndSave={onCreateAndSaveBoard}
              onClose={() => setShowBoardDropdown(false)}
            />
          )}

          {/* Bottom Floating Affiliate CTA Button inside Image */}
          <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between gap-2">
            {/* Direct "Visit Site →" Button */}
            <button
              id={`visit-site-card-btn-${product.id}`}
              onClick={handleVisitSite}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/30 backdrop-blur-md transition-all duration-200 transform active:scale-95 cursor-pointer"
            >
              <span>Visit Site</span>
              <ExternalLink className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>

            {/* Quick Share button */}
            <button
              id={`share-btn-${product.id}`}
              onClick={handleShare}
              title="Share Pin"
              className="p-2.5 rounded-xl bg-white/90 hover:bg-white text-slate-800 backdrop-blur-md shadow-xs transition-all duration-200 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Card Body Details */}
        <div className="p-4 flex flex-col justify-between flex-grow bg-slate-50">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase truncate">
                {product.retailer || 'Direct'}
              </span>
              {product.price !== undefined && (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {product.originalPrice && product.originalPrice > product.price && (
                    <span className="text-xs text-slate-400 line-through">
                      {formatPrice(product.originalPrice, product.currency)}
                    </span>
                  )}
                  <span className="text-xs font-black text-slate-900 bg-white px-2 py-0.5 rounded-lg border border-slate-200/80 shadow-2xs">
                    {formatPrice(product.price, product.currency)}
                  </span>
                </div>
              )}
            </div>

            <h3 className="font-bold text-slate-900 text-base leading-tight group-hover:text-rose-600 transition-colors">
              {product.name}
            </h3>

            <p className="mt-1.5 text-xs text-slate-500 line-clamp-2 leading-relaxed">
              {product.shortDescription}
            </p>

            {/* Best Verified Card Offer Badge */}
            {product.bestOffer && (
              <div 
                className="mt-2.5 px-2.5 py-1.5 rounded-xl bg-emerald-50/90 border border-emerald-200/80 flex items-center justify-between gap-1.5 text-[11px]"
                title={`Bank Offer: ${product.bestOffer.bank} - ${product.bestOffer.discountText}`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span className="font-bold text-emerald-950 truncate">
                    {product.bestOffer.bank} <span className="font-normal text-emerald-800 hidden sm:inline">({product.bestOffer.cardType})</span>
                  </span>
                </div>
                <span className="font-black text-emerald-950 shrink-0 bg-white px-1.5 py-0.5 rounded-md border border-emerald-200 text-[10px] shadow-2xs">
                  Eff. {formatPrice(product.bestOffer.effectivePrice, product.currency)}
                </span>
              </div>
            )}
          </div>

          {/* Card Footer Metrics & Category */}
          <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-400">
            <span className="px-2.5 py-0.5 bg-slate-200/60 rounded-md text-slate-600 font-semibold truncate max-w-[120px]">
              {product.category}
            </span>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1" title="Total clicks">
                <ExternalLink className="w-3 h-3 text-slate-400" /> {product.clicksCount || 0}
              </span>
              <span className="inline-flex items-center gap-1" title="Total saves">
                <Heart className="w-3 h-3 text-rose-400 fill-rose-400/30" /> {product.savesCount || 0}
              </span>
            </div>
          </div>
        </div>
      </div>

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
