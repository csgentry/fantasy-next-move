import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";

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
  if (!clientId || !clientSecret || !cookieSecret) {
    throw new Error("Yahoo is not configured. Add YAHOO_CLIENT_ID, YAHOO_CLIENT_SECRET, and FNM_COOKIE_SECRET.");
  }
  return { clientId, clientSecret, cookieSecret };
}

export function callbackUrl(origin: string) {
  return process.env.YAHOO_REDIRECT_URI?.trim() || `${origin}/api/yahoo/callback`;
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

export async function storeYahooToken(token: YahooToken) {
  const jar = await cookies();
  jar.set(TOKEN_COOKIE, encrypt(token), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
}

export async function clearYahooToken() {
  const jar = await cookies();
  jar.delete(TOKEN_COOKIE);
}

async function readYahooToken() {
  const jar = await cookies();
  const raw = jar.get(TOKEN_COOKIE)?.value;
  if (!raw) return null;
  try {
    return decrypt(raw);
  } catch {
    jar.delete(TOKEN_COOKIE);
    return null;
  }
}

async function tokenRequest(body: URLSearchParams): Promise<YahooTokenResponse> {
  const { clientId, clientSecret } = yahooConfig();
  const response = await fetch("https://api.login.yahoo.com/oauth2/get_token", {
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
    throw new Error(payload.error_description || payload.error || `Yahoo token request failed (${response.status}).`);
  }
  return payload;
}

export async function exchangeYahooCode(code: string, redirectUri: string) {
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
  await storeYahooToken(token);
  return token;
}

async function refreshYahooToken(token: YahooToken) {
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
  await storeYahooToken(refreshed);
  return refreshed;
}

export async function getValidYahooToken() {
  const token = await readYahooToken();
  if (!token) return null;
  if (token.expiresAt > Date.now()) return token;
  try {
    return await refreshYahooToken(token);
  } catch {
    await clearYahooToken();
    return null;
  }
}
