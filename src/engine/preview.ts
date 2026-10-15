// Bundles the project in the browser (esbuild-wasm) and turns it into a self-contained HTML page.
import * as esbuild from "esbuild-wasm";
import wasmURL from "esbuild-wasm/esbuild.wasm?url";

let ready: Promise<void> | null = null;
function boot() {
  if (!ready) ready = esbuild.initialize({ wasmURL, worker: true }).catch((e) => { ready = null; throw e; });
  return ready;
}

// Runs inside every preview: reports errors, powers tap-to-select, and takes its own screenshots.
const BRIDGE = `(function(){function mk(){var d={};return{getItem:function(k){k=String(k);return Object.prototype.hasOwnProperty.call(d,k)?d[k]:null},setItem:function(k,v){d[String(k)]=String(v)},removeItem:function(k){delete d[String(k)]},clear:function(){d={}},key:function(i){return Object.keys(d)[i]||null},get length(){return Object.keys(d).length}}}
['localStorage','sessionStorage'].forEach(function(n){try{window[n].getItem('x')}catch(e){try{Object.defineProperty(window,n,{value:mk(),configurable:true})}catch(_){}}});
try{document.cookie}catch(e){try{var c='';Object.defineProperty(document,'cookie',{get:function(){return c},set:function(v){c=String(v).split(';')[0]},configurable:true})}catch(_){}}})();
(function(){
var errs=[];function send(m){try{m=String(m).slice(0,500);if(errs.indexOf(m)<0)errs.push(m);parent.postMessage({__her:'runtime-error',errors:errs},'*')}catch(e){}}
window.addEventListener('error',function(e){send((e.message||'Error')+(e.filename?' @ '+String(e.filename).split('/').pop()+':'+e.lineno:''))});
window.addEventListener('unhandledrejection',function(e){send('Unhandled promise: '+(e.reason&&e.reason.message||e.reason))});
var ce=console.error;console.error=function(){try{var a=[].slice.call(arguments).map(function(x){return x&&x.message?x.message:typeof x==='object'?JSON.stringify(x):String(x)}).join(' ');if(!/Warning: |DevTools|tailwindcss.com should not be used/.test(a))send('console.error: '+a)}catch(e){}return ce.apply(console,arguments)};
window.addEventListener('load',function(){parent.postMessage({__her:'loaded'},'*')});
var picking=false,box=null,cur=null;
function ensure(){if(box)return;box=document.createElement('div');box.setAttribute('data-kuro','1');box.style.cssText='position:fixed;pointer-events:none;z-index:2147483647;border:2px solid #ec5f3a;background:rgba(236,95,58,.08);border-radius:6px;transition:all .06s;display:none';document.documentElement.appendChild(box)}
function place(el){var r=el.getBoundingClientRect();box.style.display='block';box.style.left=r.left+'px';box.style.top=r.top+'px';box.style.width=r.width+'px';box.style.height=r.height+'px'}
function path(el){var p=[];while(el&&el.nodeType===1&&p.length<5&&el!==document.body){var s=el.tagName.toLowerCase();if(el.id)s+='#'+el.id;p.unshift(s);el=el.parentElement}return p.join(' > ')}
function describe(el){var t=(el.innerText||el.alt||el.placeholder||'').trim().replace(/\\s+/g,' ').slice(0,120);var h=el.outerHTML;return{tag:el.tagName.toLowerCase(),text:t,classes:(el.getAttribute('class')||'').slice(0,200),path:path(el),html:h.length>400?h.slice(0,400)+'…':h}}
function over(e){if(!picking)return;cur=e.target;ensure();place(cur)}
function click(e){if(!picking)return;e.preventDefault();e.stopPropagation();parent.postMessage({__her:'picked',el:describe(e.target)},'*');setPick(false)}
function setPick(on){picking=on;document.documentElement.style.cursor=on?'crosshair':'';if(!on&&box)box.style.display='none'}
document.addEventListener('mouseover',over,true);document.addEventListener('click',click,true);
document.addEventListener('touchstart',function(e){if(picking){cur=e.target;ensure();place(cur)}},{capture:true,passive:true});
window.addEventListener('message',function(e){var d=e.data||{};
if(d.__her==='pick')setPick(!!d.on);
if(d.__her==='errors')parent.postMessage({__her:'runtime-error',errors:errs},'*');
if(d.__her==='shot'){(async function(){try{var m=await import('https://esm.sh/modern-screenshot@4.6.0');
var de=document.documentElement;var h=Math.min(Math.max(de.scrollHeight,innerHeight),d.maxH||2600);
var bg=getComputedStyle(document.body).backgroundColor;if(!bg||bg==='rgba(0, 0, 0, 0)')bg=getComputedStyle(de).backgroundColor;if(!bg||bg==='rgba(0, 0, 0, 0)')bg='#ffffff';
var url=await m.domToJpeg(de,{quality:0.72,width:innerWidth,height:h,scale:d.scale||1,backgroundColor:bg,filter:function(n){return !(n.getAttribute&&n.getAttribute('data-kuro'))},timeout:12000});
parent.postMessage({__her:'shot',id:d.id,url:url,h:h},'*')}catch(err){parent.postMessage({__her:'shot',id:d.id,error:String(err&&err.message||err)},'*')}})()}
});
})();`;

