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
    const parent = await this.seedIfEmpty(owner, name, opts.fromBranch || branch);
    if (!parent) throw new Error("Couldn't find a starting commit on the branch.");
    const parentCommit = await this.ok("GET", `/repos/${owner}/${name}/git/commits/${parent}`);
    const tree = await this.ok("POST", `/repos/${owner}/${name}/git/trees`, {
      ...(opts.full ? {} : { base_tree: parentCommit.tree.sha }),
      tree: files.map((f) => (f.content === null ? { path: f.path, mode: "100644", type: "blob", sha: null } : { path: f.path, mode: "100644", type: "blob", content: f.content })),
    });
    const commit = await this.ok("POST", `/repos/${owner}/${name}/git/commits`, { message, tree: tree.sha, parents: [parent] });
    const exists = await this.headSha(owner, name, branch);
    // Do not move a branch if someone pushed after we read its parent commit.
    // This is a compare-and-swap guard against accidentally overwriting newer work.
    if (!opts.fromBranch && exists !== parent) {
      throw new Error("The repository changed while preparing this publish. Nothing was pushed. Refresh the project from GitHub and review the changes before trying again.");
    }
    if (exists) await this.ok("PATCH", `/repos/${owner}/${name}/git/refs/heads/${branch}`, { sha: commit.sha, force: false });
    else await this.ok("POST", `/repos/${owner}/${name}/git/refs`, { ref: `refs/heads/${branch}`, sha: commit.sha });
    return { sha: commit.sha, url: `https://github.com/${owner}/${name}/commit/${commit.sha}` };
  }

  async readTree(owner: string, name: string, branch: string, filter: (p: string) => boolean = () => true): Promise<Record<string, string>> {
    const sha = await this.headSha(owner, name, branch);
    if (!sha) return {};
    const t = await this.ok("GET", `/repos/${owner}/${name}/git/trees/${sha}?recursive=1`);
    const blobs = (t.tree || []).filter((x: any) => x.type === "blob" && x.size < 200_000 && filter(x.path) && !/\.(png|jpe?g|gif|webp|ico|woff2?|ttf|apk|jar|zip|wasm)$/i.test(x.path));
    const out: Record<string, string> = {};
    for (let i = 0; i < blobs.length; i += 8) {
      await Promise.all(blobs.slice(i, i + 8).map(async (b: any) => {
        const j = await this.ok("GET", `/repos/${owner}/${name}/git/blobs/${b.sha}`);
        try { out[b.path] = unb64(j.content); } catch { /* binary */ }
      }));
    }
    return out;
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

  async latestRelease(owner: string, name: string) {
    const r = await this.ok("GET", `/repos/${owner}/${name}/releases/latest`);
    return {
      name: r.name as string,
      tag: r.tag_name as string,
      url: r.html_url as string,
      publishedAt: r.published_at as string | null,
      assets: (r.assets || []).map((a: any) => ({ name: a.name as string, url: a.browser_download_url as string, size: a.size as number, contentType: a.content_type as string })),
    };
  }

  async pullRequests(owner: string, name: string) {
    const r = await this.ok("GET", `/repos/${owner}/${name}/pulls?state=open&per_page=10`);
    return (r || []).map((p: any) => ({ number: p.number as number, title: p.title as string, url: p.html_url as string, branch: p.head?.ref as string, updatedAt: p.updated_at as string }));
  }
}
