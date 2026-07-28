"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { loadSavedLeaguesFromAccount, saveLeagueToAccount } from "@/lib/account-storage";
import type { SavedLeagueRecord } from "@/lib/account-storage";

function formatLabel(value: string | undefined) {
  if (value === "dynasty") return "Dynasty";
  if (value === "keeper") return "Keeper";
  return "Redraft";
}

export default function MyLeaguesPage() {
  const router = useRouter();
  const [leagues, setLeagues] = useState<SavedLeagueRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadSavedLeaguesFromAccount()
      .then(setLeagues)
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load saved leagues."))
      .finally(() => setLoading(false));
  }, []);

  async function openLeague(record: SavedLeagueRecord) {
    setOpening(record.id);
    setError("");
    try {
      const selectedRosterId = record.selected_roster_id ?? record.raw_data.userRosterId ?? record.raw_data.teams[0]?.rosterId ?? null;
      await saveLeagueToAccount(record.raw_data, selectedRosterId);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to open this league.");
      setOpening("");
    }
  }

  return (
    <AppShell>
      <div className="page-heading"><div><span className="eyebrow">Account library</span><h1>My Leagues</h1><p>Open any league saved to your beta account without importing it again.</p></div><a className="button small" href="/connect">Connect another league</a></div>
      {error && <div className="connection-message error">{error}</div>}
      {loading && <div className="panel empty-state"><strong>Loading saved leagues…</strong></div>}
      {!loading && !leagues.length && <div className="panel empty-state"><strong>No saved leagues yet.</strong><p>Connect Sleeper or Yahoo to add your first league.</p><a className="button small" href="/connect">Connect a league</a></div>}
      {!!leagues.length && <section className="saved-league-grid">{leagues.map((record) => (
        <article className={`panel saved-league-card ${record.is_active ? "active" : ""}`} key={record.id}>
          <div><span className="eyebrow">{record.provider} · {record.season}</span><h2>{record.name}</h2><p>{formatLabel(record.raw_data.leagueType)} · {record.raw_data.totalRosters} teams{record.raw_data.draftPicks?.length ? ` · ${record.raw_data.draftPicks.length} picks tracked` : ""}</p></div>
          <div className="saved-league-actions">{record.is_active && <span className="pill">Active</span>}<button className="button small" disabled={Boolean(opening)} onClick={() => openLeague(record)}>{opening === record.id ? "Opening…" : "Open league"}</button></div>
        </article>
      ))}</section>}
    </AppShell>
  );
}
