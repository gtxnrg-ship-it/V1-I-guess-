// Exercise the store persistence path with an asynchronous IndexedDB fake.
const values = new Map<string, unknown>();
let failWrites = false;
const fakeDb: any = {
  createObjectStore: () => ({}),
  transaction: (_store: string, mode: string) => {
    const tx: any = {
      mode,
      objectStore: () => ({
        put: (value: unknown, key: string) => {
          queueMicrotask(() => {
            if (failWrites) {
              tx.onerror?.(new Error("simulated quota/write failure"));
              tx.onabort?.();
            } else {
              values.set(key, structuredClone(value));
              tx.oncomplete?.();
            }
          });
        },
        delete: (key: string) => {
          queueMicrotask(() => {
            if (failWrites) {
              tx.onerror?.(new Error("simulated quota/delete failure"));
              tx.onabort?.();
            } else {
              values.delete(key);
              tx.oncomplete?.();
            }
          });
        },
        openCursor: () => {
          const request: any = {};
          const entries = [...values.entries()];
          let index = 0;
          const advance = () => queueMicrotask(() => {
            if (index >= entries.length) request.result = null;
            else {
              const [key, value] = entries[index++];
              request.result = { key, value, continue: advance };
            }
            request.onsuccess?.();
          });
          advance();
          return request;
        },
      }),
    };
    return tx;
  },
};
const fakeIndexedDB: any = {
  open: () => {
    const request: any = { result: fakeDb };
    queueMicrotask(() => {
      request.onupgradeneeded?.();
      request.onsuccess?.();
    });
    return request;
  },
};
Object.defineProperty(globalThis, "indexedDB", { configurable: true, value: fakeIndexedDB });

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

const db = await import("./db");
await db.init(() => ({ "index.html": "<main>seed</main>" }));
await db.flush();
assert(values.has("projects"), "initial workspace must be committed before flush resolves");
assert(values.has("settings"), "initial settings must be committed before flush resolves");

db.setSettings({ freeStarter: false });
const staleFlush = db.flush();
db.setSettings({ freeStarter: true });
await staleFlush;
await db.flush();
assert((values.get("settings") as any).freeStarter === true,
  "a newer edit made during an in-flight write must not be cleared by the older flush");

db.setSettings({ freeStarter: false });
failWrites = true;
await db.flush();
assert((values.get("settings") as any).freeStarter === true,
  "a failed IndexedDB transaction must not be treated as a successful write");
failWrites = false;
await db.flush();
assert((values.get("settings") as any).freeStarter === false,
  "dirty data must remain queued and succeed on a later flush after storage recovers");

console.log("Durable IndexedDB flush regression tests passed");
