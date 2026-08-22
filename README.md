# EXL Salesforce COE Resource 360

Resource 360 is a Salesforce-native delivery-control product for EXL's Salesforce COE. Salesforce is the transactional system of record for engagement economics, staffing, allocations, skills, credentials, timesheets, notifications and audit. A sanitized React companion is published on GitHub Pages for public design review without exposing Salesforce data.

The repository implements the complete 103-screen PRD inventory and the governed operating chain:

**Engagement and commercial reference → approved budget/WBS → staffing request → capability-based selection → Staffer decision → committed allocation → eligible timesheet → approval, profitability and utilization control.**

## Salesforce implementation

- Lightning app and EXL-themed `resource360Workspace` LWC with nine modules and all 103 routed experiences.
- 15 custom objects, 190 custom fields/formulas, and 17 server-side validation rules.
- Apex services for budget routing, staffing decisions, allocations, skill claims, timesheets, notifications and immutable audit evidence.
- Approved-budget, capacity, allocation-lineage, self-approval and timesheet-eligibility controls enforced server-side.
- Resource 360 Administrator permission set, custom-permission decision gates and sanitized, idempotent demo seeding.
- Four Apex tests covering the governed transaction chain; current service coverage is approximately 86%.

The authoritative requirements are in [the consolidated PRD](docs/EXL_Salesforce_COE_Resource360_PRD_v1.0.md). See [Salesforce architecture](docs/SALESFORCE_ARCHITECTURE.md) for the implementation map and [ADR-001](docs/ADR-001-SALESFORCE-NATIVE.md) for the Salesforce-native platform decision.

## Deploy to Salesforce

Requirements: Salesforce CLI and an authenticated org. The permanent development org uses the local alias `Resource360Hub`.

```bash
sf org login web --alias Resource360Hub --instance-url https://login.salesforce.com
sf config set target-org=Resource360Hub target-dev-hub=Resource360Hub
sf project deploy start --source-dir force-app --target-org Resource360Hub --test-level RunSpecifiedTests --tests Resource360ServiceTest --wait 30
sf org assign permset --name Resource360_Administrator --target-org Resource360Hub
sf apex run --target-org Resource360Hub --file scripts/apex/seedResource360.apex
sf org open --target-org Resource360Hub --path /lightning/app/c__Resource360
```

The seed uses fictional identities and `.invalid` email addresses. It is safe to run repeatedly.

## Validate Salesforce

```bash
sf project deploy start --source-dir force-app --target-org Resource360Hub --dry-run --test-level RunSpecifiedTests --tests Resource360ServiceTest --wait 30
sf apex run test --target-org Resource360Hub --tests Resource360ServiceTest --code-coverage --result-format human --wait 30
```

## GitHub Pages companion

Requirements: Node.js 20.19+ and pnpm.

```bash
pnpm install
pnpm dev
pnpm lint
pnpm test
```

Every push to `main` validates, builds and publishes `dist/` through `.github/workflows/deploy-pages.yml`. The Pages experience uses browser-scoped sanitized fixtures; it is not an alternative database and never receives Salesforce credentials.

## Environment and security boundary

Authentication stays in the Salesforce CLI keychain and machine-local `.sf/`/`.sfdx/` directories. Never commit access tokens, auth URLs, private keys, usernames, org IDs or production data. Real EXL activation still requires approved EXL identity, integration endpoints, data classification, role assignments, monitoring and release governance; those external dependencies are specified in the PRD rather than simulated as completed.

See [the org environment contract](docs/SALESFORCE_ORG.md) for recovery and change discipline.
