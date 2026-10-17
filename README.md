<div align="center">

# Kuro-chan 🌸

### Your chat-first, GitHub-first AI coding companion.

**Tell her what you want to build. Work through the idea in conversation. Inspect code, coordinate specialist agents, and deliver projects through a workflow you can review.**

[**⬇ Download the latest Android APK**](https://github.com/gtxnrg-ship-it/kuro-chan/releases/latest) · [Roadmap](ROADMAP.md) · [Report a bug](https://github.com/gtxnrg-ship-it/kuro-chan/issues/new?template=bug_report.yml) · [Request a feature](https://github.com/gtxnrg-ship-it/kuro-chan/issues/new?template=feature_request.yml)

[![Android build](https://github.com/gtxnrg-ship-it/kuro-chan/actions/workflows/android.yml/badge.svg)](https://github.com/gtxnrg-ship-it/kuro-chan/actions/workflows/android.yml)
[![Checks](https://github.com/gtxnrg-ship-it/kuro-chan/actions/workflows/check.yml/badge.svg)](https://github.com/gtxnrg-ship-it/kuro-chan/actions/workflows/check.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

</div>

---

## ✨ The idea

Kuro-chan is an open-source AI app-building companion built around a simple principle: **your conversation should be the control room, and your code should remain yours.**

Instead of forcing you into a complicated developer dashboard, Kuro-chan aims to make building feel like talking through a project with a capable teammate. You describe a goal, refine the plan, inspect what changes, and use GitHub and automated builds to move work toward a deliverable.

The interface is chat-first and responsive, with a collapsible sidebar for projects and tools. Kuro-chan has an animated orb identity and a personality designed to feel warm, lively, playful, and useful—not like a sterile corporate form.

> **Status note:** Kuro-chan is under active development. This README describes both current foundations and the longer-term vision. Roadmap items are plans, not claims that those features already exist. Integrations and model capabilities depend on configuration, provider access, and ongoing implementation.

## 📲 Download Kuro-chan for Android

### [Download the latest APK from GitHub Releases](https://github.com/gtxnrg-ship-it/kuro-chan/releases/latest)

The release page contains the newest APK published by the Android build workflow. The latest successful build is not necessarily available the instant a code change is merged; wait until the workflow completes and a new release appears.

1. Open the release link above on your Android device.
2. Download **app-debug.apk** from the release assets.
3. Open the downloaded file and follow Android's installation prompts. You may need to allow your browser or file manager to install unknown apps.
4. If Android warns that the app is from outside the Play Store, install only if you trust the source and understand that this is a development build.

- [View Android build history](https://github.com/gtxnrg-ship-it/kuro-chan/actions/workflows/android.yml)
- [View automated checks](https://github.com/gtxnrg-ship-it/kuro-chan/actions/workflows/check.yml)
- [Browse all releases](https://github.com/gtxnrg-ship-it/kuro-chan/releases)

These are development APKs, not Play Store releases. Back up important project data before testing, and report reproducible issues through GitHub Issues.

## 🧩 GitHub App integration

**The intended experience is a built-in GitHub connection, not a confusing developer-token setup.** Users should connect GitHub inside Kuro-chan, choose repositories, let her inspect the project, and work on a branch with visible diffs and pull requests.

GitHub Apps and OAuth are related but not interchangeable. A GitHub App installation can provide repository-scoped permissions and short-lived installation tokens; issuing those tokens safely requires a trusted server-side component holding the App private key. That private key must never be bundled into a browser build or Android APK. Kuro-chan is currently browser-first and does not yet include that token broker, so the complete installation-based experience is **not finished**.

The repository contains a GitHub API client, repository-inspection foundations, and a client-side Device Flow path that depends on maintainer configuration. That is a partial integration, not the final one-click GitHub App experience. Do not mistake a smoother interim authorization flow for completion of the intended architecture.

Planned connection experience:
1. Install/authorize the Kuro-chan GitHub App from inside the product and choose which repositories it may access.
2. Explain permissions in plain language and provide a clear disconnect/revoke path.
3. Browse accessible repositories and branches, including private repositories only when permission is granted.
4. Inspect the accessible tree, project instructions, build scripts, dependencies, tests, latest commit, and CI state before planning.
5. Work on an isolated branch, display a readable diff, run relevant checks, and create a pull request.
6. Use short-lived, repository-scoped credentials from a trusted broker. Never ship the App private key or claim a public client ID alone enables privileged GitHub App operations.


## 🧭 What is here today?

Current foundations include:

- **Chat-first studio:** a conversation-led workspace with a collapsible sidebar and no permanent mobile bottom-navigation bar.
- **Project switching:** create and switch between locally stored project workspaces.
- **Animated Kuro-chan orb:** a visual identity that can reflect interaction states.
- **Projects and Activity views:** dedicated places to inspect project-related information and recent activity.
- **Code inspection:** browse files associated with the active project.
- **Project memory workspace:** inspect, add, edit, and delete project-scoped facts and decisions, manage open questions, and edit the hand-off summary. Credential-like text is rejected before saving.
- **Checkpoints and recovery:** save named file restore points and restore them with a safety checkpoint created first.
- **Settings hub:** organize configuration for appearance, voice and speech, AI/models, repositories, privacy and security, device performance, and app information.
- **Voice playback controls:** playback can be stopped; voice behavior still needs ongoing device-by-device testing.
- **Project export and delivery tools:** ZIP export and GitHub publishing entry points are available in the studio; exact capabilities depend on configuration and permissions.
- **Specialist-agent architecture:** Talker, Researcher, Planner, Builder, and Checker roles help separate parts of the build workflow.
- **Automated Android packaging:** GitHub Actions builds the Android app and publishes a release when the workflow succeeds.
- **Automated engineering checks:** regression tests, type checking, production build checks, browser smoke tests, and security scanning run through repository workflows.

### Important limitations

The current sidebar can show projects already opened in Kuro-chan, but that should not be confused with the finished installation-based GitHub App experience. In-app installation, repository discovery, scoped installation tokens, branch-aware synchronization, and safe conflict handling remain incomplete until implemented and tested.

Likewise, the long-term vision includes more advanced autonomous engineering, richer voice conversations, model routing, deeper QA, and broader device support. Project memory is currently bounded and user-controlled; automatic extraction of every preference or repository fact is not implemented. Listing an item on the roadmap does not mean it is already implemented.

## 🧠 How the agent workflow is intended to work

| Role | Purpose |
| --- | --- |
| **Talker** | Understands the goal, asks only useful clarifying questions, and helps shape a clear brief. |
| **Researcher** | Finds relevant documentation, APIs, packages, repositories, and reference material through available tools. |
| **Planner** | Breaks the request into a sequence of practical implementation steps. |
| **Builder** | Creates or edits project files using the tools available in the current configuration. |
| **Checker** | Reviews changes, runs available checks, surfaces failures, and helps guide repairs. |

These roles are an architectural direction, not a guarantee that every task will be fully autonomous. Tool access, context limits, model support, external services, and test coverage affect what can be completed. Kuro-chan should make progress and failures visible rather than claiming success without evidence.

## 💬 Personality, natural chat, and memory

Kuro-chan should feel like a conversational companion first and an engineering tool second. Users can brainstorm, ask ordinary questions, share references, change their minds, or request a full build in the same chat. She starts mature, kind, lightly funny, and naturally imperfect—not like a scripted mascot. Over time she can adapt to the user's conversational rhythm, including casual slang and occasional profanity when the user consistently uses it, without forcing a bit or copying every mannerism.

The Talker prompt already defines a warm, playful, honest voice, and saved settings control playfulness and reply length. Recent conversation style adaptation is being added separately. Project memory is inspectable and user-controlled; it is not yet a complete automatic memory of every preference across every project. Memory must remain scoped, explainable, editable, and deletable.

The chat should read like a real conversation. Tools, specialist agents, tests, and sources should be visible when useful, but should not dominate every answer with dashboard cards. Rich previews, images, code diffs, links, and artifact links should appear naturally when they help the user understand the work. Users should be able to ask “what's that?” and get a simple explanation rather than being forced to understand engineering terminology.


## 🧠 Models: cloud providers and true on-device AI

Kuro-chan has a multi-provider model router for configured API providers, role-based model selection, streaming, and bounded fallback behavior. The free starter entry labelled **GPT-OSS 20B** currently calls a remote Pollinations-compatible endpoint; it is not proof that GPT-OSS weights are bundled with Kuro-chan or running locally. Availability, quality, quotas, and model identity depend on the external endpoint.

The Local Models screen currently offers a catalogue and rough device-fit guidance. It does **not yet** download, install, or execute the listed open-weight chat models. A model link is not a working local runtime.

The intended one-tap local-model flow is: choose a compatible model; review exact download size, license, runtime compatibility, and device guidance; download with progress, cancellation, retry, and integrity verification; install into app-private storage; load through a real Android-compatible inference runtime; run an inference smoke test; and only then mark it Ready for model routing. Users must be able to update, repair, unload, or delete models without losing project files.

The catalogue should include practical open-weight chat and coding models from several families, not a list of model-card links presented as runnable software. Kuro-chan must check licenses and access gates, never invent artifact URLs or sizes, and gracefully explain when a phone cannot run a model. Download weights on demand rather than bloating every APK. Offline inference must actually work after installation when the device is offline.


## 🛠️ The original vision: an engineering team in one chat

Kuro-chan is meant to help a non-coder go from a rough idea to a working, tested deliverable. A calculator is a small task; a large game, creative tool, or engine is a long engineering program. She should plan either appropriately, build in phases, preserve decisions, run real checks, repair failures, and explain progress in plain language.

The intended system includes:
- **Natural conversation and adaptive personality:** brainstorming and normal chat without forcing every message into a build workflow.
- **An in-app GitHub App connection:** repository selection, branch-aware work, scoped permissions, diffs, pull requests, and safe synchronization.
- **A specialist-agent pipeline:** research, architecture, implementation, tests, independent review, bounded repair loops, checkpoints, cancellation, and honest verification evidence.
- **Project-wide understanding:** inspect the accessible repository tree, architecture, dependencies, scripts, documentation, and tests before planning; record skipped files and exact base commit.
- **A working local-model manager:** one-tap download, integrity checks, supported mobile inference runtime, smoke test, model routing, offline use, updates, and deletion.
- **Voice conversation:** speech input, natural voice playback, interruption, and clear fallbacks. Local Kokoro speech synthesis and native speech integrations exist, but full real-device reliability and natural live turn-taking are not yet verified.
- **Rich conversational output:** relevant image/reference previews, links, code snippets, diffs, and artifact links embedded naturally instead of a wall of generic cards.
- **Beginner-first explanations:** plain-language choices, useful defaults, concise clarification only when necessary, and a clear explanation of failures.
- **Small-to-large creation:** websites, tools, apps, games, creative software, and eventually large engine-scale projects through staged architecture and testing—not by pretending a single prompt can reproduce an entire mature engine instantly.
- **Professional UI and documentation:** mobile-first chat, coherent settings, accessible controls, accurate feature status, current release links, and setup instructions that match the code.

See [docs/ORIGINAL_VISION.md](docs/ORIGINAL_VISION.md) for the capability map and implementation boundaries, and [ROADMAP.md](ROADMAP.md) for the working list. Planned features are labelled as planned; ambition must never be presented as completed functionality.


## 🔐 Privacy and security

Kuro-chan is browser-first. In the current architecture, ordinary project state and saved settings are stored in browser-local storage rather than automatically uploaded to a Kuro-chan-operated application server.

Please keep these boundaries in mind:

- When you use a cloud AI provider, prompts, relevant context, and any code or images needed for the request are sent to that provider. Its privacy and retention policies apply.
- When you use search, package registries, or other external integrations, relevant requests may be sent to those services.
- GitHub access should be limited to the permissions required for the actions you want to perform. A token is not a substitute for a properly implemented OAuth flow.
- Local model inference sends requests to the endpoint you configure; that endpoint may be on your computer or another machine.
- Browser storage is not a secure vault on a shared or compromised device. Avoid sharing screenshots or logs that contain credentials, and clear saved secrets before handing a device to someone else.
- Never commit API keys, access tokens, private repository contents, or other secrets to source control.

See [SECURITY.md](SECURITY.md) for responsible vulnerability reporting.

## 🧑‍💻 Run Kuro-chan locally

### Requirements

- Node.js 20 or newer
- npm
- A modern browser

### Install and start

```bash
git clone https://github.com/gtxnrg-ship-it/kuro-chan.git
cd kuro-chan
npm ci
npm run dev
```

Vite prints a local development URL. Open that URL in your browser.

### Run checks

```bash
npm test
npm run check
npm run build
npx playwright install chromium
npm run e2e
```

Use the scripts defined by the current repository version; not every environment has the same browser or Android tooling installed. The GitHub Actions workflows are the best place to inspect the exact automated steps and their results.

## 🤝 Contributing

Issues, bug reports, general feedback, and thoughtful contributions are welcome.

1. Search existing issues before opening a duplicate.
2. Use the [general feedback form](https://github.com/gtxnrg-ship-it/kuro-chan/issues/new?template=feedback.yml), [feature request form](https://github.com/gtxnrg-ship-it/kuro-chan/issues/new?template=feature_request.yml), or [bug report form](https://github.com/gtxnrg-ship-it/kuro-chan/issues/new?template=bug_report.yml).
3. Public issues are visible to everyone. Never include secrets, access tokens, private code, private repository URLs, chat transcripts, or personal data.
4. Only attach diagnostics after reviewing and redacting them. Kuro-chan must not upload prompts or source code as telemetry by default.
5. Keep pull requests focused and include tests for behavior changes where practical.
6. Do not describe planned functionality as implemented unless the code and verification support that claim.

See [Feedback and model evolution](docs/FEEDBACK_AND_MODEL_EVOLUTION.md) for privacy, triage, model review, and release principles.

Useful links: [Contributing guide](CONTRIBUTING.md) · [Code of Conduct](CODE_OF_CONDUCT.md) · [Security policy](SECURITY.md) · [GitHub Issues](https://github.com/gtxnrg-ship-it/kuro-chan/issues)

## 📄 License

Kuro-chan's project code is licensed under the [MIT License](LICENSE). You may use, modify, and redistribute the code under the license's terms.

This does not automatically relicense third-party dependencies, model weights, datasets, external services, generated assets, or API content. Those remain subject to their own licenses and terms.

---

Made with curiosity, stubbornness, and the belief that powerful tools should help more people build things. 🌸
