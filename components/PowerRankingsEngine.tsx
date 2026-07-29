"use client";

import { useEffect, useMemo, useState } from "react";
import { demoPlayerPositions } from "@/lib/demo-data";
import {
  buildPowerRankings,
  rankingsForLens,
  type PowerLens,
  type PowerPosition,
  type PowerRankingTeam
} from "@/lib/power-rankings";
import type { ImportedLeague, LeagueProvider, PlayerProfile, WeeklyTeamScore } from "@/lib/types";

const POSITIONS: PowerPosition[] = ["QB", "RB", "WR", "TE"];

function recordLabel(wins: number, losses: number, ties: number) {
  return `${wins}-${losses}${ties ? `-${ties}` : ""}`;
}

function allPlayLabel(team: PowerRankingTeam) {
  if (!team.completedWeeks) return "Not available";
  return `${team.allPlayWins}-${team.allPlayLosses}${team.allPlayTies ? `-${team.allPlayTies}` : ""}`;
}

function movementLabel(team: PowerRankingTeam) {
  if (team.movement === null) return { text: "New", className: "neutral" };
  if (team.movement > 0) return { text: `▲ ${team.movement}`, className: "up" };
  if (team.movement < 0) return { text: `▼ ${Math.abs(team.movement)}`, className: "down" };
  return { text: "—", className: "neutral" };
}

function lensScore(team: PowerRankingTeam, lens: PowerLens) {
  if (lens === "contender") return team.contenderScore;
  if (lens === "dynasty") return team.dynastyScore;
  return team.overallScore;
}

function lensRank(team: PowerRankingTeam, lens: PowerLens) {
  if (lens === "contender") return team.contenderRank;
  if (lens === "dynasty") return team.dynastyRank;
  return team.overallRank;
}

function embeddedProfiles(league: ImportedLeague) {
  return league.teams.reduce<Record<string, PlayerProfile>>((result, team) => {
    Object.assign(result, team.playerProfiles || {});
    return result;
  }, {});
}

function demoProfiles(league: ImportedLeague) {
  const ids = [...new Set(league.teams.flatMap((team) => team.players))];
  return ids.reduce<Record<string, PlayerProfile>>((result, playerId, index) => {
    const position = demoPlayerPositions[playerId] || "—";
    const ageBase = position === "QB" ? 27 : position === "TE" ? 25 : 24;
    result[playerId] = {
      playerId,
      fullName: playerId,
      position,
      team: null,
      status: "Active",
      age: ageBase + (index % 6),
      yearsExperience: 2 + (index % 7),
      searchRank: index + 1
    };
    return result;
  }, {});
}

