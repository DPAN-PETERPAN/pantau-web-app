import crypto from "node:crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I to avoid confusion

/** Generates a readable one-time login code, e.g. "GPAN2-7F3K9Q". */
export function generateCode(teamSlug: string): string {
  let random = "";
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) random += ALPHABET[bytes[i] % ALPHABET.length];
  return `${teamSlug}-${random}`;
}

export function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code.trim().toUpperCase()).digest("hex");
}

export function slugifyTeam(name: string): string {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, 8) || "TIM";
}
