import "server-only";

export function yahooConnectionEnabled() {
  return process.env.ENABLE_YAHOO_CONNECT === "true";
}
