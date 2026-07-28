import { NextRequest, NextResponse } from "next/server";
import { callbackUrl, consumeYahooState, exchangeYahooCode } from "@/lib/yahoo/auth";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");
  const expectedState = await consumeYahooState();

  if (error) {
    return NextResponse.redirect(new URL(`/connect?yahoo_error=${encodeURIComponent(error)}`, request.nextUrl.origin));
  }
  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(new URL("/connect?yahoo_error=Yahoo%20authorization%20could%20not%20be%20verified.", request.nextUrl.origin));
  }

  try {
    await exchangeYahooCode(code, callbackUrl(request.nextUrl.origin));
    return NextResponse.redirect(new URL("/connect?yahoo=connected", request.nextUrl.origin));
  } catch (exchangeError) {
    const message = exchangeError instanceof Error ? exchangeError.message : "Yahoo authorization failed.";
    return NextResponse.redirect(new URL(`/connect?yahoo_error=${encodeURIComponent(message)}`, request.nextUrl.origin));
  }
}
