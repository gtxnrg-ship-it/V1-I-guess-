# Repository diagnosis module

This module classifies a repository from explicit evidence supplied by a GitHub adapter. It never makes network calls and never changes files.

## Safety rules

- An empty result from a failed or partial API call is **not** evidence of an empty repository.
- Empty requires a complete tree plus confirmed absence of commits.
- Existing repositories are never safe to initialize with a starter template.
- A failing Actions run is a diagnostic signal, not proof every component is broken.
- Unknowns are reported explicitly so Kuro-chan can explain what she still needs to inspect.

## Integration still required

A caller must fetch the default branch, tree, commit history, readable key files, and recent workflow status; pass that evidence into `diagnoseRepository`; then use the result to guide the conversation. This module does not itself connect to GitHub or wire itself into the chat planner.
