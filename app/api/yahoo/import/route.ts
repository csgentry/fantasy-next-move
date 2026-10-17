import { NextResponse } from "next/server";
import { yahooConnectionEnabled } from "@/lib/yahoo/availability";
import { getValidYahooToken } from "@/lib/yahoo/auth";
import { discoverYahooLeagues, selectYahooLeague } from "@/lib/yahoo/api";
import { createClient } from "@/lib/supabase/server";
async function handle(request?: Request) {
  if (!yahooConnectionEnabled()) return NextResponse.json({error: "Yahoo Preview testing is not enabled."}, {status: 503});
  try {
    const supabase = await createClient();
    const {data} = await supabase.auth.getUser();
    if (!data.user) return NextResponse.json({error: "Sign in required."}, {status: 401});
    const token = await getValidYahooToken(data.user.id);
    if (!token) return NextResponse.json({error: "Reconnect Yahoo before selecting a league."}, {status: 401});
    if (!request) return NextResponse.json({leagues: await discoverYahooLeagues(token)});
    const body = await request.json();
    if (typeof body.leagueKey !== "string" || typeof body.teamKey !== "string") return NextResponse.json({error: "Choose a league and your team."}, {status: 400});
    return NextResponse.json({ownerId: data.user.id, league: await selectYahooLeague(token, body.leagueKey, body.teamKey)});
  } catch {
    return NextResponse.json({error: "Unable to load your current Yahoo team. Retry or reconnect Yahoo."}, {status: 502});
  }
}
export async function GET() { return handle(); }
export async function POST(request: Request) { return handle(request); }
