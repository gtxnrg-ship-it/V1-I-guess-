type KokoroAudio = { audio: ArrayLike<number>; sampling_rate: number };
type KokoroEngine = {
  generate(text: string, options: { voice: string; speed: number }): Promise<KokoroAudio>;
};

const MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX";
let enginePromise: Promise<KokoroEngine> | null = null;

async function getEngine(): Promise<KokoroEngine> {
  if (!enginePromise) {
    enginePromise = import("kokoro-js")
      .then(async ({ KokoroTTS }) => {
        // Use quantized WASM for predictable compatibility on Android WebView.
        // The model is fetched only when local voice is first requested.
        const engine = await KokoroTTS.from_pretrained(MODEL_ID, { dtype: "q8", device: "wasm" });
        return engine as unknown as KokoroEngine;
      })
      .catch((error: unknown) => {
        enginePromise = null;
        throw error;
      });
  }
  return enginePromise;
}

function writeAscii(view: DataView, offset: number, value: string) {
  for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
}

/** Encode mono Float32 samples as a portable 16-bit PCM WAV for HTMLAudioElement playback. */
export function audioToWavBlob(audio: ArrayLike<number>, sampleRate = 24_000): Blob {
  const rate = Number.isFinite(sampleRate) && sampleRate > 0 ? Math.round(sampleRate) : 24_000;
  const bytesPerSample = 2;
  const dataBytes = audio.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + dataBytes, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, dataBytes, true);

  for (let i = 0; i < audio.length; i++) {
    const sample = Math.max(-1, Math.min(1, Number(audio[i]) || 0));
    view.setInt16(44 + i * bytesPerSample, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }

  return new Blob([buffer], { type: "audio/wav" });
}

/**
 * Generate speech locally. Model weights are fetched/cached by Kokoro on first use;
 * no user text is sent to a speech server by this function.
 */
export async function generateKokoroWav(text: string, voice = "af_heart", speed = 1): Promise<Blob> {
  const clean = text.trim().slice(0, 4096);
  if (!clean) throw new Error("There is no text to speak.");
  const engine = await getEngine();
  const output = await engine.generate(clean, {
    voice,
    speed: Math.max(0.8, Math.min(1.2, Number.isFinite(speed) ? speed : 1)),
  });
  if (!output.audio?.length) throw new Error("Kokoro returned an empty audio result.");
  return audioToWavBlob(output.audio, output.sampling_rate);
}
