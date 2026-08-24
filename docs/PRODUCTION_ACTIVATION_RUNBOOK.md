# Resource360 production activation runbook

## Purpose and boundary

This runbook converts the tested `Resource360Hub` Developer Edition demo into an EXL-operated Salesforce release. The repository contains the Salesforce application, governed metadata, deterministic demo data and deployment automation. It intentionally contains no EXL credentials, personal production data or guessed endpoint URLs.

The complete sanitized assumption boundary is in `MOCK_CONTRACT_REGISTER.md`. Production activation must replace—not silently inherit—each mock source, identity, volume, owner, policy and approval assumption.

GitHub Pages is the sanitized 103-screen design/demo companion. Salesforce Lightning is the transactional application runtime. GitHub Pages never stores or processes production staffing, employee, budget, skill, credential or timesheet data.

## Assumed EXL source façades

| Logical source | Authoritative scope | Resource360 contract | Required EXL owner |
|---|---|---|---|
| EXL People Master | Worker identity, employment state, manager, grade, location and org unit | Versioned worker/org-unit master-data API or events | HRIS / People Data |
| EXL Engagement Master | Account, engagement, portfolio, dates, status, tower and PM | Versioned engagement/portfolio master-data API or events | PSA / Delivery Operations |
| EXL Commercial Master | PO/SOW coverage, currency and approved commercial context | Versioned commercial-status API or events; no invoice/accounting ownership moves to Resource360 | Finance / Commercial Operations |
| EXL Learning Gateway | Course completion and mapped learning evidence | Versioned learning-completion API or events | L&D |
| Approved credential source | Salesforce certification identity, verification and maintenance state | Versioned credential-verification API or events | Salesforce COE Capability / L&D |
| Microsoft Entra ID | Authentication, MFA and lifecycle | Salesforce SAML/OIDC SSO with EXL conditional-access policy | IAM |

If the underlying vendor differs, the façade and canonical Resource360 payload remain stable. EXL must replace each assumption with the approved system name, accountable owner, data classification, endpoint, authentication method, source cutoff and service level before production UAT.

## Environment and deployment gates

1. Select the licensed EXL production Salesforce org and at least one dedicated full/partial sandbox; do not promote the Developer Edition demo as production.
2. Enable My Domain, EXL Entra SSO/MFA, session controls, audit retention and the approved deployment identity.
3. Create Named Credentials and External Credentials in the target org for each approved façade. Store secrets only in Salesforce/GitHub encrypted secret stores; never commit authentication URLs or tokens.
4. Add the encrypted GitHub Actions secret `RESOURCE360_SFDX_AUTH_URL` for the non-production CI validation org. Use a least-privilege integration user and rotate it under EXL policy.
5. Run `pnpm sf:generate`, `pnpm lint`, `pnpm test`, `pnpm test:e2e`, and a Salesforce dry-run with `RunLocalTests`. Generated-file drift, any test failure or component failure blocks promotion.
6. Before an Apex deployment to an already scheduled org, run `scripts/apex/pauseResource360Schedule.apex` and verify that no Resource360 asynchronous job is queued or processing. This avoids Salesforce’s scheduled-class deployment lock.
7. Deploy through the approved EXL release pipeline; assign the smallest applicable Resource360 permission-set group, not the Administrator set by default.
8. Restore `scripts/apex/scheduleResource360.apex` only after a successful deploy/seed. Verify exactly one waiting cron, job execution, outbox retries/dead letters, notification routing and integration-run evidence.
9. Assign configuration operators and independent configuration approvers. Review the deployed catalog, group coordinated settings under a release key, preview the atomic release, retain an independent approval and explicitly apply the governed scheduler cron.
10. Run retention in preview/dry-run mode only until Legal, Privacy and Records Management approve deletion scope, legal-hold behavior and recovery evidence. The delivered baseline never deletes records.

## Data, security and control gates

- Approve the data protection impact assessment, threat model, field-level classification, retention/deletion schedule and non-production masking method.
- Map named EXL users and Entra groups to all 18 delivered personas and scopes in `PERSONA_ACCESS_MATRIX.md`; test positive, negative, delegated, future, expired and revoked access. Administrator rights do not grant business decision authority.
- Certify the machine-readable common project and ingestion schemas under `contracts/`, including stable identities, version compatibility, source ownership, freshness, error semantics and lineage.
- Reconcile a representative migration at record, aggregate and financial-control levels. Load masters before budgets, budgets before staffing/allocations, and allocations before timesheets.
- Certify the effective classification catalogue, billability, SOW/control gates, review periods, escalation policies, capacity calendars, margin thresholds and timesheet deadlines.
- Certify People, Engagement, Commercial and Learning freshness thresholds and prove that stale staffing/budget decisions fail closed. Use `CONFIGURATION_CONTROL_MATRIX.md` as the sign-off inventory.
- Complete performance tests against the PRD volume/concurrency assumptions and accessibility testing at keyboard-only operation and 200% zoom.
- Configure backup/restore, monitoring, alert routing, incident severity, recovery objectives and a tested rollback plan.

## Business acceptance and cutover

1. Execute UAT-01 through UAT-25 with named EXL owners and retained evidence; record pass, accepted exception or defect for every scenario.
2. Obtain Product, Salesforce COE Delivery/Staffing, Finance, HR/L&D, Security, Privacy, Accessibility, Operations and Release Management sign-off.
3. Freeze configuration and migration inputs, take the rollback checkpoint, run the final delta load, reconcile counts/financial totals and enable integrations.
4. Confirm SSO, scoped permissions, notification delivery, scheduled controls, dashboards and support channels before admitting the pilot cohort.
5. Operate an agreed hypercare window with daily KPI/data-quality review and rollback authority.

## Go/no-go evidence

Production go-live is permitted only when all 25 UAT scenarios pass or have approved exceptions, the four activation requirements in `REQUIREMENTS_TRACEABILITY.md` are signed, there are no open Sev-1/Sev-2 defects, reconciliation is signed, security/privacy approvals are recorded, recovery is demonstrated, and operational ownership is accepted. Until then the repository and `Resource360Hub` remain a production-shaped sanitized mock baseline.
