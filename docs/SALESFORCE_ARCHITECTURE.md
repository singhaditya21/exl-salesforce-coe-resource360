# Resource 360 Salesforce architecture

## Deployment topology

| Layer | Implementation | Responsibility |
|---|---|---|
| Experience | Lightning app `Resource360`; LWC `resource360Workspace` | Role-aware EXL shell, 103-screen navigation, commands and record drill-down |
| Domain service | `Resource360Service` Apex | Transaction boundaries, locking, business gates, decisions, notifications and audit |
| Demo bootstrap | `Resource360DemoData` Apex | Idempotent fictional records for the Developer Edition demo |
| Data | 15 custom Salesforce objects | Engagement, economics, staffing, capability, allocation, time and evidence records |
| Policy | Validation rules, formulas and permission set | Field integrity, lifecycle controls, margin calculation and authorized access |
| Public companion | React/Vite on GitHub Pages | Sanitized design review only; never a production system of record |

## Domain model

| Domain | Salesforce objects |
|---|---|
| Engagement and commercials | `Engagement__c`, `Commercial_Reference__c`, `Work_Unit__c` |
| Budget and WBS | `Budget__c`, `Budget_Line__c` |
| People and capability | `Resource__c`, `Capability__c`, `Skill_Claim__c`, `Credential__c` |
| Staffing and allocation | `Staffing_Request__c`, `Allocation__c` |
| Time | `Timesheet__c`, `Time_Entry__c` |
| Operations and evidence | `R360_Notification__c`, `R360_Audit_Event__c` |

Relationships preserve decision lineage: an accepted staffing request creates a current allocation; only an accepted allocation can receive time; budgets remain versioned by engagement; skill evidence remains attributable to the resource, capability and reviewer.

## Governed transaction chain

1. A staffing request must reference an active engagement, an eligible candidate and an approved budget; requested capacity cannot exceed the resource's available capacity.
2. A Staffer decision locks the request, writes decision evidence and creates the committed allocation only on acceptance.
3. Competing requests that have become impossible are declined with attributable audit evidence.
4. Budget submission computes the economic signature and routes by calculated margin: at least 30% auto-approves, 25–29.99% routes to Portfolio Manager, 20–24.99% requires Portfolio Manager plus HOD, and below 20% adds the General Manager/COO delegate.
5. Skill claims and timesheets follow submitted/pending decision states with reviewer evidence and self-approval controls.
6. Time entries must fall inside the accepted allocation window and cannot exceed the allocation's daily hours.

## Source-system assumptions

The integration contracts in PRD section 17.2 remain authoritative. For planning, Salesforce receives worker, hierarchy and organization attributes from the assumed EXL HR master; engagement/commercial references from the assumed PSA/CRM/finance estate; credentials from approved Salesforce/L&D sources; calendars and FX from governed enterprise services. Resource 360 publishes accepted allocations, time actuals, workflow events and certified operational metrics through approved APIs/events. These are explicit planning assumptions until EXL confirms endpoint owners and data contracts.

## Security and operations

- `with sharing` Apex, object/field permissions, custom-permission decision gates, validation rules and explicit decision evidence form the application control baseline.
- The demo administrator permission set is not the final EXL role model. Production release must map EXL identities into least-privilege role-specific permission sets/groups and apply the PRD segregation matrix.
- Audit records use event and correlation identifiers; external ingestion must use idempotency keys.
- No secret is required by browser code. Salesforce CLI authentication remains local and excluded from Git.
- Developer Edition limits are acceptable for the demo only. Performance, backup, recovery, Event Monitoring, Shield capabilities and retention must be validated in the selected EXL Salesforce edition.

## Implemented versus activation-dependent

Implemented in this repository and the Resource 360 Developer Edition: metadata model, formulas, validation, Apex transaction services, service tests, admin access, sanitized seed, Lightning app, full screen catalogue and GitHub Pages companion.

Activation-dependent on EXL environments: enterprise SSO and role mapping, real source-system adapters, production data migration, record-volume testing, operations integrations, certified KPI pipelines, security/privacy approvals, business UAT and production release governance.
