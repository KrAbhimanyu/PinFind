import React from 'react';
import { Product, Board, ClickEvent } from '../types';
import { ProductCard } from './ProductCard';
import { SkeletonMasonry } from './SkeletonMasonry';
import { RefreshCw, SearchX, Plus, ShoppingBag } from 'lucide-react';

interface MasonryGridProps {
  products: Product[];
  totalCatalogCount?: number;
  boards: Board[];
  clicks?: ClickEvent[];
  savedProductIds: string[];
  isLoading?: boolean;
  isAdmin?: boolean;
  onOpenDetail: (product: Product) => void;
  onTrackClick: (product: Product, location: 'card_quick_button' | 'card_hover_button') => void;
  onToggleSave: (productId: string) => void;
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
  isLoading = false,
  isAdmin = false,
  onOpenDetail,
  onTrackClick,
  onToggleSave,
  onSaveToBoard,
  onCreateAndSaveBoard,
  onResetFilters,
  onNavigateToAdmin,
  onShowToast,
}) => {
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
    <div id="pinterest-masonry-container" className="w-full animate-in fade-in duration-200">
      {/* Dynamic Multi-column Pinterest Waterfall */}
      <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-4 xl:columns-5 2xl:columns-6 3xl:columns-7 gap-4 lg:gap-5">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            boards={boards}
            clicks={clicks}
            isSaved={savedProductIds.includes(product.id)}
            onOpenDetail={onOpenDetail}
            onTrackClick={onTrackClick}
            onToggleSave={onToggleSave}
            onSaveToBoard={onSaveToBoard}
            onCreateAndSaveBoard={onCreateAndSaveBoard}
            onShowToast={onShowToast}
          />
        ))}
      </div>
    </div>
  );
};
