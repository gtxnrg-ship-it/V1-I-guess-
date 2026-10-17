# Kuro-chan implementation priorities 🌸

Last repository audit: 2026-10-17  
Repository: [gtxnrg-ship-it/kuro-chan](https://github.com/gtxnrg-ship-it/kuro-chan)  
Sources of truth: [Original vision](ORIGINAL_VISION.md), [roadmap](../ROADMAP.md), [verified feature audit](FEATURE_AUDIT.md), and the code/tests in the current default branch.

This document answers two practical questions at the start of every work session: **what matters most next, and what already exists that we should extend rather than rewrite?** It is an execution order, not a claim that the work is done.

## Priority order

### P0 — Make repository-aware engineering evidence consistent and safe
**Why first:** every planning, code-editing, and verification decision depends on the right source snapshot. Incorrect repository evidence can cause the agent to confidently edit or diagnose the wrong version.

- [x] Read GitHub metadata and identify the selected ref's observed commit.
- [x] Inspect the recursive tree by immutable commit SHA rather than a moving branch name.
- [x] Pass the inspection baseline SHA into bounded source-context construction.
- [x] Add regression coverage for pinned source reads and commit lookup failure after the baseline was already observed.
- [ ] Make repository inspection and context operations share one snapshot object instead of independently fetching metadata/commit/tree where possible.
- [ ] Add tests for branch movement during inspection, truncated trees, large source files, missing permissions, and API rate limits.
- [ ] Before any write, re-check the target branch/head and use explicit base SHA/expected-head guards; never silently overwrite changes made since planning.
- [ ] Show the observed base SHA, context coverage, skipped files, and verification results in the task summary.

**Acceptance:** a task can explain exactly which commit it inspected, which file bodies it actually read, what it skipped, and whether the target branch changed before writing.

### P1 — Replace interim GitHub account auth with a real GitHub App installation

**Why:** Kuro-chan should use repository-scoped installation permissions, not ask people to paste personal access tokens or treat OAuth Device Flow as the final architecture.

- [x] Remove personal GitHub access tokens from generic AI-provider setup copy and reject common PAT formats in the general key path.
- [x] Make Settings distinguish App installation from the interim device-sign-in session and expose a configured installation link.
- [ ] Implement and deploy a trusted server-side broker that stores the App private key only server-side, validates the installation, and mints short-lived installation tokens.
- [ ] Bind each connected session to the verified installation and selected repository set; list only repositories the installation can access.
- [ ] Replace the temporary Device Flow connection with the App installation flow only after broker-backed operations pass end-to-end tests.
- [ ] Test expired/revoked installations, missing permissions, network errors, repository selection, branch listing, conflict-safe writes, and disconnect/revoke behavior.

**Acceptance:** install App → select repositories → broker verifies installation → client gets short-lived scoped access → inspect/edit/check/PR works with the granted permissions and clear recovery states. Never put the App private key or long-lived user token in the client.

### P1 — Complete the real build–test–repair–retest loop
**Why second:** this is the central promise of Kuro-chan. A good chat UI or plausible code is not enough; she must demonstrate a representative project can be built and repaired using real checks.

- Audit the current agent, tools, QA harness, workflow-failure diagnostics, and shipping modules before changing architecture.
- Map each claimed tool to a real implementation, permission boundary, timeout, cancellation path, and actionable error state.
- Test a real generated project through plan, file writes, production package build, tests, a seeded failure, repair, and a second successful run.
- Keep mocked provider/browser tests clearly separated from live-provider and native-device acceptance.
- Re-run final QA after visual-polish edits; if those edits introduce errors, make one bounded repair attempt and rerun QA before reporting. Persistent errors must remain a failed/incomplete outcome.
- Preserve truthful outcome labels: a QA-harness smoke check must not be called a production build or full test suite.
- Store per-run evidence: exact source revision, commands executed, exit codes, artifacts, and failures.

**Acceptance:** one reproducible end-to-end trial succeeds on an actual supported runner, including recovery from a deliberately seeded failure, without overstating which checks ran.

### P2 — Ship a secure, complete GitHub connection and write workflow
**Why third:** repository-aware coding cannot be dependable if authorization is fragile or changes are not safely reviewable.

- Audit the GitHub auth, Device Flow, session, API client, repository tests, and migration documentation before refactoring.
- Keep current Device Flow explicitly interim; never ship a GitHub App private key/client secret in browser code or an APK.
- Implement the intended trusted server-side broker for short-lived installation tokens, with least-privilege permissions and deployment documentation.
- Define session lifecycle: approval, expiry, denial, cancellation, logout, revocation, restart, and secure native storage where supported.
- Ensure branch writes are based on a known SHA and conflicts stop for safe reconciliation rather than silently overwriting.
- E2E-test private/public repo access, permission denial, token expiry, safe branch writes, PR creation, and cleanup.

**Acceptance:** a user can connect, inspect, change a branch, review a diff, and create a PR with least privilege and no long-lived secret embedded in the client.

### P3 — Deliver a genuine on-device model runtime
**Why fourth:** this is a major product differentiator, but it needs a supported Android runtime and artifact pipeline—not more catalogue entries or UI polish.

- Audit the existing local-model engine, UI, provider routing, and cross-platform runtime notes before selecting dependencies.
- Choose a maintained Android-compatible inference runtime and a concrete artifact format based on current upstream support and device constraints.
- Implement model download/resume, checksums, storage estimates, cancellation, deletion, and license/access notices.
- Implement actual native load, inference, unload, memory/error reporting, and app lifecycle handling.
- Report **Ready** only after the selected artifact has loaded and passed an inference smoke test; never label a remote endpoint as local.
- Measure latency, peak memory, thermal impact, and battery use on a real target phone before expanding the catalogue.

**Acceptance:** install/download a supported small model on a real Android device, disconnect the network, run an inference, and recover cleanly from load or memory failures.

### P4 — Real-device acceptance and product reliability
**Why fifth:** CI validates packaged code and automated paths; it does not substitute for testing on the actual phones and audio stack.

- Test the APK on physical Android devices for install, restart, storage, responsive layout, permissions, background/foreground, and accessibility.
- Test voice start/stop, native speech input, unavailable services, permission denial, and audio interruptions.
- Audit every visible control for working behavior or a clear disabled/unavailable explanation.
- Verify the original supplied Kuro-chan artwork and all launcher/adaptive icons against the user's reference asset.
- Fix error/loading/offline/retry states and improve first-run onboarding.

**Acceptance:** maintain a device/OS test matrix with reproducible results; mark anything not physically tested as unverified.

### P5 — Visual Intent Studio, design-to-code loop
- Audit the Visual Intent Studio, design-intent engine, project state, preview, and checkpoint code.
- Add real reference results with source/attribution and honest failure states.
- Add region selection/annotation, approved/rejected design decisions, and an actual project preview with before/after.
- Apply approved design changes through checkpoints and reviewable diffs, then run relevant build/test checks.

**Acceptance:** a non-coder can choose a visual direction, refine a selected region conversationally, and receive a working verified change.

### P6 — Model quality, voice polish, and secondary integrations
- Evaluate model routing against a fixed task suite; show the actual provider/model and costs/limits where available.
- Improve voice turn-taking only after the current speech lifecycle is validated on real devices.
- Add templates, integrations, and secondary convenience features only when the core engineering workflow is dependable.

### P7 — Release polish and long-horizon experiments
- Feedback triage, release notes, safe updates, optional integrations, localization, desktop packaging, and self-maintenance experiments.
- Do not prioritize autonomous self-modification or extra UI polish ahead of secure access, a real runner, and verified model execution.

## Anti-waste rules for every work session

1. **Inspect before editing.** Read the current implementation, tests, call sites, and related docs from the latest default branch before creating a new subsystem.
2. **Extend the existing design.** Reuse the GitHub client, repository context builder, agent workflow, project memory, QA harness, settings, and existing test conventions when they fit.
3. **Search for duplicates.** Check imports/call sites/tests before adding another helper or parallel abstraction. If an existing feature is incomplete, fix that path instead of building a second path.
4. **One coherent vertical slice.** Implement behavior, error paths, tests, documentation, and acceptance evidence together. Avoid isolated cosmetic PRs when a connected flow can be completed.
5. **Keep documentation in the same change.** Update README status, the roadmap, and this progress ledger whenever a capability or its verified state changes. Update this priority list when evidence changes the order.
6. **Prove before marking complete.** Record the exact commit and CI results. Distinguish unit/E2E mocks, CI packaging, live service checks, and physical-device tests.
7. **Do not fabricate external prerequisites.** If an App registration, server deployment, provider credential, runtime dependency, or physical device is unavailable, implement what can be safely verified and record the remaining blocker explicitly.
8. **Finish the loop.** Follow CI, fix regressions, merge only after required checks pass, then start the next highest-priority unfinished workstream.

## Current next action

PR #139 is merged, and PRs #141–#143 are now merged as well: destination-head write guards, snapshot reuse, and the first GitHub App migration boundary are in place. The generic provider-key path rejects common personal GitHub token formats; Settings explains the intended App installation and distinguishes it from interim Device Flow. The server-side broker is still not implemented/deployed, so do not remove the only usable interim connection prematurely. The agent pipeline now performs one explicit final repair/retest if visual-polish changes introduce QA errors. Next, continue with the real build–test–repair–retest acceptance slice and remaining snapshot edge cases. Use this audit, the roadmap ledger, and the latest PR checks as the durable cross-session handoff.

### New engineering slice — run the published repository real CI

- [x] Add a fixed-workflow dispatcher for the repository existing `check.yml`.
- [x] Capture the branch observed SHA before dispatch and refuse to call a run successful if its SHA differs.
- [x] Poll the new workflow run and return the run link plus an honest pending/failure/pass status.
- [x] Add tests for success, failure, pending, moved branch, and missing Actions write permission; PR #145 CI passed.
- [ ] Validate a live end-to-end dispatch with an authorized GitHub App installation after the server-side broker is implemented.

The tool checks the currently published branch only. It does not upload local edits or replace the in-browser QA harness.
