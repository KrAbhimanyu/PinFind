import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Link2, ArrowRight, CheckCircle2, AlertCircle, 
  CreditCard, ShieldCheck, Tag, DollarSign, Calendar, Info, 
  Plus, Trash2, Edit3, Check, RefreshCw, X, ChevronDown, ChevronUp, 
  Activity, Clock, ShoppingBag, ArrowDownRight, ExternalLink, Zap, Sliders
} from 'lucide-react';
import { api } from '../../services/api';
import { Product, PaymentOffer, BestOfferSummary, Category, PriceSyncStatus, PriceSyncLogEntry } from '../../types';
import { formatPrice } from '../../utils/formatters';
import { evaluateOfferEligibility, calculateBestOffer, formatOfferHeadline } from '../../utils/offerEngine';
import { OfferManagementModal } from './OfferManagementModal';

interface PriceIntelligenceProps {
  products: Product[];
  categories: Category[];
  onProductCreated: (product: Partial<Product>) => Promise<void>;
  onProductUpdated: (id: string, product: Partial<Product>) => Promise<void>;
  onShowToast: (message: string) => void;
}

export const PriceIntelligence: React.FC<PriceIntelligenceProps> = ({
  products,
  categories,
  onProductCreated,
  onProductUpdated,
  onShowToast,
}) => {
  // Mode selection: 'url-extractor' | 'sync-monitor' | 'catalog-offers'
  const [activeView, setActiveView] = useState<'url-extractor' | 'sync-monitor' | 'catalog-offers'>('url-extractor');

  // URL Extractor state
  const [urlInput, setUrlInput] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractStep, setExtractStep] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Extracted Product Data state
  const [extractedData, setExtractedData] = useState<{
    name: string;
    imageUrl: string;
    affiliateUrl: string;
    currentPrice?: number;
    originalPrice?: number;
    currency: string;
    retailer: string;
    brand?: string;
    category: string;
    shortDescription: string;
    detailedNotes?: string;
    tags: string[];
    availability: 'IN_STOCK' | 'OUT_OF_STOCK' | 'PREORDER' | 'UNKNOWN';
    offers: PaymentOffer[];
    bestOffer: BestOfferSummary | null;
    verifiedAt: string;
    source: string;
  } | null>(null);

  const [isPublishing, setIsPublishing] = useState(false);

  // Background Sync state
  const [syncStatus, setSyncStatus] = useState<PriceSyncStatus | null>(null);
  const [isLoadingSyncStatus, setIsLoadingSyncStatus] = useState(false);
  const [isTriggeringSync, setIsTriggeringSync] = useState(false);
  const [syncInterval, setSyncInterval] = useState<number>(60);
  const [isSyncEnabled, setIsSyncEnabled] = useState<boolean>(true);

  // Catalog item offer management
  const [selectedProductForOffers, setSelectedProductForOffers] = useState<Product | null>(null);
  const [refreshingProductId, setRefreshingProductId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Load sync telemetry
  const loadSyncStatus = async () => {
    try {
      setIsLoadingSyncStatus(true);
      const status = await api.getPriceSyncStatus();
      setSyncStatus(status);
      setIsSyncEnabled(status.enabled);
      setSyncInterval(status.intervalMinutes);
    } catch (err: any) {
      console.error('Failed to load price sync status', err);
    } finally {
      setIsLoadingSyncStatus(false);
    }
  };

  useEffect(() => {
    loadSyncStatus();
  }, []);

  // Handle URL Extraction
  const handleExtract = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!urlInput.trim()) {
      setErrorMessage('Please paste a valid product affiliate link.');
      return;
    }

    try {
      new URL(urlInput.trim());
    } catch {
      setErrorMessage('Invalid URL format. Please include http:// or https://');
      return;
    }

    setIsExtracting(true);
    setErrorMessage(null);
    setExtractStep('Validating URL & SSRF safeguards...');

    try {
      setExtractStep('Fetching merchant page & structured schema...');
      const intelligence = await api.fetchProductIntelligence(urlInput.trim());

      setExtractStep('Processing prices and evaluating card discounts...');
      const targetCategory = categories[0]?.name || 'Home Decor';
      const targetPrice = intelligence.currentPrice;

      const evaluatedOffers = (intelligence.offers || []).map(off => {
        const evalRes = evaluateOfferEligibility(off, targetPrice || 0);
        return {
          ...off,
          eligible: evalRes.eligible,
          calculatedDiscount: evalRes.calculatedDiscount,
          effectivePrice: evalRes.effectivePrice,
          ineligibilityReason: evalRes.ineligibilityReason,
        };
      });

      const calculatedBest = calculateBestOffer(evaluatedOffers, targetPrice || 0);

      setExtractedData({
        name: intelligence.name || '',
        imageUrl: intelligence.imageUrl || '',
        affiliateUrl: intelligence.affiliateUrl || urlInput.trim(),
        currentPrice: intelligence.currentPrice,
        originalPrice: intelligence.originalPrice,
        currency: intelligence.currency || 'INR',
        retailer: intelligence.retailer || 'Online Merchant',
        brand: intelligence.brand,
        category: targetCategory,
        shortDescription: `Verified price and bank offers from ${intelligence.retailer}.`,
        tags: [intelligence.retailer.toLowerCase(), 'verified-offer'],
        availability: intelligence.availability,
        offers: evaluatedOffers,
        bestOffer: calculatedBest,
        verifiedAt: intelligence.verifiedAt,
        source: intelligence.source,
      });

      onShowToast(`Successfully extracted product & ${intelligence.offers?.length || 0} bank/card offers!`);
    } catch (err: any) {
      console.error('URL Extraction failed:', err);
      setErrorMessage(err.message || 'Failed to fetch and analyze product URL.');
    } finally {
      setIsExtracting(false);
      setExtractStep('');
    }
  };

  // Publish extracted product
  const handlePublishExtracted = async (status: 'PUBLISHED' | 'DRAFT') => {
    if (!extractedData) return;
    if (!extractedData.name.trim()) {
      setErrorMessage('Product title is required.');
      return;
    }

    setIsPublishing(true);
    try {
      await onProductCreated({
        name: extractedData.name,
        shortDescription: extractedData.shortDescription,
        detailedNotes: extractedData.detailedNotes,
        imageUrl: extractedData.imageUrl || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f',
        aspectRatio: 'portrait',
        category: extractedData.category,
        tags: extractedData.tags,
        affiliateLink: extractedData.affiliateUrl,
        productUrl: extractedData.affiliateUrl,
        retailer: extractedData.retailer,
        brand: extractedData.brand,
        price: extractedData.currentPrice,
        currentPrice: extractedData.currentPrice,
        originalPrice: extractedData.originalPrice,
        discountPercentage: extractedData.originalPrice && extractedData.currentPrice
          ? Math.round(((extractedData.originalPrice - extractedData.currentPrice) / extractedData.originalPrice) * 100)
          : undefined,
        currency: extractedData.currency,
        status,
        availability: extractedData.availability,
        offers: extractedData.offers,
        bestOffer: extractedData.bestOffer,
        offersVerifiedAt: new Date().toISOString(),
        priceUpdatedAt: new Date().toISOString(),
      });

      onShowToast(`Product "${extractedData.name}" ${status === 'PUBLISHED' ? 'published' : 'saved as draft'}!`);
      setExtractedData(null);
      setUrlInput('');
    } catch (err: any) {
      onShowToast(`Failed to save: ${err.message}`);
    } finally {
      setIsPublishing(false);
    }
  };

  // Refresh single product offers
  const handleRefreshSingleProduct = async (productId: string, productName: string) => {
    setRefreshingProductId(productId);
    try {
      const res = await api.refreshProductOffers(productId);
      await onProductUpdated(productId, res.product);
      onShowToast(`Refreshed "${productName}": ${res.offersCount} bank offers active. Price: ${formatPrice(res.product.price || 0, res.product.currency)}`);
    } catch (err: any) {
      onShowToast(`Refresh failed: ${err.message}`);
    } finally {
      setRefreshingProductId(null);
    }
  };

  // Trigger background batch sync
  const handleTriggerBackgroundSync = async () => {
    setIsTriggeringSync(true);
    try {
      await api.triggerPriceSync();
      onShowToast('Background price & offer synchronization started in background.');
      setTimeout(loadSyncStatus, 2000);
    } catch (err: any) {
      onShowToast(`Sync trigger failed: ${err.message}`);
    } finally {
      setIsTriggeringSync(false);
    }
  };

  // Update background sync settings
  const handleSaveSyncSettings = async (enabled: boolean, interval: number) => {
    try {
      const updated = await api.updatePriceSyncSettings(enabled, interval);
      setSyncStatus(updated);
      setIsSyncEnabled(updated.enabled);
      setSyncInterval(updated.intervalMinutes);
      onShowToast(`Sync settings updated: ${enabled ? 'Active' : 'Paused'}, every ${interval} min.`);
    } catch (err: any) {
      onShowToast(`Failed to save settings: ${err.message}`);
    }
  };

  const filteredCatalogProducts = products.filter(p => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return p.name.toLowerCase().includes(q) || (p.retailer && p.retailer.toLowerCase().includes(q));
  });

  const productsWithOffers = products.filter(p => p.offers && p.offers.length > 0);
  const productsWithPriceDrops = products.filter(p => Boolean(p.priceDrop));

  return (
    <div id="price-intelligence-root" className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner & Mode Selector */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-indigo-600" />
              Live Pricing & Card Offer Engine
            </span>
            <span className="text-xs text-slate-400 font-medium">SSRF Safe • Real-Time Structured Parser</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Price & Card Discount Intelligence
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Extract verified selling prices, MRPs, and bank/card discount offers directly from affiliate merchant links, or run automated background synchronizations.
          </p>
        </div>

        {/* View Switcher Pills */}
        <div className="flex items-center gap-1.5 p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200/60 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setActiveView('url-extractor')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeView === 'url-extractor'
                ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            URL Extractor
          </button>
          <button
            type="button"
            onClick={() => setActiveView('catalog-offers')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeView === 'catalog-offers'
                ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Catalog Offers</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 text-indigo-800 font-extrabold">
              {products.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveView('sync-monitor');
              loadSyncStatus();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeView === 'sync-monitor'
                ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-indigo-600" />
            <span>Background Sync</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: URL EXTRACTOR */}
      {activeView === 'url-extractor' && (
        <div className="space-y-6">
          {/* URL Input Form */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Link2 className="w-4 h-4 text-indigo-600" />
              Paste Affiliate Product URL
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter any verified product page from Amazon, Flipkart, Myntra, Ajio, Croma, etc. All affiliate tags are preserved intact.
            </p>

            <form onSubmit={handleExtract} className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <input
                    type="url"
                    required
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://www.amazon.in/dp/... or https://www.flipkart.com/..."
                    disabled={isExtracting}
                    className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 focus:outline-none transition-all disabled:opacity-50"
                  />
                  {urlInput && (
                    <button
                      type="button"
                      onClick={() => setUrlInput('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isExtracting || !urlInput.trim()}
                  className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm hover:shadow-md disabled:cursor-not-allowed"
                >
                  {isExtracting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>{extractStep || 'Extracting...'}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Extract & Verify Offers</span>
                    </>
                  )}
                </button>
              </div>

              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </form>
          </div>

          {/* Extracted Product Preview & Verified Offers */}
          {extractedData && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified Merchant Data
                    </span>
                    <span className="text-xs text-slate-400">{extractedData.retailer}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mt-1">Review Extracted Intelligence</h3>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => handlePublishExtracted('DRAFT')}
                    disabled={isPublishing}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    Save as Draft
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePublishExtracted('PUBLISHED')}
                    disabled={isPublishing}
                    className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Publish to Catalog</span>
                  </button>
                </div>
              </div>

              {/* Two Column Layout: Product Info & Live Offers */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Image & Details */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="aspect-[4/3] rounded-2xl bg-slate-100 overflow-hidden border border-slate-200 relative group">
                    <img 
                      src={extractedData.imageUrl || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f'} 
                      alt={extractedData.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 left-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                        extractedData.availability === 'IN_STOCK' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                      }`}>
                        {extractedData.availability === 'IN_STOCK' ? 'In Stock' : 'Out of Stock'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Product Title</label>
                    <input
                      type="text"
                      value={extractedData.name}
                      onChange={(e) => setExtractedData({ ...extractedData, name: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Selling Price</label>
                      <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900">
                        {formatPrice(extractedData.currentPrice || 0, extractedData.currency)}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Original / MRP</label>
                      <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 line-through">
                        {extractedData.originalPrice ? formatPrice(extractedData.originalPrice, extractedData.currency) : 'N/A'}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                    <select
                      value={extractedData.category}
                      onChange={(e) => setExtractedData({ ...extractedData, category: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none"
                    >
                      {categories.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Right Column: Bank & Card Offers Breakdown */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-indigo-600" />
                      <span>Verified Bank & Card Offers ({extractedData.offers.length})</span>
                    </h4>
                  </div>

                  {/* Best Offer Spotlight */}
                  {extractedData.bestOffer && (
                    <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-700 block">
                          Best Offer Available
                        </span>
                        <div className="text-sm font-black text-slate-900 mt-0.5">
                          {extractedData.bestOffer.bank} {extractedData.bestOffer.cardType}
                        </div>
                        <p className="text-xs text-indigo-900 font-medium">
                          {extractedData.bestOffer.discountText}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Effective Price</span>
                        <span className="text-base font-black text-emerald-700">
                          {formatPrice(extractedData.bestOffer.effectivePrice, extractedData.currency)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Offers List */}
                  <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                    {extractedData.offers.map((off, idx) => (
                      <div 
                        key={off.id || idx}
                        className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition-all flex flex-col gap-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200">
                              {off.bank}
                            </span>
                            <span className="text-[10px] font-bold text-slate-500 uppercase">
                              {off.cardType} {off.discountType === 'CASHBACK' ? 'Cashback' : 'Instant'}
                            </span>
                          </div>
                          {off.calculatedDiscount ? (
                            <span className="text-xs font-bold text-emerald-600">
                              -₹{off.calculatedDiscount.toLocaleString('en-IN')} OFF
                            </span>
                          ) : null}
                        </div>

                        <div className="text-xs text-slate-800 font-medium">
                          {off.discountPercentage ? `${off.discountPercentage}% Discount` : `₹${off.flatDiscount} Flat Discount`}
                          {off.maximumDiscount ? ` up to ₹${off.maximumDiscount}` : ''}
                          {off.minimumTransaction ? ` on min spend ₹${off.minimumTransaction}` : ''}
                        </div>

                        {off.terms && (
                          <div className="text-[11px] text-slate-400 line-clamp-2">
                            {off.terms}
                          </div>
                        )}
                      </div>
                    ))}

                    {extractedData.offers.length === 0 && (
                      <div className="p-6 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-slate-400 text-xs">
                        No verified bank or card discount offers found on this merchant page.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: CATALOG OFFERS & INSTANT REFRESH */}
      {activeView === 'catalog-offers' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Catalog Offer Intelligence</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Monitor and refresh bank/card discounts across all products in your store.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search products or retailers..."
                className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none w-64"
              />
            </div>
          </div>

          {/* Table of products with live offer status */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Retailer</th>
                  <th className="py-3 px-4">Selling Price</th>
                  <th className="py-3 px-4">Active Offers</th>
                  <th className="py-3 px-4">Effective Price</th>
                  <th className="py-3 px-4">Last Checked</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCatalogProducts.map(p => {
                  const hasOffers = p.offers && p.offers.length > 0;
                  const isRefreshing = refreshingProductId === p.id;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-medium text-slate-900 max-w-xs truncate">
                        <div className="flex items-center gap-3">
                          <img 
                            src={p.imageUrl} 
                            alt={p.name} 
                            className="w-9 h-9 rounded-lg object-cover border border-slate-200 flex-shrink-0"
                          />
                          <span className="truncate">{p.name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {p.retailer || 'Direct'}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {formatPrice(p.price || p.currentPrice || 0, p.currency)}
                      </td>
                      <td className="py-3.5 px-4">
                        {hasOffers ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {p.offers!.length} Bank Offers
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">None</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-emerald-600">
                        {p.bestOffer ? formatPrice(p.bestOffer.effectivePrice, p.currency) : formatPrice(p.price || 0, p.currency)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                        {p.offersVerifiedAt ? new Date(p.offersVerifiedAt).toLocaleDateString('en-IN') : 'Not Checked'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedProductForOffers(p)}
                            className="px-2.5 py-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer text-[11px] font-bold"
                          >
                            Manage Offers
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRefreshSingleProduct(p.id, p.name)}
                            disabled={isRefreshing}
                            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-700 transition-all cursor-pointer text-[11px] font-bold flex items-center gap-1"
                            title="Live Refresh Offers from Merchant"
                          >
                            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                            <span>Refresh</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredCatalogProducts.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                      No products found. Add products using the URL Extractor or + Add Product.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: BACKGROUND SYNC & AUDIT TELEMETRY */}
      {activeView === 'sync-monitor' && (
        <div className="space-y-6">
          {/* Quick Telemetry Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Monitored Catalog
              </span>
              <div className="text-2xl font-black text-slate-900">{products.length}</div>
              <span className="text-[11px] text-slate-400">Total catalog items</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Products with Bank Offers
              </span>
              <div className="text-2xl font-black text-indigo-600">{productsWithOffers.length}</div>
              <span className="text-[11px] text-indigo-700/80">Active verified card discounts</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Price Drops Detected
              </span>
              <div className="text-2xl font-black text-emerald-600">{productsWithPriceDrops.length}</div>
              <span className="text-[11px] text-emerald-700/80">Historical discount drops</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Sync Status
              </span>
              <div className="text-base font-black text-slate-900 flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${syncStatus?.enabled ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                <span>{syncStatus?.enabled ? 'Active Scheduler' : 'Paused'}</span>
              </div>
              <span className="text-[11px] text-slate-400">
                Every {syncStatus?.intervalMinutes || 60} minutes
              </span>
            </div>
          </div>

          {/* Sync Control Panel */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Background Sync Configuration</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Periodically checks merchant prices and bank offers in the background without manual intervention.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleTriggerBackgroundSync}
                  disabled={isTriggeringSync || syncStatus?.isRunning}
                  className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTriggeringSync || syncStatus?.isRunning ? 'animate-spin' : ''}`} />
                  <span>{syncStatus?.isRunning ? 'Syncing...' : 'Run Sync Now'}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Automated Periodic Check</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleSaveSyncSettings(true, syncInterval)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isSyncEnabled
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Enabled
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveSyncSettings(false, syncInterval)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      !isSyncEnabled
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Paused
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Check Frequency</label>
                <select
                  value={syncInterval}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setSyncInterval(val);
                    handleSaveSyncSettings(isSyncEnabled, val);
                  }}
                  className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:bg-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value={15}>Every 15 Minutes</option>
                  <option value={30}>Every 30 Minutes</option>
                  <option value={60}>Every 1 Hour (Recommended)</option>
                  <option value={360}>Every 6 Hours</option>
                  <option value={720}>Every 12 Hours</option>
                  <option value={1440}>Every 24 Hours</option>
                </select>
              </div>
            </div>

            {/* Sync Activity History Log */}
            <div className="pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                Recent Synchronization Logs
              </h4>

              <div className="space-y-2 max-h-72 overflow-y-auto">
                {syncStatus?.recentLogs && syncStatus.recentLogs.length > 0 ? (
                  syncStatus.recentLogs.map(log => (
                    <div 
                      key={log.id}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`w-2 h-2 rounded-full ${
                          log.status === 'PRICE_DROP' ? 'bg-emerald-500' : log.status === 'ERROR' ? 'bg-rose-500' : 'bg-slate-400'
                        }`} />
                        <span className="font-bold text-slate-900">{log.productName}</span>
                        {log.priceChanged && (
                          <span className="text-[11px] text-emerald-600 font-bold">
                            ₹{log.oldPrice} → ₹{log.newPrice}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                        <span>{log.offersCount} offers</span>
                        <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    No background sync activity recorded yet. Click "Run Sync Now" to trigger a check.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Offer Management Modal for manual adjustments */}
      {selectedProductForOffers && (
        <OfferManagementModal
          product={selectedProductForOffers}
          onClose={() => setSelectedProductForOffers(null)}
          onOffersUpdated={(updated) => {
            onProductUpdated(updated.id, updated);
            setSelectedProductForOffers(null);
            onShowToast(`Offers updated for "${updated.name}"`);
          }}
          onShowToast={onShowToast}
        />
      )}
    </div>
  );
};
