/**
 * Evidence-based language and game-engine detection for repository work.
 *
 * This module reports likely toolchains and candidate commands. It does not
 * claim that tools are installed, that commands were executed, or that a
 * detected project can be built on the current device.
 */
export type LanguageId =
  | "typescript" | "javascript" | "python" | "cpp" | "c" | "rust"
  | "go" | "java" | "kotlin" | "csharp" | "swift" | "dart" | "ruby" | "php"
  | "r" | "julia" | "lua" | "scala" | "elixir" | "haskell" | "erlang"
  | "perl" | "sql" | "bash" | "powershell" | "solidity";

export interface LanguageCapability {
  id: LanguageId;
  label: string;
  evidence: string[];
  buildCommands: string[];
  testCommands: string[];
  toolchain: string;
}

export type GameEngineId = "unity" | "unreal" | "godot" | "bevy" | "phaser" | "threejs" | "babylonjs" | "defold" | "love2d" | "playcanvas";
export interface GameEngineCapability {
  id: GameEngineId;
  label: string;
  evidence: string[];
  buildCommands: string[];
  testCommands: string[];
  toolchain: string;
  notes: string;
}

type LanguageRule = Omit<LanguageCapability, "evidence"> & { markers: string[] };
const RULES: LanguageRule[] = [
  { id: "typescript", label: "TypeScript", markers: ["tsconfig.json", "vite.config.ts", "next.config.ts", "*.ts", "*.tsx", "*.mts", "*.cts"], buildCommands: ["npm run build", "npx tsc --noEmit"], testCommands: ["npm test"], toolchain: "Node.js + package manager + TypeScript compiler" },
  { id: "javascript", label: "JavaScript", markers: ["package.json", "vite.config.js", "next.config.js", "webpack.config.js", "jsconfig.json", "*.js", "*.jsx", "*.mjs", "*.cjs"], buildCommands: ["npm run build"], testCommands: ["npm test"], toolchain: "Node.js + package manager + project-specific bundler" },
  { id: "python", label: "Python", markers: ["pyproject.toml", "requirements.txt", "Pipfile", "setup.py", "pytest.ini", "tox.ini", "*.py"], buildCommands: ["python -m compileall ."], testCommands: ["python -m pytest"], toolchain: "Python interpreter + project dependency manager" },
  { id: "cpp", label: "C++", markers: ["CMakeLists.txt", "meson.build", "conanfile.py", "vcpkg.json", "Makefile", "*.cpp", "*.cc", "*.cxx", "*.hpp", "*.hxx"], buildCommands: ["cmake -S . -B build && cmake --build build", "cmake --build build --target all"], testCommands: ["ctest --test-dir build --output-on-failure"], toolchain: "C++ compiler (Clang/GCC/MSVC) + CMake/Meson or project build system" },
  { id: "c", label: "C", markers: ["CMakeLists.txt", "meson.build", "Makefile", "configure.ac", "*.c", "*.h"], buildCommands: ["cmake -S . -B build && cmake --build build", "make"], testCommands: ["ctest --test-dir build --output-on-failure", "make test"], toolchain: "C compiler (Clang/GCC/MSVC) + project build system" },
  { id: "rust", label: "Rust", markers: ["Cargo.toml", "Cargo.lock", "*.rs"], buildCommands: ["cargo check", "cargo build"], testCommands: ["cargo test"], toolchain: "Rust toolchain (rustc + Cargo)" },
  { id: "go", label: "Go", markers: ["go.mod", "go.work", "*.go"], buildCommands: ["go build ./..."], testCommands: ["go test ./..."], toolchain: "Go toolchain" },
  { id: "java", label: "Java", markers: ["pom.xml", "build.gradle", "build.gradle.kts", "gradlew", "mvnw", "*.java"], buildCommands: ["./gradlew build", "./mvnw package"], testCommands: ["./gradlew test", "./mvnw test"], toolchain: "JDK + Maven or Gradle" },
  { id: "kotlin", label: "Kotlin", markers: ["build.gradle.kts", "settings.gradle.kts", "gradlew", "*.kt", "*.kts"], buildCommands: ["./gradlew build"], testCommands: ["./gradlew test"], toolchain: "JDK + Kotlin compiler via Gradle or project build system" },
  { id: "csharp", label: "C#", markers: [".sln", ".csproj", "global.json", "Directory.Build.props", "*.cs"], buildCommands: ["dotnet build"], testCommands: ["dotnet test"], toolchain: ".NET SDK" },
  { id: "swift", label: "Swift", markers: ["Package.swift", ".xcodeproj", ".xcworkspace", "*.swift"], buildCommands: ["swift build", "xcodebuild build"], testCommands: ["swift test", "xcodebuild test"], toolchain: "Swift toolchain; Xcode required for Apple-platform projects" },
  { id: "dart", label: "Dart", markers: ["pubspec.yaml", "analysis_options.yaml", "*.dart"], buildCommands: ["dart analyze", "dart compile"], testCommands: ["dart test", "flutter test"], toolchain: "Dart SDK; Flutter SDK for Flutter projects" },
  { id: "ruby", label: "Ruby", markers: ["Gemfile", "Rakefile", "*.gemspec", "*.rb"], buildCommands: ["bundle exec rake build"], testCommands: ["bundle exec rspec", "bundle exec rake test"], toolchain: "Ruby + Bundler + project test framework" },
  { id: "php", label: "PHP", markers: ["composer.json", "composer.lock", "phpunit.xml", "*.php"], buildCommands: ["composer validate"], testCommands: ["vendor/bin/phpunit"], toolchain: "PHP runtime + Composer + project test framework" },
  { id: "r", label: "R", markers: ["DESCRIPTION", "renv.lock", "*.R", "*.Rmd", "*.r"], buildCommands: ["R CMD build ."], testCommands: ["Rscript -e 'testthat::test_dir(\"tests/testthat\")'"], toolchain: "R + project package/dependency environment (renv is common)" },
  { id: "julia", label: "Julia", markers: ["Project.toml", "Manifest.toml", "*.jl"], buildCommands: ["julia --project=. -e 'using Pkg; Pkg.instantiate()'"], testCommands: ["julia --project=. -e 'using Pkg; Pkg.test()'"], toolchain: "Julia + Pkg project environment" },
  { id: "lua", label: "Lua", markers: ["*.lua", ".luacheckrc", ".rockspec"], buildCommands: ["luarocks make"], testCommands: ["busted"], toolchain: "Lua interpreter + LuaRocks; test runner depends on the project" },
  { id: "scala", label: "Scala", markers: ["build.sbt", "project/build.properties", "*.scala", "*.sc"], buildCommands: ["sbt compile"], testCommands: ["sbt test"], toolchain: "JDK + sbt or Scala CLI" },
  { id: "elixir", label: "Elixir", markers: ["mix.exs", "mix.lock", "*.ex", "*.exs"], buildCommands: ["mix compile"], testCommands: ["mix test"], toolchain: "Elixir + Erlang/OTP + Mix" },
  { id: "haskell", label: "Haskell", markers: ["*.cabal", "cabal.project", "stack.yaml", "*.hs", "*.lhs"], buildCommands: ["cabal build all", "stack build"], testCommands: ["cabal test all", "stack test"], toolchain: "GHC + Cabal or Stack" },
  { id: "erlang", label: "Erlang", markers: ["rebar.config", "mix.exs", "*.erl", "*.hrl"], buildCommands: ["rebar3 compile"], testCommands: ["rebar3 eunit", "rebar3 ct"], toolchain: "Erlang/OTP + Rebar3 or Mix" },
  { id: "perl", label: "Perl", markers: ["Makefile.PL", "Build.PL", "cpanfile", "*.pl", "*.pm"], buildCommands: ["perl Makefile.PL && make"], testCommands: ["prove -lr t"], toolchain: "Perl + CPAN build/test tooling" },
  { id: "sql", label: "SQL", markers: ["*.sql", "sqlfluff", ".sqlfluff", "dbt_project.yml"], buildCommands: [], testCommands: ["sqlfluff lint .", "dbt test"], toolchain: "Database-specific SQL dialect and optional linter/migration/test tooling; configure the actual database before execution" },
  { id: "bash", label: "Bash / shell", markers: ["*.sh", "Makefile", ".shellcheckrc"], buildCommands: [], testCommands: ["bash -n ./script.sh", "shellcheck ."], toolchain: "POSIX-compatible shell; ShellCheck is optional static analysis" },
  { id: "powershell", label: "PowerShell", markers: ["*.ps1", "*.psm1", "*.psd1"], buildCommands: [], testCommands: ["Invoke-Pester"], toolchain: "PowerShell 7+; Pester is the common test framework" },
  { id: "solidity", label: "Solidity", markers: ["foundry.toml", "hardhat.config.ts", "hardhat.config.js", "*.sol"], buildCommands: ["forge build", "npx hardhat compile"], testCommands: ["forge test", "npx hardhat test"], toolchain: "Solidity compiler via Foundry or Hardhat; contract tests should run on a local test chain" },
];

