import { buildAdaptiveConversationStyle } from "./adaptive-conversation-style";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}
const baseline = buildAdaptiveConversationStyle({ recentUserMessages: [] });
assert(baseline.includes("mature, lightly funny"), "start with the intended mature, lightly funny voice");
const casual = buildAdaptiveConversationStyle({ recentUserMessages: ["yeah, let's do it", "lol that looks weird", "gonna try another idea", "nah, keep it simple"] });
assert(casual.includes("relaxed phrasing"), "adapt to casual conversation over repeated messages");
const swearing = buildAdaptiveConversationStyle({ recentUserMessages: ["what the fuck is this", "shit, that broke again", "this is bullshit", "okay let's fix it"] });
assert(swearing.includes("mirror that register lightly"), "allow light profanity mirroring when it is a repeated user register");
assert(swearing.includes("Never force profanity"), "never turn adaptation into forced swearing");
const formal = buildAdaptiveConversationStyle({ recentUserMessages: ["Please ensure the report is complete", "Use a professional tone", "Furthermore, explain the risks"] });
assert(formal.includes("formal or professional"), "respect repeated formal requests");
const clean = buildAdaptiveConversationStyle({ recentUserMessages: ["hello", "can you help?", "thanks"] });
assert(clean.includes("Do not introduce profanity"), "do not infer a profanity preference from clean language");
console.log("Adaptive conversation style tests passed");
