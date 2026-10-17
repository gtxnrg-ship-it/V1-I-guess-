# Live repository intelligence

This adapter connects the existing evidence-based repository diagnosis to real GitHub API responses through the existing authenticated `GH` client.

## What it inspects
- Repository metadata and the actual default branch
- The latest commit returned by GitHub for the selected ref
- Recursive Git tree read by the immutable observed commit SHA, plus whether GitHub marked that tree as truncated
- Recognized manifest, README, and entry-point paths
- The ten most recent GitHub Actions runs when the token has access

## Safety boundaries
- A failed or forbidden tree request is classified as unknown, never as empty.
- A partial/truncated tree is not treated as a complete inventory.
- A failing Actions run is a signal to investigate, not proof the whole app is broken.
- The adapter is read-only; it never creates repositories, writes files, or merges pull requests.
- It rejects nested issue/file URLs rather than silently guessing the repository.
- Repository tree paths are evidence, not proof that every file is readable or that the app builds.

## Integration status
The adapter is connected to the agent conversation context. When a project has a repository and a GitHub credential, the agent includes live inspection evidence and a bounded source-context pack. The context builder accepts the inspection baseline SHA, reads the tree by that immutable SHA, and records which file bodies were actually loaded. Cached context is checked against the selected ref head before reuse. This is still a bounded context pack, not a complete code review or proof that every file was read. The exact integration behavior should remain covered by the repository-context and live-inspection regression tests.
