import type { PlayerIntelligencePayload } from './types';
import type { HomeMatchup } from './sleeper/home-matchups';

type Forecast = { own: number | null; opponent: number | null; percent: number | null; reason: string; sampleSize: number };
const teamCode=(code:string)=>({JAC:'JAX',LA:'LAR',WSH:'WAS',OAK:'LV',SD:'LAC'}[code as 'JAC'|'LA'|'WSH'|'OAK'|'SD']||code);
const valid=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v);
// Standard normal CDF approximation. This is a model estimate, not provider odds.
function normalCdf(x:number) {
 const z=Math.abs(x),t=1/(1+0.2316419*z);
 const tail=Math.exp(-z*z/2)/Math.sqrt(2*Math.PI)*t*(0.319381530+t*(-0.356563782+t*(1.781477937+t*(-1.821255978+t*1.330274429))));
 return x>=0?1-tail:tail;
}
export function forecastMatchup(card:HomeMatchup,analysis:PlayerIntelligencePayload|null):Forecast {
 const empty=(reason:string):Forecast=>({own:null,opponent:null,percent:null,reason,sampleSize:0});
 if(!card.opponent||!valid(card.score)||!valid(card.opponentScore))return empty('Matchup scores or opponent unavailable.');
 if(card.status==='Final')return {own:card.score,opponent:card.opponentScore,percent:card.score===card.opponentScore?null:card.score>card.opponentScore?100:0,reason:card.score===card.opponentScore?'Final · tied score.':'Final result.',sampleSize:0};
 if(!analysis||analysis.leagueId!==card.league.leagueId||analysis.season!==Number(card.league.season)||analysis.projectionWeek!==card.week||analysis.activeSeason===false||!analysis.rostersSyncedAt)return empty('Select this league to load verified projections.');
 if(!card.forecastInputs?.games.length)return empty('Game status unavailable.');
 const age=Date.now()-Date.parse(analysis.syncedAt);
 if(!Number.isFinite(age)||age< -60000||age>15*60000)return empty('Refresh analysis to update the forecast.');
 const history=analysis.accuracySnapshots.filter(s=>s.season===analysis.season&&s.week<analysis.projectionWeek&&valid(s.projectedPoints)&&s.projectedPoints>=1&&valid(s.actualPoints));
 const pool=history.map(s=>(s.actualPoints!-s.projectedPoints!)**2);
 function variance(position:string){const local=history.filter(s=>s.position===position).map(s=>(s.actualPoints!-s.projectedPoints!)**2);const errors=local.length>=20?local:pool.length>=50?pool:[];return errors.length?errors.reduce((n,e)=>n+e,0)/errors.length:null;}
 function teamForecast(rosterId:number,score:number){
  const row=card.forecastInputs!.teams.find(t=>t.rosterId===rosterId);
  if(!row||!row.starters.length||row.starters.length!==row.points.length)return null;
  let remaining=0,uncertainty=0,calibrated=true;
  for(let i=0;i<row.starters.length;i++){
   const id=row.starters[i];if(!id||id==='0')continue;
   const snapshot=analysis!.currentSnapshots.find(s=>s.playerId===id&&s.week===card.week&&s.season===analysis!.season&&s.rosterId===rosterId);
   if(!snapshot?.nflTeam||!valid(row.points[i]))return null;
   const game=card.forecastInputs!.games.find(g=>teamCode(g.home)===teamCode(snapshot.nflTeam!)||teamCode(g.away)===teamCode(snapshot.nflTeam!));
   // No scheduled game means a bye. Completed games already contribute actual score.
   if(!game||game.status==='complete')continue;
   if(!['scheduled','not_started','pre_game'].includes(game.status))return null;
   if(!valid(snapshot.projectedPoints)||snapshot.projectedPoints<0)return null;
   remaining+=snapshot.projectedPoints-row.points[i]!;
   if(snapshot.projectedPoints>0){const v=variance(snapshot.position);if(v==null||v<=0)calibrated=false;else uncertainty+=v;}
  }
  return {projection:Math.round((score+remaining)*100)/100,variance:calibrated?uncertainty:null};
 }
 if(!card.own)return empty('Customer team unavailable.');
 const mine=teamForecast(card.own.rosterId,card.score),rival=teamForecast(card.opponent.rosterId,card.opponentScore);
 if(!mine||!rival)return empty('Live estimate unavailable: a starter is playing or verified projection/game data is missing.');
 const own=mine.projection,opponent=rival.projection;
 if(mine.variance==null||rival.variance==null)return {own,opponent,percent:null,reason:'Not enough historical projection errors to estimate win chance.',sampleSize:history.length};
 const varianceSum=mine.variance+rival.variance;
 if(varianceSum<=0)return {own,opponent,percent:null,reason:'Awaiting the provider’s final matchup status.',sampleSize:history.length};
 const percent=Math.max(1,Math.min(99,Math.round(normalCdf((own-opponent)/Math.sqrt(varianceSum))*100)));
 return {own,opponent,percent,reason:'FNM estimate: actual scores plus unplayed starters’ projections. Win chance uses historical player projection errors and assumes independent, approximately normal scoring errors. It is not provider odds or a calibrated guarantee. Active-game estimates require remaining-game data; otherwise they are withheld.',sampleSize:history.length};
}
