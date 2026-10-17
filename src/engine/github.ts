import { findCredentialLeaks, describeCredentialFindings } from "./secrets";

const API = "https://api.github.com";

export const b64 = (s: string) => {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
};

export const unb64 = (s: string) => {
  const bin = atob(s.replace(/\n/g, ""));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
};

export class GH {
  constructor(private token: string) {}

  async req(method: string, path: string, body?: any): Promise<{ status: number; json: any }> {
    const r = await fetch(`${API}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(45000),
    });
    const t = await r.text();
    let json: any = null;
    try { json = t ? JSON.parse(t) : null; } catch { json = t; }
    return { status: r.status, json };
  }

  async ok(method: string, path: string, body?: any) {
    const r = await this.req(method, path, body);
    if (r.status >= 300) {
      const msg = r.json?.message || JSON.stringify(r.json).slice(0, 200);
      const extra = /workflow/i.test(msg) ? " (your token needs the Workflows permission to add GitHub Actions files)" : "";
      throw new Error(`GitHub ${method} ${path} → ${r.status}: ${msg}${extra}`);
    }
    return r.json;
  }

  async me(): Promise<string> { return (await this.ok("GET", "/user")).login; }

  /** Resolve an existing repository without ever creating or initializing one. Use for import flows. */
  async getExistingRepo(spec: string) {
    let clean = spec.trim().replace("https://github.com/", "").replace("http://github.com/", "");
    if (clean.endsWith(".git")) clean = clean.slice(0, -4);
    if (clean.endsWith("/")) clean = clean.slice(0, -1);
    const parts = clean.split("/").filter(Boolean);
    if (!clean || parts.length > 2 || parts.length === 0) {
      throw new Error("Enter a repository name or a GitHub repository URL such as owner/repository. Branch, file, and extra path segments are not supported.");
    }
    const login = await this.me();
    const [owner, name] = parts.length === 2 ? parts : [login, parts[0]];
    const r = await this.req("GET", `/repos/${owner}/${name}`);
    if (r.status === 404) {
      throw new Error(`Repository ${owner}/${name} was not found or your account cannot access it. Import never creates repositories; check the name and GitHub permissions.`);
    }
    if (r.status >= 300) {
      throw new Error(`Can't access ${owner}/${name}: ${r.json?.message || `GitHub returned ${r.status}`}`);
    }
    return {
      owner,
      name,
      defaultBranch: r.json.default_branch || "main",
      htmlUrl: r.json.html_url,
      created: false,
      private: Boolean(r.json.private),
    };
  }

