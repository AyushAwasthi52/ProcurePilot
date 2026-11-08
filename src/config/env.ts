import { z } from "zod";

const EnvSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    APP_URL: z.string().url().default("http://localhost:3000"),
    AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required"),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    DIRECT_URL: z.string().optional(),

    // AI Provider Configuration
    AI_PROVIDER: z.enum(["mock", "gemini", "openai"]).default("mock"),
    AI_API_KEY: z.string().optional(),
    AI_MODEL: z.string().default("gemini-1.5-flash"),
    AI_MAX_COST_PER_REQUEST_USD: z.coerce.number().positive().default(0.25),

    // Product Discovery Providers
    PRODUCT_PROVIDER: z
      .enum(["all", "seeded", "provider_a", "provider_b"])
      .default("all"),
    PRODUCT_PROVIDER_API_KEY: z.string().optional(),
    PROVIDER_TIMEOUT_MS: z.coerce.number().int().positive().default(6000),
    OFFER_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(900),

    // Purchase Plan
    PLAN_TTL_SECONDS: z.coerce.number().int().positive().default(600),

    // PayPal & Payments
    PAYPAL_ENV: z.enum(["sandbox", "production"]).default("sandbox"),
    PAYPAL_CLIENT_ID: z.string().optional(),
    PAYPAL_CLIENT_SECRET: z.string().optional(),
    PAYPAL_WEBHOOK_ID: z.string().optional(),
    PAYPAL_BASE_URL: z.string().url().default("https://api-m.sandbox.paypal.com"),
    PAYMENTS_SIMULATED: z
      .string()
      .default("false")
      .transform((val) => val === "true"),

    // Observability
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
    ERROR_TRACKING_DSN: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // 1. In production, AUTH_SECRET must be at least 32 characters
    if (data.NODE_ENV === "production" && data.AUTH_SECRET.length < 32) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["AUTH_SECRET"],
        message:
          "AUTH_SECRET must be at least 32 characters long in production environments",
      });
    }

    // 2. If AI_PROVIDER is not mock, AI_API_KEY is required
    if (data.AI_PROVIDER !== "mock" && (!data.AI_API_KEY || data.AI_API_KEY.trim() === "")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["AI_API_KEY"],
        message: `AI_API_KEY is required when AI_PROVIDER is set to '${data.AI_PROVIDER}'`,
      });
    }

    // 3. If PAYMENTS_SIMULATED is false, PayPal credentials are required
    if (!data.PAYMENTS_SIMULATED && data.NODE_ENV !== "test") {
      if (!data.PAYPAL_CLIENT_ID || data.PAYPAL_CLIENT_ID.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["PAYPAL_CLIENT_ID"],
          message:
            "PAYPAL_CLIENT_ID is required when PAYMENTS_SIMULATED is false. Set PAYMENTS_SIMULATED=true for local simulation.",
        });
      }
      if (!data.PAYPAL_CLIENT_SECRET || data.PAYPAL_CLIENT_SECRET.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["PAYPAL_CLIENT_SECRET"],
          message:
            "PAYPAL_CLIENT_SECRET is required when PAYMENTS_SIMULATED is false. Set PAYMENTS_SIMULATED=true for local simulation.",
        });
      }
    }
  });

export type ValidatedEnv = z.infer<typeof EnvSchema>;

let parsedEnv: ValidatedEnv | null = null;

export function validateEnv(rawEnv: Record<string, string | undefined> = process.env): ValidatedEnv {
  const result = EnvSchema.safeParse(rawEnv);
  if (!result.success) {
    const errorDetails = result.error.issues
      .map((issue) => ` - [${issue.path.join(".")}]: ${issue.message}`)
      .join("\n");
    throw new Error(
      `[CRITICAL] Invalid environment configuration:\n${errorDetails}\nCheck your .env file against .env.example.`
    );
  }
  return {
    ...result.data,
    DIRECT_URL: result.data.DIRECT_URL || result.data.DATABASE_URL,
  };
}

export function getEnv(): ValidatedEnv {
  if (!parsedEnv) {
    parsedEnv = validateEnv(process.env);
  }
  return parsedEnv;
}

export function resetParsedEnvForTesting(): void {
  parsedEnv = null;
}

