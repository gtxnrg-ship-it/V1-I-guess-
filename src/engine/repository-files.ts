/** Read-only access to a linked GitHub repository for an agent's on-demand investigation. */
export interface RepositoryFileClient {
  req(method: string, path: string, body?: unknown): Promise<{ status: number; json: any }>;
}
export interface RepositoryFileResult { result: string; stat?: string; sources?: { title: string; url: string }[] }
function parseRepo(input: string): { owner: string; name: string; fullName: string } {
  const clean = input.trim().replace(/^https?:\/\/github\.com\//i, "").replace(/\.git$/i, "").replace(/\/$/, "");
  const parts = clean.split("/");
  if (parts.length !== 2 || !parts.every((part) => /^[a-zA-Z0-9_.-]+$/.test(part))) throw new Error("The linked repository must be owner/repository.");
  return { owner: parts[0], name: parts[1], fullName: parts.join("/") };
}
function cleanBranch(input: unknown): string | undefined {
  if (input === undefined || input === null || String(input).trim() === "") return undefined;
  const branch = String(input).trim();
  if (branch.length > 255 || branch.startsWith("-") || branch.includes("..") || /[\u0000-\u001f~^:?*\[\]\\]/.test(branch)) {
    throw new Error("Enter a valid Git branch, tag, or commit ref.");
  }
  return branch;
}
function sourceBranch(ref?: string): string { return ref ? ref.split("/").map(encodeURIComponent).join("/") : "HEAD"; }
function decodeBase64(value: string): string {
  const binary = atob(value.replace(/\s/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}
function cleanPath(input: unknown): string {
  const value = String(input ?? "").trim().replace(/\\/g, "/").replace(/^\.\//, "");
  if (!value || value.startsWith("/") || value.split("/").some((part) => !part || part === "." || part === "..") || value.includes("\0")) {
    throw new Error("Enter a repository-relative file path without '..' segments.");
  }
  return value;
}
function encodePath(path: string): string { return path.split("/").map(encodeURIComponent).join("/"); }
const TEXT_FILE = /\.(?:ts|tsx|js|jsx|mjs|cjs|json|md|mdx|html|css|scss|vue|svelte|py|go|rs|toml|ya?ml|xml|gradle|kts|java|kt|swift|sh|sql|graphql|prisma|txt|properties|example|env\.example)$/i;
const EXCLUDED_PATH = /(^|\/)(?:node_modules|vendor|dist|build|coverage|\.git|\.next|\.expo|Pods)(\/|$)|(^|\/)(?:\.env(?:\.|$)|.*(?:secret|credential|private[-_]?key).*)|\.(?:lock|png|jpe?g|gif|webp|ico|pdf|zip|gz|woff2?|ttf|otf|mp[34]|sqlite|db|apk|jar|wasm)$/i;
function pathScore(path: string, terms: string[]): number {
  const lower = path.toLowerCase();
  let score = 0;
  if (/readme|architecture|contributing|agents\.md/i.test(lower)) score += 20;
  if (/\.(?:ts|tsx|js|jsx|py|go|rs|java|kt)$/i.test(lower)) score += 10;
  if (/test|spec|fixture|mock/i.test(lower)) score -= 3;
  for (const term of terms) if (term.length > 1 && lower.includes(term)) score += 5;
  return score;
}

/** Read a real file body from the linked repo's default branch or an explicit ref. Never falls back to guesses. */
export async function readRepositoryFile(client: RepositoryFileClient, input: string, pathInput: unknown, branchInput?: unknown): Promise<RepositoryFileResult> {
  const repo = parseRepo(input), path = cleanPath(pathInput), branch = cleanBranch(branchInput);
  const refQuery = branch ? `?ref=${encodeURIComponent(branch)}` : "";
  const response = await client.req("GET", `/repos/${repo.owner}/${repo.name}/contents/${encodePath(path)}${refQuery}`);
  if (response.status === 404) return { result: `GitHub could not find ${repo.fullName}/${path} on ${branch ? `ref "${branch}"` : "its default branch"}, or this account cannot read it. No file contents were inferred.` };
  if (response.status >= 300) throw new Error(`GitHub could not read ${path} (HTTP ${response.status}): ${response.json?.message || "request failed"}`);
  if (Array.isArray(response.json)) {
    const names = response.json.slice(0, 100).map((item: any) => `${item.type === "dir" ? "[dir]" : "[file]"} ${item.path}`).join("\n");
    return { result: `${repo.fullName}/${path} is a directory, not a file. Entries:\n${names || "(empty directory)"}`, stat: `${response.json.length} entries returned` };
  }
  if (response.json?.type !== "file" || response.json?.encoding !== "base64" || typeof response.json?.content !== "string") {
    return { result: `GitHub did not return a readable text file for ${path} (type: ${String(response.json?.type || "unknown")}, encoding: ${String(response.json?.encoding || "unknown")}).` };
  }
  const body = decodeBase64(response.json.content);
  const clipped = body.length > 24000 ? body.slice(0, 24000) + `\n…[truncated ${body.length - 24000} characters; read a narrower file or use a focused search]` : body;
  return { result: `Repository: ${repo.fullName} (${branch ? `ref: ${branch}` : "default branch"})\nFile: ${path}\nActual contents fetched from GitHub:\n\n${clipped}`, stat: `${body.split("\n").length} lines`, sources: [{ title: `${repo.fullName}/${path}${branch ? ` @ ${branch}` : ""}`, url: `https://github.com/${repo.fullName}/blob/${sourceBranch(branch)}/${encodePath(path)}` }] };
}

/**
 * Bounded fallback used when GitHub's indexed code-search API is forbidden/unavailable.
 * It scans a small, prioritized sample of text blobs and explicitly reports partial coverage.
 */
async function searchRepositoryTree(client: RepositoryFileClient, repo: ReturnType<typeof parseRepo>, query: string): Promise<RepositoryFileResult> {
  const meta = await client.req("GET", `/repos/${repo.owner}/${repo.name}`);
  if (meta.status >= 300) return { result: `GitHub code search was unavailable and repository metadata could not be read (HTTP ${meta.status}). No fallback search was performed.` };
  const branch = String(meta.json?.default_branch || "main");
  const treeResponse = await client.req("GET", `/repos/${repo.owner}/${repo.name}/git/trees/${encodeURIComponent(branch)}?recursive=1`);
  if (treeResponse.status >= 300 || !Array.isArray(treeResponse.json?.tree)) {
    return { result: `GitHub code search was unavailable and the repository tree could not be read (HTTP ${treeResponse.status}). No search results were fabricated.` };
  }
  const tree = treeResponse.json.tree as Array<{ type?: string; path?: string; sha?: string; size?: number }>;
  const complete = treeResponse.json.truncated === false;
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const candidates = tree.filter((item) => item.type === "blob" && typeof item.path === "string" && typeof item.sha === "string"
      && !EXCLUDED_PATH.test(item.path) && TEXT_FILE.test(item.path) && (item.size === undefined || item.size <= 100_000))
    .sort((a, b) => pathScore(b.path!, terms) - pathScore(a.path!, terms) || a.path!.localeCompare(b.path!));
  const selected = candidates.slice(0, 80);
  const matches: { path: string; line: number; snippet: string }[] = [];
  let scanned = 0, bytes = 0, failed = 0;
  const lowerQuery = query.toLowerCase();
  for (let offset = 0; offset < selected.length; offset += 8) {
    const batch = await Promise.all(selected.slice(offset, offset + 8).map(async (item) => {
      try {
        const response = await client.req("GET", `/repos/${repo.owner}/${repo.name}/git/blobs/${item.sha}`);
        if (response.status >= 300 || response.json?.encoding !== "base64" || typeof response.json?.content !== "string") return null;
        const text = decodeBase64(response.json.content);
        return { path: item.path!, text };
      } catch { return null; }
    }));
    for (const item of batch) {
      if (!item) { failed++; continue; }
      scanned++; bytes += item.text.length;
      const lines = item.text.split("\n");
      for (let i = 0; i < lines.length && matches.length < 20; i++) {
        const line = lines[i];
        const lower = line.toLowerCase();
        if (lower.includes(lowerQuery) || (terms.length > 1 && terms.every((term) => lower.includes(term)))) {
          matches.push({ path: item.path, line: i + 1, snippet: line.trim().slice(0, 220) });
        }
      }
      if (matches.length >= 20) break;
    }
    if (matches.length >= 20) break;
  }
  const resultLines = matches.map((match, index) => `${index + 1}. ${match.path}:${match.line}\n   ${match.snippet}`);
  const coverage = `Fallback scanned ${scanned} of ${candidates.length} eligible text files (${Math.round(scanned / Math.max(candidates.length, 1) * 100)}% of eligible files); ${failed} files could not be read. Tree ${complete ? "was complete" : "was truncated or completeness was unknown"}; at most 80 prioritized files are considered. This is not an exhaustive repository search.`;
  return {
    result: `GitHub indexed code search was unavailable, so Kuro-chan performed a bounded read-only fallback.\nQuery: ${query}\nRepository: ${repo.fullName}\n${coverage}\n${resultLines.join("\n") || "No matches were found in the scanned sample."}`,
    stat: `${matches.length} matches · ${scanned} files scanned · ~${bytes} characters read`,
    sources: matches.slice(0, 20).map((match) => ({ title: `${repo.fullName}/${match.path}:${match.line}`, url: `https://github.com/${repo.fullName}/blob/HEAD/${encodePath(match.path)}#L${match.line}` })),
  };
}

/** Search GitHub's authenticated code index; fall back to a bounded tree scan when unavailable. */
export async function searchRepositoryCode(client: RepositoryFileClient, input: string, queryInput: unknown): Promise<RepositoryFileResult> {
  const repo = parseRepo(input), query = String(queryInput ?? "").trim().slice(0, 160);
  if (query.length < 2) return { result: "Enter at least two characters to search repository code." };
  const path = `/search/code?q=${encodeURIComponent(query + " repo:" + repo.fullName)}&per_page=10`;
  const response = await client.req("GET", path);
  if (response.status === 401 || response.status === 403) return searchRepositoryTree(client, repo, query);
  if (response.status >= 300) throw new Error(`GitHub code search failed (HTTP ${response.status}): ${response.json?.message || "request failed"}`);
  const items = Array.isArray(response.json?.items) ? response.json.items : [];
  const lines = items.map((item: any, index: number) => `${index + 1}. ${item.path || "(unknown path)"}\n   ${item.html_url || ""}${item.text_matches?.[0]?.fragment ? `\n   ${String(item.text_matches[0].fragment).slice(0, 240)}` : ""}`).join("\n");
  return { result: lines || `No code matches for "${query}" were returned by GitHub for ${repo.fullName}. Try a distinctive symbol or phrase.`, stat: `${items.length} matches`, sources: items.slice(0, 10).filter((item: any) => item.html_url).map((item: any) => ({ title: item.path || item.name || "Repository match", url: item.html_url })) };
}
