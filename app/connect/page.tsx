"use client";

import {trackProductEvent} from "@/lib/product-events";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { saveLeagueToAccount } from "@/lib/account-storage";
import type { ImportedLeague, SleeperImportPayload } from "@/lib/types";

function leagueTypeLabel(type: ImportedLeague["leagueType"]) {
  if (type === "dynasty") return "Dynasty";
  if (type === "keeper") return "Keeper";
  return "Redraft";
}

export default function ConnectPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [season, setSeason] = useState(String(new Date().getFullYear()));
  const [sleeperData, setSleeperData] = useState<SleeperImportPayload | null>(null);
  const [loading, setLoading] = useState<"sleeper" | "saving" | "">("");
  const [error, setError] = useState("");
  const [pendingLeague,setPendingLeague]=useState<ImportedLeague|null>(null);

  async function importSleeper(event: FormEvent) {
    event.preventDefault();
    void trackProductEvent("provider_connection_started");
    setLoading("sleeper");
    setError("");
    setSleeperData(null);

    try {
      const response = await fetch(
        "/api/sleeper/import", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username,season})}
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Unable to import Sleeper leagues.");
      }
      setSleeperData(payload);
      void trackProductEvent("provider_connected");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to import Sleeper leagues."
      );
    } finally {
      setLoading("");
    }
  }

  async function selectLeague(league: ImportedLeague, selectedRosterId?:number) {
    if(league.userRosterId===null && selectedRosterId===undefined){setPendingLeague(league);return;}
    const rosterId = selectedRosterId ?? league.userRosterId;
    setLoading("saving");
    setError("");

    try {
      await saveLeagueToAccount(league, rosterId);
      void trackProductEvent("league_selected");
      router.push("/dashboard");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save this league to your account."
      );
      setLoading("");
    }
  }

  const importedLeagues = sleeperData?.leagues || [];

  return (
    <AppShell>
      <div className="page-heading">
        <div>
          <span className="eyebrow">League import</span>
          <h1>Connect your league</h1>
          <p>
            Sleeper is available now through a public, read-only username
            import. Yahoo support is coming soon.
          </p>
        </div>
      </div>

      {error && (
        <div aria-live="polite" className="connection-message error">
          {error}
        </div>
      )}

      {pendingLeague && <section className="panel"><h2>Choose your team</h2><p>{pendingLeague.name}</p>{pendingLeague.teams.map(team=><button className="button secondary" key={team.rosterId} disabled={Boolean(loading)} onClick={()=>selectLeague(pendingLeague,team.rosterId)}>{team.teamName}</button>)}</section>}
      <div className="provider-grid">
        <form className="panel connect-form provider-card" onSubmit={importSleeper}>
          <div className="provider-heading">
            <span className="provider-logo sleeper-logo">S</span>
            <div>
              <h2>Sleeper</h2>
              <p>Available now · Public, read-only import</p>
            </div>
          </div>
          <label>
            Sleeper username
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="your_username"
              required
            />
          </label>
          <label>
            Season
            <input
              value={season}
              onChange={(event) => setSeason(event.target.value)}
              inputMode="numeric"
              pattern="[0-9]{4}"
              required
            />
          </label>
          <button className="button" disabled={Boolean(loading)}>
            {loading === "sleeper" ? "Importing…" : "Find Sleeper leagues"}
          </button>
          <p className="form-note">
            No password is requested. FantasyNextMove cannot submit lineup,
            waiver, trade, or commissioner changes.
          </p>
        </form>

        <section

          className="panel connect-form provider-card provider-card-disabled"
        >
          <div className="provider-heading">
            <span className="provider-logo yahoo-logo">Y!</span>
            <div>
              <h2>Yahoo Fantasy</h2>
              <p>Coming soon</p>
            </div>
          </div>
          <div className="coming-soon-copy">
            <span className="pill">Activation verification pending</span>
            <p>
              Yahoo connection remains disabled while we verify API activation
              and complete compliant, temporary league processing.
            </p>
          </div>
          <button className="button secondary" disabled type="button">
            Yahoo connection unavailable
          </button>
          <p className="form-note">
            Existing Yahoo infrastructure remains secured on the server, but
            beta users cannot start a new Yahoo connection.
          </p>
        </section>
      </div>

      <section className="panel imported-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Imported leagues</span>
            <h2>
              {importedLeagues.length
                ? `${importedLeagues.length} ready`
                : "Connect Sleeper"}
            </h2>
          </div>
        </div>
        {!importedLeagues.length && (
          <div className="empty-state">
            <strong>Your Sleeper leagues will appear here.</strong>
            <p>
              Select a league to see your Next Move and team analysis.
            </p>
          </div>
        )}
        {importedLeagues.map((league) => (
          <button
            className="league-choice"
            disabled={Boolean(loading)}
            key={`${league.provider}:${league.leagueId}`}
            onClick={() => selectLeague(league)}
          >
            <div>
              <strong>{league.name}</strong>
              <span>
                Sleeper · {leagueTypeLabel(league.leagueType)} ·{" "}
                {league.totalRosters} teams · {league.season}
                {league.userRosterId ? " · Your team found" : ""}
                {league.leagueType === "dynasty" && league.draftPicks?.length
                  ? ` · ${league.draftPicks.length} picks tracked`
                  : ""}
              </span>
            </div>
            <b>{loading === "saving" ? "Saving…" : "Open →"}</b>
          </button>
        ))}
      </section>
    </AppShell>
  );
}
