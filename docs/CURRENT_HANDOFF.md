# Kuro-chan current engineering handoff

**Last reconciled:** 2026-10-17  
**Repository:** https://github.com/gtxnrg-ship-it/kuro-chan  
**Default branch baseline at audit start:** `d68c71d0106bc5f701906727d6cde4aee351f163`  
**Purpose:** allow a new chat or contributor to resume from verified repository state without relying on chat history or the roadmap percentage.

## User's goal and working agreement

The goal is to make Kuro-chan genuinely capable at complex engineering: multiple programming languages, advanced statistics/scientific computing, and complex game-engine projects. Capability and reliability come before front-end polish. The user wants substantial work pushed as pull requests they can review/merge, a repository-wide understanding of the current state, and the relevant checklists/audit/handoff updated after each meaningful accepted slice.

- Work against this repository only: `gtxnrg-ship-it/kuro-chan`.
- Never treat a PR existing or a checkbox being checked as proof a capability works.
- Never claim a check is green unless it passed on the exact latest PR head SHA.
- Do not merge PRs on the user's behalf unless explicitly asked.
- Keep the percentage labeled as checkbox progress; do not present it as total product capability.
- Update `ROADMAP.md`, `docs/ROADMAP_PROGRESS.md`, `docs/FEATURE_AUDIT.md`, `docs/IMPLEMENTATION_PRIORITIES.md`, and this handoff when a meaningful capability/acceptance gate changes.

## Repository audit scope

The recursive Git tree at the audit baseline contained 173 tracked entries. The source-text inventory excluding binary artwork and `package-lock.json` contained 144 files. Reviewed the repository-level docs/config/workflows and the main paths for UI, agent roles/tools/router, model/provider setup, repository context and diagnosis, GitHub auth/write guards, project memory, QA, unit tests, and browser E2E tests. This was a broad structural and critical-path review, not a claim that every line or binary asset was manually inspected.

Existing foundations include agent roles, provider routing, project memory/checkpoints, repository context, guarded GitHub writes, QA diagnostics, voice/UI features, Android packaging, and unit/E2E coverage. The existence of these foundations does not prove reliable real-world execution.

## Current capability work

### PR #149 — merged, but initial CI failed

- Added evidence-based detection for 26 language families and 10 game-engine families plus the `inspect_project_capabilities` agent tool.
- The initial main-branch Check and APK workflows failed after merge. Do not treat that merge as verified success.
- Detection reports markers and candidate commands. It does not install or execute toolchains.

### PR #150 — repair detection integration

- Link: https://github.com/gtxnrg-ship-it/kuro-chan/pull/150
- Branch: `fix/capability-detection-ci-and-manifests`
- Last observed PR head: `1fe679b772c92c8ce3ba2bd7ad946c584ce0a50f` (re-fetch before relying on this; commits may advance).
- Fixes the R test-command syntax, passes supplied manifest contents through the combined capability report, and tests Bevy, Phaser, Three.js, and Babylon.js manifest signals.
- At code head `1f9bb1b0c93663e7130397559cbe10551a37f4aa`, the Check workflow passed (including `npm test`, the design-intent test, TypeScript, production build, and browser E2E), APK build passed, and CodeQL passed. This is verified only for that exact SHA; recheck all required workflows against the current head before merge.
- Some docs were added to this branch during the session; verify PR head and changed-file list because a branch update may have triggered a fresh run.

### PR #148 — repository source-coverage reporting

- Link: https://github.com/gtxnrg-ship-it/kuro-chan/pull/148
- Reports oversized source files omitted from repository context instead of silently undercounting them.
- Check, APK build, and CodeQL must be rechecked on the current head before merge.

### PR #147 — Android launcher icon

- Link: https://github.com/gtxnrg-ship-it/kuro-chan/pull/147
- Contains approved-artwork/native launcher icon work.
- Do not claim device-level visual acceptance until the installed APK is checked on a real Android launcher.

## Immediate next actions (in order)

1. PR #150 passed Check, APK build, and CodeQL at `1f9bb1b0c93663e7130397559cbe10551a37f4aa`. Re-fetch the latest head and all three statuses before merge. If any new run fails, inspect its failing step/log, fix the cause on the same branch, and rerun. Do not merge while checks are pending or red.
2. Run the repository's actual test pipeline: `npm test`, `npx tsc --noEmit`, `npm run build`, and `npm run e2e` (CI installs browser dependencies for E2E). Ensure the new detector is in the test chain; `package.json` currently includes `src/engine/language-toolchains.test.ts`.
3. Once PR #150 is fully green, proceed to the real execution layer—not more detection labels. Design a permissioned isolated runner with command allowlists, time/memory/output limits, cancellation, controlled filesystem/network access, and auditable exact command/exit-code/log evidence. Inspect scripts/lockfiles/version pins before selecting commands.
4. Prove the runner using one real scientific/statistical fixture (known-answer numerical tests, assumptions, data provenance, reproducibility, uncertainty reporting) and one game-engine vertical slice (asset import, engine/headless check, target build/export, gameplay smoke test, performance check).
5. Demonstrate a seeded failure, diagnosis, repair, and a fresh successful retest through that runner.
6. Only after the capability/reliability gates are met, return to front-end polish.

## Checklist and honest status

The checklist currently has **15/150 boxes (10.0%)** after adding eight explicit multi-language/game-engine acceptance gates and verifying the two discovery gates. This is checklist progress only, not a measured product-capability percentage. The separate rough overall capability estimate is uncalibrated and should not be reported as a precise metric.

The 26-language/10-engine detector is discovery only. Universal multi-language execution, production-scale game-engine generation, scientific-result correctness, a deployed GitHub App token broker, local inference runtime completeness, and physical Android acceptance are **not** claimed complete.

## Useful links

- Roadmap: `ROADMAP.md`
- Progress ledger: `docs/ROADMAP_PROGRESS.md`
- Feature audit: `docs/FEATURE_AUDIT.md`
- Implementation priorities: `docs/IMPLEMENTATION_PRIORITIES.md`
- Capability boundary and acceptance plan: `docs/LANGUAGE_AND_GAME_ENGINE_CAPABILITIES.md`
- Direct latest APK asset: https://github.com/gtxnrg-ship-it/kuro-chan/releases/latest/download/Kurochan.apk
