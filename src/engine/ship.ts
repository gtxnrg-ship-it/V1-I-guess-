import { importedPackages } from "./preview";
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
  };
  const readme = `\n## Try it\n\n- **Live website:** ${site}\n- **Android APK:** [Download the latest build](${apk})\n\n![Website](https://github.com/${owner}/${repo}/actions/workflows/deploy-website.yml/badge.svg) ![Android](https://github.com/${owner}/${repo}/actions/workflows/build-android.yml/badge.svg)\n\nBuilt and shipped by Kuro-chan.\n`;
  return { files, readme, site, apk };
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
