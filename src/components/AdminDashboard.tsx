import React, { useState, useEffect, useRef } from 'react';
import { 
  Product, AspectRatio, ProductStatus, AdminAnalyticsSummary, 
  AdminSubTab, Category, AuditLog, User, PlatformSettings 
} from '../types';
import { api } from '../services/api';
import { 
  Plus, Edit3, Trash2, ExternalLink, Sparkles, Image as ImageIcon, 
  Tag, TrendingUp, CheckCircle, RefreshCw, Download, 
  Upload, Search, ArrowUpRight, ShieldCheck, Eye, 
  BarChart3, Settings, AlertCircle, ArrowLeft, Globe, 
  Layers, Smartphone, Monitor, Tablet, ShoppingBag, Clock,
  Copy, CheckSquare, Square, FolderPlus, Users, Activity,
  Sliders, Link2, DollarSign, X, AlertTriangle, ShieldAlert, Zap,
  Share2
} from 'lucide-react';
import { searchIndex } from '../services/searchIndex';
import { PinterestSyncView } from './PinterestSyncView';
import { PinterestSyncModal } from './PinterestSyncModal';
import { LinkHealthChecker } from './admin/LinkHealthChecker';
import { AffiliateEarningsEstimator } from './admin/AffiliateEarningsEstimator';
import { UtmAutoTaggerSettings } from './admin/UtmAutoTaggerSettings';
import { AuditLogSection } from './admin/AuditLogSection';
import { TrafficStats } from './admin/TrafficStats';
import { PriceIntelligence } from './admin/PriceIntelligence';
import { formatPrice } from '../utils/formatters';

