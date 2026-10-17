import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { yahooConnectionEnabled } from "@/lib/yahoo/availability";
import {
  callbackUrl,
  consumeYahooState,
  exchangeYahooCode
} from "@/lib/yahoo/auth";

export async function GET(request: NextRequest) {
  if (!yahooConnectionEnabled()) {
    return NextResponse.redirect(
      new URL("/connect?provider=yahoo-coming-soon", request.nextUrl.origin)
    );
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");
  const expectedState = await consumeYahooState();

  if (error) {
    return NextResponse.redirect(
      new URL(
        `/connect?yahoo_error=${encodeURIComponent("Yahoo authorization was not completed.")}`,
        request.nextUrl.origin
      )
    );
  }

  if (!code || !state || !expectedState || !expectedState.endsWith(`:${state}`)) {
    return NextResponse.redirect(
      new URL(
        "/connect?yahoo_error=Yahoo%20authorization%20could%20not%20be%20verified.",
        request.nextUrl.origin
      )
    );
  }

  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      return NextResponse.redirect(
        new URL("/login?next=/connect", request.nextUrl.origin)
      );
    }

    if (expectedState !== `${data.user.id}:${state}`) return NextResponse.redirect(new URL("/connect?yahoo_error=Account%20changed.%20Reconnect%20Yahoo.", request.nextUrl.origin));

    await exchangeYahooCode(
      code,
      callbackUrl(request.nextUrl.origin),
      data.user.id
    );
    return NextResponse.redirect(
      new URL("/connect?yahoo=connected", request.nextUrl.origin)
    );
  } catch {
    return NextResponse.redirect(new URL("/connect?yahoo_error=Yahoo%20authorization%20failed.%20Try%20again.", request.nextUrl.origin));
  }
}
