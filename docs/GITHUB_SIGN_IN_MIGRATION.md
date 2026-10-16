# GitHub sign-in migration

## Goal

Replace manually pasted GitHub personal access tokens with a user-facing GitHub sign-in flow. Keep AI-provider keys separate: those are independent credentials and must not be removed as part of this migration.

## Security requirements

- Register a GitHub App and use user authorization with PKCE (S256).
- Request only the permissions needed for the actions the user enables. Repository creation, private repository access, GitHub Actions workflows, commits, and pull requests must be described clearly at authorization time.
- Validate OAuth `state` on every callback and reject missing or mismatched values.
- Never bundle a client secret in Vite variables, JavaScript, a downloadable build, or the Android APK.
- Keep the PKCE verifier and OAuth state short-lived; clear them on completion, cancellation, or failure.
- Store credentials only through an appropriate platform secure-storage mechanism. Do not put GitHub credentials in the general AI-key list or the ordinary IndexedDB settings store.
- Support disconnect/revoke, expired credentials, cancellation, least-privilege permissions, and repository access denial.
- Do not enable write/merge actions until the granted permissions are verified. Keep destructive operations behind explicit user approval.
- Do not claim sign-in works until a real registered app, callback route, credential exchange, secure storage, and Android end-to-end tests are in place.

## Current implementation boundary

`src/engine/github-auth.ts` provides URL construction, PKCE S256 challenge creation, secure random state/verifier generation, and callback-state comparison. It intentionally does **not** exchange an authorization code, persist tokens, or pretend a GitHub App has been registered. These missing steps must be implemented and tested before replacing the current GitHub token path.

## Registration/configuration still required

A GitHub App client ID and a callback URI must be configured for the actual application. The correct callback and credential-exchange strategy depends on the registered app and Android redirect handling. No client secret belongs in the client app. This one-time app registration is a GitHub requirement, not a paid third-party dependency.

## Acceptance checklist

- [ ] User can start GitHub sign-in from Settings.
- [ ] Authorization uses state and PKCE S256.
- [ ] Callback state is verified before processing a code.
- [ ] Code exchange works without exposing a client secret.
- [ ] Credential storage uses platform secure storage.
- [ ] User can select/inspect repositories and disconnect.
- [ ] Private repositories and permission-denied cases behave correctly.
- [ ] Expired/revoked credentials recover cleanly.
- [ ] GitHub client consumes the authenticated session without storing credentials as AI keys.
- [ ] Android sign-in, cancel, reconnect, expiry, and repository-permission flows pass end-to-end tests.
- [ ] Existing AI-provider key management remains unaffected.
