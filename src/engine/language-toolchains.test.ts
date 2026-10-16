import { detectLanguageCapabilities, detectProjectToolchains } from "./language-toolchains";

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

const cpp = detectLanguageCapabilities(["CMakeLists.txt", "src/main.cpp", "src/render.cpp", "tests/CMakeLists.txt"]);
assert(cpp.some((x) => x.id === "cpp"), "CMake projects should be recognized as possible C++ projects");
assert(cpp.find((x) => x.id === "cpp")?.testCommands.includes("ctest --test-dir build --output-on-failure"), "C++ test guidance should include CTest");
assert(!cpp.some((x) => x.id === "javascript"), "C++-only projects should not be mislabeled as JavaScript");

const rustGo = detectProjectToolchains(["Cargo.toml", "src/main.rs", "go.mod", "cmd/server/main.go"]);
assert(rustGo.isPolyglot, "repositories with Rust and Go markers should be identified as polyglot");
assert(rustGo.languages.some((x) => x.id === "rust" && x.buildCommands.includes("cargo check")), "Rust commands should be provided");
assert(rustGo.languages.some((x) => x.id === "go" && x.testCommands.includes("go test ./...")), "Go test commands should be provided");

const ts = detectLanguageCapabilities(["package.json", "tsconfig.json", "src/main.tsx"]);
assert(ts.some((x) => x.id === "typescript"), "TypeScript should be detected");
assert(!ts.some((x) => x.id === "javascript"), "TypeScript config should avoid a duplicate JavaScript inference from package.json alone");

const javaKotlin = detectLanguageCapabilities(["settings.gradle.kts", "build.gradle.kts", "src/Main.kt"]);
assert(javaKotlin.some((x) => x.id === "kotlin"), "Kotlin Gradle projects should be detected");
assert(javaKotlin.some((x) => x.id === "java"), "shared JVM build systems should retain Java capability as a possible language");

const csharp = detectLanguageCapabilities(["src/App.csproj", "src/Program.cs"]);
assert(csharp.some((x) => x.id === "csharp" && x.testCommands.includes("dotnet test")), ".NET test guidance should be available");

const unknown = detectProjectToolchains(["README.md", "assets/logo.png"]);
assert(unknown.languages.length === 0 && unknown.confidence === "none", "documentation-only repos should not be assigned a language");
assert(unknown.note.includes("Verify tool availability"), "the detector must not claim commands were run");

console.log("Language toolchain detection tests passed");
