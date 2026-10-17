# Kuro-chan verified feature audit

**Audit date:** 2026-10-17  
**Repository:** [gtxnrg-ship-it/kuro-chan](https://github.com/gtxnrg-ship-it/kuro-chan)  
**Baseline reviewed:** `main` at `168778d36c91a997efca332071c064c54412f0d7`  
**Purpose:** durable handoff and evidence-based implementation queue. Update this file whenever an acceptance gate materially changes.

## How to read this audit

This is a repository-evidence audit, not a claim that every tracked file was manually reviewed line by line or that every feature has passed production acceptance. The audit covered the tracked repository inventory, product vision/roadmap/README, implementation priorities and progress ledger, core engineering modules, settings and feature screens, representative automated tests, and CI workflows.

- **Implemented foundation** means code and some automated coverage exist; it does not mean every scenario works.
- **Automated test** may use mocked providers, speech APIs, or browser state. It proves the tested path, not a live external service or physical phone.
- **CI green** proves only the checks that actually ran on the recorded commit. APK packaging is not device acceptance.
- **Not verified** means no adequate evidence was found in this audit; it must not be reported as working.
- The roadmap's **13/142 = 9.2%** is a strict checkbox count. It is not a valid estimate of overall capability. A broader **~25% capability estimate** is provisional judgment only, not a measured completion score.

## Workstream status

| Workstream | Current evidence / what exists | Remaining gap / what is not yet proven | Priority |
| --- | --- | --- | --- |
| Conversational chat and continuity | Chat-first React studio; multi-turn mocked-provider acceptance test; project and conversation persistence work; personality/preferences settings | Live-provider behavior, robust long-task continuity, cancellation/retry and full real-world conversation quality are not established by mocks alone | P1 |
| Repository understanding | GitHub metadata/tree/source-context path; bounded file reading; evidence and truncation reporting; immutable commit SHA source reads in PR #139 | Branch movement, truncated tree, large files, missing permissions, API rate limits, and one shared snapshot object need targeted tests; context is bounded, not a claim that every file was read | P0 |
| Safe repository writes | Project checkpoints/restore and review-oriented workflow foundations exist | Before-write target branch/head guard, concurrent edits/conflict behavior, exact diff and commit evidence, least-privilege write authorization, and safe recovery need end-to-end validation | P0 |
| Build, test, diagnose, repair, retest | Talker/Researcher/Planner/Builder/Checker roles; QA harness, runtime diagnostics, bounded repair path, seeded syntax-error repair foundations; final post-review QA now gets one bounded repair/retest attempt | A representative real project has not been proven through real dependency install + production build + tests + seeded failure + repair + successful retest on a supported runner | P1 — central product promise |
| GitHub sign-in and delivery | GitHub API client, Device Flow/session foundations, token identity verification and tests | Complete installation-based GitHub App flow needs a trusted server-side token broker; real permissions, token expiry/revocation, secure native session lifecycle, branch writes, conflicts and PR creation need E2E | P1 |
| Local model inference | Candidate catalogue and hardware-fit guidance; provider routing foundation | Catalogue explicitly does not download/install/load/run local chat models. GPT-OSS 20B currently uses a remote endpoint. Offline inference is not implemented end-to-end | P2 after core reliability |
| Voice | Browser/native speech integration, Kokoro TTS path, persisted settings; PR #138 tests browser speech cancellation/UI lifecycle with mocked speech API | Physical Android microphone/audio behavior, permission denial, lifecycle, all providers, native cancellation, offline operation and low-latency turn-taking are not device-verified | P3 |
| Visual Intent Studio | Reference board and project design brief; approved intent can enter engineering context | Region selection/annotation, usable before/after project preview, and approved-design → code diff → build/test flow are incomplete | P4 |
| Android interface, accessibility and branding | Responsive UI foundations; Android APK workflow; Check/CodeQL/APK CI have passed on recent merged changes | No physical-device acceptance matrix; every visible control, accessibility, offline/error/retry behavior, varied screen sizes, and matching the user's supplied icon reference remain unverified | P3 |
| Project memory and task resumption | Project-scoped facts/decisions/open questions/handoff notes, filtering and isolation tests; persistence coverage | Not unlimited recall. Recovery of a substantial interrupted task with current state, exact commit, evidence, and safe continuation needs an explicit acceptance test | P3 |
| Provider routing and model quality | Multi-provider adapters, streaming/configuration and role routing foundations | Fixed task evaluation for tool calls, context limits, quota/rate limits, timeout/retry, cancellation, truthful provider identity, cost/fallback and live credentials is incomplete | P4 |
| Templates, integrations, release and feedback | Several code foundations and issue/feedback paths exist; Android release workflow | Each integration needs a call-path inventory and success/failure test; release artifact integrity/source linkage, user-facing feedback loop and integration completion are not comprehensively verified | P4 |
| Security and privacy | Secret-like text filtering, publish guards, CodeQL workflow and credential boundary tests | Browser storage is not a native secure vault; installation token broker, least-privilege threat model, log/artifact scanning and real auth lifecycle remain incomplete | P0/P1 |

## Evidence ledger: recent merged changes

These are evidence for the specific behavior tested, not blanket certification of the entire product.

- **PR #127 — conversational experience standard:** merged.
- **PR #129 — autonomous repair testing:** merged; does not by itself prove a live production build/repair loop.
- **PR #131 — roadmap count reconciliation:** merged; strict checklist total set to 142.
- **PR #132 — truthful generated-project verification:** merged; distinguishes QA-harness/runtime smoke checks from production package builds and full external suites.
- **PR #133 — multi-turn conversation acceptance:** merged; deterministic mocked-provider test covers two natural turns and conversation context.
- **PR #136 — project conversation persistence:** merged.
- **PR #137 — voice settings persistence:** merged; browser E2E covers settings and reload persistence.
- **PR #138 — voice output interruption lifecycle:** merged; browser E2E tests mocked browser speech cancellation and UI cleanup. Native/device audio is not thereby verified.
- **PR #139 — repository snapshot consistency:** merged. Source-context tree and source-body reads are pinned to the observed immutable commit SHA; regression coverage includes pinned reads and a commit lookup failure after a baseline SHA is known. Remaining P0 edge cases are listed above.

For exact current check results, use the pull request's checks and commit SHA. Do not infer that checks passed on a later commit because an earlier commit passed.

## Acceptance gates, in execution order

### Gate 1 — finish trustworthy repository evidence and safe writes
- [ ] Use a shared snapshot object for metadata, tree, source reads and diagnosis where practical.
- [ ] Add regression tests for moving refs, truncated trees, oversized files, denied permissions and API rate limits.
- [ ] Revalidate the target branch/head before writes; fail safely on concurrency and conflicts.
- [ ] Ensure user-facing results state the inspected SHA, included/skipped context, exact checks run and remaining uncertainty.
- [ ] Test diff/commit/PR behavior without silently overwriting upstream changes.

**Pass condition:** a reproducible test demonstrates inspection at a known commit and a concurrent target-branch change is detected before writing.

### Gate 2 — prove the real build–test–repair–retest loop
- [ ] Select a representative, small project with a reproducible runner.
- [ ] Run actual dependency installation, production build and project tests; capture commands, exit codes and artifacts.
- [ ] Seed a deterministic failure, demonstrate diagnosis and repair, then rerun the same relevant checks successfully.
- [ ] Keep mock tests separate from real-runner evidence and preserve truthful status labels.

**Pass condition:** a repeatable end-to-end run succeeds after a deliberately seeded failure on a supported real runner.

### Gate 3 — secure GitHub connection and delivery
- [ ] Implement or document a deployable trusted broker for GitHub App installation tokens; never put the App private key in client code.
- [ ] Cover approval, denial, cancellation, expiry, revocation, logout, restart and minimum permissions.
- [ ] E2E-test repository selection, branch/head guards, diff review, safe commit and PR creation.

**Pass condition:** a real account can complete a least-privilege, conflict-safe reviewable change without long-lived privileged secrets in the client.

### Gate 4 — local inference and device acceptance
- [ ] Choose a supported Android inference runtime and compatible model artifact before expanding the catalogue.
- [ ] Implement download verification, cancellation, storage/error handling, native load/inference/unload and truthful readiness.
- [ ] Demonstrate inference with network disabled on a real device.
- [ ] Test installation, restart, accessibility, voice, permissions and lifecycle on physical Android devices; verify supplied Kuro-chan artwork against launcher/adaptive icons.

### Gate 5 — visual workflow and remaining product breadth
- [ ] Finish region selection/annotation, preview and a design-to-code/test loop.
- [ ] Evaluate providers on a fixed suite; cover timeouts, limits, retries, cancellation and costs where available.
- [ ] Test task resumption, integrations, release integrity, feedback handling and all visible controls.
- [ ] Update this audit and the README/roadmap after each evidence-backed acceptance gate.

## Two-hour execution rule

Prioritize one connected vertical slice at a time: inspect current code and tests, implement behavior and failure paths, add regression tests, update docs, run the available CI checks, repair failures, merge only after required checks pass, then continue. Do not count planning, a PR opening, a green mock test, or APK packaging as completion of a larger acceptance gate.

External dependencies can block full completion within a fixed window: provider credentials/quotas, a deployable GitHub App broker, Android device access, and model-runtime compatibility. Implement and verify everything that can be completed without those dependencies; record the exact blocker rather than claiming success.

## Cross-conversation handoff

At the start of a new session, read this file together with [Implementation priorities](IMPLEMENTATION_PRIORITIES.md), [Roadmap progress](ROADMAP_PROGRESS.md), [Roadmap](../ROADMAP.md), [Original vision](ORIGINAL_VISION.md), and the latest merged commit/PR checks. Update the baseline SHA, status, evidence and next action whenever work changes. This repository record is the durable project handoff; do not rely on chat history alone.


## Update: GitHub App connection boundary

The Settings UI now names GitHub App installation as the target architecture and separates it from the interim Device Flow. It supports a configured App installation link via `VITE_GITHUB_APP_SLUG` and explicitly reports that a configured broker URL alone does not prove a working broker. The generic AI-provider key path rejects common GitHub personal-access-token formats and no longer advertises PATs as an acceptable connection method. This is UI/security hardening, **not** completion of GitHub App authentication. The trusted server-side broker, installation validation, short-lived installation tokens, and end-to-end repository permissions remain unimplemented.


## Update: post-review repair and durable handoff (2026-10-17)

The agent pipeline now rechecks the final workspace after visual review/polish. If that final check finds build/runtime errors, it makes one bounded Builder repair attempt and reruns the QA harness before producing the wrap-up. Persistent errors remain visible as a failed outcome; attempting a repair is not reported as success. This closes a gap where visual polishing could introduce errors after the earlier automatic-fix loop. The check remains an isolated browser/esbuild QA smoke test, not a real dependency install, production build, full test suite, or physical-device run.

The last confirmed default-branch commit before this change is `f9e551c040f7e33664bb25deaf90daffc5a009ef`. PR #143 is merged with Check, CodeQL, TypeScript analysis, and APK packaging all green. PR #142 is merged and the repository inspection snapshot is reused. Keep the strict roadmap figure at **13/142 = 9.2%** until a checklist acceptance gate is actually met.
