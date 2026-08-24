# Resource 360 automated assurance

## Release gates

| Gate | Evidence | Blocking condition |
|---|---|---|
| Generated governance | `pnpm sf:generate` | Drift in policy, classification, source, persona, retention, permission or traceability artifacts |
| Static quality | `pnpm lint` | ESLint error |
| Unit and contract tests | `pnpm test` | Any Vitest, TypeScript/build, Node contract or static-host test failure |
| Browser behavior | `pnpm test:e2e` | Desktop/mobile transaction, persona, deep-link, narrow-layout or axe accessibility failure |
| Salesforce metadata | `pnpm sf:validate` | Component compilation or any local Apex test failure |
| Protected-org CI | GitHub `ci.yml` with `RESOURCE360_SFDX_AUTH_URL` | Secret-enabled dry run does not pass `RunLocalTests` |
| Security | CodeQL, dependency review and tracked-secret scan | High-confidence credential or blocking code finding |
| Pages | GitHub Pages workflow plus remote HTTP/browser smoke | Build/deploy failure or non-200 public endpoint |

## Covered invariants

- approved budget signature and immutable decision lineage;
- capacity locking, deterministic competing-request outcome and accepted-allocation-only time;
- effective-dated roles, positive/negative persona access, delegation, revocation and separation of duties;
- source schema version, idempotent run identity, deterministic duplicate survivor, completeness/freshness and redacted errors;
- outbox retry/dead-letter recovery and exactly one governed operations schedule;
- corrected-time dual control, compliance exceptions and immutable approved actuals;
- eight legal-hold-eligible retention categories with non-destructive preview only;
- all 103 screen contracts, desktop/mobile routing, 200% zoom and automated axe scans.

Automation is engineering evidence, not EXL production acceptance. Production still requires representative volume/concurrency, SSO, security/privacy, recovery, source reconciliation and named-persona UAT evidence.
