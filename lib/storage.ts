// FantasyNextMove used browser-only league persistence in early prototypes.
// Account-owned Supabase storage replaced it in the invite-only beta. This
// helper removes legacy browser records so signed-out visitors cannot reopen
// real league data left behind by an older build.
export const LEGACY_CONNECTION_KEY = "fnm:connection:v1";
export const LEGACY_HISTORY_KEY = "fnm:history:v1";

export function clearLegacyBrowserData() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LEGACY_CONNECTION_KEY);
    window.localStorage.removeItem(LEGACY_HISTORY_KEY);
  } catch {
    // Storage may be unavailable in hardened or private browser contexts.
  }
}
