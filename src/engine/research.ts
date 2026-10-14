// The Researcher's toolkit. Everything here works straight from a browser, and most of it is free with no key.
import { keyOf } from "./db";

export interface Hit { title: string; url: string; snippet: string }
const T = (ms: number) => AbortSignal.timeout(ms);
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n) + "…" : s);
const strip = (s: string) => s.replace(/<[^>]+>/g, "").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

async function tavily(q: string, key: string): Promise<Hit[]> {
  const r = await fetch("https://api.tavily.com/search", { method: "POST", signal: T(20000), headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` }, body: JSON.stringify({ query: q, max_results: 8, search_depth: "basic" }) });
  if (!r.ok) throw new Error(`Tavily ${r.status}`);
  const j = await r.json();
  return (j.results || []).map((x: any) => ({ title: x.title, url: x.url, snippet: clip(x.content || "", 500) }));
}
async function jina(q: string, key: string): Promise<Hit[]> {
  const r = await fetch(`https://s.jina.ai/?q=${encodeURIComponent(q)}`, { signal: T(25000), headers: { Authorization: `Bearer ${key}`, Accept: "application/json", "X-Respond-With": "no-content" } });
  if (!r.ok) throw new Error(`Jina ${r.status}`);
  const j = await r.json();
  return (j.data || []).slice(0, 8).map((x: any) => ({ title: x.title, url: x.url, snippet: clip(x.description || x.content || "", 500) }));
}
/** Google Search grounding through the user's Gemini key: real web results, free tier included. */
async function geminiSearch(q: string, key: string): Promise<{ answer: string; hits: Hit[] }> {
  const body = { contents: [{ role: "user", parts: [{ text: `Search the web and give a dense, factual answer with specifics (names, versions, numbers, URLs) for: ${q}` }] }], tools: [{ google_search: {} }] };
  let lastErr = "";
  for (const model of ["gemini-2.5-flash", "gemini-flash-latest", "gemini-2.0-flash"]) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, { method: "POST", signal: T(40000), headers: { "Content-Type": "application/json", "x-goog-api-key": key }, body: JSON.stringify(body) });
    if (!r.ok) { lastErr = `Gemini search ${r.status}`; if (r.status === 404 || r.status === 400) continue; throw new Error(lastErr); }
    const j = await r.json();
    const c = j.candidates?.[0];
    const answer = (c?.content?.parts || []).map((p: any) => p.text || "").join("");
    const hits: Hit[] = (c?.groundingMetadata?.groundingChunks || []).filter((g: any) => g.web).map((g: any) => ({ title: g.web.title || g.web.uri, url: g.web.uri, snippet: "" }));
    return { answer, hits };
  }
  throw new Error(lastErr || "Gemini search unavailable");
}
async function wikipedia(q: string): Promise<Hit[]> {
  const r = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&format=json&origin=*&srlimit=4`, { signal: T(12000) });
  const j = await r.json();
  return (j.query?.search || []).map((x: any) => ({ title: `Wikipedia: ${x.title}`, url: `https://en.wikipedia.org/wiki/${encodeURIComponent(x.title.replace(/ /g, "_"))}`, snippet: strip(x.snippet || "") }));
}
async function stack(q: string): Promise<Hit[]> {
  const r = await fetch(`https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=relevance&q=${encodeURIComponent(q)}&site=stackoverflow&pagesize=4&accepted=True`, { signal: T(12000) });
  const j = await r.json();
  return (j.items || []).map((x: any) => ({ title: `Stack Overflow: ${strip(x.title)}`, url: x.link, snippet: `${x.score} votes · ${(x.tags || []).slice(0, 4).join(", ")}` }));
}
async function hn(q: string): Promise<Hit[]> {
  const r = await fetch(`https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(q)}&tags=story&hitsPerPage=4`, { signal: T(12000) });
  const j = await r.json();
  return (j.hits || []).filter((x: any) => x.url).map((x: any) => ({ title: `HN: ${x.title}`, url: x.url, snippet: `${x.points} points` }));
}

