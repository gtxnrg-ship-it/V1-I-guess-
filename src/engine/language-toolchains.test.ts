import { detectGameEngineCapabilities, detectLanguageCapabilities, detectProjectToolchains } from "./language-toolchains";

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

const scientific = detectLanguageCapabilities(["analysis/model.R", "notebooks/forecast.ipynb", "src/analysis.py", "src/simulation.jl"]);
assert(scientific.some((x) => x.id === "r" && x.testCommands.some((x) => x.includes("testthat"))), "R statistical projects should be detected with test guidance");
assert(scientific.some((x) => x.id === "python"), "Python scientific workflows should be detected");
assert(scientific.some((x) => x.id === "julia"), "Julia numerical/scientific projects should be detected");

const polyglot = detectLanguageCapabilities(["src/main.py", "src/main.rs", "src/main.go", "src/Main.kt", "contracts/Token.sol", "db/schema.sql", "scripts/deploy.sh"]);
for (const id of ["python", "rust", "go", "kotlin", "solidity", "sql", "bash"]) {
  assert(polyglot.some((x) => x.id === id), `Polyglot repository should detect ${id}`);
}

const game = detectGameEngineCapabilities(["ProjectSettings/ProjectVersion.txt", "Assets/Scenes/Main.unity", "project.godot", "scenes/main.tscn", "Source/MyGame.Build.cs", "Game.uproject", "phaser.config.ts"]);
assert(game.some((x) => x.id === "unity"), "Unity project markers should be detected");
assert(game.some((x) => x.id === "godot"), "Godot project markers should be detected");
assert(game.some((x) => x.id === "unreal"), "Unreal project markers should be detected");
assert(game.some((x) => x.id === "phaser"), "Phaser config markers should be detected");
assert(game.every((x) => x.notes.length > 0), "Game-engine results should explain important execution boundaries");

const ambiguous = detectGameEngineCapabilities(["Cargo.toml", "src/main.rs", "README.md"]);
assert(ambiguous.length === 0, "Ordinary Rust projects must not be mislabeled as Bevy games");

const unknown = detectProjectToolchains(["README.md", "assets/logo.png"]);
assert(unknown.languages.length === 0 && unknown.gameEngines.length === 0 && unknown.confidence === "none", "documentation-only repos should not be assigned a language or game engine");
assert(unknown.note.includes("not proof"), "the detector must not claim commands were run");

const rProject = detectLanguageCapabilities(["analysis/model.R"]);
const rCommands = rProject.find((x) => x.id === "r")?.testCommands || [];
assert(
  rCommands.includes("Rscript -e 'testthat::test_dir(\"tests/testthat\")'"),
  "R test command must preserve its nested quotes and remain valid TypeScript",
);

console.log("Language and game-engine capability detection tests passed");
