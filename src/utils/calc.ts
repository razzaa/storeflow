export function calcProfit(sellingPrice: number, costPrice: number): number {
  return parseFloat((sellingPrice - costPrice).toFixed(2));
}

export function calcMargin(sellingPrice: number, costPrice: number): number {
  if (costPrice === 0) return 0;
  return parseFloat((((sellingPrice - costPrice) / costPrice) * 100).toFixed(2));
}

export function calcTotal(
  subtotal: number,
  discount: number,
  tax: number
): number {
  const afterDiscount = subtotal - discount;
  const taxAmount = afterDiscount * (tax / 100);
  return parseFloat((afterDiscount + taxAmount).toFixed(2));
}

export function formatCurrency(amount: number, currency = 'PKR'): string {
  return `${currency} ${amount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

export function applyBulkPriceUpdate(
  currentPrice: number,
  operation: 'percent_increase' | 'flat_increase' | 'percent_discount' | 'flat_discount',
  value: number
): number {
  switch (operation) {
    case 'percent_increase':
      return parseFloat((currentPrice * (1 + value / 100)).toFixed(2));
    case 'flat_increase':
      return parseFloat((currentPrice + value).toFixed(2));
    case 'percent_discount':
      return parseFloat((currentPrice * (1 - value / 100)).toFixed(2));
    case 'flat_discount':
      return parseFloat((currentPrice - value).toFixed(2));
    default:
      return currentPrice;
  }
}
