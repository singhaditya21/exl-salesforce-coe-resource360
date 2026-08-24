# Security policy

## Supported use

This repository is a sanitized, static demonstration. It must not contain EXL production data, credentials, client-confidential evidence, commercial records, access tokens or raw files from `RMG.zip`.

The GitHub Pages deployment does not provide production authentication or authorization. Production deployment requires the EXL-approved identity, API, data, audit, monitoring and recovery controls defined in the Resource360 PRD.

Repository administration uses SSH for Git and GitHub CLI OAuth for API operations. Do not create a replacement long-lived classic PAT for this demo; any future automation credential must be repository-scoped, least-privilege, expiring and stored only in GitHub encrypted secrets.

## Reporting a vulnerability

Use the repository's private **Security → Report a vulnerability** flow. Do not open a public issue containing exploit details, credentials, personal data or client information.

## Demo data handling

- All supplied records are fictionalized fixtures.
- Workflow state is stored in the current browser and can be reset from Administration.
- No passwords, tokens or EXL source-system data are requested or transmitted.
- Raw source archives and extracted evidence are explicitly outside this public repository.
