# EXL Salesforce COE Resource 360

Resource 360 is a Salesforce-native delivery-control product for EXL’s Salesforce COE. Salesforce is the transactional system of record for engagement economics, staffing, allocations, skills, credentials, timesheets, notifications, integration operations and audit. A sanitized React companion is published on GitHub Pages for public design review without exposing Salesforce data.

The governed chain is:

**Engagement and commercial reference → approved budget/WBS → staffing request → capability-based selection → Staffer decision → committed allocation → eligible timesheet → approval, profitability and utilization control.**

## Salesforce implementation

- EXL-themed Lightning app/LWC with nine modules and all 103 routed screen contracts.
- 34 Salesforce data/config/event types (27 record objects, six custom-metadata types and one platform event), 441 fields/formulas, 22 validation rules, seven guard triggers and native field history on material controls.
- 37 Apex classes, including six focused test classes, for economics, monthly roster assurance/import, capacity/freshness controls, governed atomic configuration releases, delivery roles, staffing, explainable talent matching, practitioner evidence, time, bulk/master-data ingestion, scope sharing, durable events, KPI/exception snapshots, retention dry runs and immutable audit.
- Approved-budget signatures, sequential separation of duties, atomic capacity, effective classification snapshots, allocation lineage, self-approval, eligible time, controlled corrections and five-/seven-day timesheet controls.
- Seventeen least-privilege permission sets composed into 17 business-role groups for 18 governed personas, 15 custom permissions, effective organizational/portfolio scopes and Apex-managed sharing.
- Five standard Salesforce report types, 150 governed policy/classification/delivery-role/source/persona/retention records, effective-dated runtime overrides and idempotent fictional demo seeding.
- Machine-readable governance, common project and master-data envelope contracts under `contracts/`.
- Release gates covering lint, unit/contract/build, desktop/mobile Playwright and axe accessibility, Salesforce `RunLocalTests`, CodeQL and GitHub Pages.
- One five-pillar Demo Activation Center that rehearses SSO, integrations, production-like fictional data, legal/business approvals and operational controls with attributable evidence, zero external calls and zero destructive actions.

Requirements are in the [consolidated PRD](docs/EXL_Salesforce_COE_Resource360_PRD_v1.0.md); delivery truth is in [requirements traceability](docs/REQUIREMENTS_TRACEABILITY.md). The [mock contract register](docs/MOCK_CONTRACT_REGISTER.md) states every EXL assumption and production boundary. See also the [demo activation runbook](docs/DEMO_ACTIVATION_RUNBOOK.md), [persona/access matrix](docs/PERSONA_ACCESS_MATRIX.md), [analytics/operations contract](docs/ANALYTICS_AND_OPERATIONS.md), [automated assurance](docs/AUTOMATED_ASSURANCE.md), [completion audit](docs/COMPLETION_AUDIT.md), [configuration control matrix](docs/CONFIGURATION_CONTROL_MATRIX.md), [Salesforce architecture](docs/SALESFORCE_ARCHITECTURE.md), [org contract](docs/SALESFORCE_ORG.md), [production activation runbook](docs/PRODUCTION_ACTIVATION_RUNBOOK.md) and [ADR-001](docs/ADR-001-SALESFORCE-NATIVE.md).

## Deploy to Salesforce

Requirements: Salesforce CLI, Node.js 20.19+, pnpm and an authenticated org. The permanent development org uses local alias `Resource360Hub`.

```bash
sf org login web --alias Resource360Hub --instance-url https://login.salesforce.com
sf config set target-org=Resource360Hub target-dev-hub=Resource360Hub
pnpm install --frozen-lockfile
pnpm sf:generate
sf apex run --target-org Resource360Hub --file scripts/apex/pauseResource360Schedule.apex
sf project deploy start --source-dir force-app --target-org Resource360Hub --test-level RunLocalTests --wait 120
sf org assign permset --name Resource360_Administrator --target-org Resource360Hub
sf apex run --target-org Resource360Hub --file scripts/apex/seedResource360.apex
sf apex run --target-org Resource360Hub --file scripts/apex/scheduleResource360.apex
sf org open --target-org Resource360Hub --path /lightning/app/c__Resource360
```

The seed uses fictional identities and `.invalid` email addresses and is safe to rerun.
The pause is idempotent and prevents a known hourly Apex job from colliding with class deployment; always restore the schedule after a successful deployment.

## Validate

```bash
pnpm sf:generate
git diff --exit-code -- force-app/main/default/customMetadata force-app/main/default/permissionsets force-app/main/default/permissionsetgroups docs/REQUIREMENTS_TRACEABILITY.md
pnpm lint
pnpm test
pnpm test:e2e
sf project deploy start --source-dir force-app --target-org Resource360Hub --dry-run --test-level RunLocalTests --wait 120
```

GitHub Salesforce validation activates when encrypted repository secret `RESOURCE360_SFDX_AUTH_URL` exists. The value is piped to Salesforce CLI through standard input and is never committed.

## GitHub Pages companion

```bash
pnpm dev
```

Every push to `main` regenerates governance artifacts, validates, builds and publishes the sanitized companion through `.github/workflows/deploy-pages.yml`. The public endpoint is [singhaditya21.github.io/exl-salesforce-coe-resource360](https://singhaditya21.github.io/exl-salesforce-coe-resource360/). Browser data is fictional and is never synchronized into Salesforce.

## Production boundary

This is a production-shaped control demo, not an EXL production launch. EXL identity, source systems, volumes, policies and approvals are explicit sanitized mock contracts. Authentication remains in the Salesforce CLI keychain and machine-local ignored directories. Never commit tokens, auth URLs, private keys, usernames, org IDs or production data.

EXL activation still requires an EXL-owned target org, SSO/group mapping, approved integration endpoints and credentials, certified source data, selected edition/licensing, migration and volume/concurrency testing, monitoring/backup/retention decisions, privacy/security approval, UAT and release governance. The traceability matrix separates those dependencies from implemented code.
