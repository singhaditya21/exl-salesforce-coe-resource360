# Resource 360 Salesforce architecture

## Deployment topology

| Layer | Implementation | Responsibility |
|---|---|---|
| Experience | Lightning app `Resource360`; LWCs `resource360Workspace`, `resource360GlobalExperience`, `resource360EngagementExperience`, `resource360DomainExperience` and `resource360ProjectWorkbench`; app Home and Engagement record FlexiPages | Role-aware EXL shell, 103 route-specific screen experiences, seven operational visual archetypes, dynamic PM Gantt, commands, related lists and record drill-down |
| Domain services | 38 production Apex classes and 14 focused test classes, including `Resource360ProjectService`, `Resource360StaffingService`, `Resource360PlanningService`, `Resource360CapacityService`, `Resource360Service` and governance/assurance services | Scoped access, locking, commercial/work-plan/closeout gates, skills-backed staffing, non-bypassable capacity planning/ledger controls, decisions, analytics, integration, notifications and audit |
| Demo bootstrap | `Resource360DemoData`, `Resource360DemoScenarioData`, `Resource360GoldenPathData`, `Resource360ScaleDemoData` and `Resource360PerformanceData` Apex | Idempotent fictional baseline, fully linked project-delivery golden path, exact 10-account/20-project enterprise graph and certified forecast/performance history |
| Data | 41 record objects including Account, six custom-metadata types and one platform event | Account/portfolio hierarchy, engagement, contracts/payments, modules/work/dependencies, delivery membership, skills demand/match, economics, staffing, allocation, daily capacity, unavailability, KPI history/forecast, time, risk, closeout, configuration, operations and evidence |
| Policy | 157 governed policy/classification/delivery-role/source/persona/retention records plus effective-dated runtime overrides and atomic release bundles | Thresholds, taxonomies, freshness, scoring, escalation, notification, KPI, lifecycle, margin calculation, capacity guardrails, assurance, lineage, retention preview and access |
| Analytics | `Resource360AnalyticsService`, nineteen custom report types, twenty reports and a twenty-component dashboard | Scoped KPI populations/definitions/cutoffs, 13-week forecast, performance history, project/portfolio drill-down, payment position, capacity/unavailability, over-allocation exceptions and Salesforce report-builder access |
| Public companion | React/Vite on GitHub Pages | Hourly allowlisted Salesforce snapshot plus local fictional workflow demonstrations; never a production system of record |

## Domain model

| Domain | Salesforce objects |
|---|---|
| Account, portfolio and delivery | `Account`, `R360_Portfolio__c`, `R360_Sub_Portfolio__c`, `Engagement__c`, `Project_Module__c`, `Work_Unit__c`, `Work_Dependency__c`, `Project_Risk__c`, `Project_Closeout__c` |
| Commercial and collections | `Commercial_Reference__c`, `Commercial_Line__c`, `Contract_Payment__c` |
| Budget and WBS | `Budget__c`, `Budget_Line__c`, `R360_Approval_Decision__c` |
| People and capability | `Resource__c`, `Capability__c`, `Skill_Claim__c`, `Credential__c`, `R360_Project_Evidence__c`, `R360_Learning_Achievement__c`, `Engagement_Skill_Requirement__c` |
| Staffing and allocation | `R360_Delivery_Membership__c`, `Staffing_Request__c`, `Staffing_Skill_Match__c`, `Allocation__c`, `R360_Daily_Capacity__c`, `R360_Resource_Unavailability__c` |
| Time | `Timesheet__c`, `Time_Entry__c` |
| Scope and configuration | `R360_Role_Scope__c`, `R360_Org_Unit__c`, `R360_Work_Calendar__c`, `R360_Calendar_Exception__c`, `R360_Configuration__c`, `R360_Classification__mdt`, `R360_Delivery_Role__mdt`, `R360_Policy__mdt`, `R360_Persona__mdt`, `R360_Source_Contract__mdt`, `R360_Retention_Rule__mdt` |
| Operations, analytics and evidence | `R360_KPI_Snapshot__c`, `R360_Notification__c`, `R360_Audit_Event__c`, `R360_Integration_Run__c`, `R360_Integration_Error__c`, `R360_Outbox_Event__c`, `Resource360_Domain_Event__e` |

