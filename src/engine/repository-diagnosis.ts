/**
 * Evidence-based repository diagnosis.
 *
 * This is a pure analysis module: it does not fetch, mutate, or create repositories.
 * Callers must pass the files/metadata actually returned by GitHub. Empty or partial
 * inputs are reported as unknown when the evidence is insufficient.
 */

export type RepositoryCondition =
  | "empty"
  | "existing-project"
  | "partial-project"
  | "likely-broken"
  | "unknown";

export interface RepositoryEvidence {
  repoFullName: string;
  defaultBranch?: string | null;
  latestCommitSha?: string | null;
  commitCount?: number | null;
  files: string[];
  readableFileCount?: number;
  treeComplete: boolean;
  actionsFailures?: number;
  actionsRunsKnown?: boolean;
}

export interface RepositoryDiagnosis {
  condition: RepositoryCondition;
  title: string;
  summary: string;
  confidence: "high" | "medium" | "low";
  evidence: string[];
  unknowns: string[];
  recommendedNextSteps: string[];
  safeToInitialize: boolean;
}

const unique = (items: string[]) => [...new Set(items)];
const lower = (items: string[]) => items.map((x) => x.toLowerCase());
const hasAny = (files: string[], candidates: string[]) => candidates.some((candidate) => files.includes(candidate));
const hasPrefix = (files: string[], prefix: string) => files.some((f) => f.startsWith(prefix));

export function diagnoseRepository(input: RepositoryEvidence): RepositoryDiagnosis {
  const files = unique(input.files.map((p) => p.replace(/^\.\//, "").replace(/^\/+/, "")));
  const names = lower(files);
  const evidence: string[] = [];
  const unknowns: string[] = [];
  const steps: string[] = [];
  const hasCommit = !!input.latestCommitSha || (typeof input.commitCount === "number" && input.commitCount > 0);
  const readableCount = input.readableFileCount ?? files.length;
  const treeHasFiles = files.length > 0;
  const treeComplete = input.treeComplete;
  const manifests = ["package.json", "pnpm-lock.yaml", "yarn.lock", "package-lock.json", "pyproject.toml", "requirements.txt", "cargo.toml", "go.mod", "pom.xml", "build.gradle", "build.gradle.kts", "pubspec.yaml"];
  const appEntrypoints = ["src/main.tsx", "src/main.ts", "src/index.tsx", "src/index.ts", "src/app.tsx", "app.tsx", "app/page.tsx", "main.py", "main.go", "src/main.rs", "lib/main.dart"];
  const testFiles = names.filter((p) => /(^|\/)(__tests__\/|tests?\/)|\.(test|spec)\.[^.]+$/.test(p));
  const hasManifest = hasAny(names, manifests);
  const hasEntrypoint = hasAny(names, appEntrypoints);
  const hasWorkflow = hasPrefix(names, ".github/workflows/");
  const readme = names.includes("readme.md") || names.includes("readme");
  const projectSignals = Number(hasManifest) + Number(hasEntrypoint) + Number(hasWorkflow) + Number(testFiles.length > 0);
  const criticalMissing = hasManifest && !hasEntrypoint;
  const actionsKnown = input.actionsRunsKnown === true;

  if (!input.repoFullName.includes("/")) unknowns.push("Repository name was not supplied in owner/repository form.");
  if (!treeComplete) unknowns.push("The file listing is partial; absence of files cannot prove the repository is empty.");
  if (readableCount < files.length) unknowns.push("Some listed files could not be read.");
  if (input.commitCount == null && !input.latestCommitSha) unknowns.push("Commit history was not confirmed.");
  if (!actionsKnown) unknowns.push("GitHub Actions status has not been checked.");
  else if ((input.actionsFailures ?? 0) > 0) evidence.push(`${input.actionsFailures} failing GitHub Actions run(s) were reported.`);

  if (treeComplete && files.length === 0 && !hasCommit && input.commitCount === 0) {
    evidence.push("The complete repository tree contains no files.");
    evidence.push("The repository has no confirmed commits.");
    return {
      condition: "empty", title: "Empty repository",
      summary: "The available GitHub evidence shows no files and no commits. Nothing will be initialized until the user confirms the intended project.",
      confidence: "high", evidence, unknowns,
      recommendedNextSteps: ["Ask what the user wants to build.", "Propose a starting architecture and required services.", "Get confirmation before creating files or committing changes."],
      safeToInitialize: true,
    };
  }

  if (!treeHasFiles && !treeComplete) {
    evidence.push("No files were returned, but the tree listing is incomplete.");
    return {
      condition: "unknown", title: "Repository status unknown",
      summary: "Kuro-chan does not have enough evidence to decide whether this repository is empty or the listing failed.",
      confidence: "low", evidence, unknowns,
      recommendedNextSteps: ["Retry the default-branch and tree requests.", "Check repository permissions and API errors.", "Do not initialize or overwrite anything until the repository is inspected."],
      safeToInitialize: false,
    };
  }

  if (treeHasFiles) evidence.push(`GitHub returned ${files.length} distinct path(s).`);
  if (hasManifest) evidence.push("A recognized dependency/build manifest exists.");
  if (hasEntrypoint) evidence.push("A recognized application entry point exists.");
  if (readme) evidence.push("A README is present.");
  if (testFiles.length) evidence.push(`${testFiles.length} likely test file(s) were detected.`);
  if (hasWorkflow) evidence.push("A GitHub Actions workflow directory exists.");

  if (actionsKnown && (input.actionsFailures ?? 0) > 0) {
    return {
      condition: "likely-broken", title: "Project with failing automation",
      summary: "GitHub reports failing Actions runs. This is a signal to investigate, not proof that every part of the app is broken.",
      confidence: "medium", evidence, unknowns,
      recommendedNextSteps: ["Inspect the latest failing workflow and its logs.", "Run the relevant checks against the current commit.", "Identify the smallest repair and report the evidence before changing files."],
      safeToInitialize: false,
    };
  }

  if (criticalMissing || (hasManifest && projectSignals <= 1)) {
    if (criticalMissing) evidence.push("A build/dependency manifest exists but no recognized app entry point was found.");
    return {
      condition: "partial-project", title: "Partially implemented project",
      summary: "Some project structure exists, but expected pieces may be missing. Inspect the actual scripts and imports before classifying it as broken.",
      confidence: "medium", evidence, unknowns,
      recommendedNextSteps: ["Read the manifest and entry files.", "Check referenced imports and scripts.", "Run type checks/tests/build if the runtime supports them."],
      safeToInitialize: false,
    };
  }

  if (projectSignals >= 2 || (treeHasFiles && hasCommit)) {
    return {
      condition: "existing-project", title: "Existing project detected",
      summary: "The repository contains project files. Kuro-chan should understand and preserve the existing architecture rather than replace it with a starter template.",
      confidence: treeComplete && hasManifest && hasEntrypoint ? "high" : "medium",
      evidence, unknowns,
      recommendedNextSteps: ["Map the project structure and dependencies.", "Inspect build/test scripts and recent history.", "Establish a baseline before proposing edits."],
      safeToInitialize: false,
    };
  }

  steps.push("Fetch the full default-branch tree and inspect key files.");
  steps.push("Check commit history and repository permissions.");
  return {
    condition: "unknown", title: "More inspection needed",
    summary: "The current evidence does not reliably classify this repository. Kuro-chan should inspect further rather than guess.",
    confidence: "low", evidence, unknowns,
    recommendedNextSteps: steps,
    safeToInitialize: false,
  };
}
