import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  CORS_ALLOWED_ORIGINS: z
    .string()
    .default("http://localhost:3000")
    .transform((value) =>
      value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean)
    ),

  OPEN_FOOD_FACTS_API_URL: z.string().url().default("https://world.openfoodfacts.org"),
  OPEN_FOOD_FACTS_TIMEOUT_MS: z.coerce.number().int().positive().default(8000),
  OPEN_FOOD_FACTS_USER_AGENT: z
    .string()
    .default("FoodProductSearch/1.0 (technical-test)"),

  STRIPE_SECRET_KEY: z
    .string()
    .min(1, "STRIPE_SECRET_KEY is required")
    .startsWith("sk_", 'must start with "sk_" (find it under Developers > API keys)'),
  STRIPE_WEBHOOK_SECRET: z
    .string()
    .min(1, "STRIPE_WEBHOOK_SECRET is required")
    .startsWith("whsec_", 'must start with "whsec_" (printed by `stripe listen`)')
    .refine(
      (value) => value !== "whsec_your_webhook_secret",
      "is still the placeholder from .env.example"
    ),
  STRIPE_PRICE_ID: z
    .string()
    .min(1, "STRIPE_PRICE_ID is required")
    .startsWith(
      "price_",
      'must start with "price_" (a recurring price ID from Stripe > Products, not a key or webhook secret)'
    ),

  CHECKOUT_SUCCESS_URL: z.string().url().default("http://localhost:3000/en?checkout=success"),
  CHECKOUT_CANCEL_URL: z.string().url().default("http://localhost:3000/en?checkout=cancelled"),

  DEMO_USER_EMAIL: z.string().email().default("demo@example.com"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");

  throw new Error(`Invalid environment configuration:\n${issues}`);
}

export const env = parsed.data;

export type Env = typeof env;
