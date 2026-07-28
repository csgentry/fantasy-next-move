import type { ImportedLeague, LeagueHistoryPayload, LeagueProvider, StoredConnection } from "./types";

export const CONNECTION_KEY = "fnm:connection:v1";
export const HISTORY_KEY = "fnm:history:v1";

export function saveConnection(league: ImportedLeague, selectedRosterId?: number | null) {
  const payload: StoredConnection = {
    league,
    source: league.provider,
    selectedRosterId: selectedRosterId ?? league.userRosterId ?? league.teams[0]?.rosterId ?? null,
    storedAt: new Date().toISOString()
  };
  window.localStorage.setItem(CONNECTION_KEY, JSON.stringify(payload));
}

export function loadConnection(): StoredConnection | null {
  const raw = window.localStorage.getItem(CONNECTION_KEY);
  if (!raw) return null;
  const parsed = JSON.parse(raw) as StoredConnection;
  if (!parsed?.league?.leagueId || !Array.isArray(parsed.league.teams)) return null;
  return parsed;
}

export function clearConnection() {
  window.localStorage.removeItem(CONNECTION_KEY);
}

export function saveHistory(payload: LeagueHistoryPayload) {
  const all = loadAllHistory();
  all[`${payload.provider}:${payload.currentLeagueId}`] = payload;
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(all));
}

export function loadHistory(provider: LeagueProvider, leagueId: string): LeagueHistoryPayload | null {
  const all = loadAllHistory();
  return all[`${provider}:${leagueId}`] ?? null;
}

function loadAllHistory(): Record<string, LeagueHistoryPayload> {
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) as Record<string, LeagueHistoryPayload> : {};
  } catch {
    return {};
  }
}
