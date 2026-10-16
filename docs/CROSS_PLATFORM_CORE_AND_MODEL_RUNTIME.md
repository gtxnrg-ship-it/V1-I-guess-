# Kuro-chan cross-platform core and model runtime plan

## Goal

Kuro-chan should be one AI engineering product with a shared agent core, not a browser-only product that happens to be wrapped in Capacitor. Android APK is a first-class deliverable. Linux desktop is the first desktop target; Windows and macOS should be enabled through the same shared core and platform adapter contract.

This document records the target architecture and the verified gaps before large refactors begin. It is not a claim that these capabilities already exist.

## Current repository evidence

- The UI is React + Vite, with `base: "./"` and a `dist` web build.
- `capacitor.config.json` points Capacitor at `dist`; the Android workflow creates a Capacitor Android project during CI and builds a debug APK.
- Core state and project files are stored through a browser IndexedDB wrapper in `src/engine/db.ts`.
- The model router in `src/engine/router.ts` ranks configured API model candidates by agent role and retries across keys/models.
- `src/engine/local-models.ts` is a curated catalogue and RAM heuristic. Its own comments correctly state that a candidate is not runnable until an artifact format and runtime are supported.
- `src/engine/providers.ts` defines the “GPT-OSS 20B (free)” entry using the Pollinations remote endpoint. This configuration does not prove that GPT-OSS 20B weights are bundled in the APK or loaded locally.
- GitHub sign-in primitives exist, but `src/engine/github-auth.ts` explicitly documents that the complete authorization exchange and secure persistence are not implemented there.
- Repository inspection and project memory have utility-level foundations; the next steps must wire them into the real project connection and agent flow.

## Target architecture

```text
React UI (shared)
  -> Application services (projects, tasks, settings, permissions)
    -> Kuro-chan agent core (talk/research/plan/code/check)
      -> Model router
        -> Remote provider adapters (multiple keys, per-role selection, health/cooldowns)
        -> Local model manager
          -> artifact catalogue + verified downloads + install state
          -> platform inference adapter
    -> Tool execution broker (explicit capabilities, approvals, audit)
    -> Project memory and task/checkpoint persistence
  -> Platform adapters
    -> Android: Capacitor/native plugins, app-private storage, lifecycle/background limits
    -> Linux desktop: Tauri shell and native services
    -> Windows/macOS: same desktop shell contract where supported
    -> Web/dev: limited fallback adapter, not the only architecture
```

## Non-negotiable design rules

1. **One shared core.** Business logic, agent orchestration, model scoring, task state, and project memory must not be forked per platform.
2. **Platform capability interfaces.** Core code requests secure storage, filesystem access, model execution, notifications, and lifecycle support through typed interfaces. Each platform implements only capabilities it can safely provide.
3. **No false local-model status.** A catalogue entry is not installed; a downloaded file is not a runnable model; a successful load is not proof of useful inference. Statuses should distinguish `available`, `downloading`, `downloaded`, `installing`, `ready`, `failed`, and `unsupported`.
4. **Artifact provenance and verification.** Every downloadable model needs an exact artifact URL, license/access notes, format, byte size, checksum or signed manifest where available, and an inference-runtime compatibility declaration. Do not guess a URL or treat a model repository page as a direct model file.
5. **Model routing uses real capability.** Rank available candidates by role, tool-call support, context size, vision support, latency/quality estimates, cost/free tier, device resource budget, and recent health. A local model is eligible only after the runtime reports it ready.
6. **API keys remain isolated.** Keys belong to provider records; never log them, put them in source control, or embed server-side provider secrets in the APK. Multiple keys may be tried in a controlled fallback chain, but authentication failures should mark the specific credential unhealthy rather than blindly retrying it.
7. **No silent partial-answer fallback.** If a model has already emitted answer tokens, don't silently restart on another model and concatenate incompatible answers.
8. **Android is not a Linux desktop.** Native filesystem and background execution assumptions must be expressed through adapters. Linux desktop should use a supported native shell, not depend on Android-only APIs.
9. **Security by default.** Repository code and plugins are untrusted. Build/test execution belongs in an isolated runner with bounded resources; tool access and write operations must be auditable and permissioned.
10. **Evidence before completion.** Each feature is only marked verified when automated checks or an explicit runtime test support the claim. Debug APKs must not be described as production-signed releases.

## Model router contract

The router should accept a task request and return an explainable decision:

- task role: talk, research, plan, code, check, or a future specialized role;
- candidate source: provider API, local runtime, or user-selected override;
- required capabilities: tool calls, vision, context window, structured output;
- constraints: offline-only, budget/free-only, preferred provider, device budget;
- candidate readiness and health;
- selected model, reason, and fallback plan.

The default behavior should favor a strong coding model for implementation, fast economical models for conversation, and local models for offline/low-cost work when their measured quality and device fit are sufficient. The user can override routing. Routing decisions must be visible in Settings and task history.

## Local model download/install contract

Each model record must define:
- stable ID and version/revision;
- license and any access gate;
- exact artifact URL(s), expected byte size, and format;
- integrity verification (SHA-256 at minimum when a trusted digest is available);
- supported runtime and supported platforms;
- RAM/storage guidance, with estimates clearly labelled as estimates;
- install location managed by the platform adapter;
- load/inference smoke test;
- delete/update/repair behavior.

Downloads must support progress, cancellation, retry/resume where the transport supports it, free-space checks, and cleanup after integrity failures. Large weights should normally be downloaded after installation rather than embedded in the APK unless the chosen artifact is intentionally small and APK size constraints are understood.

## Cross-platform implementation sequence

1. **Audit and baseline:** inventory routes, storage, browser globals, native dependencies, model assets, current CI, and actual APK artifacts. Record test/build results.
2. **Shared platform contract:** introduce typed interfaces and a web/dev implementation with explicit capability reporting. Keep the current app working.
3. **Android adapter:** use Capacitor/native plugins for secure storage and app-private files; verify lifecycle and model file persistence.
4. **Router integration:** use role-based API candidates plus local candidates only when their runtime status is ready. Add deterministic unit tests for selection, exclusions, and fallback.
5. **Local model runtime:** choose a maintained inference engine with Android and Linux support (and confirm license, package size, artifact formats, and hardware support) before selecting model artifacts. Do not select a runtime based on marketing claims alone.
6. **Download manager:** implement verified artifact downloads, install state, progress, cancellation, and smoke tests.
7. **Desktop shell:** package the shared UI/core with Tauri for Linux first; add Windows/macOS builds only after the Linux path and native interface are stable.
8. **Authentication and tool execution:** finish GitHub authorization and secure credential storage; use isolated CI/runner execution for arbitrary project builds.
9. **End-to-end acceptance:** test repository connect -> inspect -> plan -> change -> test -> repair -> PR, plus offline local inference, model download interruption, app restart, and artifact delivery on each supported platform.

## Definition of done

A capability is done only when:
- its UI is connected to a real implementation;
- unsupported platforms show an honest explanation;
- failure, cancellation, retry, and restart paths are handled;
- secrets and untrusted code have defined security boundaries;
- unit/integration tests cover the main success and failure cases;
- CI builds the relevant targets;
- an end-to-end check demonstrates the user-visible behavior;
- docs state any remaining platform, model, or license restrictions.

## Explicitly not claimed yet

This repository audit has not established that GPT-OSS 20B weights are bundled in the APK, that any local model can currently be loaded for inference, that the model catalogue downloads/install models, or that a Linux desktop package exists. Those require artifact/source inspection and actual runtime verification.
