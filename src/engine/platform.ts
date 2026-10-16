/**
 * Cross-platform capability contract.
 *
 * Detecting a shell is not proof that a native capability is available. Adapters must
 * register concrete operations before the core advertises secure storage, native files,
 * local inference, or background execution as supported.
 */
export type PlatformKind = "android" | "ios" | "linux" | "windows" | "macos" | "web" | "unknown";
export type PlatformCapability =
  | "secure-storage"
  | "app-private-files"
  | "local-inference"
  | "background-tasks"
  | "notifications"
  | "native-http";

export interface CapabilityStatus {
  supported: boolean;
  reason: string;
}

export interface PlatformDescriptor {
  kind: PlatformKind;
  shell: "capacitor" | "tauri" | "web" | "unknown";
  capabilities: Record<PlatformCapability, CapabilityStatus>;
}

export interface PlatformAdapter {
  describe(): PlatformDescriptor;
  secureStorage?: {
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<void>;
    remove(key: string): Promise<void>;
  };
  privateFiles?: {
    availableBytes(): Promise<number | null>;
    exists(path: string): Promise<boolean>;
    remove(path: string): Promise<void>;
  };
  localInference?: {
    installedModels(): Promise<Array<{ id: string; version?: string }>>;
    load(modelId: string): Promise<void>;
    unload(modelId: string): Promise<void>;
    generate(modelId: string, prompt: string, options?: { signal?: AbortSignal; maxTokens?: number }): AsyncIterable<string>;
  };
}

const UNSUPPORTED = (reason: string): CapabilityStatus => ({ supported: false, reason });
const EMPTY_CAPABILITIES = (): Record<PlatformCapability, CapabilityStatus> => ({
  "secure-storage": UNSUPPORTED("No secure-storage adapter has registered a working implementation."),
  "app-private-files": UNSUPPORTED("No app-private filesystem adapter has registered a working implementation."),
  "local-inference": UNSUPPORTED("No compatible local inference runtime has registered a working implementation."),
  "background-tasks": UNSUPPORTED("Background execution has not been verified for this platform."),
  notifications: UNSUPPORTED("No notification adapter has registered a working implementation."),
  "native-http": UNSUPPORTED("No native HTTP adapter has registered a working implementation."),
});

function runtimeGlobals(): { capacitor?: any; tauri?: any } {
  if (typeof window === "undefined") return {};
  const w = window as Window & { Capacitor?: any; __TAURI_INTERNALS__?: unknown; __TAURI__?: unknown };
  return { capacitor: w.Capacitor, tauri: w.__TAURI_INTERNALS__ || w.__TAURI__ };
}

export function detectPlatform(userAgent = typeof navigator === "undefined" ? "" : navigator.userAgent, globals = runtimeGlobals()): PlatformDescriptor {
  const ua = userAgent.toLowerCase();
  const cap = globals.capacitor;
  const isNativeCapacitor = Boolean(cap?.isNativePlatform?.());
  const capPlatform = isNativeCapacitor ? String(cap?.getPlatform?.() || "").toLowerCase() : "";
  let kind: PlatformKind = "unknown";
  if (isNativeCapacitor && capPlatform === "android") kind = "android";
  else if (isNativeCapacitor && capPlatform === "ios") kind = "ios";
  else if (/linux/.test(ua) && !/android/.test(ua)) kind = "linux";
  else if (/windows/.test(ua)) kind = "windows";
  else if (/macintosh|mac os x/.test(ua) && !/iphone|ipad/.test(ua)) kind = "macos";
  else if (/android/.test(ua)) kind = "android";
  else if (/iphone|ipad|ipod/.test(ua)) kind = "ios";
  else if (ua) kind = "web";

  const shell: PlatformDescriptor["shell"] = isNativeCapacitor
    ? "capacitor"
    : globals.tauri
      ? "tauri"
      : ua
        ? "web"
        : "unknown";

  // Shell detection intentionally does not mark capabilities as supported.
  // A later native adapter must replace these statuses only after checking its plugin/runtime.
  return { kind, shell, capabilities: EMPTY_CAPABILITIES() };
}

let activeAdapter: PlatformAdapter | null = null;

export function registerPlatformAdapter(adapter: PlatformAdapter): () => void {
  const previous = activeAdapter;
  activeAdapter = adapter;
  return () => {
    if (activeAdapter === adapter) activeAdapter = previous;
  };
}

export function platformAdapter(): PlatformAdapter | null {
  return activeAdapter;
}

export function platformDescriptor(): PlatformDescriptor {
  return activeAdapter?.describe() ?? detectPlatform();
}

export function capabilityStatus(capability: PlatformCapability): CapabilityStatus {
  return platformDescriptor().capabilities[capability] ?? UNSUPPORTED("Capability status is unavailable.");
}

export function requireCapability(capability: PlatformCapability): void {
  const status = capabilityStatus(capability);
  if (!status.supported) throw new Error(`${capability} is unavailable: ${status.reason}`);
}
