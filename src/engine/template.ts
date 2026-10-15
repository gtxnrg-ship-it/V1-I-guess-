export type StarterVariant = "starter" | "paytm" | "saas" | "ops";

const appForVariant = (name: string, variant: StarterVariant): string => {
  const title = name;

  if (variant === "paytm") {
    return `import { ArrowUpRight, Bell, CircleDollarSign, CreditCard, Download, ShieldCheck, WalletCards, Zap } from "lucide-react";

export default function App() {
  const items = [
    { label: "Wallet", value: "$12,480.20", trend: "+8.2%" },
    { label: "Cards", value: "$3,240.80", trend: "+2.3%" },
    { label: "Savings", value: "$18,900.00", trend: "+11.7%" },
  ];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.15),_transparent_35%),linear-gradient(180deg,#f8fafc_0%,#eff6ff_100%)] px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex items-center justify-between rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-sky-600">${title}</p>
            <h1 className="mt-1 text-2xl font-semibold">Wallet</h1>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-slate-900 px-3 py-2 text-sm text-white">
            <Bell className="h-4 w-4" />
            3 alerts
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          {items.map((item) => (
            <div key={item.label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between text-sm text-slate-500">
                <span>{item.label}</span>
                <CircleDollarSign className="h-4 w-4 text-sky-600" />
              </div>
              <div className="mt-4 text-3xl font-semibold">{item.value}</div>
              <div className="mt-1 text-sm font-medium text-emerald-600">{item.trend}</div>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-300">Total balance</p>
                <h2 className="mt-2 text-4xl font-semibold">$34,621.02</h2>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                <WalletCards className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-6 flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Card ending in 1842</p>
                <p className="mt-2 text-xl font-medium">Visa Platinum</p>
              </div>
              <CreditCard className="h-6 w-6 text-sky-300" />
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Instant transfer</span>
                <Zap className="h-4 w-4 text-amber-500" />
              </div>
              <button className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 px-4 py-3 text-sm font-medium text-white">
                Send money <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Protected transfers
              </div>
              <p className="mt-3 text-lg font-semibold">3-step verification</p>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            { title: "Pay bills", note: "Autopay ready at 8:00 AM" },
            { title: "Top up", note: "Fast from your bank" },
            { title: "Download", note: "CSV statements ready" },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 inline-flex rounded-xl bg-sky-100 p-2 text-sky-700"><Download className="h-4 w-4" /></div>
              <h3 className="text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm text-slate-500">{item.note}</p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
`;
  }

  if (variant === "saas") {
    return `import { BarChart3, Bolt, ChevronRight, LayoutGrid, MessageSquare, Rocket, Users } from "lucide-react";

export default function App() {
  const metrics = [
    { label: "Active users", value: "24.8K", delta: "+18.2%" },
    { label: "MRR", value: "$86.5K", delta: "+9.4%" },
    { label: "Conversion", value: "7.1%", delta: "+1.6%" },
  ];

  const items = [
    { name: "Pipeline", value: "86%" },
    { name: "Tasks", value: "394" },
    { name: "Satisfaction", value: "4.9/5" },
  ];

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-slate-50">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-sky-400">${title}</p>
            <h1 className="mt-2 text-3xl font-semibold">Revenue dashboard</h1>
          </div>
          <button className="inline-flex items-center gap-2 rounded-2xl bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950">
            Launch campaign <ChevronRight className="h-4 w-4" />
          </button>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          {metrics.map((m) => (
            <div key={m.label} className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-sm text-slate-400">{m.label}</p>
              <div className="mt-4 flex items-end justify-between">
                <span className="text-3xl font-semibold">{m.value}</span>
                <span className="text-sm font-medium text-emerald-400">{m.delta}</span>
              </div>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_0.7fr]">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Performance</p>
                <h2 className="mt-2 text-2xl font-semibold">Quarterly overview</h2>
              </div>
              <BarChart3 className="h-6 w-6 text-sky-400" />
            </div>
            <div className="grid grid-cols-6 items-end gap-3 pt-8">
              <div className="flex flex-col items-center gap-3"><div className="w-full rounded-t-2xl bg-gradient-to-t from-sky-500 to-cyan-300" style={{ height: "30px" }} /><span className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Q1</span></div>
              <div className="flex flex-col items-center gap-3"><div className="w-full rounded-t-2xl bg-gradient-to-t from-sky-500 to-cyan-300" style={{ height: "45px" }} /><span className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Q2</span></div>
              <div className="flex flex-col items-center gap-3"><div className="w-full rounded-t-2xl bg-gradient-to-t from-sky-500 to-cyan-300" style={{ height: "55px" }} /><span className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Q3</span></div>
              <div className="flex flex-col items-center gap-3"><div className="w-full rounded-t-2xl bg-gradient-to-t from-sky-500 to-cyan-300" style={{ height: "60px" }} /><span className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Q4</span></div>
              <div className="flex flex-col items-center gap-3"><div className="w-full rounded-t-2xl bg-gradient-to-t from-sky-500 to-cyan-300" style={{ height: "72px" }} /><span className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Q5</span></div>
              <div className="flex flex-col items-center gap-3"><div className="w-full rounded-t-2xl bg-gradient-to-t from-sky-500 to-cyan-300" style={{ height: "92px" }} /><span className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Q6</span></div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex items-center gap-2 text-sky-400"><Bolt className="h-4 w-4" /> Quick actions</div>
              <div className="mt-4 space-y-3">
                {items.map((item) => (
                  <div key={item.name} className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm">
                    <span>{item.name}</span>
                    <span className="text-sky-400">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex items-center gap-2 text-slate-300"><Users className="h-4 w-4" /> Team</div>
              <div className="mt-4 flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-sky-500 text-sm font-medium text-slate-950">A</div>
                <div>
                  <div className="font-medium">Ava Stone</div>
                  <div className="text-sm text-slate-400">Growth lead</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <footer className="mt-8 flex items-center justify-between rounded-3xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-300">
          <div className="flex items-center gap-2"><LayoutGrid className="h-4 w-4 text-sky-400" /> Workspace health is strong</div>
          <button className="inline-flex items-center gap-2 text-sky-400"><MessageSquare className="h-4 w-4" /> 14 new comments</button>
          <button className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2"><Rocket className="h-4 w-4" /> Ship</button>
        </footer>
      </div>
    </main>
  );
}
`;
  }

  if (variant === "ops") {
    return `import { Activity, AlertTriangle, ArrowRight, CheckCircle2, ShieldCheck, Users2 } from "lucide-react";

export default function App() {
  const services = [
    { name: "API gateway", status: "Healthy", level: "99.98%" },
    { name: "Payments", status: "Watch", level: "98.4%" },
    { name: "Notifications", status: "Healthy", level: "99.9%" },
  ];

  const alerts = [
    "Latency above threshold on eu-west-2",
    "Two failed deploys in the last 24h",
    "1 new customer support escalation",
  ];

  return (
    <main className="min-h-screen bg-slate-900 px-6 py-8 text-slate-50">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex items-center justify-between rounded-3xl border border-slate-800 bg-slate-950 p-5 shadow-lg shadow-slate-950/30">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-amber-400">${title}</p>
            <h1 className="mt-2 text-3xl font-semibold">Operations command center</h1>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
            <Activity className="h-4 w-4" /> System stable
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5"><p className="text-sm text-slate-400">Uptime</p><div className="mt-5 text-3xl font-semibold">99.98%</div></div>
          <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5"><p className="text-sm text-slate-400">Incidents</p><div className="mt-5 text-3xl font-semibold">3</div></div>
          <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5"><p className="text-sm text-slate-400">Queue</p><div className="mt-5 text-3xl font-semibold">224</div></div>
          <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5"><p className="text-sm text-slate-400">SLA</p><div className="mt-5 text-3xl font-semibold">96.1%</div></div>
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Service health</h2>
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
            </div>
            <div className="space-y-4">
              {services.map((s) => (
                <div key={s.name} className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900 p-4">
                  <div>
                    <div className="font-medium">{s.name}</div>
                    <div className="mt-1 text-sm text-slate-400">{s.status}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold">{s.level}</div>
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-500">uptime</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
              <div className="flex items-center gap-2 text-amber-300"><AlertTriangle className="h-4 w-4" /> Active alerts</div>
              <ul className="mt-4 space-y-3">
                {alerts.map((a) => (
                  <li key={a} className="flex items-start gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-3 text-sm text-slate-300">
                    <span className="mt-0.5"><AlertTriangle className="h-4 w-4 text-amber-400" /></span>
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
              <div className="flex items-center gap-2 text-emerald-300"><Users2 className="h-4 w-4" /> On-call</div>
              <div className="mt-4 flex items-center justify-between">
                <div>
                  <div className="font-medium">North America</div>
                  <div className="text-sm text-slate-400">Team 5</div>
                </div>
                <div className="flex items-center gap-2 text-emerald-300"><CheckCircle2 className="h-4 w-4" /> Ready</div>
              </div>
            </div>
          </div>
        </section>

        <footer className="mt-8 flex items-center justify-between rounded-3xl border border-slate-800 bg-slate-950 p-5 text-sm text-slate-300">
          <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Change windows scheduled</div>
          <button className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-3 py-2 text-sm font-medium text-slate-950">
            Review queue <ArrowRight className="h-4 w-4" />
          </button>
        </footer>
      </div>
    </main>
  );
}
`;
  }

  return `import { Sparkles } from "lucide-react";

export default function App() {
  return (
    <main className="grid min-h-screen place-items-center px-6">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 grid h-12 w-12 place-items-center rounded-2xl bg-fg text-bg">
          <Sparkles className="h-5 w-5" />
        </div>
        <h1 className="font-display text-4xl tracking-tight">${title}</h1>
        <p className="mt-3 text-muted">Tell Kuro-chan what you want. She'll ask a few questions, then build it here.</p>
      </div>
    </main>
  );
}
`;
};

