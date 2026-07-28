"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { clearConnection, saveConnection } from "@/lib/storage";
import type { ImportedLeague, SleeperImportPayload, YahooImportPayload } from "@/lib/types";

type YahooStatus = {
  connected: boolean;
  user?: { displayName: string; email?: string | null } | null;
  error?: string;
};

export default function ConnectPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [season, setSeason] = useState("2026");
  const [sleeperData, setSleeperData] = useState<SleeperImportPayload | null>(null);
  const [yahooData, setYahooData] = useState<YahooImportPayload | null>(null);
  const [yahooStatus, setYahooStatus] = useState<YahooStatus>({ connected: false });
  const [loading, setLoading] = useState<"sleeper" | "yahoo" | "disconnect" | "">("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.get("yahoo") === "connected") setNotice("Yahoo connected. Choose a season and import your leagues.");
    if (query.get("yahoo_error")) setError(query.get("yahoo_error") || "Yahoo connection failed.");
    fetch("/api/yahoo/status", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload: YahooStatus) => setYahooStatus(payload))
      .catch(() => setYahooStatus({ connected: false }));
  }, []);

  async function importSleeper(event: FormEvent) {
    event.preventDefault();
    setLoading("sleeper");
    setError("");
    setNotice("");
    setSleeperData(null);
    try {
      const response = await fetch(`/api/sleeper/import?username=${encodeURIComponent(username)}&season=${encodeURIComponent(season)}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to import Sleeper leagues.");
      setSleeperData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to import Sleeper leagues.");
    } finally {
      setLoading("");
    }
  }

  async function importYahoo() {
    setLoading("yahoo");
    setError("");
    setNotice("");
    setYahooData(null);
    try {
      const response = await fetch(`/api/yahoo/import?season=${encodeURIComponent(season)}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to import Yahoo leagues.");
      setYahooData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to import Yahoo leagues.");
    } finally {
      setLoading("");
    }
  }

  function selectLeague(league: ImportedLeague) {
    const rosterId = league.userRosterId ?? league.teams[0]?.rosterId ?? null;
    saveConnection(league, rosterId);
    router.push("/dashboard");
  }

  async function disconnectYahoo() {
    setLoading("disconnect");
    await fetch("/api/yahoo/disconnect", { method: "POST" });
    setYahooStatus({ connected: false });
    setYahooData(null);
    clearConnection();
    setNotice("Yahoo disconnected from this browser.");
    setLoading("");
  }

  const importedLeagues = [...(sleeperData?.leagues || []), ...(yahooData?.leagues || [])];

  return (
    <AppShell>
      <div className="page-heading"><div><span className="eyebrow">League import</span><h1>Connect your league</h1><p>Sleeper uses a public username. Yahoo uses secure authorization for private league data.</p></div></div>
      {(error || notice) && <div className={`connection-message ${error ? "error" : "success"}`}>{error || notice}</div>}

      <div className="provider-grid">
        <form className="panel connect-form provider-card" onSubmit={importSleeper}>
          <div className="provider-heading"><span className="provider-logo sleeper-logo">S</span><div><h2>Sleeper</h2><p>Public, read-only import</p></div></div>
          <label>Sleeper username<input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="your_username" required /></label>
          <label>Season<input value={season} onChange={(event) => setSeason(event.target.value)} inputMode="numeric" pattern="\d{4}" required /></label>
          <button className="button" disabled={Boolean(loading)}>{loading === "sleeper" ? "Importing…" : "Find Sleeper leagues"}</button>
          <p className="form-note">No password is requested. FantasyNextMove cannot submit lineup or roster changes.</p>
        </form>

        <section className="panel connect-form provider-card">
          <div className="provider-heading"><span className="provider-logo yahoo-logo">Y!</span><div><h2>Yahoo Fantasy</h2><p>{yahooStatus.connected ? `Connected${yahooStatus.user?.displayName ? ` as ${yahooStatus.user.displayName}` : ""}` : "OAuth-protected import"}</p></div></div>
          <label>Season<input value={season} onChange={(event) => setSeason(event.target.value)} inputMode="numeric" pattern="\d{4}" required /></label>
          {!yahooStatus.connected ? (
            <a className="button yahoo-button" href="/api/yahoo/connect">Connect Yahoo securely</a>
          ) : (
            <>
              <button className="button yahoo-button" onClick={importYahoo} disabled={Boolean(loading)}>{loading === "yahoo" ? "Importing…" : "Import Yahoo leagues"}</button>
              <button className="text-button" onClick={disconnectYahoo} disabled={Boolean(loading)}>{loading === "disconnect" ? "Disconnecting…" : "Disconnect Yahoo"}</button>
            </>
          )}
          <p className="form-note">Yahoo credentials never enter FantasyNextMove. Yahoo returns revocable access and refresh tokens after approval.</p>
        </section>
      </div>

      <section className="panel imported-panel">
        <div className="panel-heading"><div><span className="eyebrow">Imported leagues</span><h2>{importedLeagues.length ? `${importedLeagues.length} ready` : "Connect a provider"}</h2></div></div>
        {!importedLeagues.length && <div className="empty-state"><strong>Your leagues will appear here.</strong><p>Select one to open its dashboard, roster, Trade Lab, and historical Record Book.</p></div>}
        {importedLeagues.map((league) => (
          <button className="league-choice" key={`${league.provider}:${league.leagueId}`} onClick={() => selectLeague(league)}>
            <div><strong>{league.name}</strong><span>{league.provider === "yahoo" ? "Yahoo" : "Sleeper"} · {league.totalRosters} teams · {league.season}{league.userRosterId ? " · Your team found" : ""}</span></div><b>Open →</b>
          </button>
        ))}
      </section>
    </AppShell>
  );
}
