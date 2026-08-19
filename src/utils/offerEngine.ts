import { PaymentOffer, BestOfferSummary } from '../types';

/**
 * Validates and calculates discount & eligibility for a specific payment offer on a product price.
 */
export function evaluateOfferEligibility(
  offer: PaymentOffer,
  productPrice: number
): {
  eligible: boolean;
  calculatedDiscount: number;
  effectivePrice: number;
  cashbackAmount: number;
  ineligibilityReason?: string;
  isExpired: boolean;
} {
  const price = productPrice || 0;

  // 1. Expiry Check
  let isExpired = false;
  if (offer.expiryDate) {
    try {
      const expTime = new Date(offer.expiryDate).getTime();
      if (!isNaN(expTime) && expTime < Date.now()) {
        isExpired = true;
      }
    } catch {
      // Ignore invalid date strings
    }
  }

  if (isExpired || offer.isActive === false) {
    return {
      eligible: false,
      calculatedDiscount: 0,
      effectivePrice: price,
      cashbackAmount: 0,
      ineligibilityReason: isExpired ? 'Offer expired' : 'Offer inactive',
      isExpired,
    };
  }

  // 2. Minimum Transaction Value Check
  if (offer.minimumTransaction && price < offer.minimumTransaction) {
    return {
      eligible: false,
      calculatedDiscount: 0,
      effectivePrice: price,
      cashbackAmount: 0,
      ineligibilityReason: `Min. transaction value of ₹${offer.minimumTransaction.toLocaleString('en-IN')} not met (current price ₹${price.toLocaleString('en-IN')})`,
      isExpired: false,
    };
  }

  // 3. Calculate based on Discount Type
  let calculatedDiscount = 0;
  let cashbackAmount = 0;

  if (offer.discountType === 'PERCENTAGE') {
    const pct = offer.discountPercentage || 0;
    const rawDisc = (price * pct) / 100;
    calculatedDiscount = offer.maximumDiscount ? Math.min(rawDisc, offer.maximumDiscount) : rawDisc;
    calculatedDiscount = Math.round(calculatedDiscount);
  } else if (offer.discountType === 'FLAT') {
    calculatedDiscount = Math.min(offer.flatDiscount || 0, price);
  } else if (offer.discountType === 'CASHBACK') {
    // Cashback does NOT reduce instant checkout price
    calculatedDiscount = 0;
    if (offer.cashback) {
      cashbackAmount = offer.cashback;
    } else if (offer.flatDiscount) {
      cashbackAmount = offer.flatDiscount;
    } else if (offer.discountPercentage) {
      const rawCb = (price * offer.discountPercentage) / 100;
      cashbackAmount = offer.maximumDiscount ? Math.min(rawCb, offer.maximumDiscount) : rawCb;
    }
  } else if (offer.discountType === 'EMI_DISCOUNT') {
    if (offer.discountPercentage) {
      const rawDisc = (price * offer.discountPercentage) / 100;
      calculatedDiscount = offer.maximumDiscount ? Math.min(rawDisc, offer.maximumDiscount) : rawDisc;
    } else {
      calculatedDiscount = offer.flatDiscount || 0;
    }
    calculatedDiscount = Math.round(Math.min(calculatedDiscount, price));
  }

  const effectivePrice = Math.max(0, price - calculatedDiscount);

  return {
    eligible: true,
    calculatedDiscount,
    effectivePrice,
    cashbackAmount,
    isExpired: false,
  };
}

/**
 * Computes the Best Available Offer among all detected non-stackable offers for a product.
 */
export function calculateBestOffer(
  offers?: PaymentOffer[],
  productPrice?: number
): BestOfferSummary | null {
  if (!offers || !Array.isArray(offers) || offers.length === 0 || !productPrice || productPrice <= 0) {
    return null;
  }

  let best: BestOfferSummary | null = null;
  let highestDiscount = 0;

  for (const offer of offers) {
    const res = evaluateOfferEligibility(offer, productPrice);
    if (res.eligible && res.calculatedDiscount > highestDiscount) {
      highestDiscount = res.calculatedDiscount;

      let discountText = '';
      if (offer.discountType === 'PERCENTAGE') {
        discountText = `${offer.discountPercentage}% OFF (₹${res.calculatedDiscount.toLocaleString('en-IN')})`;
      } else if (offer.discountType === 'FLAT') {
        discountText = `Flat ₹${res.calculatedDiscount.toLocaleString('en-IN')} OFF`;
      } else if (offer.discountType === 'EMI_DISCOUNT') {
        discountText = `EMI Offer: ₹${res.calculatedDiscount.toLocaleString('en-IN')} OFF`;
      } else {
        discountText = `Save ₹${res.calculatedDiscount.toLocaleString('en-IN')}`;
      }

      best = {
        offerId: offer.id,
        bank: offer.bank,
        cardType: offer.cardType,
        discountText,
        discountAmount: res.calculatedDiscount,
        effectivePrice: res.effectivePrice,
        cashbackAmount: res.cashbackAmount,
        isEmi: offer.discountType === 'EMI_DISCOUNT' || Boolean(offer.emiRequired),
      };
    }
  }

  return best;
}

/**
 * Formats offer description label for cards and modals.
 */
export function formatOfferHeadline(offer: PaymentOffer, currency = 'INR'): string {
  const bankAndCard = `${offer.bank} ${offer.cardType !== 'ALL' ? offer.cardType : ''}`.trim();
  const sym = currency === 'INR' || !currency ? '₹' : currency + ' ';
  
  if (offer.discountType === 'PERCENTAGE') {
    const cap = offer.maximumDiscount ? ` up to ${sym}${offer.maximumDiscount.toLocaleString('en-IN')}` : '';
    return `${offer.discountPercentage}% Instant Discount on ${bankAndCard}${cap}`;
  }
  if (offer.discountType === 'FLAT') {
    return `Flat ${sym}${(offer.flatDiscount || 0).toLocaleString('en-IN')} Instant Discount on ${bankAndCard}`;
  }
  if (offer.discountType === 'CASHBACK') {
    const val = offer.cashback || offer.flatDiscount ? `${sym}${(offer.cashback || offer.flatDiscount || 0).toLocaleString('en-IN')}` : `${offer.discountPercentage}%`;
    return `${val} Cashback on ${bankAndCard}`;
  }
  if (offer.discountType === 'EMI_DISCOUNT') {
    const tenure = offer.emiTenure ? ` (${offer.emiTenure} Tenure)` : '';
    return `EMI Offer: Save ${sym}${(offer.flatDiscount || 0).toLocaleString('en-IN')} with ${bankAndCard}${tenure}`;
  }
  return `Special Payment Offer on ${bankAndCard}`;
}
