import { importedPackages } from "./qa-harness";
import { latestVersion } from "./research";

/** GitHub Actions that turn any app into a live website + an Android APK, with links in the README. */
export function shipFiles(appName: string, repoFull: string) {
  const slug = appName.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 30) || "app";
  const [owner, repo] = repoFull.split("/");
  const site = `https://${owner.toLowerCase()}.github.io/${repo}/`;
  const apk = `https://github.com/${owner}/${repo}/releases/latest/download/app-debug.apk`;
  const files: Record<string, string> = {
    ".github/workflows/deploy-website.yml": PAGES_WORKFLOW,
    ".github/workflows/build-android.yml": APK_WORKFLOW,
    "capacitor.config.json": JSON.stringify({ appId: `com.kurochan.${slug}`, appName, webDir: "dist" }, null, 2) + "\n",
    "public/download.html": downloadPageHtml(appName, repoFull, apk),
  };
  const readme = `\n## Try it\n\n- **Live website:** ${site}\n- **Android APK:** [Download page](${site}download.html) (or [GitHub Releases](${apk}))\n\n![Website](https://github.com/${owner}/${repo}/actions/workflows/deploy-website.yml/badge.svg) ![Android](https://github.com/${owner}/${repo}/actions/workflows/build-android.yml/badge.svg)\n\nBuilt and shipped by Kuro-chan.\n`;
  return { files, readme, site, apk };
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;");
}

function downloadPageHtml(appName: string, repoFull: string, apkUrl: string): string {
  const safeName = escapeHtml(appName);
  const safeRepo = escapeHtml(repoFull);
  const safeApkUrl = escapeHtml(apkUrl);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Download ${safeName} for Android</title>
<style>
  :root { color-scheme: light dark; }
  body { margin: 0; min-height: 100dvh; display: grid; place-items: center; font: 15px/1.55 system-ui, -apple-system, Segoe UI, Roboto, sans-serif; background: #faf8f5; color: #1a1817; }
  @media (prefers-color-scheme: dark) { body { background: #0f0e0d; color: #ece8e3; } .card { background: #181614 !important; border-color: #2a2725 !important; } .muted { color: #a19a93 !important; } }
  .card { width: min(92vw, 420px); padding: 28px 24px; border: 1px solid #e6e1db; border-radius: 22px; background: #fff; text-align: center; }
  h1 { font-size: 24px; margin: 14px 0 6px; letter-spacing: -0.01em; }
  .muted { color: #6b645e; font-size: 14px; }
  .btn { display: block; margin: 20px 0 10px; padding: 14px; border-radius: 14px; background: #1a1817; color: #fff; text-decoration: none; font-weight: 600; }
  @media (prefers-color-scheme: dark) { .btn { background: #ece8e3; color: #1a1817; } }
  .alt { font-size: 13px; color: inherit; }
  ol { text-align: left; padding-left: 20px; font-size: 14px; }
  li { margin: 6px 0; }
</style>
</head>
<body>
  <main class="card">
    <h1>${safeName} for Android</h1>
    <p class="muted">Built with Kuro-chan</p>
    <a class="btn" href="${safeApkUrl}">Download the APK</a>
    <a class="alt" href="https://github.com/${safeRepo}/releases/latest" target="_blank" rel="noopener">Or get it from GitHub Releases</a>
    <ol>
      <li>Tap Download. If Chrome warns that the file may be harmful, tap <b>Download anyway</b>.</li>
      <li>Open the file. When Android asks, allow <b>Install unknown apps</b> for your browser.</li>
      <li>Tap Install, then open ${safeName}.</li>
    </ol>
    <p class="muted"><a class="alt" href="./">Or open the web app</a></p>
  </main>
</body>
</html>\n`;
}

export const PAGES_WORKFLOW = `name: Deploy website
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm install
      - run: npm run build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
`;

export const APK_WORKFLOW = `name: Build Android APK
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: write
jobs:
  apk:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: 21
      - run: npm install
      - run: npm install @capacitor/core@7 @capacitor/cli@7 @capacitor/android@7
      - run: npm run build
      - run: npx cap add android || true
      - run: npx cap sync android
      - run: cd android && chmod +x gradlew && ./gradlew assembleDebug
      - uses: softprops/action-gh-release@v2
        with:
          tag_name: build-\${{ github.run_number }}
          name: Android build \${{ github.run_number }}
          files: android/app/build/outputs/apk/debug/app-debug.apk
          make_latest: true
`;

/** Make package.json list every package the code imports, so the GitHub build never fails on a missing dependency. */
export async function syncDependencies(files: Record<string, string>): Promise<{ pkg: string; added: string[] }> {
  let pkg: any = {};
  try { pkg = JSON.parse(files["package.json"] || "{}"); } catch { pkg = {}; }
  pkg.dependencies = pkg.dependencies || {};
  pkg.devDependencies = pkg.devDependencies || {};
  const added: string[] = [];
  const builtins = new Set(["react", "react-dom"]);
  for (const name of importedPackages(files)) {
    if (pkg.dependencies[name] || pkg.devDependencies[name]) continue;
    if (/^(node:|fs$|path$|url$)/.test(name)) continue;
    const v = builtins.has(name) ? "18.3.1" : await latestVersion(name);
    if (v) { pkg.dependencies[name] = `^${v}`; added.push(name); }
  }
  pkg.scripts = { dev: "vite", build: "vite build", preview: "vite preview", ...(pkg.scripts || {}) };
  pkg.devDependencies = { vite: "^5.4.0", "@vitejs/plugin-react": "^4.3.0", typescript: "^5.6.0", "@types/react": "^18.3.0", "@types/react-dom": "^18.3.0", ...pkg.devDependencies };
  return { pkg: JSON.stringify(pkg, null, 2) + "\n", added };
}
