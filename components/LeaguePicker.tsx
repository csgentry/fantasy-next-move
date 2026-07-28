"use client";

import { useEffect, useState } from "react";
import { demoLeague } from "@/lib/demo-data";
import { clearConnection, loadConnection, saveConnection } from "@/lib/storage";
import type { ImportedLeague, LeagueProvider } from "@/lib/types";

export function useSelectedLeague() {
  const [league, setLeagueState] = useState<ImportedLeague>(demoLeague);
  const [source, setSource] = useState<LeagueProvider>("demo");
  const [teamRosterId, setTeamRosterIdState] = useState<number>(demoLeague.userRosterId ?? demoLeague.teams[0].rosterId);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = loadConnection();
      if (stored) {
        const fallbackRosterId = stored.league.userRosterId ?? stored.league.teams[0]?.rosterId ?? null;
        const selectedRosterId = stored.selectedRosterId ?? fallbackRosterId;
        setLeagueState(stored.league);
        setSource(stored.source);
        if (selectedRosterId && stored.league.teams.some((team) => team.rosterId === selectedRosterId)) {
          setTeamRosterIdState(selectedRosterId);
        } else if (fallbackRosterId) {
          setTeamRosterIdState(fallbackRosterId);
        }
      }
    } catch {
      clearConnection();
    } finally {
      setHydrated(true);
    }
  }, []);

  function setTeamRosterId(rosterId: number) {
    setTeamRosterIdState(rosterId);
    if (league.provider !== "demo") saveConnection(league, rosterId);
  }

  function setLeague(nextLeague: ImportedLeague) {
    const rosterId = nextLeague.userRosterId ?? nextLeague.teams[0]?.rosterId ?? null;
    setLeagueState(nextLeague);
    setSource(nextLeague.provider);
    if (rosterId) setTeamRosterIdState(rosterId);
    if (nextLeague.provider !== "demo") saveConnection(nextLeague, rosterId);
  }

  function resetLeague() {
    clearConnection();
    setLeagueState(demoLeague);
    setSource("demo");
    setTeamRosterIdState(demoLeague.userRosterId ?? demoLeague.teams[0].rosterId);
  }

  return { league, source, teamRosterId, setTeamRosterId, setLeague, resetLeague, hydrated };
}
