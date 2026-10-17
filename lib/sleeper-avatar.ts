// Sleeper avatar IDs and league-specific upload URLs use its own image CDN.
export function sleeperAvatarUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const candidate = value.trim();
  if (/^[a-f0-9]{32}$/i.test(candidate)) return `https://sleepercdn.com/avatars/thumbs/${candidate}`;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:" || url.hostname !== "sleepercdn.com" || url.port || url.username || url.password || url.search || url.hash) return null;
    return /^\/(?:uploads\/[a-f0-9]{32}\.(?:png|jpe?g|webp|gif)|avatars\/(?:thumbs\/)?[a-f0-9]{32})$/i.test(url.pathname) ? url.href : null;
  } catch { return null; }
}
