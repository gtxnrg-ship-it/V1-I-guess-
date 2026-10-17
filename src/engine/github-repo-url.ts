/** Parse a bare GitHub repository URL without guessing from issue, PR, or file links. */
export interface GitHubRepositoryReference {
  repository: string;
  branch?: string;
}
export function parseBareGitHubRepositoryLink(input: string): GitHubRepositoryReference | null {
  const candidate = input.trim();
  if (!candidate || /\s/.test(candidate)) return null;
  let url: URL;
  try { url = new URL(candidate); } catch { return null; }
  if (url.protocol !== "https:" || url.hostname.toLowerCase() !== "github.com" || url.username || url.password) return null;
  const segments = url.pathname.split("/").filter(Boolean).map((segment) => {
    try { return decodeURIComponent(segment); } catch { return segment; }
  });
  if (segments.length < 2 || !/^[A-Za-z0-9_.-]+$/.test(segments[0])) return null;
  const owner = segments[0];
  const repo = segments[1].replace(/\.git$/i, "");
  if (!/^[A-Za-z0-9_.-]+$/.test(repo) || !repo || repo === "." || repo === "..") return null;
  if (segments.length === 2) return { repository: `${owner}/${repo}` };
  if (segments.length >= 4 && segments[2] === "tree") {
    const branch = segments.slice(3).join("/");
    return branch ? { repository: `${owner}/${repo}`, branch } : null;
  }
  return null;
}
