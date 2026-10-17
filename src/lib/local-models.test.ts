import { LOCAL_MODEL_CATALOG, gradeLocalModel, localModelRecommendation } from "../engine/local-models";
import { readDeviceCapabilities } from "../engine/device-capabilities";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function testLocalModelCatalog() {
  assert(LOCAL_MODEL_CATALOG.length >= 10, "catalog should offer at least ten local model candidates");
  assert(new Set(LOCAL_MODEL_CATALOG.map((m) => m.id)).size === LOCAL_MODEL_CATALOG.length, "model IDs should be unique");
  assert(LOCAL_MODEL_CATALOG.every((m) => /^https:\/\/huggingface\.co\//.test(m.modelPage)), "each candidate should link to an upstream model page");
  const tiny = LOCAL_MODEL_CATALOG.find((m) => m.id === "qwen3-0.6b")!;
  const large = LOCAL_MODEL_CATALOG.find((m) => m.id === "qwen3-4b")!;
  assert(gradeLocalModel(tiny, 6) === "green", "tiny models should be green when RAM exceeds recommendation");
  assert(gradeLocalModel(large, 6) === "yellow", "4B model should be a cautious candidate on 6 GB RAM");
  assert(gradeLocalModel(large, 3) === "red", "4B model should be red on 3 GB RAM");
  assert(localModelRecommendation(6).includes("0.5B–1.7B"), "6 GB guidance should prioritize smaller models");
  console.log("✓ local model catalog tests passed");
}
testLocalModelCatalog();

function testDeviceCapabilities() {
  const mobile = readDeviceCapabilities({ deviceMemory: 4, hardwareConcurrency: 8, userAgent: "Mozilla/5.0 (Linux; Android 11; Mobile)" });
  assert(mobile.reportedRamGb === 4, "preserves browser-reported approximate memory");
  assert(mobile.logicalCores === 8, "preserves reported logical CPU core count");
  assert(mobile.isLikelyMobile, "recognizes a likely mobile user agent");

  const unknown = readDeviceCapabilities({});
  assert(unknown.reportedRamGb === null, "does not invent RAM when browser hides it");
  assert(unknown.logicalCores === null, "does not invent CPU cores when unavailable");
  assert(!unknown.isLikelyMobile, "does not guess mobile without a user agent");

  const invalid = readDeviceCapabilities({ deviceMemory: -4, hardwareConcurrency: 0, userAgent: "desktop browser" });
  assert(invalid.reportedRamGb === null, "rejects invalid memory values");
  assert(invalid.logicalCores === null, "rejects invalid CPU core counts");
  assert(!invalid.isLikelyMobile, "does not misclassify a desktop user agent");
  console.log("✓ device capability detection tests passed");
}
testDeviceCapabilities();
