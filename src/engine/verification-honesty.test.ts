import { unsupportedVerification } from "./verification-honesty";

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

const rust = unsupportedVerification({
  "Cargo.toml": "[package]\nname = \"sample\"\nversion = \"0.1.0\"",
  "src/main.rs": "fn main() {}",
});
assert(rust?.stat === "UNVERIFIED", "Rust workspace without a browser entry point must not be marked clean");
assert(rust.result.includes("cargo check") && rust.result.includes("cargo test"), "report candidate Rust commands without claiming they ran");
assert(rust.result.includes("No build, test, or runtime pass is claimed"), "state the verification boundary explicitly");

const go = unsupportedVerification({ "go.mod": "module example.com/demo", "main.go": "package main\nfunc main() {}" });
assert(go?.stat === "UNVERIFIED" && go.result.includes("go test ./..."), "Go projects must be reported as unverified without a native runner");

assert(unsupportedVerification({ "index.html": "<main>static site</main>" }) === null,
  "a static HTML project is eligible for browser QA");
assert(unsupportedVerification({ "src/main.tsx": "export {}" }) === null,
  "a recognized browser entry point is eligible for the existing QA harness");

console.log("Verification honesty regression tests passed");
