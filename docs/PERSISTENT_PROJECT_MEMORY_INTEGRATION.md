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


## Multiple project chats

Each project is also an independent conversation workspace: its messages, files, repository link, snapshots, and persistent project memory are keyed to that project. Use **New chat** in a conversation to start a fresh, empty workspace without deleting the previous conversation. Use **New chat from GitHub** to attach a repository to a separate workspace; paste either a GitHub URL or `owner/repository`. Confirmed empty repositories are kept empty until the user asks Kuro-chan to build something. Switching workspaces switches the conversation and memory together. Kuro-chan's own repository can be imported as one of these workspaces and improved through the same review and CI workflow; self-changes should not bypass normal diff review, tests, or user approval.
