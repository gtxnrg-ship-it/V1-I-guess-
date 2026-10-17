import assert from "node:assert/strict";
import { BUILDER, PERSONA, PLANNER, RESEARCHER, TALKER } from "./prompts";

assert.match(PERSONA, /CHAT EXPERIENCE STANDARD/);
assert.match(PERSONA, /conversation with a capable companion/);
assert.match(PERSONA, /reference images/);
assert.match(PERSONA, /rich chat elements/);
assert.match(PERSONA, /inspect → make a focused change → run relevant tests\/build/);
assert.match(PERSONA, /Do not pretend to be a human/);
assert.match(TALKER, /GitHub repository URL/);
assert.match(TALKER, /respond to what the user actually says instead of forcing a scripted greeting/i);
assert.match(RESEARCHER, /inspect_project_capabilities/);
assert.match(PLANNER, /known-answer fixtures/);
assert.match(BUILDER, /verify_project.*not a universal compiler/);
assert.match(BUILDER, /game-engine implementation/);
console.log("Conversational capability standard: passed");
