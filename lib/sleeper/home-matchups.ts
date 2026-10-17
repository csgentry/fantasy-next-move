import type { ImportedLeague, LeagueTeam } from '../types';
import { sleeperAvatarUrl } from '../sleeper-avatar';

export type HomeMatchup = {
  league: ImportedLeague; rosterId: number | null; week: number | null;
  status: 'Upcoming' | 'Live' | 'Final' | null;
  leagueAvatarUrl?: string | null;
  own: LeagueTeam | null; opponent: LeagueTeam | null;
  score: number | null; opponentScore: number | null;
  projection: number | null; opponentProjection: number | null;
  forecastInputs?: { games: {home:string;away:string;status:string}[]; teams: {rosterId:number;starters:string[];points:(number|null)[]}[] };
  record: string | null; syncedAt: string | null; note: string | null;
};
type State = { season: string; season_type: string; week?: number; leg?: number };
type Meta = { season: string; status: string; name: string; avatar?: string | null; settings?: { leg?: number; last_scored_leg?: number; start_week?: number; playoff_week_start?: number; playoff_round_type?: number } };
type Match = { roster_id: number; matchup_id: number | null; points?: number | null; custom_points?: number | null; starters?: string[]; starters_points?: (number|null)[] };
type Game = { week: number; status: string; home?: string; away?: string };
type Roster = { roster_id: number; owner_id: string | null; players?: string[]; starters?: string[]; reserve?: string[]; taxi?: string[]; settings?: { fpts?: number; fpts_decimal?: number; fpts_against?: number; fpts_against_decimal?: number; wins?: number; losses?: number; ties?: number } };
type User = { user_id: string; avatar?: string; display_name?: string; username?: string; metadata?: { team_name?: string; avatar?: string } };
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const positive = (v: unknown) => finite(v) && Number.isInteger(v) && v > 0 ? v : null;

