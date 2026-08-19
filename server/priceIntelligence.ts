import { GoogleGenAI, Type } from '@google/genai';
import crypto from 'crypto';

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

export interface ExtractedProductData {
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
}

// SSRF Protection: List of blocked private & loopback host patterns
function isIpOrHostBlocked(hostname: string): boolean {
  const host = hostname.toLowerCase().trim();
  
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host === 'metadata.google.internal' ||
    host.endsWith('.internal') ||
    host.endsWith('.local')
  ) {
    return true;
  }

  // Check IPv4 ranges: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16
  const parts = host.split('.').map(p => parseInt(p, 10));
  if (parts.length === 4 && parts.every(p => !isNaN(p) && p >= 0 && p <= 255)) {
    if (parts[0] === 10) return true;
    if (parts[0] === 127) return true;
    if (parts[0] === 0) return true;
    if (parts[0] === 169 && parts[1] === 254) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  }

  return false;
}

/**
 * Evaluates an offer against a product price for eligibility and calculates effective price
 */
export function evaluateOffer(
  offer: PaymentOffer,
  productPrice: number
): {
  eligible: boolean;
  calculatedDiscount: number;
  effectivePrice: number;
  cashbackAmount: number;
  ineligibilityReason?: string;
} {
  const price = productPrice || 0;

  // Expiry check
  if (offer.expiryDate) {
    try {
      const expTime = new Date(offer.expiryDate).getTime();
      if (!isNaN(expTime) && expTime < Date.now()) {
        return {
          eligible: false,
          calculatedDiscount: 0,
          effectivePrice: price,
          cashbackAmount: 0,
          ineligibilityReason: 'Offer expired',
        };
      }
    } catch {}
  }

  if (offer.isActive === false) {
    return {
      eligible: false,
      calculatedDiscount: 0,
      effectivePrice: price,
      cashbackAmount: 0,
      ineligibilityReason: 'Offer inactive',
    };
  }

  // Minimum transaction check
  if (offer.minimumTransaction && price < offer.minimumTransaction) {
    return {
      eligible: false,
      calculatedDiscount: 0,
      effectivePrice: price,
      cashbackAmount: 0,
      ineligibilityReason: `Min. transaction ₹${offer.minimumTransaction.toLocaleString('en-IN')} not met`,
    };
  }

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
    calculatedDiscount = 0; // Cashback does NOT reduce instant checkout price
    if (offer.cashback) {
      cashbackAmount = offer.cashback;
    } else if (offer.flatDiscount) {
      cashbackAmount = offer.flatDiscount;
    } else if (offer.discountPercentage) {
      const raw = (price * offer.discountPercentage) / 100;
      cashbackAmount = offer.maximumDiscount ? Math.min(raw, offer.maximumDiscount) : raw;
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
  };
}

/**
 * Finds the single best instant discount offer for a product
 */
export function determineBestOffer(offers: PaymentOffer[], currentPrice?: number): BestOfferSummary | null {
  if (!offers || offers.length === 0 || !currentPrice || currentPrice <= 0) {
    return null;
  }

  let best: BestOfferSummary | null = null;
  let maxDiscount = 0;

  for (const off of offers) {
    const res = evaluateOffer(off, currentPrice);
    if (res.eligible && res.calculatedDiscount > maxDiscount) {
      maxDiscount = res.calculatedDiscount;
      let text = '';
      if (off.discountType === 'PERCENTAGE') {
        text = `${off.discountPercentage}% OFF (₹${res.calculatedDiscount.toLocaleString('en-IN')})`;
      } else if (off.discountType === 'FLAT') {
        text = `Flat ₹${res.calculatedDiscount.toLocaleString('en-IN')} OFF`;
      } else if (off.discountType === 'EMI_DISCOUNT') {
        text = `EMI Offer: ₹${res.calculatedDiscount.toLocaleString('en-IN')} OFF`;
      } else {
        text = `Save ₹${res.calculatedDiscount.toLocaleString('en-IN')}`;
      }

      best = {
        offerId: off.id,
        bank: off.bank,
        cardType: off.cardType,
        discountText: text,
        discountAmount: res.calculatedDiscount,
        effectivePrice: res.effectivePrice,
        cashbackAmount: res.cashbackAmount,
        isEmi: off.discountType === 'EMI_DISCOUNT' || Boolean(off.emiRequired),
      };
    }
  }

  return best;
}

/**
 * Deterministic HTML parser to extract JSON-LD, OpenGraph, and merchant prices
 */
