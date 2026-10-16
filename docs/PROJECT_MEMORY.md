# Project-scoped memory context

This module formats a bounded, auditable context pack from facts supplied by the application. Each fact retains its provenance: user-confirmed, repository-observed, or assistant-proposed.

## Why this matters

Kuro-chan should not flatten guesses, user requirements, and code observations into one indistinguishable memory. It should know which facts came from the user, which were observed at a particular repository baseline, and which are merely proposals. Context is bounded so long conversations cannot grow the prompt without limit.

## Important limitation

This module is not a database, not a vector store, and not automatic memory persistence. It does not inspect conversations or repositories itself. The application still needs to persist structured facts per project, update them after verified tool actions, mark repository-derived facts stale when the baseline SHA changes, and inject the resulting pack into the agent prompt. Secrets and credentials must never be stored in this memory.
