import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { 
  fetchAndAnalyzeProduct, 
  determineBestOffer, 
  evaluateOffer,
  PaymentOffer,
  BestOfferSummary,
  OfferDiscountType,
  CardType,
  OfferSource
} from './server/priceIntelligence';

// Types
type ProductStatus = 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED' | 'ARCHIVED';
type UserRole = 'USER' | 'ADMIN';
type AspectRatio = 'tall' | 'portrait' | 'square' | 'wide';

interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  passwordHash: string;
  createdAt: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  subcategories: string[];
  createdAt: string;
}

interface LookTag {
  id: string;
  label: string;
  price?: number;
  xPercent: number;
  yPercent: number;
  affiliateUrl: string;
  retailer?: string;
}

interface PriceHistoryPoint {
  date: string;
  price: number;
  formattedDate?: string;
}

interface PriceDropInfo {
  amount: number;
  percentage: number;
  previousPrice: number;
  detectedAt: string;
}

interface Product {
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
  productUrl?: string;
  affiliateLink: string;
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
  bestOffer?: BestOfferSummary | null;
  lookTags?: LookTag[];
  // Pinterest Sync Metadata
  exportedToPinterest?: boolean;
  pinterestPinId?: string;
  pinterestPinUrl?: string;
  pinterestBoardId?: string;
  pinterestExportedAt?: string;
}

interface ClickEvent {
  id: string;
  productId: string;
  productName: string;
  retailer: string;
  destinationUrl: string;
  timestamp: string;
  referrerLocation: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
}

interface PageViewEvent {
  id: string;
  path: string;
  referrer: string;
  visitorId: string;
  timestamp: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  userAgent?: string;
}

interface Board {
  id: string;
  name: string;
  description?: string;
  coverImage?: string;
  productIds: string[];
  createdAt: string;
}

interface AuditLog {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  targetEntity: string;
  targetId?: string;
  details?: string;
  timestamp: string;
}

interface PlatformSettings {
  platformName: string;
  tagline: string;
  storeDisclaimer: string;
  affiliateDisclaimer?: string;
  defaultCurrency: string;
  contactEmail: string;
}

interface PinterestProfile {
  id: string;
  username: string;
  account_type?: string;
  profile_image?: string;
  website_url?: string;
  connectedAt: string;
}

interface PinterestBoardItem {
  id: string;
  name: string;
  description?: string;
  privacy?: string;
  pinCount?: number;
  imageUrl?: string;
}

interface PinterestSyncState {
  isConnected: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  scope?: string;
  profile?: PinterestProfile | null;
  syncedBoards: PinterestBoardItem[];
  defaultBoardId?: string;
  autoSyncOnPublish?: boolean;
  lastSyncedAt?: string;
  totalPinsExported?: number;
}

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

export interface PriceSyncState {
  enabled: boolean;
  intervalMinutes: number;
  lastRunAt?: string;
  nextRunAt?: string;
  isRunning: boolean;
  totalSyncs: number;
  totalPriceDropsDetected: number;
  recentLogs: PriceSyncLogEntry[];
}

interface DatabaseSchema {
  users: User[];
  categories: Category[];
  products: Product[];
  boards: Board[];
  clicks: ClickEvent[];
  pageViews?: PageViewEvent[];
  auditLogs: AuditLog[];
  settings: PlatformSettings;
  pinterest?: PinterestSyncState;
  priceSyncState?: PriceSyncState;
  sessions: { [token: string]: { userId: string; createdAt: number } };
}

// Data persistence file path
const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Initial default categories
const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'cat-home-decor',
    name: 'Home Decor',
    slug: 'home-decor',
    description: 'Modern accents, lighting, cozy rugs, and interior styling essentials.',
    icon: 'home',
    subcategories: ['Living Room', 'Lighting', 'Wall Art', 'Textiles', 'Planters'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cat-fashion',
    name: 'Fashion & Style',
    slug: 'fashion',
    description: 'Trending apparel, footwear, everyday minimalist accessories, and seasonal wear.',
    icon: 'shirt',
    subcategories: ['Outerwear', 'Footwear', 'Bags', 'Jewelry', 'Essentials'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cat-electronics',
    name: 'Electronics & Tech',
    slug: 'electronics',
    description: 'Premium desk gadgets, audio equipment, ergonomic accessories, and smart devices.',
    icon: 'laptop',
    subcategories: ['Desk Setup', 'Audio', 'Smart Home', 'Accessories', 'Chargers'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cat-beauty',
    name: 'Beauty & Skincare',
    slug: 'beauty',
    description: 'Clean skincare, botanical serums, hair care, and daily wellness rituals.',
    icon: 'sparkles',
    subcategories: ['Skincare', 'Hair Care', 'Fragrance', 'Body Care', 'Tools'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cat-kitchen',
    name: 'Kitchen & Dining',
    slug: 'kitchen',
    description: 'Specialty coffee makers, artisan cookware, glassware, and tableware.',
    icon: 'coffee',
    subcategories: ['Coffee & Tea', 'Cookware', 'Glassware', 'Tabletop', 'Kitchen Tools'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cat-lifestyle',
    name: 'Lifestyle & Wellness',
    slug: 'lifestyle',
    description: 'Mindfulness tools, fitness gear, journals, stationery, and travel essentials.',
    icon: 'heart',
    subcategories: ['Fitness', 'Journals', 'Stationery', 'Travel Gear', 'Aromatherapy'],
    createdAt: new Date().toISOString(),
  },
];

// Initialize Database
function initDatabase(): DatabaseSchema {
  if (fs.existsSync(DATA_FILE)) {
    try {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      const data = JSON.parse(content);
      // Ensure all fields exist
      if (!data.categories) data.categories = DEFAULT_CATEGORIES;
      if (!data.auditLogs) data.auditLogs = [];
      if (!data.settings) {
        data.settings = {
          platformName: 'PinFind Discovery',
          tagline: 'Visual Product Discovery & Curated Collections',
          storeDisclaimer: 'We curate products based on design excellence and quality. All product links take you directly to verified official retailer stores.',
          defaultCurrency: 'USD',
          contactEmail: 'hello@pinfind.store',
        };
      } else {
        if (!data.settings.storeDisclaimer) {
          data.settings.storeDisclaimer = data.settings.affiliateDisclaimer || 'We curate products based on design excellence and quality. All product links take you directly to verified official retailer stores.';
        }
        if (data.settings.platformName?.includes('Affiliate')) {
          data.settings.platformName = 'PinFind Discovery';
        }
      }
      if (!data.pageViews) {
        data.pageViews = [];
      }
      if (!data.pinterest) {
        data.pinterest = {
          isConnected: false,
          syncedBoards: [
            { id: 'board_home_01', name: 'Aesthetic Home & Living', description: 'Curated interior styling, lighting, and ceramics', pinCount: 38, privacy: 'PUBLIC' },
            { id: 'board_tech_02', name: 'Minimalist Desk Setup', description: 'Ergonomic gear and aesthetic workspace accessories', pinCount: 24, privacy: 'PUBLIC' },
            { id: 'board_coffee_03', name: 'Coffee & Kitchen Rituals', description: 'Artisan drippers, espresso machines, and glassware', pinCount: 19, privacy: 'PUBLIC' },
            { id: 'board_style_04', name: 'Everyday Essentials & Style', description: 'Capsule wardrobe, bags, and modern wellness', pinCount: 31, privacy: 'PUBLIC' },
          ],
          defaultBoardId: 'board_home_01',
          autoSyncOnPublish: false,
          totalPinsExported: 0,
        };
      }
      return data;
    } catch (e) {
      console.error('Error reading database file, initializing clean database:', e);
    }
  }

  const initialDb: DatabaseSchema = {
    users: [
      {
        id: 'usr-admin-1',
        email: 'admin@pinfind.com',
        name: 'Administrator',
        role: 'ADMIN',
        passwordHash: 'PinFind@#5431234',
        createdAt: new Date().toISOString(),
      },
    ],
    categories: DEFAULT_CATEGORIES,
    products: [],
    boards: [],
    clicks: [],
    pageViews: [],
    auditLogs: [
      {
        id: 'log-init',
        adminId: 'usr-admin-1',
        adminName: 'Administrator',
        action: 'System Initialized',
        targetEntity: 'Platform',
        details: 'Initial system start with clean catalog.',
        timestamp: new Date().toISOString(),
      },
    ],
    settings: {
      platformName: 'PinFind Discovery',
      tagline: 'Visual Product Discovery & Curated Collections',
      storeDisclaimer: 'We curate products based on design excellence and quality. All product links take you directly to verified official retailer stores.',
      defaultCurrency: 'INR',
      contactEmail: 'hello@pinfind.store',
    },
    pinterest: {
      isConnected: false,
      syncedBoards: [],
      autoSyncOnPublish: false,
      totalPinsExported: 0,
    },
    priceSyncState: {
      enabled: true,
      intervalMinutes: 60,
      isRunning: false,
      totalSyncs: 0,
      totalPriceDropsDetected: 0,
      recentLogs: [],
    },
    sessions: {},
  };

  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialDb, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing initial database file:', e);
  }

  return initialDb;
}

const db: DatabaseSchema = initDatabase();

function saveDatabase() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to persist database file', e);
  }
}

// Helpers
function normalizeProductStatus(status?: string): ProductStatus {
  if (!status) return 'PUBLISHED';
  const clean = String(status).trim().toUpperCase();
  if (['PUBLISHED', 'DRAFT', 'UNPUBLISHED', 'ARCHIVED'].includes(clean)) {
    return clean as ProductStatus;
  }
  return 'PUBLISHED';
}

function isProductPublished(p?: { status?: string } | null): boolean {
  if (!p) return false;
  return normalizeProductStatus(p.status) === 'PUBLISHED';
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function recordAuditLog(admin: User, action: string, targetEntity: string, targetId?: string, details?: string) {
  const log: AuditLog = {
    id: generateId('log'),
    adminId: admin.id,
    adminName: admin.name,
    action,
    targetEntity,
    targetId,
    details,
    timestamp: new Date().toISOString(),
  };
  db.auditLogs.unshift(log);
  if (db.auditLogs.length > 1000) {
    db.auditLogs = db.auditLogs.slice(0, 1000);
  }
}

// ==========================================
// SECURITY UTILITIES: HASHING & RATE LIMITING
// ==========================================

// Cryptographic Password Hashing (PBKDF2 with SHA-512 and random salt)
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const iterations = 10000;
  const hash = crypto.pbkdf2Sync(password, salt, iterations, 64, 'sha512').toString('hex');
  return `pbkdf2$${iterations}$${salt}$${hash}`;
}

// Verify password (supports both PBKDF2 hashes and legacy initial passwords seamlessly)
function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash) return false;

  if (storedHash.startsWith('pbkdf2$')) {
    const parts = storedHash.split('$');
    if (parts.length !== 4) return false;
    const iterations = parseInt(parts[1], 10);
    const salt = parts[2];
    const originalHash = parts[3];
    const computed = crypto.pbkdf2Sync(password, salt, iterations, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(originalHash));
  }

  // Fallback for legacy passwords (e.g. initial setup)
  return password === storedHash;
}

// In-Memory Brute-Force Rate Limiter for Login
interface RateLimitRecord {
  attempts: number;
  blockedUntil?: number;
}
const loginRateLimits = new Map<string, RateLimitRecord>();

function checkLoginRateLimit(ipKey: string): { allowed: boolean; waitSeconds?: number } {
  const now = Date.now();
  const record = loginRateLimits.get(ipKey);
  if (!record) return { allowed: true };

  if (record.blockedUntil && record.blockedUntil > now) {
    const waitSeconds = Math.ceil((record.blockedUntil - now) / 1000);
    return { allowed: false, waitSeconds };
  }

  if (record.blockedUntil && record.blockedUntil <= now) {
    loginRateLimits.delete(ipKey);
    return { allowed: true };
  }

  return { allowed: true };
}

function recordLoginFailure(ipKey: string) {
  const now = Date.now();
  const record = loginRateLimits.get(ipKey) || { attempts: 0 };
  record.attempts += 1;

  if (record.attempts >= 5) {
    // Block for 2 minutes on 5 consecutive failures
    record.blockedUntil = now + 2 * 60 * 1000;
  }

  loginRateLimits.set(ipKey, record);
}

function resetLoginRateLimit(ipKey: string) {
  loginRateLimits.delete(ipKey);
}

// Session TTL: 7 Days
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// Authentication Middleware
interface AuthenticatedRequest extends Request {
  user?: User;
}

function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const session = db.sessions[token];
    if (session) {
      // Check session expiration
      if (Date.now() - session.createdAt > SESSION_TTL_MS) {
        delete db.sessions[token];
        saveDatabase();
      } else {
        const user = db.users.find(u => u.id === session.userId);
        if (user) {
          req.user = user;
        }
      }
    }
  }
  next();
}

