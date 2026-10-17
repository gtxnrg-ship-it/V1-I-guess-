# Kuro-chan feedback, release, and model evolution

Status: product/engineering policy and acceptance criteria. This document does not claim that automated telemetry, model downloads, staged rollouts, or feedback ingestion already exist.

## Product principle

Kuro-chan is intended for a broad public audience. The system must improve continuously without making users unpaid QA, exposing their private work, silently changing behavior, or sacrificing reliability for novelty.

Feedback is evidence to evaluate, not an instruction to implement every request. Popularity helps prioritize; security, privacy, accessibility, correctness, and user safety can override vote counts.

## Public feedback paths

Use GitHub issues as the initial transparent intake channel:
- **Bug report:** reproducible failure, expected behavior, app/build version, platform, and optional sanitized logs.
- **Feature request:** user problem, who it affects, expected outcome, alternatives, and main benefit.
- **General feedback:** friction, confusing wording, onboarding problems, accessibility needs, or a small suggestion that does not fit the other forms.
- **Security report:** sensitive vulnerabilities must not be posted in public issues. Direct users to the repository's configured private security reporting channel when available; if none is configured, configure one before public launch.

Repository comments and pull-request reviews are useful for discussing a concrete implementation. They should not be the only product feedback channel: comments can become hard to discover, may be tied to developer terminology, and can disappear from view as discussions grow. Summarize actionable decisions in a tracked issue and link back to the source discussion.

## Privacy and consent

- Never automatically upload chat transcripts, prompts, generated source code, repository contents, model inputs/outputs, credentials, or personal information as feedback telemetry.
- Ask the user to deliberately submit feedback. Show the exact text and attachments before sending.
- Diagnostic bundles are optional and must be previewable. Redact tokens, API keys, authorization headers, filesystem paths where practical, and private repository identifiers; do not assume a regex makes arbitrary logs safe.
- Collect the smallest useful context: Kuro-chan version/build, platform/OS version, feature area, a reproducible error code, and relevant test outcome. Keep prompts and source code out by default.
- Provide a clear statement of what will be public in a GitHub issue. Warn users that issue text and attachments are public when the issue is public.
- Respect deletion requests where operationally possible and document retention. Do not promise deletion from third-party caches, forks, or notifications.
- Do not use private user conversations to train or fine-tune models unless a separate, explicit, informed opt-in and appropriate data governance are in place.

## Triage and prioritization

For every actionable submission:
1. Acknowledge receipt and label its area (chat/agents, models, voice, GitHub, Android, UI/accessibility, privacy/security, documentation, or other).
2. Check for duplicates and link related reports rather than creating fragmented work.
3. Record impact and evidence: affected platform/version, frequency, severity, reproducibility, workaround, and whether data loss or a security issue is possible.
4. Separate user-reported facts, maintainer reproduction, and hypotheses.
5. Prioritize in this order: security/privacy/data loss; crashes and broken core workflows; correctness and accessibility; high-impact repeated friction; model quality/cost/performance; new features.
6. For feature requests, state the user problem and acceptance criteria before implementation. Votes inform impact but do not replace technical or accessibility judgment.
7. Close the loop: link the planned issue/PR/release note, explain when a request is declined or deferred, and avoid promising dates without capacity.

At scale, use a public roadmap with clear states such as triage, accepted, planned, in progress, needs feedback, and shipped. Review the backlog on a regular cadence, merge duplicates, and publish concise release notes. Do not expose private user details in the public roadmap.

## Model evolution: a reviewed registry, not hard-coded names

New and stronger models will arrive continuously. Keep the model catalogue data-driven and versioned so new candidates can be evaluated and added without rewriting the agent core. The catalogue must describe a model accurately and separately from whether it is usable on a specific device.

Each registry entry needs:
- Stable model ID, family, exact upstream repository and immutable revision.
- Exact artifact/quantization/format and byte size, verified download URL, checksum or signed manifest where available.
- License, attribution, gated-access requirements, redistribution restrictions, and any user action needed to accept terms.
- Required runtime/backend version, supported platform/architecture, tokenizer/template, context limit, tool-call/JSON/vision/audio capabilities, and known limitations.
- Conservative RAM/storage estimates and measured performance results with device, OS, runtime, quantization, prompt/context, and measurement method.
- Evaluation-suite version, results, date, evaluator, and status (candidate, validated, staged, current, deprecated, blocked).
- Compatibility and migration notes, rollback target, and known security/advisory status.

Never infer that a model is stronger just because it is newer, larger, or popular. Compare models on representative tasks: instruction following, coding correctness, tool-call reliability, long-context behavior, latency, memory, thermal throttling, energy use, accessibility/language coverage, safety, and licensing. Separate public benchmark claims from Kuro-chan's own reproducible measurements.

## Safe model release lifecycle

1. **Discover:** add a candidate to a review queue; do not mark it installable or preferred.
2. **Validate provenance:** check upstream ownership, immutable revision, exact artifacts, hashes, license, access gates, and runtime compatibility.
3. **Evaluate:** run a fixed, versioned test suite including regressions and adversarial/unsafe inputs; compare against the current supported model.
4. **Test on hardware:** measure install/load/inference success, peak memory, latency, storage, heat, battery impact, and recovery on a device matrix. Emulator-only results are insufficient for mobile readiness.
5. **Stage:** ship behind an explicit opt-in or staged percentage only when the deployment architecture supports it. Keep the known-good version available.
6. **Observe with consent:** collect only privacy-preserving operational counters if telemetry is explicitly enabled. No prompt/content collection by default. Provide a kill switch.
7. **Promote or roll back:** promotion requires acceptance thresholds and a documented reviewer decision. Roll back quickly on crash, quality, security, license, or performance regressions.
8. **Deprecate responsibly:** explain why a model is deprecated, preserve user control over locally stored models, and do not delete user data as part of a model update.

For downloaded on-device models, validate the artifact before loading, isolate model files in app-private storage, support cancellation/retry/removal, and never run model-provided code as an extension. A failed download or load must leave the previous working model intact.

## Public-scale reliability and governance

Before a large public launch, define service objectives and test them:
- Availability and latency for each remote provider and major workflow.
- Crash-free sessions and Android install/update success.
- Task completion, build/test pass rate, recovery rate, and false-success rate.
- Model download/load success and resource consumption by device class.
- Accessibility and localization checks.
- Security response and dependency-update cadence.

Report metrics with denominators, date windows, and platform breakdowns. Do not publish a vanity percentage without explaining what it measures. Use opt-in, minimized, aggregated diagnostics; do not quietly add tracking.

Use dependency pinning, lockfile checks, SBOM/dependency review where practical, automated security scans, signed release artifacts when configured, reproducible build evidence where feasible, and a documented rollback procedure. A green CI run is necessary evidence, not proof of every real-device scenario.

## Acceptance checklist

- [ ] Feedback form supports general feedback as well as bug reports and feature requests.
- [ ] Public issue forms warn against sharing secrets and private code.
- [ ] A security reporting path is configured before public launch.
- [ ] Feedback submission is user-initiated with a preview of public content and optional redacted diagnostics.
- [ ] Feedback triage states, labels, deduplication, and release-note links are maintained.
- [ ] Model registry entries use immutable revisions, verified artifacts, license metadata, and runtime compatibility.
- [ ] A repeatable model evaluation suite blocks regressions before promotion.
- [ ] Device test results include latency, peak memory, thermal behavior, and successful offline inference where claimed.
- [ ] Rollback preserves the last known-good model and user data.
- [ ] Telemetry is opt-in, minimized, documented, and content-free by default.
