# GitHub sign-in migration

## Goal

Replace manually pasted GitHub personal access tokens with a user-facing GitHub sign-in flow. Keep AI-provider keys separate: those are independent credentials and must not be removed as part of this migration.

## Security requirements

- Register a GitHub App and enable Device Flow for the first supported sign-in path. The app uses the public App client ID; no client secret is embedded in the browser or APK. Use a server-mediated PKCE authorization-code flow later only if a hosted callback/exchange service is deliberately deployed.
- Request only the permissions needed for the actions the user enables. Repository creation, private repository access, GitHub Actions workflows, commits, and pull requests must be described clearly at authorization time.
- Validate OAuth `state` on every callback and reject missing or mismatched values.
- Never bundle a client secret in Vite variables, JavaScript, a downloadable build, or the Android APK.
- Keep the PKCE verifier and OAuth state short-lived; clear them on completion, cancellation, or failure.
- Until a native secure-storage adapter is implemented, keep GitHub access tokens in runtime memory only. Do not persist them in the general AI-key list or the ordinary IndexedDB settings store. Users must reconnect after restarting Kuro-chan.
- Support disconnect/revoke, expired credentials, cancellation, least-privilege permissions, and repository access denial.
- Do not enable write/merge actions until the granted permissions are verified. Keep destructive operations behind explicit user approval.
- Do not claim sign-in works until a real registered app, callback route, credential exchange, secure storage, and Android end-to-end tests are in place.

## Current implementation boundary

`src/engine/github-auth.ts` provides PKCE/state primitives for a future callback flow. The current supported client-side path is GitHub App Device Flow using `VITE_GITHUB_APP_CLIENT_ID`; it validates the returned token against `/user` before marking the session connected. GitHub credentials are kept in runtime memory and filtered out of IndexedDB persistence, including cleanup of legacy stored GitHub tokens. This avoids pretending ordinary browser storage is secure, but it also means the user must reconnect after a reload. A registered GitHub App and configured client ID are still required.

## Registration/configuration still required

A GitHub App must be registered and its public client ID configured as `VITE_GITHUB_APP_CLIENT_ID` in the build environment. Enable Device Flow in the App settings and configure only the repository permissions the product actually needs. No client secret belongs in the client app. This one-time app registration is a GitHub requirement, not a paid third-party dependency.

## Acceptance checklist

- [ ] User can start GitHub sign-in from Settings.
- [ ] Authorization uses state and PKCE S256.
- [ ] Callback state is verified before processing a code.
- [ ] Device Flow works against the registered GitHub App in a deployed web build and Android build.
- [ ] If a hosted authorization-code callback is added later, code exchange works without exposing a client secret.
- [ ] GitHub tokens are never written to ordinary IndexedDB or local storage (implemented; session-only until native secure storage is added).
- [ ] Persistent credential storage uses platform secure storage before long-lived sessions are offered.
- [ ] User can select/inspect repositories and disconnect.
- [ ] Private repositories and permission-denied cases behave correctly.
- [ ] Expired/revoked credentials recover cleanly.
- [ ] GitHub client consumes the authenticated session without storing credentials as AI keys.
- [ ] Android sign-in, cancel, reconnect, expiry, and repository-permission flows pass end-to-end tests.
- [ ] Existing AI-provider key management remains unaffected.
