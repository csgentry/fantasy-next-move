import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const betaRequiredPrefixes = [
  "/connect",
  "/leagues",
  "/trade-lab",
  "/record-book",
  "/api/account",
  "/api/sleeper",
  "/api/yahoo"
];

const authenticationOnlyPrefixes = ["/account"];

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

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const betaRequired = matchesPrefix(pathname, betaRequiredPrefixes);
  const authenticationOnly = matchesPrefix(pathname, authenticationOnlyPrefixes);
  const protectedRoute = betaRequired || authenticationOnly;
  const jsonApi = isJsonApi(pathname);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    if (!protectedRoute) return NextResponse.next({ request });
    if (jsonApi) return NextResponse.json({ error: "Beta login is not configured yet." }, { status: 503 });
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.searchParams.set("error", "Beta login is not configured yet.");
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

  if (betaRequired && user) {
    const { data: profile } = await supabase.from("profiles").select("beta_access").eq("id", user.id).maybeSingle();
    if (!profile?.beta_access) {
      if (jsonApi) return applySession(NextResponse.json({ error: "Private beta access is required." }, { status: 403 }), response);
      const pending = request.nextUrl.clone();
      pending.pathname = "/pending";
      pending.search = "";
      return applySession(NextResponse.redirect(pending), response);
    }
  }

  return response;
}