Relationships preserve organizational and decision lineage: Account owns Portfolio, Portfolio owns Sub-portfolio, Delivery Membership effective-dates a Resource's Account/Portfolio/Sub-portfolio alignment, and Project belongs to the same hierarchy. Approved contracts own payment milestones and lines mapped to project modules/WBS items; structured industry/functional/technical requirements produce persisted match evidence; accepted staffing creates a membership-linked current allocation; only eligible accepted allocation periods receive time; delivery acceptance, risk and closeout retain accountable decisions.

## Governed transaction chain

1. Governed intake creates an Engagement, initial SOW and commercial line under one correlation ID.
2. Approved SOW, amendments and change orders retain parent/version/value lineage and map commercial deliverables to WBS work.
3. A PM baselines work, dependencies and milestones; rescheduling validates project bounds, accepted allocation coverage and dependency dates, then cascades successors when requested.
4. Industry, functional and technical requirements are scored against approved practitioner evidence; mandatory gaps block acceptance.
5. Staffing requires an active engagement, current approved signed budget, active classification and per-business-day capacity. Allocation planning is Draft until published; a line cannot exceed 8 hours and aggregate 8–12-hour exceptions require an independently approved reason and review/expiry date.
6. A Staffer decision locks/revalidates the request and creates allocation only on acceptance; allocation and ledger triggers atomically recheck direct DML, lock affected resources and reconcile the daily-capacity ledger, Resource and Delivery Membership summaries. Impossible competing requests remain pending or close with attributable evidence according to policy.
7. Budget economics reconcile to WBS and route through immutable sequential decisions with separation of duties.
8. Talent filter/rank normalizes active weights while mandatory capability, credential, employment, scope and availability gates cannot be compensated.
9. Time uses accepted allocation/date/role and aggregate calendar capacity; approved rows are immutable and corrections create new lineage.
10. Completion fails closed until active work, required acceptance, high risks, time, commercial approval and budget gates pass; independent approval completes the project and releases allocations.
11. Every material transition writes minimized immutable audit evidence and a durable post-commit outbox event.
12. Source, bulk, configuration, scheduler, notification, retention and recovery controls remain as defined in the consolidated PRD.

## Source-system contract

`Resource360InboundApi` exposes versioned idempotent REST ingestion for employee/resource, engagement, capability, credential, learning achievement, commercial reference, org unit and portfolio data. Runs retain cutoff/count/status and payload hashes, not raw sensitive payloads. Partial failures create retryable redacted error records.

For the demo, EXL People Master, engagement/commercial, learning, credential, calendar and finance sources are logical assumptions documented in `MOCK_CONTRACT_REGISTER.md`. Production endpoints, identities and credentials remain EXL-owned activation inputs. Outbound allocation/time/domain events publish through the platform event/outbox boundary for approved middleware subscribers.

## Security and operations

- `with/inherited sharing`, user-mode business-data queries, exact-user system-mode entitlement lookup, field sanitization, 18 permission sets, 17 role groups, 19 custom permissions, effective role scopes, chunked Apex-managed shares, validation and immutable decisions form the control baseline.
- Eighteen governed personas cover self service, project/staffing, leadership/finance, capability, time, configuration, operations, audit and executive viewing. The administrator is technical break-glass and not implicit business authority.
- Material object changes have native field history; immutable audit records add correlation, actor, active role, before/after summaries and hashes.
- Hourly operations process staffing expiry, credential state, timesheet escalation/auto-approval, outbox publication and notification delivery.
- Configuration operators draft/preview/submit; independent configuration approvers activate/rollback and apply the governed cron. See `CONFIGURATION_CONTROL_MATRIX.md` for the full boundary.
- GitHub Pages never receives Salesforce authentication, record IDs, usernames, emails or private/raw business records. GitHub Actions publishes only the explicit sanitized demo allowlist and scans the JSON artifact before release.

## Implemented versus activation-dependent

Deployable in the Developer Edition: model/config/event metadata, formulas, history, validation, guard triggers, transaction/integration/analytics services, roles/sharing, report types, tests, sanitized seed, scheduler, Lightning app, all screen contracts and GitHub Pages companion.

EXL activation: enterprise SSO/group mapping, endpoint credentials and middleware routing, migration, volume/concurrency/recovery testing, email/Teams channel activation, certified KPI targets, backup/retention tooling, privacy/security approvals, UAT and production release governance. Requirement-level truth is generated in `REQUIREMENTS_TRACEABILITY.md`; executable promotion gates are in `PRODUCTION_ACTIVATION_RUNBOOK.md`.
