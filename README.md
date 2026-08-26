# EXL Salesforce COE Resource 360

Resource 360 is a Salesforce-native delivery-control product for EXL’s Salesforce COE. Salesforce is the transactional system of record for engagement economics, staffing, allocations, skills, credentials, timesheets, notifications, integration operations and audit. A sanitized React companion is published on GitHub Pages for public design review using an allowlisted, credential-free Salesforce snapshot; private records and Salesforce identifiers never enter the public artifact.

The governed chain is:

**Governed intake → approved SOW/amendment/change order → budget and WBS → industry/functional/technical skill matching → staffing decision → committed allocation → PM-controlled dynamic Gantt → approved actuals and acceptance → risk closure → independent project closeout.**

## Salesforce implementation

- EXL-themed Lightning app/LWC with nine modules and all 103 routed screen contracts.
- 48 Salesforce data/config/event types (41 record objects including Account, six custom-metadata types and one platform event), 747 fields/formulas, 42 validation rules, nine guard triggers and native field history on material controls.
- 38 production Apex classes plus 14 focused test classes, including governed intake/commercial/work-plan/risk/closeout transactions, structured skill matching, deterministic golden-path, performance-history and 10-account/20-project scale seeding, non-bypassable capacity control and chunked scope sharing.
- Approved-budget signatures, sequential separation of duties, an eight-hour allocation-line maximum, independently approved 8–12-hour aggregate exceptions, a non-bypassable daily-capacity ledger, effective classification snapshots, allocation lineage, self-approval, eight-hour actual-time control, controlled corrections and five-/seven-day timesheet controls.
- Eighteen least-privilege permission sets composed into 17 business-role groups for 18 governed personas, 19 custom permissions, effective organizational/portfolio scopes and Apex-managed sharing.
- Nineteen custom Salesforce report types, twenty runnable reports and a twenty-component dynamic command-center dashboard, including daily-capacity control, over-allocation exceptions, 13-week forecast, project performance and resource unavailability; role-aware KPI cards, 60-member heatmap and exception queue; two app-activated Lightning pages, 13 operating list views, governed related lists and idempotent fictional demo seeding.
- `R360_KPI_Snapshot__c` holds 214 certified monthly, portfolio and 13-week forecast observations. `R360_Resource_Unavailability__c` holds 12 approved mock leave/training events. Project, WBS, budget, payment, staffing, allocation, skill, credential, risk, access and integration records carry the additional schedule, EVM, collections, forecast, freshness, identity and assurance points used by the dashboards.
- A governed Project Manager workbench for project/initial-SOW intake, approved contract changes and lines, plus a seven-work-package dynamic Gantt with move/resize drag, successor auto-scheduling, critical path, accepted allocation coverage, progress/acceptance evidence, risks and independently approved completion. See the [golden-path contract](docs/PROJECT_DELIVERY_GOLDEN_PATH.md).
- A deterministic `R360-SCALE-10X20-V1` portfolio graph: exactly 10 fictional enterprise Accounts, 10 account-aligned Portfolios, 20 Sub-portfolios, 20 fully related Projects, 60 governed delivery members and 60 Project Modules. Every account owns exactly two projects and six delivery memberships; every project has at least two contracts, three payment milestones per contract, three modules, six active work units, dependencies, a current budget, Industry/Functional/Technical demand, staffing, allocations, risks and approved actuals.
- Machine-readable governance, common project and master-data envelope contracts under `contracts/`.
- Release gates covering lint, unit/contract/build, LWC Jest, desktop/mobile Playwright and axe accessibility, Salesforce `RunLocalTests`, an authenticated 103-route Lightning sweep, CodeQL and GitHub Pages.
- One five-pillar Demo Activation Center that rehearses SSO, integrations, production-like fictional data, legal/business approvals and operational controls with attributable evidence, zero external calls and zero destructive actions.

