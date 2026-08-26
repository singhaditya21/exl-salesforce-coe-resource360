# EXL Salesforce COE Resource 360

Resource 360 is a Salesforce-native delivery-control product for EXL’s Salesforce COE. Salesforce is the transactional system of record for engagement economics, staffing, allocations, skills, credentials, timesheets, notifications, integration operations and audit. A sanitized React companion is published on GitHub Pages for public design review without exposing Salesforce data.

The governed chain is:

**Governed intake → approved SOW/amendment/change order → budget and WBS → industry/functional/technical skill matching → staffing decision → committed allocation → PM-controlled dynamic Gantt → approved actuals and acceptance → risk closure → independent project closeout.**

## Salesforce implementation

- EXL-themed Lightning app/LWC with nine modules and all 103 routed screen contracts.
- 40 Salesforce data/config/event types (33 record objects, six custom-metadata types and one platform event), 544 fields/formulas, 30 validation rules, seven guard triggers and native field history on material controls.
- 35 production Apex classes plus 11 focused test classes, including governed intake/commercial/work-plan/risk/closeout transactions, structured skill matching, deterministic golden-path seeding and chunked scope sharing.
- Approved-budget signatures, sequential separation of duties, atomic capacity, effective classification snapshots, allocation lineage, self-approval, eligible time, controlled corrections and five-/seven-day timesheet controls.
- Eighteen least-privilege permission sets composed into 17 business-role groups for 18 governed personas, 19 custom permissions, effective organizational/portfolio scopes and Apex-managed sharing.
- Eleven custom Salesforce report types, eleven runnable reports and an eleven-component dynamic command-center dashboard; two app-activated Lightning pages, nine operating list views, governed related lists and idempotent fictional demo seeding.
- A governed Project Manager workbench for project/initial-SOW intake, approved contract changes and lines, plus a seven-work-package dynamic Gantt with move/resize drag, successor auto-scheduling, critical path, accepted allocation coverage, progress/acceptance evidence, risks and independently approved completion. See the [golden-path contract](docs/PROJECT_DELIVERY_GOLDEN_PATH.md).
- Machine-readable governance, common project and master-data envelope contracts under `contracts/`.
- Release gates covering lint, unit/contract/build, LWC Jest, desktop/mobile Playwright and axe accessibility, Salesforce `RunLocalTests`, an authenticated 103-route Lightning sweep, CodeQL and GitHub Pages.
- One five-pillar Demo Activation Center that rehearses SSO, integrations, production-like fictional data, legal/business approvals and operational controls with attributable evidence, zero external calls and zero destructive actions.

Requirements are in the [consolidated PRD](docs/EXL_Salesforce_COE_Resource360_PRD_v1.0.md); delivery truth is in [requirements traceability](docs/REQUIREMENTS_TRACEABILITY.md) and the [project-delivery golden path](docs/PROJECT_DELIVERY_GOLDEN_PATH.md). The [mock contract register](docs/MOCK_CONTRACT_REGISTER.md) states every EXL assumption and production boundary. See also the [demo activation runbook](docs/DEMO_ACTIVATION_RUNBOOK.md), [persona/access matrix](docs/PERSONA_ACCESS_MATRIX.md), [analytics/operations contract](docs/ANALYTICS_AND_OPERATIONS.md), [automated assurance](docs/AUTOMATED_ASSURANCE.md), [completion audit](docs/COMPLETION_AUDIT.md), [configuration control matrix](docs/CONFIGURATION_CONTROL_MATRIX.md), [Salesforce architecture](docs/SALESFORCE_ARCHITECTURE.md), [org contract](docs/SALESFORCE_ORG.md), [production activation runbook](docs/PRODUCTION_ACTIVATION_RUNBOOK.md) and [ADR-001](docs/ADR-001-SALESFORCE-NATIVE.md).

Five validated product walkthroughs are published from `GLB-06 · User preferences and help` as private Salesforce static resources and under `public/demo-videos/` for the sanitized Pages companion. The [video validation catalog](docs/DEMO_VIDEO_VALIDATION.md) maps each recording to its executed workflow, outcome and demo boundary; CI verifies every MP4 against the checked-in integrity manifest.

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
pnpm sf:prepare-demo
pnpm sf:test:ui
sf project deploy start --source-dir force-app --target-org Resource360Hub --dry-run --test-level RunLocalTests --wait 120
```

GitHub Salesforce validation is mandatory for pushes to `main` and trusted manual runs. It authenticates with encrypted repository secret `RESOURCE360_SFDX_AUTH_URL`; the value is piped to Salesforce CLI through standard input and is never committed. A trusted `main` build pauses the Resource 360 scheduler, deploys with `RunLocalTests`, reinstates the scheduler, waits for permission-group and scope processing, restores deterministic fictional data and persona assignments, verifies the exact scope-share matrix and golden path, refreshes the eleven-component dashboard, validates all eight fictional users through controlled Salesforce Login As (including a live Project Manager workbench write), and then sweeps all 103 Lightning routes as Administrator. Untrusted fork pull requests cannot receive repository secrets and therefore run only the credential-free quality gates.

## GitHub Pages companion

```bash
pnpm dev
```

Every push to `main` regenerates governance artifacts, validates, builds and publishes the sanitized companion through `.github/workflows/deploy-pages.yml`. The public endpoint is [singhaditya21.github.io/exl-salesforce-coe-resource360](https://singhaditya21.github.io/exl-salesforce-coe-resource360/). Browser data is fictional and is never synchronized into Salesforce.

## Production boundary

This is a production-shaped control demo, not an EXL production launch. EXL identity, source systems, volumes, policies and approvals are explicit sanitized mock contracts. Authentication remains in the Salesforce CLI keychain and machine-local ignored directories. Never commit tokens, auth URLs, private keys, usernames, org IDs or production data.

EXL activation still requires an EXL-owned target org, SSO/group mapping, approved integration endpoints and credentials, certified source data, selected edition/licensing, migration and volume/concurrency testing, monitoring/backup/retention decisions, privacy/security approval, UAT and release governance. The traceability matrix separates those dependencies from implemented code.
