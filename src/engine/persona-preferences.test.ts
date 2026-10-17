import { buildPersonaPreferencesPrompt } from "./persona-preferences";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error("Assertion failed: " + message);
}

const defaults = buildPersonaPreferencesPrompt();
assert(defaults.includes("Playfulness level 2/3"), "defaults to moderate playfulness");
assert(defaults.includes("Reply length: Use a natural mix"), "defaults to balanced reply length");
assert(defaults.includes("use only explicit, saved facts and decisions"), "default uses saved project memory with provenance");
assert(defaults.includes("never pretend to be human"), "honesty boundary always remains");

const calm = buildPersonaPreferencesPrompt({ personalityPlayfulness: 0, responseLength: "concise", conversationPersonalization: false });
assert(calm.includes("Playfulness level 0/3"), "supports calm style");
assert(calm.includes("Prefer short, direct answers"), "supports concise replies");
assert(calm.includes("do not include saved project facts or decisions"), "disabling memory changes the prompt");
assert(calm.includes("Still use the active project's technical details"), "technical project context remains available");

const lively = buildPersonaPreferencesPrompt({ personalityPlayfulness: 99, responseLength: "detailed", conversationPersonalization: true });
assert(lively.includes("Playfulness level 3/3"), "playfulness is clamped to the supported range");
assert(lively.includes("Give fuller explanations"), "supports detailed replies");
assert(lively.includes("never pretend to be human"), "style cannot override honesty");
console.log("Persona preference tests passed.");
