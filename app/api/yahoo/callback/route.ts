import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { yahooUserInfo } from "@/lib/yahoo/api";
import { callbackUrl, consumeYahooState, exchangeYahooCode } from "@/lib/yahoo/auth";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");
  const expectedState = await consumeYahooState();

  if (error) return NextResponse.redirect(new URL(`/connect?yahoo_error=${encodeURIComponent(error)}`, request.nextUrl.origin));
  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(new URL("/connect?yahoo_error=Yahoo%20authorization%20could%20not%20be%20verified.", request.nextUrl.origin));
  }

  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return NextResponse.redirect(new URL("/login?next=/connect", request.nextUrl.origin));

    const token = await exchangeYahooCode(code, callbackUrl(request.nextUrl.origin), data.user.id);
    const info = await yahooUserInfo(token);
    const { error: accountError } = await supabase.from("connected_accounts").upsert({
      user_id: data.user.id,
      provider: "yahoo",
      provider_user_id: info?.sub || "yahoo-user",
      provider_username: info?.email || info?.nickname || info?.name || "Yahoo Manager"
    }, { onConflict: "user_id,provider,provider_user_id" });
    if (accountError) throw accountError;

    return NextResponse.redirect(new URL("/connect?yahoo=connected", request.nextUrl.origin));
  } catch (exchangeError) {
    const message = exchangeError instanceof Error ? exchangeError.message : "Yahoo authorization failed.";
    return NextResponse.redirect(new URL(`/connect?yahoo_error=${encodeURIComponent(message)}`, request.nextUrl.origin));
  }
}
