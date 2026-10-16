<div align="center">

# Kuro-chan 🌸

### Built with vibes, curiosity, stubbornness, and a whole lot of GitHub.

**An open-source, chat-first AI coding and app-building companion designed to make software creation feel possible—even when you're building from your phone and learning as you go.**

Tell Kuro-chan what you want to create. Bring a model you trust. Work with your project files. Use GitHub as the place where code, reviews, checks, and releases live.

[**Get the latest Android APK**](https://github.com/gtxnrg-ship-it/V1-I-guess-/releases/latest) · [**Explore the source**](https://github.com/gtxnrg-ship-it/V1-I-guess-) · [Report a bug](https://github.com/gtxnrg-ship-it/V1-I-guess-/issues/new?template=bug_report.yml) · [Request a feature](https://github.com/gtxnrg-ship-it/V1-I-guess-/issues/new?template=feature_request.yml)

[![Android build](https://github.com/gtxnrg-ship-it/V1-I-guess-/actions/workflows/android.yml/badge.svg)](https://github.com/gtxnrg-ship-it/V1-I-guess-/actions/workflows/android.yml)
[![Checks](https://github.com/gtxnrg-ship-it/V1-I-guess-/actions/workflows/check.yml/badge.svg)](https://github.com/gtxnrg-ship-it/V1-I-guess-/actions/workflows/check.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

</div>

---

## ✨ The idea behind Kuro-chan

Kuro-chan is being built around a simple belief: **you shouldn't need to be an experienced programmer, own an expensive computer, or surrender control of your code just to start making software.**

This project grew out of vibe coding: describing an idea in ordinary language, collaborating with AI to turn it into working code, testing the result, fixing what breaks, and learning along the way. The goal isn't to pretend that coding has become magic. It's to make the process more approachable while keeping the real project files, decisions, and delivery path visible.

Kuro-chan is a personal, community-facing open-source experiment in making that workflow practical on the web and on Android. It is actively evolving, and this README distinguishes what exists today from what still needs work.

> **The philosophy:** the AI can help write the code; you should still be able to inspect it, own it, change it, and decide what gets shipped.

## 🚀 What Kuro-chan is designed to do

- **Chat-first building:** explain an idea naturally, refine it, and work through implementation in conversation.
- **A specialist-agent workflow:** Talker, Researcher, Planner, Builder, and Checker divide clarification, research, planning, code changes, and verification.
- **Project workspace:** inspect and edit project files, keep project context, and work with existing code rather than starting from a blank page every time.
- **GitHub-first development:** inspect repositories, diagnose repository issues, and use GitHub workflows to review and deliver changes.
- **Verification before delivery:** run deterministic tests, TypeScript checks, production builds, and browser smoke tests through the project's checks workflow.
- **Web and Android ambitions:** GitHub Actions workflows support building Kuro-chan and Android APK artifacts; generated projects can use supported publishing/build workflows.
- **Bring-your-own-model flexibility:** connect supported AI providers and compatible endpoints; model availability and tool capabilities depend on the provider and configuration.
- **Local-model option:** connect an Ollama endpoint you control when your network and browser configuration allow it.
- **Voice interaction:** browser speech input/output is available where the browser supports it; optional provider-backed voice features may require a configured key.
- **Phone-friendly workflow:** the interface is designed to be usable on mobile, including when the main development machine is simply a phone.

Features are under active development. A listed workflow or integration is not a promise that every provider, repository, device, or generated application will work without configuration or repair.

## 🧭 How the workflow fits together

```text
Your idea
   ↓
Chat and project context
   ↓
Talker → Researcher → Planner
   ↓
Builder → Checker
   ↓
Review code + run checks
   ↓
GitHub branch / build workflow / release
```

The specialist names describe the intended division of work in the application. The exact tools available in a session depend on configured models and integrations. AI-generated code can be wrong, incomplete, insecure, or incompatible; review important changes and test software before relying on it.

## 🧰 The technology

Kuro-chan is currently a browser-first application built with:

- **React 18** for the interface
- **TypeScript** for application code and type checking
- **Vite** for development and production builds
- **Tailwind CSS** and UI components for styling
- **esbuild-wasm** for browser-side build/preview-related tooling
- **IndexedDB and browser storage** for local project/settings persistence
- **GitHub Actions** for automated checks and Android build workflows
- **Playwright** for browser smoke tests

The codebase is organized into areas for the studio UI, AI/model routing, agents and tools, project memory, GitHub operations, repository intelligence, publishing, and platform-related functionality. The implementation is evolving; check the source and workflow files for the current truth.

## 📱 Download Kuro-chan for Android

**[Open the latest GitHub Release](https://github.com/gtxnrg-ship-it/V1-I-guess-/releases/latest)**

1. Open the latest release page.
2. Download the APK attached to that release, if one is available.
3. On Android, review the source and permissions, then install only if you trust the build. Android may ask you to allow installation from your browser or file manager.
4. If a release has no APK, check the [Android workflow](https://github.com/gtxnrg-ship-it/V1-I-guess-/actions/workflows/android.yml) for the latest build status and available artifacts.

A merge to `main` does **not** mean a new APK is instantly ready. The workflow must finish successfully and publish or attach an artifact. A failed or running workflow does not guarantee a fresh release.

## 🧪 Build and test locally

### Requirements

- Node.js 20 or newer
- npm
- A modern browser

### Start the development server

```bash
git clone https://github.com/gtxnrg-ship-it/V1-I-guess-.git
cd V1-I-guess-
npm ci
npm run dev
```

Vite prints the local development URL in the terminal.

### Run the verification suite

```bash
npm test
npm run check
npm run build
npx playwright install chromium
npm run e2e
```

The GitHub Actions **Check** workflow runs the regression tests, TypeScript validation, production build, and Playwright browser smoke tests on pull requests. See [workflow runs](https://github.com/gtxnrg-ship-it/V1-I-guess-/actions/workflows/check.yml) for actual results. A green check applies to the commit that was tested; new commits need their own checks.

## 🔌 Models, keys, and integrations

Kuro-chan is designed to work with supported AI providers and OpenAI-compatible endpoints. Some integrations require an account, API key, endpoint configuration, network access, or a provider that supports the needed features.

- Read the provider's current pricing, privacy terms, rate limits, and model capabilities before connecting it.
- **Free does not mean unlimited.** Free tiers, quotas, and terms can change.
- Never commit API keys or paste them into public issues, screenshots, or chat messages that may be shared.
- Use a GitHub token only when needed and grant the smallest permissions that support the task.
- Local inference through Ollama sends requests to the endpoint you configure; it is not automatically private if that endpoint is remote or shared.

## 🔐 Privacy and security boundaries

Kuro-chan is browser-first. Ordinary project state and saved settings are stored in browser storage rather than a Kuro-chan-operated application database. This has important trade-offs.

- **Cloud AI:** prompts, code, images, and project context needed for a request are sent to the AI provider you select. That provider's policies apply.
- **External tools:** research, package, GitHub, and other integrations may send the relevant request to those services.
- **GitHub access:** a connected credential can perform the actions allowed by its permissions. Review permissions carefully and revoke credentials you no longer need.
- **Browser storage:** local storage is not a secure vault. Anyone with access to your unlocked browser profile or device may be able to access saved data.
- **AI-generated changes:** inspect changes and review security-sensitive code before merging or deploying.

Please report suspected vulnerabilities privately using the instructions in [SECURITY.md](SECURITY.md), rather than posting exploit details in a public issue.

## 🌱 Vibe-coded in the open

Kuro-chan is built through iterative, AI-assisted development: ideas become prompts, prompts become proposed changes, changes go through GitHub, and checks help catch regressions. The project welcomes people who are learning, experimenting, or using AI as part of their development process.

You do not have to be an expert to contribute. Clear bug reports, reproducible steps, documentation fixes, thoughtful feature ideas, and small tested improvements are valuable contributions.

Vibe coding is not a substitute for testing, security review, or giving credit. The aim is to make building more accessible—not to hide how the software works or claim that AI never makes mistakes.

## 🗺️ Roadmap and current limits

The project is actively changing. The next priorities include making core flows more dependable, improving mobile usability, strengthening repository and project-memory behavior, documenting setup clearly, and ensuring the public interface reflects the features that are actually available.

Not every idea is complete. In particular:

- Provider-specific behavior depends on each provider's API and capabilities.
- Real-world GitHub actions require valid authorization and suitable repository permissions.
- Browser and Android environments have different filesystem, network, and permission constraints.
- Automated tests cover important paths but cannot prove that every generated app or every device configuration works.
- The project does not promise autonomous, error-free software development.

See [open issues](https://github.com/gtxnrg-ship-it/V1-I-guess-/issues) and [pull requests](https://github.com/gtxnrg-ship-it/V1-I-guess-/pulls) for current work and proposals.

## 🤝 Contributing

Contributions and feedback are welcome.

1. Search existing issues and pull requests before opening a duplicate.
2. For a bug, include steps to reproduce, expected behavior, actual behavior, and relevant logs without secrets.
3. For code changes, run the checks above where possible and explain what you verified.
4. Read [CONTRIBUTING.md](CONTRIBUTING.md), [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md), and [SECURITY.md](SECURITY.md).

Useful links:

- [Open an issue](https://github.com/gtxnrg-ship-it/V1-I-guess-/issues)
- [Report a bug](https://github.com/gtxnrg-ship-it/V1-I-guess-/issues/new?template=bug_report.yml)
- [Request a feature](https://github.com/gtxnrg-ship-it/V1-I-guess-/issues/new?template=feature_request.yml)
- [View the source code](https://github.com/gtxnrg-ship-it/V1-I-guess-)
- [View releases](https://github.com/gtxnrg-ship-it/V1-I-guess-/releases)

## ⚖️ License and third-party rights

The Kuro-chan repository code is licensed under the **MIT License**; see [LICENSE](LICENSE). In general, MIT permits use, modification, distribution, sublicensing, and sale of copies, provided the copyright and license notice are included.

That does not automatically change the licenses or terms for third-party dependencies, AI model weights, external services, datasets, fonts, icons, or user-provided assets. Those remain governed by their own licenses and terms. Review the relevant notices before redistributing a bundle or build.

The MIT license is a software license, not a promise of support, warranty, or fitness for a particular purpose. The software is provided as-is, as described in the license. This README is project information, not legal advice.

---

<div align="center">

**Made in the spirit of learning out loud, building boldly, and keeping the code in your hands.** 🌸

*Small steps. Real code. Open doors.*

</div>
