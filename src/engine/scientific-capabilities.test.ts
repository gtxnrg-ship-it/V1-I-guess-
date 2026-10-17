import assert from "node:assert/strict";
import { detectScientificCapabilities } from "./scientific-capabilities";

const python = detectScientificCapabilities(
  ["requirements.txt", "pyproject.toml", "src/analysis.py"],
  {
    "requirements.txt": "numpy>=1.26\npandas==2.2.0\nscikit-learn[extra]>=1.4\n# torch is intentionally not installed here\n",
    "pyproject.toml": "[project]\nname = 'example'\n",
  },
);
assert(python.some((item) => item.id === "numpy" && item.evidence.some((e) => e.includes("requirements.txt"))), "NumPy should be detected from requirements.txt");
assert(python.some((item) => item.id === "pandas"), "pandas should be detected from requirements.txt");
assert(python.some((item) => item.id === "scikit-learn"), "extras and version specifiers should be parsed");
assert(!python.some((item) => item.id === "pytorch"), "comments must not be interpreted as installed dependencies");
assert(python.every((item) => item.validation.length > 0), "every scientific stack should include validation guidance");

const r = detectScientificCapabilities(
  ["renv.lock", "DESCRIPTION"],
  {
    "renv.lock": JSON.stringify({ R: { Version: "4.3.0" }, Packages: { brms: { Package: "brms" }, ggplot2: { Package: "ggplot2" } } }),
    "DESCRIPTION": "Package: example\nImports:\n    data.table,\n    forecast\nSuggests: testthat\n",
  },
);
assert(r.some((item) => item.id === "brms" && item.ecosystem === "R"), "renv.lock should identify Bayesian R projects");
assert(r.some((item) => item.id === "ggplot2"), "renv.lock should identify plotting dependencies");
assert(r.some((item) => item.id === "data-table"), "DESCRIPTION multiline Imports should be parsed");
assert(r.some((item) => item.id === "forecast"), "DESCRIPTION should identify time-series dependencies");

const julia = detectScientificCapabilities(
  ["Project.toml", "Manifest.toml"],
  {
    "Project.toml": '[deps]\nDataFrames = "a93c6f00-e57d-5684-b7b6-d8193f3e46c0"\nTuring = "fce5fe82-541a-59a6-adf8-730c64b5f9a0"',
    "Manifest.toml": '[[deps.Distributions]]\nuuid = "31c24e10-a181-5473-b8eb-7969acd0382f"',
  },
);
assert(julia.some((item) => item.id === "julia-dataframes"), "Julia Project.toml deps should be recognized");
assert(julia.some((item) => item.id === "turing"), "Julia Project.toml Bayesian dependencies should be recognized");
assert(julia.some((item) => item.id === "julia-distributions"), "Julia Manifest.toml entries should be recognized");

const polyglot = detectScientificCapabilities(
  ["package.json", "Cargo.toml", "environment.yml", "dbt_project.yml"],
  {
    "package.json": JSON.stringify({ dependencies: { "@tensorflow/tfjs": "^4.0.0", "ml-matrix": "^6.0.0" } }),
    "Cargo.toml": "[dependencies]\nndarray = \"0.15\"\npolars = \"0.40\"",
    "environment.yml": "name: stats\nchannels:\n  - conda-forge\ndependencies:\n  - python=3.12\n  - scipy=1.13",
  },
);
assert(polyglot.some((item) => item.id === "tfjs"), "package.json should detect TensorFlow.js");
assert(polyglot.some((item) => item.id === "ml-matrix"), "package.json should detect matrix math");
assert(polyglot.some((item) => item.id === "ndarray"), "Cargo.toml should detect Rust numerical arrays");
assert(polyglot.some((item) => item.id === "scipy"), "Conda environment files should detect scientific packages");
assert(polyglot.some((item) => item.id === "dbt"), "dbt project marker should be detected even without a package manifest");

const empty = detectScientificCapabilities(["src/main.py", "README.md"], {});
assert(empty.length === 0, "source file names alone must not imply scientific packages are installed");
console.log("Scientific/statistical capability detection tests passed");
