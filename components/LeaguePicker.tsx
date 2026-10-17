"use client";

import {useYahooSession} from "./YahooSession";
import { useEffect, useRef, useState } from "react";
import { closeActiveLeagueInAccount, saveLeagueToAccount } from "@/lib/account-storage";
import {useAnalysisSession} from './PlayerAnalysisSession';
import { demoLeague } from "@/lib/demo-data";
import { clearLegacyBrowserData } from "@/lib/storage";
import type { ImportedLeague, LeagueProvider } from "@/lib/types";
function validRoster(league:ImportedLeague,preferred?:number|null){return [preferred,league.userRosterId,league.teams[0]?.rosterId].find(id=>id!=null&&league.teams.some(team=>team.rosterId===id))??demoLeague.userRosterId??demoLeague.teams[0].rosterId;}

export function useSelectedLeague() {
  const yahoo = useYahooSession();
  const {owner,accountReady,peekSelection,loadSelection,rememberSelection}=useAnalysisSession();
  const remembered=peekSelection(owner);
  const [selectionOwner,setSelectionOwner]=useState(owner);
  const version=useRef(0);
  const [league, setLeagueState] = useState<ImportedLeague>(()=>remembered?.league||demoLeague);
  const [source, setSource] = useState<LeagueProvider>(()=>remembered?.league.provider||'demo');
  const [teamRosterId, setTeamRosterIdState] = useState<number>(()=>validRoster(remembered?.league||demoLeague,remembered?.selectedRosterId));
  const [hydrated, setHydrated] = useState(remembered!==undefined);
  const [error, setError] = useState("");

  useEffect(() => {
    if(!accountReady)return;
    let cancelled = false;
    const epoch=version.current;
    clearLegacyBrowserData();
    loadSelection(owner)
      .then((remote) => {
        if (cancelled||epoch!==version.current) return;
        setSelectionOwner(owner);
        if(!remote){setLeagueState(demoLeague);setSource('demo');return;}
        const selectedRosterId = validRoster(remote.league,remote.selectedRosterId);
        setLeagueState(remote.league);
        setSource(remote.league.provider);
        setTeamRosterIdState(selectedRosterId);
      })
      .catch(() => {if(!cancelled&&epoch===version.current) setError("We couldn’t load your league. Your saved connection is unchanged.");})
      .finally(() => { if (!cancelled) setHydrated(true); });
    return () => { cancelled = true; };
  }, [owner,accountReady,loadSelection]);

  async function setTeamRosterId(rosterId: number) {
    if(!league.teams.some(t=>t.rosterId===rosterId))return;
    try {if(league.provider!=="demo") await saveLeagueToAccount(league,rosterId);version.current++;rememberSelection(owner,{league,selectedRosterId:rosterId});setTeamRosterIdState(rosterId);setError("");}
    catch {setError("We couldn’t save your team selection. Try again.");}
  }
  async function setLeague(nextLeague: ImportedLeague, selectedRosterId?:number|null) {
    const rosterId = selectedRosterId ?? nextLeague.userRosterId ?? nextLeague.teams[0]?.rosterId ?? null;
    if (nextLeague.provider === "yahoo") throw new Error("Use the temporary Yahoo connection to select this team.");
    if(nextLeague.provider!=="demo") await saveLeagueToAccount(nextLeague,rosterId);
    version.current++;rememberSelection(owner,{league:nextLeague,selectedRosterId:rosterId});setSelectionOwner(owner);setHydrated(true);
    setLeagueState(nextLeague);setSource(nextLeague.provider);if(rosterId)setTeamRosterIdState(rosterId);setError("");
  }
  async function resetLeague() {
    try {await closeActiveLeagueInAccount();version.current++;rememberSelection(owner,null);clearLegacyBrowserData();setLeagueState(demoLeague);setSource("demo");setTeamRosterIdState(demoLeague.userRosterId ?? demoLeague.teams[0].rosterId);setError("");}
    catch {setError("We couldn’t close this league. Your current connection is unchanged.");}
  }

  if (yahoo.selection) return {league: yahoo.selection.league, source: "yahoo" as const, teamRosterId: yahoo.selection.league.userRosterId!, setTeamRosterId: async () => {}, setLeague, resetLeague: async () => yahoo.select(null), hydrated: true, error: ""};
  if(selectionOwner!==owner)return {league:demoLeague,source:'demo' as const,teamRosterId:demoLeague.userRosterId??demoLeague.teams[0].rosterId,setTeamRosterId,setLeague,resetLeague,hydrated:false,error:''};
  return { league, source, teamRosterId, setTeamRosterId, setLeague, resetLeague, hydrated, error };
}
