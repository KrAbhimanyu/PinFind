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

export interface LookTag {
  id: string;
  label: string;
  price?: number;
  xPercent: number; // 0 to 100 on the image
  yPercent: number; // 0 to 100 on the image
  affiliateUrl: string;
  retailer?: string;
}

export type OfferDiscountType = 'PERCENTAGE' | 'FLAT' | 'CASHBACK' | 'EMI_DISCOUNT';
export type CardType = 'CREDIT' | 'DEBIT' | 'ALL' | 'EMI' | 'PAY_LATER' | 'UPI';
export type OfferSource = 'MERCHANT_PAGE' | 'ADMIN_VERIFIED' | 'FEED' | 'SCHEMA_ORG';

export interface PaymentOffer {
  id: string;
  bank: string;
  cardType: CardType;
  paymentMethod: string;
  discountType: OfferDiscountType;
  discountPercentage?: number;
  flatDiscount?: number;
  maximumDiscount?: number;
  minimumTransaction?: number;
  cashback?: number;
  emiRequired?: boolean;
  emiTenure?: string;
  startDate?: string;
  expiryDate?: string;
  terms?: string;
  source: OfferSource;
  verifiedAt: string;
  isActive: boolean;
  eligible?: boolean;
  calculatedDiscount?: number;
  effectivePrice?: number;
  ineligibilityReason?: string;
}

export interface PriceHistoryPoint {
  date: string;
  price: number;
  formattedDate?: string;
}

export interface PriceDropInfo {
  amount: number;
  percentage: number;
  previousPrice: number;
  detectedAt: string;
}

export interface BestOfferSummary {
  offerId: string;
  bank: string;
  cardType: CardType;
  discountText: string;
  discountAmount: number;
  effectivePrice: number;
  cashbackAmount?: number;
  isEmi?: boolean;
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
  currentPrice?: number;
  originalPrice?: number;
  discountPercentage?: number;
  currency?: string;
  availability?: 'IN_STOCK' | 'OUT_OF_STOCK' | 'PREORDER' | 'UNKNOWN';
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
  priceUpdatedAt?: string;
  offersVerifiedAt?: string;
  priceHistory?: PriceHistoryPoint[];
  priceDrop?: PriceDropInfo;
  offers?: PaymentOffer[];
  bestOffer?: BestOfferSummary;
  lookTags?: LookTag[]; // Multi-Product "Shop the Look" hotspot tags
  exportedToPinterest?: boolean;
  pinterestPinId?: string;
  pinterestPinUrl?: string;
  pinterestBoardId?: string;
  pinterestExportedAt?: string;
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
  storeDisclaimer?: string;
  defaultCurrency: string;
  contactEmail: string;
}

export interface PinterestBoardItem {
  id: string;
  name: string;
  description?: string;
  pinCount?: number;
  privacy?: 'PUBLIC' | 'SECRET';
}

export interface PinterestProfile {
  id: string;
  username: string;
  account_type?: string;
  profile_image?: string;
  website_url?: string;
  connectedAt: string;
}

export interface PinterestSyncState {
  isConnected: boolean;
  profile: PinterestProfile | null;
  syncedBoards: PinterestBoardItem[];
  defaultBoardId?: string;
  autoSyncOnPublish: boolean;
  lastSyncedAt?: string;
  totalPinsExported: number;
  redirectUri?: string;
  clientIdConfigured?: boolean;
}

export type SortOption = 'trending' | 'newest' | 'price-asc' | 'price-desc' | 'most-saved' | 'most-clicked' | 'spike';

export type PriceFilter = 
  | 'all' 
  | 'under999' 
  | '1000to2500' 
  | '2500to5000' 
  | 'over5000' 
  | 'under25' 
  | '25to50' 
  | '50to100' 
  | 'over100';

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
  onlyOnSale?: boolean;
  onlyLookTags?: boolean;
  page?: number;
}

export interface WatchlistProduct {
  productId: string;
  addedAt: string;
  initialPrice: number;
  targetPrice?: number;
  currency: string;
  notifyEmail?: string;
  isTriggered?: boolean;
}

export interface LookbookGuide {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  tag?: string;
  maxPrice?: number;
  coverImage: string;
  accentColor: string;
  badge: string;
  featuredProductIds?: string[];
  description: string;
}

export interface LinkCheckResult {
  productId: string;
  productName: string;
  retailer: string;
  affiliateLink: string;
  status: 'healthy' | 'redirect' | 'broken' | 'missing_tag';
  httpCode?: number;
  message: string;
  checkedAt: string;
  suggestedFix?: string;
}

export type LinkHealthItem = LinkCheckResult;

export interface LinkHealthReport {
  totalLinks: number;
  healthyCount: number;
  redirectCount: number;
  brokenCount: number;
  missingTagCount: number;
  results: LinkCheckResult[];
  scannedAt: string;
}

export interface UtmSettings {
  enabled: boolean;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  appendSubId: boolean;
  customAffiliateTags: { [retailer: string]: string };
}


export type ActiveTab = 'discover' | 'boards' | 'admin';

export type AdminSubTab = 
  | 'dashboard'
  | 'price-intelligence'
  | 'traffic'
  | 'products' 
  | 'new' 
  | 'categories' 
  | 'pinterest'
  | 'links'
  | 'affiliates' 
  | 'analytics' 
  | 'users' 
  | 'audit'
  | 'settings';

export interface PriceSyncLogEntry {
  id: string;
  timestamp: string;
  productId: string;
  productName: string;
  oldPrice?: number;
  newPrice?: number;
  priceChanged: boolean;
  priceDifference: number;
  offersCount: number;
  bestOfferHeadline?: string;
  status: 'SUCCESS' | 'PRICE_DROP' | 'UNCHANGED' | 'ERROR';
  errorMessage?: string;
}

export interface PriceSyncStatus {
  enabled: boolean;
  intervalMinutes: number;
  lastRunAt?: string;
  nextRunAt?: string;
  isRunning: boolean;
  totalSyncs: number;
  totalPriceDropsDetected: number;
  recentLogs: PriceSyncLogEntry[];
}

export interface PageViewEvent {
  id: string;
  path: string;
  referrer: string;
  visitorId: string;
  timestamp: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  userAgent?: string;
}

export interface DailyTrafficItem {
  date: string;
  pageViews: number;
  uniqueVisitors: number;
}

export interface PageTrafficItem {
  path: string;
  views: number;
  percentage: number;
}

export interface AdminTrafficStats {
  totalPageViews: number;
  totalUniqueVisitors: number;
  todayPageViews: number;
  todayUniqueVisitors: number;
  averageViewsPerVisitor: number;
  dailyTraffic: DailyTrafficItem[];
  topPages: PageTrafficItem[];
  trafficByDevice: { [key: string]: number };
  trafficByReferrer: { [key: string]: number };
  recentVisits: PageViewEvent[];
}

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
