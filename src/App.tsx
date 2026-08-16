/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Product, Board, ClickEvent, FilterState, ActiveTab, 
  User, ProductStatus, AdminAnalyticsSummary 
} from './types';
import { 
  getStoredBoards, saveStoredBoards, 
  getUserSavedIds, saveUserSavedIds,
  getStoredFilters, saveStoredFilters,
  calculateProductSpike 
} from './services/storage';
import { searchIndex } from './services/searchIndex';
import { api } from './services/api';

import { Header } from './components/Header';
import { TrendingBar } from './components/TrendingBar';
import { MasonryGrid } from './components/MasonryGrid';
import { ProductDetailModal } from './components/ProductDetailModal';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminRouteWrapper } from './components/AdminRouteWrapper';
import { BoardsView } from './components/BoardsView';
import { AuthModal } from './components/AuthModal';
import { AffiliateDisclosureModal } from './components/AffiliateDisclosureModal';
import { NotificationToast } from './components/NotificationToast';
import { Footer } from './components/Footer';

export default function App() {
  // Authentication & Role state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'admin-login' | 'register'>('login');
  const [isInitializing, setIsInitializing] = useState(true);

  // Data states
  const [products, setProducts] = useState<Product[]>([]);
  const [analytics, setAnalytics] = useState<AdminAnalyticsSummary | null>(null);
  const [boards, setBoards] = useState<Board[]>(() => getStoredBoards());
  const [savedProductIds, setSavedProductIds] = useState<string[]>(() => getUserSavedIds());

  // Navigation and Filter state
  const [activeTab, setActiveTab] = useState<ActiveTab>('discover');
  const [filterState, setFilterState] = useState<FilterState>(() => getStoredFilters());
  const [isGridLoading, setIsGridLoading] = useState<boolean>(false);

  // Modals & Notifications
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showDisclosureModal, setShowDisclosureModal] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2800);
  };

  const isAdmin = currentUser?.role === 'ADMIN';

  // 1. Initialize user session from server-side /api/auth/me
  const initAuth = useCallback(async () => {
    try {
      const user = await api.getMe();
      setCurrentUser(user);
    } catch {
      setCurrentUser(null);
    } finally {
      setIsInitializing(false);
    }
  }, []);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  // 2. Fetch products based on user role (Public gets only PUBLISHED, Admin gets all)
  const refreshProducts = useCallback(async () => {
    setIsGridLoading(true);
    try {
      if (currentUser?.role === 'ADMIN') {
        const adminProds = await api.getAdminProducts();
        setProducts(adminProds);
      } else {
        const pubProds = await api.getPublishedProducts();
        setProducts(pubProds);
      }
    } catch (err: any) {
      console.error('Failed to load products:', err);
      try {
        const pubProds = await api.getPublishedProducts();
        setProducts(pubProds);
      } catch {
        setProducts([]);
      }
    } finally {
      setIsGridLoading(false);
    }
  }, [currentUser]);

  // 3. Fetch Admin Analytics if current user is Admin
  const refreshAnalytics = useCallback(async () => {
    if (currentUser?.role !== 'ADMIN') return;
    try {
      const data = await api.getAdminAnalytics();
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    }
  }, [currentUser]);

  // Refetch data when user role changes
  useEffect(() => {
    if (!isInitializing) {
      refreshProducts();
      if (currentUser?.role === 'ADMIN') {
        refreshAnalytics();
      }
    }
  }, [currentUser, isInitializing, refreshProducts, refreshAnalytics]);

  // Synchronize client-side search index whenever product catalog changes
  useEffect(() => {
    if (products.length > 0) {
      searchIndex.buildIndex(products);
    }
  }, [products]);

  // Automatically persist filter settings
  useEffect(() => {
    saveStoredFilters(filterState);
  }, [filterState]);

  // Route protection: If non-admin user somehow tries to access admin tab, redirect to discover
  useEffect(() => {
    if (activeTab === 'admin' && currentUser?.role !== 'ADMIN') {
      setActiveTab('discover');
      showToast('Admin Console requires Administrator authentication.');
    }
  }, [activeTab, currentUser]);

  // SEO hash sync (#p/product-slug) on mount & hash navigation
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#p/')) {
        const slug = hash.replace('#p/', '');
        const found = products.find(p => p.slug === slug || p.id === slug);
        if (found) {
          setSelectedProduct(found);
        }
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    window.addEventListener('popstate', handleHash);
    return () => {
      window.removeEventListener('hashchange', handleHash);
      window.removeEventListener('popstate', handleHash);
    };
  }, [products]);

  // Global Keyboard Shortcuts (Esc to close modals, '/' to focus search)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT');

      if (e.key === 'Escape') {
        if (selectedProduct) {
          handleCloseDetail();
        } else if (showDisclosureModal) {
          setShowDisclosureModal(false);
        } else if (authModalOpen) {
          setAuthModalOpen(false);
        }
      } else if (e.key === '/' && !isInput && !selectedProduct && !authModalOpen) {
        e.preventDefault();
        const searchInput = document.getElementById('main-search-input');
        if (searchInput) {
          searchInput.focus();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [selectedProduct, showDisclosureModal, authModalOpen]);

  const handleOpenDetail = (prod: Product) => {
    setSelectedProduct(prod);
    window.location.hash = `#p/${prod.slug}`;
  };

  const handleCloseDetail = () => {
    setSelectedProduct(null);
    if (window.location.hash.startsWith('#p/')) {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  };

  // Track outbound click handler via backend API
  const handleTrackClick = async (product: Product, location: ClickEvent['referrerLocation']) => {
    api.trackOutboundClick(product.id, location).catch(() => {});

    // Optimistically increment clicks count in local state
    setProducts(prev => prev.map(p => {
      if (p.id === product.id) {
        return { ...p, clicksCount: (p.clicksCount || 0) + 1 };
      }
      return p;
    }));
  };

  // Bookmark / Save toggle
  const handleToggleSave = (productId: string) => {
    let updatedSaved: string[];
    let isAdding = false;

    if (savedProductIds.includes(productId)) {
      updatedSaved = savedProductIds.filter(id => id !== productId);
      showToast('Pin removed from saved.');
    } else {
      updatedSaved = [...savedProductIds, productId];
      isAdding = true;
      showToast('Pin saved to your collection!');
    }

    setSavedProductIds(updatedSaved);
    saveUserSavedIds(updatedSaved);

    // Optimistically update product saves counter
    setProducts(prev => prev.map(p => {
      if (p.id === productId) {
        return {
          ...p,
          savesCount: Math.max(0, (p.savesCount || 0) + (isAdding ? 1 : -1))
        };
      }
      return p;
    }));
  };

  // Board management
  const handleSaveToBoard = (boardId: string, productId: string) => {
    const updatedBoards = boards.map(b => {
      if (b.id === boardId) {
        if (!b.productIds.includes(productId)) {
          return { ...b, productIds: [...b.productIds, productId] };
        }
      }
      return b;
    });

    setBoards(updatedBoards);
    saveStoredBoards(updatedBoards);

    if (!savedProductIds.includes(productId)) {
      const updatedSaved = [...savedProductIds, productId];
      setSavedProductIds(updatedSaved);
      saveUserSavedIds(updatedSaved);
    }

    const board = boards.find(b => b.id === boardId);
    showToast(`Saved to "${board?.name || 'Board'}"!`);
  };

  const handleCreateAndSaveBoard = (boardName: string, productId: string) => {
    const prod = products.find(p => p.id === productId);
    const newBoard: Board = {
      id: `board-${Date.now()}`,
      name: boardName,
      coverImage: prod?.imageUrl,
      productIds: [productId],
      createdAt: new Date().toISOString(),
    };
    const updatedBoards = [newBoard, ...boards];
    setBoards(updatedBoards);
    saveStoredBoards(updatedBoards);

    if (!savedProductIds.includes(productId)) {
      const updatedSaved = [...savedProductIds, productId];
      setSavedProductIds(updatedSaved);
      saveUserSavedIds(updatedSaved);
    }

    showToast(`Created board "${boardName}" & saved pin!`);
  };

  const handleCreateBoard = (name: string, description?: string) => {
    const newBoard: Board = {
      id: `board-${Date.now()}`,
      name,
      description,
      productIds: [],
      createdAt: new Date().toISOString(),
    };
    const updated = [newBoard, ...boards];
    setBoards(updated);
    saveStoredBoards(updated);
  };

  const handleDeleteBoard = (boardId: string) => {
    const updated = boards.filter(b => b.id !== boardId);
    setBoards(updated);
    saveStoredBoards(updated);
  };

  // Admin Actions (Server-side API calls)
  const handleAddProduct = async (productData: Partial<Product>) => {
    const product = await api.createProduct(productData);
    setProducts(prev => [product, ...prev]);
    if (isAdmin) refreshAnalytics();
  };

  const handleUpdateProduct = async (id: string, productData: Partial<Product>) => {
    const product = await api.updateProduct(id, productData);
    setProducts(prev => prev.map(p => p.id === id ? product : p));
    if (selectedProduct?.id === id) {
      setSelectedProduct(product);
    }
  };

  const handleUpdateStatus = async (id: string, status: ProductStatus) => {
    const product = await api.updateProductStatus(id, status);
    setProducts(prev => prev.map(p => p.id === id ? product : p));
    showToast(`Status updated to ${status}`);
  };

  const handleDeleteProduct = async (productId: string) => {
    await api.deleteProduct(productId);
    setProducts(prev => prev.filter(p => p.id !== productId));
    if (selectedProduct?.id === productId) {
      handleCloseDetail();
    }
  };

  const handleClearAllData = async () => {
    await api.clearAllAdminData();
    setProducts([]);
    setBoards([]);
    setSavedProductIds([]);
    saveStoredBoards([]);
    saveUserSavedIds([]);
    setAnalytics(null);
  };

  const handleUpdateFilter = (updates: Partial<FilterState>) => {
    if (updates.category !== undefined || updates.sortBy !== undefined || updates.tag !== undefined || updates.priceRange !== undefined) {
      setIsGridLoading(true);
      setTimeout(() => setIsGridLoading(false), 200);
    }
    setFilterState(prev => ({ ...prev, ...updates }));
  };

  const handleResetFilters = () => {
    setIsGridLoading(true);
    setTimeout(() => setIsGridLoading(false), 200);
    setFilterState({
      search: '',
      category: 'All Pins',
      tag: null,
      retailer: 'All Retailers',
      sortBy: 'trending',
      priceRange: 'all',
      onlyTrending: false,
      onlyStaffPicks: false,
    });
  };

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
    setActiveTab('discover');
    showToast('Signed out successfully.');
    refreshProducts();
  };

  // Filter & Sort Logic for public discovery (using FlexSearch index for instant search)
  const filteredProducts = useMemo(() => {
    let searchMatchedIdSet: Set<string> | null = null;
    let searchRankMap: Map<string, number> | null = null;

    if (filterState.search && filterState.search.trim()) {
      const searchRes = searchIndex.search(filterState.search.trim(), 2000);
      searchMatchedIdSet = new Set(searchRes.ids);
      searchRankMap = new Map();
      searchRes.ids.forEach((id, idx) => {
        searchRankMap!.set(id, idx);
      });
    }

    return products.filter((p) => {
      // 1. FlexSearch fast index lookup
      if (searchMatchedIdSet !== null && !searchMatchedIdSet.has(p.id)) {
        return false;
      }

      // 2. Category
      if (filterState.category && filterState.category !== 'All Pins') {
        if (p.category !== filterState.category) return false;
      }

      // 3. Tag
      if (filterState.tag) {
        if (!p.tags?.includes(filterState.tag.toLowerCase())) return false;
      }

      // 4. Retailer
      if (filterState.retailer && filterState.retailer !== 'All Retailers') {
        if (p.retailer !== filterState.retailer) return false;
      }

      // 5. Trending toggle
      if (filterState.onlyTrending && !p.isTrending) {
        return false;
      }

      // 6. 24h Trending Click Spike toggle
      if (filterState.onlySpikes) {
        const spikeInfo = calculateProductSpike(p, []);
        if (!spikeInfo.hasClickSpike) return false;
      }

      // 7. Staff pick toggle
      if (filterState.onlyStaffPicks && !p.isStaffPick) {
        return false;
      }

      // 8. Price Range
      if (filterState.priceRange !== 'all') {
        const price = p.price || 0;
        if (filterState.priceRange === 'under25' && price >= 25) return false;
        if (filterState.priceRange === '25to50' && (price < 25 || price > 50)) return false;
        if (filterState.priceRange === '50to100' && (price < 50 || price > 100)) return false;
        if (filterState.priceRange === 'over100' && price <= 100) return false;
      }

      return true;
    }).sort((a, b) => {
      // If search query is active and sort is 'trending', preserve FlexSearch relevance ranking
      if (searchRankMap && filterState.sortBy === 'trending') {
        const rankA = searchRankMap.get(a.id) ?? 9999;
        const rankB = searchRankMap.get(b.id) ?? 9999;
        if (rankA !== rankB) return rankA - rankB;
      }

      if (filterState.sortBy === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (filterState.sortBy === 'price-asc') {
        return (a.price || 0) - (b.price || 0);
      }
      if (filterState.sortBy === 'price-desc') {
        return (b.price || 0) - (a.price || 0);
      }
      if (filterState.sortBy === 'most-clicked') {
        return (b.clicksCount || 0) - (a.clicksCount || 0);
      }
      if (filterState.sortBy === 'most-saved') {
        return (b.savesCount || 0) - (a.savesCount || 0);
      }
      // 'trending' default
      const scoreA = (a.isTrending ? 100 : 0) + (a.isStaffPick ? 50 : 0) + (a.clicksCount || 0);
      const scoreB = (b.isTrending ? 100 : 0) + (b.isStaffPick ? 50 : 0) + (b.clicksCount || 0);
      return scoreB - scoreA;
    });
  }, [products, filterState]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 selection:bg-rose-500/20 selection:text-rose-700">
      {/* Global Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        filterState={filterState}
        onUpdateFilter={handleUpdateFilter}
        savedCount={savedProductIds.length}
        currentUser={currentUser}
        onOpenAuthModal={(mode = 'login') => {
          setAuthModalMode(mode);
          setAuthModalOpen(true);
        }}
        onLogout={handleLogout}
        onOpenDisclosure={() => setShowDisclosureModal(true)}
        onOpenProduct={handleOpenDetail}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1760px] w-full mx-auto px-3 sm:px-6 lg:px-8 2xl:px-12 pt-5 pb-16">
        {/* Tab 1: Discovery Feed (Pinterest Masonry) */}
        {activeTab === 'discover' && (
          <div className="space-y-4">
            {/* Filter & Trending Toolbar with Quick Sort */}
            <TrendingBar
              products={products}
              filterState={filterState}
              onUpdateFilter={handleUpdateFilter}
              onOpenProduct={handleOpenDetail}
              onOpenDisclosure={() => setShowDisclosureModal(true)}
            />

            {/* Pinterest Masonry Waterfall Grid with Skeleton loading */}
            <MasonryGrid
              products={filteredProducts}
              totalCatalogCount={products.length}
              boards={boards}
              savedProductIds={savedProductIds}
              isLoading={isGridLoading}
              isAdmin={isAdmin}
              onOpenDetail={handleOpenDetail}
              onTrackClick={handleTrackClick}
              onToggleSave={handleToggleSave}
              onSaveToBoard={handleSaveToBoard}
              onCreateAndSaveBoard={handleCreateAndSaveBoard}
              onResetFilters={handleResetFilters}
              onNavigateToAdmin={() => {
                if (isAdmin) {
                  setActiveTab('admin');
                } else {
                  setAuthModalMode('admin-login');
                  setAuthModalOpen(true);
                }
              }}
              onShowToast={showToast}
            />
          </div>
        )}

        {/* Tab 2: User Boards / Saved Collections */}
        {activeTab === 'boards' && (
          <BoardsView
            boards={boards}
            allProducts={products}
            savedProductIds={savedProductIds}
            onCreateBoard={handleCreateBoard}
            onDeleteBoard={handleDeleteBoard}
            onOpenDetail={handleOpenDetail}
            onTrackClick={handleTrackClick}
            onToggleSave={handleToggleSave}
            onSaveToBoard={handleSaveToBoard}
            onCreateAndSaveBoard={handleCreateAndSaveBoard}
            onExploreMore={() => setActiveTab('discover')}
            onShowToast={showToast}
          />
        )}

        {/* Tab 3: Admin Console (Strictly Protected - Admins Only) */}
        {activeTab === 'admin' && (
          <AdminRouteWrapper
            currentUser={currentUser}
            isLoading={isInitializing}
            onOpenAdminLogin={() => {
              setAuthModalMode('admin-login');
              setAuthModalOpen(true);
            }}
            onRedirectHome={() => setActiveTab('discover')}
          >
            <AdminDashboard
              products={products}
              analytics={analytics}
              onAddProduct={handleAddProduct}
              onUpdateProduct={handleUpdateProduct}
              onUpdateStatus={handleUpdateStatus}
              onDeleteProduct={handleDeleteProduct}
              onClearAllData={handleClearAllData}
              onRefreshAnalytics={refreshAnalytics}
              onExitAdmin={() => setActiveTab('discover')}
              onShowToast={showToast}
              onOpenProduct={handleOpenDetail}
            />
          </AdminRouteWrapper>
        )}
      </main>

      {/* Product Detail Modal / Page with Slideshow & Keyboard Shortcuts */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          allProducts={products}
          currentProductList={filteredProducts}
          boards={boards}
          isSaved={savedProductIds.includes(selectedProduct.id)}
          onClose={handleCloseDetail}
          onSelectProduct={(p) => {
            setSelectedProduct(p);
            window.location.hash = `#p/${p.slug}`;
          }}
          onTrackClick={handleTrackClick}
          onToggleSave={handleToggleSave}
          onSaveToBoard={handleSaveToBoard}
          onCreateAndSaveBoard={handleCreateAndSaveBoard}
          onSelectTag={(tag) => {
            setFilterState(prev => ({ ...prev, tag, category: 'All Pins' }));
            setActiveTab('discover');
          }}
          onSelectCategory={(cat) => {
            setFilterState(prev => ({ ...prev, category: cat, tag: null }));
            setActiveTab('discover');
          }}
          onShowToast={showToast}
        />
      )}

      {/* Auth Modal (Login / Register / Admin Login) */}
      <AuthModal
        isOpen={authModalOpen}
        initialMode={authModalMode}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(user) => {
          setCurrentUser(user);
          if (user.role === 'ADMIN') {
            setActiveTab('admin');
          }
        }}
        onShowToast={showToast}
      />

      {/* Affiliate Disclosure Modal */}
      {showDisclosureModal && (
        <AffiliateDisclosureModal
          onClose={() => setShowDisclosureModal(false)}
        />
      )}

      {/* Micro Interaction Toast */}
      <NotificationToast message={toastMessage} />

      {/* Global Footer */}
      <Footer
        onSelectCategory={(cat) => {
          setFilterState(prev => ({ ...prev, category: cat, tag: null }));
          setActiveTab('discover');
        }}
        onOpenDisclosure={() => setShowDisclosureModal(true)}
      />
    </div>
  );
}
