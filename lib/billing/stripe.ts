import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

const STRIPE_API = "https://api.stripe.com/v1";

type StripePrimitive = string | number | boolean | null | undefined;
type StripeValue = StripePrimitive | StripeValue[] | { [key: string]: StripeValue };
type StripeParams = { [key: string]: StripeValue };

function appendParams(target: URLSearchParams, value: unknown, prefix = "") {
  if (value === null || value === undefined) return;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => appendParams(target, entry, `${prefix}[${index}]`));
    return;
  }
  if (typeof value === "object") {
    Object.entries(value as Record<string, unknown>).forEach(([key, entry]) => {
      appendParams(target, entry, prefix ? `${prefix}[${key}]` : key);
    });
    return;
  }
  target.append(prefix, String(value));
}

export async function stripeRequest<T>(
  path: string,
  options: { method?: "GET" | "POST" | "DELETE"; params?: StripeParams } = {}
): Promise<T> {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) throw new Error("Stripe is not configured.");
  const method = options.method || "GET";
  const params = new URLSearchParams();
  appendParams(params, options.params || {});
  const encoded = params.toString();
  const query = method === "GET" && encoded ? `?${encoded}` : "";
  const response = await fetch(`${STRIPE_API}${path}${query}`, {
    method,
    headers: {
      Authorization: `Bearer ${secret}`,
      ...(method === "GET" ? {} : { "Content-Type": "application/x-www-form-urlencoded" })
    },
    body: method === "GET" ? undefined : encoded,
    cache: "no-store"
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error?.message || payload?.message || `Stripe request failed (${response.status}).`;
    throw new Error(message);
  }
  return payload as T;
}

export function verifyStripeWebhook(payload: string, signatureHeader: string | null) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("Stripe webhook secret is not configured.");
  if (!signatureHeader) throw new Error("Missing Stripe-Signature header.");
  const fields = signatureHeader.split(",").map((part) => part.trim());
  const timestamp = fields.find((field) => field.startsWith("t="))?.slice(2);
  const signatures = fields.filter((field) => field.startsWith("v1=")).map((field) => field.slice(3));
  if (!timestamp || !signatures.length) throw new Error("Invalid Stripe signature header.");
  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) throw new Error("Stripe signature timestamp is outside the five-minute tolerance.");
  const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`, "utf8").digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  const valid = signatures.some((signature) => {
    try {
      const actual = Buffer.from(signature, "hex");
      return actual.length === expectedBuffer.length && timingSafeEqual(actual, expectedBuffer);
    } catch {
      return false;
    }
  });
  if (!valid) throw new Error("Stripe webhook signature verification failed.");
}
