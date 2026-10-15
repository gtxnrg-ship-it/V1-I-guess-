/** Package names imported anywhere in a project, for dependency sync before publishing. */
function stripComments(source: string): string {
  let out = ""; let quote = 0; let escaped = false;
  for (let i = 0; i < source.length; i++) {
    const ch = source.charCodeAt(i), next = source.charCodeAt(i + 1);
    if (quote) { out += source[i]; if (escaped) escaped = false; else if (ch === 92) escaped = true; else if (ch === quote) quote = 0; continue; }
    if (ch === 39 || ch === 34 || ch === 96) { quote = ch; out += source[i]; continue; }
    if (ch === 47 && next === 47) { while (i < source.length && source[i] !== "\n") { out += " "; i++; } if (i < source.length) out += "\n"; continue; }
    if (ch === 47 && next === 42) { out += "  "; i += 2; while (i < source.length && !(source.charCodeAt(i) === 42 && source.charCodeAt(i + 1) === 47)) { out += source[i] === "\n" ? "\n" : " "; i++; } if (i < source.length) { out += "  "; i++; } continue; }
    out += source[i];
  }
  return out;
}

export function importedPackages(files: Record<string, string>): string[] {
  const set = new Set<string>();
  for (const [p, c] of Object.entries(files)) {
    if (!/\.(t|j)sx?$/.test(p)) continue;
    const clean = stripComments(c);
    for (const m of clean.matchAll(/(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g)) {
      const s = m[1] || m[2] || m[3];
      if (!s || s.startsWith(".") || s.startsWith("/") || s.startsWith("@/") || /^https?:/.test(s)) continue;
      set.add(s.startsWith("@") ? s.split("/").slice(0, 2).join("/") : s.split("/")[0]);
    }
  }
  return [...set];
}
