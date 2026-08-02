"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useSelectedLeague } from "@/components/LeaguePicker";
import { loadHistoryFromAccount, saveHistoryToAccount } from "@/lib/account-storage";
import { historicalSeasons } from "@/lib/demo-data";
import type { LeagueHistoryPayload } from "@/lib/types";

function identityKey(ownerId: string | null, ownerName: string) {
  return ownerId || ownerName.trim().toLowerCase();
}

export default function RecordBookPage() {
  const { league, source, hydrated } = useSelectedLeague();
  const [history, setHistory] = useState<LeagueHistoryPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
  let cancelled = false;

  if (!hydrated) return;

  if (source === "demo") {
    setHistory(null);
    return;
  }

  setHistory(null);

  loadHistoryFromAccount(source, league.leagueId)
    .then((remote) => {
      if (!cancelled && remote) setHistory(remote);
    })
    .catch(() => undefined);

  return () => {
    cancelled = true;
  };
}, [hydrated, source, league.leagueId]);

  async function syncHistory() {
    if (source === "demo") return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/${source}/history?leagueId=${encodeURIComponent(league.leagueId)}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to import league history.");
      setHistory(payload);
      await saveHistoryToAccount(payload);
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "Unable to import league history.");
    } finally {
      setLoading(false);
    }
  }


  function exportCsv() {
    if (!history) return;
    const rows = [["Season", "Manager", "Team", "Wins", "Losses", "Ties", "Points For", "Points Against", "Champion"]];
    history.seasons.forEach((season) => season.teams.forEach((team) => rows.push([
      season.season,
      team.ownerName,
      team.teamName,
      String(team.wins),
      String(team.losses),
      String(team.ties),
      String(team.pointsFor),
      String(team.pointsAgainst),
      season.championOwnerId ? String(season.championOwnerId === team.ownerId) : String(season.champion === team.ownerName)
    ])));
    const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${league.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-record-book.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const managerRecords = useMemo(() => {
    if (!history) return [];
    const records = new Map<string, { manager: string; seasons: Set<string>; wins: number; losses: number; ties: number; titles: number; aliases: Set<string> }>();
    for (const season of history.seasons) {
      for (const team of season.teams) {
        const key = identityKey(team.ownerId, team.ownerName);
        const current = records.get(key) || { manager: team.ownerName, seasons: new Set<string>(), wins: 0, losses: 0, ties: 0, titles: 0, aliases: new Set<string>() };
        current.manager = team.ownerName || current.manager;
        current.seasons.add(season.season);
        current.wins += team.wins;
        current.losses += team.losses;
        current.ties += team.ties;
        current.aliases.add(team.teamName);
        if (season.championOwnerId ? season.championOwnerId === team.ownerId : season.champion === team.ownerName) current.titles += 1;
        records.set(key, current);
      }
    }
    return [...records.values()].map((record) => {
      const games = record.wins + record.losses + record.ties;
      return { ...record, seasons: record.seasons.size, winPct: games ? ((record.wins + record.ties * 0.5) / games) * 100 : 0 };
    }).sort((a, b) => b.wins - a.wins || b.titles - a.titles || b.winPct - a.winPct);
  }, [history]);

  const recordStats = useMemo(() => {
    if (!history?.seasons.length) return null;
    const allTeams = history.seasons.flatMap((season) => season.teams.map((team) => ({ ...team, season: season.season })));
    const highestScoring = [...allTeams].sort((a, b) => b.pointsFor - a.pointsFor)[0];
    const bestSeason = [...allTeams].sort((a, b) => {
      const aGames = Math.max(a.wins + a.losses + a.ties, 1);
      const bGames = Math.max(b.wins + b.losses + b.ties, 1);
      const aPct = (a.wins + a.ties * 0.5) / aGames;
      const bPct = (b.wins + b.ties * 0.5) / bGames;
      return bPct - aPct || b.wins - a.wins;
    })[0];
    return { leader: managerRecords[0], highestScoring, bestSeason };
  }, [history, managerRecords]);

 if (!hydrated) {
  return (
    <AppShell>
      <div className="panel empty-state">
        <strong>Loading your league history…</strong>
      </div>
    </AppShell>
  );
}
  if (source === "demo") {
    return (
      <AppShell>
        <div className="page-heading"><div><span className="eyebrow">League history</span><h1>Record Book</h1><p>Connect Sleeper or Yahoo to replace this demonstration archive with your real league history.</p></div><span className="pill">Demo archive</span></div>
        <section className="stats-grid three">
          <div className="stat-card"><span>All-time leader</span><strong>Alex Carter</strong><small>91 regular-season wins</small></div>
          <div className="stat-card"><span>Highest single score</span><strong>212.44</strong><small>Week 11 · 2023</small></div>
          <div className="stat-card"><span>Best season</span><strong>13-1</strong><small>92.9% win rate</small></div>
        </section>
        <section className="panel"><div className="panel-heading"><div><span className="eyebrow">Championship archive</span><h2>League Champions</h2></div></div><div className="champion-list">{historicalSeasons.map((season) => <div key={season.season}><strong>{season.season}</strong><div><b>{season.champion}</b><span>{season.team}</span></div><small>Runner-up: {season.runnerUp}</small></div>)}</div></section>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="page-heading">
        <div><span className="eyebrow">{source} league history</span><h1>{league.name} Record Book</h1><p>Manager records stay connected by provider owner ID even when team names change.</p></div>
        <div className="heading-buttons"><button className="button small" onClick={syncHistory} disabled={loading}>{loading ? "Syncing…" : history ? "Refresh history" : "Build record book"}</button>{history && <button className="button secondary small" onClick={exportCsv}>Export CSV</button>}</div>
      </div>
      {error && <div className="connection-message error">{error}</div>}
      {!history && !loading && <div className="panel empty-state"><strong>Your history has not been indexed yet.</strong><p>Build the record book to follow Sleeper renewal links or Yahoo renewed-league keys through prior seasons.</p></div>}

      {history && (
        <>
          <section className="stats-grid three">
            <div className="stat-card"><span>All-time wins leader</span><strong>{recordStats?.leader?.manager || "—"}</strong><small>{recordStats?.leader ? `${recordStats.leader.wins} wins · ${recordStats.leader.titles} title${recordStats.leader.titles === 1 ? "" : "s"}` : "No completed records"}</small></div>
            <div className="stat-card"><span>Highest season scoring</span><strong>{recordStats?.highestScoring?.pointsFor.toFixed(2) || "—"}</strong><small>{recordStats?.highestScoring ? `${recordStats.highestScoring.teamName} · ${recordStats.highestScoring.season}` : "No scoring data"}</small></div>
            <div className="stat-card"><span>Best regular season</span><strong>{recordStats?.bestSeason ? `${recordStats.bestSeason.wins}-${recordStats.bestSeason.losses}${recordStats.bestSeason.ties ? `-${recordStats.bestSeason.ties}` : ""}` : "—"}</strong><small>{recordStats?.bestSeason ? `${recordStats.bestSeason.teamName} · ${recordStats.bestSeason.season}` : "No standings data"}</small></div>
          </section>

          <section className="dashboard-grid record-layout">
            <div className="panel"><div className="panel-heading"><div><span className="eyebrow">Championship archive</span><h2>League Champions</h2></div><span className="pill">{history.seasons.length} season{history.seasons.length === 1 ? "" : "s"}</span></div>
              <div className="champion-list">{history.seasons.map((season) => <div key={season.leagueId}><strong>{season.season}</strong><div><b>{season.champion || "Champion unavailable"}</b><span>{season.championTeam || season.leagueName}</span></div><small>{season.runnerUp ? `Runner-up: ${season.runnerUp}` : "Bracket not complete"}</small></div>)}</div>
            </div>
            <div className="panel"><div className="panel-heading"><div><span className="eyebrow">Identity matching</span><h2>Manager Leaderboard</h2></div></div>
              <div className="manager-table"><div className="table-head"><span>Manager</span><span>Record</span><span>Titles</span></div>{managerRecords.map((record) => <div className="table-row" key={record.manager}><span><b>{record.manager}</b><small>{[...record.aliases].join(" · ")}</small></span><span>{record.wins}-{record.losses}{record.ties ? `-${record.ties}` : ""}<small>{record.winPct.toFixed(1)}%</small></span><strong>{record.titles}</strong></div>)}</div>
            </div>
          </section>
          {!!history.warnings?.length && <div className="panel warning-panel"><strong>Import notes</strong>{history.warnings.map((warning) => <p key={warning}>{warning}</p>)}</div>}
        </>
      )}
    </AppShell>
  );
}
