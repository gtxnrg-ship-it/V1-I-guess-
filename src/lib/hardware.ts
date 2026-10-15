export interface DeviceSpecs {
  ramGB: number;
  cores: number;
  gpu: string;
  isMobile: boolean;
}

export interface ModelRecommendation {
  name: string;
  params: string;
  minRamGB: number;
  status: "optimal" | "playable" | "heavy";
  reason: string;
}

export function detectDeviceSpecs(): DeviceSpecs {
  const ramGB = (navigator as any).deviceMemory || 4;
  const cores = navigator.hardwareConcurrency || 4;
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  let gpu = "Standard GPU";

  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (gl) {
      const debugInfo = (gl as any).getExtension("WEBGL_debug_renderer_info");
      if (debugInfo) {
        gpu = (gl as any).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || "Standard GPU";
      }
    }
  } catch { /* ignored */ }

  return { ramGB, cores, gpu, isMobile };
}

export function getLocalModelRecommendations(specs = detectDeviceSpecs()): ModelRecommendation[] {
  const ram = specs.ramGB;

  const models: { name: string; params: string; minRam: number }[] = [
    { name: "Qwen 2.5 0.5B", params: "0.5B", minRam: 2 },
    { name: "Llama 3.2 1B", params: "1B", minRam: 3 },
    { name: "Qwen 2.5 1.5B / DeepSeek R1 1.5B", params: "1.5B", minRam: 4 },
    { name: "Gemma 2 2B", params: "2B", minRam: 4 },
    { name: "Llama 3.2 3B / Qwen 2.5 3B", params: "3B", minRam: 6 },
    { name: "Mistral 7B / Qwen 2.5 7B", params: "7B", minRam: 8 },
    { name: "DeepSeek R1 14B / Qwen 14B", params: "14B", minRam: 16 },
  ];

  return models.map((m) => {
    let status: "optimal" | "playable" | "heavy" = "optimal";
    let reason = "Smooth performance";

    if (ram < m.minRam) {
      status = "heavy";
      reason = `Requires ${m.minRam}GB+ RAM (Detected ~${ram}GB)`;
    } else if (ram === m.minRam) {
      status = "playable";
      reason = "Passable performance";
    }

    return {
      name: m.name,
      params: m.params,
      minRamGB: m.minRam,
      status,
      reason,
    };
  });
}
