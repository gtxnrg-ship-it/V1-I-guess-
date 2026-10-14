// The hidden admin door. Only hashes live in the code, so reading the public source doesn't reveal
// the unlock sequence or the admin email. Real protection for self-upgrades is the GitHub token:
// only someone with push access to Kuro-chan's repo can ship a change.
import { getState, setSettings } from "./db";

const EGG = "b98e3074ffcf8125b0f2005f8646306078245e1ec58721087fd2a039f5558046";
const EMAIL = "0006e372dffcb64338a694977a73c2959cfa0fdea102049d37617a9a3b181f1c";

// Deliberately slow (PBKDF2, 300k rounds) so the values can't be guessed by brute force.
export async function slowHash(s: string, salt: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(s), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: new TextEncoder().encode(salt), iterations: 300000 }, key, 256);
  return [...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
const digits = (s: string) => s.replace(/\D/g, "");

/** Typed anywhere (composer or the settings search box). */
export async function tryEgg(text: string) {
  const d = digits(text);
  if (d.length < 8 || d.length > 16) return false;
  if ((await slowHash(d, "kuro-chan-egg")) !== EGG) return false;
  setSettings({ eggFound: true });
  return true;
}
export async function tryAdminEmail(email: string) {
  const ok = (await slowHash(email.trim().toLowerCase(), "kuro-chan-admin")) === EMAIL;
  setSettings({ adminEmail: email.trim().toLowerCase(), adminUnlocked: ok });
  return ok;
}
export const isAdmin = () => !!getState().settings.adminUnlocked;
export const lockAdmin = () => setSettings({ adminUnlocked: false, eggFound: false, adminEmail: undefined });
