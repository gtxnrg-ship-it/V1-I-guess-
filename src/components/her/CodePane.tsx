import { useEffect, useMemo, useState } from "react";
import { FileCode2, FileJson, FileText, Folder, Palette, ChevronLeft, Pencil, Save, Plus, Trash2, X, Check } from "lucide-react";
import * as db from "@/engine/db";
import { useToast } from "@/hooks/use-toast";

const iconFor = (p: string) => /\.(json)$/.test(p) ? FileJson : /\.(css)$/.test(p) ? Palette : /\.(tsx?|jsx?|html|ya?ml)$/.test(p) ? FileCode2 : FileText;

export function CodeBrowser({ files, testid = "code" }: { files: Record<string, string>; testid?: string }) {
  const { toast } = useToast();
  const paths: string[] = useMemo(() => Object.keys(files), [files]);
  const [sel, setSel] = useState<string | null>(null);
  const active = sel && paths.includes(sel) ? sel : paths.find((p) => /src\/App\.tsx$|src\/engine\/agents\.ts$/.test(p)) || paths[0];
  const content = (active && files[active]) || "";
  const [mobileView, setMobileView] = useState<"tree" | "file">("tree");

  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [newFilePath, setNewFilePath] = useState("");
  const [creatingFile, setCreatingFile] = useState(false);

  useEffect(() => {
    setEditing(false);
    setEditContent(files[active] || "");
  }, [active, files]);

  const handleSave = () => {
    if (!active) return;
    db.writeFile(active, editContent);
    setEditing(false);
    toast({ title: `Saved ${active}` });
  };

  const handleCreateFile = () => {
    const trimmed = newFilePath.trim().replace(/^\/+/, "");
    if (!trimmed) return;
    if (files[trimmed] != null) {
      toast({ title: "File already exists", variant: "destructive" });
      return;
    }
    db.writeFile(trimmed, "");
    setSel(trimmed);
    setNewFilePath("");
    setCreatingFile(false);
    setEditing(true);
    setEditContent("");
    toast({ title: `Created ${trimmed}` });
  };

  const handleDeleteFile = () => {
    if (!active) return;
    if (paths.length <= 1) {
      toast({ title: "Cannot delete the last remaining file", variant: "destructive" });
      return;
    }
    db.deleteFile(active);
    const remaining = paths.filter((p) => p !== active);
    setSel(remaining[0] || null);
    setEditing(false);
    toast({ title: `Deleted ${active}` });
  };

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
      <div className={`her-scroll flex w-full shrink-0 flex-col overflow-y-auto border-r border-border py-2 md:block md:w-56 ${mobileView === "file" ? "hidden" : "block"}`}>
        <div className="mb-2 flex items-center justify-between px-3">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Files</span>
          <button data-testid={`${testid}-new-file-btn`} onClick={() => setCreatingFile(!creatingFile)} className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground">
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        {creatingFile && (
          <div className="mb-2 flex items-center gap-1 px-3">
            <input data-testid={`${testid}-new-file-input`} autoFocus value={newFilePath} onChange={(e) => setNewFilePath(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleCreateFile()} placeholder="src/new-file.tsx" className="h-7 min-w-0 flex-1 rounded border border-border bg-background px-2 font-mono text-[11.5px] outline-none" />
            <button data-testid={`${testid}-confirm-new-file`} onClick={handleCreateFile} className="grid h-7 w-7 place-items-center rounded bg-primary text-primary-foreground"><Check className="h-3 w-3" /></button>
            <button onClick={() => setCreatingFile(false)} className="grid h-7 w-7 place-items-center rounded text-muted-foreground hover:bg-muted"><X className="h-3 w-3" /></button>
          </div>
        )}
        <div className="flex-1">
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
      </div>
      <div className={`min-w-0 flex-1 flex-col md:flex ${mobileView === "tree" ? "hidden" : "flex"}`}>
        <div className="flex items-center gap-2 border-b border-border px-3 py-2 font-mono text-[12px] text-muted-foreground">
          <button className="md:hidden" aria-label="Back" onClick={() => setMobileView("tree")}><ChevronLeft className="h-4 w-4" /></button>
          <span className="truncate">{active}</span>
          <span className="shrink-0 text-[11.5px]">{lines.length} lines</span>
          <div className="ml-auto flex items-center gap-1">
            {editing ? (
              <button data-testid={`${testid}-save-btn`} onClick={handleSave} className="inline-flex items-center gap-1 rounded bg-primary px-2.5 py-1 text-[12px] font-medium text-primary-foreground hover:opacity-90">
                <Save className="h-3 w-3" /> Save
              </button>
            ) : (
              <button data-testid={`${testid}-edit-btn`} onClick={() => { setEditing(true); setEditContent(content); }} className="inline-flex items-center gap-1 rounded border border-border px-2.5 py-1 text-[12px] hover:bg-muted hover:text-foreground">
                <Pencil className="h-3 w-3" /> Edit
              </button>
            )}
            <button data-testid={`${testid}-delete-btn`} onClick={handleDeleteFile} className="grid h-7 w-7 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-rose-600" title="Delete file">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <div className="her-scroll min-h-0 flex-1 overflow-auto">
          {editing ? (
            <textarea
              data-testid={`${testid}-editor-textarea`}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="h-full w-full resize-none bg-transparent p-3 font-mono text-[12px] leading-[1.7] outline-none"
              spellCheck={false}
            />
          ) : (
            <pre className="py-3 font-mono text-[12px] leading-[1.7]">
              {lines.map((l, i) => (
                <div key={i} className="flex hover:bg-muted/50">
                  <span className="w-12 shrink-0 select-none pr-4 text-right text-muted-foreground/50 tabular-nums">{i + 1}</span>
                  <code className="whitespace-pre pr-6">{l || " "}</code>
                </div>
              ))}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
