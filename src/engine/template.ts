// The starter every new app begins from: a tiny, tasteful design system the agents build on,
// so even a weak model starts with good parts instead of a blank page.
export function starterFiles(name = "My App"): Record<string, string> {
  return {
    "index.html": `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${name}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400..700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
      // Design tokens live in src/index.css as CSS variables; Tailwind reads them here.
      tailwind.config = {
        darkMode: "class",
        theme: {
          extend: {
            colors: {
              bg: "rgb(var(--bg) / <alpha-value>)",
              surface: "rgb(var(--surface) / <alpha-value>)",
              fg: "rgb(var(--fg) / <alpha-value>)",
              muted: "rgb(var(--muted) / <alpha-value>)",
              line: "rgb(var(--line) / <alpha-value>)",
              accent: "rgb(var(--accent) / <alpha-value>)",
              "accent-fg": "rgb(var(--accent-fg) / <alpha-value>)",
            },
            fontFamily: { display: ["var(--font-display)"], sans: ["var(--font-body)"] },
            borderRadius: { xl: "var(--radius)", "2xl": "calc(var(--radius) * 1.5)" },
          },
        },
      };
    </script>
  </head>
  <body class="bg-bg text-fg font-sans antialiased">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`,
    "package.json": JSON.stringify({
      name: name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "my-app", private: true, version: "0.1.0", type: "module",
      scripts: { dev: "vite", build: "vite build", preview: "vite preview" },
      dependencies: { react: "^18.3.1", "react-dom": "^18.3.1", "lucide-react": "^0.453.0" },
      devDependencies: { vite: "^5.4.0", "@vitejs/plugin-react": "^4.3.0", typescript: "^5.6.0", "@types/react": "^18.3.0", "@types/react-dom": "^18.3.0" },
    }, null, 2) + "\n",
    "vite.config.ts": `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// base "./" works for GitHub Pages sub-paths and inside the Android app
export default defineConfig({ plugins: [react()], base: "./", resolve: { alias: { "@": path.resolve(__dirname, "src") } } });
`,
    "tsconfig.json": JSON.stringify({ compilerOptions: { target: "ES2020", module: "ESNext", moduleResolution: "bundler", jsx: "react-jsx", strict: false, skipLibCheck: true, baseUrl: ".", paths: { "@/*": ["src/*"] } }, include: ["src"] }, null, 2) + "\n",
    "src/main.tsx": `import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
`,
    "src/index.css": `/* Design tokens. Change these to restyle the whole app. Values are "R G B". */
:root {
  --bg: 250 248 244;
  --surface: 255 255 255;
  --fg: 28 25 23;
  --muted: 120 113 108;
  --line: 231 229 228;
  --accent: 194 65 12;
  --accent-fg: 255 255 255;
  --radius: 14px;
  --font-display: "Fraunces", Georgia, serif;
  --font-body: "Inter", system-ui, sans-serif;
}
.dark {
  --bg: 18 17 16;
  --surface: 28 27 25;
  --fg: 245 245 244;
  --muted: 168 162 158;
  --line: 48 46 43;
}
html { scroll-behavior: smooth; }
body { -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; }
::selection { background: rgb(var(--accent) / 0.2); }
`,
    "src/lib/cn.ts": `export const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
`,
    "src/components/ui/Button.tsx": `import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost"; size?: "sm" | "md" | "lg" };

export function Button({ variant = "primary", size = "md", className, ...p }: Props) {
  return (
    <button
      {...p}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]",
        size === "sm" && "h-9 px-3.5 text-sm",
        size === "md" && "h-11 px-5 text-[15px]",
        size === "lg" && "h-13 px-7 text-base py-3.5",
        variant === "primary" && "bg-accent text-accent-fg shadow-sm hover:brightness-110",
        variant === "secondary" && "bg-surface text-fg border border-line hover:border-fg/20",
        variant === "ghost" && "text-fg hover:bg-fg/5",
        className,
      )}
    />
  );
}
`,
    "src/components/ui/Card.tsx": `import { cn } from "@/lib/cn";
import type { HTMLAttributes } from "react";

export function Card({ className, ...p }: HTMLAttributes<HTMLDivElement>) {
  return <div {...p} className={cn("rounded-2xl border border-line bg-surface p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]", className)} />;
}
`,
    "src/components/ui/Badge.tsx": `import { cn } from "@/lib/cn";
import type { HTMLAttributes } from "react";

export function Badge({ className, ...p }: HTMLAttributes<HTMLSpanElement>) {
  return <span {...p} className={cn("inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-muted", className)} />;
}
`,
    "src/components/ui/Input.tsx": `import { cn } from "@/lib/cn";
import type { InputHTMLAttributes } from "react";

export function Input({ className, ...p }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...p} className={cn("h-11 w-full rounded-xl border border-line bg-surface px-4 text-[15px] text-fg placeholder:text-muted/70 outline-none transition focus:border-accent/60 focus:ring-4 focus:ring-accent/10", className)} />;
}
`,
    "src/components/ui/Section.tsx": `import { cn } from "@/lib/cn";
import type { HTMLAttributes } from "react";

export function Container({ className, ...p }: HTMLAttributes<HTMLDivElement>) {
  return <div {...p} className={cn("mx-auto w-full max-w-6xl px-5 sm:px-8", className)} />;
}
export function Section({ className, ...p }: HTMLAttributes<HTMLElement>) {
  return <section {...p} className={cn("py-16 sm:py-24", className)} />;
}
`,
    "src/App.tsx": `import { Sparkles } from "lucide-react";

export default function App() {
  return (
    <main className="grid min-h-screen place-items-center px-6">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 grid h-12 w-12 place-items-center rounded-2xl bg-fg text-bg">
          <Sparkles className="h-5 w-5" />
        </div>
        <h1 className="font-display text-4xl tracking-tight">A blank canvas</h1>
        <p className="mt-3 text-muted">Tell Kuro-chan what you want. She'll ask a few questions, then build it here.</p>
      </div>
    </main>
  );
}
`,
    "README.md": `# ${name}\n\nBuilt with Kuro-chan.\n`,
    ".gitignore": "node_modules\ndist\nandroid\n",
  };
}
