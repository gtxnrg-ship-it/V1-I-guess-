export interface CredentialFinding {
  path: string;
  line: number;
  kind: string;
}

interface CredentialRule {
  kind: string;
  pattern: RegExp;
}

const PLACEHOLDER = /(?:example|fake|dummy|placeholder|redacted|not[-_ ]?real|replace[-_ ]?me|your[-_ ]|change[-_ ]?me|test[-_ ]?key)/i;

// Match recognizable credential formats, not arbitrary long strings. Values are never returned.
const RULES: CredentialRule[] = [
  { kind: "OpenAI-compatible API key", pattern: /\bsk-(?:(?:proj|svcacct|ant|or-v1|live)-)?[A-Za-z0-9_-]{24,}\b/g },
  { kind: "Google API key", pattern: /\bAIza[0-9A-Za-z_-]{30,}\b/g },
  { kind: "GitHub token", pattern: /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})\b/g },
  { kind: "Hugging Face token", pattern: /\bhf_[A-Za-z0-9]{30,}\b/g },
  { kind: "Tavily API key", pattern: /\btvly-[A-Za-z0-9_-]{24,}\b/g },
  { kind: "Jina API key", pattern: /\bjina_[A-Za-z0-9_-]{24,}\b/g },
  { kind: "xAI API key", pattern: /\bxai-[A-Za-z0-9_-]{24,}\b/g },
  { kind: "NVIDIA API key", pattern: /\bnvapi-[A-Za-z0-9_-]{24,}\b/g },
  { kind: "AWS access key ID", pattern: /\bAKIA[0-9A-Z]{16}\b/g },
  { kind: "Slack token", pattern: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/g },
  { kind: "JWT-like token", pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g },
  { kind: "private key", pattern: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/g },
  { kind: "hard-coded secret assignment", pattern: /\b(?:api[_-]?key|access[_-]?token|client[_-]?secret|secret[_-]?key|password)\b\s*[:=]\s*["'`]([^"'`\s]{24,})["'`]/ig },
];

export function findCredentialLeaks(files: Array<{ path: string; content: string | null }>): CredentialFinding[] {
  const findings: CredentialFinding[] = [];
  for (const file of files) {
    if (file.content === null) continue;
    const lines = file.content.split("\n");
    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];
      for (const rule of RULES) {
        rule.pattern.lastIndex = 0;
        const match = rule.pattern.exec(line);
        if (!match) continue;
        const candidate = match[1] || match[0];
        if (PLACEHOLDER.test(candidate)) continue;
        findings.push({ path: file.path, line: index + 1, kind: rule.kind });
        break;
      }
    }
  }
  return findings;
}

export function describeCredentialFindings(findings: CredentialFinding[]): string {
  return findings.map(({ path, line, kind }) => `${path}:${line} (${kind})`).join(", ");
}

export function credentialGuardMessage(path: string, content: string, action: "write" | "edit"): string | null {
  const findings = findCredentialLeaks([{ path, content }]);
  if (!findings.length) return null;
  return `ERROR: I blocked this ${action} because it resembles a hard-coded credential at ${describeCredentialFindings(findings)}. I did not save the file. Use an environment variable or a clearly fake placeholder instead.`;
}
