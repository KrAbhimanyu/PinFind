import React, { useRef, useCallback } from 'react';
import { Product, Board, ClickEvent } from '../types';
import { ProductCard } from './ProductCard';
import { SkeletonMasonry } from './SkeletonMasonry';
import { RefreshCw, SearchX, Plus, ShoppingBag, Keyboard } from 'lucide-react';

interface MasonryGridProps {
  products: Product[];
  totalCatalogCount?: number;
  boards: Board[];
  clicks?: ClickEvent[];
  savedProductIds: string[];
  watchlistProductIds?: string[];
  isLoading?: boolean;
  isAdmin?: boolean;
  onOpenDetail: (product: Product) => void;
  onTrackClick: (product: Product, location: 'card_quick_button' | 'card_hover_button') => void;
  onToggleSave: (productId: string) => void;
  onToggleWatchlist?: (product: Product, e: React.MouseEvent) => void;
  onFindSimilar?: (product: Product, e: React.MouseEvent) => void;
  onOpenEmbed?: (product: Product, e: React.MouseEvent) => void;
  onSaveToBoard: (boardId: string, productId: string) => void;
  onCreateAndSaveBoard: (boardName: string, productId: string) => void;
  onResetFilters: () => void;
  onNavigateToAdmin?: () => void;
  onShowToast: (message: string) => void;
}

