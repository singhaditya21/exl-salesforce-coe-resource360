# Resource 360 automated assurance

## Release gates

| Gate | Evidence | Blocking condition |
|---|---|---|
| Generated governance | `pnpm sf:generate` | Drift in policy, classification, source, persona, retention, permission or traceability artifacts |
| Static quality | `pnpm lint` | ESLint error |
| Unit and contract tests | `pnpm test` | Any Vitest, TypeScript/build, Node contract or static-host test failure |
| Recorded evidence | `pnpm test:videos` | Any of five MP4s or posters is missing, malformed, truncated or differs from its integrity manifest |
| Browser behavior | `pnpm test:e2e` | Desktop/mobile transaction, persona, deep-link, narrow-layout or axe accessibility failure |
| Salesforce metadata | `pnpm sf:validate` | Component compilation or any local Apex test failure |
| Protected-org CI | GitHub `ci.yml` with `RESOURCE360_SFDX_AUTH_URL` | Secret-enabled dry run does not pass `RunLocalTests` |
| Persona Lightning sessions | `pnpm sf:test:personas` | Any of eight fictional identities cannot be reached with controlled Login As, render positive workflow/data, suppress unauthorized modules, or the Project Manager cannot execute an audited live workbench write |
| Security | CodeQL, dependency review and tracked-secret scan | High-confidence credential or blocking code finding |
| Pages | Hourly Salesforce allowlist export, GitHub Pages workflow plus remote HTTP/browser smoke | Export contract/security/count failure, build/deploy failure or non-200 public endpoint |

## Covered invariants

- approved budget signature and immutable decision lineage;
- capacity locking, deterministic competing-request outcome and accepted-allocation-only time;
- eight-hour allocation-line maximum, 12-hour aggregate ceiling, independently approved/expiring over-allocation evidence, direct-DML enforcement, all-60 capacity reconciliation and eight-hour aggregate actual-time ceiling;
- all 18 personas with positive/negative routed access, plus active multi-role and expired-scope Salesforce boundaries, delegation, revocation and separation of duties;
- eight live composite demo identities with 17 certified `PORT-SFCOE-DEMO` scopes, exact Apex-managed shares for the intake portfolio and private business records, commercial-evidence access, stale-share revocation and practitioner self-record isolation;
- source schema version, idempotent run identity, deterministic duplicate survivor, completeness/freshness and redacted errors;
- outbox retry/dead-letter recovery and exactly one governed operations schedule;
- corrected-time dual control, compliance exceptions and immutable approved actuals;
- the exact `ENG-1001` golden path: three contract versions, six commercial lines, seven governed WBS items/dependencies, eleven structured requirements/matches, four staffing/allocation links, approved actuals, risks and closeout;
- the exact `R360-SCALE-10X20-V1` graph: 10 Accounts/Portfolios, 20 Sub-portfolios/Projects, 60 Resources/Memberships/Modules, two projects and six members per Account, multiple contracts, three payments per contract, multi-unit WBS, budgets, three-dimensional skill demand, staffing/allocation, risk, actual and closeout evidence;
- the Project Manager workbench: governed project/SOW intake, commercial-change and line controls, seven direct duration-resize handles, a live forecast write and a live progress write;
- app-activated Home/Engagement pages, governed related lists, 13 operating list views, twenty non-empty native reports and twenty refreshed dashboard components, plus role-aware capacity/performance KPIs, 13-week forecast, heatmap and exception queues;
- exactly 214 effective-dated KPI snapshots, 78 forecast observations across 13 weeks and twelve approved unavailability events;
- a sanitized Pages snapshot with exact 10-account/20-project/60-resource/13-week populations and zero Salesforce IDs, identities, credentials or guardrail breaches;
- eight legal-hold-eligible retention categories with non-destructive preview only;
- all five demo activation domains in one attributable 5/5 dry run with zero external calls and zero destructive actions;
- five published walkthroughs covering discovery, skills, staffing, budget/time and activation at 1280×720 H.264;
- all 103 screen contracts, desktop/mobile routing, 200% zoom and automated axe scans.

Automation is engineering evidence, not EXL production acceptance. Production still requires representative volume/concurrency, SSO, security/privacy, recovery, source reconciliation and named-persona UAT evidence.
