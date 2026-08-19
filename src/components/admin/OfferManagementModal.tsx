import React, { useState } from 'react';
import { 
  CreditCard, Plus, Trash2, X, Check, AlertCircle, 
  Sparkles, Calendar, ShieldCheck, Tag, Info, DollarSign
} from 'lucide-react';
import { api } from '../../services/api';
import { Product, PaymentOffer, BestOfferSummary, CardType, OfferDiscountType, OfferSource } from '../../types';
import { formatPrice } from '../../utils/formatters';
import { evaluateOfferEligibility, calculateBestOffer, formatOfferHeadline } from '../../utils/offerEngine';

interface OfferManagementModalProps {
  product: Product;
  onClose: () => void;
  onOffersUpdated: (updatedProduct: Product) => void;
  onShowToast: (message: string) => void;
}

export const OfferManagementModal: React.FC<OfferManagementModalProps> = ({
  product,
  onClose,
  onOffersUpdated,
  onShowToast,
}) => {
  const currentPrice = product.price || product.currentPrice || 0;
  const currency = product.currency || 'INR';

  const [offers, setOffers] = useState<PaymentOffer[]>(() => {
    return (product.offers || []).map(off => {
      const evalRes = evaluateOfferEligibility(off, currentPrice);
      return {
        ...off,
        eligible: evalRes.eligible,
        calculatedDiscount: evalRes.calculatedDiscount,
        effectivePrice: evalRes.effectivePrice,
        ineligibilityReason: evalRes.ineligibilityReason,
      };
    });
  });

  const [isSaving, setIsSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // New offer form state
  const [bank, setBank] = useState('');
  const [cardType, setCardType] = useState<CardType>('CREDIT');
  const [discountType, setDiscountType] = useState<OfferDiscountType>('PERCENTAGE');
  const [discountPct, setDiscountPct] = useState('10');
  const [flatDiscount, setFlatDiscount] = useState('500');
  const [maxDiscount, setMaxDiscount] = useState('1500');
  const [minTransaction, setMinTransaction] = useState('5000');
  const [cashback, setCashback] = useState('');
  const [emiRequired, setEmiRequired] = useState(false);
  const [emiTenure, setEmiTenure] = useState('');
  const [terms, setTerms] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  // Recomputed best offer
  const bestOffer = calculateBestOffer(offers, currentPrice);

  const handleToggleActive = (id: string) => {
    const updated = offers.map(o => {
      if (o.id === id) {
        const nextActive = !o.isActive;
        const evalRes = evaluateOfferEligibility({ ...o, isActive: nextActive }, currentPrice);
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
    setOffers(updated);
  };

  const handleRemoveOffer = (id: string) => {
    setOffers(offers.filter(o => o.id !== id));
  };

  const handleAddOffer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bank.trim()) return;

    const discountPctNum = discountPct.trim() ? parseFloat(discountPct) : undefined;
    const flatNum = flatDiscount.trim() ? parseFloat(flatDiscount) : undefined;
    const maxNum = maxDiscount.trim() ? parseFloat(maxDiscount) : undefined;
    const minNum = minTransaction.trim() ? parseFloat(minTransaction) : undefined;
    const cashNum = cashback.trim() ? parseFloat(cashback) : undefined;

    const newOffer: PaymentOffer = {
      id: 'off_' + Date.now().toString(36),
      bank: bank.trim(),
      cardType,
      paymentMethod: `${bank.trim()} ${cardType} Card`,
      discountType,
      discountPercentage: discountPctNum,
      flatDiscount: flatNum,
      maximumDiscount: maxNum,
      minimumTransaction: minNum,
      cashback: cashNum,
      emiRequired,
      emiTenure: emiTenure.trim() || undefined,
      terms: terms.trim() || 'Admin-verified promotional discount.',
      expiryDate: expiryDate.trim() || undefined,
      source: 'ADMIN_VERIFIED',
      verifiedAt: new Date().toISOString(),
      isActive: true,
    };

    const evalRes = evaluateOfferEligibility(newOffer, currentPrice);
    newOffer.eligible = evalRes.eligible;
    newOffer.calculatedDiscount = evalRes.calculatedDiscount;
    newOffer.effectivePrice = evalRes.effectivePrice;
    newOffer.ineligibilityReason = evalRes.ineligibilityReason;

    setOffers([newOffer, ...offers]);
    setShowAddForm(false);
    setBank('');
    onShowToast(`Added offer: ${newOffer.bank}`);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await api.updateProductOffers(product.id, offers);
      onOffersUpdated(res.product);
      onShowToast(`Updated bank offers for "${product.name}"`);
      onClose();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to update offers');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] flex flex-col border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <CreditCard className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-slate-900">
                Manage Bank & Card Offers
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              For: <strong className="text-slate-800">{product.name}</strong> • Selling Price: <strong className="text-slate-900">{formatPrice(currentPrice, currency)}</strong>
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Best Offer Preview */}
        {bestOffer ? (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-emerald-600 text-white shrink-0">
                <Sparkles className="w-4 h-4" />
              </span>
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">
                  Current Best Offer: {bestOffer.bank} ({bestOffer.cardType})
                </span>
                <p className="text-xs font-bold text-emerald-950">
                  {bestOffer.discountText}
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[10px] uppercase font-semibold text-emerald-700 block">Effective Price</span>
              <span className="text-base font-black text-emerald-900">
                {formatPrice(bestOffer.effectivePrice, currency)}
              </span>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-xs flex items-center justify-between">
            <span>No active card offer eligible for this price.</span>
            <span className="text-[11px] text-slate-400">Add an offer below</span>
          </div>
        )}

        {/* Scrollable Offers List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Active & Configured Offers ({offers.length})
            </span>
            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showAddForm ? 'Cancel Add' : 'Add Bank Offer'}</span>
            </button>
          </div>

          {/* Add Offer Form Inline */}
          {showAddForm && (
            <form onSubmit={handleAddOffer} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 animate-in fade-in duration-200">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Bank Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HDFC Bank"
                    value={bank}
                    onChange={(e) => setBank(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Card Type</label>
                  <select
                    value={cardType}
                    onChange={(e) => setCardType(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200"
                  >
                    <option value="CREDIT">Credit Card</option>
                    <option value="DEBIT">Debit Card</option>
                    <option value="ALL">All Cards</option>
                    <option value="EMI">EMI</option>
                    <option value="UPI">UPI</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Discount Type</label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FLAT">Flat Amount (₹)</option>
                    <option value="CASHBACK">Cashback</option>
                    <option value="EMI_DISCOUNT">EMI Discount</option>
                  </select>
                </div>

                {discountType === 'PERCENTAGE' ? (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Discount %</label>
                    <input
                      type="number"
                      placeholder="10"
                      value={discountPct}
                      onChange={(e) => setDiscountPct(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Flat Discount (₹)</label>
                    <input
                      type="number"
                      placeholder="500"
                      value={flatDiscount}
                      onChange={(e) => setFlatDiscount(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Max Cap (₹)</label>
                  <input
                    type="number"
                    placeholder="1500"
                    value={maxDiscount}
                    onChange={(e) => setMaxDiscount(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Min. Spend (₹)</label>
                  <input
                    type="number"
                    placeholder="5000"
                    value={minTransaction}
                    onChange={(e) => setMinTransaction(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Terms Snippet</label>
                <input
                  type="text"
                  placeholder="e.g. Valid on minimum purchase of ₹5,000"
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 shadow-xs"
                >
                  Add
                </button>
              </div>
            </form>
          )}

          {offers.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p>No verified bank offers attached to this product.</p>
              <p className="mt-1">Click "Add Bank Offer" above to configure credit card or cashback discounts.</p>
            </div>
          ) : (
            offers.map((offer) => (
              <div
                key={offer.id}
                className={`p-4 rounded-2xl border text-xs flex items-start justify-between gap-3 transition-all ${
                  offer.isActive
                    ? offer.eligible
                      ? 'bg-white border-slate-200 shadow-2xs'
                      : 'bg-amber-50/60 border-amber-200 text-amber-900'
                    : 'bg-slate-50 border-slate-200 opacity-60'
                }`}
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 text-sm">
                      {offer.bank}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                      {offer.cardType}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      offer.discountType === 'CASHBACK' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {offer.discountType === 'PERCENTAGE' && `${offer.discountPercentage}% OFF`}
                      {offer.discountType === 'FLAT' && `Flat ${formatPrice(offer.flatDiscount || 0, currency)} OFF`}
                      {offer.discountType === 'CASHBACK' && `Cashback: ${formatPrice(offer.cashback || offer.flatDiscount || 0, currency)}`}
                      {offer.discountType === 'EMI_DISCOUNT' && `EMI Offer`}
                    </span>
                    {offer.source === 'ADMIN_VERIFIED' && (
                      <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-800">
                        Admin Verified
                      </span>
                    )}
                  </div>

                  <p className="text-slate-600 text-xs">
                    {offer.terms || formatOfferHeadline(offer, currency)}
                  </p>

                  <div className="flex items-center gap-3 text-[11px] text-slate-400">
                    {offer.minimumTransaction && (
                      <span>Min. Spend: {formatPrice(offer.minimumTransaction, currency)}</span>
                    )}
                    {offer.maximumDiscount && (
                      <span>Max. Cap: {formatPrice(offer.maximumDiscount, currency)}</span>
                    )}
                    {offer.ineligibilityReason && (
                      <span className="text-amber-700 font-semibold">⚠️ {offer.ineligibilityReason}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(offer.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                      offer.isActive ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                    }`}
                  >
                    {offer.isActive ? 'Active' : 'Disabled'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRemoveOffer(offer.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 active:scale-95 flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>{isSaving ? 'Saving Changes...' : 'Save Offers'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
