# Kuro-chan Roadmap 🌸

This is the living plan for Kuro-chan: a chat-first AI coding companion that can grow from a useful mobile-friendly studio into a reliable, project-aware engineering agent. For the ranked execution order and anti-duplication rules, see [Implementation priorities](docs/IMPLEMENTATION_PRIORITIES.md). For the evidence-based workstream inventory and unverified acceptance gates, see the [verified feature audit](docs/FEATURE_AUDIT.md).

**Status key:** checked items have a foundation in the current repository; unchecked items are planned, in progress, or still require stronger verification. A roadmap is not a promise that every feature already exists.

## Now — make the current app solid

### Current foundations

- [x] Chat-first responsive studio with a collapsible sidebar and no permanent mobile bottom navigation.
- [x] Animated orb identity and a conversation-led main workspace.
- [x] Project switching and local project state.
- [x] Projects and Activity views.
- [x] Code inspection view.
- [x] Organized Settings hub.
- [x] Voice playback controls, including stopping playback.
- [x] Automated Android APK packaging and release publishing through GitHub Actions.
- [x] Regression tests, TypeScript checks, production build checks, browser smoke tests, and security scanning in CI.

### Next reliability work

- [ ] Test the latest Android APK on real phones at different screen sizes and Android versions.
- [ ] Confirm the original Kuro-chan artwork is used consistently for app branding and Android launcher/adaptive icons.
- [ ] Test chat creation, project switching, history persistence, and app restart behavior end to end.
- [ ] Verify voice playback and interruption on actual Android devices, including permission denial and unavailable audio.
- [ ] Verify native speech input on real Android devices across permission denial, speech-service unavailable, pause/resume, language, and background/foreground transitions.
- [ ] Improve first-run onboarding so users know how to start a project, configure a model, and connect a repository.
- [ ] Audit every visible button and menu item for a working action, clear disabled state, or honest explanation.
- [ ] Improve loading, empty, offline, error, retry, and success states.
- [ ] Add reproducible device/build information to bug reports without collecting private prompts or code by default.

## Original-vision alignment — product acceptance gates

These gates describe the intended Kuro-chan experience. A catalogue, prompt, or UI button is not proof of an end-to-end feature.

- [ ] Default interaction remains normal, continuous chat for brainstorming and everyday questions; build orchestration starts when the user's intent calls for it.
- [ ] Kuro-chan adapts naturally to recent conversation style while respecting explicit settings and serious contexts.
- [ ] Chat defaults to readable conversation with inline progress and expandable tool details; remove prominent action-card clutter where it adds no value.
- [ ] Repository understanding reads the accessible tree and key source/config/test files before planning, records skipped files, and tracks the exact base commit.
- [ ] GitHub App installation uses a trusted server-side broker for short-lived installation tokens; never ship an App private key in the client. Keep Device Flow explicitly interim if retained.
- [ ] The GPT-OSS label accurately identifies the actual endpoint/model. Never describe a remote endpoint as on-device inference.
- [ ] Local chat-model downloads use verified artifacts and a supported Android inference runtime; the UI reports Ready only after load and inference smoke test.
- [ ] Voice acceptance tests cover physical Android devices, interruption/cancellation, permissions, lifecycle, and offline/local speech. Speaking a completed reply is not the same as live voice conversation.
- [ ] A representative app is created, built, tested, repaired after a seeded failure, and retested end-to-end before claiming autonomous workflow reliability.
- [ ] Large projects are delivered as tested vertical slices with architecture notes, subsystem boundaries, performance budgets, and release evidence.
- [ ] README, roadmap, and release notes separate implemented, partial, planned, and device-unverified features.

## Public feedback and model evolution — release gates