export async function webSearch(q: string): Promise<{ engine: string; answer?: string; hits: Hit[] }> {
  const tv = keyOf("tavily"), jn = keyOf("jina"), gm = keyOf("google");
  const notes: string[] = [];
  if (tv) try { return { engine: "Tavily", hits: await tavily(q, tv.secret) }; } catch (e: any) { notes.push(e.message); }
  if (jn) try { return { engine: "Jina", hits: await jina(q, jn.secret) }; } catch (e: any) { notes.push(e.message); }
  if (gm) try { const g = await geminiSearch(q, gm.secret); if (g.answer || g.hits.length) return { engine: "Google (via Gemini)", ...g }; } catch (e: any) { notes.push(e.message); }
  // Free, keyless fallback: developer-focused sources that allow browser calls.
  const parts = await Promise.allSettled([github(q, 4), wikipedia(q), stack(q), hn(q)]);
  const hits = parts.flatMap((p) => (p.status === "fulfilled" ? p.value : []));
  return { engine: "Free sources (GitHub, Wikipedia, Stack Overflow, Hacker News)" + (notes.length ? ` after: ${notes.join("; ")}` : ""), hits };
}

export async function readUrl(url: string): Promise<string> {
  try {
    const r = await fetch(`https://r.jina.ai/${url}`, { signal: T(30000), headers: { Accept: "text/plain", ...(keyOf("jina") ? { Authorization: `Bearer ${keyOf("jina")!.secret}` } : {}) } });
    if (r.ok) return clip(await r.text(), 12000);
  } catch { /* fall through */ }
  const r = await fetch(url, { signal: T(20000) });
  return clip(strip(await r.text()), 12000);
}

export async function npmSearch(q: string): Promise<string> {
  const r = await fetch(`https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(q)}&size=8`, { signal: T(15000) });
  const j = await r.json();
  return (j.objects || []).map((o: any) => {
    const p = o.package; const dl = o.downloads?.weekly ? ` · ${Intl.NumberFormat("en", { notation: "compact" }).format(o.downloads.weekly)}/week` : "";
    return `- ${p.name}@${p.version}${dl}: ${clip(p.description || "", 140)}`;
  }).join("\n") || "No packages found.";
}

