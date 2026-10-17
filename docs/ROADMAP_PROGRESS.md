# Kuro-chan roadmap progress ledger

Last reconciled: 2026-10-17  
Source of truth: [ROADMAP.md](../ROADMAP.md). This ledger separates **roadmap checkbox completion** from **shipped-but-not-yet-checkboxed work** so the percentage cannot be inflated by counting PRs.

## Overall checklist progress

- **9 of 121 roadmap checkboxes complete: 7.4%.**
- Calculation: checked boxes divided by all checklist items currently in `ROADMAP.md`, rounded to one decimal place.
- This is a strict checklist percentage, not a claim that only 7.4% of the product code exists. Several merged changes are not yet represented by checked roadmap items, and partial features do not count as complete.
- Reconcile this ledger whenever roadmap items are added, removed, or verified. Only check a roadmap item when its acceptance criteria are implemented and verified; record evidence below.

## Progress by roadmap section

| Roadmap section | Verified complete | Tracked items |
| --- | ---: | ---: |
| Current foundations | 9 | 9 |
| Next reliability work | 0 | 8 |
| P0 — trustworthy engineering and safety | 0 | 11 |
| P1 — GitHub connection and repository workflow | 0 | 12 |
| P1 — project understanding and task memory | 0 | 8 |
| P1 — specialist agents and autonomous work | 0 | 9 |
| P1 — models, routing, and cost transparency | 0 | 11 |
| P1 — voice and natural conversation | 0 | 9 |
| P1 — UI, accessibility, and device support | 0 | 9 |
| P1 — Visual Intent Studio | 0 | 12 |
| P2 — templates, tools, and integrations | 0 | 9 |
| P2 — delivery, releases, and quality of life | 0 | 8 |
| P3 — longer-term experiments | 0 | 6 |
| **Total** | **9** | **121** |

## Shipped capability evidence

| Capability | State | Evidence / boundary |
| --- | --- | --- |
| Project checkpoint list and restore confirmation | Merged | [PR #81](https://github.com/gtxnrg-ship-it/kuro-chan/pull/81); Check and CodeQL passed before merge. |
| Project deletion/switch recovery guards | Merged | [PR #84](https://github.com/gtxnrg-ship-it/kuro-chan/pull/84); lifecycle regression tests, Check, and CodeQL passed. |
| Truthful execution outcomes | Merged | [PR #85](https://github.com/gtxnrg-ship-it/kuro-chan/pull/85); unresolved build/runtime errors are no longer reported as successful completion. |
| Visual Intent Studio reference board and project design brief | Merged | [PR #83](https://github.com/gtxnrg-ship-it/kuro-chan/pull/83); first slice only, not region annotation or live before/after preview. |
| Approved visual intent passed to app-scoped engineering context | Included in consolidated PR #87 | The integration was first verified on [PR #86](https://github.com/gtxnrg-ship-it/kuro-chan/pull/86), then included in PR #87 alongside GitHub session safety so there is one coherent review path. The consolidated head must pass all checks before either PR is treated as complete. |
| GitHub App Device Flow and credential storage boundary | In this branch; not yet merged | Uses the public App client ID, validates the returned token through GitHub's `/user` endpoint, excludes GitHub tokens from IndexedDB persistence, and removes legacy stored GitHub tokens on startup. |
| Persistent GitHub session | Not complete | This branch deliberately keeps the token in memory only. Users reconnect after restart. A native secure-storage adapter and Android end-to-end coverage are still required before persistent sessions can be claimed. |
| GitHub App registration/configuration | External setup required | A GitHub App must be registered, Device Flow enabled, and `VITE_GITHUB_APP_CLIENT_ID` configured in the build environment. No client secret belongs in the browser or APK. |
| Visual region selection and live preview | Not complete | Explicitly remains outside PR #83/#86 scope. |

## Verification rules

1. Record the exact commit SHA tested, not merely the branch name.
2. Distinguish **passed**, **failed**, **pending**, and **not run**; never infer a pass from an absent check.
3. Run unit tests, TypeScript, production build, E2E, CodeQL, and Android build where applicable. If any required check fails, repair the cause and rerun the affected checks before calling the PR verified.
4. A merged PR is evidence of merged code, not proof every roadmap acceptance criterion is complete.
5. Update the overall percentage from the current roadmap checkbox counts rather than estimating from PR count or lines of code.
