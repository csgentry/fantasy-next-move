import "server-only";
export function yahooConnectionEnabled() {
  return process.env.VERCEL_ENV === "preview" && process.env.ENABLE_YAHOO_CONNECT === "true" && process.env.YAHOO_CONTRACT_REVIEWED === "true" && process.env.YAHOO_PREVIEW_APPROVED === "true";
}