export const MasonryGrid: React.FC<MasonryGridProps> = ({
  products,
  totalCatalogCount = 0,
  boards,
  clicks = [],
  savedProductIds,
  watchlistProductIds = [],
  isLoading = false,
  isAdmin = false,
  onOpenDetail,
  onTrackClick,
  onToggleSave,
  onToggleWatchlist,
  onFindSimilar,
  onOpenEmbed,
  onSaveToBoard,
  onCreateAndSaveBoard,
  onResetFilters,
  onNavigateToAdmin,
  onShowToast,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Spatial Keyboard Navigation Handler for Pinterest Masonry Grid
  const handleGridKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const card = target.closest('[data-pin-card="true"]') as HTMLElement | null;
    if (!card) return;

    // Do not intercept if user is typing in form inputs, textareas, etc.
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

    const cards: HTMLElement[] = containerRef.current
      ? (Array.from(containerRef.current.querySelectorAll('[data-pin-card="true"]')) as HTMLElement[])
      : [];
    const currentIndex = cards.indexOf(card);
    if (currentIndex === -1) return;

    const currentRect = card.getBoundingClientRect();
    const currentCenterX = currentRect.left + currentRect.width / 2;
    const currentCenterY = currentRect.top + currentRect.height / 2;

    let targetCard: HTMLElement | null = null;

    switch (e.key) {
      case 'ArrowRight': {
        e.preventDefault();
        // Look for cards to the right
        let bestCard: HTMLElement | null = null;
        let minScore = Infinity;

        cards.forEach((c) => {
          if (c === card) return;
          const r = c.getBoundingClientRect();
          if (r.left >= currentRect.left + 20) {
            const dx = r.left - currentRect.right;
            const dy = Math.abs((r.top + r.height / 2) - currentCenterY);
            // Prioritize closest horizontally with similar vertical alignment
            const score = (dx >= 0 ? dx : 0) + dy * 1.8;
            if (score < minScore) {
              minScore = score;
              bestCard = c;
            }
          }
        });

        targetCard = bestCard || cards[(currentIndex + 1) % cards.length];
        break;
      }

      case 'ArrowLeft': {
        e.preventDefault();
        // Look for cards to the left
        let bestCard: HTMLElement | null = null;
        let minScore = Infinity;

        cards.forEach((c) => {
          if (c === card) return;
          const r = c.getBoundingClientRect();
          if (r.right <= currentRect.right - 20) {
            const dx = currentRect.left - r.right;
            const dy = Math.abs((r.top + r.height / 2) - currentCenterY);
            const score = (dx >= 0 ? dx : 0) + dy * 1.8;
            if (score < minScore) {
              minScore = score;
              bestCard = c;
            }
          }
        });

        targetCard = bestCard || cards[(currentIndex - 1 + cards.length) % cards.length];
        break;
      }

      case 'ArrowDown': {
        e.preventDefault();
        // Look for cards below
        let bestCard: HTMLElement | null = null;
        let minScore = Infinity;

        cards.forEach((c) => {
          if (c === card) return;
          const r = c.getBoundingClientRect();
          if (r.top >= currentRect.top + 20) {
            const dy = r.top - currentRect.bottom;
            const dx = Math.abs((r.left + r.width / 2) - currentCenterX);
            // Prioritize same visual column (low dx) and closest vertical step
            const score = (dy >= 0 ? dy : dy + 400) + dx * 3.0;
            if (score < minScore) {
              minScore = score;
              bestCard = c;
            }
          }
        });

        targetCard = bestCard || cards[Math.min(cards.length - 1, currentIndex + 1)];
        break;
      }

      case 'ArrowUp': {
        e.preventDefault();
        // Look for cards above
        let bestCard: HTMLElement | null = null;
        let minScore = Infinity;

        cards.forEach((c) => {
          if (c === card) return;
          const r = c.getBoundingClientRect();
          if (r.bottom <= currentRect.bottom - 20) {
            const dy = currentRect.top - r.bottom;
            const dx = Math.abs((r.left + r.width / 2) - currentCenterX);
            const score = (dy >= 0 ? dy : dy + 400) + dx * 3.0;
            if (score < minScore) {
              minScore = score;
              bestCard = c;
            }
          }
        });

        targetCard = bestCard || cards[Math.max(0, currentIndex - 1)];
        break;
      }

      case 'Home': {
        e.preventDefault();
        targetCard = cards[0] || null;
        break;
      }

      case 'End': {
        e.preventDefault();
        targetCard = cards[cards.length - 1] || null;
        break;
      }

      case 'Enter':
      case ' ': {
        // If the card itself is the active target (not an inner interactive control)
        if (target === card || !target.closest('button, a, input, select, textarea')) {
          e.preventDefault();
          const productId = card.getAttribute('data-product-id');
          const product = products.find(p => p.id === productId);
          if (product) {
            onOpenDetail(product);
          }
        }
        break;
      }

      default:
        break;
    }

    if (targetCard) {
      targetCard.focus();
      targetCard.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [products, onOpenDetail]);

  // If in loading state, show Pinterest skeleton loading waterfall
  if (isLoading) {
    return <SkeletonMasonry count={10} />;
  }

  if (products.length === 0) {
    const isCatalogEmpty = totalCatalogCount === 0;

    return (
      <div 
        id="empty-results-container"
        className="my-16 py-16 px-6 text-center max-w-md mx-auto rounded-3xl bg-slate-50 border border-dashed border-slate-300 animate-in fade-in duration-200"
      >
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-200 shadow-sm">
          {isCatalogEmpty ? <ShoppingBag className="w-8 h-8" /> : <SearchX className="w-8 h-8" />}
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">
          {isCatalogEmpty ? 'No products available yet.' : 'No matching discoveries found'}
        </h3>
        <p className="text-sm text-slate-500 mb-6">
          {isCatalogEmpty
            ? 'Discover aesthetic home decor, workspace gear, and curated items here once published.'
            : 'Try loosening your search keywords or switching category filters to discover more aesthetic pins.'}
        </p>
        
        {isCatalogEmpty && isAdmin && onNavigateToAdmin ? (
          <button
            id="add-pin-empty-btn"
            onClick={onNavigateToAdmin}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Product
          </button>
        ) : (
          !isCatalogEmpty && (
            <button
              id="reset-filters-empty-btn"
              onClick={onResetFilters}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold text-slate-900 bg-white border border-slate-300 hover:bg-slate-100 shadow-sm transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" /> Reset All Filters
            </button>
          )
        )}
      </div>
    );
  }

  return (
    <div 
      id="pinterest-masonry-container" 
      ref={containerRef}
      onKeyDown={handleGridKeyDown}
      tabIndex={-1}
      role="feed"
      aria-label="Aesthetic product discovery grid. Use arrow keys to navigate and Enter to open details."
      className="w-full animate-in fade-in duration-200 outline-none"
    >
      {/* Keyboard Accessibility Helper Bar */}
      <div className="flex items-center justify-between text-xs text-slate-400 mb-3 px-1">
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100/90 text-slate-700 font-mono text-[10px] border border-slate-200/70 shadow-2xs">
            <Keyboard className="w-3 h-3 text-slate-400" />
            <span className="font-sans font-bold">← ↑ ↓ →</span>
          </span>
          <span className="hidden xs:inline">Navigate pins</span>
          <span className="text-slate-300 hidden xs:inline">•</span>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100/90 text-slate-700 font-mono text-[10px] border border-slate-200/70 shadow-2xs">
            <span className="font-sans font-bold">Enter</span>
          </span>
          <span className="hidden xs:inline">Open detail</span>
        </div>
        <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
          {products.length} {products.length === 1 ? 'pin' : 'pins'}
        </span>
      </div>

      {/* Dynamic Multi-column Pinterest Waterfall */}
      <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-4 xl:columns-5 2xl:columns-6 3xl:columns-7 gap-4 lg:gap-5">
        {products.map((product, idx) => (
          <ProductCard
            key={product.id}
            index={idx}
            product={product}
            boards={boards}
            clicks={clicks}
            isSaved={savedProductIds.includes(product.id)}
            isWatchlisted={watchlistProductIds.includes(product.id)}
            onOpenDetail={onOpenDetail}
            onTrackClick={onTrackClick}
            onToggleSave={onToggleSave}
            onToggleWatchlist={onToggleWatchlist}
            onFindSimilar={onFindSimilar}
            onOpenEmbed={onOpenEmbed}
            onSaveToBoard={onSaveToBoard}
            onCreateAndSaveBoard={onCreateAndSaveBoard}
            onShowToast={onShowToast}
          />
        ))}
      </div>
    </div>
  );
};

