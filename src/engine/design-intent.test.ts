import { buildDesignIntentContext } from "./design-intent";
import type { DesignStudioState } from "./types";
function assert(value: boolean, message: string) { if (!value) throw new Error(`Assertion failed: ${message}`); }
const design: DesignStudioState = {
  query: "dark manga reader",
  photos: [
    { url: "https://example.com/selected", thumb: "", alt: "Reader layout", credit: "Artist", source: "Openverse" },
    { url: "https://example.com/unselected", thumb: "", alt: "Not selected", credit: "Artist 2", source: "Openverse" },
  ],
  selectedUrls: ["https://example.com/selected"],
  feedback: "Keep the clean reader; avoid clutter.",
  brief: "Dark galaxy palette with readable chapter controls.",
  updatedAt: 1,
};
const output = buildDesignIntentContext("KuroToon", design);
assert(output.includes("USER-APPROVED VISUAL INTENT"), "marks approved context");
assert(output.includes("Dark galaxy palette"), "includes approved direction");
assert(output.includes("Keep the clean reader"), "includes feedback");
assert(output.includes("https://example.com/selected"), "includes selected provenance");
assert(!output.includes("https://example.com/unselected"), "excludes unselected references");
assert(output.includes("not instructions"), "treats external content as untrusted");
assert(buildDesignIntentContext("Empty") === "", "empty design state adds no prompt noise");
console.log("Design intent context tests passed");
