import type {PlayerIntelligencePayload} from './types';

// Recommendations are calculated from the complete dataset on the server first.
// The homepage needs roster availability, player details and starter forecasts,
// not every NFL player's profile or historical statistical breakdown.
export function homepageAnalysis(data:PlayerIntelligencePayload,rosterId?:number){
 const league=data.currentLeague;
 if(!league)return data;
 const team=league.teams.find(t=>t.rosterId===(rosterId??league.userRosterId));
 const own=new Set(team?.players||[]);
 const visible=new Set([...own,...league.teams.flatMap(t=>t.starters)]);
 return {...data,
  profiles:Object.fromEntries(Object.entries(data.profiles).filter(([id])=>own.has(id))),
  currentSnapshots:data.currentSnapshots.filter(row=>visible.has(row.playerId)).map(row=>own.has(row.playerId)?row:{...row,projectionStats:{},actualStats:{}}),
  accuracySnapshots:data.accuracySnapshots.map(row=>({...row,projectionStats:{},actualStats:{}}))
 };
}
