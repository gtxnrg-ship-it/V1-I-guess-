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

- `src/engine/github-device-flow.ts` starts the Device Flow, polls for approval, exchanges the device code, and validates the resulting token against GitHub's `/user` endpoint.
- `src/components/her/KeysPane.tsx` exposes the one-time code and verification link. `src/engine/github-session.ts` keeps the verified token in runtime memory; `db.keyOf("github")` exposes a session-only adapter to existing GitHub clients without adding the token to AI keys or IndexedDB.
- The Android workflow passes the public `VITE_GITHUB_APP_CLIENT_ID` repository variable to the web build. Web deployments must configure the same public variable. If it is missing, the UI explains the configuration requirement.
- Device Flow does not use the authorization-code callback or PKCE state checks. Those primitives remain for a possible future hosted callback flow.
- Automated tests cover request/response handling and runtime-session boundaries. Real GitHub App approval and Android-device end-to-end tests still need to be run against the registered app. The user must reconnect after reload or token expiry until secure storage/refresh is implemented.

## Registration/configuration still required

A GitHub App must be registered and its public client ID configured as `VITE_GITHUB_APP_CLIENT_ID` in the build environment. Enable Device Flow in the App settings and configure only the repository permissions the product actually needs. No client secret belongs in the client app. This one-time app registration is a GitHub requirement, not a paid third-party dependency.

## Acceptance checklist

- [x] User can start GitHub Device Flow from Settings → AI & models.
- [ ] Authorization-code callback state and PKCE S256 are verified (future callback flow only; not part of Device Flow).
- [x] Device Flow start, pending approval, token exchange, and `/user` identity verification are implemented and unit-tested.
- [ ] Device Flow works against the registered GitHub App in a deployed web build and a physical Android device.
- [ ] If a hosted authorization-code callback is added later, code exchange works without exposing a client secret.
- [x] GitHub tokens are excluded from ordinary IndexedDB and AI-provider key persistence.
- [ ] Persistent credential storage/refresh uses platform secure storage before long-lived sessions are offered.
- [x] Existing GitHub clients can consume the verified runtime session; repository clients still enforce the actual token permissions.
- [ ] Private repositories, insufficient permissions, token expiry/revocation, cancellation, and reconnect behave correctly in real app tests.
- [ ] Android sign-in, cancel, reconnect, expiry, and repository-permission flows pass end-to-end tests.
- [x] Existing AI-provider key management remains separate from GitHub sign-in.
