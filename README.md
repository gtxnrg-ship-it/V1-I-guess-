<div align="center">

# Kuro-chan 🌸

### Your open-source, GitHub-first AI app-building companion.

Describe what you want to build. Kuro-chan helps plan it, research it, generate the code, check the result, and deliver an Android APK through GitHub.

[**Download the latest Android APK**](https://github.com/gtxnrg-ship-it/V1-I-guess-/releases/latest) · [Report a bug](https://github.com/gtxnrg-ship-it/V1-I-guess-/issues/new?template=bug_report.yml) · [Request a feature](https://github.com/gtxnrg-ship-it/V1-I-guess-/issues/new?template=feature_request.yml)

[![Android build](https://github.com/gtxnrg-ship-it/V1-I-guess-/actions/workflows/android.yml/badge.svg)](https://github.com/gtxnrg-ship-it/V1-I-guess-/actions/workflows/android.yml)
[![Checks](https://github.com/gtxnrg-ship-it/V1-I-guess-/actions/workflows/check.yml/badge.svg)](https://github.com/gtxnrg-ship-it/V1-I-guess-/actions/workflows/check.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

</div>

---

## Why Kuro-chan?

AI app builders can be expensive or lock your work into one platform. Kuro-chan is being built around a different idea: **you should be able to bring your own model, keep control of your code, and use GitHub as the source of truth.**

- **Chat-first building:** explain your idea in normal language and refine it before committing to a build.
- **Five specialist agents:** Talker, Researcher, Planner, Builder, and Checker coordinate the workflow.
- **Engineering-first workflow:** inspect source files, review automated verification results, and ask Kuro-chan to repair problems without a user-facing live-preview panel.
- **GitHub workflow:** import repositories and publish generated projects with build workflows.
- **Repository intelligence:** generate a locally saved architecture map with import relationships, scripts, test/CI detection, and explicitly labeled review signals.
- **Delivery center:** inspect GitHub Actions status, open pull requests, release assets, APK links, and changed files since a checkpoint. Status is only shown when it is returned by GitHub.
- **Web and Android delivery:** GitHub Actions can build a website and an Android APK for generated projects.
- **Model flexibility:** connect supported AI providers or an OpenAI-compatible endpoint, and route different jobs to different models.
- **Local inference option:** connect an Ollama server you control. Browser access and CORS must be configured for your deployment.
- **Free-first tools:** optional providers and built-in research sources help you start with low or no direct cost where their terms allow it.
- **Phone-friendly studio:** work from a mobile browser with chat, source inspection, settings, GitHub publishing, and project delivery tools.

> Kuro-chan is an actively developed project. Features and integrations can change; please report anything that does not work as described.

## Download and update the Android APK

**[Download the latest Kuro-chan APK from GitHub Releases](https://github.com/gtxnrg-ship-it/V1-I-guess-/releases/latest)**

- **Automatic updates to the release:** when changes are pushed or merged into `main`, GitHub Actions starts a fresh Android APK build and publishes the APK to a new GitHub Release.
- **Check build progress:** [Android APK workflow runs](https://github.com/gtxnrg-ship-it/V1-I-guess-/actions/workflows/android.yml).
- **See what's changed:** open the latest release page for its build number and release notes.
- **Install on Android:** download `app-debug.apk`, open it on your phone, and approve the Android “install unknown apps” prompt if asked. Only install builds you trust.

A commit reaching `main` does not mean the APK is ready immediately. Wait for the Android workflow to succeed, then download the latest release. Failed or cancelled runs do not guarantee a new APK was published.

## How the agents work

| Agent | Responsibility |
| --- | --- |
| **Talker** | Clarifies your goal and helps prepare a brief before a larger build. |
| **Researcher** | Looks up relevant documentation, packages, repositories, and assets using available tools. |
| **Planner** | Turns the brief into an actionable implementation plan. |
| **Builder** | Creates and edits project files. |
| **Checker** | Reviews the result, checks the preview, and asks for repairs when possible. |

The available tools and model capabilities depend on your configuration. A model that supports vision or tool calling can do things a text-only model cannot. Isolated QA screenshots and browser automation are used for engineering verification; Kuro-chan does not provide a user-facing live-preview panel. Repository maps are stored locally with the project and become visibly stale when the source fingerprint changes, so agents are told not to rely on outdated context.

## Models and integrations

Kuro-chan supports multiple AI providers and OpenAI-compatible endpoints. Provider availability, free quotas, rate limits, model capabilities, and terms are controlled by those providers and may change.

### Getting started with models

1. Open **Settings** in the studio.
2. Connect a supported provider using its official website and instructions.
3. Review the detected models and available agent routing.
4. Optionally connect an Ollama endpoint on a computer you control.

Some providers require an account or API key. **“Free” does not mean unlimited**, and a provider can change its quota or terms. Never paste a secret into a public issue or share a screenshot containing a key.

## Privacy and security

Kuro-chan is browser-first and does not rely on a Kuro-chan-operated application server for ordinary project storage. Project data and saved settings are kept in your browser's local storage.

Please understand these important boundaries:

- When you use a **cloud AI provider**, your prompts, context, and any included code or images needed for the request are sent to that provider. Its privacy policy and retention rules apply.
- When you use **web search, image, package, database, or other integrations**, the relevant request may be sent to that service.
- A connected GitHub token is used to perform the GitHub actions you request. Use a token with only the permissions you need, and remove it from Settings when it is no longer required.
- Local model inference through Ollama sends inference requests to the endpoint you configure; the endpoint may be on your own computer or another machine.
- Do not treat browser storage as a secure vault on a shared or compromised device. Clear saved keys and project data before handing your device to someone else.

See [SECURITY.md](SECURITY.md) for responsible vulnerability reporting.

## Run it locally

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

Vite prints a local development URL in your terminal. Open that URL in your browser.

### Validate a change

```bash
npm test
npm run check
npm run build
npx playwright install chromium
npm run e2e
```

The regression suite checks deterministic logic, and the Playwright smoke tests open the real studio in Chromium at desktop and phone-sized viewports. The GitHub Actions Check workflow runs the regression suite, TypeScript validation, production build, and browser smoke tests on pull requests. The project is evolving; see the workflow files under [`.github/workflows/`](.github/workflows/).

## Open source and license

Kuro-chan's project code is licensed under the [MIT License](LICENSE). You may use, modify, and redistribute the code under that license's terms.

This license does **not** automatically relicense third-party dependencies, external services, model weights, datasets, generated assets, or API content. Those remain subject to their respective licenses and terms.

Contributions are welcome! Read [CONTRIBUTING.md](CONTRIBUTING.md) and our [Code of Conduct](CODE_OF_CONDUCT.md) before participating.

## Roadmap

We want Kuro-chan to be reliable, useful on low-cost devices, and transparent about what it can do. See [ROADMAP.md](ROADMAP.md) for planned improvements and priorities. Ideas are welcome through [GitHub Issues](https://github.com/gtxnrg-ship-it/V1-I-guess-/issues).

## Community

- [Bug reports](https://github.com/gtxnrg-ship-it/V1-I-guess-/issues/new?template=bug_report.yml)
- [Feature requests](https://github.com/gtxnrg-ship-it/V1-I-guess-/issues/new?template=feature_request.yml)
- [Contributing guide](CONTRIBUTING.md)
- [Security policy](SECURITY.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)

---

Made with care for people who want to build things without losing control of their code. 🌸
