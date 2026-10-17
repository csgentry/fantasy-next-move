import type { ImportedLeague, LeagueTeam, Recommendation } from "./types";

export function rankTeams(league: ImportedLeague) {
  return [...league.teams]
    .map((team) => ({
      ...team,
      winPct: (team.wins + team.ties * 0.5) / Math.max(team.wins + team.losses + team.ties, 1),
      pointDiff: team.pointsFor - team.pointsAgainst,
      powerScore: team.wins * 11 + team.ties * 5 + team.pointsFor / 20 + (team.pointsFor - team.pointsAgainst) / 30
    }))
    .sort((a, b) => b.powerScore - a.powerScore)
    .map((team, index) => ({ ...team, rank: index + 1 }));
}

export function contenderScore(team: LeagueTeam, league: ImportedLeague) {
  const teams = rankTeams(league);
  const ranked = teams.find((candidate) => candidate.rosterId === team.rosterId);
  if (!ranked) return 50;
  const percentile = 1 - (ranked.rank - 1) / Math.max(league.teams.length - 1, 1);
  const scoring = Math.min(1, team.pointsFor / Math.max(...league.teams.map((item) => item.pointsFor), 1));
  return Math.round((percentile * 0.55 + scoring * 0.45) * 100);
}

export function recommendationsFor(team: LeagueTeam, league: ImportedLeague): Recommendation[] {
  const leagueAverage = league.teams.reduce((sum, item) => sum + item.pointsFor, 0) / Math.max(league.teams.length, 1);
  const recs: Recommendation[] = [];

  if (team.pointsFor < leagueAverage) {
    recs.push({
      title: "Shop for a weekly ceiling upgrade",
      reason: `Your scoring is ${(leagueAverage - team.pointsFor).toFixed(2)} points below the league average. Review starter projections and injuries before deciding whether a trade is justified.`,
      impact: "High",
      category: "Trade"
    });
  } else {
    recs.push({
      title: "Protect your starting advantage",
      reason: "Your scoring profile is already above league average. Avoid unnecessary two-for-one trades that reduce lineup quality.",
      impact: "High",
      category: "Strategy"
    });
  }

  if (team.pointsAgainst > leagueAverage) {
    recs.push({
      title: "Do not overreact to the record",
      reason: "You have faced above-average scoring. Judge the roster by points and lineup strength, not only wins and losses.",
      impact: "Medium",
      category: "Strategy"
    });
  }

  if (team.wins + team.losses + team.ties === 0) return [{
    title: "Review your starting lineup",
    reason: "No completed matchups are available. Check current injuries and starter eligibility before making a trade; standings alone cannot identify a positional upgrade.",
    impact: "Medium", category: "Strategy"
  }];

  return recs;
}
