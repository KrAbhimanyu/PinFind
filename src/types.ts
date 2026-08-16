export type AspectRatio = 'tall' | 'portrait' | 'square' | 'wide';

export type ProductStatus = 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED' | 'ARCHIVED';

export type UserRole = 'USER' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  token?: string;
  createdAt?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  subcategories: string[];
  createdAt?: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  detailedNotes?: string;
  imageUrl: string;
  aspectRatio: AspectRatio;
  category: string;
  subcategory?: string;
  tags: string[];
  productUrl?: string; // Merchant product page
  affiliateLink: string; // Outbound affiliate link
  retailer: string;
  brand?: string;
  retailerDomain?: string;
  price?: number;
  originalPrice?: number;
  currency?: string;
  isTrending?: boolean;
  isStaffPick?: boolean;
  isFeatured?: boolean;
  clicksGrowth24h?: number;
  hasClickSpike?: boolean;
  clicksCount: number;
  savesCount: number;
  status: ProductStatus;
  createdAt: string;
  updatedAt?: string;
}

export interface ClickEvent {
  id: string;
  productId: string;
  productName: string;
  retailer: string;
  destinationUrl: string;
  timestamp: string;
  referrerLocation: 'card_quick_button' | 'card_hover_button' | 'detail_primary_btn' | 'trending_carousel' | 'related_pin_btn' | 'admin_preview' | 'visit_product_cta';
  deviceType: 'desktop' | 'mobile' | 'tablet';
}

export interface Board {
  id: string;
  name: string;
  description?: string;
  coverImage?: string;
  productIds: string[];
  createdAt: string;
}

export interface AuditLog {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  targetEntity: string;
  targetId?: string;
  details?: string;
  timestamp: string;
}

export interface PlatformSettings {
  platformName: string;
  tagline: string;
  affiliateDisclaimer: string;
  defaultCurrency: string;
  contactEmail: string;
}

export type SortOption = 'trending' | 'newest' | 'price-asc' | 'price-desc' | 'most-saved' | 'most-clicked' | 'spike';

export type PriceFilter = 'all' | 'under25' | '25to50' | '50to100' | 'over100';

export interface FilterState {
  search: string;
  category: string;
  subcategory?: string;
  tag: string | null;
  retailer: string;
  sortBy: SortOption;
  priceRange: PriceFilter;
  onlyTrending: boolean;
  onlyStaffPicks: boolean;
  onlySpikes?: boolean;
  page?: number;
}

export type ActiveTab = 'discover' | 'boards' | 'admin';

export type AdminSubTab = 
  | 'dashboard'
  | 'products' 
  | 'new' 
  | 'categories' 
  | 'affiliates' 
  | 'analytics' 
  | 'users' 
  | 'audit'
  | 'settings';

export interface AdminAnalyticsSummary {
  totalClicks: number;
  uniqueProductsClicked: number;
  clicks: ClickEvent[];
  clicksByDevice: { [key: string]: number };
  clicksByRetailer: { [key: string]: number };
  hourlyClicks: { hour: string; clicks: number }[];
  topProducts: { id: string; name: string; clicks: number; retailer: string; affiliateLink?: string }[];
  topCategories: { category: string; clicks: number }[];
  message?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
