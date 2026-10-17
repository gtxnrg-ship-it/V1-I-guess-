# Language and game-engine capability detection

This capability inventory is evidence-based and deliberately separate from execution. The `inspect_project_capabilities` agent tool reads the current workspace file inventory and reports the languages, likely game-engine families, toolchain prerequisites, and candidate build/test commands supported by repository markers.

## Language coverage

The detector currently recognizes TypeScript, JavaScript, Python, C, C++, Rust, Go, Java, Kotlin, C#, Swift, Dart, Ruby, PHP, R, Julia, Lua, Scala, Elixir, Erlang, Haskell, Perl, SQL, Bash/shell, PowerShell, and Solidity.

This includes foundations relevant to complex statistical and scientific work: Python, R, Julia, SQL, and polyglot repositories can be identified with candidate checks. Recognition is not the same as a complete scientific-computing runtime: dependencies, datasets, GPU libraries, databases, notebooks, numerical correctness, reproducibility, and performance still need project-specific setup and tests.

## Game-engine coverage

Recognized engine markers include Unity, Unreal Engine, Godot, Bevy (detected from its Cargo.toml dependency declaration), Phaser, Three.js, Babylon.js, Defold, LÖVE, and PlayCanvas.

The report includes candidate commands and notes where a build depends on a particular editor/runtime, platform target, export template, target name, cloud editor, or licensed installation. Generic files such as `Cargo.toml` are not enough to infer Bevy; the manifest dependency must be present. Engine detection based on filenames/configuration is necessarily incomplete for projects that declare their engine only inside a package manifest or source code.

## Scientific and statistical stack evidence

The capability inspector also checks supported project manifests for scientific/statistical dependencies, including:

- **Python:** NumPy, SciPy, pandas, Polars, statsmodels, scikit-learn, PyTorch, TensorFlow, JAX, XGBoost, PyMC, and SymPy.
- **R:** tidyverse, data.table, ggplot2, tidymodels, brms, rstan, forecast, and lme4.
- **Julia:** DataFrames.jl, Distributions.jl, Turing.jl, Flux.jl, JuMP, and DifferentialEquations.jl.
- **JavaScript:** TensorFlow.js, simple-statistics, ml-matrix, and Danfo.js.
- **Rust:** ndarray, nalgebra, Linfa, and tch-rs.
- **Data pipelines:** dbt project markers and dbt package evidence.

Results include the manifest/path evidence, the likely purpose of the dependency, and a suggested validation concern. Detection is dependency evidence only: a manifest may be stale, optional, or describe a package that is not installed. It does not inspect arbitrary source semantics, download data/models, confirm GPU availability, run numerical workloads, or validate scientific conclusions. Those require a real runner and known-answer/project-specific acceptance tests.

## Project-specific execution evidence

The capability report now inspects project files for concrete execution-planning evidence:

- Declared `package.json` scripts and their exact command strings, including custom test and E2E scripts.
- Package manager declaration and available lockfiles, with explicit ambiguity preserved when signals conflict.
- Runtime/toolchain constraints from supported files such as `.nvmrc`, `.node-version`, `.python-version`, `pyproject.toml`, `rust-toolchain.toml`, `global.json`, `go.mod`, `.tool-versions`, Unity's `ProjectVersion.txt`, and `Package.swift`.

This helps agents select the project's actual scripts and respect version pins instead of guessing generic commands. These values are reported as **declared evidence only**. Kuro-chan does not run those scripts, install dependencies, or confirm the pinned runtime is available merely by inspecting a manifest. Conflicting lockfiles are reported rather than silently choosing one.

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
