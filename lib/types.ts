export type LeagueProvider = "demo" | "sleeper" | "yahoo";
export type LeagueType = "redraft" | "keeper" | "dynasty";

export type PlayerProfile = {
  playerId: string;
  fullName: string;
  position: string;
  team: string | null;
  status: string | null;
  selectedPosition?: string | null;
  age?: number | null;
  yearsExperience?: number | null;
  searchRank?: number | null;
  depthChartPosition?: number | null;
  injuryStatus?: string | null;
  practiceParticipation?: string | null;
};

export type DraftPickAsset = {
  id: string;
  provider: LeagueProvider;
  season: string;
  round: number;
  originalRosterId: number;
  ownerRosterId: number;
  previousOwnerRosterId?: number | null;
  originalTeamName?: string | null;
  draftSlot?: number | null;
};

export type WeeklyTeamScore = {
  week: number;
  rosterId: number;
  matchupId: number | null;
  points: number;
};

export type LeagueTeam = {
  rosterId: number;
  providerTeamKey?: string | null;
  ownerId: string | null;
  ownerName: string;
  teamName: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  rank?: number | null;
  players: string[];
  starters: string[];
  playerProfiles?: Record<string, PlayerProfile>;
};

export type ImportedLeague = {
  provider: LeagueProvider;
  leagueId: string;
  providerLeagueKey?: string | null;
  name: string;
  season: string;
  status: string;
  totalRosters: number;
  scoringSettings: Record<string, number>;
  rosterPositions: string[];
  previousLeagueId: string | null;
  userRosterId: number | null;
  leagueType?: LeagueType;
  draftPicks?: DraftPickAsset[];
  weeklyScores?: WeeklyTeamScore[];
  teams: LeagueTeam[];
};

export type SleeperImportPayload = {
  provider: "sleeper";
  user: {
    userId: string;
    username: string;
    displayName: string;
    avatar: string | null;
  };
  season: string;
  leagues: ImportedLeague[];
};

export type YahooImportPayload = {
  provider: "yahoo";
  user: {
    userId: string;
    displayName: string;
    email?: string | null;
    avatar?: string | null;
  };
  season: string;
  leagues: ImportedLeague[];
};

export type Recommendation = {
  title: string;
  reason: string;
  impact: "High" | "Medium" | "Low";
  category: "Trade" | "Waiver" | "Lineup" | "Strategy";
};

export type HistoricalSeason = {
  provider: LeagueProvider;
  leagueId: string;
  leagueName: string;
  season: string;
  championOwnerId: string | null;
  champion: string | null;
  championTeam: string | null;
  runnerUpOwnerId: string | null;
  runnerUp: string | null;
  runnerUpTeam: string | null;
  teams: LeagueTeam[];
};

export type LeagueHistoryPayload = {
  provider: LeagueProvider;
  currentLeagueId: string;
  seasons: HistoricalSeason[];
  warnings?: string[];
};

export type NumericStatLine = Record<string, number>;

export type FantasyScoringContribution = {
  key: string;
  label: string;
  statValue: number;
  multiplier: number;
  points: number;
};

export type FantasyScoreResult = {
  total: number;
  contributions: FantasyScoringContribution[];
};

export type PlayerWeeklySnapshot = {
  playerId: string;
  playerName: string;
  season: number;
  week: number;
  seasonType: string;
  position: string;
  nflTeam: string | null;
  rosterId: number | null;
  rostered: boolean;
  starter: boolean;
  projectionStats: NumericStatLine;
  actualStats: NumericStatLine;
  projectedPoints: number | null;
  actualPoints: number | null;
  projectionError: number | null;
  absoluteError: number | null;
  previousProjectedPoints?: number | null;
  previousActualPoints?: number | null;
  recentError?: number | null;
  syncedAt: string;
};

export type ProjectionAccuracy = {
  week: number | null;
  sampleSize: number;
  meanAbsoluteError: number | null;
  rootMeanSquaredError: number | null;
  bias: number | null;
  withinThreePointsPct: number | null;
  withinFivePointsPct: number | null;
};

export type PlayerIntelligencePayload = {
  provider: "sleeper";
  leagueId: string;
  season: number;
  projectionWeek: number;
  latestCompletedWeek: number;
  seasonType: string;
  profiles: Record<string, PlayerProfile>;
  currentSnapshots: PlayerWeeklySnapshot[];
  accuracySnapshots: PlayerWeeklySnapshot[];
  weeklyScores: WeeklyTeamScore[];
  accuracy: ProjectionAccuracy;
  storedWeeks: number[];
  storageStatus: "saved" | "migration-required" | "unavailable";
  syncedAt: string;
  warnings: string[];
};

export type PlayerRecommendation = {
  id: string;
  title: string;
  reason: string;
  category: "Lineup" | "Waiver" | "Trade" | "Strategy";
  impact: "High" | "Medium" | "Low";
  confidence: "High" | "Medium" | "Limited";
  playerId?: string;
  playerName?: string;
  projectedGain?: number | null;
  targetRosterId?: number | null;
  targetTeamName?: string | null;
};
