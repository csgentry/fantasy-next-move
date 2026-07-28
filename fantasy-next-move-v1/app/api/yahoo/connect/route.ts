import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { callbackUrl, setYahooState, yahooConfig } from "@/lib/yahoo/auth";

export async function GET(request: NextRequest) {
  try {
    const { clientId } = yahooConfig();
    const state = randomBytes(24).toString("hex");
    await setYahooState(state);
    const redirectUri = callbackUrl(request.nextUrl.origin);
    const authorizationUrl = new URL("https://api.login.yahoo.com/oauth2/request_auth");
    authorizationUrl.searchParams.set("client_id", clientId);
    authorizationUrl.searchParams.set("redirect_uri", redirectUri);
    authorizationUrl.searchParams.set("response_type", "code");
    authorizationUrl.searchParams.set("state", state);
    authorizationUrl.searchParams.set("language", "en-us");
    return NextResponse.redirect(authorizationUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Yahoo is not configured.";
    return NextResponse.redirect(new URL(`/connect?yahoo_error=${encodeURIComponent(message)}`, request.nextUrl.origin));
  }
}
