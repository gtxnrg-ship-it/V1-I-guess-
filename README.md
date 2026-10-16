<div align="center">

# Kuro-chan 🌸

### Your chat-first, GitHub-first AI coding companion.

**Tell her what you want to build. Work through the idea in conversation. Inspect code, coordinate specialist agents, and deliver projects through a workflow you can review.**

[**⬇ Download the latest Android APK**](https://github.com/gtxnrg-ship-it/V1-I-guess-/releases/latest) · [Roadmap](ROADMAP.md) · [Report a bug](https://github.com/gtxnrg-ship-it/V1-I-guess-/issues/new?template=bug_report.yml) · [Request a feature](https://github.com/gtxnrg-ship-it/V1-I-guess-/issues/new?template=feature_request.yml)

[![Android build](https://github.com/gtxnrg-ship-it/V1-I-guess-/actions/workflows/android.yml/badge.svg)](https://github.com/gtxnrg-ship-it/V1-I-guess-/actions/workflows/android.yml)
[![Checks](https://github.com/gtxnrg-ship-it/V1-I-guess-/actions/workflows/check.yml/badge.svg)](https://github.com/gtxnrg-ship-it/V1-I-guess-/actions/workflows/check.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

</div>

---

## ✨ The idea

Kuro-chan is an open-source AI app-building companion built around a simple principle: **your conversation should be the control room, and your code should remain yours.**

Instead of forcing you into a complicated developer dashboard, Kuro-chan aims to make building feel like talking through a project with a capable teammate. You describe a goal, refine the plan, inspect what changes, and use GitHub and automated builds to move work toward a deliverable.

The interface is chat-first and responsive, with a collapsible sidebar for projects and tools. Kuro-chan has an animated orb identity and a personality designed to feel warm, lively, playful, and useful—not like a sterile corporate form.

> **Status note:** Kuro-chan is under active development. This README describes both current foundations and the longer-term vision. Roadmap items are plans, not claims that those features already exist. Integrations and model capabilities depend on configuration, provider access, and ongoing implementation.

## 📲 Download Kuro-chan for Android

### [Download the latest APK from GitHub Releases](https://github.com/gtxnrg-ship-it/V1-I-guess-/releases/latest)

The release page contains the newest APK published by the Android build workflow. The latest successful build is not necessarily available the instant a code change is merged; wait until the workflow completes and a new release appears.

1. Open the release link above on your Android device.
2. Download **app-debug.apk** from the release assets.
3. Open the downloaded file and follow Android's installation prompts. You may need to allow your browser or file manager to install unknown apps.
4. If Android warns that the app is from outside the Play Store, install only if you trust the source and understand that this is a development build.

- [View Android build history](https://github.com/gtxnrg-ship-it/V1-I-guess-/actions/workflows/android.yml)
- [View automated checks](https://github.com/gtxnrg-ship-it/V1-I-guess-/actions/workflows/check.yml)
- [Browse all releases](https://github.com/gtxnrg-ship-it/V1-I-guess-/releases)

These are development APKs, not Play Store releases. Back up important project data before testing, and report reproducible issues through GitHub Issues.

## 🧭 What is here today?

Current foundations include:

- **Chat-first studio:** a conversation-led workspace with a collapsible sidebar and no permanent mobile bottom-navigation bar.
- **Project switching:** create and switch between locally stored project workspaces.
- **Animated Kuro-chan orb:** a visual identity that can reflect interaction states.
- **Projects and Activity views:** dedicated places to inspect project-related information and recent activity.
- **Code inspection:** browse files associated with the active project.
- **Settings hub:** organize configuration for appearance, voice and speech, AI/models, repositories, privacy and security, device performance, and app information.
- **Voice playback controls:** playback can be stopped; voice behavior still needs ongoing device-by-device testing.
- **Project export and delivery tools:** ZIP export and GitHub publishing entry points are available in the studio; exact capabilities depend on configuration and permissions.
- **Specialist-agent architecture:** Talker, Researcher, Planner, Builder, and Checker roles help separate parts of the build workflow.
- **Automated Android packaging:** GitHub Actions builds the Android app and publishes a release when the workflow succeeds.
- **Automated engineering checks:** regression tests, type checking, production build checks, browser smoke tests, and security scanning run through repository workflows.

### Important limitations

The current sidebar can show projects already opened in Kuro-chan, but that should not be confused with a finished GitHub OAuth repository browser. A complete OAuth sign-in flow, repository discovery, permission-aware import, branch-aware synchronization, and safe conflict handling remain planned work unless explicitly confirmed in the code and tested.

Likewise, the long-term vision includes more advanced autonomous engineering, richer voice conversations, model routing, persistent per-project memory, deeper QA, and broader device support. Listing an item on the roadmap does not mean it is already implemented.

## 🧠 How the agent workflow is intended to work

| Role | Purpose |
| --- | --- |
| **Talker** | Understands the goal, asks only useful clarifying questions, and helps shape a clear brief. |
| **Researcher** | Finds relevant documentation, APIs, packages, repositories, and reference material through available tools. |
| **Planner** | Breaks the request into a sequence of practical implementation steps. |
| **Builder** | Creates or edits project files using the tools available in the current configuration. |
| **Checker** | Reviews changes, runs available checks, surfaces failures, and helps guide repairs. |

These roles are an architectural direction, not a guarantee that every task will be fully autonomous. Tool access, context limits, model support, external services, and test coverage affect what can be completed. Kuro-chan should make progress and failures visible rather than claiming success without evidence.

## 💬 Personality and conversation

Kuro-chan is being designed to feel like a familiar, expressive coding companion: friendly, curious, a little mischievous, and able to explain complicated engineering in plain language. She should be able to be playful without making every answer a joke, and direct about uncertainty instead of pretending to have completed work she has not done.

The long-term personality direction includes adapting conversational tone to a user's preferences over time, retaining useful project context, and making creator-related Easter eggs appear naturally when relevant. Personalization must not override user control, privacy, or accurate reporting.

## 🔌 Models and integrations

Kuro-chan is designed to work with supported AI providers and compatible endpoints, with model choice and capabilities depending on what is configured in the app.

The longer-term integration direction includes:

- Multiple model providers and OpenAI-compatible endpoints.
- Different model choices for planning, research, code editing, and checking.
- Clear information about vision, tool calling, context limits, speed, cost, and provider restrictions.
- Optional local inference through a user-configured Ollama endpoint where the deployment and network settings permit it.
- More robust handling of provider errors, quotas, timeouts, cancellation, and retries.
- Future exploration of browser-local inference through WebGPU or WebAssembly for compatible models and devices.

Some integrations require an account, a paid plan, an API key, or extra setup. A free tier may have limits and can change without notice. Kuro-chan cannot guarantee unlimited or permanently free access to third-party models or services.

## 🛠️ Long-term vision

The ambition is bigger than a chat window that generates snippets. Kuro-chan should grow into a project-aware engineering companion that can help take an idea from rough concept to tested, reviewable deliverable.

The planned direction includes:

- **A real GitHub connection:** user-authorized sign-in, repository listing, repository import, branch selection, sync status, and clear permission boundaries.
- **Safer code changes:** readable diffs, selective acceptance, snapshots, restore points, feature branches, pull requests, and conflict explanations before risky writes.
- **Deeper project understanding:** inspect architecture, dependencies, scripts, documentation, and existing conventions before changing a repository.
- **Visible task progress:** show what the agent is doing, what changed, which checks ran, and where human review is needed.
- **Testing and repair loops:** run relevant tests and builds, summarize failures, attempt bounded fixes, and verify again instead of treating a generated patch as proof.
- **App delivery:** improve web and Android project builds, artifact verification, release notes, and practical download/update guidance.
- **Voice-first interaction:** more natural spoken conversation, reliable interruption and cancellation, configurable voice settings, and better behavior on mobile devices.
- **Persistent project memory:** remember useful decisions and project-specific facts while keeping data scoped, inspectable, and under user control.
- **Project templates and reusable workflows:** starter recipes, framework-aware plans, repeatable tasks, and configurable agent workflows.
- **Security and privacy controls:** secret detection, explicit confirmation for consequential actions, safer token handling, permission explanations, and privacy-respecting diagnostics.
- **Performance and accessibility:** responsive layouts, keyboard support, reduced-motion options, better low-end-device behavior, and clearer offline/error/loading states.
- **Cross-device reach:** a coherent experience on Android phones, tablets, and desktop browsers, with platform-specific packaging explored where it is practical.
- **Optional extensions and integrations:** a capability-aware integration system where each tool's permissions and data access are explained before use.
- **Better release communication:** clear changelogs, build identifiers, verified artifacts, and user-facing upgrade guidance.

See [ROADMAP.md](ROADMAP.md) for the working checklist. Priorities may change as implementation and testing reveal what matters most.

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
git clone https://github.com/gtxnrg-ship-it/V1-I-guess-.git
cd V1-I-guess-
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

Issues, bug reports, and thoughtful contributions are welcome.

1. Search existing issues before opening a duplicate.
2. Include device/browser details and clear reproduction steps for bugs.
3. Never include secrets, access tokens, or private code in public issues.
4. Keep pull requests focused and include tests for behavior changes where practical.
5. Do not describe planned functionality as implemented unless the code and verification support that claim.

Useful links: [Contributing guide](CONTRIBUTING.md) · [Code of Conduct](CODE_OF_CONDUCT.md) · [Security policy](SECURITY.md) · [GitHub Issues](https://github.com/gtxnrg-ship-it/V1-I-guess-/issues)

## 📄 License

Kuro-chan's project code is licensed under the [MIT License](LICENSE). You may use, modify, and redistribute the code under the license's terms.

This does not automatically relicense third-party dependencies, model weights, datasets, external services, generated assets, or API content. Those remain subject to their own licenses and terms.

---

Made with curiosity, stubbornness, and the belief that powerful tools should help more people build things. 🌸
