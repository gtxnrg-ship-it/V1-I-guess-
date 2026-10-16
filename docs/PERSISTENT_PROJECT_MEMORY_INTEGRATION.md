# Persistent project memory integration

Kuro-chan stores project memory in the existing project record, using the existing persistence mechanism. The Talker receives a bounded context pack containing project metadata, provenance-labelled facts and decisions, open questions, and the last saved build summary.

## Current behavior
- Memory is optional and old project records remain compatible.
- Facts and decisions are capped at 40 each; open questions at 20; stored summaries at 1,800 characters before prompt limits.
- Context preserves provenance and optional evidence, flags repository observations whose baseline differs from the current SHA, and marks unanchored observations for verification.
- Credential-like text is filtered from memory facts, decisions, questions, evidence, and summaries using defensive heuristics.
- Build summaries are saved after the app build pipeline completes.
- Users can explicitly save with `remember: ...`, save a decision with `remember decision: ...`, remove matching items with `forget: ...`, or clear project memory with `/forget memory`. These commands are local and do not invoke the model.
- Ordinary conversation is not automatically extracted into facts or decisions.

## Limits
This is bounded persistent context with explicit user-controlled capture, not automatic extraction of every preference or repository fact. The app/self admin workspace remains separate from project memory.
