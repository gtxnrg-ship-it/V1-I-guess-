# Persistent project memory integration

Kuro-chan now stores project memory alongside the existing project record in IndexedDB, so it follows the project across reloads without introducing a new backend or database. The Talker receives a bounded context pack containing the project name, linked repository, last observed repository baseline SHA, provenance-labelled facts and decisions, open questions, and the last saved build summary.

## Current behavior
- Project memory is optional, so older project records continue to load without a migration.
- Memory writes update the existing project record and use the existing persistence queue.
- Facts and decisions are capped at 40 each; open questions are deduplicated and capped at 20; summaries are capped at 1,800 characters before the context pack applies its smaller prompt limit.
- After an app build pipeline completes, the final summary is saved into project memory.
- The Talker sees that memory on subsequent turns.

## Deliberate limits
This is persistent storage and prompt integration, not yet automatic extraction of every user preference or repository fact. A later change should add a constrained, evidence-based memory update step that distinguishes user-confirmed requirements from repository observations and assistant proposals, rejects secrets, and revalidates observations when the repository baseline changes. The app/self admin workspace remains separate from this project memory.
