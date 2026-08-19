import React, { useState } from 'react';
import { 
  Sparkles, Link2, ArrowRight, CheckCircle2, AlertCircle, 
  CreditCard, ShieldCheck, Tag, DollarSign, Calendar, Info, 
  Plus, Trash2, Edit3, Check, RefreshCw, X, ChevronDown, ChevronUp, Eye
} from 'lucide-react';
import { api } from '../../services/api';
import { Product, PaymentOffer, BestOfferSummary, ProductStatus, Category } from '../../types';
import { formatPrice } from '../../utils/formatters';
import { evaluateOfferEligibility, calculateBestOffer, formatOfferHeadline } from '../../utils/offerEngine';

interface ProductIntelligenceExtractorProps {
  categories: Category[];
  onProductCreated: (product: Partial<Product>) => Promise<void>;
  onShowToast: (message: string) => void;
  onCancel?: () => void;
}

export const ProductIntelligenceExtractor: React.FC<ProductIntelligenceExtractorProps> = ({
  categories,
  onProductCreated,
  onShowToast,
  onCancel,
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractStep, setExtractStep] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Extracted & Editable Product Data State
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

  // Custom offer addition form state
  const [showAddOfferModal, setShowAddOfferModal] = useState(false);
  const [newOfferBank, setNewOfferBank] = useState('');
  const [newOfferCardType, setNewOfferCardType] = useState<PaymentOffer['cardType']>('CREDIT');
  const [newOfferDiscountType, setNewOfferDiscountType] = useState<PaymentOffer['discountType']>('PERCENTAGE');
  const [newOfferDiscountPct, setNewOfferDiscountPct] = useState<string>('10');
  const [newOfferFlatDiscount, setNewOfferFlatDiscount] = useState<string>('500');
  const [newOfferMaxDiscount, setNewOfferMaxDiscount] = useState<string>('1500');
  const [newOfferMinTransaction, setNewOfferMinTransaction] = useState<string>('5000');
  const [newOfferCashback, setNewOfferCashback] = useState<string>('');
  const [newOfferEmiRequired, setNewOfferEmiRequired] = useState(false);
  const [newOfferEmiTenure, setNewOfferEmiTenure] = useState('');
  const [newOfferTerms, setNewOfferTerms] = useState('');
  const [newOfferExpiry, setNewOfferExpiry] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [showOffersBreakdown, setShowOffersBreakdown] = useState(true);

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

      // Re-evaluate offers
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

      const best = calculateBestOffer(evaluatedOffers, targetPrice || 0);

      setExtractedData({
        name: intelligence.name || 'Curated Design Find',
        imageUrl: intelligence.imageUrl || '',
        affiliateUrl: intelligence.affiliateUrl || urlInput.trim(),
        currentPrice: intelligence.currentPrice,
        originalPrice: intelligence.originalPrice,
        currency: intelligence.currency || 'INR',
        retailer: intelligence.retailer || 'Merchant',
        brand: intelligence.brand || intelligence.retailer,
        category: targetCategory,
        shortDescription: intelligence.shortDescription || `${intelligence.name} from ${intelligence.retailer}. Verified price and card discounts.`,
        detailedNotes: '',
        tags: [intelligence.retailer.toLowerCase(), 'curated', 'lifestyle'],
        availability: intelligence.availability || 'IN_STOCK',
        offers: evaluatedOffers,
        bestOffer: best,
        verifiedAt: intelligence.verifiedAt || new Date().toISOString(),
        source: intelligence.source || 'Merchant Page',
      });

      onShowToast(`✨ Extracted ${intelligence.offers.length} verified offers from ${intelligence.retailer}!`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to extract product information from URL.');
    } finally {
      setIsExtracting(false);
      setExtractStep('');
    }
  };

  // Recalculate offers when price changes
  const handlePriceChange = (newPriceStr: string) => {
    if (!extractedData) return;
    const newPrice = newPriceStr.trim() ? parseFloat(newPriceStr) : undefined;
    
    const reevaluatedOffers = extractedData.offers.map(off => {
      const evalRes = evaluateOfferEligibility(off, newPrice || 0);
      return {
        ...off,
        eligible: evalRes.eligible,
        calculatedDiscount: evalRes.calculatedDiscount,
        effectivePrice: evalRes.effectivePrice,
        ineligibilityReason: evalRes.ineligibilityReason,
      };
    });

    const best = calculateBestOffer(reevaluatedOffers, newPrice || 0);

    setExtractedData({
      ...extractedData,
      currentPrice: newPrice,
      offers: reevaluatedOffers,
      bestOffer: best,
    });
  };

  // Toggle active state of an offer
  const handleToggleOfferActive = (offerId: string) => {
    if (!extractedData) return;
    const updated = extractedData.offers.map(o => {
      if (o.id === offerId) {
        const nextActive = !o.isActive;
        const evalRes = evaluateOfferEligibility({ ...o, isActive: nextActive }, extractedData.currentPrice || 0);
        return {
          ...o,
          isActive: nextActive,
          eligible: evalRes.eligible,
          calculatedDiscount: evalRes.calculatedDiscount,
          effectivePrice: evalRes.effectivePrice,
          ineligibilityReason: evalRes.ineligibilityReason,
        };
      }
      return o;
    });

    const best = calculateBestOffer(updated, extractedData.currentPrice || 0);
    setExtractedData({
      ...extractedData,
      offers: updated,
      bestOffer: best,
    });
  };

  // Remove an offer
  const handleRemoveOffer = (offerId: string) => {
    if (!extractedData) return;
    const updated = extractedData.offers.filter(o => o.id !== offerId);
    const best = calculateBestOffer(updated, extractedData.currentPrice || 0);
    setExtractedData({
      ...extractedData,
      offers: updated,
      bestOffer: best,
    });
  };

  // Add custom manual offer
  const handleAddCustomOffer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOfferBank.trim() || !extractedData) return;

    const discountPctNum = newOfferDiscountPct.trim() ? parseFloat(newOfferDiscountPct) : undefined;
    const flatNum = newOfferFlatDiscount.trim() ? parseFloat(newOfferFlatDiscount) : undefined;
    const maxNum = newOfferMaxDiscount.trim() ? parseFloat(newOfferMaxDiscount) : undefined;
    const minNum = newOfferMinTransaction.trim() ? parseFloat(newOfferMinTransaction) : undefined;
    const cashNum = newOfferCashback.trim() ? parseFloat(newOfferCashback) : undefined;

    const newOffer: PaymentOffer = {
      id: 'custom_' + Date.now().toString(36),
      bank: newOfferBank.trim(),
      cardType: newOfferCardType,
      paymentMethod: `${newOfferBank.trim()} ${newOfferCardType} Card`,
      discountType: newOfferDiscountType,
      discountPercentage: discountPctNum,
      flatDiscount: flatNum,
      maximumDiscount: maxNum,
      minimumTransaction: minNum,
      cashback: cashNum,
      emiRequired: newOfferEmiRequired,
      emiTenure: newOfferEmiTenure.trim() || undefined,
      terms: newOfferTerms.trim() || 'Admin-verified promotional discount.',
      expiryDate: newOfferExpiry.trim() || undefined,
      source: 'ADMIN_VERIFIED',
      verifiedAt: new Date().toISOString(),
      isActive: true,
    };

    const evalRes = evaluateOfferEligibility(newOffer, extractedData.currentPrice || 0);
    newOffer.eligible = evalRes.eligible;
    newOffer.calculatedDiscount = evalRes.calculatedDiscount;
    newOffer.effectivePrice = evalRes.effectivePrice;
    newOffer.ineligibilityReason = evalRes.ineligibilityReason;

    const updatedOffers = [newOffer, ...extractedData.offers];
    const best = calculateBestOffer(updatedOffers, extractedData.currentPrice || 0);

    setExtractedData({
      ...extractedData,
      offers: updatedOffers,
      bestOffer: best,
    });

    setShowAddOfferModal(false);
    setNewOfferBank('');
    onShowToast(`Added custom offer: ${newOffer.bank}`);
  };

  // Publish or Save
  const handleSaveProduct = async (status: ProductStatus) => {
    if (!extractedData) return;
    if (!extractedData.name.trim()) {
      setErrorMessage('Product Name is required.');
      return;
    }
    if (!extractedData.imageUrl.trim()) {
      setErrorMessage('Product Image URL is required.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const origPrice = extractedData.originalPrice;
      const currPrice = extractedData.currentPrice;
      let discountPct = undefined;
      if (origPrice && currPrice && origPrice > currPrice) {
        discountPct = Math.round(((origPrice - currPrice) / origPrice) * 100);
      }

      await onProductCreated({
        name: extractedData.name.trim(),
        imageUrl: extractedData.imageUrl.trim(),
        affiliateLink: extractedData.affiliateUrl.trim(),
        productUrl: extractedData.affiliateUrl.trim(),
        price: currPrice,
        currentPrice: currPrice,
        originalPrice: origPrice,
        discountPercentage: discountPct,
        currency: extractedData.currency || 'INR',
        retailer: extractedData.retailer.trim() || 'Direct Brand',
        brand: extractedData.brand?.trim() || extractedData.retailer.trim(),
        category: extractedData.category,
        shortDescription: extractedData.shortDescription.trim(),
        detailedNotes: extractedData.detailedNotes?.trim() || undefined,
        tags: extractedData.tags,
        status,
        availability: extractedData.availability,
        offers: extractedData.offers,
        bestOffer: extractedData.bestOffer,
      });

      onShowToast(`Product "${extractedData.name}" successfully saved as ${status}!`);
      setExtractedData(null);
      setUrlInput('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save product.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <Sparkles className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-900">
              Real-Time URL Importer & Card Discount Intelligence
            </h2>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Paste any affiliate product URL (e.g. Amazon, Flipkart, Myntra). The system automatically fetches pricing, MRP, and verified bank/card offers with zero guesswork.
          </p>
        </div>

        {onCancel && (
          <button
            onClick={onCancel}
            className="self-start sm:self-auto p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* URL Input Form */}
      <form onSubmit={handleExtract} className="space-y-3">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
          Affiliate Product URL
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Link2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://www.amazon.in/dp/... or https://www.flipkart.com/..."
              disabled={isExtracting}
              className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 transition-all outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={isExtracting || !urlInput.trim()}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-sm shadow-md shadow-rose-600/20 transition-all active:scale-95 cursor-pointer whitespace-nowrap"
          >
            {isExtracting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Analyzing URL...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Fetch & Extract Intelligence</span>
              </>
            )}
          </button>
        </div>

        {extractStep && (
          <p className="text-xs font-medium text-rose-600 flex items-center gap-1.5 animate-pulse">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            {extractStep}
          </p>
        )}

        {errorMessage && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Extraction Error</p>
              <p className="mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}
      </form>

      {/* Extracted Product Review Stage */}
      {extractedData && (
        <div className="space-y-6 pt-4 border-t border-slate-100 animate-in fade-in duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
              </span>
              <span className="font-bold text-slate-800 text-sm">
                Extracted Intelligence Preview (Review Before Publishing)
              </span>
            </div>

            <span className="text-xs text-slate-400">
              Source: <strong className="text-slate-700">{extractedData.source}</strong>
            </span>
          </div>

          {/* Product Fields Editor Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Image & Basic Metadata */}
            <div className="lg:col-span-4 space-y-4">
              <div className="aspect-square w-full rounded-2xl bg-slate-100 overflow-hidden border border-slate-200 relative group">
                {extractedData.imageUrl ? (
                  <img
                    src={extractedData.imageUrl}
                    alt={extractedData.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                    <AlertCircle className="w-8 h-8 mb-2" />
                    <span className="text-xs">No image auto-extracted. Please paste an image URL below.</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Image URL</label>
                <input
                  type="url"
                  value={extractedData.imageUrl}
                  onChange={(e) => setExtractedData({ ...extractedData, imageUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Retailer</label>
                <input
                  type="text"
                  value={extractedData.retailer}
                  onChange={(e) => setExtractedData({ ...extractedData, retailer: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Category</label>
                <select
                  value={extractedData.category}
                  onChange={(e) => setExtractedData({ ...extractedData, category: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white cursor-pointer"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Right Column: Title, Prices, Best Offer & Details */}
            <div className="lg:col-span-8 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Product Title</label>
                <input
                  type="text"
                  value={extractedData.name}
                  onChange={(e) => setExtractedData({ ...extractedData, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm font-semibold rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white"
                />
              </div>

              {/* Price & MRP Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Selling Price ({extractedData.currency})
                  </label>
                  <input
                    type="number"
                    value={extractedData.currentPrice ?? ''}
                    onChange={(e) => handlePriceChange(e.target.value)}
                    placeholder="e.g. 19999"
                    className="w-full px-3 py-2 text-sm font-black rounded-xl bg-white border border-slate-200 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    MRP / Original Price
                  </label>
                  <input
                    type="number"
                    value={extractedData.originalPrice ?? ''}
                    onChange={(e) => setExtractedData({ ...extractedData, originalPrice: e.target.value ? parseFloat(e.target.value) : undefined })}
                    placeholder="e.g. 24999"
                    className="w-full px-3 py-2 text-sm font-semibold rounded-xl bg-white border border-slate-200 text-slate-500 line-through"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Currency
                  </label>
                  <input
                    type="text"
                    value={extractedData.currency}
                    onChange={(e) => setExtractedData({ ...extractedData, currency: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 text-sm font-bold rounded-xl bg-white border border-slate-200 text-slate-900"
                  />
                </div>
              </div>

              {/* Best Card Offer Highlight Card */}
              {extractedData.bestOffer ? (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="p-2 rounded-xl bg-emerald-600 text-white shrink-0 mt-0.5">
                      <CreditCard className="w-4 h-4" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase text-emerald-800 tracking-wider">
                          Best Card Offer Applied: {extractedData.bestOffer.bank} ({extractedData.bestOffer.cardType})
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white">
                          Save {formatPrice(extractedData.bestOffer.discountAmount, extractedData.currency)}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-emerald-900 mt-0.5">
                        {extractedData.bestOffer.discountText}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] uppercase font-bold text-emerald-700 block">Effective Price</span>
                    <span className="text-lg font-black text-emerald-900">
                      {formatPrice(extractedData.bestOffer.effectivePrice, extractedData.currency)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 text-xs flex items-center justify-between">
                  <span>No card offers currently qualified for this price point.</span>
                  <button
                    type="button"
                    onClick={() => setShowAddOfferModal(true)}
                    className="text-xs font-bold text-rose-600 hover:text-rose-700 underline"
                  >
                    + Add Card Offer
                  </button>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Short Description</label>
                <textarea
                  rows={2}
                  value={extractedData.shortDescription}
                  onChange={(e) => setExtractedData({ ...extractedData, shortDescription: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white"
                />
              </div>

              {/* Verified Offers Section */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setShowOffersBreakdown(!showOffersBreakdown)}
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-800 hover:text-slate-900"
                  >
                    <span>Detected Bank Offers ({extractedData.offers.length})</span>
                    {showOffersBreakdown ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowAddOfferModal(true)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Bank Offer</span>
                  </button>
                </div>

                {showOffersBreakdown && (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {extractedData.offers.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-2">
                        No verified bank offers extracted from page. You can add verified card offers manually.
                      </p>
                    ) : (
                      extractedData.offers.map((offer) => (
                        <div
                          key={offer.id}
                          className={`p-3 rounded-xl border text-xs transition-all flex items-start justify-between gap-3 ${
                            offer.isActive
                              ? offer.eligible
                                ? 'bg-white border-slate-200 hover:border-slate-300'
                                : 'bg-amber-50/50 border-amber-200/80 text-amber-900'
                              : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">
                                {offer.bank}
                              </span>
                              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                                {offer.cardType}
                              </span>
                              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                                offer.discountType === 'CASHBACK' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                {offer.discountType === 'PERCENTAGE' && `${offer.discountPercentage}% OFF`}
                                {offer.discountType === 'FLAT' && `Flat ${formatPrice(offer.flatDiscount || 0, extractedData.currency)} OFF`}
                                {offer.discountType === 'CASHBACK' && `Cashback: ${formatPrice(offer.cashback || offer.flatDiscount || 0, extractedData.currency)}`}
                                {offer.discountType === 'EMI_DISCOUNT' && `EMI Offer`}
                              </span>
                              {offer.source === 'ADMIN_VERIFIED' && (
                                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-800">
                                  Admin Verified
                                </span>
                              )}
                            </div>

                            <p className="text-slate-600 text-[11px] leading-relaxed">
                              {offer.terms || formatOfferHeadline(offer, extractedData.currency)}
                            </p>

                            <div className="flex items-center gap-3 text-[10px] text-slate-400">
                              {offer.minimumTransaction && (
                                <span>Min. Spend: {formatPrice(offer.minimumTransaction, extractedData.currency)}</span>
                              )}
                              {offer.maximumDiscount && (
                                <span>Max. Cap: {formatPrice(offer.maximumDiscount, extractedData.currency)}</span>
                              )}
                              {offer.ineligibilityReason && (
                                <span className="text-amber-700 font-semibold">⚠️ {offer.ineligibilityReason}</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleToggleOfferActive(offer.id)}
                              title={offer.isActive ? 'Deactivate Offer' : 'Activate Offer'}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                                offer.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {offer.isActive ? 'Active' : 'Disabled'}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRemoveOffer(offer.id)}
                              className="p-1 rounded-lg text-slate-400 hover:text-red-600 transition-colors"
                              title="Delete offer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Confirmation Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setExtractedData(null)}
              disabled={isSaving}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
            >
              Discard & New URL
            </button>

            <button
              type="button"
              onClick={() => handleSaveProduct('DRAFT')}
              disabled={isSaving}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm"
            >
              {isSaving ? 'Saving...' : 'Save as Draft'}
            </button>

            <button
              type="button"
              onClick={() => handleSaveProduct('PUBLISHED')}
              disabled={isSaving}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-md shadow-rose-600/20 active:scale-95 flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Approve & Publish Immediately</span>
            </button>
          </div>
        </div>
      )}

      {/* Add Custom Offer Modal */}
      {showAddOfferModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-rose-600" />
                Add Bank / Card Promotion
              </h3>
              <button
                onClick={() => setShowAddOfferModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCustomOffer} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Bank Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HDFC Bank, SBI Card, ICICI"
                    value={newOfferBank}
                    onChange={(e) => setNewOfferBank(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Card Type</label>
                  <select
                    value={newOfferCardType}
                    onChange={(e) => setNewOfferCardType(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white"
                  >
                    <option value="CREDIT">Credit Card</option>
                    <option value="DEBIT">Debit Card</option>
                    <option value="ALL">All Cards</option>
                    <option value="EMI">EMI</option>
                    <option value="UPI">UPI</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Discount Type</label>
                  <select
                    value={newOfferDiscountType}
                    onChange={(e) => setNewOfferDiscountType(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white"
                  >
                    <option value="PERCENTAGE">Percentage (% Off)</option>
                    <option value="FLAT">Flat Discount (₹ Off)</option>
                    <option value="CASHBACK">Cashback</option>
                    <option value="EMI_DISCOUNT">EMI Discount</option>
                  </select>
                </div>

                {newOfferDiscountType === 'PERCENTAGE' ? (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Discount Percentage (%)</label>
                    <input
                      type="number"
                      placeholder="10"
                      value={newOfferDiscountPct}
                      onChange={(e) => setNewOfferDiscountPct(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Flat Discount Amount</label>
                    <input
                      type="number"
                      placeholder="500"
                      value={newOfferFlatDiscount}
                      onChange={(e) => setNewOfferFlatDiscount(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Max Discount Cap (₹)</label>
                  <input
                    type="number"
                    placeholder="1500"
                    value={newOfferMaxDiscount}
                    onChange={(e) => setNewOfferMaxDiscount(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Min. Transaction (₹)</label>
                  <input
                    type="number"
                    placeholder="5000"
                    value={newOfferMinTransaction}
                    onChange={(e) => setNewOfferMinTransaction(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Terms & Conditions Snippet</label>
                <input
                  type="text"
                  placeholder="e.g. Valid on 6M and 9M EMI transactions only."
                  value={newOfferTerms}
                  onChange={(e) => setNewOfferTerms(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddOfferModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm"
                >
                  Add Offer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
