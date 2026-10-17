import assert from "node:assert/strict";
import { countChangedFiles } from "./workspace-diff";

assert.equal(countChangedFiles({}, {}), 0, "identical empty workspaces have no changes");
assert.equal(countChangedFiles({ "src/App.tsx": "same" }, { "src/App.tsx": "same" }), 0, "unchanged files are ignored");
assert.equal(
  countChangedFiles(
    { "src/App.tsx": "old", "src/Removed.ts": "delete me", "README.md": "same" },
    { "src/App.tsx": "new", "README.md": "same", "src/Added.ts": "new file" },
  ),
  3,
  "modified, deleted, and added files are each counted exactly once",
);
assert.equal(
  countChangedFiles({ "only-deleted.ts": "old" }, {}),
  1,
  "a deletion-only change must not be reported as zero files changed",
);
assert.equal(
  countChangedFiles({ "a.ts": "a", "b.ts": "b" }, { "a.ts": "a", "b.ts": "b", "c.ts": "" }),
  1,
  "empty-content new files are still counted as added",
);
console.log("Workspace change accounting tests passed");
