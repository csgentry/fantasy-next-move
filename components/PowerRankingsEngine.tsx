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
import type {
  ImportedLeague,
  LeagueProvider,
  PlayerIntelligencePayload,
  PlayerProfile,
  WeeklyTeamScore
} from "@/lib/types";

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
  return Array.from({ length: weeks }, (_, weekIndex) =>
    league.teams.map((team, teamIndex) => {
      const average = team.pointsFor / weeks;
      const wave = Math.sin((weekIndex + 1) * (teamIndex + 2) * 0.71) * 11;
      return {
        week: weekIndex + 1,
        rosterId: team.rosterId,
        matchupId: Math.floor(teamIndex / 2) + 1,
        points: Math.max(40, Number((average + wave).toFixed(2)))
      } satisfies WeeklyTeamScore;
    })
  ).flat();
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
  myRosterId,
  intelligence,
  intelligenceLoading = false,
  intelligenceError = ""
}: {
  league: ImportedLeague;
  source: LeagueProvider;
  myRosterId: number;
  intelligence?: PlayerIntelligencePayload | null;
  intelligenceLoading?: boolean;
  intelligenceError?: string;
}) {
  const profiles = useMemo(() => {
    if (source === "demo") return demoProfiles(league);
    return { ...embeddedProfiles(league), ...(intelligence?.profiles || {}) };
  }, [intelligence?.profiles, league, source]);
  const weeklyScores = useMemo(() => {
    if (source === "demo") return demoWeeklyScores(league);
    return intelligence?.weeklyScores || league.weeklyScores || [];
  }, [intelligence?.weeklyScores, league, source]);
  const snapshots = intelligence?.currentSnapshots || [];
  const [selectedRosterId, setSelectedRosterId] = useState(myRosterId);
  const [lens, setLens] = useState<PowerLens>("overall");

  useEffect(() => {
    setSelectedRosterId(myRosterId);
    setLens("overall");
  }, [league.leagueId, myRosterId]);

  const rankings = useMemo(
    () => buildPowerRankings(league, profiles, weeklyScores, snapshots),
    [league, profiles, snapshots, weeklyScores]
  );
  const sorted = useMemo(() => rankingsForLens(rankings, lens), [rankings, lens]);
  const selected = rankings.find((team) => team.rosterId === selectedRosterId) || rankings[0];
  const dynastyAvailable = league.leagueType === "dynasty" || league.leagueType === "keeper";
  if (!selected) return null;

  const warnings = intelligence?.warnings || [];
  const statusText = intelligenceLoading
    ? "Loading Sleeper projections, player stats, and weekly matchups…"
    : intelligenceError || warnings[0] || "";

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

      {statusText && <div className={`power-data-status${intelligenceError ? " error" : ""}`}>{statusText}</div>}

      <div className="power-analyzer-layout">
        <div className="power-table-wrap">
          <div className="power-table" role="table" aria-label={`${lens} power rankings`}>
            <div className="power-table-head" role="row">
              <span>Rank</span><span>Team</span><span>Score</span><span>Move</span><span>Proj</span><span>Exp W</span><span>Luck</span>
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
                  <span className="power-team-cell"><b>{team.teamName}</b><small>{team.ownerName}{isMine ? " · Your team" : ""}</small></span>
                  <span className="power-score-cell">{lensScore(team, lens)}</span>
                  <span className={`power-movement ${movement.className}`}>{movement.text}</span>
                  <span>{team.projectedStarterPoints === null ? "—" : team.projectedStarterPoints.toFixed(1)}</span>
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
            <div><span className="eyebrow">Why this rank</span><h3>{selected.teamName}</h3><p>{selected.ownerName} · {recordLabel(selected.wins, selected.losses, selected.ties)}</p></div>
            <div className="power-rank-badge"><span>Overall</span><strong>#{selected.overallRank}</strong><small>{selected.overallScore}/100</small></div>
          </div>

          <div className="power-metric-grid">
            <MetricCard label="Projected lineup" value={selected.projectedStarterPoints === null ? "N/A" : selected.projectedStarterPoints.toFixed(1)} detail={`${Math.round(selected.projectionCoverage * 100)}% projection coverage`} />
            <MetricCard label="Starters" value={`${selected.starterScore}`} detail={`#${selected.starterRank} in league`} />
            <MetricCard label="Bench" value={`${selected.benchScore}`} detail={`#${selected.benchRank} in league`} />
            <MetricCard label="Contender" value={`#${selected.contenderRank}`} detail={`${selected.contenderScore}/100`} />
            <MetricCard label="Dynasty" value={dynastyAvailable ? `#${selected.dynastyRank}` : "N/A"} detail={dynastyAvailable ? `${selected.dynastyScore}/100` : "Redraft league"} />
          </div>

          <div className="position-analysis">
            <div className="subsection-heading"><strong>Positional grades</strong><span>Indexed against the league leader</span></div>
            {POSITIONS.map((position) => {
              const metric = selected.positional[position];
              return (
                <div className="position-grade-row" key={position}>
                  <strong>{position}</strong>
                  <div className="position-grade-track"><i style={{ width: `${Math.max(4, metric.score)}%` }} /></div>
                  <span>{metric.grade}</span><small>#{metric.rank}</small>
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
            {selected.explanations.map((explanation, index) => <p key={explanation}><span>{index + 1}</span>{explanation}</p>)}
          </div>
        </aside>
      </div>

      <p className="power-method-note">
        Sleeper projections are recalculated under this league&apos;s scoring settings. Personalized Next Moves remain limited to the connected user&apos;s roster, while league-wide rankings and explanations are visible for every team.
      </p>
    </section>
  );
}