const normalize = (path: string) => path.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/+/g, "/");
function markerMatches(path: string, marker: string): boolean {
  const normalized = normalize(path);
  const basename = normalized.split("/").pop() || normalized;
  if (marker.startsWith("*.")) return basename.endsWith(marker.slice(1));
  if (marker.startsWith(".")) return basename.endsWith(marker);
  return normalized === marker || normalized.endsWith("/" + marker);
}

export function detectLanguageCapabilities(paths: Iterable<string>): LanguageCapability[] {
  const files = [...new Set([...paths].map(normalize).filter(Boolean))];
  const results: LanguageCapability[] = [];
  for (const rule of RULES) {
    const evidence = rule.markers.filter((marker) => files.some((path) => markerMatches(path, marker)));
    if (!evidence.length) continue;
    results.push({ id: rule.id, label: rule.label, evidence, buildCommands: [...rule.buildCommands], testCommands: [...rule.testCommands], toolchain: rule.toolchain });
  }
  // TypeScript is a superset of JavaScript in many repos; don't infer both from
  // package.json alone. Keep both when explicit JS-only configuration exists.
  const hasTypeScript = results.some((r) => r.id === "typescript");
  const tsConfig = files.some((p) => markerMatches(p, "tsconfig.json"));
  if (hasTypeScript && tsConfig) {
    const js = results.find((r) => r.id === "javascript");
    if (js && js.evidence.every((e) => e === "package.json")) results.splice(results.indexOf(js), 1);
  }
  // C/C++ share headers and build manifests. Only keep C++ if C++-specific
  // source/header evidence exists; a shared CMake project alone stays ambiguous.
  const cpp = results.find((r) => r.id === "cpp");
  const c = results.find((r) => r.id === "c");
  const hasCppSource = files.some((p) => /\.(cpp|cc|cxx|hpp|hxx)$/i.test(p));
  const hasCSource = files.some((p) => /\.(c|h)$/i.test(p));
  if (cpp && !hasCppSource && !hasCSource && c) results.splice(results.indexOf(c), 1);
  if (cpp && hasCppSource && c && !hasCSource) results.splice(results.indexOf(c), 1);
  // Erlang is also used by Elixir; don't label it as a separate source language
  // merely because a Mix project contains Elixir files.
  const elixir = results.some((r) => r.id === "elixir");
  if (elixir && !files.some((p) => /\.(erl|hrl)$/i.test(p))) {
    const erlang = results.find((r) => r.id === "erlang");
    if (erlang && erlang.evidence.every((e) => e === "mix.exs")) results.splice(results.indexOf(erlang), 1);
  }
  return results;
}

