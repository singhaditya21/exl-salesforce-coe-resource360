# Resource 360 Salesforce environment

## Environment contract

- **Permanent development/demo org:** Resource 360
- **Edition:** Developer Edition and Dev Hub
- **Local CLI alias:** `Resource360Hub`
- **Source of truth:** this GitHub repository
- **Metadata root:** `force-app/main/default`
- **API version:** 67.0

The Lightning application developer name is `Resource360`; the native tab is `Resource360_Workspace`. This Developer Edition remains aligned with the repository for demo/integration validation. Disposable scratch orgs may be used for isolated changes but do not replace it.

All EXL-facing records and connectors in this org are sanitized mock assumptions under `R360-MOCK-1.2`; `docs/MOCK_CONTRACT_REGISTER.md` is the binding demo boundary. Salesforce platform controls are real, but this org must never receive EXL production data or credentials.

## Setup or recovery

```bash
sf org login web --alias Resource360Hub --instance-url https://login.salesforce.com
sf config set target-org=Resource360Hub target-dev-hub=Resource360Hub
pnpm install --frozen-lockfile
pnpm sf:generate
sf project deploy start --source-dir force-app --target-org Resource360Hub --test-level RunLocalTests --wait 120
sf org assign permset --name Resource360_Administrator --target-org Resource360Hub
sf apex run --target-org Resource360Hub --file scripts/apex/seedResource360.apex
sf apex run --target-org Resource360Hub --file scripts/apex/scheduleResource360.apex
sf org open --target-org Resource360Hub --path /lightning/app/c__Resource360
```

Aliases/authentication are machine-local. Metadata, generators, traceability and workflows are portable; `.sf`, `.sfdx`, auth URLs, tokens and org identifiers stay outside Git.

## Change discipline

1. Edit source under `force-app/main/default` and the governed generators.
2. Run `pnpm sf:generate`; classifications, permission sets/groups and traceability must have zero drift.
3. Run frontend and Salesforce dry-run gates.
4. Deploy/seed/schedule in the permanent demo org and verify operational records.
5. Commit through a reviewed pull request; never commit credentials, real identities or production data.

## Validation contract

```bash
pnpm sf:generate
git diff --exit-code -- force-app/main/default/customMetadata force-app/main/default/permissionsets force-app/main/default/permissionsetgroups docs/REQUIREMENTS_TRACEABILITY.md
pnpm lint
pnpm test
pnpm test:e2e
pnpm sf:validate
pnpm sf:prepare-demo
pnpm sf:test:ui
```

The deployment must pass all 12 local Resource 360 Apex test classes (57 methods at this baseline) with no component failure or coverage warning. LWC Jest must prove the 46 specialized plus 57 declarative route partition and the native project workbench; the controlled Login As gate must prove eight fictional identities, 17 certified portfolio scopes, positive and negative role access, live user-mode records and a Project Manager Gantt progress write; and the authenticated Administrator sweep must visit 103/103 screens, render 57/57 explicit workbenches and report zero console errors. The preparation gate must additionally reconcile the exact 10-account/20-project graph, its parent-child cardinalities and user-specific shares. The generated register must contain 109 functional/admin requirements, 25 UAT scenarios (134 total items), 103 unique governed screen IDs, 13 source contracts, 18 persona mappings and eight retention rules. Generated governance files must be committed and no org authentication artifact may be tracked.

The org also contains the shared `Resource 360 Demo Reports` folder with fifteen runnable reports, the shared `Resource 360 Demo Dashboards` folder with the fifteen-component `Resource 360 Command Center`, an app-activated role-aware Home page, an app-specific Engagement delivery page, 13 operating list views, and five private `Resource360_Walkthrough_*` static resources rendered in `GLB-06` with captions.

## CI secret

Protected Salesforce validation uses encrypted GitHub secret `RESOURCE360_SFDX_AUTH_URL`. It is piped without a trailing newline into `sf org login sfdx-url --sfdx-url-stdin=-`; do not print or persist it. Trusted pushes to `main` and manual runs pause the operational scheduler, deploy the source with `RunLocalTests`, reinstate the scheduler even if an earlier step fails, wait for permission-group and scope processing, restore and verify the deterministic fictional scenario and persona assignments, assert the resulting share matrix, refresh the native dashboard, open every fictional user through administrator Login As in an isolated browser context, and sweep the full Lightning route catalog without logging any frontdoor route. They fail closed when the secret is absent. Trusted pull requests temporarily pause the scheduler, perform a check-only deployment with `RunLocalTests`, and always restore the scheduler; untrusted fork pull requests cannot receive repository secrets, so they run the credential-free quality gates and explicitly report that the protected-org check was unavailable.

## Production activation gate

The Developer Edition is not an EXL production tenant. Promotion requires an EXL-owned target org, enterprise SSO/group mapping, encrypted Named/External Credentials or approved middleware, certified source data, migration/reconciliation, volume/concurrency and recovery tests, monitoring/backup/retention decisions, privacy/security approval, business UAT and rollback-approved release governance. Execute and retain the evidence defined in `PRODUCTION_ACTIVATION_RUNBOOK.md`.
