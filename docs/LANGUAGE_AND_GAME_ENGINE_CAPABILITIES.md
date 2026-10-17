# Language and game-engine capability detection

This capability inventory is evidence-based and deliberately separate from execution. The `inspect_project_capabilities` agent tool reads the current workspace file inventory and reports the languages, likely game-engine families, toolchain prerequisites, and candidate build/test commands supported by repository markers.

## Language coverage

The detector currently recognizes TypeScript, JavaScript, Python, C, C++, Rust, Go, Java, Kotlin, C#, Swift, Dart, Ruby, PHP, R, Julia, Lua, Scala, Elixir, Erlang, Haskell, Perl, SQL, Bash/shell, PowerShell, and Solidity.

This includes foundations relevant to complex statistical and scientific work: Python, R, Julia, SQL, and polyglot repositories can be identified with candidate checks. Recognition is not the same as a complete scientific-computing runtime: dependencies, datasets, GPU libraries, databases, notebooks, numerical correctness, reproducibility, and performance still need project-specific setup and tests.

## Game-engine coverage

Recognized engine markers include Unity, Unreal Engine, Godot, Bevy (only when an explicit `bevy.toml` marker exists), Phaser, Three.js, Babylon.js, Defold, LÖVE, and PlayCanvas.

The report includes candidate commands and notes where a build depends on a particular editor/runtime, platform target, export template, target name, cloud editor, or licensed installation. Generic files such as `Cargo.toml` are not enough to infer Bevy. Engine detection based on filenames/configuration is necessarily incomplete for projects that declare their engine only inside a package manifest or source code.

## Honest execution boundary

- This detector does not install compilers, engines, SDKs, dependencies, or model weights.
- It does not execute the suggested commands or claim they passed.
- A command may need adaptation after inspecting the project's actual scripts, lockfiles, version pins, CI workflow, and target platform.
- A successful compile is not gameplay acceptance. Complex game-engine work needs staged vertical slices, asset/import checks, target-device profiling, deterministic tests where possible, and visual/gameplay acceptance.
- Complex statistics require domain validation: unit/known-answer tests, dataset provenance, assumptions, confidence intervals or uncertainty analysis where appropriate, and independent review of numerical results.

## Next capability gates

1. Wire the report into the agent workflow before planning or editing; agents should inspect manifests and CI scripts before proposing execution.
2. Add content-aware detection for engines/frameworks declared only inside manifests, without uploading or executing project code.
3. Provide a permissioned, isolated runner for actual per-language build/test commands, with time/resource limits, cancellation, exact command and exit-code evidence, and no silent host access.
4. Add representative end-to-end fixtures for scientific analysis and game-engine projects, including deliberate failures and successful retests.
5. Add language/engine-specific project templates and vertical-slice acceptance suites only after a real runner is available.

These are capability milestones, not claims that Kuro-chan can already execute all listed toolchains or generate production-scale game engines in one pass.
