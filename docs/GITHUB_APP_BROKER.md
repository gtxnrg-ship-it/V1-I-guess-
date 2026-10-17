# GitHub App installation and token broker

Kuro-chan's target is a repository-scoped GitHub App installation, not a personal access token pasted into the AI provider key field and not the existing Device Flow treated as final.

## Trust boundary

- The App private key, App ID, and signing material belong only in a trusted server-side secret store.
- Never add the private key to Vite variables, browser JavaScript, an APK, a public config file, or a client bundle.
- The client may know the public App slug and the broker's public base URL; neither is a secret.
- A successful redirect to GitHub is not proof that the user installed the correct App or granted access to a repository.
- The broker must verify installation identity and repository selection before minting short-lived installation access tokens.
- Do not persist installation tokens in IndexedDB, localStorage, logs, crash reports, or task memory. Keep them in memory and renew/revoke according to GitHub's supported lifecycle.

## Required broker contract

The eventual broker must provide a documented, versioned API for:

1. Starting an installation/session and validating callback state.
2. Verifying the App installation and authenticated session server-side.
3. Listing repositories available to that installation (not the user's unrelated repositories).
4. Issuing/refreshing short-lived installation tokens with the minimum permissions required by the operation.
5. Reporting granted permissions and expiry without exposing private signing material.
6. Disconnecting a client session and handling uninstalled/revoked installations.

Every mutating repository operation must still validate the repository, branch, base SHA and expected target head. Installation authentication is not permission to bypass user confirmation for publishing, merging or destructive actions.

## Client configuration

- `VITE_GITHUB_APP_SLUG`: public registered App slug, used only to form the GitHub installation URL.
- `VITE_GITHUB_APP_BROKER_URL`: public broker endpoint base URL. Setting this value does not prove that a secure broker exists or is correctly configured; readiness requires a live end-to-end health/installation test.
- No private key or client secret is permitted in Vite configuration.

## Migration and acceptance

The current Device Flow is temporary and must be visibly labelled as such until the broker is deployed. Do not remove the last usable GitHub connection before broker-backed repository listing, immutable snapshot inspection, guarded writes, checks, PR creation, expiry, revocation and recovery have passed end-to-end tests. After acceptance, remove the interim Device Flow and all personal-token routes, and update the README, settings, tests and roadmap together.

## Deployment prerequisites still outstanding

This repository currently contains a static Vite client and Android packaging workflow; the broker deployment target, App registration values, server-side secret storage, session/cookie policy, rate limits, abuse controls and production domain must be selected and configured. The repository must not claim the App connection is operational until those prerequisites are complete.
