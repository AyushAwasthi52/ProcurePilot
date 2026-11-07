import { describe, it, expect } from "vitest";
import { MoneyUtil, CurrencyMismatchError } from "@/src/domain/money/money";

describe("Money Domain Utility", () => {
  it("creates valid money with integer minor units", () => {
    const m = MoneyUtil.create(164900, "USD");
    expect(m.amountMinor).toBe(164900);
    expect(m.currency).toBe("USD");
  });

  it("throws error if amountMinor is not an integer", () => {
    expect(() => MoneyUtil.create(1649.5, "USD")).toThrow(
      "amountMinor must be an integer"
    );
  });

  it("throws error for invalid currency code length", () => {
    expect(() => MoneyUtil.create(100, "US")).toThrow("3-letter ISO 4217 code");
  });

  it("adds money in same currency without floating point drift", () => {
    const a = MoneyUtil.create(10, "USD"); // $0.10
    const b = MoneyUtil.create(20, "USD"); // $0.20
    const sum = MoneyUtil.add(a, b);
    expect(sum.amountMinor).toBe(30); // Exactly $0.30, no 0.30000000000000004
  });

  it("rejects operations across different currencies without FX", () => {
    const usd = MoneyUtil.create(100, "USD");
    const eur = MoneyUtil.create(100, "EUR");
    expect(() => MoneyUtil.add(usd, eur)).toThrow(CurrencyMismatchError);
    expect(() => MoneyUtil.subtract(usd, eur)).toThrow(CurrencyMismatchError);
    expect(() => MoneyUtil.compare(usd, eur)).toThrow(CurrencyMismatchError);
  });

  it("multiplies money by quantity factor with deterministic rounding", () => {
    const unitPrice = MoneyUtil.create(164900, "USD");
    const total = MoneyUtil.multiply(unitPrice, 3);
    expect(total.amountMinor).toBe(494700);
  });

  it("formats decimal string for PayPal Orders v2 correctly by ISO 4217 exponent", () => {
    // 2 decimals: USD
    const usd = MoneyUtil.create(164900, "USD");
    expect(MoneyUtil.toDecimalString(usd)).toBe("1649.00");

    // 0 decimals: JPY
    const jpy = MoneyUtil.create(1500, "JPY");
    expect(MoneyUtil.toDecimalString(jpy)).toBe("1500");

    // 3 decimals: KWD
    const kwd = MoneyUtil.create(12500, "KWD");
    expect(MoneyUtil.toDecimalString(kwd)).toBe("12.500");
  });

  it("parses decimal string into integer minor units", () => {
    const parsedUsd = MoneyUtil.fromDecimalString("1649.00", "USD");
    expect(parsedUsd.amountMinor).toBe(164900);
    expect(parsedUsd.currency).toBe("USD");

    const parsedJpy = MoneyUtil.fromDecimalString("1500", "JPY");
    expect(parsedJpy.amountMinor).toBe(1500);
    expect(parsedJpy.currency).toBe("JPY");
  });

  it("compares amounts accurately", () => {
    const a = MoneyUtil.create(1000, "USD");
    const b = MoneyUtil.create(2000, "USD");
    const c = MoneyUtil.create(1000, "USD");

    expect(MoneyUtil.isLessThan(a, b)).toBe(true);
    expect(MoneyUtil.isGreaterThan(b, a)).toBe(true);
    expect(MoneyUtil.isEqual(a, c)).toBe(true);
  });
});