const norm = (p: string) => {
  const out: string[] = [];
  for (const part of p.split("/")) { if (!part || part === ".") continue; if (part === "..") out.pop(); else out.push(part); }
  return out.join("/");
};
const dirname = (p: string) => p.split("/").slice(0, -1).join("/");
const EXTS = ["", ".tsx", ".ts", ".jsx", ".js", ".css", ".json", "/index.tsx", "/index.ts", "/index.jsx", "/index.js"];
const loaderFor = (p: string): esbuild.Loader => {
  const e = p.split(".").pop()!.toLowerCase();
  return (({ tsx: "tsx", ts: "ts", jsx: "jsx", js: "jsx", mjs: "js", css: "css", json: "json", svg: "text", md: "text", txt: "text" }) as Record<string, esbuild.Loader>)[e] || "text";
};

let cache: { hash: string; html: string; errors: string[] } | null = null;
const hashOf = (files: Record<string, string>, env: Record<string, string>) => {
  let h = 0; const s = JSON.stringify([files, env]);
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return `${s.length}:${h}`;
};

export async function buildPreview(files: Record<string, string>, env: Record<string, string> = {}): Promise<{ html: string; errors: string[] }> {
  const hash = hashOf(files, env);
  if (cache && cache.hash === hash) return cache;
  const indexHtml = files["index.html"] || `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><script src="https://cdn.tailwindcss.com"></script></head><body><div id="root"></div></body></html>`;
  const entry = ["src/main.tsx", "src/main.jsx", "src/main.ts", "src/main.js", "src/index.tsx", "main.tsx"].find((e) => files[e] != null);
  let pkg: any = {}; try { pkg = JSON.parse(files["package.json"] || "{}"); } catch { /* */ }
  const deps = { ...(pkg.devDependencies || {}), ...(pkg.dependencies || {}) };
  const ver = (name: string) => { const v = deps[name]; const m = typeof v === "string" ? v.match(/\d+(\.\d+){0,2}/) : null; return m ? `@${m[0]}` : ""; };
  const reactV = ver("react") || "@18.3.1";
  const errors: string[] = [];
  const cssLinks: string[] = [];
  let js = "", css = "";
  const imports: Record<string, string> = {
    react: `https://esm.sh/react${reactV}`,
    "react/jsx-runtime": `https://esm.sh/react${reactV}/jsx-runtime`,
    "react-dom": `https://esm.sh/react-dom${reactV}`,
    "react-dom/client": `https://esm.sh/react-dom${reactV}/client`,
  };
  if (entry) {
    try {
      await boot();
      const find = (p: string) => { for (const e of EXTS) if (files[p + e] != null) return p + e; return null; };
      const out = await esbuild.build({
        entryPoints: [entry], bundle: true, write: false, format: "esm", jsx: "automatic", target: "es2020",
        outdir: "/out", logLevel: "silent",
        define: {
          "process.env.NODE_ENV": '"development"', "import.meta.env.DEV": "true", "import.meta.env.PROD": "false", "import.meta.env.BASE_URL": '"./"', "import.meta.env.MODE": '"development"',
          ...Object.fromEntries(Object.entries(env).filter(([k]) => /^VITE_[A-Z0-9_]+$/.test(k)).map(([k, v]) => [`import.meta.env.${k}`, JSON.stringify(v)])),
        },
        plugins: [{
          name: "kuro-vfs",
          setup(b) {
            b.onResolve({ filter: /.*/ }, (a) => {
              if (a.kind === "entry-point") return { path: a.path, namespace: "vfs" };
              const p = a.path;
              if (/^(https?:)?\/\//.test(p)) return { path: p, external: true };
              let local: string | null = null;
              if (p.startsWith("@/")) local = norm("src/" + p.slice(2));
              else if (p.startsWith("/")) local = norm(p);
              else if (p.startsWith(".")) local = norm(dirname(a.importer) + "/" + p);
              if (local !== null) {
                const f = find(local);
                if (!f) return { errors: [{ text: `Can't find "${p}" (imported from ${a.importer}). Create the file or fix the path.` }] };
                return { path: f, namespace: "vfs" };
              }
              // bare package import → esm.sh via the import map; package CSS → a <link>
              const parts = p.startsWith("@") ? p.split("/").slice(0, 2) : p.split("/").slice(0, 1);
              const name = parts.join("/");
              const sub = p.slice(name.length);
              if (/\.css$/.test(p)) { cssLinks.push(`https://cdn.jsdelivr.net/npm/${name}${ver(name)}${sub}`); return { path: p, namespace: "empty" }; }
              if (!imports[p]) imports[p] = `https://esm.sh/${name}${ver(name)}${sub}?external=react,react-dom`;
              return { path: p, external: true };
            });
            b.onLoad({ filter: /.*/, namespace: "vfs" }, (a) => ({ contents: files[a.path] ?? "", loader: loaderFor(a.path) }));
            b.onLoad({ filter: /.*/, namespace: "empty" }, () => ({ contents: "", loader: "js" }));
          },
        }],
      });
      for (const o of out.outputFiles || []) {
        if (o.path.endsWith(".js")) js += o.text;
        else if (o.path.endsWith(".css")) css += o.text;
      }
    } catch (e: any) {
      for (const er of e.errors || [{ text: e.message || String(e) }]) {
        errors.push(`${er.location ? `${er.location.file.replace(/^vfs:/, "")}:${er.location.line}:${er.location.column} ` : ""}${er.text}`);
      }
    }
  }
  const esc = (s: string) => s.replace(/<\/script/gi, "<\\/script");
  let html = indexHtml.replace(/<script[^>]*type=["']module["'][^>]*src=["'][^"']*["'][^>]*>\s*<\/script>/gi, "");
  const head = `<script>${BRIDGE}</script><script type="importmap">${JSON.stringify({ imports })}</script>${cssLinks.map((h) => `<link rel="stylesheet" href="${h}">`).join("")}${css ? `<style>${css.replace(/<\/style/gi, "<\\/style")}</style>` : ""}`;
  html = /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, (m) => `${m}${head}`) : head + html;
  if (errors.length) {
    const box = `<div style="position:fixed;inset:0;background:#1c1917;color:#fafaf9;font:13px/1.6 ui-monospace,monospace;padding:28px;white-space:pre-wrap;overflow:auto;z-index:99999"><div style="color:#fb923c;font-weight:600;margin-bottom:12px">Build error</div>${errors.map((e) => e.replace(/</g, "&lt;")).join("\n\n")}</div>`;
    html = /<\/body>/i.test(html) ? html.replace(/<\/body>/i, `${box}</body>`) : html + box;
  } else if (js) {
    const tag = `<script type="module">${esc(js)}</script>`;
    html = /<\/body>/i.test(html) ? html.replace(/<\/body>/i, `${tag}</body>`) : html + tag;
  }
  cache = { hash, html, errors };
  return cache;
}

/** Package names imported anywhere in the project (for package.json sync before publishing). */
export function importedPackages(files: Record<string, string>): string[] {
  const set = new Set<string>();
  for (const [p, c] of Object.entries(files)) {
    if (!/\.(t|j)sx?$/.test(p)) continue;
    // Strip single-line and multi-line comments so commented-out code doesn't trigger package sync
    const clean = c.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, "");
    for (const m of clean.matchAll(/(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g)) {
      const s = m[1] || m[2] || m[3];
      if (!s || s.startsWith(".") || s.startsWith("/") || s.startsWith("@/") || /^https?:/.test(s)) continue;
      set.add(s.startsWith("@") ? s.split("/").slice(0, 2).join("/") : s.split("/")[0]);
    }
  }
  return [...set];
}
