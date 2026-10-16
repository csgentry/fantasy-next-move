import { createClient } from "@/lib/supabase/server";
import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { yahooConnectionEnabled } from "@/lib/yahoo/availability";
import { callbackUrl, setYahooState, yahooConfig } from "@/lib/yahoo/auth";

export async function GET(request: NextRequest) {
  if (!yahooConnectionEnabled()) {
    return NextResponse.redirect(
      new URL("/connect?provider=yahoo-coming-soon", request.nextUrl.origin)
    );
  }

  try {
    const supabase = await createClient();
    const {data} = await supabase.auth.getUser();
    if (!data.user) return NextResponse.redirect(new URL("/login?next=/connect", request.nextUrl.origin));
    const { clientId } = yahooConfig();
    const state = randomBytes(24).toString("hex");
    await setYahooState(`${data.user.id}:${state}`);
    const redirectUri = callbackUrl(request.nextUrl.origin);
    const authorizationUrl = new URL(
      "https://api.login.yahoo.com/oauth2/request_auth"
    );
    authorizationUrl.searchParams.set("client_id", clientId);
    authorizationUrl.searchParams.set("redirect_uri", redirectUri);
    authorizationUrl.searchParams.set("response_type", "code");
    authorizationUrl.searchParams.set("state", state);
    authorizationUrl.searchParams.set("language", "en-us");
    return NextResponse.redirect(authorizationUrl);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Yahoo is not configured.";
    return NextResponse.redirect(
      new URL(
        `/connect?yahoo_error=${encodeURIComponent(message)}`,
        request.nextUrl.origin
      )
    );
  }
}
