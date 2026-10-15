# Kuro-chan

An AI app builder that talks it through with you first, researches, then builds websites, apps and games, and ships them as live websites and Android APKs through GitHub.

## Get her

- **Website:** https://gtxnrg-ship-it.github.io/V1-I-guess-/
- **Android APK:** [Download page](https://gtxnrg-ship-it.github.io/V1-I-guess-/download.html) (or [GitHub Releases](https://github.com/gtxnrg-ship-it/V1-I-guess-/releases/latest))

![Website](https://github.com/gtxnrg-ship-it/V1-I-guess-/actions/workflows/pages.yml/badge.svg) ![Android](https://github.com/gtxnrg-ship-it/V1-I-guess-/actions/workflows/android.yml/badge.svg)

## How she works

- **Five agents:** Talker (asks questions, writes a brief you approve), Researcher (web, npm, GitHub, docs, photos), Planner, Builder, Checker (looks at screenshots of the result on desktop and phone and sends fixes back).
- **Any API key:** paste Gemini, Claude, OpenRouter, Groq, Grok, Mistral, Cerebras, DeepSeek, Hugging Face, OpenAI or any OpenAI-compatible endpoint. She detects it, ranks every model, picks the best one per agent, and switches automatically when one hits a limit. A free no-key starter model works out of the box.
- **Run models locally:** connect Ollama at `http://localhost:11434/v1` from Settings for inference on your own computer without an API bill. Ollama must allow browser requests from Kuro-chan's website origin.
- **Plugins:** GitHub (publish, import repos, website and APK builds), Supabase (logins and databases for your apps), Google Search grounding, Tavily, Jina, Pexels, Unsplash, plus free built-ins (Openverse and Wikimedia photos, AI images, npm, Wikipedia, Stack Overflow).
- **Everything runs on your device.** No server. Keys, apps and chats are stored in your browser or phone only.
- **Publish:** every app you build gets pushed to a GitHub repo with workflows that build its website and Android APK, with links in its README.

## Development

```
npm install
npm run dev
```

Built with Vite, React, TypeScript, Tailwind and esbuild-wasm (the in-browser bundler that runs the live preview).
