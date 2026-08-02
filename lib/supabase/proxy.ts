import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const tradeLabPrefixes = [
  "/connect",
  "/leagues",
  "/trade-lab",
  "/api/account",
  "/api/market",
  "/api/sleeper",
  "/api/yahoo"
];

const allAccessPrefixes = [
  "/dashboard",
  "/record-book",
  "/api/account/history",
  "/api/sleeper/history",
  "/api/sleeper/power-data",
  "/api/yahoo/history"
];
const authenticationOnlyPrefixes = ["/account", "/billing/success", "/api/billing"];
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
    const [{ data: profile }, { data: entitlement }] = await Promise.all([
      supabase.from("profiles").select("beta_access").eq("id", user.id).maybeSingle(),
      supabase.from("entitlements")
        .select("access_level,trade_lab_access,all_access,valid_until")
        .eq("user_id", user.id)
        .maybeSingle()
    ]);
    const unexpired = !entitlement?.valid_until || new Date(entitlement.valid_until).getTime() > Date.now();
    const beta = Boolean(profile?.beta_access);
    const tradeAccess = beta || (unexpired && Boolean(entitlement?.trade_lab_access || entitlement?.all_access || entitlement?.access_level === "admin"));
    const allAccess = beta || (unexpired && Boolean(entitlement?.all_access || entitlement?.access_level === "admin"));
    if (allAccessRequired && !allAccess) return deniedResponse(request, response, "All Access is required for this feature.");
    if (tradeLabRequired && !tradeAccess) return deniedResponse(request, response, "A Trade Lab or All Access subscription is required to connect real leagues.");
  }

  return response;
}
