import "server-only";

export type BillingPlan = "trade_lab" | "all_access";
export type BillingInterval = "month" | "year";
export type AccessLevel = "none" | "trade_lab" | "all_access" | "admin";

export const PLAN_LIMITS: Record<BillingPlan, number> = {
  trade_lab: 3,
  all_access: 10
};

export const PLAN_NAMES: Record<BillingPlan, string> = {
  trade_lab: "Trade Lab",
  all_access: "All Access"
};

export function priceIdFor(plan: BillingPlan, interval: BillingInterval) {
  const key = plan === "trade_lab"
    ? interval === "month" ? "STRIPE_PRICE_TRADE_MONTHLY" : "STRIPE_PRICE_TRADE_ANNUAL"
    : interval === "month" ? "STRIPE_PRICE_ALL_ACCESS_MONTHLY" : "STRIPE_PRICE_ALL_ACCESS_ANNUAL";
  return process.env[key] || "";
}

export function foundingCouponFor(plan: BillingPlan) {
  return process.env[plan === "trade_lab" ? "STRIPE_COUPON_TRADE_FOUNDING" : "STRIPE_COUPON_ALL_ACCESS_FOUNDING"] || "";
}

export function planForPriceId(priceId: string | null | undefined): { plan: BillingPlan; interval: BillingInterval } | null {
  if (!priceId) return null;
  const candidates: Array<{ plan: BillingPlan; interval: BillingInterval; id: string }> = [
    { plan: "trade_lab", interval: "month", id: process.env.STRIPE_PRICE_TRADE_MONTHLY || "" },
    { plan: "trade_lab", interval: "year", id: process.env.STRIPE_PRICE_TRADE_ANNUAL || "" },
    { plan: "all_access", interval: "month", id: process.env.STRIPE_PRICE_ALL_ACCESS_MONTHLY || "" },
    { plan: "all_access", interval: "year", id: process.env.STRIPE_PRICE_ALL_ACCESS_ANNUAL || "" }
  ];
  const match = candidates.find((candidate) => candidate.id && candidate.id === priceId);
  return match ? { plan: match.plan, interval: match.interval } : null;
}

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function stripeConfigured() {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
    process.env.STRIPE_PRICE_TRADE_MONTHLY &&
    process.env.STRIPE_PRICE_TRADE_ANNUAL &&
    process.env.STRIPE_PRICE_ALL_ACCESS_MONTHLY &&
    process.env.STRIPE_PRICE_ALL_ACCESS_ANNUAL
  );
}
