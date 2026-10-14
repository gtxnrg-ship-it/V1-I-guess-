import { useMemo, useState } from "react";
import { FileCode2, FileJson, FileText, Folder, Palette, ChevronLeft } from "lucide-react";

const iconFor = (p: string) => /\.(json)$/.test(p) ? FileJson : /\.(css)$/.test(p) ? Palette : /\.(tsx?|jsx?|html|ya?ml)$/.test(p) ? FileCode2 : FileText;

/** Read-only file explorer. */
export function CodeBrowser({ files, testid = "code" }: { files: Record<string, string>; testid?: string }) {
  const paths: string[] = useMemo(() => Object.keys(files), [files]);
  const [sel, setSel] = useState<string | null>(null);
  const active = sel && paths.includes(sel) ? sel : paths.find((p) => /src\/App\.tsx$|src\/engine\/agents\.ts$/.test(p)) || paths[0];
  const content = (active && files[active]) || "";
  const [mobileView, setMobileView] = useState<"tree" | "file">("tree");

  const tree = useMemo(() => {
    const rows: { kind: "dir" | "file"; name: string; path: string; depth: number }[] = [];
    const seen = new Set<string>();
    for (const p of [...paths].sort()) {
      const parts = p.split("/");
      for (let i = 0; i < parts.length - 1; i++) {
        const d = parts.slice(0, i + 1).join("/");
        if (!seen.has(d)) { seen.add(d); rows.push({ kind: "dir", name: parts[i], path: d, depth: i }); }
      }
      rows.push({ kind: "file", name: parts[parts.length - 1], path: p, depth: parts.length - 1 });
    }
    return rows;
  }, [paths]);
  const lines = content.split("\n");

  return (
    <div className="flex h-full min-h-0">
      <div className={`her-scroll w-full shrink-0 overflow-y-auto border-r border-border py-2 md:block md:w-56 ${mobileView === "file" ? "hidden" : "block"}`}>
        {tree.map((r) => r.kind === "dir" ? (
          <div key={r.path} className="flex items-center gap-1.5 px-3 py-1 text-[12.5px] text-muted-foreground" style={{ paddingLeft: 12 + r.depth * 12 }}>
            <Folder className="h-3.5 w-3.5" />{r.name}
          </div>
        ) : (
          <button key={r.path} data-testid={`${testid}-file-${r.path}`} onClick={() => { setSel(r.path); setMobileView("file"); }}
            className={`flex w-full items-center gap-1.5 py-1 pr-3 text-left text-[12.5px] transition-colors ${active === r.path ? "bg-muted text-foreground font-medium" : "text-foreground/80 hover:bg-muted/60"}`}
            style={{ paddingLeft: 12 + r.depth * 12 }}>
            {(() => { const I = iconFor(r.path); return <I className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />; })()}
            <span className="truncate">{r.name}</span>
          </button>
        ))}
      </div>
      <div className={`min-w-0 flex-1 flex-col md:flex ${mobileView === "tree" ? "hidden" : "flex"}`}>
        <div className="flex items-center gap-2 border-b border-border px-3 py-2 font-mono text-[12px] text-muted-foreground">
          <button className="md:hidden" aria-label="Back" onClick={() => setMobileView("tree")}><ChevronLeft className="h-4 w-4" /></button>
          <span className="truncate">{active}</span>
          <span className="ml-auto shrink-0">{lines.length} lines</span>
        </div>
        <div className="her-scroll min-h-0 flex-1 overflow-auto">
          <pre className="py-3 font-mono text-[12px] leading-[1.7]">
            {lines.map((l, i) => (
              <div key={i} className="flex hover:bg-muted/50">
                <span className="w-12 shrink-0 select-none pr-4 text-right text-muted-foreground/50 tabular-nums">{i + 1}</span>
                <code className="whitespace-pre pr-6">{l || " "}</code>
              </div>
            ))}
          </pre>
        </div>
      </div>
    </div>
  );
}
