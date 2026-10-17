import {authenticatedDestination} from "../auth-destination";
import { PRODUCTION_ORIGIN } from "../site-origin";
import { getUserEntitlement, entitlementAllows } from "@/lib/billing/entitlements";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const tradeLabPrefixes = ["/trade-lab", "/api/market"];
const allAccessPrefixes = ["/api/account/history", "/api/sleeper/history", "/api/sleeper/power-data", "/api/yahoo/history", "/api/account/player-snapshots"];
const authenticationOnlyPrefixes = ["/admin", "/more", "/waivers", "/account", "/billing/success", "/api/billing", "/dashboard", "/team", "/leagues", "/connect", "/api/account", "/api/sleeper/import", "/api/sleeper/intelligence", "/api/sleeper/players", "/api/yahoo"];
const publicApiPrefixes = ["/api/stripe/webhook", "/api/cron"];
const browserNavigationApis = new Set(["/api/yahoo/connect", "/api/yahoo/callback"]);

function matchesPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isJsonApi(pathname: string) {
  return pathname.startsWith("/api/") && !browserNavigationApis.has(pathname);
}

function applySession<T extends NextResponse>(target: T, sessionResponse: NextResponse) {
  sessionResponse.cookies.getAll().forEach(({ name, value, ...options }) => target.cookies.set(name, value, options));
  for (const header of ["cache-control", "expires", "pragma"]) {
    const value = sessionResponse.headers.get(header);
    if (value) target.headers.set(header, value);
  }
  return target;
}

function deniedResponse(request: NextRequest, response: NextResponse, message: string) {
  if (isJsonApi(request.nextUrl.pathname)) {
    return applySession(NextResponse.json({ error: message, upgradeRequired: true }, { status: 402 }), response);
  }
  const pricing = request.nextUrl.clone();
  pricing.pathname = "/pricing";
  pricing.search = "";
  pricing.searchParams.set("message", message);
  return applySession(NextResponse.redirect(pricing), response);
}

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (process.env.VERCEL_ENV === "production" && request.nextUrl.hostname.endsWith(".vercel.app")) {
    return NextResponse.redirect(new URL(request.nextUrl.pathname + request.nextUrl.search, PRODUCTION_ORIGIN), 308);
  }
  if (process.env.VERCEL_ENV === "production" && matchesPrefix(pathname, ["/demo"])) {
    return NextResponse.redirect(new URL("/connect", request.url));
  }
  // Production billing is a separate release milestone. This gate also blocks
  // configured test keys and webhook/reconciliation writes on the public host.
  if (process.env.VERCEL_ENV === "production" && matchesPrefix(pathname, ["/api/billing", "/api/stripe/webhook", "/api/cron/billing-reconcile"])) {
    return NextResponse.json({ error: "Subscriptions are not available yet. No payment has been taken." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method) && !matchesPrefix(pathname, publicApiPrefixes)) {
    const origin = request.headers.get("origin");
    if (!origin || origin !== request.nextUrl.origin) return NextResponse.json({error: "Request origin could not be verified."}, {status: 403});
  }
  if (matchesPrefix(pathname, publicApiPrefixes)) return NextResponse.next({ request });

  const tradeLabRequired = matchesPrefix(pathname, tradeLabPrefixes);
  const allAccessRequired = matchesPrefix(pathname, allAccessPrefixes);
  const authenticationOnly = matchesPrefix(pathname, authenticationOnlyPrefixes);
  const protectedRoute = tradeLabRequired || allAccessRequired || authenticationOnly;
  const jsonApi = isJsonApi(pathname);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    if (!protectedRoute) return NextResponse.next({ request });
    if (jsonApi) return NextResponse.json({ error: "Login is not configured yet." }, { status: 503 });
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.searchParams.set("error", "Login is not configured yet.");
    return NextResponse.redirect(login);
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers || {}).forEach(([name, value]) => response.headers.set(name, value));
      }
    }
  });

  const { data: { user } } = await supabase.auth.getUser();

  if(pathname==="/login"&&user&&request.method==="GET") {
    const next=await authenticatedDestination(supabase,user.id,request.nextUrl.searchParams.get("next"));
    return applySession(NextResponse.redirect(new URL(next,request.url)),response);
  }

  if (protectedRoute && !user) {
    if (jsonApi) return applySession(NextResponse.json({ error: "Sign in required." }, { status: 401 }), response);
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = "";
    login.searchParams.set("next", pathname === "/api/yahoo/callback" ? "/connect" : pathname + request.nextUrl.search);
    return applySession(NextResponse.redirect(login), response);
  }

  if ((tradeLabRequired || allAccessRequired) && user) {
    const entitlement = await getUserEntitlement(supabase, user.id);
    const tradeAccess = entitlementAllows(entitlement, "trade_lab");
    const allAccess = entitlementAllows(entitlement, "all_access");
    if (allAccessRequired && !allAccess) return deniedResponse(request, response, "Pro is required for this detail.");
    if (tradeLabRequired && !tradeAccess) return deniedResponse(request, response, "Pro access is required for full Trade Lab. Paid subscriptions are not available yet.");
  }

  return response;
}
