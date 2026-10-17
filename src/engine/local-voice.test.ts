import { audioToWavBlob } from "./local-voice";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error("Assertion failed: " + message);
}

function readAscii(view: DataView, offset: number, length: number) {
  return Array.from({ length }, (_, index) => String.fromCharCode(view.getUint8(offset + index))).join("");
}

const blob = audioToWavBlob(new Float32Array([0, -1, 1]), 24_000);
assert(blob.type === "audio/wav", "returns a WAV blob");
assert(blob.size === 50, "header plus three 16-bit samples");
const view = new DataView(await blob.arrayBuffer());
assert(readAscii(view, 0, 4) === "RIFF", "RIFF header");
assert(readAscii(view, 8, 4) === "WAVE", "WAVE container");
assert(readAscii(view, 12, 4) === "fmt ", "format chunk");
assert(view.getUint32(24, true) === 24_000, "sample rate");
assert(view.getUint16(34, true) === 16, "16-bit PCM");
assert(readAscii(view, 36, 4) === "data", "data chunk");
assert(view.getUint32(40, true) === 6, "data byte length");
assert(view.getInt16(46, true) === -32768, "negative samples map to signed PCM");
assert(view.getInt16(48, true) === 32767, "positive samples map to signed PCM");
console.log("Local voice WAV encoding tests passed.");
