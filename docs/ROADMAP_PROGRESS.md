# Kuro-chan roadmap progress ledger

Last reconciled: 2026-10-17  
Source of truth: [ROADMAP.md](../ROADMAP.md). This ledger separates **roadmap checkbox completion** from **shipped-but-not-yet-checkboxed work** so the percentage cannot be inflated by counting PRs.

## Overall checklist progress

- **13 of 142 roadmap checkboxes complete: 9.2%.**
- Calculation: checked boxes divided by all checklist items currently in `ROADMAP.md`, rounded to one decimal place. The latest reconciliation includes merged checkpoint-recovery, project-memory, personality-preference, and local-model-advisor work, 11 original-vision acceptance gates, and 9 public-feedback/model-evolution gates.
- This is a strict checklist percentage, not a claim that only 8.2% of the product code exists. Several merged changes are not yet represented by checked roadmap items, and partial features do not count as complete.
- Reconcile this ledger whenever roadmap items are added, removed, or verified. Only check a roadmap item when its acceptance criteria are implemented and verified; record evidence below.

## Progress by roadmap section

| Roadmap section | Verified complete | Tracked items |
| --- | ---: | ---: |
| Current foundations | 9 | 9 |
| Next reliability work | 0 | 9 |
| P0 — trustworthy engineering and safety | 1 | 11 |
| P1 — GitHub connection and repository workflow | 0 | 12 |
| P1 — project understanding and task memory | 1 | 8 |
| P1 — specialist agents and autonomous work | 0 | 9 |
| P1 — models, routing, and cost transparency | 0 | 11 |
| P1 — voice and natural conversation | 2 | 9 |
| P1 — UI, accessibility, and device support | 0 | 9 |
| P1 — Visual Intent Studio | 0 | 12 |
| P2 — templates, tools, and integrations | 0 | 9 |
| P2 — delivery, releases, and quality of life | 0 | 8 |
| P3 — longer-term experiments | 0 | 6 |
| Original-vision alignment | 0 | 11 |
| Public feedback and model evolution | 0 | 9 |
| **Total** | **13** | **142** |

## Shipped capability evidence

