import type {LeagueTeam,PlayerIntelligencePayload,PlayerWeeklySnapshot,WeeklyTeamScore} from './types';
export const finite=(value:unknown):value is number=>typeof value==='number'&&Number.isFinite(value);
export function lineupProjection(team:LeagueTeam,data?:PlayerIntelligencePayload|null){
 const ids=[...new Set(team.starters.filter(id=>id&&id!=='0'))];
 const byId=new Map((data?.currentSnapshots||[]).map(row=>[row.playerId,row]));
 const values=ids.map(id=>byId.get(id)?.projectedPoints).filter(finite);
 return {total:values.length?values.reduce((a,b)=>a+b,0):null,known:values.length,slots:ids.length,complete:ids.length>0&&values.length===ids.length};
}
export function recordedPlayerWeeks(team:LeagueTeam,data?:PlayerIntelligencePayload|null){
 const owned=new Set(team.players);const seen=new Set<string>();
 return [...(data?.accuracySnapshots||[]),...(data?.currentSnapshots||[])].filter(row=>{
   const key=`${row.season}:${row.week}:${row.playerId}`;
   if(!owned.has(row.playerId)||row.season!==data?.season||row.week>(data?.latestCompletedWeek||0)||!finite(row.actualPoints)||seen.has(key))return false;
   seen.add(key);return true;
 }).sort((a,b)=>b.week-a.week||b.actualPoints!-a.actualPoints!);
}
export function fantasySchedule(team:LeagueTeam,data?:PlayerIntelligencePayload|null){
 const rows=[...(data?.weeklyScores||[]),...(data?.currentMatchups||[])];
 const own=new Map<number,WeeklyTeamScore>();
 for(const row of rows)if(row.rosterId===team.rosterId&&finite(row.points))own.set(row.week,row);
 return [...own.values()].sort((a,b)=>b.week-a.week).map(row=>{
   const opponent=row.matchupId==null?null:rows.find(other=>other.week===row.week&&other.rosterId!==team.rosterId&&other.matchupId===row.matchupId)||null;
   return {week:row.week,own:row,opponent,completed:row.week<=(data?.latestCompletedWeek||0)};
 });
}
export function playerStatSummary(row:PlayerWeeklySnapshot){
 const labels:Record<string,string>={pass_yd:'pass yd',pass_td:'pass TD',rush_yd:'rush yd',rush_td:'rush TD',rec:'rec',rec_yd:'rec yd',rec_td:'rec TD'};
 return Object.entries(row.actualStats||{}).filter(([key,value])=>labels[key]&&finite(value)&&value!==0).slice(0,4).map(([key,value])=>`${value} ${labels[key]}`).join(' · ');
}
