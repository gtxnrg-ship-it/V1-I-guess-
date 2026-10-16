import { validateSelfUpgrade } from "./self";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

assert(validateSelfUpgrade({}).some((issue) => issue.includes("No files")), "empty upgrades must be rejected");
assert(validateSelfUpgrade({ "../outside.ts": "safe" }).some((issue) => issue.includes("Unsafe path")), "path traversal must be rejected");
assert(validateSelfUpgrade({ ".env": "DATABASE_URL=example" }).some((issue) => issue.includes("environment file")), "real env files must be rejected");
assert(validateSelfUpgrade({ "src/example.ts": 'const token = "ghp_abcdefghijklmnopqrstuvwxyz123456";' }).some((issue) => issue.includes("secret")), "GitHub tokens must be rejected");
assert(validateSelfUpgrade({ "src/example.ts": "export const answer = 42;" }).length === 0, "ordinary source changes should pass preflight");
assert(validateSelfUpgrade({ "src/example.ts": "-----BEGIN PRIVATE KEY-----" }).some((issue) => issue.includes("secret")), "private keys must be rejected");

console.log("Self-upgrade preflight tests passed");
