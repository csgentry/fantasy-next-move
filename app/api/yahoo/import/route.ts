import { NextResponse } from "next/server";
import { yahooConnectionEnabled } from "@/lib/yahoo/availability";
import { getValidYahooToken } from "@/lib/yahoo/auth";
import { discoverYahooLeagues, selectYahooLeague, YahooApiError } from "@/lib/yahoo/api";
import { createClient } from "@/lib/supabase/server";
async function handle(request?: Request) {
  try {
    const supabase = await createClient();
    const {data} = await supabase.auth.getUser();
    if (!data.user) return NextResponse.json({error: "Sign in required."}, {status: 401});
    if (!yahooConnectionEnabled(data.user.id)) return NextResponse.json({error: "Yahoo connection is not available for this account yet."}, {status: 503});
    const token = await getValidYahooToken(data.user.id);
    if (!token) return NextResponse.json({error: "Reconnect Yahoo before selecting a league."}, {status: 401});
    if (!request) {
      const warnings: string[] = [];
      const leagues = await discoverYahooLeagues(token, message => warnings.push(message));
      return NextResponse.json({leagues, warnings});
    }
    let body;
    try { body = await request.json(); } catch { return NextResponse.json({error: "Choose a valid league and team."}, {status: 400}); }
    if (!body || typeof body !== "object") return NextResponse.json({error: "Choose a valid league and team."}, {status: 400});
    if (typeof body.leagueKey !== "string" || typeof body.teamKey !== "string") return NextResponse.json({error: "Choose a league and your team."}, {status: 400});
    return NextResponse.json({ownerId: data.user.id, league: await selectYahooLeague(token, body.leagueKey, body.teamKey)});
  } catch (error) {
    if (error instanceof YahooApiError) return NextResponse.json({error: error.message, providerStatus: error.status, providerCode: error.providerCode}, {status: [401, 403, 429].includes(error.status) ? error.status : 502});
    return NextResponse.json({error: "Unable to load your current Yahoo team. Retry or reconnect Yahoo."}, {status: 502});
  }
}
export async function GET() { return handle(); }
export async function POST(request: Request) { return handle(request); }
