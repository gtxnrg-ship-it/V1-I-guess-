# Kuro-chan: original vision and implementation map

Audit date: 2026-10-17.

This is the product reference for the intended Kuro-chan experience. It separates current foundations from incomplete integrations and future goals. A prompt, UI control, catalogue entry, or roadmap checkbox is not proof of an end-to-end feature.

## Product definition

Kuro-chan is a chat-first AI engineering companion for non-coders. Ordinary conversation and brainstorming should flow naturally; when a user asks to build something, the same conversation can coordinate research, planning, implementation, testing, repair, and delivery.

## Intended user experience

- Mature, kind, lightly funny, and naturally imperfect. Adapt to the user's conversation style over time without forcing jokes or profanity.
- Explain engineering in plain language and ask only questions that materially change the result.
- Make progress, relevant sources, reference images, diffs, tests, and artifacts visible in the conversation when they help. Avoid turning every action into a prominent card.
- Preserve project boundaries, decisions, checkpoints, and user control.
- Tell the truth about what was inspected, changed, tested, passed, failed, skipped, or not run.

## Capability audit

| Area | Existing foundation | What is not yet proven complete |
|---|---|---|
| AI providers | Provider adapters, streaming, role-based router, model fallback | Provider access and limits vary. GPT-OSS 20B currently routes to a remote Pollinations-compatible endpoint; it is not bundled local inference. |
| Engineering agents | Talker, Researcher, Planner, Builder, Checker, tool registry, QA harness, runtime diagnostics, checkpoints | A full build/test/repair/retest path still needs representative end-to-end acceptance. |
| GitHub | API client, repository inspection, branch/commit/PR primitives, client-side authorization path | A polished installation-based GitHub App needs a trusted server-side broker for short-lived installation tokens. The App private key must never ship in the client. |
| Local chat models | Curated model candidates and device-fit guidance | The catalogue does not download or run its listed models. A supported Android inference runtime, exact compatible artifacts, download/install/load/smoke-test/delete lifecycle, and routing only when Ready are needed. |
| Voice | Native Android speech input/TTS, browser fallbacks, on-demand local Kokoro speech synthesis | Speaking a finished response is not the same as fully verified live voice conversation. Physical-device acceptance remains necessary. |
| Memory | Editable project facts/decisions, open questions, summary, credential filtering, project isolation | This is not unlimited perfect memory. Keep evidence, task state, architecture decisions, and project scoping explicit. |
| Personality | Base Kuro-chan persona, saved playfulness and reply-length settings | Adaptation should be lightweight, local, reversible, and subordinate to explicit instructions and serious contexts. |
| Chat UI | Markdown, tool traces, image/source support, progress and actionable controls | Natural conversation should be the default; keep tool detail quiet and expandable. |
| App generation | Templates, file tools, esbuild preview/QA harness, test/runtime checks, export/publish paths | Browser preview is not a substitute for a real target build and runtime test. |
| Large projects | Prompts for larger architecture, games, code editing and preview foundations | Engine-scale work must be staged into tested vertical slices with subsystem boundaries, performance budgets, assets, and platform acceptance. Never claim to recreate all of Unreal Engine in one prompt. |
| Android delivery | Capacitor configuration and GitHub Actions debug APK workflow | CI success alone does not prove physical-device behavior or production signing. Tie artifacts to exact commit and workflow evidence. |

## GitHub App target

The intended experience is a built-in GitHub App installation. The user installs the App and chooses repository access. Kuro-chan receives only granted permissions and works on isolated feature branches. The App private key stays in a trusted server-side token broker; the client receives short-lived installation tokens. The UI must distinguish an installation link from a working authenticated session. If no broker is deployed, do not claim seamless GitHub App installation is available. The existing Device Flow is an interim account-auth path, not the final architecture. Personal access tokens must not be accepted as a substitute for the App installation.

Acceptance requires in-app installation/connection, clear permissions, repository and branch listing, base commit and sync state, repository inspection before planning, readable diffs, checks, pull requests, and safe recovery from expired access, rate limits, network failures, and conflicts. Publishing, merging, and destructive actions require confirmation.

## Local model target

A catalogue must connect to a real runtime, not just model-card links. Each installable model needs an exact artifact URL/revision, license/access gate, format, byte size, checksum when available, runtime compatibility, hardware guidance, and tested configuration.

Required lifecycle: Available → Downloading → Downloaded → Installing → Loading → Smoke test → Ready. Failures become Failed with a plain-language reason and retry/cleanup path. Downloads need progress, cancellation, free-space checks, integrity validation, and deletion. Routing ignores anything except Ready. Start with one small Android-compatible quantized model and measure latency, memory, heat, and offline inference on physical devices before expanding the catalogue.

## Voice target

Existing work includes native Android speech recognition, native TTS, browser fallbacks, and on-demand local Kokoro speech generation. This is meaningful implementation. “Voice is done” still requires physical-device tests for microphone permission, unavailable speech services, noisy environments, language mismatch, stop/cancel, app lifecycle, audio focus, interrupted playback, and first-use model downloads. Live low-latency turn-taking is separate from speaking a completed reply.

## Engineering workflow target

For substantial tasks: inspect repository instructions, the accessible tree, manifests, entry points, architecture, tests, and Git state; plan from evidence; create a checkpoint; implement a cohesive change; run project-specific tests/builds and target-runtime checks where possible; repair failures and rerun affected checks; report changed areas, evidence, uncertainty, and PR/build/artifact links.

A calculator can be one small end-to-end task. A large game engine is a long program split into architecture and tested vertical slices. Kuro-chan can help build very large software, but must not promise every subsystem of a mature engine without the implementation, tooling, assets, platform testing, and maintenance such a project requires.

## Long-term memory

Store project-scoped facts, decisions, open questions, task plan, changed files, base commit, and verification evidence. Mark each item as user-confirmed, repository-observed, or model-proposed. Never turn a suggestion into canon. When resuming, compare the stored base SHA with the current repository. Users must be able to inspect, edit, and delete saved memory.

## Non-negotiables

- No fake model-ready state based only on a name or download.
- No App private key in browser code, Vite variables, APK, or public repository.
- No successful status when checks did not run or failed.
- No endless generic cards that make ordinary conversation feel like an admin dashboard.
- No claim that an entire Unreal-class engine is complete because starter files were generated.