const GAME_RULES: Array<Omit<GameEngineCapability, "evidence"> & { markers: string[] }> = [
  { id: "unity", label: "Unity", markers: ["ProjectSettings/ProjectVersion.txt", "Packages/manifest.json", "*.unity", "*.asmdef"], buildCommands: ["Unity -batchmode -quit -projectPath . -buildTarget <target> -executeMethod <BuildMethod>"], testCommands: ["Unity -batchmode -quit -projectPath . -runTests -testPlatform EditMode -testResults test-results.xml"], toolchain: "Unity Editor/Unity Hub + project-specific scripting backend; licensed editor installation may be required", notes: "Build target, Unity version, scripting backend, and project build method must be confirmed before running." },
  { id: "unreal", label: "Unreal Engine", markers: ["*.uproject", "*.uplugin", "*.Build.cs"], buildCommands: ["UnrealBuildTool <Target> <Platform> <Configuration> -Project=<Project.uproject>"], testCommands: ["UnrealEditor-Cmd <Project.uproject> -ExecCmds=\"Automation RunTests\" -unattended -nop4"], toolchain: "Unreal Engine version + UnrealBuildTool; native projects may also require a compatible C++ toolchain", notes: "Requires the installed matching engine/toolchain and project-specific target names; source builds can be resource-intensive." },
  { id: "godot", label: "Godot", markers: ["project.godot", "*.tscn", "*.gd", "*.tres"], buildCommands: ["godot --headless --path . --editor --quit"], testCommands: ["godot --headless --path . --quit"], toolchain: "Godot version pinned by the project; export templates are needed for many release exports", notes: "A headless editor/import check is not the same as gameplay acceptance or an exported release build." },
  { id: "bevy", label: "Bevy", markers: ["bevy.toml"], buildCommands: ["cargo build"], testCommands: ["cargo test"], toolchain: "Rust + Cargo + a Bevy-compatible graphics/audio system", notes: "Detection requires a bevy.toml marker or a Bevy dependency declared in Cargo.toml; ordinary Cargo projects are not assumed to use Bevy." },
  { id: "phaser", label: "Phaser", markers: ["phaser.config.js", "phaser.config.ts", "phaser.config.mjs"], buildCommands: ["npm run build"], testCommands: ["npm test"], toolchain: "Node.js + project package manager + Phaser-compatible browser bundler", notes: "The package manifest and scripts must confirm the actual build/test commands." },
  { id: "threejs", label: "Three.js", markers: ["three.config.js", "three.config.ts", "three.config.mjs"], buildCommands: ["npm run build"], testCommands: ["npm test"], toolchain: "JavaScript/TypeScript + WebGL/WebGPU-capable browser or runtime", notes: "A successful bundle does not verify rendering, GPU compatibility, or frame-time budgets." },
  { id: "babylonjs", label: "Babylon.js", markers: ["babylon.config.js", "babylon.config.ts", "babylon.config.mjs"], buildCommands: ["npm run build"], testCommands: ["npm test"], toolchain: "JavaScript/TypeScript + Babylon.js-compatible rendering runtime", notes: "A successful bundle does not verify rendering, GPU compatibility, or frame-time budgets." },
  { id: "defold", label: "Defold", markers: ["game.project"], buildCommands: ["bob.jar --archive --platform <platform>"], testCommands: ["Use the project's configured Defold test/build workflow"], toolchain: "Defold editor or Bob command-line build tool", notes: "Target platform and the installed Defold build tooling must be confirmed." },
  { id: "love2d", label: "LÖVE (Love2D)", markers: ["conf.lua"], buildCommands: ["zip -r game.love . -x '*.git*'"], testCommands: ["Run the game under the target LÖVE runtime and exercise a project-specific test scene"], toolchain: "Lua + LÖVE runtime", notes: "Packaging is platform-specific; runtime/gameplay checks are still required." },
  { id: "playcanvas", label: "PlayCanvas", markers: [".playcanvasrc", "playcanvas.config.js", "playcanvas.config.ts"], buildCommands: ["npm run build"], testCommands: ["npm test"], toolchain: "PlayCanvas project tooling + Node.js when using a bundled workflow", notes: "Some PlayCanvas projects are editor/cloud-first and cannot be fully built from repository files alone." },
];

