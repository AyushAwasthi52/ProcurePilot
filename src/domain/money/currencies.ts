/**
 * ISO 4217 Currency table defining minor unit decimal exponents.
 */
export const CURRENCY_EXPONENTS: Record<string, number> = {
  // 0 decimals
  BIF: 0,
  CLP: 0,
  DJF: 0,
  GNF: 0,
  ISK: 0,
  JPY: 0,
  KMF: 0,
  KRW: 0,
  PYG: 0,
  RWF: 0,
  UGX: 0,
  VND: 0,
  VUV: 0,
  XAF: 0,
  XOF: 0,
  XPF: 0,

  // 3 decimals
  BHD: 3,
  IQD: 3,
  JOD: 3,
  KWD: 3,
  LYD: 3,
  OMR: 3,
  TND: 3,

  // Default is 2 for USD, EUR, GBP, CAD, AUD, INR, etc.
};

export function getCurrencyExponent(currencyCode: string): number {
  const code = currencyCode.toUpperCase();
  return CURRENCY_EXPONENTS[code] ?? 2;
}

