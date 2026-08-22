# EXL Salesforce COE Resource360

Resource360 is the frontend product foundation for a governed, 360-degree view of EXL Salesforce COE engagements, practitioners, staffing, allocations, skills, credentials, budgets, timesheets, operations and planning intelligence.

The application includes the complete 103-screen PRD inventory. Its first working slice covers the staffer flow from queue review through request validation and an attributable accept/decline decision. Demo decisions are stored in the current browser only; production source systems and governed APIs will replace that adapter.

## Run locally

Requirements: Node.js 20.19+ and pnpm 10.

```bash
pnpm install
pnpm dev
```

Open the URL printed by Vite. Use the left module rail or **All screens** to navigate the complete design inventory. The working staffing flow begins at `STFUI-21`.

## Validate

```bash
pnpm lint
pnpm test
```

`pnpm test` runs a production build and verifies the static GitHub Pages artifact, the 103-screen registry and the functional staffing workflow source.

## GitHub Pages

Every push to `main` runs `.github/workflows/deploy-pages.yml`. The workflow validates, builds and deploys `dist/` through GitHub Pages. Vite derives the repository base path from `GITHUB_REPOSITORY`, so local development continues to use `/` while Pages uses `/<repository>/`.

## Delivery boundary

- GitHub Pages hosts the static React application.
- Current workflow persistence is browser-scoped demo state, never an authoritative business record.
- Production identity, data contracts, RBAC, audit, integrations and transactional writes require the backend/API layer defined in the PRD.
- No credentials or source-system secrets belong in this repository or in browser code.