export function matchupWeek(meta: Meta, state: State): number | null {
  const last = positive(meta.settings?.last_scored_leg);
  if (meta.status === 'complete' || Number(meta.season) < Number(state.season)) return last;
  if (Number(meta.season) !== Number(state.season)) return positive(meta.settings?.start_week);
  if (state.season_type !== 'regular') return last || positive(meta.settings?.start_week);
  return positive(meta.settings?.leg) || positive(state.leg) || positive(state.week);
}
export function matchupStatus(meta: Meta, week: number, games: Game[], rows: Match[]): HomeMatchup['status'] {
  if ((meta.settings?.last_scored_leg ?? 0) >= week || meta.status === 'complete') return 'Final';
  if (week < (meta.settings?.start_week ?? 1) || ['pre_draft','drafting'].includes(meta.status)) return 'Upcoming';
  const schedule = games.filter(g => g.week === week);
  if (schedule.length && schedule.every(g => g.status === 'complete')) return 'Final';
  if (schedule.some(g => ['complete','inprogress','in_progress','halftime'].includes(g.status))) return 'Live';
  if (schedule.length && schedule.every(g => ['scheduled','not_started','pre_game'].includes(g.status))) return 'Upcoming';
  if (rows.some(r => finite(r.custom_points ?? r.points) && (r.custom_points ?? r.points) !== 0)) return 'Live';
  return null;
}
export function scoreValue(row: Match | undefined): number | null {
  const value = row?.custom_points ?? row?.points;
  return finite(value) ? value : null;
}
async function provider<T>(path: string): Promise<T> {
  const response = await fetch(`https://api.sleeper.app/v1${path}`, { cache: 'no-store', signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error('Sleeper unavailable');
  return response.json();
}
export async function loadHomeMatchup(saved: ImportedLeague): Promise<HomeMatchup> {
  const empty: HomeMatchup = {league:saved,rosterId:saved.userRosterId,week:null,status:null,own:saved.teams.find(t=>t.rosterId===saved.userRosterId)||null,opponent:null,score:null,opponentScore:null,projection:null,opponentProjection:null,record:null,syncedAt:null,note:null};
  try {
    if (!/^\d{8,24}$/.test(saved.leagueId)) throw new Error('Invalid ID');
    const id = saved.leagueId;
    const [meta,state,rosters,users] = await Promise.all([
      provider<Meta>(`/league/${id}`), provider<State>('/state/nfl'),
      provider<Roster[]>(`/league/${id}/rosters`),provider<User[]>(`/league/${id}/users`)
    ]);
    if (String(meta.season) !== saved.season || !Array.isArray(rosters) || !Array.isArray(users)) throw new Error('Invalid league response');
    // Resolve the connected owner again. Never show a new owner's roster as the customer's team.
    const savedOwner = saved.teams.find(t=>t.rosterId===saved.userRosterId)?.ownerId;
    const owned = savedOwner ? rosters.find(r=>r.owner_id===savedOwner) : undefined;
    if (!owned) return {...empty,own:null,note:'Your team ownership could not be verified. Reconnect this league.'};
    const teams: LeagueTeam[] = rosters.map(r=>{
      const user=users.find(u=>u.user_id===r.owner_id);
      return {rosterId:r.roster_id,ownerId:r.owner_id,ownerName:user?.display_name||user?.username||`Roster ${r.roster_id}`,teamName:user?.metadata?.team_name||user?.display_name||`Team ${r.roster_id}`,avatarUrl:sleeperAvatarUrl(user?.metadata?.avatar)||sleeperAvatarUrl(user?.avatar),ownerAvatarUrl:sleeperAvatarUrl(user?.avatar),wins:r.settings?.wins??0,losses:r.settings?.losses??0,ties:r.settings?.ties??0,pointsFor:(r.settings?.fpts??0)+(r.settings?.fpts_decimal??0)/100,pointsAgainst:(r.settings?.fpts_against??0)+(r.settings?.fpts_against_decimal??0)/100,players:r.players||[],starters:r.starters||[],reserve:r.reserve||[],taxi:r.taxi||[]};
    });
    // Carry the verified owner and refreshed rosters through league switching as well as display.
    const league={...saved,name:meta.name||saved.name,status:meta.status,userRosterId:owned.roster_id,teams};
    const leagueAvatarUrl=sleeperAvatarUrl(meta.avatar);
    const own=teams.find(t=>t.rosterId===owned.roster_id)!;
    const record=finite(owned.settings?.wins)&&finite(owned.settings?.losses)?`${owned.settings.wins}–${owned.settings.losses}${owned.settings.ties?`–${owned.settings.ties}`:''}`:null;
    const week=matchupWeek(meta,state);
    if (!week) return {...empty,league,leagueAvatarUrl,own,rosterId:own.rosterId,note:'No current matchup period supplied by Sleeper.',syncedAt:new Date().toISOString()};
    const [rows,games] = await Promise.all([
      provider<Match[]>(`/league/${id}/matchups/${week}`),
      fetch(`https://api.sleeper.com/schedule/nfl/regular/${saved.season}`,{cache:'no-store',signal:AbortSignal.timeout(12000)}).then(r=>r.ok?r.json():[]).catch(()=>[]) as Promise<Game[]>
    ]);
    if(!Array.isArray(rows)) throw new Error('Invalid matchups');
    const mine=rows.find(r=>r.roster_id===own.rosterId);
    const rivals=mine?.matchup_id!=null?rows.filter(r=>r.matchup_id===mine.matchup_id&&r.roster_id!==own.rosterId):[];
    const rival=rivals.length===1?rivals[0]:undefined;
    const opponent=teams.find(t=>t.rosterId===rival?.roster_id)||null;
    const status=matchupStatus(meta,week,Array.isArray(games)?games:[],rows);
    const playoff=week >= (meta.settings?.playoff_week_start || Infinity);
    return {...empty,league,leagueAvatarUrl,rosterId:own.rosterId,own,opponent,record,week,status,score:scoreValue(mine),opponentScore:scoreValue(rival),forecastInputs:{games:(Array.isArray(games)?games:[]).filter(g=>g.week===week&&g.home&&g.away).map(g=>({home:g.home!,away:g.away!,status:g.status})),teams:[mine,rival].filter((r):r is Match=>!!r).map(r=>({rosterId:r.roster_id,starters:r.starters||[],points:r.starters_points||[]}))},syncedAt:new Date().toISOString(),note:!opponent?'No head-to-head opponent supplied for this week.':playoff?'Weekly scores shown. See Sleeper for any multiweek playoff aggregate.':null};
  } catch { return {...empty,note:'Sleeper could not be refreshed. Scores are unavailable. Try again shortly.'}; }
}
