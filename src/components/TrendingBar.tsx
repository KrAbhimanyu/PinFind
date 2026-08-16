import React, { useState, useRef, useEffect } from 'react';
import { Product, FilterState, SortOption, PriceFilter } from '../types';
import { CATEGORIES, RETAILERS } from '../data/initialProducts';
import { 
  TrendingUp, Flame, SlidersHorizontal, ArrowUpDown, X, 
  Tag as TagIcon, Sparkles, DollarSign, Calendar, ChevronDown, 
  Check, ArrowDownAZ, ArrowUpAZ, Zap
} from 'lucide-react';

interface TrendingBarProps {
  products: Product[];
  filterState: FilterState;
  onUpdateFilter: (updates: Partial<FilterState>) => void;
  onOpenProduct: (product: Product) => void;
  onOpenDisclosure: () => void;
}

const CATEGORY_COLOR_STYLES: Record<string, { active: string; inactive: string }> = {
  'All Pins': {
    active: 'bg-slate-900 text-white shadow-sm',
    inactive: 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/60'
  },
  'Desk Setup': {
    active: 'bg-blue-600 text-white shadow-sm',
    inactive: 'bg-blue-50 text-blue-700 hover:bg-blue-100/80 border border-blue-200/60'
  },
  'Coffee & Kitchen': {
    active: 'bg-amber-600 text-white shadow-sm',
    inactive: 'bg-amber-50 text-amber-700 hover:bg-amber-100/80 border border-amber-200/60'
  },
  'Home Decor': {
    active: 'bg-emerald-600 text-white shadow-sm',
    inactive: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100/80 border border-emerald-200/60'
  },
  'Wellness & Skincare': {
    active: 'bg-rose-600 text-white shadow-sm',
    inactive: 'bg-rose-50 text-rose-700 hover:bg-rose-100/80 border border-rose-200/60'
  },
  'Stationery & Books': {
    active: 'bg-purple-600 text-white shadow-sm',
    inactive: 'bg-purple-50 text-purple-700 hover:bg-purple-100/80 border border-purple-200/60'
  },
  'Style & Apparel': {
    active: 'bg-indigo-600 text-white shadow-sm',
    inactive: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100/80 border border-indigo-200/60'
  },
};

const SORT_OPTIONS: { id: SortOption; label: string; group: 'Popularity' | 'Price' | 'Date'; icon: React.ReactNode; desc: string }[] = [
  { 
    id: 'trending', 
    label: 'Popularity: Trending Picks', 
    group: 'Popularity',
    icon: <Flame className="w-3.5 h-3.5 text-rose-500" />,
    desc: 'Highest CTR and trending engagements'
  },
  { 
    id: 'most-clicked', 
    label: 'Popularity: Most Clicked', 
    group: 'Popularity',
    icon: <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />,
    desc: 'Most outbound merchant visits'
  },
  { 
    id: 'most-saved', 
    label: 'Popularity: Most Saved', 
    group: 'Popularity',
    icon: <Sparkles className="w-3.5 h-3.5 text-amber-500" />,
    desc: 'Most saved to user aesthetic boards'
  },
  { 
    id: 'price-asc', 
    label: 'Price: Low to High', 
    group: 'Price',
    icon: <DollarSign className="w-3.5 h-3.5 text-blue-500" />,
    desc: 'Budget-friendly finds first'
  },
  { 
    id: 'price-desc', 
    label: 'Price: High to Low', 
    group: 'Price',
    icon: <DollarSign className="w-3.5 h-3.5 text-indigo-500" />,
    desc: 'Luxury and premium design gear first'
  },
  { 
    id: 'newest', 
    label: 'Date: Newest Drops', 
    group: 'Date',
    icon: <Calendar className="w-3.5 h-3.5 text-purple-500" />,
    desc: 'Recently added curated discoveries'
  },
];