  async ensureRepo(spec: string, opts: { private?: boolean; description?: string } = {}) {
    const clean = spec.trim().replace(/^https?:\/\/github\.com\//, "").replace(/\.git$/, "").replace(/\/$/, "");
    const parts = clean.split("/").filter(Boolean);
    if (!clean || parts.length > 2 || parts.length === 0) {
      throw new Error("Enter a repository name or a GitHub repository URL such as owner/repository. Branch, file, and extra path segments are not supported.");
    }
    const login = await this.me();
    const [owner, name] = parts.length === 2 ? parts : [login, parts[0]];
    let r = await this.req("GET", `/repos/${owner}/${name}`);
    let created = false;
    if (r.status === 404) {
      const path = owner === login ? "/user/repos" : `/orgs/${owner}/repos`;
      r = { status: 201, json: await this.ok("POST", path, { name, private: opts.private ?? false, description: opts.description || "Built with Kuro-chan", auto_init: false }) };
      created = true;
    } else if (r.status >= 300) throw new Error(`Can't access ${owner}/${name}: ${r.json?.message}`);
    return { owner, name, defaultBranch: r.json.default_branch || "main", htmlUrl: r.json.html_url, created, private: r.json.private };
  }

  async headSha(owner: string, name: string, branch: string): Promise<string | null> {
    const r = await this.req("GET", `/repos/${owner}/${name}/git/ref/heads/${branch}`);
    return r.status === 200 ? r.json.object.sha : null;
  }

  async seedIfEmpty(owner: string, name: string, branch: string) {
    const sha = await this.headSha(owner, name, branch);
    if (sha) return sha;
    const probe = await this.req("GET", `/repos/${owner}/${name}/commits?per_page=1`);
    if (probe.status === 409 || (Array.isArray(probe.json) && probe.json.length === 0)) {
      await this.ok("PUT", `/repos/${owner}/${name}/contents/.kuro`, { message: "Initialize repository (Kuro-chan)", content: b64("Managed by Kuro-chan\n"), branch });
      return await this.headSha(owner, name, branch);
    }
    return null;
  }

  async commitFiles(owner: string, name: string, branch: string, files: { path: string; content: string | null }[], message: string, opts: { full?: boolean; fromBranch?: string } = {}) {
    const findings = findCredentialLeaks(files);
    if (findings.length) throw new Error(`Publish blocked before contacting GitHub because possible hard-coded credentials were found at ${describeCredentialFindings(findings)}. Remove the values or use environment variables/placeholders. Credential values are intentionally not shown.`);
    const parent = await this.seedIfEmpty(owner, name, opts.fromBranch || branch);
    if (!parent) throw new Error("Couldn't find a starting commit on the branch.");
    const parentCommit = await this.ok("GET", `/repos/${owner}/${name}/git/commits/${parent}`);
    // Capture the destination branch head before preparing the tree/commit. When publishing
    // from a separate source branch, guarding only the source SHA is insufficient: the target
    // branch may move while this commit is being assembled.
    const targetHeadAtStart = await this.headSha(owner, name, branch);
    if (!opts.fromBranch && targetHeadAtStart !== parent) {
      throw new Error("The repository changed while preparing this publish. Nothing was pushed. Refresh the project from GitHub and review the changes before trying again.");
    }
    const tree = await this.ok("POST", `/repos/${owner}/${name}/git/trees`, {
      ...(opts.full ? {} : { base_tree: parentCommit.tree.sha }),
      tree: files.map((f) => (f.content === null ? { path: f.path, mode: "100644", type: "blob", sha: null } : { path: f.path, mode: "100644", type: "blob", content: f.content })),
    });
    const commit = await this.ok("POST", `/repos/${owner}/${name}/git/commits`, { message, tree: tree.sha, parents: [parent] });
    const exists = await this.headSha(owner, name, branch);
    // Always guard the destination, including when the commit is based on another branch.
    // A missing destination must stay missing; an existing destination must not move.
    if (exists !== targetHeadAtStart) {
      throw new Error("The destination branch changed while preparing this publish. Nothing was pushed. Refresh the project from GitHub and review the changes before trying again.");
    }
    if (exists) await this.ok("PATCH", `/repos/${owner}/${name}/git/refs/heads/${branch}`, { sha: commit.sha, force: false });
    else await this.ok("POST", `/repos/${owner}/${name}/git/refs`, { ref: `refs/heads/${branch}`, sha: commit.sha });
    return { sha: commit.sha, url: `https://github.com/${owner}/${name}/commit/${commit.sha}` };
  }

  async readTree(owner: string, name: string, branch: string, filter: (p: string) => boolean = () => true): Promise<Record<string, string>> {
    const result = await this.readTreeBounded(owner, name, branch, filter);
    if (!result.complete) {
      throw new Error(`Repository import stopped at its safety budget (${result.files.length} files, ${result.totalBytes} bytes). Refine the import or exclude generated/vendor files before retrying; partial content was not returned as a complete repository.`);
    }
    return Object.fromEntries(result.files.map((f) => [f.path, f.content]));
  }

  /**
   * Bounded remote import for mobile clients. Caps both requests and aggregate
   * decoded content, and explicitly reports truncation instead of silently
   * presenting a partial repository as complete.
   */
  async readTreeBounded(
    owner: string,
    name: string,
    branch: string,
    filter: (p: string) => boolean = () => true,
    limits: { maxFiles?: number; maxTotalBytes?: number; maxFileBytes?: number; concurrency?: number } = {},
  ): Promise<{ files: Array<{ path: string; content: string }>; complete: boolean; totalBytes: number; skipped: number; reason?: string }> {
    const maxFiles = Math.max(1, Math.min(1000, limits.maxFiles ?? 300));
    const maxTotalBytes = Math.max(1024, Math.min(20_000_000, limits.maxTotalBytes ?? 8_000_000));
    const maxFileBytes = Math.max(1024, Math.min(1_000_000, limits.maxFileBytes ?? 200_000));
    const concurrency = Math.max(1, Math.min(8, limits.concurrency ?? 4));
    const sha = await this.headSha(owner, name, branch);
    if (!sha) return { files: [], complete: true, totalBytes: 0, skipped: 0 };
    const tree = await this.ok("GET", `/repos/${owner}/${name}/git/trees/${sha}?recursive=1`);
    const all = Array.isArray(tree.tree) ? tree.tree : [];
    const truncated = tree.truncated === true;
    const candidates = all.filter((x: any) => x.type === "blob" && filter(x.path) && !/\.(png|jpe?g|gif|webp|ico|woff2?|ttf|apk|jar|zip|wasm|pdf|mp4|mp3|mov|psd)$/i.test(x.path));
    const chosen: any[] = [];
    let plannedBytes = 0;
    let budgetHit = false;
    for (const blob of candidates) {
      const size = Number(blob.size) || 0;
      if (size > maxFileBytes || chosen.length >= maxFiles || plannedBytes + size > maxTotalBytes) {
        budgetHit = true;
        continue;
      }
      chosen.push(blob);
      plannedBytes += size;
    }
    const files: Array<{ path: string; content: string }> = [];
    let totalBytes = 0;
    for (let i = 0; i < chosen.length; i += concurrency) {
      const batch = chosen.slice(i, i + concurrency);
      const decoded = await Promise.all(batch.map(async (blob: any) => {
        const data = await this.ok("GET", `/repos/${owner}/${name}/git/blobs/${blob.sha}`);
        const content = unb64(data.content || "");
        return { path: blob.path as string, content, bytes: new TextEncoder().encode(content).byteLength };
      }));
      for (const file of decoded) {
        if (totalBytes + file.bytes > maxTotalBytes) {
          budgetHit = true;
          continue;
        }
        files.push({ path: file.path, content: file.content });
        totalBytes += file.bytes;
      }
    }
    const complete = !truncated && !budgetHit && files.length === candidates.length;
    return {
      files,
      complete,
      totalBytes,
      skipped: Math.max(0, candidates.length - files.length),
      ...(truncated ? { reason: "GitHub returned a truncated recursive tree." } : budgetHit ? { reason: "Import file-count or byte budget reached." } : undefined),
    };
  }

  async openPR(owner: string, name: string, head: string, base: string, title: string, body: string) {
    const pr = await this.ok("POST", `/repos/${owner}/${name}/pulls`, { title, head, base, body });
    return { url: pr.html_url as string, number: pr.number as number };
  }

  async mergePR(owner: string, name: string, n: number) { return this.ok("PUT", `/repos/${owner}/${name}/pulls/${n}/merge`, { merge_method: "squash" }); }

  async enablePages(owner: string, name: string) {
    const r = await this.req("POST", `/repos/${owner}/${name}/pages`, { build_type: "workflow" });
    if (r.status === 409 || r.status === 201 || r.status === 204) {
      if (r.status === 409) await this.req("PUT", `/repos/${owner}/${name}/pages`, { build_type: "workflow" });
      return `https://${owner.toLowerCase()}.github.io/${name}/`;
    }
    throw new Error(r.json?.message || `Pages setup failed (${r.status}). On free accounts Pages needs a public repo.`);
  }

  async runs(owner: string, name: string) {
    const r = await this.ok("GET", `/repos/${owner}/${name}/actions/runs?per_page=6`);
    return (r.workflow_runs || []).map((w: any) => ({ name: w.name as string, status: w.status as string, conclusion: w.conclusion as string | null, url: w.html_url as string, at: w.created_at as string }));
  }
}
