import { analyzeProject, projectFingerprint } from "../engine/project-intelligence";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error("Assertion failed: " + message);
}

const files = {
  "package.json": JSON.stringify({ name: "sample", scripts: { test: "vitest run", build: "vite build" } }),
  "src/App.tsx": 'import { Button } from "./components/Button"; export default function App() { return <Button />; }',
  "src/components/Button.tsx": 'export function Button() { return <button>OK</button>; }',
  "src/api/client.ts": 'export const client = () => fetch("/api/items");',
  "tests/app.spec.ts": "test('app', () => {});",
  ".github/workflows/check.yml": "name: Check",
};

const report = analyzeProject(files);
assert(report.fileCount === Object.keys(files).length, "file count should match input");
assert(report.scripts.some((script) => script.name === "build"), "package scripts should be captured");
assert(report.architecture.includes("Tests"), "test area should be identified");
assert(report.architecture.includes("CI and delivery"), "workflow area should be identified");
assert(report.architecture.includes("External APIs and network calls"), "network integration should be identified");
assert(report.importEdges.some((edge) => edge.from === "src/App.tsx" && edge.to === "src/components/Button.tsx"), "local import relationships should be resolved");
assert(report.findings.some((finding) => finding.title === "No lint script in package.json"), "missing lint should be reported as a finding");
assert(report.generatedAt.length > 0, "report should include a generation timestamp");
assert(report.fingerprint === projectFingerprint(files), "report should fingerprint its source files");
assert(report.fingerprint !== projectFingerprint({ ...files, "src/App.tsx": files["src/App.tsx"] + " // changed" }), "source changes should invalidate the saved context fingerprint");
console.log("✓ project intelligence tests passed");
