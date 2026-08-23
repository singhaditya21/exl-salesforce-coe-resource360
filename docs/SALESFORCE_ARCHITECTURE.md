# Resource 360 Salesforce architecture

## Deployment topology

| Layer | Implementation | Responsibility |
|---|---|---|
| Experience | Lightning app `Resource360`; LWC `resource360Workspace` | Role-aware EXL shell, 103-screen routes/contracts, commands and record drill-down |
| Domain services | 22 Apex classes behind `Resource360Service` | User-mode access, locking, business gates, decisions, analytics, integration, notifications and audit |
| Demo bootstrap | `Resource360DemoData` Apex | Idempotent fictional records for the Developer Edition demo |
| Data | 26 custom record objects, two custom-metadata types and one platform event | Engagement, economics, staffing, capability, allocation, time, configuration, operations and evidence |
| Policy | 24 metadata records, validation/formulas, guard triggers and role permission groups | Effective thresholds/classifications, lifecycle controls, margin calculation and access |
| Analytics | `Resource360AnalyticsService` and five custom report types | Scoped KPI populations/definitions/cutoffs and Salesforce report-builder access |
| Public companion | React/Vite on GitHub Pages | Sanitized design review only; never a production system of record |

## Domain model

| Domain | Salesforce objects |
|---|---|
| Engagement and commercials | `Engagement__c`, `Commercial_Reference__c`, `Work_Unit__c`, `R360_Portfolio__c` |
| Budget and WBS | `Budget__c`, `Budget_Line__c`, `R360_Approval_Decision__c` |
| People and capability | `Resource__c`, `Capability__c`, `Skill_Claim__c`, `Credential__c`, `R360_Project_Evidence__c`, `R360_Learning_Achievement__c` |
| Staffing and allocation | `Staffing_Request__c`, `Allocation__c` |
| Time | `Timesheet__c`, `Time_Entry__c` |
| Scope and configuration | `R360_Role_Scope__c`, `R360_Org_Unit__c`, `R360_Work_Calendar__c`, `R360_Calendar_Exception__c`, `R360_Classification__mdt`, `R360_Policy__mdt` |
| Operations and evidence | `R360_Notification__c`, `R360_Audit_Event__c`, `R360_Integration_Run__c`, `R360_Integration_Error__c`, `R360_Outbox_Event__c`, `Resource360_Domain_Event__e` |

Relationships preserve decision lineage: accepted staffing creates a versioned current allocation; only eligible accepted allocation periods receive time; budgets and approval decisions remain versioned; capability/credential/project evidence remains attributable to source and reviewer.

## Governed transaction chain

1. Staffing requires an active engagement, current approved signed budget, active classification and per-business-day capacity.
2. A Staffer decision locks/revalidates the request and creates allocation only on acceptance.
3. Newly impossible competing requests close with `CAPACITY_CONSUMED`, audit and notification; feasible demand stays pending.
4. Budget economics reconcile to WBS and route at ≥30%, 25%, 20% and below-20% thresholds through immutable sequential decisions with separation of duties.
5. Talent filter/rank uses policy v1 weights 35/20/15/10/10/10; mandatory capability, credential, employment, scope and availability gates cannot be compensated.
6. Skill and credential evidence follows ownership/reviewer/verification controls and blocks self-approval.
7. Time uses accepted allocation/date/role and aggregate calendar capacity; approved rows are immutable and corrections create new lineage.
8. Submitted time escalates after five days and auto-approves after seven only when no allocation, compliance or financial exception exists.
9. Every material transition writes minimized immutable audit evidence and a durable post-commit outbox event.

## Source-system contract

`Resource360InboundApi` exposes versioned idempotent REST ingestion for employee/resource, engagement, capability, credential, learning achievement, commercial reference, org unit and portfolio data. Runs retain cutoff/count/status and payload hashes, not raw sensitive payloads. Partial failures create retryable redacted error records.

For the demo, EXL People Master, engagement/commercial, learning, credential, calendar and finance sources are assumed. Production endpoints, identities and credentials remain EXL-owned activation inputs. Outbound allocation/time/domain events publish through the platform event/outbox boundary for approved middleware subscribers.

## Security and operations

- `with/inherited sharing`, user-mode SOQL, field sanitization, ten permission sets, eight role groups, custom permissions, effective role scopes, Apex-managed shares, validation and immutable decisions form the control baseline.
- The administrator is break-glass. Normal users compose Practitioner, Project Manager, Reporting Manager, COE Staffer, Budget Approver, Capability Administrator, Operations and Audit groups.
- Material object changes have native field history; immutable audit records add correlation, actor, active role, before/after summaries and hashes.
- Hourly operations process staffing expiry, credential state, timesheet escalation/auto-approval, outbox publication and notification delivery.
- GitHub Pages never receives Salesforce authentication or business records.

## Implemented versus activation-dependent

Deployable in the Developer Edition: model/config/event metadata, formulas, history, validation, guard triggers, transaction/integration/analytics services, roles/sharing, report types, tests, sanitized seed, scheduler, Lightning app, all screen contracts and GitHub Pages companion.

EXL activation: enterprise SSO/group mapping, endpoint credentials and middleware routing, migration, volume/concurrency/recovery testing, email/Teams channel activation, certified KPI targets, backup/retention tooling, privacy/security approvals, UAT and production release governance. Requirement-level truth is generated in `REQUIREMENTS_TRACEABILITY.md`; executable promotion gates are in `PRODUCTION_ACTIVATION_RUNBOOK.md`.
