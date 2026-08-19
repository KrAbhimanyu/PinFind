import { Product, ClickEvent, Board, FilterState } from '../types';
import { INITIAL_PRODUCTS, INITIAL_BOARDS } from '../data/initialProducts';

const STORAGE_KEYS = {
  PRODUCTS: 'pinfind_products_clean',
  CLICKS: 'pinfind_clicks_clean',
  BOARDS: 'pinfind_boards_clean',
  USER_SAVED: 'pinfind_user_saved_ids_clean',
  FILTERS: 'pinfind_filters_clean',
  RECENT_SEARCHES: 'pinfind_recent_searches',
  WATCHLIST: 'pinfind_price_watchlist',
  VISITOR_ID: 'pinfind_visitor_tracker_id',
};

export const getOrCreateVisitorId = (): string => {
  try {
    let vid = localStorage.getItem(STORAGE_KEYS.VISITOR_ID);
    if (!vid) {
      vid = `v_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem(STORAGE_KEYS.VISITOR_ID, vid);
    }
    return vid;
  } catch {
    return `v_anon_${Math.random().toString(36).substring(2, 9)}`;
  }
};

export const getClientDeviceType = (): 'desktop' | 'mobile' | 'tablet' => {
  if (typeof window === 'undefined') return 'desktop';
  const width = window.innerWidth;
  if (width < 640) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
};

export const getStoredWatchlist = (): import('../types').WatchlistProduct[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.WATCHLIST);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveStoredWatchlist = (items: import('../types').WatchlistProduct[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.WATCHLIST, JSON.stringify(items));
  } catch (e) {
    console.error('Failed to save price watchlist to localStorage', e);
  }
};

export const toggleWatchlistProduct = (
  productId: string,
  currentPrice: number = 0,
  targetPrice?: number,
  notifyEmail?: string
): { isAdded: boolean; watchlist: import('../types').WatchlistProduct[] } => {
  const current = getStoredWatchlist();
  const exists = current.some(item => item.productId === productId);

  let updated: import('../types').WatchlistProduct[];
  let isAdded = false;

  if (exists) {
    updated = current.filter(item => item.productId !== productId);
  } else {
    isAdded = true;
    updated = [
      {
        productId,
        addedAt: new Date().toISOString(),
        initialPrice: currentPrice,
        targetPrice: targetPrice || Math.round(currentPrice * 0.85),
        currency: 'INR',
        notifyEmail,
        isTriggered: false,
      },
      ...current,
    ];
  }

  saveStoredWatchlist(updated);
  return { isAdded, watchlist: updated };
};

export const getStoredRecentSearches = (): string[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RECENT_SEARCHES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveStoredRecentSearches = (searches: string[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.RECENT_SEARCHES, JSON.stringify(searches.slice(0, 10)));
  } catch (e) {
    console.error('Failed to save recent searches', e);
  }
};

export const addStoredRecentSearch = (query: string): string[] => {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return getStoredRecentSearches();
  const current = getStoredRecentSearches().filter(q => q.toLowerCase() !== trimmed.toLowerCase());
  const updated = [trimmed, ...current].slice(0, 8);
  saveStoredRecentSearches(updated);
  return updated;
};

export const removeStoredRecentSearch = (query: string): string[] => {
  const current = getStoredRecentSearches();
  const updated = current.filter(q => q.toLowerCase() !== query.toLowerCase());
  saveStoredRecentSearches(updated);
  return updated;
};

export const clearStoredRecentSearches = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEYS.RECENT_SEARCHES);
  } catch {}
};

export const DEFAULT_FILTERS: FilterState = {
  search: '',
  category: 'All Pins',
  tag: null,
  retailer: 'All Retailers',
  sortBy: 'trending',
  priceRange: 'all',
  onlyTrending: false,
  onlyStaffPicks: false,
  onlySpikes: false,
};

export const getStoredFilters = (): FilterState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.FILTERS);
    if (!raw) return DEFAULT_FILTERS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_FILTERS, ...parsed };
  } catch {
    return DEFAULT_FILTERS;
  }
};

export const saveStoredFilters = (filters: FilterState): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.FILTERS, JSON.stringify(filters));
  } catch (e) {
    console.error('Failed to save filters to localStorage', e);
  }
};

/**
 * Calculates 24h click growth spike percentage for a product
 */
export const calculateProductSpike = (
  product: Product,
  clicks: ClickEvent[]
): { hasClickSpike: boolean; spikePercentage: number } => {
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const twoDaysMs = 48 * 60 * 60 * 1000;

  const productClicks = clicks.filter(c => c.productId === product.id);
  const last24hClicks = productClicks.filter(
    c => now - new Date(c.timestamp).getTime() <= oneDayMs
  ).length;
  const prev24hClicks = productClicks.filter(
    c => {
      const diff = now - new Date(c.timestamp).getTime();
      return diff > oneDayMs && diff <= twoDaysMs;
    }
  ).length;

  let spikePercentage = 0;

  if (prev24hClicks > 0) {
    spikePercentage = Math.round(((last24hClicks - prev24hClicks) / prev24hClicks) * 100);
  } else if (last24hClicks >= 2) {
    spikePercentage = Math.round(last24hClicks * 15);
  } else if (product.clicksGrowth24h !== undefined) {
    spikePercentage = product.clicksGrowth24h;
  }

  const hasClickSpike = spikePercentage >= 20;

  return { hasClickSpike, spikePercentage: Math.max(0, spikePercentage) };
};

export const getStoredProducts = (): Product[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveStoredProducts = (products: Product[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  } catch (e) {
    console.error('Failed to save products to localStorage', e);
  }
};

export const getStoredClicks = (): ClickEvent[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CLICKS);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveStoredClicks = (clicks: ClickEvent[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.CLICKS, JSON.stringify(clicks));
  } catch (e) {
    console.error('Failed to save clicks to localStorage', e);
  }
};

export const getStoredBoards = (): Board[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BOARDS);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveStoredBoards = (boards: Board[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.BOARDS, JSON.stringify(boards));
  } catch (e) {
    console.error('Failed to save boards to localStorage', e);
  }
};

export const getUserSavedIds = (): string[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER_SAVED);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveUserSavedIds = (ids: string[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.USER_SAVED, JSON.stringify(ids));
  } catch (e) {
    console.error('Failed to save user saved ids to localStorage', e);
  }
};

/**
 * Track an outbound affiliate click and update product metrics
 */
export const trackAffiliateClick = (
  product: Product,
  referrerLocation: ClickEvent['referrerLocation']
): { clickEvent: ClickEvent; updatedProducts: Product[] } => {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const isTablet = typeof window !== 'undefined' && window.innerWidth >= 768 && window.innerWidth < 1024;
  
  const clickEvent: ClickEvent = {
    id: `clk-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    productId: product.id,
    productName: product.name,
    retailer: product.retailer || 'Direct',
    destinationUrl: product.affiliateLink,
    timestamp: new Date().toISOString(),
    referrerLocation,
    deviceType: isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop'
  };

  // Save to click log (keep last 500)
  const currentClicks = getStoredClicks();
  const updatedClicks = [clickEvent, ...currentClicks].slice(0, 500);
  saveStoredClicks(updatedClicks);

  // Update product click count
  const allProducts = getStoredProducts();
  const updatedProducts = allProducts.map(p => {
    if (p.id === product.id) {
      return {
        ...p,
        clicksCount: (p.clicksCount || 0) + 1
      };
    }
    return p;
  });
  saveStoredProducts(updatedProducts);

  return { clickEvent, updatedProducts };
};

/**
 * Helper to slugify names
 */
export const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * Clear all storage completely
 */
export const clearAllStorage = (): { products: Product[]; boards: Board[]; clicks: ClickEvent[] } => {
  localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
  localStorage.removeItem(STORAGE_KEYS.BOARDS);
  localStorage.removeItem(STORAGE_KEYS.USER_SAVED);
  localStorage.removeItem(STORAGE_KEYS.CLICKS);
  
  return {
    products: [],
    boards: [],
    clicks: []
  };
};
