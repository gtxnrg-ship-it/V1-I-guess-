/**
 * Curated open-weight model candidates for Kuro-chan's future Android local runtime.
 * Memory bands are conservative planning estimates, not vendor guarantees or measured benchmarks.
 * A model is only "runnable" after its exact artifact format is supported by the bundled runtime.
 */
export type ModelGrade = "green" | "yellow" | "red";
export interface LocalModelCandidate {
  id: string; name: string; family: string; parameters: string; task: string;
  minRamGb: number; recommendedRamGb: number; estimatedDownload: string; modelPage: string; notes: string;
}
export const LOCAL_MODEL_CATALOG: LocalModelCandidate[] = [
  { id: "qwen3.5-0.8b", name: "Qwen3.5 0.8B", family: "Qwen", parameters: "0.8B", task: "Fast chat, short summaries", minRamGb: 2, recommendedRamGb: 3, estimatedDownload: "under 1 GB (artifact varies)", modelPage: "https://huggingface.co/Qwen/Qwen3.5-0.8B", notes: "Very small candidate; verify a mobile-compatible quantized artifact." },
  { id: "qwen3-0.6b", name: "Qwen3 0.6B", family: "Qwen", parameters: "0.6B", task: "Quick replies, simple classification", minRamGb: 2, recommendedRamGb: 3, estimatedDownload: "under 1 GB (artifact varies)", modelPage: "https://huggingface.co/Qwen/Qwen3-0.6B", notes: "Tiny text model; not intended for complex code generation." },
  { id: "qwen2.5-0.5b", name: "Qwen2.5 0.5B Instruct", family: "Qwen", parameters: "0.5B", task: "Light conversation and rewrites", minRamGb: 2, recommendedRamGb: 3, estimatedDownload: "under 1 GB (artifact varies)", modelPage: "https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct", notes: "Older, compact instruction model; useful as a fallback candidate." },
  { id: "gemma-3-1b", name: "Gemma 3 1B", family: "Gemma", parameters: "1B", task: "Everyday chat, summaries", minRamGb: 3, recommendedRamGb: 4, estimatedDownload: "around 1 GB+ (artifact varies)", modelPage: "https://huggingface.co/google/gemma-3-1b-it", notes: "Check the model's access terms and compatible converted format." },
  { id: "gemma-3n-e2b", name: "Gemma 3n E2B", family: "Gemma", parameters: "effective 2B class", task: "Multimodal-capable assistant", minRamGb: 4, recommendedRamGb: 6, estimatedDownload: "multiple GB (artifact varies)", modelPage: "https://huggingface.co/google/gemma-3n-E2B-it", notes: "Mobile-oriented family, but multimodal runtime and memory requirements must be validated." },
  { id: "smollm2-360m", name: "SmolLM2 360M Instruct", family: "SmolLM", parameters: "360M", task: "Ultra-fast tiny helper tasks", minRamGb: 2, recommendedRamGb: 3, estimatedDownload: "under 1 GB (artifact varies)", modelPage: "https://huggingface.co/HuggingFaceTB/SmolLM2-360M-Instruct", notes: "Tiny fallback; expect limited reasoning and coding ability." },
  { id: "smollm2-1.7b", name: "SmolLM2 1.7B Instruct", family: "SmolLM", parameters: "1.7B", task: "Chat, lightweight planning", minRamGb: 3, recommendedRamGb: 5, estimatedDownload: "around 1–2 GB (artifact varies)", modelPage: "https://huggingface.co/HuggingFaceTB/SmolLM2-1.7B-Instruct", notes: "A larger SmolLM candidate for comparison against tiny models." },
  { id: "llama-3.2-1b", name: "Llama 3.2 1B Instruct", family: "Llama", parameters: "1B", task: "General chat and concise answers", minRamGb: 3, recommendedRamGb: 4, estimatedDownload: "around 1 GB+ (artifact varies)", modelPage: "https://huggingface.co/meta-llama/Llama-3.2-1B-Instruct", notes: "Hugging Face access may require accepting Meta's license." },
  { id: "qwen2.5-coder-1.5b", name: "Qwen2.5-Coder 1.5B Instruct", family: "Qwen Coder", parameters: "1.5B", task: "Small code edits and explanations", minRamGb: 3, recommendedRamGb: 5, estimatedDownload: "around 1–2 GB (artifact varies)", modelPage: "https://huggingface.co/Qwen/Qwen2.5-Coder-1.5B-Instruct", notes: "Specialized coding candidate; small models still need a strong checker for real projects." },
  { id: "phi-3.5-mini", name: "Phi-3.5 Mini Instruct", family: "Phi", parameters: "3.8B", task: "Stronger local reasoning candidate", minRamGb: 5, recommendedRamGb: 8, estimatedDownload: "several GB (artifact varies)", modelPage: "https://huggingface.co/microsoft/Phi-3.5-mini-instruct", notes: "Likely too demanding for many 6 GB phones; included for higher-memory devices." },
  { id: "qwen3-4b", name: "Qwen3 4B", family: "Qwen", parameters: "4B", task: "Higher-quality local reasoning", minRamGb: 6, recommendedRamGb: 8, estimatedDownload: "several GB (artifact varies)", modelPage: "https://huggingface.co/Qwen/Qwen3-4B", notes: "Advanced candidate for stronger phones; not recommended for a 6 GB device without measurement." },
];
export function gradeLocalModel(model: LocalModelCandidate, availableRamGb: number): ModelGrade {
  if (!Number.isFinite(availableRamGb) || availableRamGb <= 0) return "yellow";
  if (availableRamGb >= model.recommendedRamGb) return "green";
  if (availableRamGb >= model.minRamGb) return "yellow";
  return "red";
}
export function localModelRecommendation(availableRamGb: number): string {
  if (!Number.isFinite(availableRamGb) || availableRamGb <= 0) return "Memory information isn't exposed by this Android WebView. Choose the phone's RAM below for a rough recommendation; an on-device runtime benchmark is still required.";
  if (availableRamGb <= 3) return "Start with tiny models (0.5B–0.8B). Keep one model loaded at a time and avoid heavy multitasking.";
  if (availableRamGb <= 4) return "Try tiny models first; 1B models may fit with compatible quantization. Check free storage and heat.";
  if (availableRamGb <= 6) return "Try 0.5B–1.7B candidates first. Larger models are experimental and may cause slowdowns or memory pressure.";
  return "You may be able to test larger candidates, but RAM alone doesn't guarantee speed or runtime compatibility.";
}
