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

| Logical source | Direction | Mock entity | Stable identity | Expected cadence | Demo outcome |
|---|---|---|---|---:|---|
| People Master | Inbound | Employee/Resource | Employee ID | 24 hours | Employment, manager, grade, location, org and capacity are fictional seeded values |
| Microsoft Entra ID | Inbound | Identity | Entra Object ID plus Salesforce User ID | 1 hour | Group aliases are governed metadata; no EXL tenant is connected |
| Engagement Master | Inbound | Engagement | Engagement ID | 4 hours | The common project schema is versioned in `contracts/`; values are fictional |
| Commercial Master | Inbound | Commercial Reference | External reference ID plus Engagement ID | 24 hours | PO/SOW context is fictional; no invoice or ERP write occurs |
| Learning Hub | Inbound | Learning Achievement | Achievement ID plus Employee ID | 168 hours | Course evidence never becomes approved proficiency by itself |
| Credential Gateway | Inbound | Credential | Credential ID plus Employee ID | 168 hours | Verification/maintenance states remain distinct evidence |
| Org Hierarchy | Inbound | Org Unit | Org Unit ID | 24 hours | Scope is fictional; Salesforce sharing is genuinely enforced |
| Portfolio Master | Inbound | Portfolio | Portfolio ID | 24 hours | Hierarchy is fictional and supports scoped KPI drill-down |
| Capability Catalogue | Inbound | Capability | Capability ID | Native | Governed Salesforce capability taxonomy |
| Capability Evidence | Native | Skill Claim | Skill Claim ID plus Resource and Capability IDs | Native | Attributable claim, evidence and reviewer decision |
| Budget and WBS | Native | Budget | Engagement ID plus Budget Version | Native | Versioned economics, route, signature and decision lineage |
| Staffing and Allocation | Native | Allocation | Request ID plus Allocation Version | Native | Attributable decision and effective-dated allocation lineage |
| Approved Time | Outbound | Approved Time | Timesheet ID plus Entry Key plus Version | Native | Only approved, allocation-backed actuals are eligible for export |

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
| Retention | Eight approved mock rules cover 90-, 365- and 2,555-day categories; every category is legal-hold eligible. The global execution switch is off, preview is non-destructive and the demo never deletes records |
| Scenario planning | Deterministic Monday–Friday capacity math; scenarios are non-persistent and do not publish allocations or budgets |
| Notifications | In-app Salesforce evidence is active; Email and Teams are labels only until an EXL-owned adapter is activated |

## Mock personas and approvals

All 18 personas—Practitioner, Project Manager, Reporting Manager, COE Staffer, Budget Approver, Portfolio Manager, Account Owner, HOD, GM/COO Delegate, Finance/PMO, Timesheet Approver, Capability Administrator, Configuration Operator, Configuration Approver, Operations, Auditor, Executive Viewer and Administrator—are governed mock identities. Their permission-set groups, effective-dated role scopes, screen authorization and server checks are real Salesforce controls. Named EXL assignees and approved production group memberships are not assumed. The complete mapping is in `PERSONA_ACCESS_MATRIX.md` and the machine-readable register is `contracts/resource360-governance-register.json`.

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
- effective-dated configuration plus atomic multi-setting release preview, submission, independent decision and rollback;
- 18 positive/negative role navigation contracts shared by Lightning and GitHub Pages;
- machine-readable project/ingestion schemas and a 13-source governance register.

## Production activation dependencies

Nothing else should be invented to make the demo appear connected. Production requires EXL to supply and approve:

1. an EXL-owned Salesforce org/edition, Entra SSO, users, groups, scopes and license model;
2. actual source-system names, owners, schemas, stable joins, endpoints, credentials, cutoffs, SLAs and representative certified data;
3. named policy/approval owners, thresholds, calendars, taxonomies, volumes and reconciliation tolerances;
4. migration, data quality, security, privacy, accessibility, performance, recovery and UAT evidence;
5. Email/Teams/incident adapters, monitoring, backup/restore, retention/legal-hold and release/cutover approval.

Until these gates are signed, the correct status is **implemented in the approved sanitized mock; EXL production certification required**—never “production connected.”
