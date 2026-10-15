# Security Policy

Kuro-chan handles user-supplied code, provider credentials, and GitHub access. Please help us keep users safe.

## Supported versions

Security fixes are currently targeted at the latest version on the `main` branch. Older deployments may not receive fixes.

## Reporting a vulnerability

**Please do not publish secrets, exploit details, or a working attack in a public issue.**

Use GitHub's private vulnerability reporting feature for this repository if it is enabled. Otherwise, contact the maintainer through the GitHub profile associated with this repository and ask for a private security-reporting channel.

Please include, when safe to share:

- A clear description of the issue and its impact.
- Steps to reproduce it or a minimal proof of concept.
- Which version or commit is affected.
- Any suggested mitigation.

We will try to acknowledge reports and coordinate a fix before public disclosure. Response times cannot be guaranteed for this community project.

## Credential safety

- Never include API keys, GitHub tokens, or passwords in bug reports, screenshots, commits, or chat prompts.
- If a secret may have been exposed, revoke or rotate it immediately. Deleting it from the latest commit does not remove it from Git history.
- Use least-privilege tokens and review the permissions requested by connected integrations.
- Remember that cloud AI providers and other connected services receive the requests needed to provide their functionality.

## Scope and responsible testing

Test only systems you own or have explicit permission to assess. Do not access or modify another person's repositories, data, or credentials.