| Capability | State | Evidence / boundary |
| --- | --- | --- |
| Project checkpoint list, safe restore, and end-to-end recovery coverage | Merged | [PR #81](https://github.com/gtxnrg-ship-it/kuro-chan/pull/81) added the flow; [PR #94](https://github.com/gtxnrg-ship-it/kuro-chan/pull/94) added E2E coverage. Checks, CodeQL, and APK build passed. |
| Project deletion/switch recovery guards | Merged | [PR #84](https://github.com/gtxnrg-ship-it/kuro-chan/pull/84); lifecycle regression tests, Check, and CodeQL passed. |
| Editable project-scoped memory | Merged | [PR #95](https://github.com/gtxnrg-ship-it/kuro-chan/pull/95); editable/deletable facts and decisions, open questions, hand-off summary, credential filtering, and project-isolation tests. All checks passed. |
| Conversation personality preferences | Merged | [PR #96](https://github.com/gtxnrg-ship-it/kuro-chan/pull/96); playfulness, reply length, and memory-context preferences persist across navigation and have regression coverage. |
| Honest local-model hardware estimates | Merged | [PR #98](https://github.com/gtxnrg-ship-it/kuro-chan/pull/98) removed guessed RAM assumptions and clarified runtime limitations; [PR #100](https://github.com/gtxnrg-ship-it/kuro-chan/pull/100) added unknown-RAM UI E2E coverage. All checks and APK packaging passed. |
| Truthful execution outcomes | Merged | [PR #85](https://github.com/gtxnrg-ship-it/kuro-chan/pull/85); unresolved build/runtime errors are no longer reported as successful completion. |
| Visual Intent Studio reference board and project design brief | Merged | [PR #83](https://github.com/gtxnrg-ship-it/kuro-chan/pull/83); first slice only, not region annotation or live before/after preview. |
| Approved visual intent passed to app-scoped engineering context | Verification passed; merge pending | [PR #86](https://github.com/gtxnrg-ship-it/kuro-chan/pull/86); after fixing the malformed newline, Check, TypeScript, build, E2E, and CodeQL passed on commit `b00996bf57100db3eaf71040cd1eefae1efb83a3`. Keep it separate from GitHub session hardening so each change is reviewed against its own security results. |
| GitHub App Device Flow and credential storage boundary | In this branch; not yet merged | Uses the public App client ID, validates the returned token through GitHub's `/user` endpoint, excludes GitHub tokens from IndexedDB persistence, and removes legacy stored GitHub tokens on startup. |
| Persistent GitHub session | Not complete | This branch deliberately keeps the token in memory only. Users reconnect after restart. A native secure-storage adapter and Android end-to-end coverage are still required before persistent sessions can be claimed. |
| GitHub App registration/configuration | External setup required | A GitHub App must be registered, Device Flow enabled, and `VITE_GITHUB_APP_CLIENT_ID` configured in the build environment. No client secret belongs in the browser or APK. |
| Visual region selection and live preview | Not complete | Explicitly remains outside PR #83/#86 scope. |

| Native Android speech input bridge | Pushed to `main` | Commit [`b118fbf`](https://github.com/gtxnrg-ship-it/kuro-chan/commit/b118fbf19601a756524b908e5275bef03c40c254); native Capacitor speech-recognition path, permission checks, partial results, explicit stop, listener cleanup, and web fallback. Check, CodeQL, and APK build passed on follow-up commit [`289232c`](https://github.com/gtxnrg-ship-it/kuro-chan/commit/289232cafbf691d243d2bc04cca021466198d2f8). Physical Android microphone behavior remains unverified. |
| GitHub Device Flow | Partially implemented; external setup remains | `src/pages/studio.tsx` contains Device Flow initiation and polling. It is not usable in a published build until a GitHub App is registered with Device Flow enabled and its public client ID is supplied as `VITE_GITHUB_APP_CLIENT_ID`. Tokens are session-only; no secret belongs in the APK. |

## Verification rules

1. Record the exact commit SHA tested, not merely the branch name.
2. Distinguish **passed**, **failed**, **pending**, and **not run**; never infer a pass from an absent check.
3. Run unit tests, TypeScript, production build, E2E, CodeQL, and Android build where applicable. If any required check fails, repair the cause and rerun the affected checks before calling the PR verified.
4. A merged PR is evidence of merged code, not proof every roadmap acceptance criterion is complete.
5. Report the strict roadmap checkbox ratio separately from any overall capability estimate. Never present a subjective capability estimate as an exact measured percentage. See [Verified feature audit](FEATURE_AUDIT.md).


## Original-vision alignment audit (2026-10-17)

The repository has a useful engineering-agent foundation, but the intended product is broader than the verified runtime. The GPT-OSS 20B entry routes through a remote Pollinations-compatible endpoint; the local chat-model catalogue has no download/load path; Kokoro TTS and native speech integrations exist, but physical-device voice acceptance is incomplete. The GitHub API client exists, but installation-based GitHub App authentication requires a server-side token broker that is not present in this repository. These are explicit gaps, not completed features. See [Original vision and implementation map](ORIGINAL_VISION.md).


## Latest reliability work (2026-10-17)

- **PR #137 — voice settings persistence: merged.** Check, CodeQL, and Android APK build passed. Browser E2E covers provider selection, speech speed, auto-speak/auto-send, and reload persistence.
- **PR #138 — voice output interruption: merged.** Check, CodeQL, and Android APK build passed. Browser E2E verifies cancellation and UI lifecycle for mocked browser speech; native/remote audio still needs physical-device acceptance.
- **PR #139 — repository snapshot consistency: merged.** The source-context builder accepts the exact inspected commit SHA, reads the recursive tree from that immutable SHA, and the agent passes the diagnosis baseline into context loading. Regression tests cover immutable-SHA reads and continuing with the known SHA if a redundant moving-ref lookup is unavailable. The remaining edge cases (branch movement, truncated trees, large files, permission/rate-limit failures, target-branch concurrency) remain open; see [Verified feature audit](FEATURE_AUDIT.md).
- The strict roadmap count remains **13/142 = 9.2%** until a roadmap acceptance item is fully met. Recent merged work does not automatically change the checkbox count.
- Use [Implementation priorities](IMPLEMENTATION_PRIORITIES.md) as the ranked next-work queue. The next work is remaining repository evidence/write-safety edge cases, then a real build/test/repair/retest proof, then secure GitHub installation flow. Local inference, physical-device acceptance, Visual Intent Studio and secondary polish follow. The strict checklist is **13/142 = 9.2%**; a whole-product capability percentage is not yet measured.


## Latest work (2026-10-17, continuing session)

- **PR #140 — durable feature audit/handoff: merged.** Adds the evidence-based workstream audit and strict distinction between checklist percentage and overall capability.
- **PR #141 — destination-head guard: merged.** Revalidates the target branch head before updating a ref; regression coverage protects against concurrent pushes.
- **PR #142 — snapshot reuse: merged.** Reuses the immutable repository tree observed during inspection rather than refetching it for context construction.
- **PR #143 — GitHub App migration boundary: merged.** Check, CodeQL, TypeScript analysis, and APK packaging all passed. Generic AI-provider setup no longer advertises PATs, common GitHub PAT formats are rejected, and Settings explains App installation vs interim Device Flow. This is not a deployed App token broker.
- **Current change under review:** final post-review QA can now trigger one bounded Builder repair and a second QA run. This guards against errors introduced by visual polish after the original fix loop. Production package builds, full external test suites, and physical-device acceptance are still not proven by the in-browser QA harness.
- **Strict roadmap count remains 13/142 = 9.2%.** Do not inflate it from merged changes that have not met and been checked against roadmap acceptance gates.

- **PR #145 — guarded GitHub Actions verification runner: CI passed, merge pending conflict resolution.** The tool dispatches the fixed `check.yml`, compares the run SHA with the pre-dispatch branch SHA, and returns a direct run URL plus passed/failed/running/blocked status. Automated tests cover common outcomes. A live dispatch is still pending App broker/permission setup; the tool checks published remote contents, not unsaved workspace files.


## APK distribution correction (PR in review)

- The Android workflow now copies the successful build output to the stable asset name `Kurochan.apk` and publishes that name in the latest GitHub Release.
- README top-level and Android download links target `releases/latest/download/Kurochan.apk`, which starts the asset download directly instead of opening the release page.
- The direct link becomes available once the first post-merge `main` workflow successfully publishes the renamed asset. The previous release remains available during the build.

## Checklist percentage correction

The earlier **13/142 = 9.2%** was mechanically correct only for the boxes checked at that moment; it was not a measurement of code shipped or actual product capability. Multiple merged PRs added code and tests without reconciling the corresponding roadmap acceptance gates. We will update individual boxes only where the complete stated acceptance criteria are met and will report the literal checkbox count separately from the capability audit. No unsupported overall percentage should be inferred from 9.2%.

## Capability reliability correction — PR #155

- Fixed malformed nested quotes in the R and PowerShell toolchain command suggestions that broke TypeScript parsing, npm test, and the production/APK build.
- Fixed the project-level capability detector contract: it now accepts manifest contents and passes them into game-engine detection, so dependency-based evidence can reach the tool output.
- Fixed tool-block status classification so syntax errors, build errors, runtime crashes, and failed remote checks are not shown as successful actions.
- Added regression tests for command quoting, manifest-driven Phaser detection, and tool failure classification.
- Code head ca477a1ff8798c688eaa65c73e82e35efbfa92ba passed Check, APK build, and CodeQL. This evidence applies to that exact code head; the next docs-only head must be rechecked.
- PR: https://github.com/gtxnrg-ship-it/kuro-chan/pull/155
- This is a reliability fix, not completion of the broader create-anything goal. The next priority remains a genuinely executable, permissioned, isolated build/test/repair loop across supported runtimes, with evidence-backed capability reporting.
