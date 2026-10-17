import { detectGameEngineCapabilities, detectLanguageCapabilities, detectProjectToolchains, inspectProjectExecutionEvidence } from "./language-toolchains";

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

const manifestDetected = detectGameEngineCapabilities(
  ["Cargo.toml", "package.json"],
  {
    "Cargo.toml": '[dependencies]\nbevy = "0.15"',
    "package.json": JSON.stringify({ dependencies: { three: "^0.170.0", phaser: "^3.80.0", "@babylonjs/core": "^7.0.0" } }),
  },
);
assert(manifestDetected.some((x) => x.id === "bevy" && x.evidence.includes("Cargo.toml dependency")), "Bevy should be detected from its Cargo manifest dependency");
assert(manifestDetected.some((x) => x.id === "threejs" && x.evidence.includes("package.json dependency")), "Three.js should be detected from package.json dependencies");
assert(manifestDetected.some((x) => x.id === "phaser"), "Phaser should be detected from package.json dependencies");
assert(manifestDetected.some((x) => x.id === "babylonjs"), "Babylon.js should be detected from package.json dependencies");

const reportWithManifest = detectProjectToolchains(
  ["Cargo.toml", "package.json"],
  {
    "Cargo.toml": '[dependencies]\nbevy = "0.15"',
    "package.json": JSON.stringify({ dependencies: { phaser: "^3.80.0" } }),
  },
);
assert(reportWithManifest.gameEngines.some((x) => x.id === "bevy"), "project reports should pass manifest evidence through to game-engine detection");
assert(reportWithManifest.gameEngines.some((x) => x.id === "phaser"), "project reports should include package.json engine dependencies");
assert(reportWithManifest.note.includes("manifest contents"), "project report should describe its manifest evidence source");

const unknown = detectProjectToolchains(["README.md", "assets/logo.png"]);
assert(unknown.languages.length === 0 && unknown.gameEngines.length === 0 && unknown.confidence === "none", "documentation-only repos should not be assigned a language or game engine");
assert(unknown.note.includes("not proof"), "the detector must not claim commands were run");


const executionEvidence = inspectProjectExecutionEvidence(
  [
    "package.json", "pnpm-lock.yaml", ".nvmrc", "pyproject.toml",
    "Cargo.toml", "Cargo.lock", "go.mod", "ProjectSettings/ProjectVersion.txt",
    "README.md",
  ],
  {
    "package.json": JSON.stringify({
      packageManager: "pnpm@9.12.0",
      engines: { node: ">=20 <23" },
      scripts: { build: "vite build", test: "vitest run", "test:e2e": "playwright test" },
    }),
    ".nvmrc": "22.4.1\n",
    "pyproject.toml": '[project]\nrequires-python = ">=3.11,<3.13"',
    "Cargo.toml": '[package]\nname = "demo"\nversion = "0.1.0"',
    "go.mod": "module example.com/demo\ngo 1.23\ntoolchain go1.23.2",
    "ProjectSettings/ProjectVersion.txt": "m_EditorVersion: 6000.0.23f1\n",
  },
);
assert(executionEvidence.packageScripts.some((x) => x.name === "build" && x.command === "vite build" && x.manifest === "package.json"), "actual package scripts should be surfaced with their source manifest");
assert(executionEvidence.packageScripts.some((x) => x.name === "test:e2e" && x.command === "playwright test"), "custom E2E scripts should be surfaced, not replaced with guessed commands");
assert(executionEvidence.packageManagers.includes("pnpm"), "explicit packageManager should take precedence over inferred manager signals");
assert(executionEvidence.lockfiles.includes("pnpm-lock.yaml") && executionEvidence.lockfiles.includes("Cargo.lock"), "lockfiles should be listed as reproducibility evidence");
assert(executionEvidence.runtimePins.some((x) => x.includes("Node.js pin: 22.4.1")), "Node runtime pin should be read from .nvmrc");
assert(executionEvidence.runtimePins.some((x) => x.includes("Python requirement: >=3.11,<3.13")), "Python version constraints should be read from pyproject.toml");
assert(executionEvidence.runtimePins.some((x) => x.includes("Go toolchain pin: go1.23.2")), "Go toolchain pins should be surfaced");
assert(executionEvidence.runtimePins.some((x) => x.includes("Unity Editor version: 6000.0.23f1")), "Unity editor pins should be surfaced");
assert(!executionEvidence.packageScripts.some((x) => x.command.includes("README")), "the report must not invent scripts from non-manifest files");

console.log("Language and game-engine capability detection tests passed");
