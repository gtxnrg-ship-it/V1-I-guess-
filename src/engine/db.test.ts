import * as db from "./db";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

// A fresh Node process starts with an empty in-memory store. Exercise the same
// database APIs used by New chat, project switching, chat history, and editing.
const first = db.createProject("First workspace", { "src/main.ts": "export const value = 1;" });
db.addMessage({ role: "user", content: "First workspace conversation" }, first.id);
db.saveProjectMemory({
  facts: [{ text: "First workspace fact", source: "user-confirmed" }],
  decisions: [],
  openQuestions: [],
}, first.id);
db.takeSnapshot("first checkpoint");

const second = db.createProject("Second workspace", { "src/main.cpp": "int main() { return 0; }" });

assert(first.id !== second.id, "each new workspace must have a unique identity");
assert(db.messages(first.id).length === 1, "the original conversation must remain attached to its workspace");
assert(db.messages(second.id).length === 0, "a new workspace must start with an independent empty conversation");
assert(db.snapshots(first.id).length === 1, "the original workspace snapshot must be retained");
assert(db.snapshots(second.id).length === 0, "snapshots must not leak into a new workspace");

// Checkpoint restoration replaces the complete file set, including removals, and
// creates a recovery checkpoint of the current state before applying the restore.
db.switchProject(first.id);
db.writeFile("src/temporary.ts", "temporary change");
const restoreTarget = db.takeSnapshot("known-good");
db.deleteFile("src/main.ts");
db.writeFile("src/main.ts", "corrupted change");
db.writeFile("src/new-file.ts", "should disappear after restore");
const restored = db.restoreSnapshot(restoreTarget.id, first.id);
assert(restored.ok, "a valid checkpoint should restore successfully");
assert(db.getState().projects.find((p) => p.id === first.id)?.files["src/main.ts"] === "export const value = 1;",
  "restore must bring back the checkpoint file contents");
assert(db.getState().projects.find((p) => p.id === first.id)?.files["src/new-file.ts"] === undefined,
  "restore must remove files absent from the checkpoint");
assert(restored.ok && db.snapshots(first.id).some((s) => s.id === restored.safetySnapshotId
  && s.files["src/main.ts"] === "corrupted change"
  && s.files["src/new-file.ts"] === "should disappear after restore"),
  "restore must preserve the pre-restore files in a safety checkpoint");
assert(db.restoreSnapshot("not-a-real-snapshot", first.id).ok === false,
  "unknown checkpoint IDs must fail without modifying files");
const beforeCrossProjectAttempt = { ...db.getState().projects.find((p) => p.id === second.id)!.files };
assert(db.restoreSnapshot(restoreTarget.id, second.id).ok === false,
  "a checkpoint must not be restorable into a different project");
assert(JSON.stringify(db.getState().projects.find((p) => p.id === second.id)?.files) === JSON.stringify(beforeCrossProjectAttempt),
  "a cross-project restore attempt must leave the target project unchanged");
// Return to the second workspace for the existing active-project edit tests.
db.switchProject(second.id);

assert(db.getState().projects.find((p) => p.id === first.id)?.memory?.facts[0]?.text === "First workspace fact",
  "the original workspace memory must remain attached to its project");
assert(!db.getState().projects.find((p) => p.id === second.id)?.memory,
  "a new workspace must not inherit another project's memory");

// File edits must target the active project, not the project opened previously.
db.writeFile("src/main.cpp", "int main() { return 7; }");
assert(db.getState().projects.find((p) => p.id === second.id)?.files["src/main.cpp"] === "int main() { return 7; }",
  "file edits must update the active workspace");
assert(db.getState().projects.find((p) => p.id === first.id)?.files["src/main.ts"] === "export const value = 1;",
  "editing another workspace must not mutate the original workspace files");

db.switchProject(first.id);
db.addMessage({ role: "assistant", content: "Only in first workspace" });
assert(db.messages(first.id).length === 2, "messages without an explicit ID must use the active workspace");
assert(db.messages(second.id).length === 0, "switching workspaces must preserve the other conversation");

db.clearMessages(first.id);
assert(db.messages(first.id).length === 0, "clearing a workspace must clear its own conversation");
assert(db.messages(second.id).length === 0, "clearing one workspace must not affect another workspace");

db.switchProject(second.id);
db.writeFile("src/only-second.txt", "second");
assert(db.getState().projects.find((p) => p.id === first.id)?.files["src/only-second.txt"] === undefined,
  "files created in the second workspace must not appear in the first workspace");

console.log("Workspace isolation regression tests passed");
