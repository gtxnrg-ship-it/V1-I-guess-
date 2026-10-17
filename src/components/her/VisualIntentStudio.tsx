import { useEffect, useMemo, useState } from "react";
import { Check, ExternalLink, ImageOff, Loader2, Palette, Search, Sparkles, BookmarkCheck, FileText, RefreshCw, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as db from "@/engine/db";
import { findPhotos, type Photo } from "@/engine/research";
import type { DesignStudioState } from "@/engine/types";

const emptyStudio = (): DesignStudioState => ({
  query: "", photos: [], selectedUrls: [], feedback: "", brief: "", updatedAt: Date.now(),
});

function asMarkdown(projectName: string, studio: DesignStudioState) {
  const chosen = studio.photos.filter((photo) => studio.selectedUrls.includes(photo.url));
  return [
    "# Visual design brief",
    "",
    `**Project:** ${projectName}`,
    `**Research query:** ${studio.query || "Not set"}`,
    "",
    "## Design direction",
    studio.brief.trim() || "Design direction not yet written. Use the selected references and feedback below to define it.",
    "",
    "## Selected references",
    ...(chosen.length ? chosen.flatMap((photo) => [
      `- [${photo.alt || photo.source}](${photo.url}) — ${photo.credit}; source: ${photo.source}`,
    ]) : ["- No references selected yet."]),
    "",
    "## What to keep, change, or avoid",
    studio.feedback.trim() || "No feedback recorded yet.",
    "",
    "## Implementation guidance",
    "- Treat references as inspiration, not assets to copy blindly.",
    "- Preserve project functionality and responsive behavior.",
    "- Ask before making a materially different design choice.",
    "- Verify the implementation with the available checks before reporting it as complete.",
    "",
  ].join("\n");
}

export function VisualIntentStudio() {
  const state = db.useKuro();
  const project = db.project();
  const saved = project.designStudio;
  const [query, setQuery] = useState(saved?.query || "");
  const [photos, setPhotos] = useState<Photo[]>(saved?.photos || []);
  const [selectedUrls, setSelectedUrls] = useState<string[]>(saved?.selectedUrls || []);
  const [feedback, setFeedback] = useState(saved?.feedback || "");
  const [brief, setBrief] = useState(saved?.brief || "");
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [source, setSource] = useState(saved?.photos?.[0]?.source || "");
  const [failedImages, setFailedImages] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const next = db.project().designStudio;
    setQuery(next?.query || "");
    setPhotos(next?.photos || []);
    setSelectedUrls(next?.selectedUrls || []);
    setFeedback(next?.feedback || "");
    setBrief(next?.brief || "");
    setSource(next?.photos?.[0]?.source || "");
    setError("");
    setFailedImages([]);
  }, [project.id]);

  const chosen = useMemo(() => photos.filter((photo) => selectedUrls.includes(photo.url)), [photos, selectedUrls]);

  const persist = (patch: Partial<DesignStudioState> = {}) => {
    const current = db.project();
    const existing = current.designStudio || emptyStudio();
    db.updateProject(current.id, {
      designStudio: {
        ...existing,
        query,
        photos,
        selectedUrls,
        feedback,
        brief,
        ...patch,
        updatedAt: Date.now(),
      },
    });
  };

  const search = async () => {
    const clean = query.trim();
    if (!clean) {
      setError("Describe the look, subject, or kind of interface you want to research.");
      return;
    }
    setSearching(true);
    setError("");
    setFailedImages([]);
    try {
      const result = await findPhotos(clean, 6);
      if (!result.photos.length) {
        setError("No references came back. Check your connection or try a more concrete search (for example, “minimal dark finance dashboard UI”). Existing selections have been kept.");
        setSource(result.source);
        return;
      }
      setPhotos(result.photos);
      setSource(result.source);
      const nextSelected = selectedUrls.filter((url) => result.photos.some((photo) => photo.url === url));
      setSelectedUrls(nextSelected);
      const current = db.project();
      const old = current.designStudio || emptyStudio();
      db.updateProject(current.id, {
        designStudio: {
          ...old, query: clean, photos: result.photos, selectedUrls: nextSelected,
          feedback, brief, updatedAt: Date.now(),
        },
      });
      toast({ title: "References found", description: `Loaded ${result.photos.length} results from ${result.source}.` });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reference search failed. Please try again.");
    } finally {
      setSearching(false);
    }
  };

  const togglePhoto = (url: string) => {
    const next = selectedUrls.includes(url) ? selectedUrls.filter((item) => item !== url) : [...selectedUrls, url];
    setSelectedUrls(next);
    persist({ selectedUrls: next });
  };

  const saveBrief = () => {
    const current = db.project();
    const next: DesignStudioState = {
      query, photos, selectedUrls, feedback, brief, updatedAt: Date.now(),
    };
    db.updateProject(current.id, { designStudio: next });
    db.writeFile("DESIGN_BRIEF.md", asMarkdown(current.name, next));
    toast({ title: "Design brief saved", description: "Saved to this project and written to DESIGN_BRIEF.md for Kuro-chan to use during implementation." });
  };

  const clearSelection = () => {
    setSelectedUrls([]);
    persist({ selectedUrls: [] });
  };

  return (
    <section data-testid="visual-intent-studio" className="h-full min-h-0 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 pb-10 sm:p-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-primary/20 bg-primary/10 text-primary"><Palette className="h-5 w-5" /></div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Visual Intent Studio</h1>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">Research real visual references, choose what resonates, explain what to change, and save a brief Kuro-chan can use while building your project.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground"><BookmarkCheck className="h-3.5 w-3.5" /> Saved per project</div>
        </header>

        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <label htmlFor="visual-reference-query" className="mb-2 block text-sm font-medium">What should we look for?</label>
          <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(event) => { event.preventDefault(); void search(); }}>
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input id="visual-reference-query" data-testid="visual-reference-query" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="e.g. editorial manga reader, warm bakery landing page…" className="h-11 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary/60" />
            </div>
            <button data-testid="visual-reference-search" type="submit" disabled={searching} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60">
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}{searching ? "Searching…" : "Find references"}
            </button>
          </form>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Searches existing connected image sources and public image indexes. Results include source and attribution where available; image availability and licensing terms can vary.</p>
          {error && <div role="alert" className="mt-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}
          {source && photos.length > 0 && <p className="mt-3 text-xs text-muted-foreground">Current result source: <span className="font-medium text-foreground">{source}</span>. Images that fail to load are marked individually; open the source link to inspect the original.</p>}
        </div>

        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Reference board <span className="ml-1 text-sm font-normal text-muted-foreground">({chosen.length} selected)</span></h2>
            <p className="mt-1 text-xs text-muted-foreground">Select multiple references. Selection is a design decision, not a request to copy an image verbatim.</p>
          </div>
          {chosen.length > 0 && <button type="button" onClick={clearSelection} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted"><X className="h-3.5 w-3.5" /> Clear selection</button>}
        </div>

        {photos.length ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {photos.map((photo, index) => {
              const selected = selectedUrls.includes(photo.url);
              const failed = failedImages.includes(photo.url);
              return <article key={photo.url} data-testid={`visual-reference-${index}`} className={`overflow-hidden rounded-2xl border bg-card transition-colors ${selected ? "border-primary ring-1 ring-primary/40" : "border-border"}`}>
                <button type="button" aria-pressed={selected} onClick={() => togglePhoto(photo.url)} className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  <div className="relative grid aspect-[4/3] place-items-center overflow-hidden bg-muted">
                    {failed ? <div className="flex flex-col items-center gap-2 p-4 text-center text-xs text-muted-foreground"><ImageOff className="h-6 w-6" />Preview unavailable. Open the source to inspect it.</div> : <img src={photo.thumb || photo.url} alt={photo.alt || "Visual reference"} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailedImages((old) => old.includes(photo.url) ? old : [...old, photo.url])} className="h-full w-full object-cover" />}
                    <span className={`absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full border shadow-sm ${selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background/90 text-muted-foreground"}`}>{selected ? <Check className="h-4 w-4" /> : <span className="text-xs">{index + 1}</span>}</span>
                    <span className="absolute bottom-2 left-2 rounded-full bg-background/90 px-2 py-1 text-[10px] font-medium text-foreground">{photo.source}</span>
                  </div>
                  <div className="space-y-1 p-3">
                    <p className="line-clamp-2 text-sm font-medium">{photo.alt || `Reference ${index + 1}`}</p>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{photo.credit}</p>
                  </div>
                </button>
                <div className="border-t border-border px-3 py-2">
                  <a href={photo.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline" onClick={(event) => event.stopPropagation()}>Open original <ExternalLink className="h-3 w-3" /></a>
                </div>
              </article>;
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border px-6 py-12 text-center">
            <Sparkles className="h-8 w-8 text-muted-foreground/70" />
            <p className="mt-3 text-sm font-medium">Your inspiration board starts here</p>
            <p className="mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">Search for a style, interface, mood, or subject. Kuro-chan will use the returned real references rather than inventing a gallery.</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /><h2 className="text-sm font-semibold">What should the design feel like?</h2></div>
            <label htmlFor="visual-design-brief" className="mb-1.5 block text-xs font-medium text-muted-foreground">Direction and priorities</label>
            <textarea id="visual-design-brief" data-testid="visual-design-brief" value={brief} onChange={(event) => { setBrief(event.target.value); }} onBlur={() => persist({ brief })} rows={6} placeholder="Describe layout, color, density, typography, atmosphere, mobile behavior, and anything that must stay easy to use…" className="w-full resize-y rounded-xl border border-border bg-background p-3 text-sm leading-relaxed outline-none focus:border-primary/60" />
            <p className="mt-2 text-xs text-muted-foreground">Tip: imperfect wording is fine. Capture the intent first; refine it later.</p>
          </section>
          <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /><h2 className="text-sm font-semibold">Keep, change, avoid</h2></div>
            <label htmlFor="visual-design-feedback" className="mb-1.5 block text-xs font-medium text-muted-foreground">Feedback on selected references</label>
            <textarea id="visual-design-feedback" data-testid="visual-design-feedback" value={feedback} onChange={(event) => setFeedback(event.target.value)} onBlur={() => persist({ feedback })} rows={6} placeholder="I like the spacing from the first one, the colors from the second, but avoid tiny text and crowded menus…" className="w-full resize-y rounded-xl border border-border bg-background p-3 text-sm leading-relaxed outline-none focus:border-primary/60" />
            <p className="mt-2 text-xs text-muted-foreground">Your notes stay with this project so they can inform later changes.</p>
          </section>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <h2 className="text-sm font-semibold">Turn the choices into a usable brief</h2>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">Save the selected references, attribution, design direction, and feedback to this project and write DESIGN_BRIEF.md into its editable files. Kuro-chan can then read the brief during implementation.</p>
          </div>
          <button data-testid="visual-design-save" type="button" onClick={saveBrief} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"><Check className="h-4 w-4" /> Save design brief</button>
        </div>
        <div className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"><RefreshCw className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Project state: {state.ready ? "ready" : "initializing"}. Design notes and selected references are stored with the active project; remote image URLs still depend on the original providers remaining available.</div>
      </div>
    </section>
  );
}
