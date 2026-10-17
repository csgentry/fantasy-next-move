import {lineupEligibility, normalizeFantasyPosition, optimizeProjectedLineup} from "./player-intelligence";
import type {ImportedLeague, LeagueTeam, PlayerIntelligencePayload} from "./types";
const excludedSlots = new Set(["BN","BE","BENCH","IR","IR+","RESERVE","TAXI","NA"]);
export function hasCurrentAnalysis(data: PlayerIntelligencePayload | null | undefined, now=Date.now()) {
  const checked=Date.parse(data?.rostersSyncedAt || "");
  return Boolean(data && data.activeSeason && Number.isFinite(checked) && now-checked >= -60000 && now-checked < 15*60*1000);
}
export function lineupReview(league:ImportedLeague,team:LeagueTeam,data:PlayerIntelligencePayload) {
  const blocked = new Set([...(team.reserve||[]),...(team.taxi||[])]);
  const snapshots=new Map(data.currentSnapshots.map(p=>[p.playerId,p]));
  const eligible=team.players.filter(id=>!blocked.has(id) && snapshots.get(id)?.projectedPoints != null && !/^(out|ir|pup|sus|suspended|inactive)$/i.test(data.profiles[id]?.injuryStatus||data.profiles[id]?.status||""));
  const optimized=optimizeProjectedLineup({...team,players:eligible,starters:team.starters.filter(id=>eligible.includes(id))},league,data.profiles,data.currentSnapshots);
  const used=new Set<string>();
  return league.rosterPositions.map((slot,index)=>({slot,index})).filter(({slot})=>!excludedSlots.has(slot.toUpperCase())).sort((a,b)=>lineupEligibility(a.slot).size-lineupEligibility(b.slot).size||a.index-b.index).map(({slot,index})=>{
    const suggested=optimized.starters.find(p=>!used.has(p.playerId)&&lineupEligibility(slot).has(normalizeFantasyPosition(p.profile.position)));
    if(suggested)used.add(suggested.playerId);
    const currentId=team.starters[index];
    const current=snapshots.get(currentId);
    const gain=suggested && current?.projectedPoints!=null?suggested.projectedPoints-current.projectedPoints:null;
    return {slot,index,currentId,suggestedId:suggested?.playerId||null,gain};
  }).sort((a,b)=>a.index-b.index);
}
export function waiverCandidates(league:ImportedLeague,team:LeagueTeam,data:PlayerIntelligencePayload) {
  const eligiblePositions=new Set((league.rosterPositions||["QB","RB","WR","TE","K","DEF"]).filter(slot=>!excludedSlots.has(slot.toUpperCase())).flatMap(slot=>[...lineupEligibility(slot)]));
  const rostered=new Set(league.teams.flatMap(t=>[...t.players,...(t.reserve||[]),...(t.taxi||[])]));
  const nonDrops=new Set([...team.starters,...(team.reserve||[]),...(team.taxi||[])]);
  const byId=new Map(data.currentSnapshots.map(p=>[p.playerId,p]));
  return data.currentSnapshots.filter(p=>!rostered.has(p.playerId)&&p.projectedPoints!=null&&p.projectedPoints>0&&eligiblePositions.has(normalizeFantasyPosition(p.position))).map(p=>{
    const drop=team.players.filter(id=>!nonDrops.has(id)&&normalizeFantasyPosition(data.profiles[id]?.position)===normalizeFantasyPosition(p.position)).map(id=>byId.get(id)).filter((s):s is NonNullable<typeof s>=>s?.projectedPoints!=null).sort((a,b)=>a.projectedPoints!-b.projectedPoints!)[0];
    return {player:p,drop,gain:drop?p.projectedPoints!-drop.projectedPoints!:null};
  }).sort((a,b)=>(b.gain??-999)-(a.gain??-999)||b.player.projectedPoints!-a.player.projectedPoints!);
}
