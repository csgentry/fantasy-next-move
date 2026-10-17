import { getUserEntitlement, entitlementAllows } from "@/lib/billing/entitlements";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const tradeLabPrefixes = ["/trade-lab", "/api/market"];
const allAccessPrefixes = ["/api/account/history", "/api/sleeper/history", "/api/sleeper/power-data", "/api/yahoo/history", "/api/account/player-snapshots"];
const authenticationOnlyPrefixes = ["/more", "/waivers", "/account", "/billing/success", "/api/billing", "/dashboard", "/team", "/leagues", "/connect", "/api/account", "/api/sleeper/import", "/api/sleeper/intelligence", "/api/sleeper/players", "/api/yahoo"];
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

  if (protectedRoute && !user) {
    if (jsonApi) return applySession(NextResponse.json({ error: "Sign in required." }, { status: 401 }), response);
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.searchParams.set("next", pathname === "/api/yahoo/callback" ? "/connect" : pathname);
    return applySession(NextResponse.redirect(login), response);
  }

  if ((tradeLabRequired || allAccessRequired) && user) {
    const entitlement = await getUserEntitlement(supabase, user.id);
    const tradeAccess = entitlementAllows(entitlement, "trade_lab");
    const allAccess = entitlementAllows(entitlement, "all_access");
    if (allAccessRequired && !allAccess) return deniedResponse(request, response, "Pro is required for this detail.");
    if (tradeLabRequired && !tradeAccess) return deniedResponse(request, response, "Pro is required for full Trade Lab. Explore the free sample or upgrade.");
  }

  return response;
}
