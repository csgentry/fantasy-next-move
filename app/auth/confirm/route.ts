import { safeNextPath, siteOrigin } from "../../../lib/site-origin";
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const origin = siteOrigin(request.nextUrl.origin);
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  const code = request.nextUrl.searchParams.get("code");
  const requestedNext = request.nextUrl.searchParams.get("next");
  const next = safeNextPath(requestedNext, type === "recovery" ? "/update-password" : "/dashboard");
  if (!code && !(tokenHash && type)) {
    return NextResponse.redirect(new URL("/login?error=The confirmation link is incomplete.", origin));
  }
  try {
    const supabase = await createClient();

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(new URL(next, origin));
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(type === "recovery" ? "This reset link is invalid or expired. Request a new password-reset email." : "This confirmation link is invalid or expired. Request a new confirmation email.")}`, origin));
    }

    if (tokenHash && type) {
      const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
      if (!error) return NextResponse.redirect(new URL(next, origin));
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(type === "recovery" ? "This reset link is invalid or expired. Request a new password-reset email." : "This confirmation link is invalid or expired. Request a new confirmation email.")}`, origin));
    }

  } catch {
    return NextResponse.redirect(new URL("/login?error=Unable to complete confirmation. Please try again.", origin));
  }
  return NextResponse.redirect(new URL("/login?error=The confirmation link is incomplete.", origin));
}