- [ ] Add a public general-feedback path alongside bug reports and feature requests, with clear warnings that public posts are visible.
- [ ] Define feedback triage labels/states, duplicate linking, severity, impact, and a public close-the-loop process.
- [ ] Ensure feedback is explicitly submitted by the user; diagnostics are previewable, optional, redacted, and content-free by default.
- [ ] Configure a private security reporting path before public launch; never ask users to disclose vulnerabilities in public issues.
- [ ] Keep a versioned model registry with immutable revisions, exact verified artifacts, license/access requirements, runtime compatibility, and device-fit metadata.
- [ ] Add a fixed regression/evaluation suite before promoting a newer model; measure task quality, tool reliability, latency, peak memory, thermal behavior, and battery impact.
- [ ] Stage model changes only when rollout controls exist, preserve a known-good version, and document a rollback path.
- [ ] Make model updates user-controlled, preserve project data, and never execute downloaded model files as extension code.
- [ ] Publish release notes and model changes with exact versions, limitations, and verification evidence.

## P0 — trustworthy engineering and safety

- [ ] Make every significant change reviewable with a clear summary and file diff.
- [x] Add snapshots/checkpoints before risky edits and a way to restore a prior project state. The studio exposes named checkpoints and creates a safety checkpoint before restoring files.
- [ ] Prevent API keys, tokens, and other secrets from entering generated code, commits, logs, or public artifacts.
- [ ] Require explicit confirmation for consequential actions such as publishing, overwriting, or changing repository permissions.
- [ ] Show the exact checks that ran, their results, and what remains unverified.
- [ ] Make failures actionable: explain build errors, provider errors, timeouts, quota limits, and permission denials.
- [ ] Add bounded retries, cancellation, and safe recovery from interrupted tasks.
- [ ] Test project generation against real dependency installation, tests, and production builds.
- [ ] Add security/dependency scanning and explain findings in plain language.
- [ ] Add artifact integrity checks and associate downloads with a specific source commit and build.
- [ ] Keep diagnostics opt-in and avoid uploading prompts, source code, or private project content without explicit consent.

## P1 — complete GitHub connection and repository workflow

- [ ] Implement installation-based GitHub App authorization with a trusted token broker; keep any interim Device Flow clearly labelled and never embed an App private key in the client.
- [ ] List repositories available to the authenticated GitHub account, respecting private-repository permissions.
- [ ] Import an existing repository by selection or URL, including an empty repository.
- [ ] Show the selected repository, branch, commit, and sync state clearly.
- [ ] Support branch selection, feature branches, and pull-request creation.
- [ ] Inspect repository structure, framework, package manager, scripts, dependencies, and likely build risks before edits.
- [ ] Generate a human-readable diff and let users review or selectively accept changes.
- [ ] Detect upstream changes and explain merge conflicts before writing.
- [ ] Support safe syncing and recovery from failed pushes or interrupted operations.
- [ ] Handle GitHub rate limits, missing permissions, deleted repositories, and network failures gracefully.
- [ ] Explain minimum required permissions and provide a clear disconnect/revoke path.
- [ ] Never treat a matching email address alone as proof of account ownership or privileged identity.

## P1 — project understanding and task memory

- [ ] Keep useful conversation history and independent context for each project/session.
- [x] Make project memory inspectable, editable, and deletable by the user. The Memory workspace manages facts, decisions, open questions, and the hand-off summary with credential filtering.
- [ ] Remember important architecture choices, user constraints, and decisions without inventing facts.
- [ ] Read repository instructions and existing conventions before planning edits.
- [ ] Build a project map of key files, dependencies, entry points, tests, and architecture.
- [ ] Track task plans, completed steps, pending work, and verification evidence.
- [ ] Resume interrupted tasks with an honest summary of what is known and what must be checked again.
- [ ] Keep memories scoped to the correct project and avoid leaking context between unrelated repositories.

## P1 — specialist agents and autonomous work

- [ ] Strengthen the Talker, Researcher, Planner, Builder, and Checker roles with clear responsibilities.
- [ ] Allow agents to hand off structured findings, plans, diffs, and test results to one another.
- [ ] Show understandable progress: current step, elapsed time, changed files, and blockers.
- [ ] Add bounded multi-step execution with checkpoints and user approval for risky actions.
- [ ] Let the Checker verify generated changes with relevant tests and production builds.
- [ ] Allow safe repair attempts after failed checks, followed by a fresh verification run.
- [ ] Prevent agents from reporting success when required tools or tests did not run.
- [ ] Support cancellation, pause/resume, and recovery when a model or external tool becomes unavailable.
- [ ] Explore optional parallel research and independent code review where it genuinely improves results.

