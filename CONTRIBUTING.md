# Contributing to Kuro-chan

Thank you for helping make Kuro-chan more useful, reliable, and accessible. Contributions of all sizes are welcome.

## Before you start

1. Search existing [issues](https://github.com/gtxnrg-ship-it/V1-I-guess-/issues) and pull requests to avoid duplicate work.
2. For a large change, open an issue first so we can agree on the problem and scope.
3. Be respectful and follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Local development

Requirements: Node.js 20+ and npm.

```bash
git clone https://github.com/gtxnrg-ship-it/V1-I-guess-.git
cd V1-I-guess-
npm ci
npm run dev
```

Before opening a pull request, run:

```bash
npm run check
npm run build
```

If you cannot run the checks locally, say so in your pull request rather than claiming they passed.

## Pull requests

- Use a focused branch and keep the change as small as practical.
- Explain the user problem, the solution, and any trade-offs.
- Include screenshots or a short screen recording for visible UI changes, especially mobile layouts.
- Add or update tests when changing logic.
- Update the README or other docs when behavior, setup, permissions, or supported providers change.
- Do not commit API keys, access tokens, personal data, generated build output, or private project files.
- Never silently change a user's project or publish to a repository without an explicit user action.
- Keep dependencies minimal and explain why a new dependency is needed.

## Commit style

Use clear, action-oriented messages, for example:

- `fix: handle failed preview builds`
- `feat: add model capability labels`
- `docs: explain local model setup`

## License

By submitting a contribution, you agree that it will be distributed under the project's MIT License. Please only contribute code and assets that you have the right to share.
