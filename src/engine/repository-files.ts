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

/** Fetch a real file body from the linked repo's default branch. Never falls back to guesses. */
export async function readRepositoryFile(client: RepositoryFileClient, input: string, pathInput: unknown): Promise<RepositoryFileResult> {
  const repo = parseRepo(input), path = cleanPath(pathInput);
  const response = await client.req("GET", `/repos/${repo.owner}/${repo.name}/contents/${encodePath(path)}`);
  if (response.status === 404) return { result: `GitHub could not find ${repo.fullName}/${path} on its default branch, or this account cannot read it. No file contents were inferred.` };
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
  return { result: `Repository: ${repo.fullName} (default branch)\nFile: ${path}\nActual contents fetched from GitHub:\n\n${clipped}`, stat: `${body.split("\n").length} lines`, sources: [{ title: `${repo.fullName}/${path}`, url: `https://github.com/${repo.fullName}/blob/HEAD/${encodePath(path)}` }] };
}

/** Search GitHub's authenticated code index; a failed/forbidden search is reported honestly. */
export async function searchRepositoryCode(client: RepositoryFileClient, input: string, queryInput: unknown): Promise<RepositoryFileResult> {
  const repo = parseRepo(input), query = String(queryInput ?? "").trim().slice(0, 160);
  if (query.length < 2) return { result: "Enter at least two characters to search repository code." };
  const path = `/search/code?q=${encodeURIComponent(query + " repo:" + repo.fullName)}&per_page=10`;
  const response = await client.req("GET", path);
  if (response.status === 401 || response.status === 403) {
    return { result: `GitHub code search is unavailable for this connection (HTTP ${response.status}). Check that the GitHub app/token has repository contents and code-search access. No search results were fabricated.` };
  }
  if (response.status >= 300) throw new Error(`GitHub code search failed (HTTP ${response.status}): ${response.json?.message || "request failed"}`);
  const items = Array.isArray(response.json?.items) ? response.json.items : [];
  const lines = items.map((item: any, index: number) => `${index + 1}. ${item.path || "(unknown path)"}\n   ${item.html_url || ""}${item.text_matches?.[0]?.fragment ? `\n   ${String(item.text_matches[0].fragment).slice(0, 240)}` : ""}`).join("\n");
  return { result: lines || `No code matches for "${query}" were returned by GitHub for ${repo.fullName}. Try a distinctive symbol or phrase.`, stat: `${items.length} matches`, sources: items.slice(0, 10).filter((item: any) => item.html_url).map((item: any) => ({ title: item.path || item.name || "Repository match", url: item.html_url })) };
}
