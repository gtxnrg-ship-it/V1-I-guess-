import assert from "node:assert/strict";
import { PERSONA, TALKER } from "./prompts";

assert.match(PERSONA, /CHAT EXPERIENCE STANDARD/);
assert.match(PERSONA, /conversation with a capable companion/);
assert.match(PERSONA, /reference images/);
assert.match(PERSONA, /rich chat elements/);
assert.match(PERSONA, /inspect → make a focused change → run relevant tests\/build/);
assert.match(PERSONA, /Do not pretend to be a human/);
assert.match(TALKER, /GitHub repository URL/);
assert.match(TALKER, /do not force a scripted greeting/i);
console.log("Conversational capability standard: passed");
