import { LOCAL_MODEL_CATALOG, gradeLocalModel, localModelRecommendation } from "../engine/local-models";

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
  assert(gradeLocalModel(large, Number.NaN) === "yellow", "unknown RAM should stay uncertain instead of rejecting every model");
  assert(localModelRecommendation(Number.NaN).includes("Memory information isn't exposed"), "unknown RAM should ask the user to choose instead of assuming 6 GB");
  console.log("✓ local model catalog tests passed");
}
testLocalModelCatalog();
