import "server-only";
export function yahooConnectionEnabled(userId?: string) {
  if (process.env.ENABLE_YAHOO_CONNECT !== "true" || process.env.YAHOO_CONTRACT_REVIEWED !== "true") return false;
  if (process.env.VERCEL_ENV === "preview") return process.env.YAHOO_PREVIEW_APPROVED === "true";
  if (process.env.VERCEL_ENV !== "production" || process.env.YAHOO_PRODUCTION_APPROVED !== "true") return false;
  if (process.env.YAHOO_LIVE_VERIFIED === "true") return true;
  // Owner-approved acceptance accounts only until the real lifecycle is verified.
  const testers = (process.env.YAHOO_PRODUCTION_TEST_USERS || "").split(",").map(id => id.trim()).filter(Boolean);
  return Boolean(userId && testers.includes(userId));
}
