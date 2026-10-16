import { diagnoseRepository } from "./repository-diagnosis";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

const base = {
  repoFullName: "owner/repo",
  defaultBranch: "main",
  treeComplete: true,
  readableFileCount: 0,
  actionsRunsKnown: true,
  actionsFailures: 0,
};

const empty = diagnoseRepository({ ...base, files: [], commitCount: 0, latestCommitSha: null });
assert(empty.condition === "empty", "complete tree plus no commits should be empty");
assert(empty.safeToInitialize, "confirmed empty repository can be proposed for initialization");

const uncertain = diagnoseRepository({ ...base, files: [], treeComplete: false, commitCount: null });
assert(uncertain.condition === "unknown", "partial tree must not be called empty");
assert(!uncertain.safeToInitialize, "uncertain repository must not be initialized");

const existing = diagnoseRepository({
  ...base,
  files: ["package.json", "src/main.tsx", "README.md", "src/app.test.ts"],
  readableFileCount: 4,
  commitCount: 8,
  latestCommitSha: "abc123",
});
assert(existing.condition === "existing-project", "manifest and entrypoint should be recognized");
assert(!existing.safeToInitialize, "existing project must not be overwritten with a starter");

const partial = diagnoseRepository({
  ...base, files: ["package.json", "README.md"], readableFileCount: 2,
  commitCount: 2, latestCommitSha: "abc123",
});
assert(partial.condition === "partial-project", "manifest without entrypoint should prompt deeper inspection");

const broken = diagnoseRepository({
  ...base, files: ["package.json", "src/main.tsx"], readableFileCount: 2,
  commitCount: 2, latestCommitSha: "abc123", actionsFailures: 2,
});
assert(broken.condition === "likely-broken", "known failing automation should be flagged");

console.log("Repository diagnosis tests passed");
