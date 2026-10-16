import type { ProjectIntelligenceFinding, ProjectIntelligenceReport } from "./types";

const unique = (values: string[]) => [...new Set(values)];

export function projectFingerprint(files: Record<string, string>): string {
  const paths = Object.keys(files).sort();
  let hash = 2166136261;
  for (const path of paths) {
    const value = path + "\\0" + files[path] + "\\0";
    for (let i = 0; i < value.length; i++) { hash ^= value.charCodeAt(i); hash = Math.imul(hash, 16777619); }
  }
  return paths.length + ":" + (hash >>> 0).toString(16);
}
const normalize = (value: string) => {
  const parts: string[] = [];
  for (const part of value.replace(/\/g, "/").split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") parts.pop();
    else parts.push(part);
  }
  return parts.join("/");
};

function resolveLocalImport(from: string, specifier: string, files: Record<string, string>): string | null {
  if (specifier.startsWith("@/")) {
    const base = normalize("src/" + specifier.slice(2));
    const candidates = [base, ...[".ts", ".tsx", ".js", ".jsx", ".json", ".css"].map((ext) => base + ext), ...["index.ts", "index.tsx", "index.js", "index.jsx"].map((name) => base + "/" + name)];
    return candidates.find((path) => path in files) || null;
  }
  if (!specifier.startsWith(".")) return null;
  const base = normalize(from.split("/").slice(0, -1).concat(specifier).join("/"));
  const candidates = [base, ...[".ts", ".tsx", ".js", ".jsx", ".json", ".css"].map((ext) => base + ext), ...["index.ts", "index.tsx", "index.js", "index.jsx"].map((name) => base + "/" + name)];
  return candidates.find((path) => path in files) || null;
}

function categoryFor(path: string): string | null {
  if (/^(tests?|__tests__)\//i.test(path) || /\.(test|spec)\.[cm]?[jt]sx?$/.test(path)) return "Tests";
  if (/^\.github\/workflows\//.test(path)) return "CI and delivery";
  if (/^(src\/)?(server|api|routes)\//i.test(path) || /(^|\/)(route|controller|handler)\.[cm]?[jt]sx?$/.test(path)) return "Backend and API";
  if (/^(src\/)?(db|database|migrations|prisma|supabase)\//i.test(path) || /(schema|migration|database)\.[cm]?[jt]sx?$/i.test(path)) return "Data and persistence";
  if (/^src\/(engine|lib)\//.test(path)) return "Core logic and integrations";
  if (/^src\/(components|pages|app|routes)\//.test(path)) return "UI and application flow";
  if (/^(vite|webpack|rollup|tsconfig|eslint|prettier|postcss|tailwind|playwright|vitest|jest)/i.test(path) || /^(package(-lock)?\.json|pnpm-lock\.yaml|yarn\.lock)$/.test(path)) return "Build and dependencies";
  if (/^(README|CONTRIBUTING|SECURITY|ROADMAP)\.md$/i.test(path)) return "Documentation and project policy";
  return null;
}

export function analyzeProject(files: Record<string, string>): ProjectIntelligenceReport {
  const paths = Object.keys(files).sort();
  const findings: ProjectIntelligenceFinding[] = [];
  const architecture = unique(paths.map(categoryFor).filter((x): x is string => Boolean(x)));
  let pkg: { name?: string; scripts?: Record<string, string>; dependencies?: Record<string, string>; devDependencies?: Record<string, string> } = {};
  try { pkg = JSON.parse(files["package.json"] || "{}"); } catch {
    findings.push({ severity: "medium", confidence: "evidence", title: "package.json is missing or invalid", evidence: "The root package manifest could not be parsed; dependency and build-script analysis is incomplete.", files: ["package.json"] });
  }
  const scripts = Object.entries(pkg.scripts || {}).map(([name, command]) => ({ name, command: String(command) }));
  const testFiles = paths.filter((path) => /(^|\/)(__tests__|tests?)(\/|$)|\.(test|spec)\.[cm]?[jt]sx?$/.test(path));
  const workflows = paths.filter((path) => /^\.github\/workflows\/[^/]+\.ya?ml$/.test(path));
  const edges: { from: string; to: string }[] = [];
  for (const from of paths) {
    if (!/\.[cm]?[jt]sx?$/.test(from)) continue;
    const source = files[from];
    const pattern = /(?:\bfrom\s*|\bimport\s*\(|\brequire\s*\()\s*["']([^"']+)["']/g;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(source)) !== null) {
      const to = resolveLocalImport(from, match[1], files);
      if (to && to !== from) edges.push({ from, to });
    }
  }
  const addFinding = (finding: ProjectIntelligenceFinding) => {
    const key = finding.title + "|" + finding.files.join(",");
    if (!findings.some((x) => x.title + "|" + x.files.join(",") === key)) findings.push(finding);
  };
  if (!testFiles.length) addFinding({ severity: "medium", confidence: "evidence", title: "No test files detected", evidence: "A path-based scan found no conventional test/spec files. Tests may exist in another format or external system.", files: [] });
  if (Object.keys(pkg.scripts || {}).length && !("lint" in (pkg.scripts || {}))) addFinding({ severity: "low", confidence: "evidence", title: "No lint script in package.json", evidence: "The root package scripts do not define a lint command.", files: ["package.json"] });
  if (!workflows.length) addFinding({ severity: "low", confidence: "evidence", title: "No GitHub Actions workflows detected", evidence: "No workflow YAML files were found under .github/workflows/.", files: [".github/workflows"] });
  const keyStorageFiles = paths.filter((path) => /localStorage|sessionStorage|indexedDB/i.test(files[path]) && /(token|secret|api.?key|credential)/i.test(files[path]));
  if (keyStorageFiles.length) addFinding({ severity: "medium", confidence: "signal", title: "Review client-side credential storage", evidence: "Some files combine browser storage APIs with credential-related terms. This is a review signal, not proof of an exploitable vulnerability.", files: keyStorageFiles.slice(0, 8) });
  const apiFiles = paths.filter((path) => /fetch\s*\(|axios\.|\b(trpc|graphql|openapi)\b/i.test(files[path]));
  if (apiFiles.length) architecture.push("External APIs and network calls");
  const authFiles = paths.filter((path) => /oauth|auth|session|jwt|passport/i.test(path + "\n" + files[path]));
  if (authFiles.length) architecture.push("Authentication and sessions");
  const dbFiles = paths.filter((path) => /prisma|drizzle|sequelize|mongoose|sqlite|postgres|mysql|supabase|indexedDB/i.test(path + "\n" + files[path]));
  if (dbFiles.length) architecture.push("Data stores and persistence");
  const name = pkg.name ? '"' + pkg.name + '"' : "this repository";
  const summary = "Analyzed " + paths.length + " files in " + name + ". Found " + architecture.length + " architecture areas, " + edges.length + " local import relationships, " + testFiles.length + " likely test files, and " + workflows.length + " GitHub Actions workflows. Findings are static signals to guide review; they are not a substitute for running the project's own checks.";
  return {
    generatedAt: new Date().toISOString(),
    fingerprint: projectFingerprint(files),
    fileCount: paths.length,
    summary,
    architecture: unique(architecture),
    scripts: scripts.slice(0, 30),
    importEdges: edges.slice(0, 120),
    findings: findings.slice(0, 30),
  };
}
