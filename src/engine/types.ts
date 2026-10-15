export interface ModelInfo {
  id: string;
  name?: string;
  context?: number;
  tools?: boolean;
  reasoning?: boolean;
  vision?: boolean;
  free?: boolean;
  power: number; // 0-100 heuristic
  speed: number; // 0-100 heuristic
}

export type Role = "talk" | "research" | "plan" | "code" | "check";
export type AgentName = "Talker" | "Researcher" | "Planner" | "Builder" | "Checker";

export interface Question { id: string; q: string; options: string[]; multi?: boolean }
export interface Brief {
  title: string;
  summary: string;
  features: string[];
  design: string;
  backend?: string;
  size: "quick" | "full";
}
export interface PlanStep { title: string; detail?: string; files?: string[]; status: "todo" | "doing" | "done" | "error" }

export type Block =
  | { type: "thinking"; text: string; ms: number; done: boolean }
  | { type: "text"; text: string }
  | { type: "tool"; id: string; name: string; title: string; status: "running" | "ok" | "error"; detail?: string; args?: string; stat?: string; ms?: number; sources?: { title: string; url: string }[]; thumbs?: { label: string; url: string }[] }
  | { type: "route"; text: string }
  | { type: "agent"; name: AgentName; label: string }
  | { type: "questions"; id: string; items: Question[]; answered?: boolean }
  | { type: "brief"; id: string; brief: Brief; status: "pending" | "approved" | "changed" }
  | { type: "plan"; title: string; steps: PlanStep[] }
  | { type: "sql"; title: string; sql: string }
  | { type: "upgrade"; title: string; summary: string; files: Record<string, string | null>; status: "ready" | "shipping" | "shipped" | "error"; pr?: string; prNumber?: number; error?: string };

export interface ModelUsed { provider: string; providerName: string; keyLabel: string; keyId: string; model: string; role: Role }

export interface AssistantData {
  blocks: Block[];
  models: ModelUsed[];
  ms?: number;
  done?: boolean;
  error?: string;
  snapshotId?: string;
  filesChanged?: number;
}

/** Element the creator tapped in the preview. */
export interface PickedElement { tag: string; text: string; classes: string; path: string; html: string }

export interface Img { mime: string; data: string } // base64, no data: prefix

export interface KeyRec {
  id: string;
  label: string;
  kind: "ai" | "github" | "tool" | "secret";
  provider: string;
  baseUrl?: string;
  secret: string;
  hint: string;
  models: ModelInfo[];
  status: "active" | "cooling" | "error" | "disabled";
  statusMsg?: string;
  requests: number;
  errors: number;
  login?: string;
  createdAt: number;
}

export interface Project {
  id: string;
  name: string;
  repo: string | null;
  /** Last remote commit observed when importing or successfully publishing this project. */
  repoBaseSha?: string;
  shipped?: boolean;
  privateRepo?: boolean;
  env: Record<string, string>;
  files: Record<string, string>;
  createdAt: number;
  updatedAt: number;
}

export interface Message {
  id: string;
  projectId: string;
  role: "user" | "assistant";
  content: string;
  images?: Img[];
  picked?: PickedElement | null;
  data?: AssistantData;
  createdAt: number;
}

export interface Snapshot { id: string; projectId: string; label: string; files: Record<string, string>; createdAt: number }

export interface UsageDay { calls: number; input: number; output: number; errors: number }

export interface Settings {
  activeProject: string;
  freeStarter: boolean;
  roleOverrides: Partial<Record<Role, string>>; // "keyId::modelId"
  usage: Record<string, Record<string, UsageDay>>; // day -> keyId -> usage
  voiceProvider?: "browser" | "openai";
  voiceModel?: string;
  voiceName?: string;
  adminEmail?: string;
  adminUnlocked?: boolean;
  eggFound?: boolean;
  selfRepo?: string;
}
