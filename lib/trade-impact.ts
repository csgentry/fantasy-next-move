import {optimizeProjectedLineup} from "./player-intelligence";
import type {ImportedLeague,LeagueTeam,PlayerProfile,PlayerWeeklySnapshot} from "./types";
export function evaluateRosterTrade(team:LeagueTeam,league:ImportedLeague,profiles:Record<string,PlayerProfile>,snapshots:PlayerWeeklySnapshot[],sent:string[],received:string[]){
 const afterIds=[...new Set([...team.players.filter(id=>!sent.includes(id)),...received])];
 const after={...team,players:afterIds};
 const relevant=[...new Set([...team.players,...received])];
 const covered=new Set(snapshots.filter(s=>s.projectedPoints!==null && Number.isFinite(s.projectedPoints)).map(s=>s.playerId));
 const hasCoverage=relevant.length>0 && relevant.every(id=>covered.has(id));
 if(!hasCoverage) return {verdict:"Fair / Situational",gain:null,reason:"Some weekly projections are missing. Review roster balance and the players involved before deciding; we cannot reliably estimate starting-lineup improvement.",confidence:"Low confidence"};
 const beforeLineup=optimizeProjectedLineup(team,league,profiles,snapshots);
 const afterLineup=optimizeProjectedLineup(after,league,profiles,snapshots);
 const gain=Math.round((afterLineup.total-beforeLineup.total)*10)/10;
 const verdict=gain>=3?"Strong Improvement":gain>=1?"Slight Improvement":gain<=-3?"Poor Fit":gain<=-1?"Slight Decline":"Fair / Situational";
 return {verdict,gain,reason:gain>=1?"The best projected starting lineup improves after this trade. Check the remaining depth and injury risk before making an offer.":gain<=-1?"Your best projected starting lineup loses points after this trade. The return would need to address another important need to justify it.":"The projected starting lineup changes little. Depth, positional needs and risk should drive your decision.",confidence:"Moderate confidence"};
}