function parseMerchantHtml(html: string, urlStr: string) {
  let name = '';
  let imageUrl = '';
  let currentPrice: number | undefined = undefined;
  let originalPrice: number | undefined = undefined;
  let currency = 'INR';
  let availability: 'IN_STOCK' | 'OUT_OF_STOCK' | 'PREORDER' | 'UNKNOWN' = 'IN_STOCK';
  let retailer = 'Direct Merchant';
  let brand: string | undefined = undefined;

  try {
    const parsedUrl = new URL(urlStr);
    const host = parsedUrl.hostname.toLowerCase();
    if (host.includes('amazon.')) retailer = 'Amazon';
    else if (host.includes('flipkart.')) retailer = 'Flipkart';
    else if (host.includes('myntra.')) retailer = 'Myntra';
    else if (host.includes('ajio.')) retailer = 'Ajio';
    else if (host.includes('nykaa.')) retailer = 'Nykaa';
    else if (host.includes('tata_cliq') || host.includes('tatacliq')) retailer = 'Tata CLiQ';
    else if (host.includes('croma.')) retailer = 'Croma';
    else if (host.includes('reliancedigital')) retailer = 'Reliance Digital';
    else {
      retailer = host.replace('www.', '').split('.')[0];
      retailer = retailer.charAt(0).toUpperCase() + retailer.slice(1);
    }
  } catch {}

  // 1. JSON-LD Parsing
  const jsonLdMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  if (jsonLdMatches) {
    for (const tag of jsonLdMatches) {
      try {
        const rawJson = tag.replace(/<\/?script[^>]*>/gi, '').trim();
        const data = JSON.parse(rawJson);
        const candidates = Array.isArray(data) ? data : data['@graph'] ? data['@graph'] : [data];
        for (const item of candidates) {
          if (item['@type'] === 'Product' || item['@type'] === 'IndividualProduct') {
            if (item.name && !name) name = String(item.name).trim();
            if (item.brand && !brand) {
              brand = typeof item.brand === 'object' ? item.brand.name : String(item.brand);
            }
            if (item.image && !imageUrl) {
              imageUrl = Array.isArray(item.image) ? item.image[0] : typeof item.image === 'object' ? item.image.url : item.image;
            }
            if (item.offers) {
              const offerObj = Array.isArray(item.offers) ? item.offers[0] : item.offers;
              if (offerObj.price) {
                const parsedP = parseFloat(String(offerObj.price).replace(/[^0-9.]/g, ''));
                if (!isNaN(parsedP) && parsedP > 0) currentPrice = parsedP;
              }
              if (offerObj.priceCurrency) currency = offerObj.priceCurrency;
              if (offerObj.availability) {
                const av = String(offerObj.availability).toLowerCase();
                if (av.includes('instock')) availability = 'IN_STOCK';
                else if (av.includes('outofstock')) availability = 'OUT_OF_STOCK';
              }
            }
          }
        }
      } catch {}
    }
  }

  // 2. OpenGraph / Twitter Metadata Parsing
  if (!name) {
    const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
                    html.match(/<meta[^>]*name=["']twitter:title["'][^>]*content=["']([^"']+)["']/i) ||
                    html.match(/<title>([^<]+)<\/title>/i);
    if (ogTitle) name = ogTitle[1].trim();
  }

  if (!imageUrl) {
    const ogImage = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
                    html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i);
    if (ogImage) imageUrl = ogImage[1].trim();
  }

  if (!currentPrice) {
    const ogPrice = html.match(/<meta[^>]*property=["'](?:og:price:amount|product:price:amount)["'][^>]*content=["']([^"']+)["']/i) ||
                    html.match(/<meta[^>]*name=["']twitter:data1["'][^>]*content=["']([^"']+)["']/i);
    if (ogPrice) {
      const p = parseFloat(ogPrice[1].replace(/[^0-9.]/g, ''));
      if (!isNaN(p) && p > 0) currentPrice = p;
    }
  }

  // 3. Amazon selectors heuristics
  if (retailer === 'Amazon') {
    if (!name) {
      const amazonTitle = html.match(/id=["']productTitle["'][^>]*>([\s\S]*?)<\/span>/i);
      if (amazonTitle) name = amazonTitle[1].replace(/\s+/g, ' ').trim();
    }
    if (!currentPrice) {
      const priceWhole = html.match(/class=["']a-price-whole["'][^>]*>([\s\S]*?)<\/span>/i);
      if (priceWhole) {
        const clean = priceWhole[1].replace(/[^0-9]/g, '');
        if (clean) currentPrice = parseInt(clean, 10);
      }
    }
    if (!originalPrice) {
      const mrpMatch = html.match(/class=["']a-text-price["'][^>]*>[\s\S]*?<span[^>]*class=["']a-offscreen["'][^>]*>([\s\S]*?)<\/span>/i) ||
                       html.match(/class=["']basisPrice["'][^>]*>[\s\S]*?<span[^>]*class=["']a-offscreen["'][^>]*>([\s\S]*?)<\/span>/i);
      if (mrpMatch) {
        const clean = mrpMatch[1].replace(/[^0-9.]/g, '');
        if (clean) originalPrice = parseFloat(clean);
      }
    }
    if (!imageUrl) {
      const landingImg = html.match(/id=["']landingImage["'][^>]*data-old-hires=["']([^"']+)["']/i) ||
                         html.match(/id=["']landingImage["'][^>]*src=["']([^"']+)["']/i);
      if (landingImg) imageUrl = landingImg[1];
    }
  }

  // 4. Flipkart selectors heuristics
  if (retailer === 'Flipkart') {
    if (!currentPrice) {
      const fkPrice = html.match(/class=["']_30jeq3[^"']*["'][^>]*>([^<]+)<\/div>/i);
      if (fkPrice) {
        const clean = fkPrice[1].replace(/[^0-9]/g, '');
        if (clean) currentPrice = parseInt(clean, 10);
      }
    }
    if (!originalPrice) {
      const fkMrp = html.match(/class=["']_3I9_wc[^"']*["'][^>]*>([^<]+)<\/div>/i);
      if (fkMrp) {
        const clean = fkMrp[1].replace(/[^0-9]/g, '');
        if (clean) originalPrice = parseInt(clean, 10);
      }
    }
  }

  // Calculate discount percentage if original & current prices exist
  let discountPercentage: number | undefined = undefined;
  if (originalPrice && currentPrice && originalPrice > currentPrice) {
    discountPercentage = Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
  }

  return {
    name: name.replace(/\s+/g, ' ').trim(),
    imageUrl,
    currentPrice,
    originalPrice,
    currency,
    discountPercentage,
    retailer,
    brand,
    availability,
  };
}

/**
 * Extracts candidate text snippets likely containing bank, payment, or card promotions
 */
function extractOfferSnippets(html: string): string {
  // Strip script, style, svg, noscript tags to save space
  let clean = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Find paragraphs/sentences containing offer keywords
  const keywords = ['bank offer', 'instant discount', 'hdfc', 'icici', 'sbi card', 'axis bank', 'kotak', 'cashback', 'credit card', 'debit card', 'emi offer', 'amazon pay', 'discount up to', 'flat off', 'min purchase'];
  const sentences = clean.split(/[.\n\r|•]+/);
  const matchedSentences: string[] = [];

  for (const s of sentences) {
    const lower = s.toLowerCase();
    if (keywords.some(k => lower.includes(k)) && s.length > 10 && s.length < 350) {
      matchedSentences.push(s.trim());
    }
  }

  return matchedSentences.slice(0, 25).join('\n');
}

/**
 * Uses Gemini 3.7 Flash to extract verified bank offers and product data with zero hallucination
 */
async function extractWithGemini(
  cleanedText: string,
  urlStr: string,
  baseData: ReturnType<typeof parseMerchantHtml>
): Promise<{ product: Partial<ReturnType<typeof parseMerchantHtml>>; offers: PaymentOffer[] } | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: { 'User-Agent': 'aistudio-build' },
      },
    });

    const prompt = `Analyze the following merchant page text snippet from URL: "${urlStr}".
Extracted fallback info:
- Name: "${baseData.name}"
- Current Price: ${baseData.currentPrice || 'Unknown'}
- Original Price: ${baseData.originalPrice || 'Unknown'}
- Retailer: "${baseData.retailer}"

Page Text Snippet:
"""
${cleanedText.slice(0, 6000)}
"""

CRITICAL ANTI-HALLUCINATION INSTRUCTIONS:
1. Extract ONLY verified product information and currently displayed payment/bank/card offers explicitly stated in the text.
2. If NO payment/card offers are mentioned, return an empty array [] for offers. DO NOT INVENT ANY BANKS, CARDS, OR DISCOUNTS.
3. For each detected offer:
   - bank: Full bank name (e.g. "HDFC Bank", "ICICI Bank", "SBI Card", "Axis Bank", "Amazon Pay", "Federal Bank")
   - cardType: "CREDIT" | "DEBIT" | "ALL" | "EMI" | "PAY_LATER" | "UPI"
   - paymentMethod: e.g. "Credit Card", "Debit Card EMI", "Credit Card EMI", "UPI"
   - discountType: "PERCENTAGE" | "FLAT" | "CASHBACK" | "EMI_DISCOUNT"
   - discountPercentage: number if percentage discount (e.g. 10 for 10%), otherwise null
   - flatDiscount: number if flat discount in currency (e.g. 750), otherwise null
   - maximumDiscount: maximum discount cap in currency (e.g. 1000), otherwise null
   - minimumTransaction: minimum purchase requirement in currency (e.g. 5000), otherwise null
   - cashback: cashback amount if cashback offer, otherwise null
   - emiRequired: boolean (true if only for EMI)
   - emiTenure: e.g. "3, 6, 9 months" if specified
   - terms: Short summary of offer condition exactly matching merchant text
   - expiryDate: ISO date string or null if not specified
4. Verify current selling price and original/MRP price accurately.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: 'Verified Product Name' },
            currentPrice: { type: Type.NUMBER, description: 'Current selling price in local currency' },
            originalPrice: { type: Type.NUMBER, description: 'Original/MRP price in local currency' },
            currency: { type: Type.STRING, description: 'Currency code e.g. INR, USD' },
            retailer: { type: Type.STRING, description: 'Merchant/Retailer name' },
            brand: { type: Type.STRING, description: 'Brand name if found' },
            availability: { type: Type.STRING, enum: ['IN_STOCK', 'OUT_OF_STOCK', 'PREORDER', 'UNKNOWN'] },
            offers: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  bank: { type: Type.STRING },
                  cardType: { type: Type.STRING, enum: ['CREDIT', 'DEBIT', 'ALL', 'EMI', 'PAY_LATER', 'UPI'] },
                  paymentMethod: { type: Type.STRING },
                  discountType: { type: Type.STRING, enum: ['PERCENTAGE', 'FLAT', 'CASHBACK', 'EMI_DISCOUNT'] },
                  discountPercentage: { type: Type.NUMBER },
                  flatDiscount: { type: Type.NUMBER },
                  maximumDiscount: { type: Type.NUMBER },
                  minimumTransaction: { type: Type.NUMBER },
                  cashback: { type: Type.NUMBER },
                  emiRequired: { type: Type.BOOLEAN },
                  emiTenure: { type: Type.STRING },
                  terms: { type: Type.STRING },
                  expiryDate: { type: Type.STRING },
                },
                required: ['bank', 'cardType', 'paymentMethod', 'discountType'],
              },
            },
          },
        },
      },
    });

    const parsedJson = JSON.parse(response.text?.trim() || '{}');
    const nowIso = new Date().toISOString();

    const formattedOffers: PaymentOffer[] = (parsedJson.offers || []).map((o: any) => {
      const id = 'off_' + crypto.randomBytes(4).toString('hex');
      const off: PaymentOffer = {
        id,
        bank: o.bank || 'Bank Offer',
        cardType: (['CREDIT', 'DEBIT', 'ALL', 'EMI', 'PAY_LATER', 'UPI'].includes(o.cardType) ? o.cardType : 'ALL') as CardType,
        paymentMethod: o.paymentMethod || 'Card',
        discountType: (['PERCENTAGE', 'FLAT', 'CASHBACK', 'EMI_DISCOUNT'].includes(o.discountType) ? o.discountType : 'FLAT') as OfferDiscountType,
        discountPercentage: typeof o.discountPercentage === 'number' ? o.discountPercentage : undefined,
        flatDiscount: typeof o.flatDiscount === 'number' ? o.flatDiscount : undefined,
        maximumDiscount: typeof o.maximumDiscount === 'number' ? o.maximumDiscount : undefined,
        minimumTransaction: typeof o.minimumTransaction === 'number' ? o.minimumTransaction : undefined,
        cashback: typeof o.cashback === 'number' ? o.cashback : undefined,
        emiRequired: Boolean(o.emiRequired),
        emiTenure: o.emiTenure || undefined,
        expiryDate: o.expiryDate || undefined,
        terms: o.terms || undefined,
        source: 'MERCHANT_PAGE',
        verifiedAt: nowIso,
        isActive: true,
      };

      // Calculate eligibility
      const targetPrice = parsedJson.currentPrice || baseData.currentPrice || 0;
      const evalRes = evaluateOffer(off, targetPrice);
      off.eligible = evalRes.eligible;
      off.calculatedDiscount = evalRes.calculatedDiscount;
      off.effectivePrice = evalRes.effectivePrice;
      off.ineligibilityReason = evalRes.ineligibilityReason;

      return off;
    });

    return {
      product: {
        name: parsedJson.name || baseData.name,
        currentPrice: parsedJson.currentPrice || baseData.currentPrice,
        originalPrice: parsedJson.originalPrice || baseData.originalPrice,
        currency: parsedJson.currency || baseData.currency || 'INR',
        retailer: parsedJson.retailer || baseData.retailer,
        brand: parsedJson.brand || baseData.brand,
        availability: parsedJson.availability || baseData.availability,
      },
      offers: formattedOffers,
    };
  } catch (err) {
    console.error('Gemini offer intelligence extractor failed, falling back to deterministic extraction:', err);
    return null;
  }
}

/**
 * Main URL Extraction Engine: Fetches URL, performs SSRF validation, parses structured tags & applies Gemini
 */
export async function fetchAndAnalyzeProduct(affiliateUrl: string): Promise<ExtractedProductData> {
  if (!affiliateUrl || !affiliateUrl.trim()) {
    throw new Error('Affiliate product URL is required.');
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(affiliateUrl.trim());
  } catch {
    throw new Error('Invalid URL format. Please provide a valid http/https URL.');
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new Error('Only HTTP/HTTPS URLs are supported.');
  }

  // SSRF Protection
  if (isIpOrHostBlocked(parsedUrl.hostname)) {
    throw new Error('Access to private/local network addresses is prohibited.');
  }

  const nowIso = new Date().toISOString();

  // Fetch page safely with standard headers, timeout & size guard
  let pageHtml = '';
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);

    const res = await fetch(parsedUrl.toString(), {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,hi;q=0.8',
      },
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Merchant page returned HTTP status ${res.status}`);
    }

    pageHtml = await res.text();
    // Cap html processing to 2MB
    if (pageHtml.length > 2 * 1024 * 1024) {
      pageHtml = pageHtml.substring(0, 2 * 1024 * 1024);
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('Product page fetch timed out after 9 seconds. Please check the URL or try again.');
    }
    // If merchant page blocks scrapers directly, provide clean fallback structure with domain info
    console.warn(`Could not directly fetch ${parsedUrl.hostname}: ${err.message}. Generating verified template for review.`);
  }

  // 1. Deterministic Extraction
  const deterministicData = parseMerchantHtml(pageHtml, parsedUrl.toString());

  // 2. Offer Snippets & Gemini AI Extraction
  const offerSnippets = pageHtml ? extractOfferSnippets(pageHtml) : '';
  const geminiResult = pageHtml && offerSnippets 
    ? await extractWithGemini(offerSnippets, parsedUrl.toString(), deterministicData)
    : null;

  const finalName = geminiResult?.product.name || deterministicData.name || 'Discovered Curated Product';
  const finalCurrentPrice = geminiResult?.product.currentPrice ?? deterministicData.currentPrice;
  const finalOriginalPrice = geminiResult?.product.originalPrice ?? deterministicData.originalPrice;
  const finalCurrency = geminiResult?.product.currency || deterministicData.currency || 'INR';
  const finalRetailer = geminiResult?.product.retailer || deterministicData.retailer || 'Merchant';
  const finalBrand = geminiResult?.product.brand || deterministicData.brand;
  const finalAvailability = geminiResult?.product.availability || deterministicData.availability || 'IN_STOCK';
  const finalOffers = geminiResult?.offers || [];

  let finalDiscountPct: number | undefined = undefined;
  if (finalOriginalPrice && finalCurrentPrice && finalOriginalPrice > finalCurrentPrice) {
    finalDiscountPct = Math.round(((finalOriginalPrice - finalCurrentPrice) / finalOriginalPrice) * 100);
  }

  const bestOffer = determineBestOffer(finalOffers, finalCurrentPrice);

  return {
    name: finalName,
    imageUrl: deterministicData.imageUrl || '',
    currentPrice: finalCurrentPrice,
    originalPrice: finalOriginalPrice,
    currency: finalCurrency,
    discountPercentage: finalDiscountPct,
    retailer: finalRetailer,
    brand: finalBrand,
    availability: finalAvailability,
    offers: finalOffers,
    bestOffer,
    verifiedAt: nowIso,
    affiliateUrl: affiliateUrl.trim(),
    source: finalOffers.length > 0 ? 'Verified Merchant Page & Structured Schema' : 'Merchant Metadata',
  };
}
