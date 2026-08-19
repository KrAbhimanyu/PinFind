/**
 * PinFind Currency & Formatting Utilities
 * Standardizes price displays across cards, modals, feeds, lookbooks, and analytics
 * Default currency is Indian Rupee (₹ / INR)
 */

export function getCurrencySymbol(currency?: string): string {
  if (!currency) return '₹';
  const clean = currency.trim().toUpperCase();
  switch (clean) {
    case 'INR':
    case '₹':
    case 'RS':
    case 'RS.':
      return '₹';
    case 'USD':
    case '$':
      return '$';
    case 'EUR':
    case '€':
      return '€';
    case 'GBP':
    case '£':
      return '£';
    case 'JPY':
    case 'CNY':
    case '¥':
      return '¥';
    case 'CAD':
      return 'CA$';
    case 'AUD':
      return 'AU$';
    case 'SGD':
      return 'SG$';
    case 'CHF':
      return 'CHF ';
    default:
      if (/^[^a-zA-Z0-9]+$/.test(currency)) return currency;
      return '₹';
  }
}

export function formatPrice(price?: number | string | null, currency?: string): string {
  if (price === undefined || price === null || price === '') return '';
  const num = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(num)) return '';
  const symbol = getCurrencySymbol(currency || 'INR');
  
  // Use Indian number formatting (lakhs/thousands formatting e.g. 12,999)
  const formattedNum = Number.isInteger(num)
    ? num.toLocaleString('en-IN')
    : num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return `${symbol}${formattedNum}`;
}

export function formatRupees(amount: number): string {
  return formatPrice(amount, 'INR');
}
