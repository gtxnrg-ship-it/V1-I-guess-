# Live repository intelligence

This adapter connects the existing evidence-based repository diagnosis to real GitHub API responses through the existing authenticated `GH` client.

## What it inspects
- Repository metadata and the actual default branch
- The latest commit returned by GitHub
- Recursive Git tree and whether GitHub marked that tree as truncated
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
This is the first live adapter layer. The next step is to call it from the repository connection/import and agent conversation flow, show its evidence and unknowns to the user, and use the inspected baseline SHA to prevent stale assumptions. It does not yet automatically run on every chat message.
