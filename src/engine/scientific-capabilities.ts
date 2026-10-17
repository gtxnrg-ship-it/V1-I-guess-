/**
 * Evidence-based discovery of scientific/statistical packages from project manifests.
 * This reports dependencies found in source manifests; it does not prove installation,
 * numerical correctness, data quality, or that a workload can run on this device.
 */
export type ScientificCapabilityId =
  | "numpy" | "scipy" | "pandas" | "polars" | "statsmodels" | "scikit-learn"
  | "pytorch" | "tensorflow" | "jax" | "xgboost" | "pymc" | "sympy"
  | "tidyverse" | "data-table" | "ggplot2" | "tidymodels" | "brms" | "rstan" | "forecast" | "lme4"
  | "julia-dataframes" | "julia-distributions" | "turing" | "flux" | "jump" | "differential-equations"
  | "tfjs" | "simple-statistics" | "ml-matrix" | "danfojs"
  | "ndarray" | "nalgebra" | "linfa" | "tch" | "dbt";

export interface ScientificCapability {
  id: ScientificCapabilityId;
  label: string;
  ecosystem: string;
  focus: string;
  evidence: string[];
  validation: string;
}

type Rule = Omit<ScientificCapability, "evidence"> & { packages: string[]; manifestKinds: string[] };

