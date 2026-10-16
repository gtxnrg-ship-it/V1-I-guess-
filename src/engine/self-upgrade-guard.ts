/**
 * Fail-closed preflight for self-modifications. These checks are a safety net,
 * not a substitute for reviewing the diff and passing CI.
 */
export function validateSelfUpgrade(files: Record<string, string | null>): string[] {
  const problems: string[] = [];
  const entries = Object.entries(files);
  if (!entries.length) return ["No files were supplied for this upgrade."];
  if (entries.length > 40) problems.push("An upgrade may change at most 40 files at once.");

  const secretPatterns = [
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    /\bgh[pousr]_[A-Za-z0-9]{20,}\b/,
    /\bgithub_pat_[A-Za-z0-9_]{20,}\b/,
    /\bsk-[A-Za-z0-9_-]{20,}\b/,
    /\bAKIA[0-9A-Z]{16}\b/,
  ];
  for (const [path, content] of entries) {
    const normalized = path.replace(/\\/g, "/");
    if (!normalized || normalized.startsWith("/") || normalized.split("/").some((part) => part === "..")) {
      problems.push(`Unsafe path: ${path}`);
      continue;
    }
    if (/^(?:\.env(?:\.|$)|.*\/(?:\.env(?:\.|$)))/i.test(normalized) && !/(?:\.example|\.sample|\.template)$/i.test(normalized)) {
      problems.push(`Refusing to modify a real environment file: ${path}`);
    }
    if (content !== null) {
      for (const pattern of secretPatterns) {
        if (pattern.test(content)) {
          problems.push(`Possible secret detected in ${path}; remove credentials before shipping.`);
          break;
        }
      }
    }
  }
  return [...new Set(problems)];
}