## P1 — multi-language, scientific, and game-engine capabilities

Kuro-chan must recognize the kind of project before proposing commands, then use real, isolated toolchains and project-specific acceptance tests. Listing languages or suggesting commands is not proof of execution.

- [x] Detect 26 language families from repository evidence and expose candidate toolchains/build/test guidance through the agent capability-inspection tool. (PR #149; regression checks in PR #150.)
- [x] Detect 10 game-engine families from explicit project markers and supported Cargo/package.json dependency evidence, without assuming every Rust or JavaScript project is a game.
- [ ] Inspect actual manifests, scripts, lockfiles, versions, and CI configuration before selecting exact build/test commands; distinguish candidates from commands actually run.
- [ ] Provide a permissioned isolated runner with explicit allowlists, resource/time limits, cancellation, controlled network/filesystem access, and exact command/exit-code/log evidence.
- [ ] Support bounded dependency installation and build/test adapters for the detected toolchain, including actionable missing-SDK/runtime and unsupported-platform failures.
- [ ] Prove a representative multi-language project through real build, tests, a deliberately seeded failure, repair, and a fresh successful retest.
- [ ] Add scientific/statistical acceptance fixtures for known-answer numerical results, assumptions, data provenance, reproducibility, uncertainty reporting, and performance.
- [ ] Add game-engine vertical-slice acceptance for asset import, headless/editor checks, target export/build, gameplay smoke tests, and target-device performance; a successful compile alone is insufficient.

## P1 — models, routing, and cost transparency

- [ ] Build a model catalog with provider, context length, vision, tool calling, latency, and limitations.
- [ ] Allow model selection per task or agent.
- [ ] Explain automatic routing and why a model was selected.
- [ ] Show usage estimates or available cost information when providers expose it.
- [ ] Add configurable usage budgets, quota awareness, and explicit fallback reasons.
- [ ] Handle streaming interruptions, request cancellation, bounded retries, and timeouts.
- [ ] Support compatible endpoints where practical, with validation and connection diagnostics.
- [ ] Improve optional Ollama integration and document network/CORS setup clearly.
- [ ] Explore browser-local WebGPU/WASM inference for compatible models and devices.
- [ ] Before offering model downloads, show size, hardware requirements, storage use, cache controls, and deletion options.
- [ ] Fall back gracefully when a phone or browser cannot support a requested model.

**Free-first goal:** make it easy to use free or self-hosted options where available. Do not promise unlimited free AI; provider pricing, quotas, terms, and uptime are outside Kuro-chan's control.

## P1 — voice and natural conversation

- [ ] Make speech playback interruption reliable across mobile browsers and Android builds.
- [x] Add native Capacitor speech recognition on Android with permission checks, partial transcript updates, explicit stop, and browser Web Speech fallback. (Real-device accuracy and OEM behavior remain unverified.)
- [ ] Explore live, low-latency voice conversation with natural turn-taking.
- [ ] Add configurable voices, speaking speed, and audio behavior.
- [ ] Keep spoken output synchronized with the current response and stop it immediately on request.
- [ ] Provide text alternatives and usable controls when audio is unavailable.
- [ ] Test voice behavior under poor connectivity, app backgrounding, and device audio interruptions.
- [ ] Refine Kuro-chan's warm, playful, situational personality without forcing jokes or pretending to be human.
- [x] Let users control the degree of playfulness, verbosity, and personalization through saved settings. Regression coverage verifies the preferences survive navigation. (PR #96)

## P1 — UI, accessibility, and device support

- [ ] Keep one coherent chat-first design across phone, tablet, and desktop layouts.
- [ ] Verify original Kuro-chan artwork, brand colors, and launcher assets across app surfaces.
- [ ] Improve keyboard navigation, accessible labels, visible focus, contrast, and screen-reader behavior.
- [ ] Respect reduced-motion preferences and provide sensible animation fallbacks.
- [ ] Improve compact layouts for low-resolution phones and larger text settings.
- [ ] Add searchable prompt recipes and reusable project templates.
- [ ] Make settings export/import possible without including secrets.
- [ ] Explore additional desktop packaging only after the web and Android experiences are stable.
- [ ] Explore localization and offline-friendly documentation.

## P1 — Visual Intent Studio (core creation experience)

The user can describe a product or feeling without knowing UI terminology. Kuro-chan researches visual references, confirms the intended direction with the user, translates feedback into a design brief, and implements the approved design in the real project.

- [ ] Research real UI references and show a small gallery with image previews, source links, and attribution.
- [ ] Clearly distinguish original source images, thumbnails, generated previews, and unavailable/blocked images; never present placeholders as real references.
- [ ] Let users select a reference and annotate or select a specific region to discuss.
- [ ] Accept informal language, typos, incomplete English, and mixed requirements; ask concise clarifying questions only when ambiguity materially changes the result.
- [ ] Let users compare several design directions when they know the desired feeling but not the desired layout.
- [ ] Build an editable design brief from approved references and feedback: layout, navigation, typography, color, spacing, components, interactions, responsiveness, and accessibility.
- [ ] Preserve approved and rejected design decisions per project so later iterations don't silently undo them.
- [ ] Show a live preview of the actual project, support before/after comparison, and let users refine selected elements conversationally.
- [ ] Checkpoint before applying substantial design changes and provide a reviewable file diff.
- [ ] Validate responsive behavior and run relevant tests/builds before reporting completion.
- [ ] Handle missing search credentials, blocked image hosts, network failures, and unsupported image formats with honest fallbacks.
- [ ] Track source URLs and asset licensing/attribution; do not copy proprietary assets blindly or imply affiliation with referenced products.

**Acceptance principle:** a user with no coding experience can describe an idea, understand the proposed visual direction, approve or revise it, and receive a working implementation with an honest verification report.

## P2 — templates, tools, and integrations

- [ ] Add useful project templates and guided starts for common app types.
- [ ] Add framework-aware test suggestions and optional accessibility audits.
- [ ] Add documentation and package/API lookup with source links and freshness indicators.
- [ ] Add image attribution and asset-license tracking for generated projects.
- [ ] Explore optional MCP-compatible integrations with explicit permission boundaries.
- [ ] Add a tool/plugin capability page that explains exactly what each integration can read or change.
- [ ] Add reusable workflows and prompt recipes that can be shared without sharing secrets.
- [ ] Add optional design/reference research workflows and make provenance clear.
- [ ] Improve generated project documentation, setup instructions, and deployment guidance.

## P2 — delivery, releases, and quality of life

- [ ] Show build status, commit identity, release notes, and artifact links inside the app.
- [ ] Improve release notes and a user-visible changelog.
- [ ] Add clear update guidance and safe upgrade behavior for Android builds.
- [ ] Verify downloaded artifacts and explain whether a build is debug or production-signed.
- [ ] Add more robust web deployment and hosting workflows where configured.
- [ ] Support packaging/export of project files and task summaries.
- [ ] Improve bug-report collection so it is useful without exposing private source code.
- [ ] Add usage analytics only if explicitly opted in, with clear data controls.

## P3 — longer-term experiments

These are exploratory ideas. They should only be attempted when the core product is dependable.

- [ ] A more capable self-directed engineering mode with user-defined limits and mandatory checkpoints.
- [ ] Optional self-maintenance of Kuro-chan's own repository through an explicitly authorized account, with branch isolation, reviewable diffs, and no hidden privilege escalation.
- [ ] More advanced project-wide reasoning and dependency-aware change planning.
- [ ] Optional local model management for devices that can support it.
- [ ] Deeper integration between conversation, code review, automated QA, and release delivery.
- [ ] A richer ecosystem of extensions and user-created workflows.

## How priorities are chosen

Reliability, privacy, and user control come before feature count. We prefer small changes with tests, visible permissions, reviewable diffs, and honest fallbacks over flashy features that only work in a demo.

A checkbox should only be marked complete when the implementation exists and has been verified to a level appropriate for the feature. Hardware, providers, model weights, external APIs, and third-party services have their own limits and terms.

Have an idea or found a bug? Open a [feature request](https://github.com/gtxnrg-ship-it/kuro-chan/issues/new?template=feature_request.yml) or [bug report](https://github.com/gtxnrg-ship-it/kuro-chan/issues/new?template=bug_report.yml).
