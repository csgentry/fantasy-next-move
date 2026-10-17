export const PRODUCTION_ORIGIN = "https://fantasynextmove.com";

export function siteOrigin(requestOrigin?: string, environment = process.env.VERCEL_ENV, configuredUrl = process.env.NEXT_PUBLIC_SITE_URL) {
  if (environment === "production") return PRODUCTION_ORIGIN;
  const candidate = requestOrigin || configuredUrl || "http://localhost:3000";
  const url = new URL(candidate);
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) throw new Error("Invalid application origin.");
  if (url.protocol === "http:" && !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) throw new Error("Application origin must use HTTPS.");
  return url.origin;
}

export function safeNextPath(value: string | null | undefined, fallback = "/dashboard") {
  if (!value?.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u0020]/.test(value)) return fallback;
  return new URL(value, PRODUCTION_ORIGIN).origin === PRODUCTION_ORIGIN ? value : fallback;
}