const RULES: Rule[] = [
  { id: "numpy", label: "NumPy", ecosystem: "Python", packages: ["numpy"], manifestKinds: ["python"], focus: "Numerical arrays, vectorization, and scientific computing", validation: "Use known-answer tests and check dtype, shape, units, and numerical tolerances." },
  { id: "scipy", label: "SciPy", ecosystem: "Python", packages: ["scipy"], manifestKinds: ["python"], focus: "Scientific algorithms, optimization, integration, and statistics", validation: "Test edge cases, convergence, conditioning, and comparison with trusted reference results." },
  { id: "pandas", label: "pandas", ecosystem: "Python", packages: ["pandas"], manifestKinds: ["python"], focus: "Tabular data cleaning, joins, time series, and analysis", validation: "Test missing values, time zones, duplicate keys, joins, and data leakage." },
  { id: "polars", label: "Polars", ecosystem: "Python", packages: ["polars"], manifestKinds: ["python"], focus: "Columnar and lazy data processing", validation: "Compare eager/lazy results and test null handling, schema, and memory use." },
  { id: "statsmodels", label: "statsmodels", ecosystem: "Python", packages: ["statsmodels"], manifestKinds: ["python"], focus: "Statistical models, inference, diagnostics, and time series", validation: "Check model assumptions, residual diagnostics, confidence intervals, and reference datasets." },
  { id: "scikit-learn", label: "scikit-learn", ecosystem: "Python", packages: ["scikit-learn", "sklearn"], manifestKinds: ["python"], focus: "Classical machine learning, preprocessing, and model evaluation", validation: "Use leakage-safe splits, baselines, reproducible seeds, and metrics suited to the problem." },
  { id: "pytorch", label: "PyTorch", ecosystem: "Python", packages: ["torch", "pytorch"], manifestKinds: ["python"], focus: "Deep learning and tensor computation, with optional GPU acceleration", validation: "Check device availability, deterministic settings, gradients, checkpoints, and memory budgets." },
  { id: "tensorflow", label: "TensorFlow", ecosystem: "Python", packages: ["tensorflow", "tensorflow-cpu"], manifestKinds: ["python"], focus: "Deep learning and tensor computation", validation: "Verify the installed build/device, model input shapes, checkpoints, and numerical tolerances." },
  { id: "jax", label: "JAX", ecosystem: "Python", packages: ["jax", "jaxlib"], manifestKinds: ["python"], focus: "Accelerated numerical computing, autodiff, and compilation", validation: "Test eager/JIT equivalence, precision, device placement, and compilation/memory costs." },
  { id: "xgboost", label: "XGBoost", ecosystem: "Python", packages: ["xgboost"], manifestKinds: ["python"], focus: "Gradient-boosted decision trees", validation: "Check leakage-safe evaluation, feature handling, reproducibility, and class imbalance." },
  { id: "pymc", label: "PyMC", ecosystem: "Python", packages: ["pymc", "pymc3"], manifestKinds: ["python"], focus: "Bayesian probabilistic modeling", validation: "Inspect convergence diagnostics, effective sample sizes, priors, posterior predictive checks, and sensitivity." },
  { id: "sympy", label: "SymPy", ecosystem: "Python", packages: ["sympy"], manifestKinds: ["python"], focus: "Symbolic mathematics and algebra", validation: "Compare symbolic expressions against numeric substitutions and test domain assumptions." },
  { id: "tidyverse", label: "tidyverse", ecosystem: "R", packages: ["tidyverse"], manifestKinds: ["r"], focus: "Integrated data wrangling, visualization, and analysis", validation: "Test transformations on small known datasets and make missing-value behavior explicit." },
  { id: "data-table", label: "data.table", ecosystem: "R", packages: ["data.table"], manifestKinds: ["r"], focus: "High-performance tabular data processing", validation: "Check join keys, by-reference mutation, missing values, and output equivalence." },
  { id: "ggplot2", label: "ggplot2", ecosystem: "R", packages: ["ggplot2"], manifestKinds: ["r"], focus: "Statistical graphics and data visualization", validation: "Validate the underlying aggregation and scale/axis choices, not just the rendered chart." },
  { id: "tidymodels", label: "tidymodels", ecosystem: "R", packages: ["tidymodels"], manifestKinds: ["r"], focus: "Modeling workflows, resampling, and tuning", validation: "Use leakage-safe resampling, baselines, appropriate metrics, and reproducible seeds." },
  { id: "brms", label: "brms", ecosystem: "R", packages: ["brms"], manifestKinds: ["r"], focus: "Bayesian regression models using Stan", validation: "Check prior sensitivity, convergence, effective sample sizes, posterior predictive checks, and compiler availability." },
  { id: "rstan", label: "rstan", ecosystem: "R", packages: ["rstan"], manifestKinds: ["r"], focus: "Bayesian inference with Stan", validation: "Verify the native compiler toolchain and inspect convergence and posterior diagnostics." },
  { id: "forecast", label: "forecast", ecosystem: "R", packages: ["forecast"], manifestKinds: ["r"], focus: "Time-series forecasting", validation: "Use rolling-origin evaluation, seasonal baselines, residual checks, and horizon-aware metrics." },
  { id: "lme4", label: "lme4", ecosystem: "R", packages: ["lme4"], manifestKinds: ["r"], focus: "Linear and generalized mixed-effects models", validation: "Check model identifiability, convergence warnings, residual assumptions, and grouping structure." },
  { id: "julia-dataframes", label: "DataFrames.jl", ecosystem: "Julia", packages: ["dataframes"], manifestKinds: ["julia"], focus: "Tabular data analysis", validation: "Test joins, missing values, column types, and schema assumptions." },
  { id: "julia-distributions", label: "Distributions.jl", ecosystem: "Julia", packages: ["distributions"], manifestKinds: ["julia"], focus: "Probability distributions and statistical sampling", validation: "Check parameter constraints, moments, seeded simulation, and known distribution identities." },
  { id: "turing", label: "Turing.jl", ecosystem: "Julia", packages: ["turing"], manifestKinds: ["julia"], focus: "Probabilistic programming and Bayesian inference", validation: "Check sampler diagnostics, effective sample sizes, posterior predictive checks, and prior sensitivity." },
  { id: "flux", label: "Flux.jl", ecosystem: "Julia", packages: ["flux"], manifestKinds: ["julia"], focus: "Machine learning and differentiable models", validation: "Test gradients, training/evaluation separation, seeds, and device/memory constraints." },
  { id: "jump", label: "JuMP", ecosystem: "Julia", packages: ["jump"], manifestKinds: ["julia"], focus: "Mathematical optimization modeling", validation: "Verify solver availability, constraints, feasibility, optimality status, and known-answer problems." },
  { id: "differential-equations", label: "DifferentialEquations.jl", ecosystem: "Julia", packages: ["differentialequations"], manifestKinds: ["julia"], focus: "ODE/SDE/DAE solving and scientific simulation", validation: "Check solver choice, tolerances, stiffness, conservation properties, and reference solutions." },
  { id: "tfjs", label: "TensorFlow.js", ecosystem: "JavaScript", packages: ["@tensorflow/tfjs", "@tensorflow/tfjs-node"], manifestKinds: ["javascript"], focus: "Browser/Node tensor computation and machine learning", validation: "Verify backend availability, tensor disposal, numerical parity, and runtime performance." },
  { id: "simple-statistics", label: "simple-statistics", ecosystem: "JavaScript", packages: ["simple-statistics"], manifestKinds: ["javascript"], focus: "Descriptive statistics and common statistical routines", validation: "Test routines against known-answer fixtures and define behavior for empty/small samples." },
  { id: "ml-matrix", label: "ml-matrix", ecosystem: "JavaScript", packages: ["ml-matrix"], manifestKinds: ["javascript"], focus: "Matrix operations and numerical linear algebra", validation: "Test matrix dimensions, singular/ill-conditioned cases, and tolerance-based comparisons." },
  { id: "danfojs", label: "Danfo.js", ecosystem: "JavaScript", packages: ["danfojs-node", "danfojs"], manifestKinds: ["javascript"], focus: "DataFrame operations and tabular analysis", validation: "Test nulls, type coercion, joins, and equivalence with a small reference dataset." },
  { id: "ndarray", label: "ndarray", ecosystem: "Rust", packages: ["ndarray"], manifestKinds: ["rust"], focus: "N-dimensional arrays and numerical computing", validation: "Test dimensions, indexing, numeric precision, and known-answer results." },
  { id: "nalgebra", label: "nalgebra", ecosystem: "Rust", packages: ["nalgebra"], manifestKinds: ["rust"], focus: "Linear algebra and geometric computation", validation: "Test matrix dimensions, conditioning, coordinate conventions, and numerical tolerances." },
  { id: "linfa", label: "Linfa", ecosystem: "Rust", packages: ["linfa"], manifestKinds: ["rust"], focus: "Machine-learning algorithms in Rust", validation: "Use leakage-safe splits, reproducible seeds, baseline metrics, and known datasets." },
  { id: "tch", label: "tch-rs", ecosystem: "Rust", packages: ["tch"], manifestKinds: ["rust"], focus: "Tensor operations and PyTorch bindings", validation: "Verify libtorch compatibility, native dependencies, device support, and memory use." },
  { id: "dbt", label: "dbt", ecosystem: "SQL / analytics", packages: ["dbt-core", "dbt"], manifestKinds: ["python"], focus: "Versioned analytics transformations and data tests", validation: "Confirm the target adapter/database, test constraints, source freshness, and data contracts." },
];

