import { cookies } from "next/headers";

// Uses Web Crypto (globalThis.crypto.subtle) instead of node:crypto so this
// file works both in API routes (Node runtime) and middleware (Edge runtime).

export const SESSION_COOKIE = "pantau_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 hari

export type Session =
  | { role: "admin"; exp: number }
  | { role: "team"; teamId: string; teamName: string; tokenId: string; exp: number };

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET belum diset di .env.local");
  return s;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function base64UrlToBytes(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (b64url.length % 4)) % 4);
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", new TextEncoder().encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}
async function sign(payload: string): Promise<string> {
  const key = await hmacKey();
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return bytesToBase64Url(new Uint8Array(sig));
}
async function verify(payload: string, sigB64url: string): Promise<boolean> {
  const key = await hmacKey();
  try {
    return await crypto.subtle.verify("HMAC", key, base64UrlToBytes(sigB64url) as BufferSource, new TextEncoder().encode(payload));
  } catch {
    return false;
  }
}

export async function encodeSession(session: Session): Promise<string> {
  const payload = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(session)));
  return `${payload}.${await sign(payload)}`;
}

export async function decodeSession(value: string | undefined | null): Promise<Session | null> {
  if (!value) return null;
  const [payload, sig] = value.split(".");
  if (!payload || !sig) return null;
  if (!(await verify(payload, sig))) return null;
  try {
    const session = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payload))) as Session;
    if (!session.exp || session.exp < Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

/** Read the current session from the request cookies (server components, route handlers). */
export async function getSession(): Promise<Session | null> {
  const value = cookies().get(SESSION_COOKIE)?.value;
  return decodeSession(value);
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  };
}

export function newExpiry(): number {
  return Date.now() + MAX_AGE_SECONDS * 1000;
}
