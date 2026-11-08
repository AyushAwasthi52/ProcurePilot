import { getCurrencyExponent } from "./currencies";

export interface Money {
  amountMinor: number;
  currency: string;
}

export class CurrencyMismatchError extends Error {
  constructor(c1: string, c2: string) {
    super(`Cannot operate on amounts in different currencies (${c1} vs ${c2}) without an explicit FX rate`);
    this.name = "CurrencyMismatchError";
  }
}

export const MoneyUtil = {
  create(amountMinor: number, currency: string): Money {
    if (!Number.isInteger(amountMinor)) {
      throw new Error(`amountMinor must be an integer, received: ${amountMinor}`);
    }
    const cleanCurrency = currency.trim().toUpperCase();
    if (cleanCurrency.length !== 3) {
      throw new Error(`currency must be a 3-letter ISO 4217 code, received: ${currency}`);
    }
    return {
      amountMinor,
      currency: cleanCurrency,
    };
  },

  add(a: Money, b: Money): Money {
    this.assertSameCurrency(a, b);
    return {
      amountMinor: a.amountMinor + b.amountMinor,
      currency: a.currency,
    };
  },

  subtract(a: Money, b: Money): Money {
    this.assertSameCurrency(a, b);
    return {
      amountMinor: a.amountMinor - b.amountMinor,
      currency: a.currency,
    };
  },

  multiply(m: Money, factor: number): Money {
    if (factor < 0) {
      throw new Error(`Multiplication factor cannot be negative: ${factor}`);
    }
    return {
      amountMinor: Math.round(m.amountMinor * factor),
      currency: m.currency,
    };
  },

  compare(a: Money, b: Money): number {
    this.assertSameCurrency(a, b);
    if (a.amountMinor < b.amountMinor) return -1;
    if (a.amountMinor > b.amountMinor) return 1;
    return 0;
  },

  isGreaterThan(a: Money, b: Money): boolean {
    return this.compare(a, b) > 0;
  },

  isLessThan(a: Money, b: Money): boolean {
    return this.compare(a, b) < 0;
  },

  isEqual(a: Money, b: Money): boolean {
    return this.compare(a, b) === 0;
  },

  /**
   * Formats for PayPal Orders v2 (e.g. "1649.00" for USD, "1500" for JPY)
   */
  toDecimalString(m: Money): string {
    const exp = getCurrencyExponent(m.currency);
    if (exp === 0) {
      return m.amountMinor.toString();
    }
    const divisor = Math.pow(10, exp);
    const intPart = Math.floor(Math.abs(m.amountMinor) / divisor);
    const fracPart = (Math.abs(m.amountMinor) % divisor).toString().padStart(exp, "0");
    const sign = m.amountMinor < 0 ? "-" : "";
    return `${sign}${intPart}.${fracPart}`;
  },

  /**
   * Parses standard decimal string (e.g. "1649.00") into Money minor units
   */
  fromDecimalString(decimalStr: string, currency: string): Money {
    const cleanCurrency = currency.trim().toUpperCase();
    const exp = getCurrencyExponent(cleanCurrency);
    const parsed = parseFloat(decimalStr);
    if (isNaN(parsed)) {
      throw new Error(`Invalid decimal string: ${decimalStr}`);
    }
    const factor = Math.pow(10, exp);
    const amountMinor = Math.round(parsed * factor);
    return {
      amountMinor,
      currency: cleanCurrency,
    };
  },

  /**
   * Human-readable display format (e.g. "$1,649.00 USD" or "¥1,500 JPY")
   */
  format(m: Money): string {
    const exp = getCurrencyExponent(m.currency);
    const decimalValue = m.amountMinor / Math.pow(10, exp);
    
    // Formatting with currency code appended
    const formatted = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: exp,
      maximumFractionDigits: exp,
    }).format(decimalValue);

    return `${formatted} ${m.currency}`;
  },

  assertSameCurrency(a: Money, b: Money): void {
    if (a.currency.toUpperCase() !== b.currency.toUpperCase()) {
      throw new CurrencyMismatchError(a.currency, b.currency);
    }
  },
};

