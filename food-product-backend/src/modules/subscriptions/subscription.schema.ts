import { z } from "zod";

export const createCheckoutBodySchema = z
  .object({
    returnPath: z
      .string()
      .trim()
      .max(512)
      .regex(
        /^\/(?!\/)[\w\-./?=&%]*$/,
        "returnPath must be a site-relative path such as /en/products/123"
      )
      .optional(),
  })
  .default({});

export type CreateCheckoutBody = z.infer<typeof createCheckoutBodySchema>;
