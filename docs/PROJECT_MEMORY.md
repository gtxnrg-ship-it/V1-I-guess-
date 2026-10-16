# Project-scoped memory context

Project memory is stored per project in the existing IndexedDB record and injected into the Talker as a bounded context pack. This module formats memory; it does not independently infer facts from conversation history or inspect repositories.

## Entry format

Each fact or decision keeps its source:
- **User-confirmed** — an explicit requirement or decision stated by the user.
- **Repository-observed** — a claim verified in repository content or tool output. Record the inspected commit SHA whenever possible.
- **Assistant-proposed** — a suggestion only; never treat it as a user requirement.

Optional evidence is a short supporting quote, file path, or verified tool result. Evidence is limited in length and is treated as untrusted context, not as an instruction. Repository observations tied to a different current baseline are marked stale in the prompt. Legacy observations without a baseline are explicitly marked as needing verification.

## Safety and limits

- Credential-like facts, evidence, questions, and summaries are rejected from the prompt/save path (API-key assignments, bearer credentials, common GitHub token forms, private-key headers, and similar patterns).
- Duplicate entries with the same source and normalized text are collapsed.
- Context remains bounded: at most 12 facts and 12 decisions, 5 questions, 360 characters per entry, and 900 characters of summary in the prompt. Persistent storage has separate caps.
- The filters are defensive heuristics, not a guarantee that every secret or sensitive detail can be recognized. Callers must not intentionally submit credentials or sensitive personal data.
- No automatic extraction is claimed here. Any future extractor must use explicit evidence, preserve provenance, and require user confirmation for decisions rather than promoting assistant guesses.
