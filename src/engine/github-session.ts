/**
 * GitHub access tokens are short-lived app-session credentials, not AI-provider keys.
 * Keep them in runtime memory only until a native secure-storage adapter is implemented.
 * This prevents accidental persistence to the ordinary IndexedDB key store.
 */
export interface ProviderCredential {
  provider: string;
}

export function filterPersistableCredentials<T extends ProviderCredential>(credentials: T[]): T[] {
  return credentials.filter((credential) => credential.provider !== "github");
}
