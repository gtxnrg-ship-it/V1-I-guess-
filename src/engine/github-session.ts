/**
 * GitHub user tokens are runtime-only session credentials, never AI-provider keys or IndexedDB data.
 * Reconnect after a reload until platform secure storage is implemented and verified.
 */
export interface ProviderCredential { provider: string }
export interface GitHubSession {
  token: string;
  login: string;
  scopes: string[];
  connectedAt: number;
  expiresAt?: number;
}
let session: GitHubSession | null = null;

export function setGitHubSession(value: GitHubSession): void {
  if (!value.token.trim() || !value.login.trim()) throw new Error("A verified GitHub token and login are required.");
  session = { ...value, scopes: [...value.scopes] };
}
export function getGitHubSession(): GitHubSession | null {
  if (session?.expiresAt && Date.now() >= session.expiresAt) session = null;
  return session ? { ...session, scopes: [...session.scopes] } : null;
}
export function getGitHubSessionToken(): string | null { return getGitHubSession()?.token ?? null; }
export function clearGitHubSession(): void { session = null; }
export function filterPersistableCredentials<T extends ProviderCredential>(credentials: T[]): T[] {
  return credentials.filter((credential) => credential.provider !== "github");
}
