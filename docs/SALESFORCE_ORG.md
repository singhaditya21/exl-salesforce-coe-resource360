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
```

The deployment must pass all six local Resource 360 Apex test classes (38 methods at this baseline) with no component failure. The generated register must contain 109 functional/admin requirements, 25 UAT scenarios (134 total items), 103 unique governed screen IDs, 13 source contracts, 18 persona mappings and eight retention rules. Generated governance files must be committed and no org authentication artifact may be tracked.

## CI secret

Protected Salesforce validation uses encrypted GitHub secret `RESOURCE360_SFDX_AUTH_URL`. It is piped into `sf org login sfdx-url --sfdx-url-stdin`; do not print or persist it. Pages builds and untrusted pull requests work without the secret and explicitly report that the protected-org gate was skipped.

## Production activation gate

The Developer Edition is not an EXL production tenant. Promotion requires an EXL-owned target org, enterprise SSO/group mapping, encrypted Named/External Credentials or approved middleware, certified source data, migration/reconciliation, volume/concurrency and recovery tests, monitoring/backup/retention decisions, privacy/security approval, business UAT and rollback-approved release governance. Execute and retain the evidence defined in `PRODUCTION_ACTIVATION_RUNBOOK.md`.
