import { detectProjectToolchains } from "./language-toolchains";

const BROWSER_ENTRYPOINTS = [
  "index.html", "src/main.tsx", "src/main.jsx", "src/main.ts", "src/main.js",
  "src/index.tsx", "main.tsx",
];

/**
 * The in-browser harness can only verify web projects. Native/toolchain projects
 * without a browser entry point must be reported as unverified, not clean.
 */
export function unsupportedVerification(files: Record<string, string>): { result: string; stat: string } | null {
  if (BROWSER_ENTRYPOINTS.some((path) => files[path] != null)) return null;
  const report = detectProjectToolchains(Object.keys(files), files);
  const detected = [
    ...report.languages.map((item) => item.label),
    ...report.gameEngines.map((item) => item.label),
  ];
  const commands = [...new Set([
    ...report.languages.flatMap((item) => [...item.buildCommands, ...item.testCommands]),
    ...report.gameEngines.flatMap((item) => [...item.buildCommands, ...item.testCommands]),
  ])];
  return {
    stat: "UNVERIFIED",
    result: [
      "NOT VERIFIED: this workspace has no supported browser entry point, so the browser QA harness did not build or run it.",
      `Detected project types: ${detected.join(", ") || "no recognized language or game engine"}.`,
      commands.length ? `Candidate commands (not executed): ${commands.join(" OR ")}.` : "No candidate native build/test commands were identified.",
      "This environment has no native runner wired for these toolchains. No build, test, or runtime pass is claimed.",
    ].join("\n"),
  };
}
