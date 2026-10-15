# Repository guidance for coding agents

## Product overview
Kuro-chan is a client-side AI app builder built with Vite, React, and TypeScript. It lets users discuss an app, research implementation choices, generate/edit files, preview builds in-browser, and publish projects through GitHub. It also supports mobile layouts and Capacitor/Android build workflows.

## Project map
- `src/pages/studio.tsx`: main studio shell, project switching, publish flow, and responsive navigation.
- `src/components/her/`: chat, preview, code browser, settings/API keys, branding, and studio UI.
- `src/engine/`: agent orchestration, provider/model routing, persistence, GitHub integration, preview/build logic, research, templates, and publishing.
- `src/lib/`: small shared utilities, ZIP creation, and lightweight regression tests.
- `src/index.css`: application design system and global styles.
- `.github/workflows/`: deployment and CI workflows.

## Working rules
1. Read the relevant implementation and its callers before changing behavior; trace data flow through the engine and UI.
2. Preserve the browser-first architecture. Never introduce a server requirement for features that can safely run on-device.
3. Treat API keys and project contents as sensitive. Do not log secrets, add telemetry, or send user files to a new service without an explicit product requirement.
4. Keep mobile-first flows usable on narrow screens and touch devices. Respect safe-area insets and accessible names/labels.
5. Avoid broad rewrites when a focused change is safer. Preserve existing project formats and backwards compatibility with saved local data.
6. For generated code and repository operations, validate paths and handle provider errors clearly. Never silently claim a build, publish, or test succeeded if it did not.
7. Add or update regression tests for bug fixes. Prefer deterministic tests that do not require API keys, network access, or a live model.
8. Before proposing a merge, run TypeScript checks, the production build, and relevant tests. Review the resulting diff for accidental changes and secrets.

## Local development and checks
- Install: `npm ci`
- Start: `npm run dev`
- Type-check: `npm run check`
- Production build: `npm run build`
- Lightweight regression tests: `npx --yes tsx src/lib/kuro.test.ts`

## Change expectations
Explain the user-visible behavior change, note any limitations, and include test results in the pull request. Keep changes focused and make the final decision to merge with the repository owner.
