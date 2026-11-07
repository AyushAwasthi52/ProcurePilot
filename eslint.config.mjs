import tseslint from "typescript-eslint";

export default tseslint.config(
  ...tseslint.configs.recommended,
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "dist/**",
      "coverage/**",
      "*.config.mjs",
      "*.config.ts",
    ],
  },
  {
    files: ["src/domain/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/app/**",
                "@/src/ai/**",
                "@/src/payments/**",
                "@/src/providers/**",
                "@/components/**",
                "@paypal/*",
                "@paypal/checkout-server-sdk",
              ],
              message:
                "Domain layer must remain pure and cannot import from app, ai, payments, providers, or components.",
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      "app/**/*.{ts,tsx}",
      "components/**/*.{ts,tsx}",
      "src/ai/**/*.{ts,tsx}",
      "src/providers/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@paypal/*", "@paypal/checkout-server-sdk"],
              message:
                "PayPal SDK may only be imported inside src/payments/ modules.",
            },
          ],
        },
      ],
    },
  }
);