export async function github(q: string, n = 6): Promise<Hit[]> {
  const gh = keyOf("github");
  const r = await fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&per_page=${n}`, { signal: T(15000), headers: { Accept: "application/vnd.github+json", ...(gh ? { Authorization: `Bearer ${gh.secret}` } : {}) } });
  if (!r.ok) throw new Error(`GitHub search ${r.status}`);
  const j = await r.json();
  return (j.items || []).map((x: any) => ({ title: `${x.full_name} ★${x.stargazers_count}`, url: x.html_url, snippet: clip(x.description || "", 200) + (x.license?.spdx_id ? ` · ${x.license.spdx_id}` : "") }));
}

/** A package's README, straight from the npm CDN: the most reliable docs a model can read. */
export async function packageDocs(pkg: string, focus?: string): Promise<string> {
  let ver = "latest";
  try { const m = await fetch(`https://registry.npmjs.org/${pkg}/latest`, { signal: T(10000) }); if (m.ok) ver = (await m.json()).version; } catch { /* */ }
  for (const f of ["README.md", "readme.md", "Readme.md"]) {
    try {
      const r = await fetch(`https://cdn.jsdelivr.net/npm/${pkg}@${ver}/${f}`, { signal: T(15000) });
      if (!r.ok) continue;
      let t = await r.text();
      if (focus) {
        const words = focus.toLowerCase().split(/\W+/).filter((w) => w.length > 2);
        const secs = t.split(/\n(?=#{1,3} )/);
        const scored = secs.map((s) => ({ s, n: words.reduce((a, w) => a + (s.toLowerCase().split(w).length - 1), 0) })).sort((a, b) => b.n - a.n);
        t = [secs[0], ...scored.slice(0, 5).map((x) => x.s)].join("\n\n");
      }
      return `${pkg}@${ver}\n\n${clip(t, 9000)}`;
    } catch { /* */ }
  }
  return `No README found for ${pkg}.`;
}

export const imageUrl = (prompt: string, w = 1600, h = 1000, seed?: number) =>
  `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}&nologo=true${seed != null ? `&seed=${seed}` : ""}`;

export const latestVersion = async (pkg: string): Promise<string | null> => {
  try { const r = await fetch(`https://registry.npmjs.org/${pkg}/latest`, { signal: T(10000) }); return r.ok ? (await r.json()).version : null; } catch { return null; }
};

export interface Photo { url: string; thumb: string; alt: string; credit: string; source: string }
/** Real photos for apps: Pexels or Unsplash if a key is saved, else Openverse and Wikimedia Commons (free, no key). */
export async function findPhotos(q: string, n = 6): Promise<{ source: string; photos: Photo[] }> {
  const tries: [string, () => Promise<Photo[]>][] = [];
  const pex = keyOf("pexels"), uns = keyOf("unsplash");
  if (pex) tries.push(["Pexels", async () => {
    const r = await fetch(`https://api.pexels.com/v1/search?per_page=${n}&query=${encodeURIComponent(q)}`, { headers: { Authorization: pex.secret }, signal: T(15000) });
    if (!r.ok) throw new Error(`Pexels ${r.status}`);
    return ((await r.json()).photos || []).map((p: any) => ({ url: p.src.large2x, thumb: p.src.medium, alt: p.alt || q, credit: `Photo by ${p.photographer} on Pexels`, source: "Pexels" }));
  }]);
  if (uns) tries.push(["Unsplash", async () => {
    const r = await fetch(`https://api.unsplash.com/search/photos?per_page=${n}&query=${encodeURIComponent(q)}`, { headers: { Authorization: `Client-ID ${uns.secret}` }, signal: T(15000) });
    if (!r.ok) throw new Error(`Unsplash ${r.status}`);
    return ((await r.json()).results || []).map((p: any) => ({ url: `${p.urls.raw}&w=1600&q=80&auto=format`, thumb: p.urls.small, alt: p.alt_description || q, credit: `Photo by ${p.user?.name} on Unsplash`, source: "Unsplash" }));
  }]);
  tries.push(["Openverse", async () => {
    const r = await fetch(`https://api.openverse.org/v1/images/?page_size=${n}&license_type=commercial,modification&q=${encodeURIComponent(q)}`, { signal: T(15000) });
    if (!r.ok) throw new Error(`Openverse ${r.status}`);
    return ((await r.json()).results || []).map((p: any) => ({ url: p.url, thumb: p.thumbnail || p.url, alt: p.title || q, credit: `${p.title || "Photo"} by ${p.creator || "unknown"} (${String(p.license).toUpperCase()})`, source: "Openverse" }));
  }]);
  tries.push(["Wikimedia Commons", async () => {
    const r = await fetch(`https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrnamespace=6&gsrlimit=${n}&gsrsearch=${encodeURIComponent(q + " filetype:bitmap")}&prop=imageinfo&iiprop=url&iiurlwidth=1600`, { signal: T(15000) });
    const pages = Object.values((await r.json()).query?.pages || {}) as any[];
    return pages.filter((p) => p.imageinfo?.[0]).map((p) => ({ url: p.imageinfo[0].thumburl || p.imageinfo[0].url, thumb: p.imageinfo[0].thumburl, alt: String(p.title).replace(/^File:|\.\w+$/g, ""), credit: "Wikimedia Commons", source: "Wikimedia Commons" }));
  }]);
  for (const [source, fn] of tries) {
    try { const photos = (await fn()).filter((p) => p.url).slice(0, n); if (photos.length) return { source, photos }; } catch { /* next */ }
  }
  return { source: "none", photos: [] };
}
