"use client";

import {useYahooSession} from "./YahooSession";
import { useEffect, useState } from "react";
import { closeActiveLeagueInAccount, loadActiveLeagueFromAccount, saveLeagueToAccount } from "@/lib/account-storage";
import { demoLeague } from "@/lib/demo-data";
import { clearLegacyBrowserData } from "@/lib/storage";
import type { ImportedLeague, LeagueProvider } from "@/lib/types";

export function useSelectedLeague() {
  const yahoo = useYahooSession();
  const [league, setLeagueState] = useState<ImportedLeague>(demoLeague);
  const [source, setSource] = useState<LeagueProvider>("demo");
  const [teamRosterId, setTeamRosterIdState] = useState<number>(demoLeague.userRosterId ?? demoLeague.teams[0].rosterId);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    clearLegacyBrowserData();
    loadActiveLeagueFromAccount()
      .then((remote) => {
        if (!remote || cancelled) return;
        const fallbackRosterId = remote.league.userRosterId ?? remote.league.teams[0]?.rosterId ?? null;
        const selectedRosterId = remote.selectedRosterId ?? fallbackRosterId;
        setLeagueState(remote.league);
        setSource(remote.league.provider);
        if (selectedRosterId && remote.league.teams.some((team) => team.rosterId === selectedRosterId)) setTeamRosterIdState(selectedRosterId);
        else if (fallbackRosterId) setTeamRosterIdState(fallbackRosterId);
      })
      .catch(() => {if(!cancelled) setError("We couldn’t load your league. Your saved connection is unchanged.");})
      .finally(() => { if (!cancelled) setHydrated(true); });
    return () => { cancelled = true; };
  }, []);

  async function setTeamRosterId(rosterId: number) {
    if(!league.teams.some(t=>t.rosterId===rosterId))return;
    try {if(league.provider!=="demo") await saveLeagueToAccount(league,rosterId);setTeamRosterIdState(rosterId);setError("");}
    catch {setError("We couldn’t save your team selection. Try again.");}
  }
  async function setLeague(nextLeague: ImportedLeague, selectedRosterId?:number|null) {
    const rosterId = selectedRosterId ?? nextLeague.userRosterId ?? nextLeague.teams[0]?.rosterId ?? null;
    if (nextLeague.provider === "yahoo") throw new Error("Use the temporary Yahoo connection to select this team.");
    if(nextLeague.provider!=="demo") await saveLeagueToAccount(nextLeague,rosterId);
    setLeagueState(nextLeague);setSource(nextLeague.provider);if(rosterId)setTeamRosterIdState(rosterId);setError("");
  }
  async function resetLeague() {
    try {await closeActiveLeagueInAccount();clearLegacyBrowserData();setLeagueState(demoLeague);setSource("demo");setTeamRosterIdState(demoLeague.userRosterId ?? demoLeague.teams[0].rosterId);setError("");}
    catch {setError("We couldn’t close this league. Your current connection is unchanged.");}
  }

  if (yahoo.selection) return {league: yahoo.selection.league, source: "yahoo" as const, teamRosterId: yahoo.selection.league.userRosterId!, setTeamRosterId: async () => {}, setLeague, resetLeague: async () => yahoo.select(null), hydrated: true, error: ""};
  return { league, source, teamRosterId, setTeamRosterId, setLeague, resetLeague, hydrated, error };
}