export function starterFiles(name = "My App", variant: StarterVariant = "starter"): Record<string, string> {
  return {
    "index.html": `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${name}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400..700&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
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

export default defineConfig({ plugins: [react()], base: "./", resolve: { alias: { "@": path.resolve(__dirname, "src") } } });
`,
    "tsconfig.json": JSON.stringify({ compilerOptions: { target: "ES2020", module: "ESNext", moduleResolution: "bundler", jsx: "react-jsx", strict: false, skipLibCheck: true, baseUrl: ".", paths: { "@/*": ["src/*"] } }, include: ["src"] }, null, 2) + "\n",
    "src/main.tsx": `import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
`,
    "src/index.css": `:root {
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
    "src/App.tsx": appForVariant(name, variant),
    "README.md": `# ${name}

Built with [Kuro-chan](https://github.com/gtxnrg-ship-it/V1-I-guess-), an open-source AI app builder.

## Getting started

Requirements: Node.js 20 or newer and npm.

\`\`\`bash
npm install
npm run dev
\`\`\`

Create and preview a production build:

\`\`\`bash
npm run build
npm run preview
\`\`\`

## Project structure

- \`src/App.tsx\` — main application UI and flows
- \`src/components/\` — reusable UI components
- \`src/index.css\` — global styles and design tokens
- \`index.html\` — app document and metadata

## Configuration and secrets

If this app needs environment variables, document their names and purpose here and provide safe example values in \`.env.example\`. Keep real local values in \`.env\`; it is ignored by Git. Never commit API keys, access tokens, passwords, or server-side secrets.

Variables prefixed with \`VITE_\` are bundled into browser code and must be treated as public. Never put privileged service-role keys or private server credentials in them.

## Build and deploy

This project builds to static files in \`dist/\`. Use Kuro-chan's Publish action to create or update a GitHub repository and configure the website / Android build workflows. Add app-specific backend setup, database schema, and deployment instructions here if your project uses external services.

## About

Generated with Kuro-chan. Customize this README to describe the app's purpose, main features, setup steps, and any external services it requires.
`,
    ".gitignore": "node_modules\ndist\nandroid\n.env\n.env.*\n!.env.example\n*.local\n",
  };
}
