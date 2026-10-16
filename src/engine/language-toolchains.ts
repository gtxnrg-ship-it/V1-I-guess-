/**
 * Evidence-based language and toolchain detection for repository work.
 *
 * This module reports likely toolchains and candidate commands; it does not
 * claim those tools are installed or that commands have been executed.
 */
export type LanguageId =
  | "typescript" | "javascript" | "python" | "cpp" | "c" | "rust"
  | "go" | "java" | "kotlin" | "csharp" | "swift" | "dart" | "ruby" | "php";

export interface LanguageCapability {
  id: LanguageId;
  label: string;
  evidence: string[];
  buildCommands: string[];
  testCommands: string[];
  toolchain: string;
}

const RULES: Array<{
  id: LanguageId;
  label: string;
  markers: string[];
  buildCommands: string[];
  testCommands: string[];
  toolchain: string;
}> = [
  { id: "typescript", label: "TypeScript", markers: ["tsconfig.json", "package.json", "vite.config.ts", "next.config.ts"], buildCommands: ["npm run build", "npx tsc --noEmit"], testCommands: ["npm test"], toolchain: "Node.js + package manager + TypeScript compiler" },
  { id: "javascript", label: "JavaScript", markers: ["package.json", "vite.config.js", "next.config.js", "webpack.config.js"], buildCommands: ["npm run build"], testCommands: ["npm test"], toolchain: "Node.js + package manager + project-specific bundler" },
  { id: "python", label: "Python", markers: ["pyproject.toml", "requirements.txt", "Pipfile", "setup.py", "pytest.ini"], buildCommands: ["python -m compileall ."], testCommands: ["python -m pytest"], toolchain: "Python interpreter + project dependency manager" },
  { id: "cpp", label: "C++", markers: ["CMakeLists.txt", "meson.build", "conanfile.py", "vcpkg.json", "Makefile"], buildCommands: ["cmake -S . -B build && cmake --build build", "cmake --build build --target all"], testCommands: ["ctest --test-dir build --output-on-failure"], toolchain: "C++ compiler (Clang/GCC/MSVC) + CMake/Meson or project build system" },
  { id: "c", label: "C", markers: ["CMakeLists.txt", "meson.build", "Makefile", "configure.ac"], buildCommands: ["cmake -S . -B build && cmake --build build", "make"], testCommands: ["ctest --test-dir build --output-on-failure", "make test"], toolchain: "C compiler (Clang/GCC/MSVC) + project build system" },
  { id: "rust", label: "Rust", markers: ["Cargo.toml", "Cargo.lock"], buildCommands: ["cargo check", "cargo build"], testCommands: ["cargo test"], toolchain: "Rust toolchain (rustc + Cargo)" },
  { id: "go", label: "Go", markers: ["go.mod", "go.work"], buildCommands: ["go build ./..."], testCommands: ["go test ./..."], toolchain: "Go toolchain" },
  { id: "java", label: "Java", markers: ["pom.xml", "build.gradle", "build.gradle.kts", "gradlew", "mvnw"], buildCommands: ["./gradlew build", "./mvnw package"], testCommands: ["./gradlew test", "./mvnw test"], toolchain: "JDK + Maven or Gradle" },
  { id: "kotlin", label: "Kotlin", markers: ["build.gradle.kts", "settings.gradle.kts", "gradlew"], buildCommands: ["./gradlew build"], testCommands: ["./gradlew test"], toolchain: "JDK + Kotlin compiler via Gradle or project build system" },
  { id: "csharp", label: "C#", markers: [".sln", ".csproj", "global.json", "Directory.Build.props"], buildCommands: ["dotnet build"], testCommands: ["dotnet test"], toolchain: ".NET SDK" },
  { id: "swift", label: "Swift", markers: ["Package.swift", ".xcodeproj", ".xcworkspace"], buildCommands: ["swift build", "xcodebuild build"], testCommands: ["swift test", "xcodebuild test"], toolchain: "Swift toolchain; Xcode required for Apple-platform projects" },
  { id: "dart", label: "Dart", markers: ["pubspec.yaml", "analysis_options.yaml"], buildCommands: ["dart analyze", "dart compile"], testCommands: ["dart test", "flutter test"], toolchain: "Dart SDK; Flutter SDK for Flutter projects" },
  { id: "ruby", label: "Ruby", markers: ["Gemfile", "Rakefile", "*.gemspec"], buildCommands: ["bundle exec rake build"], testCommands: ["bundle exec rspec", "bundle exec rake test"], toolchain: "Ruby + Bundler + project test framework" },
  { id: "php", label: "PHP", markers: ["composer.json", "composer.lock", "phpunit.xml"], buildCommands: ["composer validate"], testCommands: ["vendor/bin/phpunit"], toolchain: "PHP runtime + Composer + project test framework" },
];

const normalize = (path: string) => path.replace(/\\/g, "/").replace(/^\.\//, "");
function markerMatches(path: string, marker: string): boolean {
  if (marker.startsWith("*.")) return path.endsWith(marker.slice(1));
  if (marker.startsWith(".")) return path.split("/").pop()?.endsWith(marker) ?? false;
  return path === marker || path.endsWith("/" + marker);
}

export function detectLanguageCapabilities(paths: Iterable<string>): LanguageCapability[] {
  const files = [...new Set([...paths].map(normalize).filter(Boolean))];
  const results: LanguageCapability[] = [];
  for (const rule of RULES) {
    const evidence = rule.markers.filter((marker) => files.some((path) => markerMatches(path, marker)));
    if (!evidence.length) continue;
    results.push({
      id: rule.id,
      label: rule.label,
      evidence,
      buildCommands: [...rule.buildCommands],
      testCommands: [...rule.testCommands],
      toolchain: rule.toolchain,
    });
  }
  // TypeScript is a superset of JavaScript in many repos; don't infer both from
  // package.json alone. Keep both when explicit JS-only configuration exists.
  const hasTypeScript = results.some((r) => r.id === "typescript");
  const tsConfig = files.some((p) => markerMatches(p, "tsconfig.json"));
  if (hasTypeScript && tsConfig) {
    const js = results.find((r) => r.id === "javascript");
    if (js && js.evidence.every((e) => e === "package.json")) {
      results.splice(results.indexOf(js), 1);
    }
  }
  return results;
}

export function detectProjectToolchains(paths: Iterable<string>) {
  const files = [...new Set([...paths].map(normalize).filter(Boolean))];
  const languages = detectLanguageCapabilities(files);
  const buildFiles = files.filter((p) => /(^|\/)(CMakeLists\.txt|Makefile|meson\.build|Cargo\.toml|go\.mod|pom\.xml|build\.gradle(?:\.kts)?|\.csproj|Package\.swift|pubspec\.yaml|pyproject\.toml|package\.json)$/i.test(p));
  return {
    languages,
    buildFiles,
    isPolyglot: languages.length > 1,
    confidence: languages.length === 0 ? "none" as const : "evidence-based" as const,
    note: "Detected from repository filenames only. Verify tool availability and project-specific commands before execution.",
  };
}