function demoWeeklyScores(league: ImportedLeague): WeeklyTeamScore[] {
  const weeks = Math.max(...league.teams.map((team) => team.wins + team.losses + team.ties), 0);
  if (!weeks) return [];
  return Array.from({ length: weeks }, (_, weekIndex) => {
    return league.teams.map((team, teamIndex) => {
      const average = team.pointsFor / weeks;
      const wave = Math.sin((weekIndex + 1) * (teamIndex + 2) * 0.71) * 11;
      const matchupId = Math.floor(teamIndex / 2) + 1;
      return {
        week: weekIndex + 1,
        rosterId: team.rosterId,
        matchupId,
        points: Math.max(40, Number((average + wave).toFixed(2)))
      } satisfies WeeklyTeamScore;
    });
  }).flat();
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="power-metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

export function PowerRankingsEngine({
  league,
  source,
  myRosterId
}: {
  league: ImportedLeague;
  source: LeagueProvider;
  myRosterId: number;
}) {
  const initialProfiles = useMemo(() => source === "demo" ? demoProfiles(league) : embeddedProfiles(league), [league, source]);
  const initialScores = useMemo(() => source === "demo" ? demoWeeklyScores(league) : league.weeklyScores || [], [league, source]);
  const [profiles, setProfiles] = useState<Record<string, PlayerProfile>>(initialProfiles);
  const [weeklyScores, setWeeklyScores] = useState<WeeklyTeamScore[]>(initialScores);
  const [selectedRosterId, setSelectedRosterId] = useState(myRosterId);
  const [lens, setLens] = useState<PowerLens>("overall");
  const [loading, setLoading] = useState(source === "sleeper");
  const [dataNote, setDataNote] = useState("");

  useEffect(() => {
    setProfiles(initialProfiles);
    setWeeklyScores(initialScores);
    setSelectedRosterId(myRosterId);
    setLens("overall");
  }, [initialProfiles, initialScores, league.leagueId, myRosterId]);

  useEffect(() => {
    if (source !== "sleeper") {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;
    const ids = [...new Set(league.teams.flatMap((team) => team.players))].slice(0, 500);
    setLoading(true);
    setDataNote("");

    Promise.allSettled([
      fetch("/api/sleeper/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
        signal: controller.signal
      }).then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Unable to load league player data.");
        return payload as { players: Record<string, PlayerProfile> };
      }),
      fetch(`/api/sleeper/power-data?leagueId=${encodeURIComponent(league.leagueId)}`, {
        cache: "no-store",
        signal: controller.signal
      }).then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Unable to load weekly matchup data.");
        return payload as { weeklyScores: WeeklyTeamScore[]; completedWeek: number };
      })
    ]).then(([playerResult, scoreResult]) => {
      if (cancelled) return;
      const notes: string[] = [];
      if (playerResult.status === "fulfilled") {
        setProfiles({ ...embeddedProfiles(league), ...playerResult.value.players });
      } else if (!(playerResult.reason instanceof DOMException && playerResult.reason.name === "AbortError")) {
        notes.push(playerResult.reason instanceof Error ? playerResult.reason.message : "Player data is partially unavailable.");
      }
      if (scoreResult.status === "fulfilled") {
        setWeeklyScores(scoreResult.value.weeklyScores || []);
      } else if (!(scoreResult.reason instanceof DOMException && scoreResult.reason.name === "AbortError")) {
        notes.push(scoreResult.reason instanceof Error ? scoreResult.reason.message : "Weekly matchup data is partially unavailable.");
      }
      setDataNote(notes.join(" "));
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [league, source]);

  const rankings = useMemo(() => buildPowerRankings(league, profiles, weeklyScores), [league, profiles, weeklyScores]);
  const sorted = useMemo(() => rankingsForLens(rankings, lens), [rankings, lens]);
  const selected = rankings.find((team) => team.rosterId === selectedRosterId) || rankings[0];
  const dynastyAvailable = league.leagueType === "dynasty" || league.leagueType === "keeper";

  if (!selected) return null;

  return (
    <section className="panel power-engine">
      <div className="power-engine-heading">
        <div>
          <span className="eyebrow">League Analyzer</span>
          <h2>Power Rankings Engine</h2>
          <p>Compare every roster, then select a team to see exactly what drives its rank.</p>
        </div>
        <div className="power-tabs" role="tablist" aria-label="Power ranking view">
          <button className={lens === "overall" ? "active" : ""} onClick={() => setLens("overall")}>Overall</button>
          <button className={lens === "contender" ? "active" : ""} onClick={() => setLens("contender")}>Contender</button>
          {dynastyAvailable && <button className={lens === "dynasty" ? "active" : ""} onClick={() => setLens("dynasty")}>Dynasty</button>}
        </div>
      </div>

      {(loading || dataNote) && (
        <div className="power-data-status">
          {loading ? "Loading complete roster and weekly matchup data…" : dataNote}
        </div>
      )}

      <div className="power-analyzer-layout">
        <div className="power-table-wrap">
          <div className="power-table" role="table" aria-label={`${lens} power rankings`}>
            <div className="power-table-head" role="row">
              <span>Rank</span>
              <span>Team</span>
              <span>Score</span>
              <span>Move</span>
              <span>All-play</span>
              <span>Exp W</span>
              <span>Luck</span>
            </div>
            {sorted.map((team) => {
              const movement = movementLabel(team);
              const isSelected = team.rosterId === selected.rosterId;
              const isMine = team.rosterId === myRosterId;
              return (
                <button
                  className={`power-table-row${isSelected ? " selected" : ""}${isMine ? " mine" : ""}`}
                  key={team.rosterId}
                  onClick={() => setSelectedRosterId(team.rosterId)}
                  type="button"
                >
                  <strong>#{lensRank(team, lens)}</strong>
                  <span className="power-team-cell">
                    <b>{team.teamName}</b>
                    <small>{team.ownerName}{isMine ? " · Your team" : ""}</small>
                  </span>
                  <span className="power-score-cell">{lensScore(team, lens)}</span>
                  <span className={`power-movement ${movement.className}`}>{movement.text}</span>
                  <span>{allPlayLabel(team)}</span>
                  <span>{team.expectedWins.toFixed(1)}</span>
                  <span className={team.luckRating > 0.55 ? "luck-positive" : team.luckRating < -0.55 ? "luck-negative" : ""}>
                    {team.luckRating >= 0 ? "+" : ""}{team.luckRating.toFixed(1)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <aside className="power-inspector">
          <div className="power-inspector-title">
            <div>
              <span className="eyebrow">Why this rank</span>
              <h3>{selected.teamName}</h3>
              <p>{selected.ownerName} · {recordLabel(selected.wins, selected.losses, selected.ties)}</p>
            </div>
            <div className="power-rank-badge">
              <span>Overall</span>
              <strong>#{selected.overallRank}</strong>
              <small>{selected.overallScore}/100</small>
            </div>
          </div>

          <div className="power-metric-grid">
            <MetricCard label="Starters" value={`${selected.starterScore}`} detail={`#${selected.starterRank} in league`} />
            <MetricCard label="Bench" value={`${selected.benchScore}`} detail={`#${selected.benchRank} in league`} />
            <MetricCard label="Contender" value={`#${selected.contenderRank}`} detail={`${selected.contenderScore}/100`} />
            <MetricCard label="Dynasty" value={dynastyAvailable ? `#${selected.dynastyRank}` : "N/A"} detail={dynastyAvailable ? `${selected.dynastyScore}/100` : "Redraft league"} />
          </div>

          <div className="position-analysis">
            <div className="subsection-heading">
              <strong>Positional grades</strong>
              <span>Indexed against the league leader</span>
            </div>
            {POSITIONS.map((position) => {
              const metric = selected.positional[position];
              return (
                <div className="position-grade-row" key={position}>
                  <strong>{position}</strong>
                  <div className="position-grade-track"><i style={{ width: `${Math.max(4, metric.score)}%` }} /></div>
                  <span>{metric.grade}</span>
                  <small>#{metric.rank}</small>
                </div>
              );
            })}
          </div>

          <div className="power-record-grid">
            <div><span>All-play record</span><strong>{allPlayLabel(selected)}</strong></div>
            <div><span>Expected wins</span><strong>{selected.expectedWins.toFixed(1)}</strong></div>
            <div><span>Luck rating</span><strong>{selected.luckRating >= 0 ? "+" : ""}{selected.luckRating.toFixed(1)}</strong><small>{selected.luckLabel}</small></div>
            <div><span>Confidence</span><strong>{selected.confidence}</strong><small>{Math.round(selected.playerCoverage * 100)}% roster coverage</small></div>
          </div>

          <div className="rank-explanations">
            <div className="subsection-heading"><strong>Ranking explanation</strong><span>League context, not private advice</span></div>
            {selected.explanations.map((explanation, index) => (
              <p key={explanation}><span>{index + 1}</span>{explanation}</p>
            ))}
          </div>
        </aside>
      </div>

      <p className="power-method-note">
        Scores are relative to this league. Personalized Next Moves remain limited to the connected user&apos;s roster, while league-wide rankings and roster explanations are visible for every team.
      </p>
    </section>
  );
}