export const TrendingBar: React.FC<TrendingBarProps> = ({
  products,
  filterState,
  onUpdateFilter,
  onOpenProduct,
  onOpenDisclosure,
}) => {
  const [quickSortOpen, setQuickSortOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const trendingProducts = products.filter(p => p.isTrending || (p.clicksCount || 0) > 300).slice(0, 8);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setQuickSortOpen(false);
      }
    };
    if (quickSortOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [quickSortOpen]);

  const currentSortItem = SORT_OPTIONS.find(s => s.id === filterState.sortBy) || SORT_OPTIONS[0];

  return (
    <div id="discovery-controls-section" className="space-y-4 mb-6">
      {/* Trending Picks Carousel Strip */}
      {trendingProducts.length > 0 && !filterState.search && !filterState.tag && filterState.category === 'All Pins' && (
        <div className="bg-gradient-to-r from-rose-500/10 via-amber-500/5 to-purple-500/10 rounded-2xl p-3 border border-rose-200/60">
          <div className="flex items-center justify-between px-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-rose-500 fill-rose-500" /> Trending Drops & High CTR
              </span>
            </div>
            <span className="text-[11px] text-slate-400">Live curated pins</span>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none snap-x">
            {trendingProducts.map((prod) => (
              <div
                key={prod.id}
                onClick={() => onOpenProduct(prod)}
                className="flex-shrink-0 flex items-center gap-2.5 bg-white/95 hover:bg-white p-1.5 pr-3 rounded-xl border border-slate-200/80 shadow-xs cursor-pointer hover:shadow-md transition-all snap-start group"
              >
                <img
                  src={prod.imageUrl}
                  alt={prod.name}
                  className="w-10 h-10 rounded-lg object-cover flex-shrink-0 group-hover:scale-105 transition-transform"
                />
                <div className="text-left">
                  <h4 className="text-xs font-bold text-slate-800 line-clamp-1 max-w-[140px] group-hover:text-rose-600 transition-colors">
                    {prod.name}
                  </h4>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span className="font-bold text-rose-600">{prod.currency || '$'}{prod.price}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-500">{prod.retailer}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Categories Navigation Pills */}
      <div className="flex items-center justify-between gap-3 overflow-x-auto pb-1 pt-1 scrollbar-none">
        <div className="flex items-center gap-2 flex-nowrap min-w-max">
          {CATEGORIES.map((cat) => {
            const isActive = filterState.category === cat;
            const style = CATEGORY_COLOR_STYLES[cat] || {
              active: 'bg-slate-900 text-white shadow-sm',
              inactive: 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/60'
            };

            return (
              <button
                key={cat}
                id={`cat-pill-${cat.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={() => onUpdateFilter({ category: cat, tag: null })}
                className={`px-5 py-2 rounded-full text-xs font-semibold tracking-tight transition-all duration-150 whitespace-nowrap cursor-pointer ${
                  isActive ? style.active : style.inactive
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Second Row: Quick Sort, Refinements, Tags, Price Filters */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1 text-xs">
        {/* Left: Active Filters indicator & Quick Pill Toggles */}
        <div className="flex items-center gap-2 flex-wrap">
          {filterState.tag && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 font-medium">
              <TagIcon className="w-3 h-3" />
              <span>#{filterState.tag}</span>
              <button
                onClick={() => onUpdateFilter({ tag: null })}
                className="hover:bg-rose-200/60 p-0.5 rounded-full cursor-pointer"
                title="Clear tag"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {filterState.search && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 font-medium">
              <Zap className="w-3 h-3 text-amber-600 fill-amber-600" />
              <span>Search: "{filterState.search}"</span>
              <button
                onClick={() => onUpdateFilter({ search: '' })}
                className="hover:bg-amber-200/60 p-0.5 rounded-full cursor-pointer"
                title="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Quick Segmented Sort Badges for Fast 1-Click Access */}
          <div className="hidden md:flex items-center p-1 rounded-2xl bg-slate-100/90 border border-slate-200/70">
            <button
              onClick={() => onUpdateFilter({ sortBy: 'trending' })}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                filterState.sortBy === 'trending' || filterState.sortBy === 'most-clicked' || filterState.sortBy === 'most-saved'
                  ? 'bg-white text-rose-600 shadow-2xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Flame className="w-3 h-3 text-rose-500" />
              <span>Popularity</span>
            </button>
            <button
              onClick={() => onUpdateFilter({ sortBy: filterState.sortBy === 'price-asc' ? 'price-desc' : 'price-asc' })}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                filterState.sortBy === 'price-asc' || filterState.sortBy === 'price-desc'
                  ? 'bg-white text-blue-600 shadow-2xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title={filterState.sortBy === 'price-asc' ? 'Price: Low to High (Click to toggle)' : 'Price: High to Low (Click to toggle)'}
            >
              <DollarSign className="w-3 h-3 text-blue-500" />
              <span>Price {filterState.sortBy === 'price-asc' ? '↑' : filterState.sortBy === 'price-desc' ? '↓' : ''}</span>
            </button>
            <button
              onClick={() => onUpdateFilter({ sortBy: 'newest' })}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                filterState.sortBy === 'newest'
                  ? 'bg-white text-purple-600 shadow-2xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3 h-3 text-purple-500" />
              <span>Date</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onUpdateFilter({ onlySpikes: !filterState.onlySpikes })}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                filterState.onlySpikes
                  ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white border-transparent font-bold shadow-xs'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
              title="Filter by items with 20%+ increase in clicks within the last 24 hours"
            >
              <Flame className={`w-3.5 h-3.5 ${filterState.onlySpikes ? 'text-amber-200 fill-amber-200' : 'text-amber-500'}`} />
              <span>Trending Spikes</span>
              <span className={`text-[10px] px-1 rounded ${filterState.onlySpikes ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-900 font-bold'}`}>+20%</span>
            </button>

            <button
              onClick={() => onUpdateFilter({ onlyTrending: !filterState.onlyTrending })}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                filterState.onlyTrending
                  ? 'bg-rose-100 border-rose-300 text-rose-800 font-bold'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-rose-500" /> Trending
            </button>

            <button
              onClick={() => onUpdateFilter({ onlyStaffPicks: !filterState.onlyStaffPicks })}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                filterState.onlyStaffPicks
                  ? 'bg-purple-100 border-purple-300 text-purple-800 font-bold'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-600" /> Curated Picks
            </button>
          </div>
        </div>

        {/* Right: Quick Sort Custom Dropdown & Filters */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Price Range Filter */}
          <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-400">Price:</span>
            <select
              id="price-filter-select"
              value={filterState.priceRange}
              onChange={(e) => onUpdateFilter({ priceRange: e.target.value as PriceFilter })}
              className="text-xs font-semibold text-slate-700 bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="all">Any Price</option>
              <option value="under25">Under $25</option>
              <option value="25to50">$25 to $50</option>
              <option value="50to100">$50 to $100</option>
              <option value="over100">$100+</option>
            </select>
          </div>

          {/* Retailer Filter */}
          <div className="hidden sm:flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-400">Retailer:</span>
            <select
              id="retailer-filter-select"
              value={filterState.retailer}
              onChange={(e) => onUpdateFilter({ retailer: e.target.value })}
              className="text-xs font-semibold text-slate-700 bg-transparent focus:outline-none cursor-pointer"
            >
              {RETAILERS.map(ret => (
                <option key={ret} value={ret}>{ret}</option>
              ))}
            </select>
          </div>

          {/* Dedicated Quick Sort Interactive Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              id="quick-sort-dropdown-trigger"
              onClick={() => setQuickSortOpen(!quickSortOpen)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border transition-all text-xs font-bold cursor-pointer shadow-2xs ${
                quickSortOpen
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-1.5">
                {currentSortItem.icon}
                <span className="hidden sm:inline">Sort:</span>
                <span className="max-w-[130px] truncate">{currentSortItem.label.replace(/Popularity:\s*|Price:\s*|Date:\s*/, '')}</span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${quickSortOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Quick Sort Dropdown Menu */}
            {quickSortOpen && (
              <div className="absolute right-0 mt-1.5 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-30 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-2 border-b border-slate-100 mb-1 flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Quick Sort Options
                  </span>
                  <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                    Instant Switch
                  </span>
                </div>

                <div className="space-y-1">
                  {SORT_OPTIONS.map((opt) => {
                    const isSelected = filterState.sortBy === opt.id;
                    return (
                      <button
                        key={opt.id}
                        id={`sort-option-${opt.id}`}
                        onClick={() => {
                          onUpdateFilter({ sortBy: opt.id });
                          setQuickSortOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer group ${
                          isSelected
                            ? 'bg-rose-50/80 text-rose-950 font-bold'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'}`}>
                            {opt.icon}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold truncate">{opt.label}</div>
                            <div className="text-[10px] text-slate-400 font-normal truncate">{opt.desc}</div>
                          </div>
                        </div>

                        {isSelected && (
                          <Check className="w-4 h-4 text-rose-600 flex-shrink-0 ml-2" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
