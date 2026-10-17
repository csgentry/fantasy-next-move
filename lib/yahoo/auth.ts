import "server-only";
import { yahooConnectionEnabled } from "./availability";
import { fetchWithBackoff } from "./retry";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

const TOKEN_COOKIE = "fnm_yahoo_token";
const STATE_COOKIE = "fnm_yahoo_state";

export type YahooToken = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  tokenType: string;
  redirectUri: string;
};

type YahooTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type?: string;
};

export function yahooConfig() {
  const clientId = process.env.YAHOO_CLIENT_ID?.trim();
  const clientSecret = process.env.YAHOO_CLIENT_SECRET?.trim();
  const cookieSecret = process.env.FNM_COOKIE_SECRET?.trim();
  if (!clientId || !clientSecret || !cookieSecret || cookieSecret.length < 32) {
    throw new Error("Yahoo is not configured. Add YAHOO_CLIENT_ID, YAHOO_CLIENT_SECRET, and FNM_COOKIE_SECRET.");
  }
  return { clientId, clientSecret, cookieSecret };
}

export function callbackUrl(origin: string) {
  const uri = new URL(process.env.YAHOO_REDIRECT_URI?.trim() || `${origin}/api/yahoo/callback`);
  if (uri.origin !== origin || uri.pathname !== "/api/yahoo/callback" || uri.search || uri.hash || uri.username || uri.password) throw new Error("Yahoo callback does not match this Preview.");
  return uri.toString();
}

function encryptionKey() {
  return createHash("sha256").update(yahooConfig().cookieSecret).digest();
}

function encrypt(value: YahooToken) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

function decrypt(value: string): YahooToken {
  const packed = Buffer.from(value, "base64url");
  const iv = packed.subarray(0, 12);
  const tag = packed.subarray(12, 28);
  const encrypted = packed.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  const result = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  return JSON.parse(result) as YahooToken;
}

function isYahooConfigurationError(error: unknown) {
  return error instanceof Error && error.message.startsWith("Yahoo is not configured.");
}

async function persistYahooCredential(userId: string, encryptedToken: string) {
  const admin = createAdminClient();
  const { error } = await admin.from("provider_credentials").upsert({
    user_id: userId,
    provider: "yahoo",
    encrypted_token: encryptedToken,
    updated_at: new Date().toISOString()
  }, { onConflict: "user_id,provider" });
  if (error) throw error;
}

export async function setYahooState(state: string) {
  const jar = await cookies();
  jar.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60
  });
}

export async function consumeYahooState() {
  const jar = await cookies();
  const value = jar.get(STATE_COOKIE)?.value ?? null;
  jar.delete(STATE_COOKIE);
  return value;
}

export async function storeYahooToken(token: YahooToken, userId?: string) {
  const encryptedToken = encrypt(token);
  if (userId) await persistYahooCredential(userId, encryptedToken);
}

export async function clearYahooToken(userId?: string) {
  const jar = await cookies();
  jar.delete(TOKEN_COOKIE);
  if (userId) {
    const admin = createAdminClient();
    const { error } = await admin.from("provider_credentials").delete().eq("user_id", userId).eq("provider", "yahoo");
    if (error) throw error;
  }
}

async function readYahooToken(userId?: string) {
  // Credential ownership comes exclusively from the authenticated account.
  // Never migrate a browser token to the currently signed-in user.
  if (!userId) return null;
  const admin = createAdminClient();
  const { data, error } = await admin.from("provider_credentials")
    .select("encrypted_token")
    .eq("user_id", userId)
    .eq("provider", "yahoo")
    .maybeSingle();
  if (error) throw error;
  if (!data?.encrypted_token) return null;
  try {
    const token = decrypt(data.encrypted_token);
    return token;
  } catch (error) {
    if (isYahooConfigurationError(error)) throw error;
    await admin.from("provider_credentials").delete().eq("user_id", userId).eq("provider", "yahoo");
    return null;
  }
}

async function tokenRequest(body: URLSearchParams): Promise<YahooTokenResponse> {
  const { clientId, clientSecret } = yahooConfig();
  const response = await fetchWithBackoff("https://api.login.yahoo.com/oauth2/get_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body,
    cache: "no-store"
  });
  const payload = await response.json() as YahooTokenResponse & { error?: string; error_description?: string };
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error === "invalid_grant" ? "Yahoo authorization expired. Reconnect Yahoo." : "Yahoo authorization is temporarily unavailable. Try again.");
  }
  return payload;
}

export async function exchangeYahooCode(code: string, redirectUri: string, userId?: string) {
  const payload = await tokenRequest(new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri
  }));
  const token: YahooToken = {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token || "",
    expiresAt: Date.now() + Math.max(payload.expires_in - 60, 60) * 1000,
    tokenType: payload.token_type || "bearer",
    redirectUri
  };
  await storeYahooToken(token, userId);
  return token;
}

async function refreshYahooToken(token: YahooToken, userId?: string) {
  if (!token.refreshToken) throw new Error("Yahoo refresh token is missing. Reconnect Yahoo.");
  const payload = await tokenRequest(new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: token.refreshToken,
    redirect_uri: token.redirectUri
  }));
  const refreshed: YahooToken = {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token || token.refreshToken,
    expiresAt: Date.now() + Math.max(payload.expires_in - 60, 60) * 1000,
    tokenType: payload.token_type || token.tokenType || "bearer",
    redirectUri: token.redirectUri
  };
  await storeYahooToken(refreshed, userId);
  return refreshed;
}

export async function getValidYahooToken(userId?: string) {
  if (!yahooConnectionEnabled()) return null;
  const token = await readYahooToken(userId);
  if (!token) return null;
  if (token.expiresAt > Date.now()) return token;
  try {
    return await refreshYahooToken(token, userId);
  } catch (error) {
    if (error instanceof Error && error.message === "Yahoo authorization expired. Reconnect Yahoo.") {
      await clearYahooToken(userId);
      return null;
    }
    throw error;
  }
}