const normalizeName = (value: string) => value.toLowerCase().replace(/[-_.]+/g, "-");
const basename = (path: string) => path.replace(/\\/g, "/").split("/").pop() || path;

function addNames(target: Map<string, Set<string>>, ecosystem: string, path: string, names: Iterable<string>) {
  let found = target.get(ecosystem);
  if (!found) { found = new Set<string>(); target.set(ecosystem, found); }
  for (const name of names) found.add(normalizeName(name));
}

function parsePackageJson(content: string): string[] {
  try {
    const pkg = JSON.parse(content);
    return ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"].flatMap((key) =>
      Object.keys(pkg[key] && typeof pkg[key] === "object" ? pkg[key] : {}));
  } catch { return []; }
}

function parseRDescription(content: string): string[] {
  const lines = content.split(/\\r?\\n/);
  const names: string[] = [];
  let active = false;
  for (const line of lines) {
    if (/^(Imports|Suggests|Depends|LinkingTo|Enhances):/.test(line)) {
      active = true;
      names.push(...line.slice(line.indexOf(":") + 1).split(",").map((x) => x.trim().split(/\\s*\\(/)[0]).filter(Boolean));
    } else if (/^\\S[^:]*:/.test(line)) active = false;
    else if (active && /^\\s+/.test(line)) names.push(...line.trim().split(",").map((x) => x.trim().split(/\\s*\\(/)[0]).filter(Boolean));
  }
  return names;
}

function parseManifestNames(path: string, content: string): { ecosystem: string; names: string[] } | null {
  const file = basename(path).toLowerCase();
  if (file === "package.json") return { ecosystem: "javascript", names: parsePackageJson(content) };
  if (file === "renv.lock") {
    try { return { ecosystem: "r", names: Object.keys(JSON.parse(content).Packages || {}) }; } catch { return null; }
  }
  if (file === "description") return { ecosystem: "r", names: parseRDescription(content) };
  if (file === "project.toml" || file === "manifest.toml") {
    const juliaNames = [...content.matchAll(/^\\s*\\[\\[deps\\.([^\\]]+)\\]\\]/gm)].map((m) => m[1]);
    const sectionNames: string[] = [];
    let inDeps = false;
    for (const line of content.split(/\\r?\\n/)) {
      const section = line.match(/^\\s*\\[([^\\]]+)\\]\\s*$/);
      if (section) { inDeps = /^(deps|weakdeps|extras)$/.test(section[1].trim()); continue; }
      if (inDeps) { const match = line.match(/^\\s*([A-Za-z][A-Za-z0-9_]*)\\s*=/); if (match) sectionNames.push(match[1]); }
    }
    return { ecosystem: "julia", names: [...juliaNames, ...sectionNames] };
  }
  if (file === "cargo.toml") {
    const names: string[] = [];
    let inDependencySection = false;
    for (const line of content.split(/\\r?\\n/)) {
      const section = line.match(/^\\s*\\[([^\\]]+)\\]\\s*$/);
      if (section) { inDependencySection = /(?:^|\\.)dependencies$/.test(section[1].trim()) || /^(dev-dependencies|build-dependencies)$/.test(section[1].trim()); continue; }
      if (inDependencySection) { const match = line.match(/^\\s*([A-Za-z0-9_-]+)\\s*=/); if (match) names.push(match[1]); }
    }
    return { ecosystem: "rust", names };
  }
  if (["requirements.txt", "requirements-dev.txt", "pyproject.toml", "pipfile", "poetry.lock", "uv.lock", "environment.yml", "environment.yaml"].includes(file) || /requirements[^/]*\\.txt$/.test(file)) {
    const names: string[] = [];
    for (const line of content.split(/\\r?\\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("-")) continue;
      if (/^(name|version|python|channels|dependencies):/.test(trimmed)) continue;
      const poetry = trimmed.match(/^name\\s*=\\s*["']([^"']+)["']/);
      if (poetry && ["poetry.lock", "uv.lock"].includes(file)) { names.push(poetry[1]); continue; }
      const match = trimmed.match(/^["']?([A-Za-z][A-Za-z0-9_.-]*)["']?\\s*(?:\\[[^\\]]+\\])?\\s*(?:===|==|>=|<=|~=|!=|>|<|=|;|$)/);
      if (match) names.push(match[1]);
      else {
        const yaml = trimmed.match(/^-\\s*([A-Za-z][A-Za-z0-9_.-]*)\\s*(?:=|$)/);
        if (yaml) names.push(yaml[1]);
      }
    }
    return { ecosystem: "python", names };
  }
  return null;
}

export function detectScientificCapabilities(paths: Iterable<string>, fileContents: Record<string, string>): ScientificCapability[] {
  const fileSet = new Set([...paths].map((path) => path.replace(/\\\\/g, "/")));
  const packages = new Map<string, Set<string>>();
  const evidenceByEcosystem = new Map<string, Map<string, string[]>>();
  for (const [path, content] of Object.entries(fileContents)) {
    const parsed = parseManifestNames(path, content);
    if (!parsed) continue;
    addNames(packages, parsed.ecosystem, path, parsed.names);
    const names = new Set(parsed.names.map(normalizeName));
    let evidence = evidenceByEcosystem.get(parsed.ecosystem);
    if (!evidence) { evidence = new Map(); evidenceByEcosystem.set(parsed.ecosystem, evidence); }
    for (const name of names) {
      const existing = evidence.get(name) || [];
      existing.push(path);
      evidence.set(name, existing);
    }
  }
  const results: ScientificCapability[] = [];
  for (const rule of RULES) {
    const ecosystemPackages = packages.get(rule.manifestKinds[0]);
    if (!ecosystemPackages) continue;
    const matches = rule.packages.filter((name) => ecosystemPackages.has(normalizeName(name)));
    if (!matches.length) continue;
    const evidence = matches.flatMap((name) => (evidenceByEcosystem.get(rule.manifestKinds[0])?.get(normalizeName(name)) || []).map((path) => `${path}: ${name}`));
    results.push({ id: rule.id, label: rule.label, ecosystem: rule.ecosystem, focus: rule.focus, evidence: [...new Set(evidence)], validation: rule.validation });
  }
  if (fileSet.has("dbt_project.yml") || fileSet.has("dbt_project.yaml")) {
    if (!results.some((item) => item.id === "dbt")) results.push({ id: "dbt", label: "dbt", ecosystem: "SQL / analytics", focus: "Versioned analytics transformations and data tests", evidence: ["dbt_project.yml project marker"], validation: "Confirm the target adapter/database, test constraints, source freshness, and data contracts." });
  }
  return results;
}
