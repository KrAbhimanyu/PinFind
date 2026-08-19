import { 
  Product, Board, User, ClickEvent, AdminAnalyticsSummary, 
  ProductStatus, Category, AuditLog, PlatformSettings, UserRole,
  PinterestSyncState, PinterestBoardItem, PaymentOffer, BestOfferSummary,
  PriceHistoryPoint, PriceDropInfo
} from '../types';

const TOKEN_KEY = 'pinfind_auth_token';
const USER_KEY = 'pinfind_auth_user';

export const getStoredToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setStoredAuth = (token: string, user: User): void => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const clearStoredAuth = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

export const getStoredUser = (): User | null => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const authHeaders = (): HeadersInit => {
  const token = getStoredToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const api = {
  // Authentication
  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Login failed' }));
      throw new Error(err.error || 'Invalid credentials');
    }
    const data = await res.json();
    setStoredAuth(data.token, data.user);
    return data;
  },

  async register(email: string, password: string, name: string): Promise<{ token: string; user: User }> {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Registration failed' }));
      throw new Error(err.error || 'Registration failed');
    }
    const data = await res.json();
    setStoredAuth(data.token, data.user);
    return data;
  },

  async getMe(): Promise<User | null> {
    const token = getStoredToken();
    if (!token) return null;
    try {
      const res = await fetch('/api/auth/me', { headers: authHeaders() });
      if (!res.ok) {
        clearStoredAuth();
        return null;
      }
      const data = await res.json();
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      return data.user;
    } catch {
      return null;
    }
  },

  async logout(): Promise<void> {
    try {
      await fetch('/api/auth/logout', { method: 'POST', headers: authHeaders() });
    } catch {
      // Ignore network error on logout
    }
    clearStoredAuth();
  },

  // Public Platform Settings
  async getSettings(): Promise<PlatformSettings> {
    try {
      const res = await fetch('/api/settings');
      if (!res.ok) throw new Error('Failed to load settings');
      const data = await res.json();
      return data.settings;
    } catch {
      return {
        platformName: 'PinFind Discovery',
        tagline: 'Visual Product Discovery & Curated Design Collections',
        affiliateDisclaimer: 'We curate products based on design excellence and quality. All product links take you directly to verified official retailer stores.',
        storeDisclaimer: 'We curate products based on design excellence and quality. All product links take you directly to verified official retailer stores.',
        defaultCurrency: 'USD',
        contactEmail: 'hello@pinfind.store',
      };
    }
  },

  // Public Categories
  async getCategories(): Promise<Category[]> {
    try {
      const res = await fetch('/api/categories');
      if (!res.ok) return [];
      const data = await res.json();
      return data.categories || [];
    } catch {
      return [];
    }
  },

  // Public Discovery APIs (Only PUBLISHED products)
  async getPublishedProducts(params?: {
    search?: string;
    category?: string;
    subcategory?: string;
    tag?: string;
    retailer?: string;
    sort?: string;
    priceRange?: string;
    page?: number;
    limit?: number;
  }): Promise<Product[]> {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.category) query.append('category', params.category);
    if (params?.subcategory) query.append('subcategory', params.subcategory);
    if (params?.tag) query.append('tag', params.tag);
    if (params?.retailer) query.append('retailer', params.retailer);
    if (params?.sort) query.append('sort', params.sort);
    if (params?.priceRange) query.append('priceRange', params.priceRange);
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));

    const res = await fetch(`/api/products?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to load published products');
    const data = await res.json();
    return data.products || [];
  },

  async getProductById(id: string): Promise<Product> {
    const res = await fetch(`/api/products/${id}`);
    if (!res.ok) throw new Error('Product not found or not published');
    const data = await res.json();
    return data.product;
  },

  async trackOutboundClick(
    productId: string,
    referrerLocation: string,
    deviceType?: 'desktop' | 'mobile' | 'tablet'
  ): Promise<{ destinationUrl: string }> {
    const res = await fetch('/api/clicks/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, referrerLocation, deviceType }),
    });
    if (!res.ok) throw new Error('Click tracking failed');
    return res.json();
  },

  async getBoards(): Promise<Board[]> {
    const res = await fetch('/api/boards');
    if (!res.ok) return [];
    const data = await res.json();
    return data.boards || [];
  },

  async createBoard(name: string, description?: string, coverImage?: string): Promise<Board> {
    const res = await fetch('/api/boards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, coverImage }),
    });
    if (!res.ok) throw new Error('Failed to create board');
    const data = await res.json();
    return data.board;
  },

  async addPinToBoard(boardId: string, productId: string): Promise<Board> {
    const res = await fetch(`/api/boards/${boardId}/pins`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId }),
    });
    if (!res.ok) throw new Error('Failed to add pin to board');
    const data = await res.json();
    return data.board;
  },

  // ==========================================
  // ADMIN-ONLY API CLIENT METHODS
  // ==========================================

  // Persistent Image Upload
  async uploadImage(imageBase64: string, filename?: string, mimeType?: string): Promise<{ imageUrl: string }> {
    const res = await fetch('/api/admin/upload-image', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ imageBase64, filename, mimeType }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Image upload failed' }));
      throw new Error(err.error || 'Failed to upload image');
    }
    return res.json();
  },

  // AI Smart Product Auto-Enrichment
  async enrichProductLink(url?: string, rawText?: string): Promise<Partial<Product>> {
    const res = await fetch('/api/admin/enrich-link', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ url, rawText }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'AI link analysis failed' }));
      throw new Error(err.error || 'Failed to auto-enrich product link');
    }
    const data = await res.json();
    return data.enriched;
  },

  // AI SEO Product Description Generator
  async generateAiDescription(params: {
    title?: string;
    imageUrl?: string;
    category?: string;
    brand?: string;
    retailer?: string;
    keywords?: string;
    tone?: string;
  }): Promise<{
    shortDescription: string;
    detailedDescription: string;
    keyHighlights: string[];
    seoKeywords: string[];
  }> {
    const res = await fetch('/api/admin/generate-description', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'AI description generation failed' }));
      throw new Error(err.error || 'Failed to generate AI description');
    }
    return res.json();
  },

  async getAdminProducts(params?: {
    search?: string;
    category?: string;
    status?: string;
    sort?: string;
    page?: number;
    limit?: number;
  }): Promise<Product[]> {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.category) query.append('category', params.category);
    if (params?.status) query.append('status', params.status);
    if (params?.sort) query.append('sort', params.sort);
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));

    const res = await fetch(`/api/admin/products?${query.toString()}`, { headers: authHeaders() });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        throw new Error('Access denied: Administrator authorization required');
      }
      throw new Error('Failed to fetch admin products');
    }
    const data = await res.json();
    return data.products || [];
  },

  async createProduct(productData: Partial<Product>): Promise<Product> {
    const res = await fetch('/api/admin/products', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(productData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Product creation failed' }));
      throw new Error(err.error || 'Failed to create product');
    }
    const data = await res.json();
    return data.product;
  },

  async updateProduct(id: string, productData: Partial<Product>): Promise<Product> {
    const res = await fetch(`/api/admin/products/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(productData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Product update failed' }));
      throw new Error(err.error || 'Failed to update product');
    }
    const data = await res.json();
    return data.product;
  },

  async updateProductStatus(id: string, status: ProductStatus): Promise<Product> {
    const res = await fetch(`/api/admin/products/${id}/status`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Status update failed' }));
      throw new Error(err.error || 'Failed to update status');
    }
    const data = await res.json();
    return data.product;
  },

  async duplicateProduct(id: string): Promise<Product> {
    const res = await fetch(`/api/admin/products/${id}/duplicate`, {
      method: 'POST',
      headers: authHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Duplication failed' }));
      throw new Error(err.error || 'Failed to duplicate product');
    }
    const data = await res.json();
    return data.product;
  },

  async bulkUpdateProducts(action: string, productIds: string[]): Promise<{ count: number }> {
    const res = await fetch('/api/admin/products/bulk', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ action, productIds }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Bulk update failed' }));
      throw new Error(err.error || 'Failed to perform bulk operation');
    }
    return res.json();
  },

  async deleteProduct(id: string): Promise<void> {
    const res = await fetch(`/api/admin/products/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Delete failed' }));
      throw new Error(err.error || 'Failed to delete product');
    }
  },

  // Admin Categories
  async getAdminCategories(): Promise<(Category & { totalProducts: number; publishedProducts: number })[]> {
    const res = await fetch('/api/admin/categories', { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to load categories');
    const data = await res.json();
    return data.categories || [];
  },

  async createCategory(data: Partial<Category>): Promise<Category> {
    const res = await fetch('/api/admin/categories', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to create category' }));
      throw new Error(err.error || 'Failed to create category');
    }
    const resData = await res.json();
    return resData.category;
  },

  async updateCategory(id: string, data: Partial<Category>): Promise<Category> {
    const res = await fetch(`/api/admin/categories/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to update category' }));
      throw new Error(err.error || 'Failed to update category');
    }
    const resData = await res.json();
    return resData.category;
  },

  async deleteCategory(id: string): Promise<void> {
    const res = await fetch(`/api/admin/categories/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to delete category' }));
      throw new Error(err.error || 'Failed to delete category');
    }
  },

  // Admin Users
  async getAdminUsers(): Promise<User[]> {
    const res = await fetch('/api/admin/users', { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to fetch users');
    const data = await res.json();
    return data.users || [];
  },

  async createAdminUser(userData: { email: string; name: string; role: UserRole; password: string }): Promise<User> {
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(userData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to create user' }));
      throw new Error(err.error || 'Failed to create user');
    }
    const data = await res.json();
    return data.user;
  },

  async updateUserRole(id: string, role: UserRole): Promise<void> {
    const res = await fetch(`/api/admin/users/${id}/role`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ role }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to update user role' }));
      throw new Error(err.error || 'Failed to update user role');
    }
  },

  async deleteUser(id: string): Promise<void> {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to delete user' }));
      throw new Error(err.error || 'Failed to delete user');
    }
  },

  // Admin Audit Logs
  async getAuditLogs(): Promise<AuditLog[]> {
    const res = await fetch('/api/admin/audit-logs', { headers: authHeaders() });
    if (!res.ok) return [];
    const data = await res.json();
    return data.logs || [];
  },

  // Admin Settings
  async getAdminSettings(): Promise<PlatformSettings> {
    const res = await fetch('/api/admin/settings', { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to load admin settings');
    const data = await res.json();
    return data.settings;
  },

  async updateAdminSettings(settings: Partial<PlatformSettings>): Promise<PlatformSettings> {
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(settings),
    });
    if (!res.ok) throw new Error('Failed to update settings');
    const data = await res.json();
    return data.settings;
  },

  async exportCatalog(): Promise<any> {
    const res = await fetch('/api/admin/export-catalog', { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to export catalog');
    return res.json();
  },

  async importCatalog(products: Partial<Product>[], replaceExisting: boolean = false): Promise<{ importedCount: number; totalCatalogCount: number }> {
    const res = await fetch('/api/admin/import-catalog', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ products, replaceExisting }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Catalog import failed' }));
      throw new Error(err.error || 'Failed to import catalog');
    }
    return res.json();
  },

  // Analytics
  async getAdminAnalytics(): Promise<AdminAnalyticsSummary> {
    const res = await fetch('/api/admin/analytics', { headers: authHeaders() });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        throw new Error('Access denied: Administrator authorization required');
      }
      throw new Error('Failed to fetch analytics');
    }
    return res.json();
  },

  async clearAllAdminData(): Promise<void> {
    const res = await fetch('/api/admin/clear-data', {
      method: 'POST',
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Failed to clear data');
  },

  // Pinterest API & Cross-Platform Sync
  async getPinterestAuthUrl(): Promise<{ url: string; redirectUri: string; clientIdConfigured: boolean }> {
    const res = await fetch('/api/pinterest/auth/url', { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to retrieve Pinterest authorization URL');
    return res.json();
  },

  async getPinterestStatus(): Promise<PinterestSyncState> {
    try {
      const res = await fetch('/api/admin/pinterest/status', { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to get Pinterest status');
      return res.json();
    } catch {
      return {
        isConnected: false,
        profile: null,
        syncedBoards: [],
        autoSyncOnPublish: false,
        totalPinsExported: 0,
      };
    }
  },

  async connectPinterestDemo(): Promise<PinterestSyncState> {
    const res = await fetch('/api/admin/pinterest/connect-demo', {
      method: 'POST',
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Failed to connect demo Pinterest account');
    return res.json();
  },

  async disconnectPinterest(): Promise<void> {
    const res = await fetch('/api/admin/pinterest/disconnect', {
      method: 'POST',
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Failed to disconnect Pinterest account');
  },

  async getPinterestBoards(): Promise<PinterestBoardItem[]> {
    const res = await fetch('/api/admin/pinterest/boards', { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to fetch Pinterest boards');
    const data = await res.json();
    return data.boards || [];
  },

  async createPinterestBoard(name: string, description?: string, privacy: 'PUBLIC' | 'SECRET' = 'PUBLIC'): Promise<PinterestBoardItem> {
    const res = await fetch('/api/admin/pinterest/boards', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ name, description, privacy }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to create board' }));
      throw new Error(err.error || 'Failed to create board');
    }
    const data = await res.json();
    return data.board;
  },

  async exportProductToPinterest(params: {
    productId: string;
    boardId: string;
    customTitle?: string;
    customNote?: string;
  }): Promise<{ success: boolean; pinId: string; pinUrl: string; product: Product }> {
    const res = await fetch('/api/admin/pinterest/export-pin', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Export to Pinterest failed' }));
      throw new Error(err.error || 'Failed to export Pin to Pinterest');
    }
    return res.json();
  },

  async bulkExportToPinterest(params: {
    productIds: string[];
    boardId: string;
  }): Promise<{ success: boolean; exportedCount: number; exportedPins: { id: string; url: string; name: string }[] }> {
    const res = await fetch('/api/admin/pinterest/bulk-export', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Bulk export failed' }));
      throw new Error(err.error || 'Failed to export pins in bulk');
    }
    return res.json();
  },

  async updatePinterestSettings(settings: {
    defaultBoardId?: string;
    autoSyncOnPublish?: boolean;
  }): Promise<PinterestSyncState> {
    const res = await fetch('/api/admin/pinterest/settings', {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(settings),
    });
    if (!res.ok) throw new Error('Failed to update Pinterest settings');
    return res.json();
  },

  // ==========================================
  // LINK HEALTH SCANNER & DEAD LINK CHECKER
  // ==========================================
  async checkLinkHealth(): Promise<import('../types').LinkHealthReport> {
    const res = await fetch('/api/admin/check-links', {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Failed to scan affiliate links');
    return res.json();
  },

  async fixAffiliateLink(productId: string, newAffiliateLink?: string): Promise<{ success: boolean; product: Product }> {
    const res = await fetch('/api/admin/fix-link', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ productId, newAffiliateLink }),
    });
    if (!res.ok) throw new Error('Failed to fix affiliate link');
    return res.json();
  },

  // ==========================================
  // AI VISUAL FIND SIMILAR
  // ==========================================
  async findSimilarProducts(params: {
    productId?: string;
    category?: string;
    tags?: string[];
    name?: string;
    shortDescription?: string;
  }): Promise<{
    similarProducts: Product[];
    sourceProduct?: Product;
    matchDetails?: { id: string; score: number; explanation: string }[];
  }> {
    const res = await fetch('/api/products/find-similar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) return { similarProducts: [] };
    return res.json();
  },

  // ==========================================
  // SMART UTM & SUB-ID SETTINGS
  // ==========================================
  async getUtmSettings(): Promise<import('../types').UtmSettings> {
    const res = await fetch('/api/admin/utm-settings', {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load UTM settings');
    const data = await res.json();
    return data.utmSettings;
  },

  async updateUtmSettings(settings: import('../types').UtmSettings): Promise<import('../types').UtmSettings> {
    const res = await fetch('/api/admin/utm-settings', {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(settings),
    });
    if (!res.ok) throw new Error('Failed to save UTM settings');
    const data = await res.json();
    return data.utmSettings;
  },

  // ==========================================
  // TRAFFIC & VISITOR ANALYTICS APIS
  // ==========================================
  async trackPageView(params: {
    path: string;
    referrer?: string;
    visitorId?: string;
    deviceType?: 'desktop' | 'mobile' | 'tablet';
  }): Promise<{ success: boolean; id?: string }> {
    try {
      const res = await fetch('/api/traffic/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (!res.ok) return { success: false };
      return res.json();
    } catch {
      return { success: false };
    }
  },

  async getAdminTrafficStats(): Promise<import('../types').AdminTrafficStats> {
    const res = await fetch('/api/admin/traffic', {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load visitor traffic statistics');
    return res.json();
  },

  // ==========================================
  // REAL-TIME PRICE & CARD DISCOUNT INTELLIGENCE
  // ==========================================
  async fetchProductIntelligence(affiliateUrl: string): Promise<{
    name: string;
    shortDescription?: string;
    imageUrl?: string;
    currentPrice?: number;
    originalPrice?: number;
    currency: string;
    discountPercentage?: number;
    retailer: string;
    brand?: string;
    availability: 'IN_STOCK' | 'OUT_OF_STOCK' | 'PREORDER' | 'UNKNOWN';
    offers: PaymentOffer[];
    bestOffer: BestOfferSummary | null;
    verifiedAt: string;
    affiliateUrl: string;
    source: string;
  }> {
    const res = await fetch('/api/admin/fetch-product', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ affiliateUrl }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to analyze product URL' }));
      throw new Error(err.error || 'Failed to analyze product URL');
    }
    return res.json();
  },

  async refreshProductPrice(productId: string): Promise<{
    success: boolean;
    product: Product;
    priceChanged: boolean;
    priceDifference: number;
    previousPrice?: number;
  }> {
    const res = await fetch(`/api/admin/refresh-product/${productId}`, {
      method: 'POST',
      headers: authHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to refresh product' }));
      throw new Error(err.error || 'Failed to refresh product');
    }
    return res.json();
  },

  async refreshAllProductsPrice(): Promise<{
    total: number;
    updated: number;
    priceDrops: number;
    errors: number;
    results: any[];
  }> {
    const res = await fetch('/api/admin/refresh-all-products', {
      method: 'POST',
      headers: authHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to batch refresh products' }));
      throw new Error(err.error || 'Failed to batch refresh products');
    }
    return res.json();
  },

  async updateProductOffers(productId: string, offers: PaymentOffer[]): Promise<{
    product: Product;
    offers: PaymentOffer[];
    bestOffer: BestOfferSummary | null;
  }> {
    const res = await fetch(`/api/admin/products/${productId}/offers`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ offers }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to update product offers' }));
      throw new Error(err.error || 'Failed to update product offers');
    }
    return res.json();
  },

  async refreshProductOffers(productId: string): Promise<{
    success: boolean;
    product: Product;
    priceChanged: boolean;
    priceDifference: number;
    previousPrice?: number;
    offersCount: number;
    bestOffer: BestOfferSummary | null;
  }> {
    const res = await fetch(`/api/admin/products/${productId}/refresh-offers`, {
      method: 'POST',
      headers: authHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to refresh product offers' }));
      throw new Error(err.error || 'Failed to refresh product offers');
    }
    return res.json();
  },

  async getPriceSyncStatus(): Promise<import('../types').PriceSyncStatus> {
    const res = await fetch('/api/admin/price-sync/status', {
      headers: authHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to get price sync status' }));
      throw new Error(err.error || 'Failed to get price sync status');
    }
    return res.json();
  },

  async updatePriceSyncSettings(enabled: boolean, intervalMinutes: number): Promise<import('../types').PriceSyncStatus> {
    const res = await fetch('/api/admin/price-sync/settings', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ enabled, intervalMinutes }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to update price sync settings' }));
      throw new Error(err.error || 'Failed to update price sync settings');
    }
    return res.json();
  },

  async triggerPriceSync(): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/admin/price-sync/trigger', {
      method: 'POST',
      headers: authHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to trigger background price sync' }));
      throw new Error(err.error || 'Failed to trigger background price sync');
    }
    return res.json();
  },
};