Requirements are in the [consolidated PRD](docs/EXL_Salesforce_COE_Resource360_PRD_v1.0.md); delivery truth is in [requirements traceability](docs/REQUIREMENTS_TRACEABILITY.md) and the [project-delivery golden path](docs/PROJECT_DELIVERY_GOLDEN_PATH.md). The [mock contract register](docs/MOCK_CONTRACT_REGISTER.md) states every EXL assumption and production boundary. See also the [demo activation runbook](docs/DEMO_ACTIVATION_RUNBOOK.md), [persona/access matrix](docs/PERSONA_ACCESS_MATRIX.md), [analytics/operations contract](docs/ANALYTICS_AND_OPERATIONS.md), [automated assurance](docs/AUTOMATED_ASSURANCE.md), [completion audit](docs/COMPLETION_AUDIT.md), [configuration control matrix](docs/CONFIGURATION_CONTROL_MATRIX.md), [Salesforce architecture](docs/SALESFORCE_ARCHITECTURE.md), [org contract](docs/SALESFORCE_ORG.md), [production activation runbook](docs/PRODUCTION_ACTIVATION_RUNBOOK.md) and [ADR-001](docs/ADR-001-SALESFORCE-NATIVE.md).

Five legacy functional-evidence walkthroughs are published from `GLB-06 · User preferences and help` as private Salesforce static resources and under `public/demo-videos/` for the sanitized Pages companion. The [video validation catalog](docs/DEMO_VIDEO_VALIDATION.md) maps each recording to its executed workflow, outcome and demo boundary; CI verifies every MP4 against the checked-in integrity manifest. The tagged v2.0 final recording sequence, persona order, reset controls, narration points and post-production acceptance criteria are defined in the [final demo recording storyboard](docs/DEMO_RECORDING_STORYBOARD.md).

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

The seed uses fictional identities and `.invalid` email addresses, is safe to rerun, and fails its preparation gate unless the exact 10-account/20-project relationship graph and persona-visible share counts reconcile.
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

GitHub Salesforce validation is mandatory for pushes to `main` and trusted manual runs. It authenticates with encrypted repository secret `RESOURCE360_SFDX_AUTH_URL`; the value is passed only through standard input or an ephemeral runner file for Salesforce CLI login and is never committed or printed. A trusted `main` build pauses the Resource 360 scheduler, deploys with `RunLocalTests`, reinstates the scheduler, waits for permission-group and scope processing, restores deterministic fictional data and persona assignments, verifies the exact scope-share matrix, golden path, 10-account/20-project graph and 60-row capacity ledger, refreshes the twenty-component dashboard, validates all eight fictional users through controlled Salesforce Login As (including a live Project Manager workbench write), and then sweeps all 103 Lightning routes as Administrator. Untrusted fork pull requests cannot receive repository secrets and therefore run only the credential-free quality gates.

## GitHub Pages companion

```bash
pnpm dev
```

Every push to `main`, trusted manual run and hourly schedule authenticates to the Developer Org inside GitHub Actions, exports only the explicit public allowlist to `public/data/salesforce-snapshot.json`, scans it for credentials/identities, validates the application and publishes through `.github/workflows/deploy-pages.yml`. The public endpoint is [singhaditya21.github.io/exl-salesforce-coe-resource360](https://singhaditya21.github.io/exl-salesforce-coe-resource360/). The current snapshot contains exactly 10 demo accounts, 20 projects, 60 resources, 13 forecast weeks and 214 KPI observations. Browser workflow writes remain fictional/local and are never written back to Salesforce. See the [synchronization contract and recovery runbook](docs/SALESFORCE_PAGES_SYNC.md).

## Production boundary

This is a production-shaped control demo, not an EXL production launch. EXL identity, source systems, volumes, policies and approvals are explicit sanitized mock contracts. Authentication remains in the Salesforce CLI keychain and machine-local ignored directories. Never commit tokens, auth URLs, private keys, usernames, org IDs or production data.

EXL activation still requires an EXL-owned target org, SSO/group mapping, approved integration endpoints and credentials, certified source data, selected edition/licensing, migration and volume/concurrency testing, monitoring/backup/retention decisions, privacy/security approval, UAT and release governance. The traceability matrix separates those dependencies from implemented code.
