# Kuro-chan Roadmap

This is a living plan, not a promise that every item is already implemented. Priorities may change as we learn from users and test the existing system.

## P0 — Trust, correctness, and safety

- [ ] Run the existing regression tests in CI on every pull request.
- [ ] Add browser smoke tests for startup, chat, settings, source inspection, and mobile navigation.
- [ ] Add a reliable test for importing a repository and handling permission/rate-limit errors.
- [ ] Prevent secrets from being written to generated repositories or logs.
- [ ] Make publish actions show a clear summary and require explicit confirmation.
- [ ] Show actionable build failures, provider errors, and retry state instead of vague success messages.
- [ ] Add safe checkpoints or snapshots before large edits and support restoring a previous version.
- [ ] Test generated projects against real dependency-install and production-build failures.

## P1 — GitHub-first workflow

- [ ] Show repository, branch, and sync status clearly.
- [ ] Generate a human-readable diff before applying or publishing changes.
- [ ] Support feature branches and pull requests instead of only pushing to a default branch.
- [ ] Detect upstream changes and explain conflicts before overwriting files.
- [ ] Let users review and selectively accept generated file changes.
- [ ] Add a repository preflight report for package manager, framework, scripts, and likely build risks.
- [ ] Add safer GitHub token guidance and explain the minimum required permissions.

## P1 — Models and free-first operation

- [ ] Create a model catalog with context size, vision, tool calling, latency, and provider limits.
- [ ] Allow per-agent model selection and provide a transparent automatic-routing explanation.
- [ ] Add cost/usage budgets, rate-limit awareness, and clear fallback reasons.
- [ ] Explore optional browser-local inference through WebGPU/WASM for compatible models.
- [ ] Add downloadable model size, hardware requirements, cache controls, and deletion controls before local model downloads.
- [ ] Make local-model support graceful on unsupported phones and browsers.
- [ ] Add request cancellation, bounded retries, resumable streaming, and clearer timeout handling.
- [ ] Cache safe, non-sensitive research results where freshness and provider terms allow it.

## P1 — UI and accessibility

- [ ] Improve the empty state so first-time users can import a repo or start from a template.
- [ ] Keep chat, source inspection, settings, and delivery status easy to reach on small screens.
- [ ] Add accessible labels, keyboard navigation, visible focus, and reduced-motion support.
- [ ] Show agent progress as understandable steps with duration and current activity.
- [ ] Improve empty, loading, offline, error, and success states across the app.
- [ ] Add searchable prompt recipes and reusable project templates.
- [ ] Add export and import for project settings without exporting secrets.

## P2 — Developer tools and integrations

- [ ] Add optional security/dependency checks and explain findings in plain language.
- [ ] Add automated accessibility checks for generated apps.
- [ ] Add framework-aware tests, isolated QA diagnostics, and artifact verification.
- [ ] Add optional MCP-compatible integrations with explicit permission boundaries.
- [ ] Add documentation and package API lookup with source links and freshness indicators.
- [ ] Add better image attribution and asset-license tracking.
- [ ] Add release notes and a user-visible changelog.
- [ ] Add optional diagnostics that are off by default and never upload code or prompts without consent.
- [ ] Explore localization and offline-friendly documentation.
- [ ] Add a plugin capability/permission page so users know exactly what each integration can access.

## How we prioritize

Reliability and safety come before feature count. We prefer small changes with tests, clear permissions, and a visible fallback when a free service is unavailable. External APIs, model weights, and provider free tiers have their own terms and limits; Kuro-chan cannot promise they will remain free or always online.

Have an idea? Open a [feature request](https://github.com/gtxnrg-ship-it/V1-I-guess-/issues/new?template=feature_request.yml).
