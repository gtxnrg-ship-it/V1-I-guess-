import { capabilityStatus, detectPlatform, registerPlatformAdapter, platformAdapter, platformDescriptor, requireCapability, type PlatformAdapter } from "./platform";

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

function run() {
  const android = detectPlatform("Mozilla/5.0 (Linux; Android 11; Mobile)", {
    capacitor: { isNativePlatform: () => true, getPlatform: () => "android" },
  });
  assert(android.kind === "android" && android.shell === "capacitor", "detects native Capacitor Android");
  assert(!android.capabilities["local-inference"].supported, "does not infer local inference from Android alone");

  const linux = detectPlatform("Mozilla/5.0 (X11; Linux x86_64)", {});
  assert(linux.kind === "linux" && linux.shell === "web", "recognizes Linux browser without claiming desktop shell");
  const tauri = detectPlatform("Mozilla/5.0 (X11; Linux x86_64)", { tauri: {} });
  assert(tauri.shell === "tauri", "detects Tauri desktop shell");
  const unknown = detectPlatform("", {});
  assert(unknown.kind === "unknown" && unknown.shell === "unknown", "handles missing runtime globals");

  const adapter: PlatformAdapter = {
    describe: () => ({
      kind: "android",
      shell: "capacitor",
      capabilities: {
        "secure-storage": { supported: true, reason: "Native secure storage plugin loaded." },
        "app-private-files": { supported: true, reason: "App-private file adapter loaded." },
        "local-inference": { supported: false, reason: "No inference engine installed." },
        "background-tasks": { supported: false, reason: "Not verified." },
        notifications: { supported: false, reason: "Not configured." },
        "native-http": { supported: false, reason: "Not configured." },
      },
    }),
  };
  const unregister = registerPlatformAdapter(adapter);
  assert(platformAdapter() === adapter, "registers platform adapter");
  assert(platformDescriptor().capabilities["secure-storage"].supported, "reports only adapter-declared capabilities");
  assert(!capabilityStatus("local-inference").supported, "keeps unsupported capabilities explicit");
  let threw = false;
  try { requireCapability("local-inference"); } catch (error) { threw = String(error).includes("No inference engine installed"); }
  assert(threw, "fails clearly when required capability is absent");
  unregister();
  assert(platformAdapter() === null, "restores previous adapter after unregister");

  console.log("platform capability contract tests passed");
}
run();
