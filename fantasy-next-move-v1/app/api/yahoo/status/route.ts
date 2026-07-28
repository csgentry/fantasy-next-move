import { NextResponse } from "next/server";
import { getValidYahooToken } from "@/lib/yahoo/auth";
import { yahooUserInfo } from "@/lib/yahoo/api";

export async function GET() {
  try {
    const token = await getValidYahooToken();
    if (!token) return NextResponse.json({ connected: false });
    const user = await yahooUserInfo(token);
    return NextResponse.json({
      connected: true,
      user: user ? {
        userId: user.sub || "yahoo-user",
        displayName: user.name || user.nickname || "Yahoo Manager",
        email: user.email || null,
        avatar: user.picture || null
      } : null
    });
  } catch (error) {
    return NextResponse.json({ connected: false, error: error instanceof Error ? error.message : "Unable to verify Yahoo." });
  }
}