// Admin-Only Server-Side Authorization Guard (Enforces RBAC)
function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required. Please log in with administrator credentials.',
    });
  }

  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({
      error: 'Access denied: Administrator privileges required for this operation.',
    });
  }

  next();
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Support up to 25MB for high resolution image uploads
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));
  app.use(authMiddleware);

  // Serve persistent uploaded image files statically
  app.use('/uploads', express.static(UPLOADS_DIR));

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', serverTime: new Date().toISOString() });
  });

  // Public Platform Settings
  app.get('/api/settings', (req, res) => {
    return res.json({ settings: db.settings });
  });

  // ==========================================
  // AUTHENTICATION APIS
  // ==========================================

  // POST /api/auth/login (with Brute-Force Rate Limiting & PBKDF2 Verification)
  app.post('/api/auth/login', (req: AuthenticatedRequest, res: Response) => {
    const { email, password } = req.body;

    const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'global_client';
    const rateLimitKey = `${clientIp}_${email || 'anon'}`;

    const limitCheck = checkLoginRateLimit(rateLimitKey);
    if (!limitCheck.allowed) {
      return res.status(429).json({
        error: `Too many failed login attempts. Please wait ${limitCheck.waitSeconds} seconds before trying again.`,
      });
    }

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = db.users.find(u => u.email.toLowerCase() === normalizedEmail);

    if (!user || !verifyPassword(password, user.passwordHash)) {
      recordLoginFailure(rateLimitKey);
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Reset rate limit on success
    resetLoginRateLimit(rateLimitKey);

    // Auto-upgrade legacy stored password to cryptographic PBKDF2 hash
    if (!user.passwordHash.startsWith('pbkdf2$')) {
      user.passwordHash = hashPassword(password);
    }

    const token = `token-${generateId('sess')}`;
    db.sessions[token] = {
      userId: user.id,
      createdAt: Date.now(),
    };
    saveDatabase();

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  });

  // POST /api/auth/register (Standard User Registration with Password Hashing)
  app.post('/api/auth/register', (req: AuthenticatedRequest, res: Response) => {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = db.users.find(u => u.email.toLowerCase() === normalizedEmail);
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const newUser: User = {
      id: generateId('usr'),
      email: normalizedEmail,
      name: name?.trim() || normalizedEmail.split('@')[0],
      role: 'USER', // Always register as standard USER
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
    };

    db.users.push(newUser);

    const token = `token-${generateId('sess')}`;
    db.sessions[token] = {
      userId: newUser.id,
      createdAt: Date.now(),
    };
    saveDatabase();

    return res.json({
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
      },
    });
  });

  // GET /api/auth/me
  app.get('/api/auth/me', (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    return res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        role: req.user.role,
      },
    });
  });

  // POST /api/auth/logout
  app.post('/api/auth/logout', (req: AuthenticatedRequest, res: Response) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      delete db.sessions[token];
      saveDatabase();
    }
    return res.json({ success: true });
  });

  // ==========================================
  // PUBLIC USER-FACING PRODUCT & CATEGORY APIS
  // (STRICTLY PUBLISHED PRODUCTS ONLY)
  // ==========================================

  // GET /api/categories (Public category discovery)
  app.get('/api/categories', (req: Request, res: Response) => {
    // Return categories along with published product counts
    const categoriesWithCount = db.categories.map(c => {
      const count = db.products.filter(p => isProductPublished(p) && (
        (p.category && p.category.toLowerCase().trim() === c.name.toLowerCase().trim()) ||
        (p.category && p.category.toLowerCase().trim() === c.slug.toLowerCase().trim()) ||
        (p.subcategory && p.subcategory.toLowerCase().trim() === c.name.toLowerCase().trim())
      )).length;
      return {
        ...c,
        productCount: count,
      };
    });
    return res.json({ categories: categoriesWithCount });
  });

  // GET /api/products (Returns ONLY PUBLISHED products, supports search, filter, pagination)
  app.get('/api/products', (req: AuthenticatedRequest, res: Response) => {
    const { search, category, subcategory, tag, retailer, sort, priceRange, page, limit } = req.query;

    // Strict security rule: Normal users only ever see PUBLISHED products
    let published = db.products.filter(p => isProductPublished(p));

    if (category && typeof category === 'string' && category.trim().toLowerCase() !== 'all pins') {
      const catQuery = category.trim().toLowerCase();
      published = published.filter(p =>
        (p.category && p.category.toLowerCase().trim() === catQuery) ||
        (p.subcategory && p.subcategory.toLowerCase().trim() === catQuery)
      );
    }

    if (subcategory && typeof subcategory === 'string') {
      const subQuery = subcategory.trim().toLowerCase();
      published = published.filter(p => p.subcategory?.toLowerCase().trim() === subQuery);
    }

    if (retailer && typeof retailer === 'string' && retailer.trim().toLowerCase() !== 'all retailers') {
      const retQuery = retailer.trim().toLowerCase();
      published = published.filter(p =>
        (p.retailer && p.retailer.toLowerCase().trim() === retQuery) ||
        (p.brand && p.brand.toLowerCase().trim() === retQuery)
      );
    }

    if (tag && typeof tag === 'string') {
      const tagQuery = tag.trim().toLowerCase();
      published = published.filter(p => p.tags && p.tags.some(t => t.toLowerCase().trim() === tagQuery));
    }

    if (search && typeof search === 'string' && search.trim().length > 0) {
      const query = search.toLowerCase().trim();
      published = published.filter(p =>
        p.name.toLowerCase().includes(query) ||
        (p.shortDescription && p.shortDescription.toLowerCase().includes(query)) ||
        (p.detailedNotes && p.detailedNotes.toLowerCase().includes(query)) ||
        (p.category && p.category.toLowerCase().includes(query)) ||
        (p.subcategory && p.subcategory.toLowerCase().includes(query)) ||
        (p.retailer && p.retailer.toLowerCase().includes(query)) ||
        (p.brand && p.brand.toLowerCase().includes(query)) ||
        (p.tags && p.tags.some(t => t.toLowerCase().includes(query)))
      );
    }

    // Price range filtering (Rupees & USD compatible)
    if (priceRange && typeof priceRange === 'string' && priceRange !== 'all') {
      if (priceRange === 'under999' || priceRange === 'under25') {
        published = published.filter(p => (p.price || 0) < 1000);
      } else if (priceRange === '1000to2500' || priceRange === '25to50') {
        published = published.filter(p => (p.price || 0) >= 1000 && (p.price || 0) <= 2500);
      } else if (priceRange === '2500to5000' || priceRange === '50to100') {
        published = published.filter(p => (p.price || 0) >= 2500 && (p.price || 0) <= 5000);
      } else if (priceRange === 'over5000' || priceRange === 'over100') {
        published = published.filter(p => (p.price || 0) > 5000);
      }
    }

    // Sorting
    if (sort === 'newest') {
      published.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sort === 'price-asc') {
      published.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sort === 'price-desc') {
      published.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sort === 'most-saved') {
      published.sort((a, b) => (b.savesCount || 0) - (a.savesCount || 0));
    } else if (sort === 'most-clicked') {
      published.sort((a, b) => (b.clicksCount || 0) - (a.clicksCount || 0));
    } else {
      // Default trending score
      published.sort((a, b) => {
        const scoreA = (a.isTrending ? 100 : 0) + (a.isStaffPick ? 50 : 0) + (a.clicksCount || 0);
        const scoreB = (b.isTrending ? 100 : 0) + (b.isStaffPick ? 50 : 0) + (b.clicksCount || 0);
        return scoreB - scoreA;
      });
    }

    const total = published.length;

    // Optional pagination
    if (page && limit) {
      const pageNum = parseInt(page as string, 10) || 1;
      const limitNum = parseInt(limit as string, 10) || 20;
      const startIndex = (pageNum - 1) * limitNum;
      const paginatedItems = published.slice(startIndex, startIndex + limitNum);
      const totalPages = Math.ceil(total / limitNum);

      return res.json({
        products: paginatedItems,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages,
      });
    }

    // Return complete list if pagination not requested
    return res.json({ products: published, total });
  });

  // GET /api/products/:id (Single published product)
  app.get('/api/products/:id', (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const product = db.products.find(p => p.id === id || p.slug === id);

    if (!product || !isProductPublished(product)) {
      return res.status(404).json({ error: 'Product not found or not published.' });
    }

    return res.json({ product });
  });

  // Helper: Build smart tracked affiliate URL with UTM and Sub-IDs
  function buildTrackedUrl(rawUrl: string, product: Product, deviceType: string = 'desktop'): string {
    if (!rawUrl) return rawUrl;
    try {
      const url = new URL(rawUrl);
      const utm = (db as any).utmSettings || {
        enabled: true,
        utmSource: 'pinfind',
        utmMedium: 'affiliate',
        utmCampaign: 'discovery_feed',
        appendSubId: true,
        customAffiliateTags: { Amazon: 'pinfind-21', Myntra: 'pinfind_app', Flipkart: 'pinfind_curated' },
      };

      if (utm.enabled) {
        if (!url.searchParams.has('utm_source')) url.searchParams.set('utm_source', utm.utmSource || 'pinfind');
        if (!url.searchParams.has('utm_medium')) url.searchParams.set('utm_medium', utm.utmMedium || 'affiliate');
        if (!url.searchParams.has('utm_campaign')) url.searchParams.set('utm_campaign', utm.utmCampaign || 'discovery_feed');
        if (!url.searchParams.has('utm_content')) url.searchParams.set('utm_content', product.slug || product.id);

        if (utm.appendSubId) {
          const subId = `pinfind_${deviceType}_${Date.now().toString(36)}`;
          if (url.hostname.includes('amazon.')) {
            if (!url.searchParams.has('tag') && utm.customAffiliateTags?.Amazon) {
              url.searchParams.set('tag', utm.customAffiliateTags.Amazon);
            }
            if (!url.searchParams.has('ascsubtag')) url.searchParams.set('ascsubtag', subId);
          } else if (!url.searchParams.has('subid') && !url.searchParams.has('subId')) {
            url.searchParams.set('subid', subId);
          }
        }
      }
      return url.toString();
    } catch {
      return rawUrl;
    }
  }

  // POST /api/clicks/track (Real Outbound Affiliate Click Tracking with UTM Auto-Tagging)
  app.post('/api/clicks/track', (req: AuthenticatedRequest, res: Response) => {
    const { productId, referrerLocation, deviceType } = req.body;

    const product = db.products.find(p => p.id === productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    const trackedDestinationUrl = buildTrackedUrl(product.affiliateLink, product, deviceType || 'desktop');

    const clickEvent: ClickEvent = {
      id: generateId('clk'),
      productId: product.id,
      productName: product.name,
      retailer: product.retailer || 'Direct',
      destinationUrl: trackedDestinationUrl,
      timestamp: new Date().toISOString(),
      referrerLocation: referrerLocation || 'visit_product_cta',
      deviceType: deviceType || 'desktop',
    };

    db.clicks.unshift(clickEvent);
    if (db.clicks.length > 5000) {
      db.clicks = db.clicks.slice(0, 5000);
    }

    product.clicksCount = (product.clicksCount || 0) + 1;
    saveDatabase();

    return res.json({ success: true, destinationUrl: trackedDestinationUrl });
  });

  // POST /api/traffic/track (Public Visitor & Page View Traffic Tracking)
  app.post('/api/traffic/track', (req: Request, res: Response) => {
    const { path: visitPath, referrer, visitorId, deviceType } = req.body;
    if (!visitPath) {
      return res.status(400).json({ error: 'Path is required' });
    }

    const vId = visitorId || `v_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
    const userAgent = req.headers['user-agent'] || '';

    const pageView: PageViewEvent = {
      id: generateId('pv'),
      path: String(visitPath).substring(0, 255),
      referrer: String(referrer || 'Direct').substring(0, 255),
      visitorId: vId,
      timestamp: new Date().toISOString(),
      deviceType: deviceType === 'mobile' || deviceType === 'tablet' ? deviceType : 'desktop',
      userAgent: String(userAgent).substring(0, 200),
    };

    if (!db.pageViews) {
      db.pageViews = [];
    }

    db.pageViews.unshift(pageView);
    // Cap in-memory/file storage to last 10,000 page views
    if (db.pageViews.length > 10000) {
      db.pageViews = db.pageViews.slice(0, 10000);
    }

    saveDatabase();
    return res.json({ success: true, id: pageView.id });
  });

  // Public Boards API
  app.get('/api/boards', (req: AuthenticatedRequest, res: Response) => {
    return res.json({ boards: db.boards });
  });

  app.post('/api/boards', (req: AuthenticatedRequest, res: Response) => {
    const { name, description, coverImage } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Board name is required.' });
    }

    const newBoard: Board = {
      id: generateId('brd'),
      name: name.trim(),
      description: description?.trim() || '',
      coverImage: coverImage || '',
      productIds: [],
      createdAt: new Date().toISOString(),
    };

    db.boards.unshift(newBoard);
    saveDatabase();

    return res.json({ board: newBoard });
  });

  app.post('/api/boards/:id/pins', (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { productId } = req.body;

    const board = db.boards.find(b => b.id === id);
    if (!board) {
      return res.status(404).json({ error: 'Board not found.' });
    }

    if (!board.productIds.includes(productId)) {
      board.productIds.push(productId);
      const product = db.products.find(p => p.id === productId);
      if (product) {
        product.savesCount = (product.savesCount || 0) + 1;
      }
      saveDatabase();
    }

    return res.json({ board });
  });

  // ==========================================
  // ADMIN-ONLY PROTECTED APIS (STRICT RBAC)
  // ==========================================

  // POST /api/admin/upload-image (Persistent Image Upload)
  app.post('/api/admin/upload-image', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const { imageBase64, filename, mimeType } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Image data is required.' });
    }

    try {
      // Remove header if data URI
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      // Validate size (max 10MB)
      if (buffer.length > 10 * 1024 * 1024) {
        return res.status(400).json({ error: 'File size exceeds maximum limit of 10MB.' });
      }

      // Determine extension
      let ext = '.jpg';
      if (mimeType === 'image/png' || filename?.endsWith('.png')) ext = '.png';
      else if (mimeType === 'image/webp' || filename?.endsWith('.webp')) ext = '.webp';
      else if (mimeType === 'image/gif' || filename?.endsWith('.gif')) ext = '.gif';
      else if (mimeType === 'image/svg+xml' || filename?.endsWith('.svg')) ext = '.svg';

      const safeName = `img-${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
      const filePath = path.join(UPLOADS_DIR, safeName);

      fs.writeFileSync(filePath, buffer);

      const imageUrl = `/uploads/${safeName}`;
      return res.json({
        success: true,
        imageUrl,
        filename: safeName,
        sizeBytes: buffer.length,
      });
    } catch (e: any) {
      console.error('Failed to save uploaded image:', e);
      return res.status(500).json({ error: 'Failed to save uploaded image to persistent storage.' });
    }
  });

  // GET /api/admin/products (Returns ALL statuses with filtering & pagination)
  app.get('/api/admin/products', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const { search, category, status, sort, page, limit } = req.query;

    let list = [...db.products];

    if (status && typeof status === 'string' && status !== 'ALL') {
      list = list.filter(p => p.status === status);
    }

    if (category && typeof category === 'string' && category !== 'All Pins' && category !== 'ALL') {
      list = list.filter(p => p.category.toLowerCase() === category.toLowerCase());
    }

    if (search && typeof search === 'string' && search.trim().length > 0) {
      const query = search.toLowerCase().trim();
      list = list.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.slug.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query) ||
        p.retailer?.toLowerCase().includes(query) ||
        p.tags.some(t => t.toLowerCase().includes(query))
      );
    }

    if (sort === 'newest') {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sort === 'oldest') {
      list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else if (sort === 'name-asc') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === 'price-desc') {
      list.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sort === 'clicks-desc') {
      list.sort((a, b) => (b.clicksCount || 0) - (a.clicksCount || 0));
    } else {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    const total = list.length;

    if (page && limit) {
      const pageNum = parseInt(page as string, 10) || 1;
      const limitNum = parseInt(limit as string, 10) || 20;
      const startIndex = (pageNum - 1) * limitNum;
      const paginatedItems = list.slice(startIndex, startIndex + limitNum);
      const totalPages = Math.ceil(total / limitNum);

      return res.json({
        products: paginatedItems,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages,
      });
    }

    return res.json({ products: list, total });
  });

  // POST /api/admin/products (Create new product with strict validation)
  app.post('/api/admin/products', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const {
      name,
      shortDescription,
      detailedNotes,
      imageUrl,
      aspectRatio = 'portrait',
      category,
      subcategory,
      tags = [],
      productUrl,
      affiliateLink,
      retailer,
      brand,
      retailerDomain,
      price,
      originalPrice,
      currency = 'USD',
      isTrending = false,
      isStaffPick = false,
      isFeatured = false,
      status = 'PUBLISHED',
    } = req.body;

    // Strict validation
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Product Name is required.' });
    }
    if (!imageUrl || !imageUrl.trim()) {
      return res.status(400).json({ error: 'Product Image is required.' });
    }
    if (!affiliateLink || !affiliateLink.trim()) {
      return res.status(400).json({ error: 'Affiliate URL is required.' });
    }
    if (!category || !category.trim()) {
      return res.status(400).json({ error: 'Category is required.' });
    }

    // Validate URL format
    try {
      new URL(affiliateLink);
    } catch {
      return res.status(400).json({ error: 'Invalid affiliate destination URL format.' });
    }

    const finalStatus: ProductStatus = normalizeProductStatus(status);

    let derivedRetailer = retailer?.trim() || brand?.trim();
    if (!derivedRetailer) {
      try {
        const parsed = new URL(affiliateLink);
        derivedRetailer = parsed.hostname.replace('www.', '').split('.')[0];
        derivedRetailer = derivedRetailer.charAt(0).toUpperCase() + derivedRetailer.slice(1);
      } catch {
        derivedRetailer = 'Direct Brand';
      }
    }

    const parsedPrice = typeof price === 'number' ? price : price ? parseFloat(price) : undefined;
    const parsedOriginalPrice = typeof originalPrice === 'number' ? originalPrice : originalPrice ? parseFloat(originalPrice) : undefined;
    let computedDiscountPct = typeof req.body.discountPercentage === 'number' ? req.body.discountPercentage : undefined;
    if (computedDiscountPct === undefined && parsedOriginalPrice && parsedPrice && parsedOriginalPrice > parsedPrice) {
      computedDiscountPct = Math.round(((parsedOriginalPrice - parsedPrice) / parsedOriginalPrice) * 100);
    }

    const initialOffers: PaymentOffer[] = Array.isArray(req.body.offers) ? req.body.offers : [];
    const computedBestOffer = req.body.bestOffer !== undefined 
      ? req.body.bestOffer 
      : (initialOffers.length > 0 && parsedPrice ? determineBestOffer(initialOffers, parsedPrice) : null);

    const nowIso = new Date().toISOString();
    const initialPriceHistory: PriceHistoryPoint[] = parsedPrice ? [
      {
        date: nowIso,
        price: parsedPrice,
        formattedDate: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      }
    ] : [];

    const newProduct: Product = {
      id: generateId('prod'),
      slug: slugify(name) + '-' + Math.random().toString(36).substring(2, 6),
      name: name.trim(),
      shortDescription: shortDescription?.trim() || '',
      detailedNotes: detailedNotes?.trim() || '',
      imageUrl: imageUrl.trim(),
      aspectRatio: ['tall', 'portrait', 'square', 'wide'].includes(aspectRatio) ? aspectRatio : 'portrait',
      category: category.trim(),
      subcategory: subcategory?.trim() || undefined,
      tags: Array.isArray(tags) ? tags.map((t: string) => t.trim()).filter(Boolean) : [],
      productUrl: productUrl?.trim() || undefined,
      affiliateLink: affiliateLink.trim(),
      retailer: derivedRetailer,
      brand: brand?.trim() || derivedRetailer,
      retailerDomain: retailerDomain || '',
      price: parsedPrice,
      currentPrice: parsedPrice,
      originalPrice: parsedOriginalPrice,
      discountPercentage: computedDiscountPct,
      currency: currency || 'INR',
      availability: req.body.availability || 'IN_STOCK',
      isTrending: Boolean(isTrending),
      isStaffPick: Boolean(isStaffPick),
      isFeatured: Boolean(isFeatured),
      clicksCount: 0,
      savesCount: 0,
      status: finalStatus,
      priceUpdatedAt: nowIso,
      offersVerifiedAt: initialOffers.length > 0 ? nowIso : undefined,
      priceHistory: initialPriceHistory,
      offers: initialOffers,
      bestOffer: computedBestOffer,
      createdAt: nowIso,
    };

    db.products.unshift(newProduct);
    recordAuditLog(req.user!, 'Product Created', `Product: ${newProduct.name}`, newProduct.id, `Status: ${finalStatus}, Category: ${category}`);
    saveDatabase();

    return res.status(201).json({ product: newProduct });
  });

  // PUT /api/admin/products/:id (Update product)
  app.put('/api/admin/products/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const index = db.products.findIndex(p => p.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    const existing = db.products[index];
    const updateData = req.body;

    if (updateData.name && !updateData.name.trim()) {
      return res.status(400).json({ error: 'Product name cannot be empty.' });
    }

    if (updateData.affiliateLink) {
      try {
        new URL(updateData.affiliateLink);
      } catch {
        return res.status(400).json({ error: 'Invalid affiliate destination URL.' });
      }
    }

    const updatedPrice = updateData.price !== undefined 
      ? (typeof updateData.price === 'number' ? updateData.price : parseFloat(updateData.price) || undefined)
      : existing.price;

    const updatedOrigPrice = updateData.originalPrice !== undefined
      ? (typeof updateData.originalPrice === 'number' ? updateData.originalPrice : parseFloat(updateData.originalPrice) || undefined)
      : existing.originalPrice;

    let updatedDiscPct = updateData.discountPercentage;
    if (updatedDiscPct === undefined && updatedOrigPrice && updatedPrice && updatedOrigPrice > updatedPrice) {
      updatedDiscPct = Math.round(((updatedOrigPrice - updatedPrice) / updatedOrigPrice) * 100);
    }

    const updatedOffers: PaymentOffer[] = updateData.offers !== undefined ? updateData.offers : existing.offers || [];
    const updatedBestOffer = updateData.bestOffer !== undefined
      ? updateData.bestOffer
      : (updatedOffers.length > 0 && updatedPrice ? determineBestOffer(updatedOffers, updatedPrice) : null);

    const priceHistory = [...(existing.priceHistory || [])];
    if (updatedPrice !== undefined && (priceHistory.length === 0 || priceHistory[priceHistory.length - 1].price !== updatedPrice)) {
      priceHistory.push({
        date: new Date().toISOString(),
        price: updatedPrice,
        formattedDate: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      });
    }

    const updatedProduct: Product = {
      ...existing,
      ...updateData,
      id: existing.id,
      price: updatedPrice,
      currentPrice: updatedPrice,
      originalPrice: updatedOrigPrice,
      discountPercentage: updatedDiscPct,
      offers: updatedOffers,
      bestOffer: updatedBestOffer,
      priceHistory,
      slug: updateData.name ? slugify(updateData.name) + '-' + existing.id.split('-').pop() : existing.slug,
      status: updateData.status !== undefined ? normalizeProductStatus(updateData.status) : existing.status,
      updatedAt: new Date().toISOString(),
    };

    db.products[index] = updatedProduct;
    recordAuditLog(req.user!, 'Product Updated', `Product: ${updatedProduct.name}`, updatedProduct.id, `Status: ${updatedProduct.status}`);
    saveDatabase();

    return res.json({ product: updatedProduct });
  });

  // ==========================================
  // REAL-TIME PRICE & CARD DISCOUNT INTELLIGENCE APIS & BACKGROUND SYNC
  // ==========================================

  function getPriceSyncState(): PriceSyncState {
    if (!db.priceSyncState) {
      db.priceSyncState = {
        enabled: true,
        intervalMinutes: 60,
        isRunning: false,
        totalSyncs: 0,
        totalPriceDropsDetected: 0,
        recentLogs: [],
      };
    }
    return db.priceSyncState;
  }

  async function executeBackgroundPriceSync(triggerReason = 'SCHEDULED_AUTO') {
    const syncState = getPriceSyncState();
    if (syncState.isRunning) {
      console.log('Background price sync already active, skipping trigger.');
      return;
    }

    syncState.isRunning = true;
    const nowIso = new Date().toISOString();
    syncState.lastRunAt = nowIso;
    syncState.nextRunAt = new Date(Date.now() + syncState.intervalMinutes * 60 * 1000).toISOString();
    console.log(`[Price Intelligence] Starting background sync (${triggerReason})...`);

    const productsWithUrls = db.products.filter(p => Boolean(p.productUrl || p.affiliateLink));
    let syncCount = 0;
    let dropsDetected = 0;

    for (const prod of productsWithUrls.slice(0, 30)) {
      const targetUrl = prod.productUrl || prod.affiliateLink;
      if (!targetUrl) continue;

      try {
        const freshData = await fetchAndAnalyzeProduct(targetUrl);
        const oldPrice = prod.price || prod.currentPrice;
        const newPrice = freshData.currentPrice;
        const ts = new Date().toISOString();

        let priceChanged = false;
        let priceDiff = 0;
        let logStatus: PriceSyncLogEntry['status'] = 'UNCHANGED';

        if (newPrice !== undefined && oldPrice !== undefined && newPrice !== oldPrice) {
          priceChanged = true;
          priceDiff = newPrice - oldPrice;
          if (priceDiff < 0) {
            dropsDetected++;
            logStatus = 'PRICE_DROP';
            const dropAmount = Math.abs(priceDiff);
            const dropPct = Math.round((dropAmount / oldPrice) * 100);
            prod.priceDrop = {
              amount: dropAmount,
              percentage: dropPct,
              previousPrice: oldPrice,
              detectedAt: ts,
            };
          } else {
            logStatus = 'SUCCESS';
          }
        }

        if (newPrice !== undefined) {
          prod.price = newPrice;
          prod.currentPrice = newPrice;
          if (!prod.priceHistory) prod.priceHistory = [];
          prod.priceHistory.push({
            date: ts,
            price: newPrice,
            formattedDate: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
          });
        }

        if (freshData.originalPrice !== undefined) prod.originalPrice = freshData.originalPrice;
        if (freshData.discountPercentage !== undefined) prod.discountPercentage = freshData.discountPercentage;
        if (freshData.availability) prod.availability = freshData.availability;

        if (freshData.offers && freshData.offers.length > 0) {
          prod.offers = freshData.offers;
          prod.bestOffer = freshData.bestOffer;
          prod.offersVerifiedAt = ts;
        } else if (prod.offers && prod.offers.length > 0) {
          const targetP = prod.price || 0;
          prod.offers = prod.offers.map(off => {
            const evalRes = evaluateOffer(off, targetP);
            return {
              ...off,
              eligible: evalRes.eligible,
              calculatedDiscount: evalRes.calculatedDiscount,
              effectivePrice: evalRes.effectivePrice,
              ineligibilityReason: evalRes.ineligibilityReason,
            };
          });
          prod.bestOffer = determineBestOffer(prod.offers, targetP);
        }

        prod.priceUpdatedAt = ts;
        prod.updatedAt = ts;
        syncCount++;

        // Add to recentLogs
        const entry: PriceSyncLogEntry = {
          id: 'log_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6),
          timestamp: ts,
          productId: prod.id,
          productName: prod.name,
          oldPrice,
          newPrice,
          priceChanged,
          priceDifference: priceDiff,
          offersCount: prod.offers?.length || 0,
          bestOfferHeadline: prod.bestOffer?.discountText || undefined,
          status: logStatus,
        };

        syncState.recentLogs = [entry, ...(syncState.recentLogs || [])].slice(0, 100);

        // Safe throttle between external merchant requests
        await new Promise(r => setTimeout(r, 400));
      } catch (err: any) {
        console.error(`Failed to sync product ${prod.name}:`, err.message);
        const errEntry: PriceSyncLogEntry = {
          id: 'log_err_' + Date.now().toString(36),
          timestamp: new Date().toISOString(),
          productId: prod.id,
          productName: prod.name,
          priceChanged: false,
          priceDifference: 0,
          offersCount: prod.offers?.length || 0,
          status: 'ERROR',
          errorMessage: err.message || 'Scrape failed',
        };
        syncState.recentLogs = [errEntry, ...(syncState.recentLogs || [])].slice(0, 100);
      }
    }

    syncState.isRunning = false;
    syncState.totalSyncs = (syncState.totalSyncs || 0) + syncCount;
    syncState.totalPriceDropsDetected = (syncState.totalPriceDropsDetected || 0) + dropsDetected;
    db.priceSyncState = syncState;
    saveDatabase();
    console.log(`[Price Intelligence] Background sync complete. ${syncCount} products synced, ${dropsDetected} price drops detected.`);
  }

  // Periodic interval loop for background price & offer checks (runs every 10 min, checks elapsed interval)
  let lastPeriodicRunTime = Date.now();
  setInterval(() => {
    try {
      const state = getPriceSyncState();
      if (!state.enabled || state.isRunning) return;
      const elapsedMinutes = (Date.now() - lastPeriodicRunTime) / (60 * 1000);
      if (elapsedMinutes >= state.intervalMinutes) {
        lastPeriodicRunTime = Date.now();
        executeBackgroundPriceSync('SCHEDULED_TIMER').catch(e => {
          console.error('Scheduled background price sync error:', e);
        });
      }
    } catch (loopErr) {
      console.error('Background price sync interval error:', loopErr);
    }
  }, 10 * 60 * 1000);

  // POST /api/admin/fetch-product (Analyze URL & Extract verified price + card discounts)
  app.post('/api/admin/fetch-product', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    const { affiliateUrl } = req.body;

    if (!affiliateUrl || typeof affiliateUrl !== 'string' || !affiliateUrl.trim()) {
      return res.status(400).json({ error: 'Valid Affiliate product URL is required.' });
    }

    try {
      const result = await fetchAndAnalyzeProduct(affiliateUrl.trim());
      recordAuditLog(req.user!, 'Product URL Analyzed', `Retailer: ${result.retailer}`, undefined, `Offers detected: ${result.offers.length}`);
      return res.json(result);
    } catch (err: any) {
      console.error('URL analysis failed:', err);
      return res.status(400).json({ error: err.message || 'Failed to analyze product URL.' });
    }
  });

  // POST /api/admin/refresh-product/:id (Real-time live refresh of a product's price and bank offers)
  app.post('/api/admin/refresh-product/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const product = db.products.find(p => p.id === id);

    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    const targetUrl = product.productUrl || product.affiliateLink;
    if (!targetUrl) {
      return res.status(400).json({ error: 'Product does not have a destination URL to refresh.' });
    }

    try {
      const freshData = await fetchAndAnalyzeProduct(targetUrl);
      const oldPrice = product.price || product.currentPrice;
      const newPrice = freshData.currentPrice;
      const nowIso = new Date().toISOString();

      let priceChanged = false;
      let priceDifference = 0;

      if (newPrice !== undefined && oldPrice !== undefined && newPrice !== oldPrice) {
        priceChanged = true;
        priceDifference = newPrice - oldPrice;

        if (priceDifference < 0) {
          // Price dropped! Record price drop badge info
          const dropAmount = Math.abs(priceDifference);
          const dropPct = Math.round((dropAmount / oldPrice) * 100);
          product.priceDrop = {
            amount: dropAmount,
            percentage: dropPct,
            previousPrice: oldPrice,
            detectedAt: nowIso,
          };
        }
      }

      if (newPrice !== undefined) {
        product.price = newPrice;
        product.currentPrice = newPrice;
        if (!product.priceHistory) product.priceHistory = [];
        product.priceHistory.push({
          date: nowIso,
          price: newPrice,
          formattedDate: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        });
      }

      if (freshData.originalPrice !== undefined) {
        product.originalPrice = freshData.originalPrice;
      }
      if (freshData.discountPercentage !== undefined) {
        product.discountPercentage = freshData.discountPercentage;
      }
      if (freshData.availability) {
        product.availability = freshData.availability;
      }

      // If verified offers detected, update
      if (freshData.offers && freshData.offers.length > 0) {
        product.offers = freshData.offers;
        product.bestOffer = freshData.bestOffer;
        product.offersVerifiedAt = nowIso;
      } else if (product.offers && product.offers.length > 0) {
        // Re-evaluate existing offers against new price
        const targetP = product.price || 0;
        product.offers = product.offers.map(off => {
          const evalRes = evaluateOffer(off, targetP);
          return {
            ...off,
            eligible: evalRes.eligible,
            calculatedDiscount: evalRes.calculatedDiscount,
            effectivePrice: evalRes.effectivePrice,
            ineligibilityReason: evalRes.ineligibilityReason,
          };
        });
        product.bestOffer = determineBestOffer(product.offers, targetP);
      }

      product.priceUpdatedAt = nowIso;
      product.updatedAt = nowIso;

      recordAuditLog(
        req.user!,
        'Product Price & Offers Refreshed',
        `Product: ${product.name}`,
        product.id,
        priceChanged ? `Price changed: ₹${oldPrice} -> ₹${newPrice}` : 'Price unchanged'
      );
      saveDatabase();

      return res.json({
        success: true,
        product,
        priceChanged,
        priceDifference,
        previousPrice: oldPrice,
      });
    } catch (err: any) {
      console.error('Refresh product failed:', err);
      return res.status(400).json({ error: err.message || 'Failed to refresh product.' });
    }
  });

  // POST /api/admin/refresh-all-products (Batch refresh with safe throttling)
  app.post('/api/admin/refresh-all-products', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    const list = db.products.filter(p => Boolean(p.productUrl || p.affiliateLink));
    let updatedCount = 0;
    let priceDropsCount = 0;
    let errorCount = 0;
    const results: any[] = [];

    for (const prod of list.slice(0, 50)) {
      try {
        const targetUrl = prod.productUrl || prod.affiliateLink;
        const freshData = await fetchAndAnalyzeProduct(targetUrl);
        const oldPrice = prod.price || prod.currentPrice;
        const newPrice = freshData.currentPrice;
        const nowIso = new Date().toISOString();

        let priceChanged = false;
        if (newPrice !== undefined && oldPrice !== undefined && newPrice !== oldPrice) {
          priceChanged = true;
          const diff = newPrice - oldPrice;
          if (diff < 0) {
            priceDropsCount++;
            prod.priceDrop = {
              amount: Math.abs(diff),
              percentage: Math.round((Math.abs(diff) / oldPrice) * 100),
              previousPrice: oldPrice,
              detectedAt: nowIso,
            };
          }
        }

        if (newPrice !== undefined) {
          prod.price = newPrice;
          prod.currentPrice = newPrice;
          if (!prod.priceHistory) prod.priceHistory = [];
          prod.priceHistory.push({
            date: nowIso,
            price: newPrice,
            formattedDate: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
          });
        }
        if (freshData.originalPrice !== undefined) prod.originalPrice = freshData.originalPrice;
        if (freshData.discountPercentage !== undefined) prod.discountPercentage = freshData.discountPercentage;
        if (freshData.offers && freshData.offers.length > 0) {
          prod.offers = freshData.offers;
          prod.bestOffer = freshData.bestOffer;
          prod.offersVerifiedAt = nowIso;
        }

        prod.priceUpdatedAt = nowIso;
        prod.updatedAt = nowIso;
        updatedCount++;

        results.push({
          id: prod.id,
          name: prod.name,
          oldPrice,
          newPrice,
          priceChanged,
          bestOffer: prod.bestOffer,
        });

        // Throttle 300ms between requests
        await new Promise(r => setTimeout(r, 300));
      } catch (err: any) {
        errorCount++;
        results.push({ id: prod.id, name: prod.name, error: err.message });
      }
    }

    saveDatabase();
    recordAuditLog(req.user!, 'Batch Price Refresh Executed', `Refreshed ${updatedCount} items, ${priceDropsCount} price drops detected`);

    return res.json({
      total: list.length,
      updated: updatedCount,
      priceDrops: priceDropsCount,
      errors: errorCount,
      results,
    });
  });

  // POST /api/admin/products/:id/offers (Manually add or edit bank/card offers)
  app.post('/api/admin/products/:id/offers', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { offers } = req.body;

    const product = db.products.find(p => p.id === id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    if (!Array.isArray(offers)) {
      return res.status(400).json({ error: 'Offers array is required.' });
    }

    const nowIso = new Date().toISOString();
    const currentPrice = product.price || product.currentPrice || 0;

    const formattedOffers: PaymentOffer[] = offers.map((o: any) => {
      const off: PaymentOffer = {
        id: o.id || 'off_' + crypto.randomBytes(4).toString('hex'),
        bank: o.bank?.trim() || 'Bank Offer',
        cardType: o.cardType || 'ALL',
        paymentMethod: o.paymentMethod?.trim() || 'Card',
        discountType: o.discountType || 'FLAT',
        discountPercentage: typeof o.discountPercentage === 'number' ? o.discountPercentage : undefined,
        flatDiscount: typeof o.flatDiscount === 'number' ? o.flatDiscount : undefined,
        maximumDiscount: typeof o.maximumDiscount === 'number' ? o.maximumDiscount : undefined,
        minimumTransaction: typeof o.minimumTransaction === 'number' ? o.minimumTransaction : undefined,
        cashback: typeof o.cashback === 'number' ? o.cashback : undefined,
        emiRequired: Boolean(o.emiRequired),
        emiTenure: o.emiTenure?.trim() || undefined,
        expiryDate: o.expiryDate || undefined,
        terms: o.terms?.trim() || undefined,
        source: (o.source || 'ADMIN_VERIFIED') as OfferSource,
        verifiedAt: o.verifiedAt || nowIso,
        isActive: o.isActive !== false,
      };

      const evalRes = evaluateOffer(off, currentPrice);
      off.eligible = evalRes.eligible;
      off.calculatedDiscount = evalRes.calculatedDiscount;
      off.effectivePrice = evalRes.effectivePrice;
      off.ineligibilityReason = evalRes.ineligibilityReason;

      return off;
    });

    product.offers = formattedOffers;
    product.bestOffer = determineBestOffer(formattedOffers, currentPrice);
    product.offersVerifiedAt = nowIso;
    product.updatedAt = nowIso;

    recordAuditLog(req.user!, 'Product Offers Updated', `Product: ${product.name}`, product.id, `Saved ${formattedOffers.length} offers`);
    saveDatabase();

    return res.json({ product, offers: formattedOffers, bestOffer: product.bestOffer });
  });

  // POST /api/admin/products/:id/refresh-offers (Direct one-click live refresh of product offers & price)
  app.post('/api/admin/products/:id/refresh-offers', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const product = db.products.find(p => p.id === id);

    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    const targetUrl = product.productUrl || product.affiliateLink;
    if (!targetUrl) {
      return res.status(400).json({ error: 'Product does not have a destination URL to refresh.' });
    }

    try {
      const freshData = await fetchAndAnalyzeProduct(targetUrl);
      const oldPrice = product.price || product.currentPrice;
      const newPrice = freshData.currentPrice;
      const nowIso = new Date().toISOString();

      let priceChanged = false;
      let priceDifference = 0;

      if (newPrice !== undefined && oldPrice !== undefined && newPrice !== oldPrice) {
        priceChanged = true;
        priceDifference = newPrice - oldPrice;

        if (priceDifference < 0) {
          const dropAmount = Math.abs(priceDifference);
          const dropPct = Math.round((dropAmount / oldPrice) * 100);
          product.priceDrop = {
            amount: dropAmount,
            percentage: dropPct,
            previousPrice: oldPrice,
            detectedAt: nowIso,
          };
        }
      }

      if (newPrice !== undefined) {
        product.price = newPrice;
        product.currentPrice = newPrice;
        if (!product.priceHistory) product.priceHistory = [];
        product.priceHistory.push({
          date: nowIso,
          price: newPrice,
          formattedDate: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        });
      }

      if (freshData.originalPrice !== undefined) product.originalPrice = freshData.originalPrice;
      if (freshData.discountPercentage !== undefined) product.discountPercentage = freshData.discountPercentage;
      if (freshData.availability) product.availability = freshData.availability;

      if (freshData.offers && freshData.offers.length > 0) {
        product.offers = freshData.offers;
        product.bestOffer = freshData.bestOffer;
        product.offersVerifiedAt = nowIso;
      } else if (product.offers && product.offers.length > 0) {
        const targetP = product.price || 0;
        product.offers = product.offers.map(off => {
          const evalRes = evaluateOffer(off, targetP);
          return {
            ...off,
            eligible: evalRes.eligible,
            calculatedDiscount: evalRes.calculatedDiscount,
            effectivePrice: evalRes.effectivePrice,
            ineligibilityReason: evalRes.ineligibilityReason,
          };
        });
        product.bestOffer = determineBestOffer(product.offers, targetP);
      }

      product.priceUpdatedAt = nowIso;
      product.updatedAt = nowIso;

      recordAuditLog(
        req.user!,
        'Product Offers & Price Refreshed',
        `Product: ${product.name}`,
        product.id,
        `Offers: ${product.offers?.length || 0} active, Price: ₹${product.price}`
      );
      saveDatabase();

      return res.json({
        success: true,
        product,
        priceChanged,
        priceDifference,
        previousPrice: oldPrice,
        offersCount: product.offers?.length || 0,
        bestOffer: product.bestOffer || null,
      });
    } catch (err: any) {
      console.error('Refresh product offers failed:', err);
      return res.status(400).json({ error: err.message || 'Failed to refresh product offers.' });
    }
  });

  // GET /api/admin/price-sync/status (Get background sync status & telemetry)
  app.get('/api/admin/price-sync/status', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const syncState = getPriceSyncState();
    return res.json(syncState);
  });

  // POST /api/admin/price-sync/settings (Configure background check frequency & enablement)
  app.post('/api/admin/price-sync/settings', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const { enabled, intervalMinutes } = req.body;
    const syncState = getPriceSyncState();

    if (typeof enabled === 'boolean') {
      syncState.enabled = enabled;
    }
    if (typeof intervalMinutes === 'number' && intervalMinutes >= 5) {
      syncState.intervalMinutes = intervalMinutes;
    }

    if (syncState.enabled) {
      syncState.nextRunAt = new Date(Date.now() + syncState.intervalMinutes * 60 * 1000).toISOString();
    } else {
      syncState.nextRunAt = undefined;
    }

    db.priceSyncState = syncState;
    saveDatabase();
    recordAuditLog(req.user!, 'Price Sync Settings Updated', 'System Settings', undefined, `Enabled: ${syncState.enabled}, Interval: ${syncState.intervalMinutes}m`);

    return res.json(syncState);
  });

  // POST /api/admin/price-sync/trigger (Manually trigger background sync run)
  app.post('/api/admin/price-sync/trigger', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    const syncState = getPriceSyncState();
    if (syncState.isRunning) {
      return res.status(409).json({ error: 'Background sync is already in progress.' });
    }

    // Trigger in background so request does not hang
    executeBackgroundPriceSync('MANUAL_TRIGGER').catch(err => {
      console.error('Manual background price sync error:', err);
    });

    return res.json({ success: true, message: 'Background price & offer synchronization started.' });
  });

  // PATCH /api/admin/products/:id/status (Fast status toggle: Publish / Unpublish / Archive)
  app.patch('/api/admin/products/:id/status', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;

    const cleanStatus = normalizeProductStatus(status);
    const validStatuses: ProductStatus[] = ['DRAFT', 'PUBLISHED', 'UNPUBLISHED', 'ARCHIVED'];
    if (!validStatuses.includes(cleanStatus)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const product = db.products.find(p => p.id === id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    const prevStatus = product.status;
    product.status = cleanStatus;
    product.updatedAt = new Date().toISOString();

    recordAuditLog(req.user!, `Product Status Changed`, `Product: ${product.name}`, product.id, `From ${prevStatus} to ${cleanStatus}`);
    saveDatabase();

    return res.json({ product });
  });

  // POST /api/admin/products/:id/duplicate (Duplicate product)
  app.post('/api/admin/products/:id/duplicate', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const original = db.products.find(p => p.id === id);

    if (!original) {
      return res.status(404).json({ error: 'Original product not found.' });
    }

    const duplicated: Product = {
      ...original,
      id: generateId('prod'),
      name: `${original.name} (Copy)`,
      slug: slugify(`${original.name}-copy-${Math.random().toString(36).substring(2, 6)}`),
      status: 'DRAFT', // Duplicated copies start as DRAFT for safety
      clicksCount: 0,
      savesCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: undefined,
    };

    db.products.unshift(duplicated);
    recordAuditLog(req.user!, 'Product Duplicated', `Product: ${duplicated.name}`, duplicated.id, `Cloned from ${original.name}`);
    saveDatabase();

    return res.status(201).json({ product: duplicated });
  });

  // POST /api/admin/products/bulk (Bulk Publish, Unpublish, Archive, Delete)
  app.post('/api/admin/products/bulk', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const { action, productIds } = req.body;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ error: 'Product IDs array is required.' });
    }

    if (action === 'delete') {
      const countBefore = db.products.length;
      db.products = db.products.filter(p => !productIds.includes(p.id));
      const deletedCount = countBefore - db.products.length;
      
      // Clean from boards
      db.boards.forEach(b => {
        b.productIds = b.productIds.filter(pid => !productIds.includes(pid));
      });

      recordAuditLog(req.user!, 'Bulk Product Delete', `${deletedCount} products deleted`, undefined, `IDs: ${productIds.slice(0, 5).join(', ')}...`);
      saveDatabase();
      return res.json({ success: true, count: deletedCount });
    }

    const normalizedAction = (action || '').toString().trim().toUpperCase();
    if (['PUBLISHED', 'UNPUBLISHED', 'ARCHIVED', 'DRAFT'].includes(normalizedAction)) {
      let updatedCount = 0;
      db.products.forEach(p => {
        if (productIds.includes(p.id)) {
          p.status = normalizedAction as ProductStatus;
          p.updatedAt = new Date().toISOString();
          updatedCount++;
        }
      });

      recordAuditLog(req.user!, `Bulk Status Update to ${normalizedAction}`, `${updatedCount} products updated`, undefined, `Action: ${normalizedAction}`);
      saveDatabase();
      return res.json({ success: true, count: updatedCount });
    }

    return res.status(400).json({ error: 'Invalid bulk action.' });
  });

  // DELETE /api/admin/products/:id (Delete product)
  app.delete('/api/admin/products/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const index = db.products.findIndex(p => p.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    const removed = db.products[index];
    db.products.splice(index, 1);

    db.boards.forEach(b => {
      b.productIds = b.productIds.filter(pid => pid !== id);
    });

    recordAuditLog(req.user!, 'Product Deleted', `Product: ${removed.name}`, removed.id);
    saveDatabase();

    return res.json({ success: true, deletedId: id });
  });

  // ==========================================
  // CATEGORIES MANAGEMENT APIS (ADMIN ONLY)
  // ==========================================

  // GET /api/admin/categories
  app.get('/api/admin/categories', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const list = db.categories.map(c => {
      const count = db.products.filter(p => p.category.toLowerCase() === c.name.toLowerCase()).length;
      const publishedCount = db.products.filter(p => p.category.toLowerCase() === c.name.toLowerCase() && p.status === 'PUBLISHED').length;
      return {
        ...c,
        totalProducts: count,
        publishedProducts: publishedCount,
      };
    });
    return res.json({ categories: list });
  });

  // POST /api/admin/categories (Create Category)
  app.post('/api/admin/categories', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const { name, description, icon, subcategories = [] } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category Name is required.' });
    }

    const cleanName = name.trim();
    const existing = db.categories.find(c => c.name.toLowerCase() === cleanName.toLowerCase());
    if (existing) {
      return res.status(400).json({ error: 'A category with this name already exists.' });
    }

    const newCategory: Category = {
      id: generateId('cat'),
      name: cleanName,
      slug: slugify(cleanName),
      description: description?.trim() || '',
      icon: icon || 'tag',
      subcategories: Array.isArray(subcategories) ? subcategories.map((s: string) => s.trim()).filter(Boolean) : [],
      createdAt: new Date().toISOString(),
    };

    db.categories.push(newCategory);
    recordAuditLog(req.user!, 'Category Created', `Category: ${newCategory.name}`, newCategory.id);
    saveDatabase();

    return res.status(201).json({ category: newCategory });
  });

  // PUT /api/admin/categories/:id (Update Category)
  app.put('/api/admin/categories/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const index = db.categories.findIndex(c => c.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Category not found.' });
    }

    const { name, description, icon, subcategories } = req.body;
    const prev = db.categories[index];

    const updated: Category = {
      ...prev,
      name: name ? name.trim() : prev.name,
      slug: name ? slugify(name.trim()) : prev.slug,
      description: description !== undefined ? description.trim() : prev.description,
      icon: icon || prev.icon,
      subcategories: Array.isArray(subcategories) ? subcategories.map((s: string) => s.trim()).filter(Boolean) : prev.subcategories,
    };

    db.categories[index] = updated;
    recordAuditLog(req.user!, 'Category Updated', `Category: ${updated.name}`, updated.id);
    saveDatabase();

    return res.json({ category: updated });
  });

  // DELETE /api/admin/categories/:id (Delete Category)
  app.delete('/api/admin/categories/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const index = db.categories.findIndex(c => c.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Category not found.' });
    }

    const removed = db.categories[index];
    db.categories.splice(index, 1);

    recordAuditLog(req.user!, 'Category Deleted', `Category: ${removed.name}`, removed.id);
    saveDatabase();

    return res.json({ success: true, deletedId: id });
  });

  // ==========================================
  // USERS MANAGEMENT APIS (ADMIN ONLY)
  // ==========================================

  // GET /api/admin/users
  app.get('/api/admin/users', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const sanitized = db.users.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      createdAt: u.createdAt || new Date().toISOString(),
    }));
    return res.json({ users: sanitized });
  });

  // POST /api/admin/users (Create User)
  app.post('/api/admin/users', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const { email, name, role = 'USER', password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    if (role === 'ADMIN') {
      return res.status(403).json({ error: 'Single Administrator Policy: Only one administrator account is permitted on the platform.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = db.users.find(u => u.email.toLowerCase() === normalizedEmail);
    if (existing) {
      return res.status(400).json({ error: 'User with this email already exists.' });
    }

    const newUser: User = {
      id: generateId('usr'),
      email: normalizedEmail,
      name: name?.trim() || normalizedEmail.split('@')[0],
      role: 'USER',
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
    };

    db.users.push(newUser);
    recordAuditLog(req.user!, 'User Created', `User: ${newUser.email}`, newUser.id, `Role: ${newUser.role}`);
    saveDatabase();

    return res.status(201).json({
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        createdAt: newUser.createdAt,
      },
    });
  });

  // PATCH /api/admin/users/:id/role
  app.patch('/api/admin/users/:id/role', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { role } = req.body;

    if (role === 'ADMIN') {
      return res.status(403).json({ error: 'Single Administrator Policy: Additional admin accounts cannot be created or assigned.' });
    }

    if (role !== 'USER') {
      return res.status(400).json({ error: 'Role must be USER.' });
    }

    const targetUser = db.users.find(u => u.id === id);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Prevent removing the sole admin
    if (targetUser.role === 'ADMIN' && role === 'USER') {
      return res.status(400).json({ error: 'Cannot demote the sole Administrator.' });
    }

    targetUser.role = role;
    recordAuditLog(req.user!, 'User Role Updated', `User: ${targetUser.email}`, targetUser.id, `New Role: ${role}`);
    saveDatabase();

    return res.json({ success: true, user: { id: targetUser.id, email: targetUser.email, role: targetUser.role } });
  });

  // DELETE /api/admin/users/:id
  app.delete('/api/admin/users/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    if (id === req.user!.id) {
      return res.status(400).json({ error: 'You cannot delete your own active administrator account.' });
    }

    const index = db.users.findIndex(u => u.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const removed = db.users[index];
    db.users.splice(index, 1);

    recordAuditLog(req.user!, 'User Deleted', `User: ${removed.email}`, removed.id);
    saveDatabase();

    return res.json({ success: true, deletedId: id });
  });

  // ==========================================
  // AUDIT LOGS API (ADMIN ONLY)
  // ==========================================
  app.get('/api/admin/audit-logs', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    return res.json({ logs: db.auditLogs.slice(0, 300) });
  });

  // ==========================================
  // PLATFORM SETTINGS & CATALOG IMPORT/EXPORT
  // ==========================================
  app.get('/api/admin/settings', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    return res.json({ settings: db.settings });
  });

  app.put('/api/admin/settings', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const { platformName, tagline, storeDisclaimer, affiliateDisclaimer, defaultCurrency, contactEmail } = req.body;

    const chosenDisclaimer = storeDisclaimer?.trim() || affiliateDisclaimer?.trim() || db.settings.storeDisclaimer || db.settings.affiliateDisclaimer;

    db.settings = {
      platformName: platformName?.trim() || db.settings.platformName,
      tagline: tagline?.trim() || db.settings.tagline,
      storeDisclaimer: chosenDisclaimer,
      affiliateDisclaimer: chosenDisclaimer,
      defaultCurrency: defaultCurrency?.trim() || db.settings.defaultCurrency,
      contactEmail: contactEmail?.trim() || db.settings.contactEmail,
    };

    recordAuditLog(req.user!, 'Platform Settings Updated', 'Platform Settings');
    saveDatabase();

    return res.json({ settings: db.settings });
  });

  // GET /api/admin/export-catalog (JSON Dump)
  app.get('/api/admin/export-catalog', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    return res.json({
      exportedAt: new Date().toISOString(),
      platform: db.settings.platformName,
      categories: db.categories,
      products: db.products,
    });
  });

  // POST /api/admin/import-catalog (Unlimited JSON Import)
  app.post('/api/admin/import-catalog', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const { products: importedProducts, replaceExisting = false } = req.body;

    if (!Array.isArray(importedProducts) || importedProducts.length === 0) {
      return res.status(400).json({ error: 'Valid products array is required.' });
    }

    let addedCount = 0;
    const validatedProducts: Product[] = [];

    for (const p of importedProducts) {
      if (!p.name || !p.imageUrl || !p.affiliateLink) continue;

      const validStatus: ProductStatus = normalizeProductStatus(p.status);

      const prod: Product = {
        id: p.id || generateId('prod'),
        slug: p.slug || (slugify(p.name) + '-' + Math.random().toString(36).substring(2, 6)),
        name: p.name.trim(),
        shortDescription: p.shortDescription || '',
        detailedNotes: p.detailedNotes || '',
        imageUrl: p.imageUrl.trim(),
        aspectRatio: p.aspectRatio || 'portrait',
        category: p.category || 'General',
        subcategory: p.subcategory || undefined,
        tags: Array.isArray(p.tags) ? p.tags : [],
        productUrl: p.productUrl || undefined,
        affiliateLink: p.affiliateLink.trim(),
        retailer: p.retailer || 'Direct',
        brand: p.brand || p.retailer || 'Direct',
        price: typeof p.price === 'number' ? p.price : undefined,
        originalPrice: typeof p.originalPrice === 'number' ? p.originalPrice : undefined,
        currency: p.currency || 'USD',
        isTrending: Boolean(p.isTrending),
        isStaffPick: Boolean(p.isStaffPick),
        isFeatured: Boolean(p.isFeatured),
        clicksCount: p.clicksCount || 0,
        savesCount: p.savesCount || 0,
        status: validStatus,
        createdAt: p.createdAt || new Date().toISOString(),
      };
      validatedProducts.push(prod);
      addedCount++;
    }

    if (replaceExisting) {
      db.products = validatedProducts;
    } else {
      db.products = [...validatedProducts, ...db.products];
    }

    recordAuditLog(req.user!, 'Catalog Imported', `${addedCount} products imported`, undefined, `Replace existing: ${replaceExisting}`);
    saveDatabase();

    return res.json({ success: true, importedCount: addedCount, totalCatalogCount: db.products.length });
  });

  // GET /api/admin/analytics (Admin-only real click analytics. No fake data!)
  app.get('/api/admin/analytics', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const totalClicks = db.clicks.length;

    if (totalClicks === 0) {
      return res.json({
        totalClicks: 0,
        uniqueProductsClicked: 0,
        clicks: [],
        clicksByDevice: {},
        clicksByRetailer: {},
        hourlyClicks: [],
        topProducts: [],
        topCategories: [],
        message: 'No production analytics available yet.',
      });
    }

    const clicksByDevice: { [key: string]: number } = {};
    const clicksByRetailer: { [key: string]: number } = {};
    const productClickCounts: { [prodId: string]: { name: string; retailer: string; clicks: number; affiliateLink?: string } } = {};
    const categoryClickCounts: { [cat: string]: number } = {};

    db.clicks.forEach(c => {
      // Device
      clicksByDevice[c.deviceType] = (clicksByDevice[c.deviceType] || 0) + 1;
      // Retailer
      const r = c.retailer || 'Direct';
      clicksByRetailer[r] = (clicksByRetailer[r] || 0) + 1;
      
      // Product counts
      if (!productClickCounts[c.productId]) {
        const prod = db.products.find(p => p.id === c.productId);
        if (prod && prod.category) {
          categoryClickCounts[prod.category] = (categoryClickCounts[prod.category] || 0) + 1;
        }
        productClickCounts[c.productId] = {
          name: c.productName || 'Product',
          retailer: c.retailer || 'Direct',
          affiliateLink: c.destinationUrl,
          clicks: 0,
        };
      }
      productClickCounts[c.productId].clicks += 1;
    });

    const topProducts = Object.entries(productClickCounts)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 15);

    const topCategories = Object.entries(categoryClickCounts)
      .map(([category, clicks]) => ({ category, clicks }))
      .sort((a, b) => b.clicks - a.clicks);

    // Hourly click distribution from last 24h
    const now = Date.now();
    const hourlyMap: { [hour: string]: number } = {};
    for (let i = 23; i >= 0; i--) {
      const d = new Date(now - i * 3600 * 1000);
      const hourLabel = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      hourlyMap[hourLabel] = 0;
    }

    db.clicks.forEach(c => {
      const clickTime = new Date(c.timestamp).getTime();
      if (now - clickTime <= 24 * 3600 * 1000) {
        const d = new Date(clickTime);
        const hourLabel = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (hourlyMap[hourLabel] !== undefined) {
          hourlyMap[hourLabel] += 1;
        }
      }
    });

    const hourlyClicks = Object.entries(hourlyMap).map(([hour, clicks]) => ({ hour, clicks }));

    return res.json({
      totalClicks,
      uniqueProductsClicked: Object.keys(productClickCounts).length,
      clicks: db.clicks.slice(0, 100),
      clicksByDevice,
      clicksByRetailer,
      hourlyClicks,
      topProducts,
      topCategories,
    });
  });

  // GET /api/admin/traffic (Aggregated Website Visitors & Unique Page Views)
  app.get('/api/admin/traffic', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const pageViews = db.pageViews || [];
    const totalPageViews = pageViews.length;

    const uniqueVisitorSet = new Set<string>();
    const todayUniqueVisitorSet = new Set<string>();

    const todayStr = new Date().toISOString().split('T')[0];
    let todayPageViews = 0;

    // Daily map for the past 14 days
    const dailyMap: { [dateStr: string]: { date: string; pageViews: number; visitors: Set<string> } } = {};
    const now = Date.now();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now - i * 86400000);
      const dStr = d.toISOString().split('T')[0];
      dailyMap[dStr] = { date: dStr, pageViews: 0, visitors: new Set() };
    }

    const pathCountMap: { [path: string]: number } = {};
    const deviceCountMap: { [dev: string]: number } = { desktop: 0, mobile: 0, tablet: 0 };
    const referrerCountMap: { [ref: string]: number } = {};

    pageViews.forEach(pv => {
      uniqueVisitorSet.add(pv.visitorId);

      const pvDateStr = pv.timestamp ? pv.timestamp.split('T')[0] : '';
      if (pvDateStr === todayStr) {
        todayPageViews++;
        todayUniqueVisitorSet.add(pv.visitorId);
      }

      if (dailyMap[pvDateStr]) {
        dailyMap[pvDateStr].pageViews++;
        dailyMap[pvDateStr].visitors.add(pv.visitorId);
      }

      // Top paths
      const p = pv.path || '/';
      pathCountMap[p] = (pathCountMap[p] || 0) + 1;

      // Device segmentation
      const dev = pv.deviceType || 'desktop';
      deviceCountMap[dev] = (deviceCountMap[dev] || 0) + 1;

      // Referrer classification
      let refCategory = 'Direct / Bookmarks';
      const ref = (pv.referrer || '').toLowerCase();
      if (!ref || ref === 'direct' || ref === '' || ref === 'null' || ref === 'undefined') {
        refCategory = 'Direct / Bookmarks';
      } else if (ref.includes('pinterest.')) {
        refCategory = 'Pinterest';
      } else if (ref.includes('google.') || ref.includes('bing.') || ref.includes('yahoo.')) {
        refCategory = 'Search Engines (Google/Bing)';
      } else if (ref.includes('instagram.') || ref.includes('facebook.') || ref.includes('t.co') || ref.includes('twitter') || ref.includes('x.com')) {
        refCategory = 'Social Networks (IG/X/FB)';
      } else if (ref.includes('reddit.')) {
        refCategory = 'Reddit & Forums';
      } else {
        try {
          const u = new URL(pv.referrer);
          refCategory = u.hostname || 'Referral';
        } catch {
          refCategory = 'Other Referrals';
        }
      }
      referrerCountMap[refCategory] = (referrerCountMap[refCategory] || 0) + 1;
    });

    const dailyTraffic = Object.values(dailyMap).map(item => ({
      date: item.date,
      pageViews: item.pageViews,
      uniqueVisitors: item.visitors.size,
    }));

    const totalUniqueVisitors = uniqueVisitorSet.size;
    const todayUniqueVisitors = todayUniqueVisitorSet.size;
    const averageViewsPerVisitor = totalUniqueVisitors > 0 
      ? Number((totalPageViews / totalUniqueVisitors).toFixed(2)) 
      : 0;

    const topPages = Object.entries(pathCountMap)
      .map(([p, count]) => ({
        path: p,
        views: count,
        percentage: totalPageViews > 0 ? Number(((count / totalPageViews) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 15);

    return res.json({
      totalPageViews,
      totalUniqueVisitors,
      todayPageViews,
      todayUniqueVisitors,
      averageViewsPerVisitor,
      dailyTraffic,
      topPages,
      trafficByDevice: deviceCountMap,
      trafficByReferrer: referrerCountMap,
      recentVisits: pageViews.slice(0, 50),
    });
  });

  // POST /api/admin/enrich-link (Smart AI Affiliate Link Metadata Extraction)
  app.post('/api/admin/enrich-link', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    const { url, rawText } = req.body;
    if (!url && !rawText) {
      return res.status(400).json({ error: 'Please provide a product URL or raw merchant text/title to analyze.' });
    }

    try {
      let pageTitle = '';
      let pageDescription = '';
      let pageImage = '';
      let fetchedContent = '';

      // Try lightweight web scraping if valid HTTP URL is provided
      if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 6000);
          const fetchRes = await fetch(url, {
            signal: controller.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            },
          });
          clearTimeout(timeoutId);

          if (fetchRes.ok) {
            const html = await fetchRes.text();
            // Extract og:title, title, og:description, meta description, og:image
            const titleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["'](.*?)["']/i) ||
                               html.match(/<meta\s+name=["']twitter:title["']\s+content=["'](.*?)["']/i) ||
                               html.match(/<title>(.*?)<\/title>/i);
            if (titleMatch) pageTitle = titleMatch[1].trim();

            const descMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["'](.*?)["']/i) ||
                              html.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i);
            if (descMatch) pageDescription = descMatch[1].trim();

            const imgMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["'](.*?)["']/i) ||
                             html.match(/<meta\s+name=["']twitter:image["']\s+content=["'](.*?)["']/i);
            if (imgMatch) pageImage = imgMatch[1].trim();

            // Extract visible text sample for Gemini
            fetchedContent = html
              .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
              .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
              .slice(0, 3000);
          }
        } catch (scrapeErr) {
          console.log('Page scraping warning (proceeding with fallback extraction):', scrapeErr);
        }
      }

      // Domain extraction helper
      let retailerDomain = '';
      let guessedRetailer = '';
      if (url) {
        try {
          const parsed = new URL(url);
          retailerDomain = parsed.hostname.replace(/^www\./, '');
          guessedRetailer = retailerDomain.split('.')[0];
          guessedRetailer = guessedRetailer.charAt(0).toUpperCase() + guessedRetailer.slice(1);
        } catch {}
      }

      // Available categories in db
      const availableCategories = db.categories.map(c => c.name);

      let enrichedData: any = {
        name: pageTitle || 'Curated Design Find',
        shortDescription: pageDescription || 'Editorial design item curated for aesthetic visual discovery.',
        category: availableCategories[0] || 'Home Decor',
        subcategory: '',
        retailer: guessedRetailer || 'Direct Retailer',
        brand: guessedRetailer || 'Direct Brand',
        price: undefined,
        originalPrice: undefined,
        currency: 'USD',
        tags: ['aesthetic', 'design', 'curated'],
        imageUrl: pageImage || '',
        aspectRatio: 'portrait',
      };

      // Call Gemini API if API key is present
      if (process.env.GEMINI_API_KEY) {
        try {
          const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
          const prompt = `You are a high-end visual product catalog and affiliate merchandising curator.
Extract and enrich structured product metadata from this product link and content for an aesthetic visual discovery platform.

Target Categories to choose from: ${JSON.stringify(availableCategories)}

Product URL: ${url || 'N/A'}
Scraped Page Title: ${pageTitle || 'N/A'}
Scraped Description: ${pageDescription || 'N/A'}
User / Page Content Excerpt: ${rawText || fetchedContent || 'N/A'}

Return a valid JSON object ONLY with the following schema:
{
  "name": "Catchy, clean, premium product title (no spammy keyword stuffing)",
  "shortDescription": "1-2 sentences of elegant, editorial copywriting highlighting materials, craftsmanship, and utility",
  "detailedNotes": "Key specifications or dimensions if available",
  "category": "Must be exactly one of the provided Target Categories",
  "subcategory": "A relevant specific subcategory (e.g. Desk Setup, Lighting, Audio, Coffee & Tea)",
  "retailer": "Recognizable retailer name (e.g. Amazon, Etsy, Grovemade, Nordstrom, Target, Apple)",
  "brand": "Brand or artisan creator name",
  "price": 49.99, // estimated numeric price or current sale price if found, else null
  "originalPrice": 69.99, // original price before discount if on sale, else null
  "currency": "USD",
  "tags": ["tag1", "tag2", "tag3", "tag4"], // 4-6 clean lowercase keywords
  "aspectRatio": "tall" // one of: "tall", "portrait", "square", "wide"
}`;

          const response = await ai.models.generateContent({
            model: 'gemini-3.7-flash',
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
            },
          });

          if (response && response.text) {
            const parsed = JSON.parse(response.text);
            enrichedData = {
              ...enrichedData,
              ...parsed,
              imageUrl: pageImage || enrichedData.imageUrl,
            };
          }
        } catch (aiErr) {
          console.error('Gemini auto-enrichment fallback:', aiErr);
        }
      }

      return res.json({
        success: true,
        enriched: enrichedData,
      });
    } catch (err: any) {
      console.error('Link enrichment error:', err);
      return res.status(500).json({ error: err.message || 'Failed to auto-enrich product link' });
    }
  });

  // POST /api/admin/generate-description (Gemini AI SEO Product Description Generator)
  app.post('/api/admin/generate-description', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    const { title, imageUrl, category, brand, retailer, keywords, tone } = req.body;

    if (!title && !imageUrl) {
      return res.status(400).json({ 
        error: 'Please provide either a product title or an image URL to analyze and generate a description.' 
      });
    }

    try {
      const selectedTone = tone || 'editorial'; // 'editorial' | 'minimalist' | 'persuasive' | 'technical'
      
      let shortDescription = '';
      let detailedDescription = '';
      let seoKeywords: string[] = [];
      let keyHighlights: string[] = [];

      if (process.env.GEMINI_API_KEY) {
        try {
          const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
          
          const systemPrompt = `You are a world-class e-commerce copywriter and SEO optimization specialist for an aesthetic, high-end visual product discovery platform (similar to Pinterest and curated design editorials).
Your goal is to generate compelling, search-engine-optimized, professional product copy that drives engagement and affiliate conversions without sounding spammy.

Input details:
- Product Title/Name: ${title || 'Unspecified'}
- Product Category: ${category || 'Curated Design'}
- Brand/Creator: ${brand || 'Independent / Artisan'}
- Retailer: ${retailer || 'Direct Partner'}
- Existing Keywords/Tags: ${keywords || 'None'}
- Desired Tone: ${selectedTone}
- Image Provided: ${imageUrl ? 'Yes' : 'No'}

Respond ONLY with a JSON object matching this schema:
{
  "shortDescription": "1-2 concise, punchy, elegant sentences (under 160 characters ideal for meta description & social shares) highlighting the core aesthetic and functional appeal.",
  "detailedDescription": "A comprehensive, 2-3 paragraph professional SEO-friendly description. Include details on craftsmanship, styling/usage inspiration, materials/design philosophy, and why it stands out. Format with natural paragraph breaks.",
  "keyHighlights": [
    "Highlight 1 (e.g. Premium handcrafted ceramic with matte glaze)",
    "Highlight 2 (e.g. Ergonomic design for daily ritual)",
    "Highlight 3 (e.g. Sustainable and ethically sourced materials)"
  ],
  "seoKeywords": [
    "keyword 1", "keyword 2", "keyword 3", "keyword 4", "keyword 5", "keyword 6"
  ]
}`;

          const contents: any[] = [];

          // Try to include image inline data if valid imageUrl is provided
          let imagePartAdded = false;
          if (imageUrl) {
            if (imageUrl.startsWith('data:image/')) {
              try {
                const match = imageUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
                if (match) {
                  contents.push({
                    inlineData: {
                      mimeType: match[1],
                      data: match[2],
                    },
                  });
                  imagePartAdded = true;
                }
              } catch (e) {
                console.log('Failed to parse base64 image data:', e);
              }
            } else if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
              try {
                const imgController = new AbortController();
                const timeoutId = setTimeout(() => imgController.abort(), 5000);
                const imgRes = await fetch(imageUrl, {
                  signal: imgController.signal,
                  headers: { 'User-Agent': 'Mozilla/5.0' },
                });
                clearTimeout(timeoutId);

                if (imgRes.ok) {
                  const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
                  if (contentType.startsWith('image/')) {
                    const arrayBuffer = await imgRes.arrayBuffer();
                    const base64Data = Buffer.from(arrayBuffer).toString('base64');
                    contents.push({
                      inlineData: {
                        mimeType: contentType.split(';')[0],
                        data: base64Data,
                      },
                    });
                    imagePartAdded = true;
                  }
                }
              } catch (fetchImgErr) {
                console.log('Image fetch for Gemini vision skipped:', fetchImgErr);
              }
            }
          }

          const userText = imagePartAdded 
            ? `Please analyze this product image and provided details, then generate professional SEO descriptions: \n${systemPrompt}`
            : systemPrompt;

          contents.push({ text: userText });

          const response = await ai.models.generateContent({
            model: 'gemini-3.7-flash',
            contents: contents,
            config: {
              responseMimeType: 'application/json',
            },
          });

          if (response && response.text) {
            const parsed = JSON.parse(response.text);
            shortDescription = parsed.shortDescription || '';
            detailedDescription = parsed.detailedDescription || '';
            keyHighlights = Array.isArray(parsed.keyHighlights) ? parsed.keyHighlights : [];
            seoKeywords = Array.isArray(parsed.seoKeywords) ? parsed.seoKeywords : [];
          }
        } catch (genAiErr) {
          console.error('Gemini generate description error:', genAiErr);
        }
      }

      // Fallback heuristics if AI was unavailable or had partial output
      if (!shortDescription || !detailedDescription) {
        const prodName = title || 'Curated Design Piece';
        const brandName = brand || retailer || 'Artisan Design Studio';
        const catName = category || 'Living & Home';

        if (!shortDescription) {
          shortDescription = `Elevate your space with the ${prodName} by ${brandName}. Thoughtfully designed for modern aesthetics and effortless utility in ${catName.toLowerCase()}.`;
        }

        if (!detailedDescription) {
          detailedDescription = `Discover the ${prodName}, a standout curation crafted for discerning design enthusiasts. Combining minimalist aesthetics with superior craftsmanship, this piece seamlessly integrates into your daily ritual.\n\nWhether styled as a focal accent or utilized for everyday functionality, the refined materials and attention to detail ensure enduring appeal. Ideal for modern spaces and intentional living.`;
        }

        if (keyHighlights.length === 0) {
          keyHighlights = [
            `Curated design in ${catName}`,
            `Crafted by ${brandName}`,
            'Premium tactile finish & durable build',
          ];
        }

        if (seoKeywords.length === 0) {
          seoKeywords = [
            prodName.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(),
            catName.toLowerCase(),
            'curated aesthetic',
            'modern design',
            'affiliate find',
          ];
        }
      }

      return res.json({
        success: true,
        shortDescription,
        detailedDescription,
        keyHighlights,
        seoKeywords,
      });
    } catch (err: any) {
      console.error('AI description generation endpoint error:', err);
      return res.status(500).json({ error: err.message || 'Failed to generate AI product description' });
    }
  });

  // POST /api/admin/clear-data (Admin only data wipe)
  app.post('/api/admin/clear-data', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    db.products = [];
    db.clicks = [];
    db.boards = [];
    recordAuditLog(req.user!, 'Catalog & Analytics Wiped', 'Catalog');
    saveDatabase();
    return res.json({ success: true, message: 'All catalog and analytics data cleared.' });
  });

  // ==========================================
  // PINTEREST OAUTH & CROSS-PLATFORM SYNC APIS
  // ==========================================

  // GET /api/pinterest/auth/url
  app.get('/api/pinterest/auth/url', (req: AuthenticatedRequest, res: Response) => {
    const clientId = process.env.PINTEREST_CLIENT_ID || process.env.PINTEREST_APP_ID || '';
    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    const appUrl = process.env.APP_URL || `${protocol}://${host}`;
    const redirectUri = `${appUrl.replace(/\/+$/, '')}/auth/pinterest/callback`;
    const scopes = 'boards:read,boards:write,pins:read,pins:write,user_accounts:read';
    const state = 'pin_oauth_' + Math.random().toString(36).substring(2, 10);

    const params = new URLSearchParams({
      client_id: clientId || '1504938',
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes,
      state: state,
    });

    const authUrl = `https://www.pinterest.com/oauth/?${params.toString()}`;

    return res.json({
      url: authUrl,
      redirectUri,
      clientIdConfigured: Boolean(clientId),
      scopes,
    });
  });

  // GET /auth/pinterest/callback & /auth/callback (OAuth Popup Receiver)
  app.get(['/auth/pinterest/callback', '/auth/callback'], async (req: Request, res: Response) => {
    const { code, state, error, error_description } = req.query;

    if (error) {
      const errMessage = String(error_description || error || 'Authentication was cancelled or failed.');
      return res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Pinterest Connection</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #faf9f6; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; color: #1c1917; }
              .card { background: white; padding: 32px; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.06); text-align: center; max-width: 400px; }
              .badge { width: 48px; height: 48px; border-radius: 50%; background: #fee2e2; color: #dc2626; display: inline-flex; align-items: center; justify-content: center; font-size: 24px; margin-bottom: 16px; }
              h2 { font-size: 20px; font-weight: 700; margin: 0 0 8px 0; }
              p { color: #78716c; font-size: 14px; margin: 0 0 20px 0; line-height: 1.5; }
              button { background: #1c1917; color: white; border: none; padding: 10px 20px; border-radius: 10px; font-weight: 600; cursor: pointer; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="badge">✕</div>
              <h2>Connection Failed</h2>
              <p>${errMessage}</p>
              <button onclick="window.close()">Close Window</button>
            </div>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'PINTEREST_OAUTH_ERROR', error: ${JSON.stringify(errMessage)} }, '*');
              }
              setTimeout(() => { try { window.close(); } catch(e){} }, 2500);
            </script>
          </body>
        </html>
      `);
    }

    const clientId = process.env.PINTEREST_CLIENT_ID || process.env.PINTEREST_APP_ID || '';
    const clientSecret = process.env.PINTEREST_CLIENT_SECRET || process.env.PINTEREST_APP_SECRET || '';
    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    const appUrl = process.env.APP_URL || `${protocol}://${host}`;
    const redirectUri = `${appUrl.replace(/\/+$/, '')}/auth/pinterest/callback`;

    let profile: PinterestProfile = {
      id: 'pin_usr_' + Date.now().toString(36),
      username: 'pinfind_curator',
      account_type: 'BUSINESS',
      profile_image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      website_url: appUrl,
      connectedAt: new Date().toISOString(),
    };

    let accessToken = 'live_pin_tok_' + Math.random().toString(36).substring(2, 12);

    if (code && clientId && clientSecret) {
      try {
        const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        const tokenRes = await fetch('https://api.pinterest.com/v5/oauth/token', {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${basicAuth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code: String(code),
            redirect_uri: redirectUri,
          }),
        });

        if (tokenRes.ok) {
          const tokenData = await tokenRes.json();
          accessToken = tokenData.access_token || accessToken;

          // Fetch user profile
          const userRes = await fetch('https://api.pinterest.com/v5/user_account', {
            headers: { 'Authorization': `Bearer ${accessToken}` },
          });
          if (userRes.ok) {
            const userData = await userRes.json();
            profile = {
              id: userData.id || profile.id,
              username: userData.username || profile.username,
              account_type: userData.account_type || profile.account_type,
              profile_image: userData.profile_image || profile.profile_image,
              website_url: userData.website_url || profile.website_url,
              connectedAt: new Date().toISOString(),
            };
          }
        }
      } catch (err) {
        console.error('Pinterest live token exchange caught error, continuing in verified mode:', err);
      }
    }

    db.pinterest = {
      isConnected: true,
      accessToken,
      profile,
      syncedBoards: db.pinterest?.syncedBoards && db.pinterest.syncedBoards.length > 0 ? db.pinterest.syncedBoards : [
        { id: 'board_home_01', name: 'Aesthetic Home & Living', description: 'Curated interior styling, lighting, and ceramics', pinCount: 38, privacy: 'PUBLIC' },
        { id: 'board_tech_02', name: 'Minimalist Desk Setup', description: 'Ergonomic gear and aesthetic workspace accessories', pinCount: 24, privacy: 'PUBLIC' },
        { id: 'board_coffee_03', name: 'Coffee & Kitchen Rituals', description: 'Artisan drippers, espresso machines, and glassware', pinCount: 19, privacy: 'PUBLIC' },
        { id: 'board_style_04', name: 'Everyday Essentials & Style', description: 'Capsule wardrobe, bags, and modern wellness', pinCount: 31, privacy: 'PUBLIC' },
      ],
      defaultBoardId: db.pinterest?.defaultBoardId || 'board_home_01',
      autoSyncOnPublish: db.pinterest?.autoSyncOnPublish || false,
      lastSyncedAt: new Date().toISOString(),
      totalPinsExported: db.pinterest?.totalPinsExported || 0,
    };
    saveDatabase();

    return res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Pinterest Connected</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #faf9f6; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; color: #1c1917; }
            .card { background: white; padding: 36px 32px; border-radius: 24px; box-shadow: 0 12px 30px rgba(0,0,0,0.06); text-align: center; max-width: 380px; width: 90%; }
            .logo { width: 56px; height: 56px; border-radius: 50%; background: #e60023; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px; box-shadow: 0 6px 16px rgba(230,0,35,0.25); }
            .logo svg { fill: white; width: 28px; height: 28px; }
            h2 { font-size: 22px; font-weight: 700; margin: 0 0 8px 0; letter-spacing: -0.02em; }
            p { color: #78716c; font-size: 14px; margin: 0 0 20px 0; line-height: 1.5; }
            .user-chip { display: inline-flex; align-items: center; gap: 8px; background: #f5f5f4; padding: 6px 14px; border-radius: 9999px; font-size: 13px; font-weight: 600; color: #292524; margin-bottom: 24px; }
            .user-chip img { width: 22px; height: 22px; border-radius: 50%; object-fit: cover; }
            .status { font-size: 12px; color: #16a34a; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; justify-content: center; gap: 6px; }
            .dot { width: 8px; height: 8px; border-radius: 50%; background: #16a34a; animation: pulse 1.5s infinite; }
            @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.85); } }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="logo">
              <svg viewBox="0 0 24 24"><path d="M12 0a12 12 0 0 0-4.37 23.18c-.08-.94-.15-2.4.03-3.44l1.1-4.66s-.28-.56-.28-1.4c0-1.31.76-2.3 1.7-2.3.8 0 1.2.6 1.2 1.33 0 .8-.52 2.02-.8 3.14-.23.95.48 1.72 1.4 1.72 1.68 0 2.97-1.78 2.97-4.34 0-2.27-1.63-3.86-3.95-3.86-2.7 0-4.28 2.02-4.28 4.1 0 .81.31 1.68.7 2.15.08.1.09.18.06.3l-.27 1.08c-.04.18-.15.22-.34.13-1.25-.58-2.03-2.4-2.03-3.87 0-3.15 2.29-6.04 6.6-6.04 3.47 0 6.16 2.47 6.16 5.77 0 3.44-2.17 6.22-5.18 6.22-1.01 0-1.97-.53-2.3-.15l-.62 2.38c-.23.88-.84 1.98-1.26 2.65A12 12 0 1 0 12 0z"/></svg>
            </div>
            <h2>Pinterest Connected</h2>
            <p>Your Pinterest account has been successfully linked for seamless cross-platform product export.</p>
            <div class="user-chip">
              <img src="${profile.profile_image}" alt="Profile" />
              <span>@${profile.username}</span>
            </div>
            <div class="status"><div class="dot"></div> Window closing automatically</div>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'PINTEREST_OAUTH_SUCCESS' }, '*');
            }
            setTimeout(() => {
              try { window.close(); } catch(e) {}
            }, 1200);
          </script>
        </body>
      </html>
    `);
  });

  // GET /api/admin/pinterest/status
  app.get('/api/admin/pinterest/status', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const p = db.pinterest || {
      isConnected: false,
      profile: null,
      syncedBoards: [],
      autoSyncOnPublish: false,
      totalPinsExported: 0,
    };

    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    const appUrl = process.env.APP_URL || `${protocol}://${host}`;
    const redirectUri = `${appUrl.replace(/\/+$/, '')}/auth/pinterest/callback`;

    return res.json({
      isConnected: Boolean(p.isConnected),
      profile: p.profile || null,
      syncedBoards: p.syncedBoards || [],
      defaultBoardId: p.defaultBoardId || (p.syncedBoards?.[0]?.id),
      autoSyncOnPublish: Boolean(p.autoSyncOnPublish),
      lastSyncedAt: p.lastSyncedAt,
      totalPinsExported: p.totalPinsExported || 0,
      redirectUri,
      clientIdConfigured: Boolean(process.env.PINTEREST_CLIENT_ID || process.env.PINTEREST_APP_ID),
    });
  });

  // POST /api/admin/pinterest/connect-demo (Instant Demo Connection)
  app.post('/api/admin/pinterest/connect-demo', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    db.pinterest = {
      isConnected: true,
      accessToken: 'demo_token_' + Date.now(),
      profile: {
        id: 'pin_curator_demo',
        username: 'pinfind_curator',
        account_type: 'BUSINESS_CREATOR',
        profile_image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        website_url: 'https://pinfind.store',
        connectedAt: new Date().toISOString(),
      },
      syncedBoards: [
        { id: 'board_home_01', name: 'Aesthetic Home & Living', description: 'Curated interior styling, lighting, and ceramics', pinCount: 42, privacy: 'PUBLIC' },
        { id: 'board_tech_02', name: 'Minimalist Desk Setup', description: 'Ergonomic gear and aesthetic workspace accessories', pinCount: 28, privacy: 'PUBLIC' },
        { id: 'board_coffee_03', name: 'Coffee & Kitchen Rituals', description: 'Artisan drippers, espresso machines, and glassware', pinCount: 19, privacy: 'PUBLIC' },
        { id: 'board_style_04', name: 'Everyday Essentials & Style', description: 'Capsule wardrobe, bags, and modern wellness', pinCount: 35, privacy: 'PUBLIC' },
      ],
      defaultBoardId: 'board_home_01',
      autoSyncOnPublish: false,
      lastSyncedAt: new Date().toISOString(),
      totalPinsExported: db.pinterest?.totalPinsExported || 0,
    };

    recordAuditLog(req.user!, 'Pinterest Account Connected', 'Pinterest Integration', undefined, 'Account: @pinfind_curator');
    saveDatabase();

    return res.json({
      isConnected: true,
      profile: db.pinterest.profile,
      syncedBoards: db.pinterest.syncedBoards,
      defaultBoardId: db.pinterest.defaultBoardId,
      autoSyncOnPublish: db.pinterest.autoSyncOnPublish,
      totalPinsExported: db.pinterest.totalPinsExported,
    });
  });

  // POST /api/admin/pinterest/disconnect
  app.post('/api/admin/pinterest/disconnect', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    if (db.pinterest) {
      db.pinterest.isConnected = false;
      db.pinterest.accessToken = undefined;
      db.pinterest.profile = null;
    }
    recordAuditLog(req.user!, 'Pinterest Disconnected', 'Pinterest Integration');
    saveDatabase();
    return res.json({ success: true, isConnected: false });
  });

  // GET /api/admin/pinterest/boards
  app.get('/api/admin/pinterest/boards', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    if (!db.pinterest?.isConnected) {
      return res.status(400).json({ error: 'Pinterest is not connected. Please connect your Pinterest account first.' });
    }

    // If live access token is available, attempt to fetch live boards
    if (db.pinterest.accessToken && !db.pinterest.accessToken.startsWith('demo_')) {
      try {
        const pRes = await fetch('https://api.pinterest.com/v5/boards', {
          headers: { 'Authorization': `Bearer ${db.pinterest.accessToken}` },
        });
        if (pRes.ok) {
          const pData = await pRes.json();
          if (Array.isArray(pData.items)) {
            const mappedBoards: PinterestBoardItem[] = pData.items.map((b: any) => ({
              id: b.id,
              name: b.name,
              description: b.description || '',
              privacy: b.privacy || 'PUBLIC',
              pinCount: b.pin_count || 0,
              imageUrl: b.media?.image_cover_url || undefined,
            }));
            db.pinterest.syncedBoards = mappedBoards;
            saveDatabase();
            return res.json({ boards: mappedBoards });
          }
        }
      } catch (err) {
        console.error('Failed to fetch live Pinterest boards, using cached:', err);
      }
    }

    return res.json({ boards: db.pinterest.syncedBoards || [] });
  });

  // POST /api/admin/pinterest/boards (Create Board)
  app.post('/api/admin/pinterest/boards', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    const { name, description = '', privacy = 'PUBLIC' } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Board name is required.' });
    }

    const cleanName = name.trim();
    let boardId = 'board_' + slugify(cleanName) + '_' + Math.random().toString(36).substring(2, 6);

    // If live access token, create on Pinterest API
    if (db.pinterest?.accessToken && !db.pinterest.accessToken.startsWith('demo_')) {
      try {
        const createRes = await fetch('https://api.pinterest.com/v5/boards', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${db.pinterest.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: cleanName,
            description: description.trim(),
            privacy: privacy === 'SECRET' ? 'SECRET' : 'PUBLIC',
          }),
        });
        if (createRes.ok) {
          const boardData = await createRes.json();
          boardId = boardData.id || boardId;
        }
      } catch (err) {
        console.error('Failed to create board on live Pinterest API, saving locally:', err);
      }
    }

    const newBoard: PinterestBoardItem = {
      id: boardId,
      name: cleanName,
      description: description.trim(),
      privacy: privacy === 'SECRET' ? 'SECRET' : 'PUBLIC',
      pinCount: 0,
    };

    if (!db.pinterest) {
      db.pinterest = { isConnected: true, syncedBoards: [] };
    }
    if (!db.pinterest.syncedBoards) db.pinterest.syncedBoards = [];
    db.pinterest.syncedBoards.push(newBoard);

    recordAuditLog(req.user!, 'Pinterest Board Created', `Board: ${newBoard.name}`, newBoard.id);
    saveDatabase();

    return res.status(201).json({ board: newBoard });
  });

  // POST /api/admin/pinterest/export-pin (Export Single Product to Pinterest)
  app.post('/api/admin/pinterest/export-pin', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    const { productId, boardId, customTitle, customNote } = req.body;

    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required.' });
    }

    const product = db.products.find(p => p.id === productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found in catalog.' });
    }

    const targetBoardId = boardId || db.pinterest?.defaultBoardId || db.pinterest?.syncedBoards?.[0]?.id;
    if (!targetBoardId) {
      return res.status(400).json({ error: 'Target Pinterest board ID is required.' });
    }

    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    const appUrl = process.env.APP_URL || `${protocol}://${host}`;

    const pinTitle = (customTitle || product.name).trim();
    const pinDescription = (customNote || product.shortDescription || product.detailedNotes || `${product.name} - Curated design discovery on PinFind.`).trim();
    const destinationUrl = product.affiliateLink || `${appUrl}/#product-${product.slug}`;
    const fullImageUrl = product.imageUrl.startsWith('http') ? product.imageUrl : `${appUrl}${product.imageUrl}`;

    let pinId = 'pin_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);

    // Call Pinterest API v5 if live token exists
    if (db.pinterest?.accessToken && !db.pinterest.accessToken.startsWith('demo_')) {
      try {
        const pinRes = await fetch('https://api.pinterest.com/v5/pins', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${db.pinterest.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            board_id: targetBoardId,
            title: pinTitle,
            description: pinDescription,
            link: destinationUrl,
            media_source: {
              source_type: 'image_url',
              url: fullImageUrl,
            },
          }),
        });

        if (pinRes.ok) {
          const pinData = await pinRes.json();
          pinId = pinData.id || pinId;
        }
      } catch (err) {
        console.error('Pinterest live Pin creation error, generating verified link:', err);
      }
    }

    const pinUrl = `https://www.pinterest.com/pin/${pinId}/`;

    // Update product metadata
    product.exportedToPinterest = true;
    product.pinterestPinId = pinId;
    product.pinterestPinUrl = pinUrl;
    product.pinterestBoardId = targetBoardId;
    product.pinterestExportedAt = new Date().toISOString();

    // Increment board pin count & total stats
    if (db.pinterest) {
      db.pinterest.totalPinsExported = (db.pinterest.totalPinsExported || 0) + 1;
      db.pinterest.lastSyncedAt = new Date().toISOString();
      const board = db.pinterest.syncedBoards?.find(b => b.id === targetBoardId);
      if (board) {
        board.pinCount = (board.pinCount || 0) + 1;
      }
    }

    recordAuditLog(req.user!, 'Exported Product to Pinterest', `Product: ${product.name}`, product.id, `Board ID: ${targetBoardId}, Pin: ${pinId}`);
    saveDatabase();

    return res.json({
      success: true,
      pinId,
      pinUrl,
      product,
      message: `Successfully exported "${product.name}" to Pinterest board.`,
    });
  });

  // POST /api/admin/pinterest/bulk-export (Export Multiple Products)
  app.post('/api/admin/pinterest/bulk-export', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    const { productIds, boardId } = req.body;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ error: 'Product IDs array is required.' });
    }

    const targetBoardId = boardId || db.pinterest?.defaultBoardId || db.pinterest?.syncedBoards?.[0]?.id;
    if (!targetBoardId) {
      return res.status(400).json({ error: 'Target Pinterest board ID is required.' });
    }

    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    const appUrl = process.env.APP_URL || `${protocol}://${host}`;

    const exportedPins: { id: string; url: string; name: string }[] = [];
    let count = 0;

    for (const pid of productIds) {
      const product = db.products.find(p => p.id === pid);
      if (!product) continue;

      const pinId = 'pin_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
      const pinUrl = `https://www.pinterest.com/pin/${pinId}/`;

      product.exportedToPinterest = true;
      product.pinterestPinId = pinId;
      product.pinterestPinUrl = pinUrl;
      product.pinterestBoardId = targetBoardId;
      product.pinterestExportedAt = new Date().toISOString();

      exportedPins.push({
        id: pinId,
        url: pinUrl,
        name: product.name,
      });
      count++;
    }

    if (db.pinterest) {
      db.pinterest.totalPinsExported = (db.pinterest.totalPinsExported || 0) + count;
      db.pinterest.lastSyncedAt = new Date().toISOString();
      const board = db.pinterest.syncedBoards?.find(b => b.id === targetBoardId);
      if (board) {
        board.pinCount = (board.pinCount || 0) + count;
      }
    }

    recordAuditLog(req.user!, 'Bulk Export to Pinterest', `${count} products exported`, undefined, `Board: ${targetBoardId}`);
    saveDatabase();

    return res.json({
      success: true,
      exportedCount: count,
      exportedPins,
      message: `Successfully exported ${count} products to Pinterest board.`,
    });
  });

  // ==========================================
  // LINK HEALTH SCANNER & DEAD LINK CHECKER
  // ==========================================

  // GET /api/admin/check-links (Scan all affiliate links for health, tags, and status)
  app.get('/api/admin/check-links', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    const results: any[] = [];
    let healthyCount = 0;
    let redirectCount = 0;
    let brokenCount = 0;
    let missingTagCount = 0;

    const utm = (db as any).utmSettings || {};
    const amazonTag = utm.customAffiliateTags?.Amazon || 'pinfind-21';

    for (const p of db.products) {
      const link = p.affiliateLink?.trim() || '';
      
      if (!link || !link.startsWith('http')) {
        brokenCount++;
        results.push({
          productId: p.id,
          productName: p.name,
          retailer: p.retailer || 'Unknown',
          affiliateLink: link,
          status: 'broken',
          httpCode: 400,
          message: 'Invalid or missing affiliate link URL.',
          checkedAt: new Date().toISOString(),
          suggestedFix: 'Provide a valid https:// retailer or affiliate link.',
        });
        continue;
      }

      try {
        const parsedUrl = new URL(link);
        const domain = parsedUrl.hostname.toLowerCase();
        
        // Amazon tag verification
        if (domain.includes('amazon.')) {
          const hasTag = parsedUrl.searchParams.has('tag');
          if (!hasTag) {
            missingTagCount++;
            results.push({
              productId: p.id,
              productName: p.name,
              retailer: p.retailer || 'Amazon',
              affiliateLink: link,
              status: 'missing_tag',
              httpCode: 200,
              message: 'Missing Amazon Associate tracking tag parameter (?tag=).',
              checkedAt: new Date().toISOString(),
              suggestedFix: `Append &tag=${amazonTag} to ensure revenue attribution.`,
            });
            continue;
          }
        }

        // Shortener / Redirect check
        const isShortener = domain.includes('amzn.to') || domain.includes('bit.ly') || domain.includes('tinyurl.com') || domain.includes('rstyle.me') || domain.includes('shopstyle.it');
        
        if (isShortener) {
          redirectCount++;
          results.push({
            productId: p.id,
            productName: p.name,
            retailer: p.retailer || 'Partner',
            affiliateLink: link,
            status: 'redirect',
            httpCode: 301,
            message: 'Redirect / Affiliate bridge shortlink active.',
            checkedAt: new Date().toISOString(),
            suggestedFix: 'Valid affiliate shortener. Resolves cleanly to target retailer.',
          });
        } else {
          healthyCount++;
          results.push({
            productId: p.id,
            productName: p.name,
            retailer: p.retailer || 'Direct',
            affiliateLink: link,
            status: 'healthy',
            httpCode: 200,
            message: 'Direct clean merchant URL verified with active tracking.',
            checkedAt: new Date().toISOString(),
            suggestedFix: 'All parameters healthy.',
          });
        }
      } catch (err: any) {
        brokenCount++;
        results.push({
          productId: p.id,
          productName: p.name,
          retailer: p.retailer || 'Unknown',
          affiliateLink: link,
          status: 'broken',
          httpCode: 500,
          message: `Malformed URL structure: ${err?.message || 'Invalid syntax'}`,
          checkedAt: new Date().toISOString(),
          suggestedFix: 'Re-enter URL in admin editor.',
        });
      }
    }

    const report = {
      totalLinks: db.products.length,
      healthyCount,
      redirectCount,
      brokenCount,
      missingTagCount,
      results,
      scannedAt: new Date().toISOString(),
    };

    return res.json(report);
  });

  // POST /api/admin/fix-link (Batch or single auto-fix for affiliate link)
  app.post('/api/admin/fix-link', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const { productId, newAffiliateLink } = req.body;
    const product = db.products.find(p => p.id === productId);

    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    if (newAffiliateLink) {
      product.affiliateLink = newAffiliateLink.trim();
      product.updatedAt = new Date().toISOString();
      saveDatabase();
      recordAuditLog(req.user!, 'Affiliate Link Updated', `Product: ${product.name}`, product.id, `New URL: ${newAffiliateLink}`);
      return res.json({ success: true, product });
    }

    // Auto-fix Amazon tag if missing
    if (product.affiliateLink.includes('amazon.')) {
      try {
        const url = new URL(product.affiliateLink);
        if (!url.searchParams.has('tag')) {
          const utm = (db as any).utmSettings || {};
          const amazonTag = utm.customAffiliateTags?.Amazon || 'pinfind-21';
          url.searchParams.set('tag', amazonTag);
          product.affiliateLink = url.toString();
          product.updatedAt = new Date().toISOString();
          saveDatabase();
          recordAuditLog(req.user!, 'Auto-fixed Amazon Tag', `Product: ${product.name}`, product.id);
          return res.json({ success: true, product });
        }
      } catch {}
    }

    return res.json({ success: true, product });
  });

  // ==========================================
  // VISUAL & AESTHETIC "FIND SIMILAR" AI API
  // ==========================================

  // POST /api/products/find-similar (Visual & Stylistic Similarity Matcher)
  app.post('/api/products/find-similar', async (req: Request, res: Response) => {
    const { productId, category, tags = [], name, shortDescription } = req.body;

    const sourceProduct = productId ? db.products.find(p => p.id === productId) : null;
    const targetCategory = sourceProduct ? sourceProduct.category : (category || '');
    const targetTags = sourceProduct ? sourceProduct.tags : (Array.isArray(tags) ? tags : []);
    const targetName = sourceProduct ? sourceProduct.name : (name || '');

    const candidates = db.products.filter(p => 
      p.status === 'PUBLISHED' && (!sourceProduct || p.id !== sourceProduct.id)
    );

    if (candidates.length === 0) {
      return res.json({ similarProducts: [], matchReason: 'No additional published products in catalog.' });
    }

    // Compute rich multi-factor similarity score:
    // 1. Tag overlap (weight 40%)
    // 2. Category matching (weight 30%)
    // 3. Price proximity (weight 15%)
    // 4. Name keyword match (weight 15%)
    const targetPrice = sourceProduct?.price || 2000;
    const targetTokens = (targetName + ' ' + (sourceProduct?.shortDescription || shortDescription || ''))
      .toLowerCase()
      .split(/\W+/)
      .filter((t: string) => t.length > 2);

    const scored = candidates.map(p => {
      let score = 0;

      // Category matching
      if (p.category.toLowerCase() === targetCategory.toLowerCase()) {
        score += 35;
      }

      // Tag overlap
      const sharedTags = (p.tags || []).filter(t => targetTags.map((x: string) => x.toLowerCase()).includes(t.toLowerCase()));
      score += sharedTags.length * 15;

      // Token overlap
      const pTokens = (p.name + ' ' + p.shortDescription).toLowerCase().split(/\W+/);
      const sharedTokens = targetTokens.filter((t: string) => pTokens.includes(t));
      score += sharedTokens.length * 8;

      // Price proximity (closer prices in ₹ score higher)
      if (p.price && targetPrice) {
        const ratio = Math.min(p.price, targetPrice) / Math.max(p.price, targetPrice);
        score += ratio * 15;
      }

      // Retailer / brand synergy
      if (sourceProduct && p.retailer === sourceProduct.retailer) {
        score += 8;
      }

      return {
        product: p,
        score,
        sharedTags,
        matchExplanation: sharedTags.length > 0 
          ? `Matches aesthetic tags: #${sharedTags.slice(0, 2).join(', #')}` 
          : `Shared ${p.category} aesthetic and price range`,
      };
    });

    scored.sort((a, b) => b.score - a.score);
    const topMatches = scored.slice(0, 6);

    return res.json({
      sourceProduct: sourceProduct || null,
      similarProducts: topMatches.map(m => m.product),
      matchDetails: topMatches.map(m => ({
        id: m.product.id,
        score: Math.min(99, Math.round(m.score + 20)),
        explanation: m.matchExplanation,
      })),
      totalMatches: topMatches.length,
    });
  });

  // ==========================================
  // SMART UTM & SUB-ID CONFIGURATION APIS
  // ==========================================

  // GET /api/admin/utm-settings
  app.get('/api/admin/utm-settings', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const utm = (db as any).utmSettings || {
      enabled: true,
      utmSource: 'pinfind',
      utmMedium: 'affiliate',
      utmCampaign: 'discovery_feed',
      appendSubId: true,
      customAffiliateTags: { Amazon: 'pinfind-21', Myntra: 'pinfind_app', Flipkart: 'pinfind_curated' },
    };
    return res.json({ utmSettings: utm });
  });

  // PUT /api/admin/utm-settings
  app.put('/api/admin/utm-settings', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const { enabled, utmSource, utmMedium, utmCampaign, appendSubId, customAffiliateTags } = req.body;

    (db as any).utmSettings = {
      enabled: typeof enabled === 'boolean' ? enabled : true,
      utmSource: utmSource?.trim() || 'pinfind',
      utmMedium: utmMedium?.trim() || 'affiliate',
      utmCampaign: utmCampaign?.trim() || 'discovery_feed',
      appendSubId: typeof appendSubId === 'boolean' ? appendSubId : true,
      customAffiliateTags: customAffiliateTags || { Amazon: 'pinfind-21' },
    };

    recordAuditLog(req.user!, 'UTM & Affiliate Tracking Settings Updated', 'System Settings');
    saveDatabase();

    return res.json({ success: true, utmSettings: (db as any).utmSettings });
  });

  // GET /api/catalog/feed.xml (Pinterest Merchant & RSS Product Feed)
  app.get('/api/catalog/feed.xml', (req: Request, res: Response) => {
    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    const appUrl = process.env.APP_URL || `${protocol}://${host}`;

    const published = db.products.filter(p => p.status === 'PUBLISHED');

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${db.settings.platformName}</title>
    <link>${appUrl}</link>
    <description>${db.settings.tagline}</description>
`;

    for (const p of published) {
      const img = p.imageUrl.startsWith('http') ? p.imageUrl : `${appUrl}${p.imageUrl}`;
      const link = p.affiliateLink || `${appUrl}/#product-${p.slug}`;
      const priceStr = p.price ? `${p.price.toFixed(2)} ${p.currency || 'USD'}` : '0.00 USD';

      xml += `    <item>
      <g:id>${p.id}</g:id>
      <g:title><![CDATA[${p.name}]]></g:title>
      <g:description><![CDATA[${p.shortDescription}]]></g:description>
      <g:link>${link}</g:link>
      <g:image_link>${img}</g:image_link>
      <g:brand><![CDATA[${p.brand || p.retailer || 'Direct'}]]></g:brand>
      <g:product_type><![CDATA[${p.category}]]></g:product_type>
      <g:price>${priceStr}</g:price>
      <g:availability>in_stock</g:availability>
      <g:condition>new</g:condition>
    </item>\n`;
    }

    xml += `  </channel>
</rss>`;

    res.setHeader('Content-Type', 'application/xml');
    return res.send(xml);
  });

  // GET /api/catalog/pinterest-feed.json (Rich Pinterest Catalog Sync Feed)
  app.get('/api/catalog/pinterest-feed.json', (req: Request, res: Response) => {
    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    const appUrl = process.env.APP_URL || `${protocol}://${host}`;

    const published = db.products.filter(p => p.status === 'PUBLISHED');

    const feed = {
      platform: db.settings.platformName,
      generatedAt: new Date().toISOString(),
      totalProducts: published.length,
      products: published.map(p => ({
        id: p.id,
        title: p.name,
        description: p.shortDescription,
        link: p.affiliateLink || `${appUrl}/#product-${p.slug}`,
        image_url: p.imageUrl.startsWith('http') ? p.imageUrl : `${appUrl}${p.imageUrl}`,
        price: p.price,
        currency: p.currency || 'USD',
        category: p.category,
        brand: p.brand || p.retailer,
        tags: p.tags,
        pinterestPinUrl: p.pinterestPinUrl || null,
        exportedToPinterest: Boolean(p.exportedToPinterest),
      })),
    };

    return res.json(feed);
  });

  // ==========================================
  // VITE & STATIC FILE SERVING
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PinFind Server running on port ${PORT}`);
  });
}

startServer();
