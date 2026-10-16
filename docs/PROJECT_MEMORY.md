# Project-scoped memory context

Project memory is stored per project in the existing project record and injected into the Talker as bounded context. It does not automatically infer facts from ordinary conversation.

## Explicit user controls

Use these commands in project chat:
- `remember: <fact>` — save a project fact explicitly.
- `remember decision: <decision>` — save a user-confirmed decision separately.
- `forget: <text>` — remove saved facts, decisions, and open questions containing that text.
- `/forget memory` — clear the current project's facts, decisions, open questions, and saved summary.

These commands are handled deterministically without invoking an AI model. Ordinary conversation, assistant proposals, and model-generated summaries are not promoted to facts or decisions by this workflow. Secret-like entries are rejected; remove credentials before trying again.

## Entry format and safety

- **User-confirmed** means the user explicitly saved the item.
- **Repository-observed** means a claim was verified in repository content or tool output. Record the inspected commit SHA whenever possible.
- **Assistant-proposed** is a suggestion only, never a user requirement.

Optional evidence is short supporting context. Repository observations tied to a different current baseline are marked stale; legacy observations without a baseline need verification. Credential filtering uses defensive heuristics and cannot detect every possible secret. Context is bounded to 12 facts, 12 decisions, 5 questions, 360 characters per entry, and 900 characters of summary in the prompt.