function dependencyPresent(content: string, name: string): boolean {
  try {
    const manifest = JSON.parse(content);
    return [manifest.dependencies, manifest.devDependencies, manifest.peerDependencies, manifest.optionalDependencies].some((group) => group && Object.prototype.hasOwnProperty.call(group, name));
  } catch {
    return false;
  }
}

export function detectGameEngineCapabilities(paths: Iterable<string>, fileContents: Record<string, string> = {}): GameEngineCapability[] {
  const files = [...new Set([...paths].map(normalize).filter(Boolean))];
  const contents = new Map(Object.entries(fileContents).map(([path, content]) => [normalize(path), content]));
  const manifestEngines: Array<{ id: GameEngineId; evidence: string; matches: (path: string, content: string) => boolean }> = [
    { id: "bevy", evidence: "Cargo.toml dependency", matches: (path, content) => path.endsWith("Cargo.toml") && /(?:^|\n)\s*(?:bevy\s*=|\[dependencies\.bevy\])/m.test(content) },
    { id: "phaser", evidence: "package.json dependency", matches: (path, content) => path.endsWith("package.json") && dependencyPresent(content, "phaser") },
    { id: "threejs", evidence: "package.json dependency", matches: (path, content) => path.endsWith("package.json") && dependencyPresent(content, "three") },
    { id: "babylonjs", evidence: "package.json dependency", matches: (path, content) => path.endsWith("package.json") && dependencyPresent(content, "@babylonjs/core") },
    { id: "playcanvas", evidence: "package.json dependency", matches: (path, content) => path.endsWith("package.json") && dependencyPresent(content, "playcanvas") },
  ];
  return GAME_RULES.flatMap((rule) => {
    const evidence = rule.markers.filter((marker) => files.some((path) => markerMatches(path, marker)));
    for (const signal of manifestEngines.filter((item) => item.id === rule.id)) {
      if ([...contents.entries()].some(([path, content]) => signal.matches(path, content))) evidence.push(signal.evidence);
    }
    return evidence.length ? [{ id: rule.id, label: rule.label, evidence, buildCommands: [...rule.buildCommands], testCommands: [...rule.testCommands], toolchain: rule.toolchain, notes: rule.notes }] : [];
  });
}

