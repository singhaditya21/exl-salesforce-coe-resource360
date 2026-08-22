# EXL Salesforce COE Resource360

Resource360 is the frontend product foundation for a governed, 360-degree view of EXL Salesforce COE engagements, practitioners, staffing, allocations, skills, credentials, budgets, timesheets, operations and planning intelligence.

The application includes the complete 103-screen PRD inventory and a production-quality static demo of the R1 operating chain. Sanitized transactions are stored in the current browser and update a shared budget, skills, staffing, allocation, timesheet, notification and audit ledger.

## Working demo journeys

- Calculate, save, submit, approve or reject project budgets under the margin policy.
- Inspect Salesforce capabilities and verified credentials, submit a claim and make a manager decision.
- Run explainable capability search and create a budget-aware staffing request.
- Review and accept or decline the request; acceptance creates an allocation and timesheet eligibility.
- Enter, submit, approve or reject allocation-aware weekly time.
- Inspect notifications, derived command-center metrics and attributable audit events.
- Switch demo roles, reset sanitized state and continue with an offline application shell.

Start at `GLB-02` and follow the five-step **R1 golden path** card. All data and identities are fictionalized fixtures.

## Run locally

Requirements: Node.js 20.19+ and pnpm 10.

```bash
pnpm install
pnpm dev
```

Open the URL printed by Vite. Use the left module rail or **All screens** to navigate the complete design inventory.

## Validate

```bash
pnpm lint
pnpm test
```

`pnpm test` runs domain unit tests, a production build and static artifact checks. Pull requests also run dependency review; CodeQL runs on main, pull requests and a weekly schedule.

## GitHub Pages

Every push to `main` runs `.github/workflows/deploy-pages.yml`. The workflow validates, builds and deploys `dist/` through GitHub Pages. Vite derives the repository base path from `GITHUB_REPOSITORY`, so local development continues to use `/` while Pages uses `/<repository>/`.

## Delivery boundary

- GitHub Pages hosts the static React application.
- Workflow persistence is browser-scoped demo state, never an authoritative business record.
- The demo identity screen deliberately does not collect a password or token.
- Production identity, data contracts, RBAC, audit, integrations and transactional writes require the backend/API layer defined in the PRD.
- No credentials or source-system secrets belong in this repository or in browser code.

GitHub Pages is the complete hosting target for this demonstration. It is not the approved production runtime for real EXL staffing, employee, credential, time or commercial data.
