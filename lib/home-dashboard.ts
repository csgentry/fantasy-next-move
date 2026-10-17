import type {LeagueTeam,PlayerProfile,PlayerRecommendation} from './types';

// A single projection beat is an observation, not evidence of trade value.
// Keep the engine's supported lineup, waiver and roster-fit trade decisions.
export function homepageRecommendations(moves:PlayerRecommendation[]) {
 return moves.filter(move=>!move.id.startsWith('sell-high:'));
}

export function rosterAvailability(team:LeagueTeam|undefined,profiles:Record<string,PlayerProfile>) {
 if(!team)return [];
 return team.players.map(id=>profiles[id]).filter((p):p is PlayerProfile=>Boolean(p?.injuryStatus?.trim())&&!/^(healthy|active|none)$/i.test(p?.injuryStatus?.trim()||''))
  .sort((a,b)=>Number(team.starters.includes(b.playerId))-Number(team.starters.includes(a.playerId))).slice(0,4);
}

// Scores only; the heavier analysis uses a separate five-minute session cache.
export function matchupRefreshDelay(statuses:(string|null)[],failed=false) {
 if(failed)return 5*60*1000;
 if(statuses.includes('Live'))return 2*60*1000;
 if(statuses.some(status=>status!=='Final'))return 5*60*1000;
 return 15*60*1000;
}
