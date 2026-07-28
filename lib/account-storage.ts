import type { ImportedLeague, LeagueHistoryPayload } from "./types";

export async function saveLeagueToAccount(league: ImportedLeague, selectedRosterId: number | null) {
  const response = await fetch("/api/account/leagues", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ league, selectedRosterId })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Unable to save the league to your account.");
}

export async function loadActiveLeagueFromAccount() {
  const response = await fetch("/api/account/leagues?active=1", { cache: "no-store" });
  if (response.status === 401) return null;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Unable to load your saved league.");
  return payload.league ? { league: payload.league as ImportedLeague, selectedRosterId: payload.selectedRosterId as number | null } : null;
}

export async function closeActiveLeagueInAccount() {
  const response = await fetch("/api/account/leagues", { method: "DELETE" });
  if (!response.ok && response.status !== 401) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "Unable to close the saved league.");
  }
}

export async function saveHistoryToAccount(history: LeagueHistoryPayload) {
  const response = await fetch("/api/account/history", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ history })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Unable to save league history.");
}

export async function loadHistoryFromAccount(provider: string, leagueId: string) {
  const params = new URLSearchParams({ provider, leagueId });
  const response = await fetch(`/api/account/history?${params}`, { cache: "no-store" });
  if (response.status === 401 || response.status === 404) return null;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Unable to load saved history.");
  return payload.history as LeagueHistoryPayload;
}

export type SavedLeagueRecord = {
  id: string;
  provider: string;
  name: string;
  season: number;
  raw_data: ImportedLeague;
  selected_roster_id: number | null;
  is_active: boolean;
  synced_at: string;
};

export async function loadSavedLeaguesFromAccount() {
  const response = await fetch("/api/account/leagues?all=1", { cache: "no-store" });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Unable to load saved leagues.");
  return (payload.leagues || []) as SavedLeagueRecord[];
}
