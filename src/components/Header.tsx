import React, { useState, useEffect, useRef } from 'react';
import { ActiveTab, FilterState, User, Product } from '../types';
import { 
  Search, Compass, FolderHeart, ShieldCheck, 
  X, Pin, LogOut, Lock, LogIn, ChevronDown,
  Zap, Clock, ArrowRight, Sparkles, Tag, ShoppingBag
} from 'lucide-react';
import { searchIndex, SearchSuggestions } from '../services/searchIndex';
import { 
  getStoredRecentSearches, addStoredRecentSearch, 
  removeStoredRecentSearch, clearStoredRecentSearches 
} from '../services/storage';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  filterState: FilterState;
  onUpdateFilter: (updates: Partial<FilterState>) => void;
  savedCount: number;
  currentUser: User | null;
  onOpenAuthModal: (mode?: 'login' | 'admin-login' | 'register') => void;
  onLogout: () => void;
  onOpenDisclosure: () => void;
  onOpenProduct?: (product: Product) => void;
}

const POPULAR_SEARCHES = [
  'Walnut Desk Setup',
  'Ceramic Coffee Dripper',
  'Minimalist Table Lamp',
  'Linen Throw Pillow',
  'Mechanical Keyboard',
  'Matcha Whisk Set',
];

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  filterState,
  onUpdateFilter,
  savedCount,
  currentUser,
  onOpenAuthModal,
  onLogout,
  onOpenDisclosure,
  onOpenProduct,
}) => {
  const [searchInput, setSearchInput] = useState(filterState.search || '');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestions | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => getStoredRecentSearches());
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync internal state when external filter changes
  useEffect(() => {
    setSearchInput(filterState.search || '');
  }, [filterState.search]);

  // Compute live FlexSearch suggestions on input change
  useEffect(() => {
    if (searchInput.trim()) {
      const res = searchIndex.getSuggestions(searchInput.trim(), 4);
      setSuggestions(res);
    } else {
      setSuggestions(null);
    }
  }, [searchInput]);

  // Close search suggestions on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchInput.trim();
    if (query) {
      const updatedRecent = addStoredRecentSearch(query);
      setRecentSearches(updatedRecent);
    }
    onUpdateFilter({ search: query });
    if (activeTab !== 'discover') {
      setActiveTab('discover');
    }
    setIsSearchFocused(false);
    searchInputRef.current?.blur();
  };

  const handleSelectRecentOrPopular = (term: string) => {
    setSearchInput(term);
    const updatedRecent = addStoredRecentSearch(term);
    setRecentSearches(updatedRecent);
    onUpdateFilter({ search: term });
    if (activeTab !== 'discover') {
      setActiveTab('discover');
    }
    setIsSearchFocused(false);
  };

  const handleSelectCategory = (cat: string) => {
    onUpdateFilter({ category: cat, search: '' });
    setSearchInput('');
    if (activeTab !== 'discover') {
      setActiveTab('discover');
    }
    setIsSearchFocused(false);
  };

  const handleSelectTag = (tag: string) => {
    onUpdateFilter({ tag, search: '' });
    setSearchInput('');
    if (activeTab !== 'discover') {
      setActiveTab('discover');
    }
    setIsSearchFocused(false);
  };

  const handleSelectProduct = (prod: Product) => {
    if (onOpenProduct) {
      onOpenProduct(prod);
    } else {
      onUpdateFilter({ search: prod.name });
    }
    setIsSearchFocused(false);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    onUpdateFilter({ search: '' });
    setSuggestions(null);
    searchInputRef.current?.focus();
  };

  const handleRemoveRecent = (e: React.MouseEvent, term: string) => {
    e.stopPropagation();
    const updated = removeStoredRecentSearch(term);
    setRecentSearches(updated);
  };

  const handleClearAllRecent = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearStoredRecentSearches();
    setRecentSearches([]);
  };

  // Keyboard navigation inside search dropdown
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsSearchFocused(false);
      searchInputRef.current?.blur();
    } else if (e.key === 'Enter') {
      handleSearchSubmit();
    }
  };

  const isAdmin = currentUser?.role === 'ADMIN';

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 transition-all">
      {/* Top Banner: FTC Affiliate Disclosure Micro Strip */}
      <div className="bg-slate-900 text-slate-300 text-[11px] py-1.5 px-4 text-center flex items-center justify-center gap-2">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
        <span>Curated aesthetic discoveries & direct verified affiliate links.</span>
        <button
          onClick={onOpenDisclosure}
          className="text-white hover:text-rose-300 underline font-semibold ml-1 cursor-pointer transition-colors"
        >
          Affiliate Disclosure
        </button>
      </div>

      <div className="max-w-[1760px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12">
        <div className="flex items-center justify-between h-16 gap-3 sm:gap-6">
          {/* Logo Brand */}
          <div
            id="brand-logo-container"
            onClick={() => {
              setActiveTab('discover');
              onUpdateFilter({ category: 'All Pins', tag: null, search: '' });
              setSearchInput('');
            }}
            className="flex items-center gap-2.5 cursor-pointer group flex-shrink-0"
          >
            <div className="w-9 h-9 rounded-full bg-rose-600 flex items-center justify-center shadow-md shadow-rose-600/20 group-hover:scale-105 transition-transform">
              <div className="w-3.5 h-3.5 bg-white rounded-full flex items-center justify-center">
                <Pin className="w-2.5 h-2.5 text-rose-600 fill-rose-600" />
              </div>
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xl tracking-tight text-slate-900 font-display">
                  Pin<span className="text-rose-600">Find</span>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200/60">
                  Affiliate
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Visual Product Discovery</p>
            </div>
          </div>

          {/* Search Bar with FlexSearch Instant Indexing Autocomplete Dropdown */}
          <div 
            ref={searchContainerRef}
            className="flex-1 max-w-xl lg:max-w-2xl xl:max-w-3xl relative"
          >
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none" />
              <input
                ref={searchInputRef}
                id="main-search-input"
                type="text"
                value={searchInput}
                onFocus={() => setIsSearchFocused(true)}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  onUpdateFilter({ search: e.target.value });
                  if (activeTab !== 'discover') setActiveTab('discover');
                }}
                onKeyDown={handleKeyDown}
                placeholder="Search for aesthetic workspace, decor, coffee gear, style..."
                className="w-full pl-11 pr-14 sm:pr-16 py-2.5 bg-slate-100 hover:bg-slate-100/90 focus:bg-white rounded-full text-xs sm:text-sm text-slate-800 border border-transparent focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500/20 transition-all placeholder:text-slate-400 shadow-2xs"
                autoComplete="off"
              />
              {!searchInput && (
                <div className="hidden md:flex items-center gap-0.5 absolute right-3.5 pointer-events-none text-[10px] font-semibold text-slate-400 bg-white/80 border border-slate-200 px-1.5 py-0.5 rounded-md shadow-2xs">
                  <kbd className="font-mono">/</kbd>
                </div>
              )}
              {searchInput && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-3.5 p-1 rounded-full text-slate-400 hover:text-slate-700 cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </form>

            {/* Live FlexSearch Suggestions Popover */}
            {isSearchFocused && (
              <div 
                id="search-suggestions-dropdown"
                className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100 divide-y divide-slate-100 max-h-[80vh] overflow-y-auto"
              >
                {/* Mode A: User is actively typing query -> Show live indexed suggestions */}
                {searchInput.trim().length > 0 && suggestions ? (
                  <div className="p-3.5 space-y-3">
                    {/* Index Speed / Match Count Indicator */}
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 pb-1 border-b border-slate-100">
                      <div className="flex items-center gap-1.5 text-rose-600 font-bold">
                        <Zap className="w-3.5 h-3.5 fill-rose-600" />
                        <span>FlexSearch Index</span>
                        <span className="text-slate-400 font-normal">
                          ({suggestions.totalMatches} matches in {suggestions.searchTimeMs}ms)
                        </span>
                      </div>
                      <span className="text-slate-400 text-[10px]">Press Enter for full grid</span>
                    </div>

                    {/* Matching Categories & Tags Chips */}
                    {(suggestions.categories.length > 0 || suggestions.tags.length > 0) && (
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                          Related Filters & Tags
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {suggestions.categories.map(cat => (
                            <button
                              key={`cat-${cat}`}
                              type="button"
                              onClick={() => handleSelectCategory(cat)}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/60 transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <ShoppingBag className="w-3 h-3 text-rose-500" />
                              <span>{cat}</span>
                            </button>
                          ))}
                          {suggestions.tags.map(tag => (
                            <button
                              key={`tag-${tag}`}
                              type="button"
                              onClick={() => handleSelectTag(tag)}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/60 transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <Tag className="w-3 h-3 text-slate-400" />
                              <span>#{tag}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Top Matching Pins Preview */}
                    {suggestions.products.length > 0 ? (
                      <div className="space-y-1.5 pt-1">
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                          Top Pin Matches
                        </p>
                        <div className="space-y-1">
                          {suggestions.products.map(prod => (
                            <div
                              key={`prod-${prod.id}`}
                              onClick={() => handleSelectProduct(prod)}
                              className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group"
                            >
                              <img
                                src={prod.imageUrl}
                                alt={prod.name}
                                className="w-10 h-10 rounded-lg object-cover bg-slate-100 flex-shrink-0 border border-slate-200/80"
                                referrerPolicy="no-referrer"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-xs font-bold text-slate-800 truncate group-hover:text-rose-600 transition-colors">
                                    {prod.name}
                                  </p>
                                  {prod.price !== undefined && (
                                    <span className="text-xs font-bold text-slate-900 flex-shrink-0">
                                      ${prod.price.toFixed(2)}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-400 truncate">
                                  {prod.category} • {prod.retailer}
                                </p>
                              </div>
                              <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-rose-600 transition-colors flex-shrink-0" />
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="py-4 text-center text-slate-400 text-xs">
                        No direct pins matched "{searchInput}". Press Enter to search full catalog.
                      </div>
                    )}

                    {/* Submit Full Search Button */}
                    <button
                      type="button"
                      onClick={() => handleSearchSubmit()}
                      className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer mt-1"
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>View all {suggestions.totalMatches} results for "{searchInput}"</span>
                    </button>
                  </div>
                ) : (
                  /* Mode B: Empty input on focus -> Show Recent Searches & Trending Searches */
                  <div className="p-3.5 space-y-4">
                    {/* Recent Searches */}
                    {recentSearches.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" /> Recent Searches
                          </p>
                          <button
                            type="button"
                            onClick={handleClearAllRecent}
                            className="text-[10px] text-slate-400 hover:text-rose-600 font-semibold cursor-pointer"
                          >
                            Clear All
                          </button>
                        </div>
                        <div className="space-y-0.5">
                          {recentSearches.map((term) => (
                            <div
                              key={`rec-${term}`}
                              onClick={() => handleSelectRecentOrPopular(term)}
                              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-50 text-xs text-slate-700 cursor-pointer group"
                            >
                              <div className="flex items-center gap-2 truncate">
                                <Clock className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600" />
                                <span className="font-medium truncate">{term}</span>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => handleRemoveRecent(e, term)}
                                className="text-slate-300 hover:text-slate-600 p-1 rounded-md"
                                title="Remove item"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Popular / Curated Aesthetic Searches */}
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-500" /> Popular Inquiries
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {POPULAR_SEARCHES.map((term) => (
                          <button
                            key={`pop-${term}`}
                            type="button"
                            onClick={() => handleSelectRecentOrPopular(term)}
                            className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-700 border border-slate-200/60 transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Search className="w-3 h-3 text-slate-400" />
                            <span>{term}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Customer-Facing Navigation (Strictly Discovery & Boards for standard users) */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Desktop Tabs */}
            <nav className="hidden md:flex items-center gap-1.5">
              <button
                id="nav-tab-discover"
                onClick={() => setActiveTab('discover')}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'discover'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Discover</span>
              </button>

              <button
                id="nav-tab-boards"
                onClick={() => setActiveTab('boards')}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 relative ${
                  activeTab === 'boards'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <FolderHeart className="w-3.5 h-3.5" />
                <span>My Boards</span>
                {savedCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-rose-600 text-white">
                    {savedCount}
                  </span>
                )}
              </button>
            </nav>

            {/* Admin Console Entry (Visible ONLY to verified Administrators) */}
            {isAdmin && (
              <button
                id="admin-console-header-btn"
                onClick={() => setActiveTab('admin')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition-all shadow-xs cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-indigo-700 text-white shadow-indigo-600/30'
                    : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-indigo-500" />
                <span className="hidden sm:inline">Admin Console</span>
              </button>
            )}

            {/* User Account / Login Button */}
            <div className="relative">
              {currentUser ? (
                <div className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-2 pl-2.5 pr-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer border border-slate-200/80"
                  >
                    <div className="w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center text-[11px] font-bold">
                      {currentUser.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="hidden sm:inline max-w-[100px] truncate">{currentUser.name}</span>
                    <ChevronDown className="w-3 h-3 text-slate-500" />
                  </button>

                  {isUserMenuOpen && (
                    <div
                      className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-100"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <div className="px-4 py-2.5 border-b border-slate-100">
                        <p className="text-xs font-bold text-slate-900">{currentUser.name}</p>
                        <p className="text-[11px] text-slate-400 truncate">{currentUser.email}</p>
                        <div className="mt-1">
                          <span className={`inline-block text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            isAdmin ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {currentUser.role}
                          </span>
                        </div>
                      </div>

                      {isAdmin && (
                        <button
                          onClick={() => setActiveTab('admin')}
                          className="w-full text-left px-4 py-2 text-xs text-indigo-700 hover:bg-indigo-50 font-bold flex items-center gap-2 cursor-pointer"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Admin Console</span>
                        </button>
                      )}

                      <button
                        onClick={() => { setActiveTab('boards'); }}
                        className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-semibold flex items-center gap-2 cursor-pointer"
                      >
                        <FolderHeart className="w-3.5 h-3.5 text-slate-400" />
                        <span>Saved Boards</span>
                      </button>

                      <div className="border-t border-slate-100 my-1"></div>

                      <button
                        onClick={onLogout}
                        className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 font-bold flex items-center gap-2 cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onOpenAuthModal('login')}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5 text-slate-500" />
                    <span>Sign In</span>
                  </button>
                  <button
                    onClick={() => onOpenAuthModal('admin-login')}
                    title="Administrator Login"
                    className="p-2 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Customer Navigation Strip */}
      <div className="md:hidden flex items-center justify-around border-t border-slate-100 bg-white px-2 py-2 text-xs">
        <button
          onClick={() => setActiveTab('discover')}
          className={`flex items-center gap-1 py-1.5 px-3 rounded-full font-bold transition-colors ${
            activeTab === 'discover' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Discover</span>
        </button>

        <button
          onClick={() => setActiveTab('boards')}
          className={`flex items-center gap-1 py-1.5 px-3 rounded-full font-bold transition-colors ${
            activeTab === 'boards' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FolderHeart className="w-3.5 h-3.5" />
          <span>Boards {savedCount > 0 && `(${savedCount})`}</span>
        </button>

        {isAdmin && (
          <button
            onClick={() => setActiveTab('admin')}
            className={`flex items-center gap-1 py-1.5 px-3 rounded-full font-bold transition-colors ${
              activeTab === 'admin' ? 'bg-indigo-600 text-white' : 'text-indigo-700 bg-indigo-50'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Admin</span>
          </button>
        )}
      </div>
    </header>
  );
};