interface AdminDashboardProps {
  products: Product[];
  analytics: AdminAnalyticsSummary | null;
  onAddProduct: (productData: Partial<Product>) => Promise<void>;
  onUpdateProduct: (id: string, productData: Partial<Product>) => Promise<void>;
  onUpdateStatus: (id: string, status: ProductStatus) => Promise<void>;
  onDeleteProduct: (productId: string) => Promise<void>;
  onClearAllData: () => Promise<void>;
  onRefreshAnalytics: () => void;
  onExitAdmin: () => void;
  onShowToast: (message: string) => void;
  onOpenProduct: (product: Product) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  products,
  analytics,
  onAddProduct,
  onUpdateProduct,
  onUpdateStatus,
  onDeleteProduct,
  onClearAllData,
  onRefreshAnalytics,
  onExitAdmin,
  onShowToast,
  onOpenProduct,
}) => {
  // Navigation
  const [activeSubTab, setActiveSubTab] = useState<AdminSubTab>('dashboard');

  // Filter & Search & Pagination for Products
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name-asc' | 'price-desc' | 'clicks-desc'>('newest');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Bulk Selection
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [bulkActionConfirm, setBulkActionConfirm] = useState<{ action: string; count: number } | null>(null);

  // Categories State
  const [categories, setCategories] = useState<(Category & { totalProducts: number; publishedProducts: number })[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [newCatSubcats, setNewCatSubcats] = useState('');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Users State
  const [adminUsers, setAdminUsers] = useState<User[]>([]);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'USER' | 'ADMIN'>('USER');

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Platform Settings State
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>({
    platformName: 'PinFind Discovery Platform',
    tagline: 'Visual Product Discovery & Curated Design Collections',
    storeDisclaimer: 'We curate products based on design excellence and quality. All product links connect you directly to official merchant stores.',
    defaultCurrency: 'USD',
    contactEmail: 'admin@pinfind.store',
  });

  // Pinterest Export Modals State
  const [pinterestExportProduct, setPinterestExportProduct] = useState<Product | null>(null);
  const [showBulkPinterestModal, setShowBulkPinterestModal] = useState(false);

  // Edit / Form State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importFileRef = useRef<HTMLInputElement>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [detailedNotes, setDetailedNotes] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('tall');
  const [category, setCategory] = useState('Home Decor');
  const [subcategory, setSubcategory] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [productUrl, setProductUrl] = useState('');
  const [affiliateLink, setAffiliateLink] = useState('');
  const [retailer, setRetailer] = useState('');
  const [brand, setBrand] = useState('');
  const [price, setPrice] = useState<string>('');
  const [originalPrice, setOriginalPrice] = useState<string>('');
  const [currency, setCurrency] = useState('USD');
  const [isTrending, setIsTrending] = useState(false);
  const [isStaffPick, setIsStaffPick] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);
  const [status, setStatus] = useState<ProductStatus>('PUBLISHED');
  const [formError, setFormError] = useState<string | null>(null);
  const [imageUploadProgress, setImageUploadProgress] = useState(false);
  const [isGeneratingAiDesc, setIsGeneratingAiDesc] = useState(false);
  const [aiTone, setAiTone] = useState<'editorial' | 'minimalist' | 'persuasive' | 'technical'>('editorial');

  // Load Categories, Users, Audit Logs, Settings on mount
  const loadAuxData = async () => {
    try {
      const [cats, users, logs, settings] = await Promise.all([
        api.getAdminCategories().catch(() => []),
        api.getAdminUsers().catch(() => []),
        api.getAuditLogs().catch(() => []),
        api.getAdminSettings().catch(() => null),
      ]);
      if (cats.length > 0) setCategories(cats);
      if (users.length > 0) setAdminUsers(users);
      if (logs.length > 0) setAuditLogs(logs);
      if (settings) setPlatformSettings(settings);
    } catch (e) {
      console.error('Failed to load aux data:', e);
    }
  };

  useEffect(() => {
    loadAuxData();
  }, []);

  const resetForm = () => {
    setName('');
    setShortDescription('');
    setDetailedNotes('');
    setImageUrl('');
    setAspectRatio('tall');
    setCategory(categories[0]?.name || 'Home Decor');
    setSubcategory('');
    setTagsInput('');
    setProductUrl('');
    setAffiliateLink('');
    setRetailer('');
    setBrand('');
    setPrice('');
    setOriginalPrice('');
    setCurrency('USD');
    setIsTrending(false);
    setIsStaffPick(false);
    setIsFeatured(false);
    setStatus('PUBLISHED');
    setEditingProduct(null);
    setFormError(null);
  };

  const handleStartEdit = (prod: Product) => {
    setEditingProduct(prod);
    setName(prod.name);
    setShortDescription(prod.shortDescription || '');
    setDetailedNotes(prod.detailedNotes || '');
    setImageUrl(prod.imageUrl);
    setAspectRatio(prod.aspectRatio || 'tall');
    setCategory(prod.category);
    setSubcategory(prod.subcategory || '');
    setTagsInput(prod.tags ? prod.tags.join(', ') : '');
    setProductUrl(prod.productUrl || '');
    setAffiliateLink(prod.affiliateLink);
    setRetailer(prod.retailer || '');
    setBrand(prod.brand || prod.retailer || '');
    setPrice(prod.price !== undefined ? String(prod.price) : '');
    setOriginalPrice(prod.originalPrice !== undefined ? String(prod.originalPrice) : '');
    setCurrency(prod.currency || 'USD');
    setIsTrending(Boolean(prod.isTrending));
    setIsStaffPick(Boolean(prod.isStaffPick));
    setIsFeatured(Boolean(prod.isFeatured));
    setStatus(prod.status || 'PUBLISHED');
    setFormError(null);
    setActiveSubTab('new');
  };

  // Image Upload Handling (Persistent Server Storage)
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFormError('Please select a valid image file (JPEG, PNG, WebP, GIF, SVG).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setFormError('Image size exceeds 10MB limit.');
      return;
    }

    setImageUploadProgress(true);
    setFormError(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        try {
          const res = await api.uploadImage(base64Data, file.name, file.type);
          setImageUrl(res.imageUrl);
          onShowToast('Image uploaded and securely stored!');
        } catch (err: any) {
          // Fallback to base64 data url if upload endpoint had issues
          setImageUrl(base64Data);
          onShowToast('Image loaded successfully.');
        } finally {
          setImageUploadProgress(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setFormError('Failed to process image file.');
      setImageUploadProgress(false);
    }
  };

  // AI Description Generator (Gemini Vision + Text Copywriter)
  const handleGenerateAiDescription = async () => {
    if (!name.trim() && !imageUrl.trim()) {
      setFormError('Please provide either a product title or an image URL to generate an AI description.');
      return;
    }
    setIsGeneratingAiDesc(true);
    setFormError(null);
    try {
      const res = await api.generateAiDescription({
        title: name.trim(),
        imageUrl: imageUrl.trim(),
        category,
        brand: brand.trim(),
        retailer: retailer.trim(),
        keywords: tagsInput.trim(),
        tone: aiTone,
      });

      if (res.shortDescription) {
        setShortDescription(res.shortDescription);
      }
      if (res.detailedDescription) {
        let fullDesc = res.detailedDescription;
        if (res.keyHighlights && res.keyHighlights.length > 0) {
          fullDesc += '\n\nKey Highlights:\n' + res.keyHighlights.map(h => `• ${h}`).join('\n');
        }
        setDetailedNotes(fullDesc);
      }
      if ((!tagsInput || tagsInput.trim() === '') && res.seoKeywords && res.seoKeywords.length > 0) {
        setTagsInput(res.seoKeywords.join(', '));
      }

      onShowToast('✨ Generated professional SEO product description!');
    } catch (err: any) {
      setFormError(err.message || 'Failed to generate AI description');
    } finally {
      setIsGeneratingAiDesc(false);
    }
  };

  const handleSubmit = async (submitStatus?: ProductStatus) => {
    setFormError(null);

    if (!name.trim()) {
      setFormError('Product Name is required.');
      return;
    }
    if (!imageUrl.trim()) {
      setFormError('Product Image is required. Please upload an image or provide a URL.');
      return;
    }
    if (!affiliateLink.trim()) {
      setFormError('Affiliate destination URL is required.');
      return;
    }

    try {
      new URL(affiliateLink.trim());
    } catch {
      setFormError('Affiliate URL is invalid. Please enter a valid URL (e.g., https://...).');
      return;
    }

    const tagsArray = tagsInput
      .split(',')
      .map(t => t.trim().toLowerCase().replace(/^#/, ''))
      .filter(t => t.length > 0);

    const priceNum = price.trim() ? parseFloat(price) : undefined;
    const origPriceNum = originalPrice.trim() ? parseFloat(originalPrice) : undefined;
    const finalStatus: ProductStatus = submitStatus || status || 'PUBLISHED';

    setIsSubmitting(true);

    try {
      if (editingProduct) {
        await onUpdateProduct(editingProduct.id, {
          name: name.trim(),
          shortDescription: shortDescription.trim(),
          detailedNotes: detailedNotes.trim() || undefined,
          imageUrl: imageUrl.trim(),
          aspectRatio,
          category,
          subcategory: subcategory.trim() || undefined,
          tags: tagsArray,
          productUrl: productUrl.trim() || undefined,
          affiliateLink: affiliateLink.trim(),
          retailer: retailer.trim() || brand.trim() || 'Direct Brand',
          brand: brand.trim() || retailer.trim() || 'Direct Brand',
          price: priceNum,
          originalPrice: origPriceNum,
          currency,
          isTrending,
          isStaffPick,
          isFeatured,
          status: finalStatus,
        });
        onShowToast(`Updated "${name}" successfully!`);
        resetForm();
        setActiveSubTab('products');
      } else {
        await onAddProduct({
          name: name.trim(),
          shortDescription: shortDescription.trim(),
          detailedNotes: detailedNotes.trim() || undefined,
          imageUrl: imageUrl.trim(),
          aspectRatio,
          category,
          subcategory: subcategory.trim() || undefined,
          tags: tagsArray,
          productUrl: productUrl.trim() || undefined,
          affiliateLink: affiliateLink.trim(),
          retailer: retailer.trim() || brand.trim() || 'Direct Brand',
          brand: brand.trim() || retailer.trim() || 'Direct Brand',
          price: priceNum,
          originalPrice: origPriceNum,
          currency,
          isTrending,
          isStaffPick,
          isFeatured,
          status: finalStatus,
        });
        onShowToast(`New Product "${name}" created with status: ${finalStatus}!`);
        resetForm();
        setActiveSubTab('products');
      }
      loadAuxData();
    } catch (err: any) {
      setFormError(err.message || 'Operation failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Duplicate Product
  const handleDuplicate = async (prod: Product) => {
    try {
      const duplicated = await api.duplicateProduct(prod.id);
      onShowToast(`Duplicated "${prod.name}" as draft.`);
      loadAuxData();
      // Reload products
      window.location.reload();
    } catch (err: any) {
      onShowToast(`Duplication failed: ${err.message}`);
    }
  };

  // Bulk Operations
  const handleSelectAll = () => {
    if (selectedProductIds.length === filteredProducts.length) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(filteredProducts.map(p => p.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedProductIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleExecuteBulkAction = async (action: string) => {
    if (selectedProductIds.length === 0) return;
    try {
      const res = await api.bulkUpdateProducts(action, selectedProductIds);
      onShowToast(`Bulk action "${action}" completed for ${res.count} products!`);
      setSelectedProductIds([]);
      setBulkActionConfirm(null);
      window.location.reload();
    } catch (err: any) {
      onShowToast(`Bulk action failed: ${err.message}`);
    }
  };

  // Category CRUD
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      const subcats = newCatSubcats.split(',').map(s => s.trim()).filter(Boolean);
      await api.createCategory({
        name: newCatName.trim(),
        description: newCatDesc.trim(),
        subcategories: subcats,
      });
      onShowToast(`Created category "${newCatName}"!`);
      setNewCatName('');
      setNewCatDesc('');
      setNewCatSubcats('');
      loadAuxData();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to create category');
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete the category "${name}"?`)) return;
    try {
      await api.deleteCategory(id);
      onShowToast(`Deleted category "${name}"`);
      loadAuxData();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to delete category');
    }
  };

  // User CRUD
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail.trim() || !newUserPassword.trim()) return;
    try {
      await api.createAdminUser({
        email: newUserEmail.trim(),
        name: newUserName.trim() || newUserEmail.split('@')[0],
        password: newUserPassword,
        role: 'USER',
      });
      onShowToast(`Created user account for ${newUserEmail}!`);
      setNewUserEmail('');
      setNewUserName('');
      setNewUserPassword('');
      loadAuxData();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to create user');
    }
  };

  const handleToggleUserRole = async (user: User) => {
    const nextRole = user.role === 'ADMIN' ? 'USER' : 'ADMIN';
    if (!window.confirm(`Change role of ${user.email} to ${nextRole}?`)) return;
    try {
      await api.updateUserRole(user.id, nextRole);
      onShowToast(`Updated ${user.email} to ${nextRole}`);
      loadAuxData();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to update role');
    }
  };

  const handleDeleteUser = async (id: string, email: string) => {
    if (!window.confirm(`Delete user account ${email}?`)) return;
    try {
      await api.deleteUser(id);
      onShowToast(`Deleted user ${email}`);
      loadAuxData();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to delete user');
    }
  };

  // Catalog Export / Import
  const handleExportCatalog = async () => {
    try {
      const data = await api.exportCatalog();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `glory-affiliate-catalog-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      onShowToast('Catalog exported successfully!');
    } catch (err: any) {
      onShowToast(`Export failed: ${err.message}`);
    }
  };

  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const productList = Array.isArray(json) ? json : json.products || [];
      if (!Array.isArray(productList) || productList.length === 0) {
        onShowToast('No products found in JSON file.');
        return;
      }
      const replace = window.confirm(`Importing ${productList.length} products. Do you want to replace existing products? (Click OK to Replace, Cancel to Append)`);
      const res = await api.importCatalog(productList, replace);
      onShowToast(`Successfully imported ${res.importedCount} products!`);
      window.location.reload();
    } catch (err: any) {
      onShowToast(`Import failed: ${err.message}`);
    }
  };

  // Platform Settings Save
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.updateAdminSettings(platformSettings);
      setPlatformSettings(res);
      onShowToast('Platform settings saved successfully!');
    } catch (err: any) {
      onShowToast(err.message || 'Failed to save settings');
    }
  };

  // Benchmark & Search Index State
  const [indexBenchmarkStats, setIndexBenchmarkStats] = useState<{
    indexedCount: number;
    rebuildTimeMs: number;
    avgQueryLatencyMs: number;
    testedQueriesCount: number;
    lastTested: string;
  } | null>(null);
  const [isRunningBenchmark, setIsRunningBenchmark] = useState(false);

  const handleRebuildSearchIndex = () => {
    const t0 = performance.now();
    searchIndex.buildIndex(products);
    const timeMs = Number((performance.now() - t0).toFixed(2));
    setIndexBenchmarkStats({
      indexedCount: products.length,
      rebuildTimeMs: timeMs,
      avgQueryLatencyMs: 0.15,
      testedQueriesCount: 0,
      lastTested: new Date().toLocaleTimeString(),
    });
    onShowToast(`Search index rebuilt successfully (${products.length} products in ${timeMs}ms)`);
  };

  const handleRunSearchBenchmark = () => {
    setIsRunningBenchmark(true);
    setTimeout(() => {
      const sampleQueries = [
        'desk', 'chair', 'lamp', 'ceramic', 'coffee', 'nordic', 'wood', 
        'linen', 'minimalist', 'keyboard', 'organizer', 'walnut', 'aesthetic',
        'home', 'modern', 'lighting', 'plant', 'shelf', 'leather', 'brass'
      ];
      const t0 = performance.now();
      let totalHits = 0;
      // Execute 50 query iterations
      for (let i = 0; i < 50; i++) {
        const q = sampleQueries[i % sampleQueries.length];
        const res = searchIndex.search(q, 100);
        totalHits += res.ids.length;
      }
      const totalTime = performance.now() - t0;
      const avgLatency = Number((totalTime / 50).toFixed(3));
      
      setIndexBenchmarkStats({
        indexedCount: products.length,
        rebuildTimeMs: indexBenchmarkStats?.rebuildTimeMs || 1.2,
        avgQueryLatencyMs: avgLatency,
        testedQueriesCount: 50,
        lastTested: new Date().toLocaleTimeString(),
      });
      setIsRunningBenchmark(false);
      onShowToast(`Benchmark complete: Avg query speed ${avgLatency}ms across 50 tests!`);
    }, 100);
  };

  // Filter & Sort Products for Management View
  const filteredProducts = products.filter(p => {
    if (searchFilter.trim()) {
      const searchRes = searchIndex.search(searchFilter.trim(), 2000);
      const matchSet = new Set(searchRes.ids);
      if (!matchSet.has(p.id)) return false;
    }

    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    const matchesCat = categoryFilter === 'ALL' || p.category.toLowerCase() === categoryFilter.toLowerCase();

    return matchesStatus && matchesCat;
  }).sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
    if (sortBy === 'price-desc') return (b.price || 0) - (a.price || 0);
    if (sortBy === 'clicks-desc') return (b.clicksCount || 0) - (a.clicksCount || 0);
    return 0;
  });

  // Client-side pagination over filtered product list
  const totalFilteredCount = filteredProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredCount / pageSize));
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Status Badge UI
  const getStatusBadge = (st: ProductStatus) => {
    switch (st) {
      case 'PUBLISHED':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">Published</span>;
      case 'DRAFT':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">Draft</span>;
      case 'UNPUBLISHED':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-300">Unpublished</span>;
      case 'ARCHIVED':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">Archived</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-slate-100 text-slate-700">Unknown</span>;
    }
  };

  // Nav Items definition matching requirement:
  // Dashboard, Traffic, Products, Add Product, Categories, Pinterest Sync, Store Links, Analytics, Users, Settings, Audit Log
  const navItems: { id: AdminSubTab; label: string; icon: any; count?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'price-intelligence', label: 'Price Intelligence', icon: Sparkles },
    { id: 'traffic', label: 'Traffic & Visitors', icon: Globe },
    { id: 'products', label: 'Products', icon: ShoppingBag, count: products.length },
    { id: 'new', label: editingProduct ? 'Edit Product' : '+ Add Product', icon: Plus },
    { id: 'categories', label: 'Categories', icon: Layers, count: categories.length },
    { id: 'pinterest', label: 'Pinterest Sync', icon: Share2 },
    { id: 'links', label: 'Store Links', icon: Link2 },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
    { id: 'users', label: 'Users', icon: Users, count: adminUsers.length },
    { id: 'audit', label: 'Audit Log', icon: Activity, count: auditLogs.length },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div id="admin-dashboard-container" className="max-w-[1720px] w-full mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Top Header & Platform Role Banner */}
      <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-indigo-500 text-white flex items-center gap-1.5 shadow-sm">
              <ShieldCheck className="w-3.5 h-3.5" /> Authenticated Administrator
            </span>
            <span className="text-xs text-slate-400 font-medium">Unlimited Product Architecture & RBAC Isolation</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {platformSettings.platformName} Admin Console
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1.5 max-w-2xl leading-relaxed">
            Full platform management: add unlimited products, export pins directly to Pinterest boards, monitor real-time telemetry, manage categories, and audit all administrative actions.
          </p>
        </div>

        {/* Action button */}
        <div className="flex flex-wrap items-center gap-2 relative z-10">
          <button
            id="admin-return-discovery-btn"
            onClick={onExitAdmin}
            className="px-4 py-2.5 rounded-2xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/10 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Discovery Feed</span>
          </button>
        </div>
      </div>

      {/* Admin Horizontal Navigation Bar */}
      <div className="flex items-center justify-between bg-white rounded-2xl p-2 border border-slate-200 shadow-sm overflow-x-auto gap-1">
        <div className="flex items-center gap-1 min-w-max">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSubTab === item.id;
            return (
              <button
                key={item.id}
                id={`admin-nav-${item.id}`}
                onClick={() => {
                  if (item.id === 'new' && !editingProduct) {
                    resetForm();
                  }
                  setActiveSubTab(item.id);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
                {item.count !== undefined && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                    isActive ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 pl-4 border-l border-slate-100 min-w-max">
          <button
            onClick={() => {
              resetForm();
              setActiveSubTab('new');
            }}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1 shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Product</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: DASHBOARD OVERVIEW */}
      {activeSubTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Total Catalog</span>
                <ShoppingBag className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="text-2xl font-black text-slate-900">{products.length}</div>
              <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
                <span className="text-emerald-600 font-bold">{products.filter(p => p.status === 'PUBLISHED').length} Published</span>
                <span>•</span>
                <span className="text-amber-600 font-bold">{products.filter(p => p.status === 'DRAFT').length} Drafts</span>
              </div>
            </div>

            <div 
              onClick={() => setActiveSubTab('traffic')}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-300 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider group-hover:text-indigo-600 transition-colors">Visitor Traffic</span>
                <Globe className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-2xl font-black text-indigo-600 flex items-center gap-1.5">
                <span>View Stats</span>
                <ArrowUpRight className="w-4 h-4 text-indigo-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Daily visits & unique page views
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Outbound Clicks</span>
                <ArrowUpRight className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-black text-slate-900">{analytics?.totalClicks || 0}</div>
              <div className="text-[11px] text-slate-400 mt-1">
                {analytics && analytics.totalClicks > 0
                  ? `Across ${analytics.uniqueProductsClicked} unique products`
                  : 'Outbound affiliate click tracking'}
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Categories</span>
                <Layers className="w-4 h-4 text-purple-500" />
              </div>
              <div className="text-2xl font-black text-slate-900">{categories.length}</div>
              <div className="text-[11px] text-slate-400 mt-1">
                Dynamic categories configured
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Admin Status</span>
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-2xl font-black text-emerald-600">Active</div>
              <div className="text-[11px] text-slate-400 mt-1">
                Server-side RBAC enforced
              </div>
            </div>
          </div>

          {/* Quick Actions & Recent Products */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-indigo-600" />
                  Recent Products
                </h3>
                <button
                  onClick={() => setActiveSubTab('products')}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
                >
                  View all ({products.length})
                </button>
              </div>

              {products.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl">
                  <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-600">No products created yet.</p>
                  <p className="text-[11px] text-slate-400 mb-3">Add your first product to start populating your catalog.</p>
                  <button
                    onClick={() => {
                      resetForm();
                      setActiveSubTab('new');
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
                  >
                    + Add Product
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {products.slice(0, 5).map((p) => (
                    <div key={p.id} className="py-3 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          className="w-10 h-10 rounded-lg object-cover bg-slate-100 flex-shrink-0"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-800 truncate">{p.name}</h4>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400">
                            <span>{p.category}</span>
                            <span>•</span>
                            <span>{p.price !== undefined ? formatPrice(p.price, p.currency) : 'Price unlisted'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {getStatusBadge(p.status)}
                        <button
                          onClick={() => handleStartEdit(p)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Audit Log */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-purple-600" />
                  Recent Audit Logs
                </h3>
                <button
                  onClick={() => setActiveSubTab('audit')}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
                >
                  View log
                </button>
              </div>

              {auditLogs.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  No activity recorded yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {auditLogs.slice(0, 5).map((log) => (
                    <div key={log.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1">
                        <span>{log.action}</span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">{log.targetEntity}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB: PRICE & CARD DISCOUNT INTELLIGENCE */}
      {activeSubTab === 'price-intelligence' && (
        <PriceIntelligence
          products={products}
          categories={categories}
          onProductCreated={onAddProduct}
          onProductUpdated={onUpdateProduct}
          onShowToast={onShowToast}
        />
      )}

      {/* SUB-TAB 2: PRODUCTS CATALOG (SEARCH, FILTER, PAGINATION, BULK) */}
      {activeSubTab === 'products' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5">
          {/* Top Bar: Search, Filters, Page Size, Bulk Actions */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 flex-wrap">
              {/* Search */}
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search products by name, slug, tag, retailer..."
                  value={searchFilter}
                  onChange={(e) => {
                    setSearchFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-bold focus:outline-none"
              >
                <option value="ALL">All Statuses ({products.length})</option>
                <option value="PUBLISHED">Published ({products.filter(p => p.status === 'PUBLISHED').length})</option>
                <option value="DRAFT">Drafts ({products.filter(p => p.status === 'DRAFT').length})</option>
                <option value="UNPUBLISHED">Unpublished ({products.filter(p => p.status === 'UNPUBLISHED').length})</option>
                <option value="ARCHIVED">Archived ({products.filter(p => p.status === 'ARCHIVED').length})</option>
              </select>

              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-bold focus:outline-none"
              >
                <option value="ALL">All Categories</option>
                {categories.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>

              {/* Sort By */}
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-bold focus:outline-none"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="name-asc">Alphabetical (A-Z)</option>
                <option value="price-desc">Highest Price</option>
                <option value="clicks-desc">Most Clicks</option>
              </select>
            </div>

            {/* Add Product Button */}
            <button
              onClick={() => {
                resetForm();
                setActiveSubTab('new');
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-sm transition-all cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Product</span>
            </button>
          </div>

          {/* Bulk Operations Bar when products selected */}
          {selectedProductIds.length > 0 && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold text-indigo-900">
                  {selectedProductIds.length} of {filteredProducts.length} products selected
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowBulkPinterestModal(true)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Export ({selectedProductIds.length}) to Pinterest</span>
                </button>
                <button
                  onClick={() => handleExecuteBulkAction('PUBLISHED')}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                >
                  Publish Selected
                </button>
                <button
                  onClick={() => handleExecuteBulkAction('UNPUBLISHED')}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-700 hover:bg-slate-800 text-white cursor-pointer"
                >
                  Unpublish Selected
                </button>
                <button
                  onClick={() => handleExecuteBulkAction('ARCHIVED')}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
                >
                  Archive Selected
                </button>
                <button
                  onClick={() => {
                    if (window.confirm(`Are you sure you want to delete ${selectedProductIds.length} products?`)) {
                      handleExecuteBulkAction('delete');
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
                >
                  Delete Selected
                </button>
                <button
                  onClick={() => setSelectedProductIds([])}
                  className="px-2 py-1 text-xs text-slate-500 hover:text-slate-800"
                >
                  Deselect All
                </button>
              </div>
            </div>
          )}

          {/* Product Table */}
          {filteredProducts.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-slate-200 rounded-2xl">
              <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">No products match your filter.</p>
              <p className="text-xs text-slate-400 mt-1 mb-4">
                {products.length === 0 ? 'Your catalog is currently empty.' : 'Try adjusting your search query or status filter.'}
              </p>
              <button
                onClick={() => {
                  resetForm();
                  setActiveSubTab('new');
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
              >
                + Add Product
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="p-3.5 w-10 text-center">
                      <button onClick={handleSelectAll} className="cursor-pointer">
                        {selectedProductIds.length === filteredProducts.length && filteredProducts.length > 0 ? (
                          <CheckSquare className="w-4 h-4 text-indigo-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                    </th>
                    <th className="p-3.5">Product</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Price</th>
                    <th className="p-3.5">Clicks</th>
                    <th className="p-3.5">Created</th>
                    <th className="p-3.5">Store Link</th>
                    <th className="p-3.5">Pinterest</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedProducts.map((p) => {
                    const isSelected = selectedProductIds.includes(p.id);
                    return (
                      <tr
                        key={p.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isSelected ? 'bg-indigo-50/40' : ''
                        }`}
                      >
                        <td className="p-3.5 text-center">
                          <button onClick={() => handleToggleSelect(p.id)} className="cursor-pointer">
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-indigo-600" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300" />
                            )}
                          </button>
                        </td>

                        {/* Product Image & Info */}
                        <td className="p-3.5">
                          <div className="flex items-center gap-3 min-w-[200px]">
                            <img
                              src={p.imageUrl}
                              alt={p.name}
                              className="w-10 h-10 rounded-lg object-cover bg-slate-100 flex-shrink-0"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 truncate max-w-[220px]">{p.name}</div>
                              <div className="text-[10px] text-slate-400 truncate max-w-[200px]">
                                {p.retailer || 'Direct'} • slug: {p.slug}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="p-3.5 whitespace-nowrap">
                          {getStatusBadge(p.status)}
                        </td>

                        {/* Category */}
                        <td className="p-3.5 whitespace-nowrap">
                          <span className="font-medium text-slate-800">{p.category}</span>
                          {p.subcategory && (
                            <span className="block text-[10px] text-slate-400">{p.subcategory}</span>
                          )}
                        </td>

                        {/* Price */}
                        <td className="p-3.5 whitespace-nowrap font-bold text-slate-900">
                          {p.price !== undefined ? formatPrice(p.price, p.currency) : '—'}
                          {p.originalPrice && (
                            <span className="block text-[10px] text-slate-400 line-through">
                              {formatPrice(p.originalPrice, p.currency)}
                            </span>
                          )}
                        </td>

                        {/* Outbound Clicks */}
                        <td className="p-3.5 whitespace-nowrap font-bold text-indigo-600">
                          {p.clicksCount || 0}
                        </td>

                        {/* Created Date */}
                        <td className="p-3.5 whitespace-nowrap text-[11px] text-slate-400">
                          {new Date(p.createdAt).toLocaleDateString()}
                        </td>

                        {/* Store Link */}
                        <td className="p-3.5 whitespace-nowrap">
                          <a
                            href={p.affiliateLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                          >
                            <Link2 className="w-3 h-3" />
                            <span>Test Destination</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </td>

                        {/* Pinterest Sync Badge & Fast Export */}
                        <td className="p-3.5 whitespace-nowrap">
                          {p.exportedToPinterest ? (
                            <a
                              href={p.pinterestPinUrl || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors"
                              title="Synced on Pinterest. Click to view pin"
                            >
                              <Share2 className="w-3 h-3 text-rose-600" />
                              <span>Synced</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setPinterestExportProduct(p)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-700 border border-slate-200 transition-colors cursor-pointer"
                              title="Export this product to Pinterest board"
                            >
                              <Share2 className="w-3 h-3 text-rose-600" />
                              <span>Export Pin</span>
                            </button>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="p-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Fast status toggle dropdown / buttons */}
                            {p.status !== 'PUBLISHED' && (
                              <button
                                onClick={() => onUpdateStatus(p.id, 'PUBLISHED')}
                                className="px-2 py-1 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 cursor-pointer"
                                title="Publish"
                              >
                                Publish
                              </button>
                            )}
                            {p.status === 'PUBLISHED' && (
                              <button
                                onClick={() => onUpdateStatus(p.id, 'UNPUBLISHED')}
                                className="px-2 py-1 rounded text-[10px] font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer"
                                title="Unpublish"
                              >
                                Unpublish
                              </button>
                            )}

                            {/* Refresh Offers */}
                            <button
                              onClick={async () => {
                                try {
                                  onShowToast(`Refreshing live pricing & card offers for "${p.name}"...`);
                                  const res = await api.refreshProductOffers(p.id);
                                  await onUpdateProduct(p.id, res.product);
                                  onShowToast(`Refreshed "${p.name}": ${res.offersCount} bank offers active.`);
                                } catch (err: any) {
                                  onShowToast(`Refresh failed: ${err.message}`);
                                }
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 cursor-pointer"
                              title="Refresh Live Offers & Price"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>

                            {/* Duplicate */}
                            <button
                              onClick={() => handleDuplicate(p)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                              title="Duplicate Product"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit */}
                            <button
                              onClick={() => handleStartEdit(p)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 cursor-pointer"
                              title="Edit Product"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete */}
                            <button
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to delete "${p.name}"?`)) {
                                  onDeleteProduct(p.id);
                                }
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                              title="Delete Product"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {filteredProducts.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <div className="text-xs text-slate-500">
                Showing <span className="font-bold text-slate-900">{(currentPage - 1) * pageSize + 1}</span> to{' '}
                <span className="font-bold text-slate-900">
                  {Math.min(currentPage * pageSize, filteredProducts.length)}
                </span>{' '}
                of <span className="font-bold text-slate-900">{filteredProducts.length}</span> products
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 text-xs rounded-lg border border-slate-200 bg-slate-50 font-bold"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>

                <div className="flex items-center gap-1 ml-4">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="px-3 py-1 text-xs rounded-lg border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 font-bold"
                  >
                    Prev
                  </button>
                  <span className="text-xs text-slate-600 px-2 font-bold">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className="px-3 py-1 text-xs rounded-lg border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 font-bold"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 3: ADD / EDIT PRODUCT FORM */}
      {activeSubTab === 'new' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6 max-w-4xl mx-auto">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">
                {editingProduct ? `Edit Product: ${editingProduct.name}` : 'Create New Product'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Complete the fields below. Required items are validated before publishing.
              </p>
            </div>
            {editingProduct && (
              <button
                onClick={() => {
                  resetForm();
                  setActiveSubTab('products');
                }}
                className="text-xs font-bold text-slate-500 hover:text-slate-800"
              >
                Cancel Edit
              </button>
            )}
          </div>

          {formError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2.5 text-xs text-rose-800 font-medium">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="space-y-5">
            {/* AI Auto-Enrichment Tool for Affiliates */}
            <div className="p-4 bg-gradient-to-br from-indigo-50/80 via-purple-50/50 to-pink-50/30 border border-indigo-100 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-600 text-white rounded-lg shadow-xs">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-indigo-950">
                      AI Smart Affiliate Link Auto-Enrich
                    </h3>
                    <p className="text-[11px] text-indigo-700/80">
                      Paste any Amazon, Etsy, or merchant URL to auto-extract title, price, description, tags & retailer
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="Paste merchant product URL (e.g. https://amazon.com/dp/... or https://etsy.com/...)"
                  id="ai-enrich-url-input"
                  className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-white border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const target = e.currentTarget as HTMLInputElement;
                      const val = target.value.trim();
                      if (!val) return;
                      setIsSubmitting(true);
                      setFormError(null);
                      try {
                        const enriched = await api.enrichProductLink(val);
                        if (enriched.name) setName(enriched.name);
                        if (enriched.shortDescription) setShortDescription(enriched.shortDescription);
                        if (enriched.detailedNotes) setDetailedNotes(enriched.detailedNotes);
                        if (enriched.category) setCategory(enriched.category);
                        if (enriched.subcategory) setSubcategory(enriched.subcategory);
                        if (enriched.retailer) setRetailer(enriched.retailer);
                        if (enriched.brand) setBrand(enriched.brand);
                        if (enriched.price !== undefined) setPrice(String(enriched.price));
                        if (enriched.originalPrice !== undefined) setOriginalPrice(String(enriched.originalPrice));
                        if (enriched.imageUrl) setImageUrl(enriched.imageUrl);
                        if (enriched.tags && enriched.tags.length > 0) setTagsInput(enriched.tags.join(', '));
                        setAffiliateLink(val);
                        onShowToast('AI auto-filled product metadata successfully!');
                      } catch (err: any) {
                        setFormError(err.message || 'Failed to auto-enrich from URL');
                      } finally {
                        setIsSubmitting(false);
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  id="ai-enrich-btn"
                  disabled={isSubmitting}
                  onClick={async () => {
                    const inputEl = document.getElementById('ai-enrich-url-input') as HTMLInputElement;
                    const val = inputEl ? inputEl.value.trim() : affiliateLink.trim();
                    if (!val) {
                      setFormError('Please enter a merchant URL in the AI box to auto-enrich.');
                      return;
                    }
                    setIsSubmitting(true);
                    setFormError(null);
                    try {
                      const enriched = await api.enrichProductLink(val);
                      if (enriched.name) setName(enriched.name);
                      if (enriched.shortDescription) setShortDescription(enriched.shortDescription);
                      if (enriched.detailedNotes) setDetailedNotes(enriched.detailedNotes);
                      if (enriched.category) setCategory(enriched.category);
                      if (enriched.subcategory) setSubcategory(enriched.subcategory);
                      if (enriched.retailer) setRetailer(enriched.retailer);
                      if (enriched.brand) setBrand(enriched.brand);
                      if (enriched.price !== undefined) setPrice(String(enriched.price));
                      if (enriched.originalPrice !== undefined) setOriginalPrice(String(enriched.originalPrice));
                      if (enriched.imageUrl) setImageUrl(enriched.imageUrl);
                      if (enriched.tags && enriched.tags.length > 0) setTagsInput(enriched.tags.join(', '));
                      setAffiliateLink(val);
                      onShowToast('AI auto-filled product metadata successfully!');
                    } catch (err: any) {
                      setFormError(err.message || 'Failed to auto-enrich from URL');
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-xs transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Auto-Fill with AI</span>
                </button>
              </div>
            </div>

            {/* 1. Image Upload & Preview Section */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Product Image <span className="text-rose-500">*</span>
              </label>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                {/* Upload Box */}
                <div className="md:col-span-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageFileChange}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={imageUploadProgress}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{imageUploadProgress ? 'Uploading...' : 'Upload Image File'}</span>
                    </button>
                    <span className="text-xs text-slate-400">or enter image URL directly below</span>
                  </div>

                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/... or uploaded URL"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                  <p className="text-[11px] text-slate-400">
                    Supports high-resolution PNG, JPG, WebP, GIF. Persists securely to storage.
                  </p>
                </div>

                {/* Live Preview Box */}
                <div className="border border-slate-200 rounded-2xl p-3 bg-slate-50 flex flex-col items-center justify-center min-h-[140px] text-center">
                  {imageUrl ? (
                    <div className="relative group w-full">
                      <img
                        src={imageUrl}
                        alt="Preview"
                        className="w-full h-32 object-cover rounded-xl shadow-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setImageUrl('')}
                        className="absolute top-2 right-2 p-1 bg-black/60 hover:bg-black text-white rounded-full transition-all"
                        title="Remove Image"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="text-slate-400">
                      <ImageIcon className="w-8 h-8 mx-auto mb-1 text-slate-300" />
                      <span className="text-[11px] font-medium">Image Preview</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* AI Copywriting & SEO Generator Bar */}
            <div className="p-4 bg-gradient-to-r from-purple-50 via-indigo-50/70 to-pink-50/50 border border-purple-200/90 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-tr from-purple-600 to-indigo-600 text-white rounded-xl shadow-xs flex-shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-purple-950 flex items-center gap-1.5">
                    Gemini AI Description & SEO Writer
                  </h4>
                  <p className="text-[11px] text-purple-800/80">
                    Analyze product image & title to generate professional, high-converting SEO descriptions
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <select
                  value={aiTone}
                  onChange={(e: any) => setAiTone(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl bg-white border border-purple-200 text-purple-900 font-bold focus:outline-none focus:ring-2 focus:ring-purple-400 cursor-pointer shadow-2xs"
                  title="Select AI Writing Style"
                >
                  <option value="editorial">Editorial & Design Tone</option>
                  <option value="minimalist">Minimalist / Clean</option>
                  <option value="persuasive">Persuasive / High Conversion</option>
                  <option value="technical">Technical Specs & Features</option>
                </select>

                <button
                  type="button"
                  id="generate-ai-description-btn"
                  disabled={isGeneratingAiDesc || isSubmitting}
                  onClick={handleGenerateAiDescription}
                  className="px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-700 hover:to-indigo-800 text-white flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGeneratingAiDesc ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Writing Copy with AI...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Generate AI Description</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* 2. Product Name & Short Description */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Product Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Minimalist Ceramic Coffee Dripper"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Optional Short Description / Tagline
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateAiDescription}
                    disabled={isGeneratingAiDesc}
                    className="text-[10px] font-black text-purple-700 hover:text-purple-900 flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                    title="Auto-draft tagline with Gemini AI"
                  >
                    <Sparkles className="w-3 h-3 text-purple-600" />
                    <span>AI Draft</span>
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="e.g. Artisan pour-over dripper with matte finish"
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* 3. Destination URLs: Affiliate URL (Mandatory) & Product URL */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center justify-between">
                  <span>Affiliate / Merchant Destination URL <span className="text-rose-500">*</span></span>
                  <span className="text-[10px] text-indigo-600 font-bold">Admin Only Configuration</span>
                </label>
                <input
                  type="url"
                  placeholder="https://amazon.com/dp/...?tag=youraffid-20"
                  value={affiliateLink}
                  onChange={(e) => setAffiliateLink(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Target for user "Visit Product" clicks. Safe external redirect.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Optional Direct Merchant Product URL
                </label>
                <input
                  type="url"
                  placeholder="https://brand.com/products/dripper"
                  value={productUrl}
                  onChange={(e) => setProductUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Reference merchant page URL.
                </p>
              </div>
            </div>

            {/* 4. Category & Subcategory */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    const selectedCat = categories.find(c => c.name.toLowerCase() === e.target.value.toLowerCase());
                    if (selectedCat && selectedCat.subcategories.length > 0) {
                      setSubcategory(selectedCat.subcategories[0]);
                    } else {
                      setSubcategory('');
                    }
                  }}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-bold focus:outline-none"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Subcategory
                </label>
                <input
                  type="text"
                  placeholder="e.g. Coffee & Tea, Lighting, Wall Art..."
                  value={subcategory}
                  onChange={(e) => setSubcategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none"
                />
              </div>
            </div>

            {/* 5. Brand / Retailer & Pricing */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Brand / Retailer
                </label>
                <input
                  type="text"
                  placeholder="e.g. Amazon, Hario, Nordstrom..."
                  value={brand || retailer}
                  onChange={(e) => {
                    setBrand(e.target.value);
                    setRetailer(e.target.value);
                  }}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Price ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="29.99"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Original Price ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="39.99"
                  value={originalPrice}
                  onChange={(e) => setOriginalPrice(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-bold focus:outline-none"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="CAD">CAD (C$)</option>
                </select>
              </div>
            </div>

            {/* 6. Tags & Aspect Ratio */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="coffee, ceramic, artisan, pour-over, minimalist"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Masonry Pin Aspect Ratio
                </label>
                <select
                  value={aspectRatio}
                  onChange={(e: any) => setAspectRatio(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-bold focus:outline-none"
                >
                  <option value="tall">Tall (3:4 Pinterest Standard)</option>
                  <option value="portrait">Portrait (2:3 High Detail)</option>
                  <option value="square">Square (1:1)</option>
                  <option value="wide">Wide (4:3)</option>
                </select>
              </div>
            </div>

            {/* 7. Detailed Description */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Detailed Product Description & Curator Notes
                </label>
                <button
                  type="button"
                  onClick={handleGenerateAiDescription}
                  disabled={isGeneratingAiDesc}
                  className="text-[11px] font-black text-purple-700 hover:text-purple-900 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  title="Generate full SEO product description using Gemini AI"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  <span>{isGeneratingAiDesc ? 'Generating...' : '✨ Generate with Gemini AI'}</span>
                </button>
              </div>
              <textarea
                rows={4}
                placeholder="Share material details, why this product was curated, dimensions, specifications, and SEO styling notes..."
                value={detailedNotes}
                onChange={(e) => setDetailedNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 leading-relaxed font-sans"
              />
            </div>

            {/* 8. Status & Featured Flags */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Publication Status <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={status}
                    onChange={(e: any) => setStatus(e.target.value)}
                    className="px-3.5 py-2 text-xs rounded-xl bg-white border border-slate-200 text-slate-800 font-extrabold focus:outline-none"
                  >
                    <option value="PUBLISHED">PUBLISHED (Visible in Public Discovery)</option>
                    <option value="DRAFT">DRAFT (Admin-Only)</option>
                    <option value="UNPUBLISHED">UNPUBLISHED (Hidden from Public)</option>
                    <option value="ARCHIVED">ARCHIVED</option>
                  </select>
                </div>

                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={isTrending}
                      onChange={(e) => setIsTrending(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600"
                    />
                    <span>Trending Pin</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={isStaffPick}
                      onChange={(e) => setIsStaffPick(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600"
                    />
                    <span>Staff Pick</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={isFeatured}
                      onChange={(e) => setIsFeatured(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600"
                    />
                    <span>Featured</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleSubmit('DRAFT')}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
              >
                Save as Draft
              </button>

              <button
                type="button"
                onClick={() => handleSubmit('PUBLISHED')}
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
              >
                {isSubmitting ? 'Saving...' : editingProduct ? 'Save & Update Product' : 'Publish Product'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: CATEGORIES MANAGEMENT */}
      {activeSubTab === 'categories' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Create Category Form */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-purple-600" />
                Add New Category
              </h3>
              <p className="text-xs text-slate-400">
                No limit on categories. Create custom departments with subcategories.
              </p>

              <form onSubmit={handleCreateCategory} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Fitness & Outdoors"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                  <input
                    type="text"
                    placeholder="e.g. Hiking gear, gym accessories, yoga mats..."
                    value={newCatDesc}
                    onChange={(e) => setNewCatDesc(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Subcategories (comma separated)
                  </label>
                  <input
                    type="text"
                    placeholder="Yoga, Running, Weights, Hydration"
                    value={newCatSubcats}
                    onChange={(e) => setNewCatSubcats(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white cursor-pointer transition-all"
                >
                  + Create Category
                </button>
              </form>
            </div>

            {/* Categories List */}
            <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-slate-900">
                  Configured Categories ({categories.length})
                </h3>
              </div>

              <div className="divide-y divide-slate-100">
                {categories.map((cat) => (
                  <div key={cat.id} className="py-3.5 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs">{cat.name}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700">
                          {cat.publishedProducts || 0} published / {cat.totalProducts || 0} total
                        </span>
                      </div>
                      {cat.description && (
                        <p className="text-[11px] text-slate-400 max-w-md">{cat.description}</p>
                      )}
                      {cat.subcategories && cat.subcategories.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {cat.subcategories.map(s => (
                            <span key={s} className="px-2 py-0.2 rounded-md text-[9px] bg-slate-100 text-slate-600">
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleDeleteCategory(cat.id, cat.name)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                      title="Delete Category"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4.5: PINTEREST OAUTH & BOARD SYNC */}
      {activeSubTab === 'pinterest' && (
        <PinterestSyncView
          products={products}
          onShowToast={onShowToast}
          onRefreshProducts={loadAuxData}
        />
      )}

      {/* SUB-TAB 5: STORE DESTINATION LINKS MANAGEMENT */}
      {(activeSubTab === 'links' || activeSubTab === 'affiliates') && (
        <div className="space-y-6">
          {/* Smart Outbound UTM & Sub-ID Auto-Tagger */}
          <UtmAutoTaggerSettings onShowToast={onShowToast} />

          {/* Real-time Link Health & 404 Scanner */}
          <LinkHealthChecker onShowToast={onShowToast} />

          {/* Direct Store & Merchant Links Table */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">Direct Store & Merchant Links</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Centralized registry of verified direct merchant destinations configured across your catalog.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700">
                {products.length} Destination Links
              </span>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="p-3.5">Product</th>
                    <th className="p-3.5">Retailer / Brand</th>
                    <th className="p-3.5">Outbound Destination</th>
                    <th className="p-3.5">Clicks</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80">
                      <td className="p-3.5 font-bold text-slate-900 truncate max-w-[200px]">
                        {p.name}
                      </td>
                      <td className="p-3.5 text-slate-600 font-medium">
                        {p.retailer || 'Direct'}
                      </td>
                      <td className="p-3.5 font-mono text-[11px] text-slate-500 truncate max-w-[320px]">
                        {p.affiliateLink}
                      </td>
                      <td className="p-3.5 font-bold text-indigo-600">
                        {p.clicksCount || 0}
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={p.affiliateLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 rounded-lg text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 flex items-center gap-1"
                          >
                            <span>Test</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                          <button
                            onClick={() => handleStartEdit(p)}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200"
                          >
                            Edit Link
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB: TRAFFIC & VISITOR STATS (ADMIN ONLY) */}
      {activeSubTab === 'traffic' && (
        <TrafficStats onShowToast={onShowToast} />
      )}

      {/* SUB-TAB 6: ANALYTICS (ADMIN ONLY) */}
      {activeSubTab === 'analytics' && (
        <div className="space-y-6">
          {/* Real-time Revenue & Commission Estimator Widget in INR */}
          <AffiliateEarningsEstimator products={products} clicks={[]} />

          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">Real Outbound Click Analytics</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Production tracking data from user clicks on "Visit Product". No simulated or fake metrics.
                </p>
              </div>
              <button
                onClick={onRefreshAnalytics}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>
            </div>

            {!analytics || analytics.totalClicks === 0 ? (
              <div className="text-center py-16 border border-dashed border-slate-200 rounded-2xl">
                <BarChart3 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">No production analytics available yet.</p>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  Click metrics will appear in real time once visitors browse published products and click outbound "Visit Product" affiliate destinations.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Summary cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                    <div className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Total Clicks</div>
                    <div className="text-2xl font-black text-indigo-900 mt-1">{analytics.totalClicks}</div>
                  </div>
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Unique Products Clicked</div>
                    <div className="text-2xl font-black text-emerald-900 mt-1">{analytics.uniqueProductsClicked}</div>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100">
                    <div className="text-xs font-bold text-purple-700 uppercase tracking-wider">Top Retailer</div>
                    <div className="text-2xl font-black text-purple-900 mt-1">
                      {Object.keys(analytics.clicksByRetailer || {})[0] || 'Direct'}
                    </div>
                  </div>
                </div>

                {/* Top Clicked Products */}
                <div className="border border-slate-200 rounded-2xl p-5">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                    Top Visited Products
                  </h4>
                  <div className="divide-y divide-slate-100">
                    {analytics.topProducts?.map((tp) => (
                      <div key={tp.id} className="py-2.5 flex items-center justify-between">
                        <div className="min-w-0">
                          <span className="font-bold text-xs text-slate-800 truncate block">{tp.name}</span>
                          <span className="text-[10px] text-slate-400">{tp.retailer}</span>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800">
                          {tp.clicks} clicks
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 7: USERS & ROLES */}
      {activeSubTab === 'users' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Create User Form */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                Add User Account
              </h3>
              <p className="text-xs text-slate-400">
                Create new authenticated accounts with explicit ADMIN or USER role assignments.
              </p>

              <form onSubmit={handleCreateUser} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    placeholder="user@example.com"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Display Name</label>
                  <input
                    type="text"
                    placeholder="Jane Doe"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Password *</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none"
                  />
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-500">
                  <span className="font-bold text-slate-800 block mb-0.5">Role: USER</span>
                  <span>New accounts are created as standard users. Only one primary Administrator account is permitted.</span>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer transition-all"
                >
                  + Create User Account
                </button>
              </form>
            </div>

            {/* Users List */}
            <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-extrabold text-slate-900">
                Registered Platform Users ({adminUsers.length})
              </h3>

              <div className="divide-y divide-slate-100">
                {adminUsers.map((u) => (
                  <div key={u.id} className="py-3.5 flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">{u.name}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          u.role === 'ADMIN'
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {u.role}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400">{u.email}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {u.role === 'ADMIN' ? (
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                          Primary Admin
                        </span>
                      ) : (
                        <button
                          onClick={() => handleDeleteUser(u.id, u.email)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 8: AUDIT LOG */}
      {activeSubTab === 'audit' && (
        <AuditLogSection
          logs={auditLogs}
          onRefresh={loadAuxData}
          onShowToast={onShowToast}
        />
      )}

      {/* SUB-TAB 9: PLATFORM SETTINGS & IMPORT/EXPORT */}
      {activeSubTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* General Platform Branding */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Settings className="w-4 h-4 text-indigo-600" />
              Platform Branding & Configuration
            </h3>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Platform Name</label>
                <input
                  type="text"
                  value={platformSettings.platformName}
                  onChange={(e) => setPlatformSettings(prev => ({ ...prev, platformName: e.target.value }))}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tagline</label>
                <input
                  type="text"
                  value={platformSettings.tagline}
                  onChange={(e) => setPlatformSettings(prev => ({ ...prev, tagline: e.target.value }))}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Store Curation & Transparency Policy</label>
                <textarea
                  rows={3}
                  value={platformSettings.storeDisclaimer || platformSettings.affiliateDisclaimer || ''}
                  onChange={(e) => setPlatformSettings(prev => ({ ...prev, storeDisclaimer: e.target.value, affiliateDisclaimer: e.target.value }))}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer transition-all"
              >
                Save Settings
              </button>
            </form>
          </div>

          {/* FlexSearch Client-Side Index Performance & Engine Management */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4 lg:col-span-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <Zap className="w-4 h-4 fill-amber-500" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Client-Side Search Index Engine (FlexSearch)
                  </h3>
                  <p className="text-xs text-slate-400">
                    High-speed tokenized in-memory document index providing sub-millisecond full-text queries across thousands of pins.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRebuildSearchIndex}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
                  <span>Rebuild Index</span>
                </button>
                <button
                  type="button"
                  onClick={handleRunSearchBenchmark}
                  disabled={isRunningBenchmark}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>{isRunningBenchmark ? 'Benchmarking...' : 'Run Speed Benchmark (50 Qs)'}</span>
                </button>
              </div>
            </div>

            {/* Metric Overview Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Indexed Products</p>
                <p className="text-lg font-black text-slate-900 mt-1">{products.length} Pins</p>
                <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">● Active In-Memory</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Tokenization Strategy</p>
                <p className="text-xs font-bold text-slate-900 mt-1.5">Forward Tokenizer</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Weighted Multi-Field Docs</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Average Query Latency</p>
                <p className="text-lg font-black text-amber-600 mt-1">
                  {indexBenchmarkStats ? `${indexBenchmarkStats.avgQueryLatencyMs} ms` : '< 0.5 ms'}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">Instant Autocomplete</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Rebuild Speed</p>
                <p className="text-lg font-black text-slate-900 mt-1">
                  {indexBenchmarkStats ? `${indexBenchmarkStats.rebuildTimeMs} ms` : '~ 2 ms'}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {indexBenchmarkStats ? `Tested at ${indexBenchmarkStats.lastTested}` : 'Ready for scale'}
                </p>
              </div>
            </div>
          </div>

          {/* Backup, Export & Clear Catalog */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Download className="w-4 h-4 text-emerald-600" />
                Catalog JSON Backup & Import
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Backup your entire catalog (unlimited entries) or import bulk product files.
              </p>

              <div className="flex flex-wrap gap-3 mt-4">
                <button
                  type="button"
                  onClick={handleExportCatalog}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Catalog JSON</span>
                </button>

                <input
                  type="file"
                  ref={importFileRef}
                  onChange={handleImportFileChange}
                  accept=".json"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => importFileRef.current?.click()}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Import JSON Catalog</span>
                </button>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Danger Zone
              </h4>
              <p className="text-xs text-slate-500 mb-3">
                Wipe all products and analytics data from persistent storage.
              </p>

              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Are you absolutely certain you want to wipe all catalog and analytics data? This action is irreversible.')) {
                    onClearAllData();
                    onShowToast('Catalog reset to clean state.');
                  }
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 cursor-pointer"
              >
                Clear Entire Catalog Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single Pin Pinterest Export Modal */}
      {pinterestExportProduct && (
        <PinterestSyncModal
          product={pinterestExportProduct}
          isOpen={true}
          onClose={() => setPinterestExportProduct(null)}
          onShowToast={onShowToast}
          onProductUpdated={loadAuxData}
        />
      )}

      {/* Bulk Pins Pinterest Export Modal */}
      {showBulkPinterestModal && (
        <PinterestSyncModal
          products={products.filter(p => selectedProductIds.includes(p.id))}
          isOpen={true}
          onClose={() => {
            setShowBulkPinterestModal(false);
            setSelectedProductIds([]);
          }}
          onShowToast={onShowToast}
          onProductUpdated={loadAuxData}
        />
      )}
    </div>
  );
};
