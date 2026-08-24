# Resource 360 sanitized mock contract register

## Contract boundary

This register defines exactly what “for EXL, treat everything as mockup” means in the Resource 360 demo. EXL names, people, identities, systems, source volumes, commercial values, approvals, calendars, taxonomies, thresholds and integration outcomes are deterministic fictional assumptions. They demonstrate the product contract; they are not claims about EXL’s current estate or operating policy.

Two demo runtimes are deliberately different:

| Runtime | What is real | What is mocked |
|---|---|---|
| Salesforce Developer Edition `Resource360Hub` | Salesforce objects/fields, Apex transactions, validation, permissions, sharing, separation of duties, audit, scheduling, reports and Lightning behavior | EXL records, users/personas, source payloads, endpoints, business volumes and policy approvals |
| GitHub Pages | Static application code, 103 routed screen contracts and browser interaction logic | All records and transactions; state is fictional browser-local demo state and never synchronizes with Salesforce |

The banner and source-health surfaces must identify this boundary. No demo state may be presented as a production reconciliation or approved EXL decision.

## Canonical source contracts

Contract version `R360-MOCK-1.2` is the shared deterministic baseline.

| Logical source | Mock entity | Stable identity | Expected cadence | Demo outcome |
|---|---|---|---:|---|
| People Master | Employee/Resource | Employee ID | 24 hours | Employment, manager, grade, location, org and capacity are fictional seeded values |
| Engagement Master | Engagement | Engagement ID | 4 hours | Project dates, portfolio, tower and PM are fictional seeded values |
| Commercial Master | Commercial Reference | External reference ID | 24 hours | PO/SOW coverage and currency context are fictional; no invoice or ERP write occurs |
| Learning Hub | Learning Achievement | Achievement ID plus Employee ID | 168 hours | Course evidence is fictional and never becomes an approved proficiency by itself |
| Credential Gateway | Credential | Credential ID plus Employee ID | 168 hours | Verification/maintenance states are fictional but enforced as distinct evidence |
| Org Hierarchy | Org Unit | Org unit ID | 24 hours | Reporting scope is fictional; Salesforce sharing remains genuinely enforced |
| Portfolio Master | Portfolio | Portfolio ID | 24 hours | Portfolio hierarchy is fictional and used for scoped KPI drill-down |
| Identity Provider | Salesforce demo user/persona | Salesforce User ID | Session | No EXL Entra tenant is connected; production SSO and group mapping remain open activation |

Source runs retain a source cutoff, contract version, processed/success/failure totals, inserts, updates, deactivations, collisions, completeness and freshness. Raw payloads are not retained. Replaying the same content is idempotent; competing duplicates resolve through canonical payload fingerprints, and ambiguous collisions are surfaced rather than silently selected.

## Mock business assumptions

| Area | Sanitized assumption |
|---|---|
| Identity | Seeded employee IDs use demo values; email uses `.invalid`; names are fictional |
| Calendar | Monday–Friday working week with configured demo calendar exceptions |
| Capacity | 8 hours per working day and 160 hours per full resource-month unless an approved runtime policy version changes it |
| Currency | Demo budget presentation uses INR; no EXL finance ledger is connected |
| Budget route | 30% / 25% / 20% margin chain under the captured policy version |
| Utilization targets | Billed 75%, WAR maximum 10%, IFB maximum 2% |
| Staffing SLA | 72 hours by default; effective-dated runtime configuration may replace it |
| Timesheet | Calendar-aware submission/decision controls with five-/seven-day escalation and auto-approval defaults |
| Retention | 2,555-day demo defaults with legal hold off; execution is dry-run only and never deletes records |
| Scenario planning | Deterministic Monday–Friday capacity math; scenarios are non-persistent and do not publish allocations or budgets |
| Notifications | In-app Salesforce evidence is active; Email and Teams are labels only until an EXL-owned adapter is activated |

## Mock personas and approvals

Project Manager, Staffer, Reporting Manager, Budget Approver, Configuration Operator, Configuration Approver, Capability Administrator, Operations and Auditor are demo personas. Their permission-set groups and server checks are real Salesforce controls. Named EXL assignees, delegation policy and organizational scopes are not assumed.

The demo retains genuine control behavior:

- budget, timesheet and configuration decisions reject self-approval where required;
- an atomic configuration release contains at least two settings, shares an effective date and activates all-or-nothing;
- accepted staffing revalidates budget, source freshness and capacity inside the transaction;
- approved budget/time history cannot be edited in place;
- alert closure preserves the original trigger, severity, first-seen time, accountable owner and closure evidence.

## Mock-complete functional surfaces

- 103 governed screen routes with role, source, API, validation, state and acceptance contracts;
- monthly budget/resource roster grid, atomic JSON import, downloadable row errors and as-of EAC assurance;
- daily-hours, allocation-percent and total-hours planning with conflict context;
- candidate status of Eligible, Partially available or Unavailable with explicit gap reasons;
- staffing ownership transfer and SLA evidence;
- source run counts, deterministic duplicate/collision handling, completeness and freshness;
- timesheet compliance exceptions and controlled correction lineage;
- KPI hierarchy from portfolio to Salesforce tower and contributing allocation facts;
- accountable alert closure, mock session boundary audit and non-destructive retention dry run;
- isolated what-if planning;
- effective-dated configuration plus atomic multi-setting release preview, submission, independent decision and rollback.

## Production activation dependencies

Nothing else should be invented to make the demo appear connected. Production requires EXL to supply and approve:

1. an EXL-owned Salesforce org/edition, Entra SSO, users, groups, scopes and license model;
2. actual source-system names, owners, schemas, stable joins, endpoints, credentials, cutoffs, SLAs and representative certified data;
3. named policy/approval owners, thresholds, calendars, taxonomies, volumes and reconciliation tolerances;
4. migration, data quality, security, privacy, accessibility, performance, recovery and UAT evidence;
5. Email/Teams/incident adapters, monitoring, backup/restore, retention/legal-hold and release/cutover approval.

Until these gates are signed, the correct status is **mock contract implemented; EXL production activation required**—never “production connected.”