export interface ProjectExecutionEvidence {
  /** Actual scripts declared by package.json; never claims that they were run. */
  packageScripts: Array<{ name: string; command: string; manifest: string }>;
  /** Lockfiles present in the inventory, useful for reproducible installs. */
  lockfiles: string[];
  /** Runtime/toolchain constraints explicitly declared by project files. */
  runtimePins: string[];
  /** Package manager evidence declared by package.json or lockfiles. */
  packageManagers: string[];
}

const LOCKFILE_NAMES: Record<string, string> = {
  "package-lock.json": "npm",
  "npm-shrinkwrap.json": "npm",
  "pnpm-lock.yaml": "pnpm",
  "yarn.lock": "yarn",
  "bun.lock": "bun",
  "bun.lockb": "bun",
  "poetry.lock": "Poetry",
  "uv.lock": "uv",
  "pdm.lock": "PDM",
  "pipfile.lock": "Pipenv",
  "pipfile": "Pipenv",
  "cargo.lock": "Cargo",
  "composer.lock": "Composer",
  "gemfile.lock": "Bundler",
  "mix.lock": "Mix",
  "go.sum": "Go modules",
  "packages.lock.json": ".NET NuGet",
};

function readJson(content: string): Record<string, any> | null {
  try {
    const parsed = JSON.parse(content);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch { return null; }
}

/**
 * Extract reproducibility evidence without running project scripts or installing dependencies.
 * Only declared scripts/pins are returned; missing evidence is left unknown rather than guessed.
 */
export function inspectProjectExecutionEvidence(paths: Iterable<string>, fileContents: Record<string, string> = {}): ProjectExecutionEvidence {
  const files = [...new Set([...paths].map(normalize).filter(Boolean))];
  const contents = new Map(Object.entries(fileContents).map(([path, content]) => [normalize(path), content]));
  const packageScripts: ProjectExecutionEvidence["packageScripts"] = [];
  const lockfiles: string[] = [];
  const packageManagers = new Set<string>();
  const runtimePins: string[] = [];
  const addPin = (label: string, value: string) => {
    const normalized = value.trim();
    if (normalized && normalized.length <= 180) runtimePins.push(`${label}: ${normalized}`);
  };

  for (const path of files) {
    const name = (path.split("/").pop() || path).toLowerCase();
    const content = contents.get(path);
    const manager = LOCKFILE_NAMES[name];
    if (manager && name !== "pipfile") {
      lockfiles.push(path);
      if (manager !== ".NET NuGet") packageManagers.add(manager);
    }
    if (content == null) continue;

    if (name === "package.json") {
      const manifest = readJson(content);
      if (manifest) {
        if (typeof manifest.packageManager === "string") {
          const declared = manifest.packageManager.trim();
          addPin("package.json packageManager", declared);
          const match = declared.match(/^(npm|pnpm|yarn|bun)@/i);
          if (match) packageManagers.add(match[1].toLowerCase());
        }
        if (typeof manifest.engines?.node === "string") addPin("Node.js engine constraint", manifest.engines.node);
        if (manifest.scripts && typeof manifest.scripts === "object" && !Array.isArray(manifest.scripts)) {
          for (const [scriptName, command] of Object.entries(manifest.scripts)) {
            if (typeof command === "string" && scriptName.trim() && command.trim()) {
              packageScripts.push({ name: scriptName, command: command.trim().slice(0, 500), manifest: path });
            }
          }
        }
      }
    } else if ([".nvmrc", ".node-version", ".python-version", ".ruby-version", ".java-version"].includes(name)) {
      const label = name === ".nvmrc" || name === ".node-version" ? "Node.js pin"
        : name === ".python-version" ? "Python pin"
        : name === ".ruby-version" ? "Ruby pin" : "Java pin";
      addPin(label, content.split(/\r?\n/)[0]);
    } else if (name === "rust-toolchain" || name === "rust-toolchain.toml") {
      const channel = content.match(/^\s*channel\s*=\s*["']([^"']+)["']/m)?.[1] || (name === "rust-toolchain" ? content.trim().split(/\r?\n/)[0] : "");
      addPin("Rust toolchain", channel);
    } else if (name === "global.json") {
      const version = readJson(content)?.sdk?.version;
      if (typeof version === "string") addPin(".NET SDK pin", version);
    } else if (name === "go.mod") {
      const version = content.match(/^\s*go\s+(\S+)/m)?.[1];
      const toolchain = content.match(/^\s*toolchain\s+(\S+)/m)?.[1];
      if (version) addPin("Go language version", version);
      if (toolchain) addPin("Go toolchain pin", toolchain);
    } else if (name === "pyproject.toml") {
      const python = content.match(/^\s*requires-python\s*=\s*["']([^"']+)["']/m)?.[1];
      if (python) addPin("Python requirement", python);
    } else if (name === "projectversion.txt" && /(^|\/)projectsettings\/projectversion\.txt$/i.test(path)) {
      const version = content.match(/\d+\.\d+\.\d+[abfp]?\d*/)?.[0];
      if (version) addPin("Unity Editor version", version);
    } else if (name === "package.swift") {
      const version = content.match(/^\s*\/\/\s* swift-tools-version:\s*([^\s]+)/m)?.[1];
      if (version) addPin("Swift tools version", version);
    } else if (name === ".tool-versions") {
      for (const line of content.split(/\r?\n/)) {
        const match = line.trim().match(/^(nodejs|python|ruby|golang|rust|java|elixir|erlang)\s+(\S+)/);
        if (match) addPin(`${match[1]} version-manager pin`, match[2]);
      }
    }
  }

  // A declared packageManager is more authoritative than inferred lockfile metadata.
  const packageJsonDeclared = runtimePins.some((pin) => pin.startsWith("package.json packageManager:"));
  if (packageJsonDeclared) {
    const declared = runtimePins.find((pin) => pin.startsWith("package.json packageManager:"))?.split(": ").slice(1).join(": ") || "";
    const manager = declared.match(/^(npm|pnpm|yarn|bun)@/i)?.[1]?.toLowerCase();
    if (manager) {
      packageManagers.clear();
      packageManagers.add(manager);
    }
  }
  return {
    packageScripts: packageScripts.sort((a, b) => a.name.localeCompare(b.name)),
    lockfiles: [...new Set(lockfiles)].sort(),
    runtimePins: [...new Set(runtimePins)].sort(),
    packageManagers: [...packageManagers].sort(),
  };
}

export function detectProjectToolchains(paths: Iterable<string>, fileContents: Record<string, string> = {}) {
  const files = [...new Set([...paths].map(normalize).filter(Boolean))];
  const languages = detectLanguageCapabilities(files);
  const gameEngines = detectGameEngineCapabilities(files, fileContents);
  const buildFiles = files.filter((p) => /(^|\/)(CMakeLists\.txt|Makefile|meson\.build|Cargo\.toml|go\.mod|pom\.xml|build\.gradle(?:\.kts)?|\.csproj|Package\.swift|pubspec\.yaml|pyproject\.toml|package\.json|mix\.exs|build\.sbt|cabal\.project|foundry\.toml)$/i.test(p));
  return {
    languages,
    gameEngines,
    buildFiles,
    isPolyglot: languages.length > 1,
    confidence: languages.length === 0 && gameEngines.length === 0 ? "none" as const : "evidence-based" as const,
    note: "Detected from repository paths and the supplied manifest contents. Candidate commands are guidance, not proof of installed tools or executed builds. Verify project scripts, runtime versions, credentials, target platforms, and command safety before execution.",
  };
}
