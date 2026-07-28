"use client";

import { useEffect, useState } from "react";
import { closeActiveLeagueInAccount, loadActiveLeagueFromAccount, saveLeagueToAccount } from "@/lib/account-storage";
import { demoLeague } from "@/lib/demo-data";
import { clearLegacyBrowserData } from "@/lib/storage";
import type { ImportedLeague, LeagueProvider } from "@/lib/types";

export function useSelectedLeague() {
  const [league, setLeagueState] = useState<ImportedLeague>(demoLeague);
  const [source, setSource] = useState<LeagueProvider>("demo");
  const [teamRosterId, setTeamRosterIdState] = useState<number>(demoLeague.userRosterId ?? demoLeague.teams[0].rosterId);
  const [hydrated, setHydrated] = useState(false);

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
      .catch(() => undefined)
      .finally(() => { if (!cancelled) setHydrated(true); });
    return () => { cancelled = true; };
  }, []);

  function setTeamRosterId(rosterId: number) {
    setTeamRosterIdState(rosterId);
    if (league.provider !== "demo") void saveLeagueToAccount(league, rosterId);
  }

  function setLeague(nextLeague: ImportedLeague) {
    const rosterId = nextLeague.userRosterId ?? nextLeague.teams[0]?.rosterId ?? null;
    setLeagueState(nextLeague);
    setSource(nextLeague.provider);
    if (rosterId) setTeamRosterIdState(rosterId);
    if (nextLeague.provider !== "demo") void saveLeagueToAccount(nextLeague, rosterId);
  }

  function resetLeague() {
    clearLegacyBrowserData();
    void closeActiveLeagueInAccount();
    setLeagueState(demoLeague);
    setSource("demo");
    setTeamRosterIdState(demoLeague.userRosterId ?? demoLeague.teams[0].rosterId);
  }

  return { league, source, teamRosterId, setTeamRosterId, setLeague, resetLeague, hydrated };
}
