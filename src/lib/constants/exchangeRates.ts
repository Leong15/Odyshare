export const EXCHANGE_RATES: Record<string, number> = {
  TWD: 32.0,
  JPY: 155.0,
  HKD: 7.8,
  EUR: 0.92,
  USD: 1.0,
};

export function convertToUSD(amount: number, currency: string): number {
  const cur = (currency || "USD").toUpperCase();
  const rate = EXCHANGE_RATES[cur];
  if (rate) {
    return amount / rate;
  }
  return amount;
}
