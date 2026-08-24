# Resource 360 persona and access matrix

## Control contract

Resource 360 defines 18 active business personas in `R360_Persona__mdt`. Each mapping binds one business role to a Salesforce permission-set group, fictional Entra group alias, record scope, decision authority, segregation class, delegation policy and control owner. Runtime roles require an active, effective-dated `R360_Role_Scope__c` record; an expired, future, revoked or unknown role fails closed. Administrator is technical break-glass and does not implicitly satisfy business approval roles.

| Persona | Permission-set group | Scope | Decision authority | Delegable |
|---|---|---|---|---:|
| Practitioner | `Resource360_Practitioner` | Self | Own skills, credentials and time | No |
| Project Manager | `Resource360_Project_Manager` | Engagement | Budget/WBS and staffing demand | Yes |
| Reporting Manager | `Resource360_Reporting_Manager` | Manager subtree | Skill review and first-line time approval | Yes |
| COE Staffer | `Resource360_COE_Staffer` | Talent pool and engagement | Staffing arbitration and allocation | Yes |
| Budget Approver | `Resource360_Budget_Approver` | Assigned portfolio/engagement | Assigned budget decisions | Yes |
| Portfolio Manager | `Resource360_Portfolio_Lead` | Portfolio | First routed budget approval and portfolio controls | Yes |
| Account Owner | `Resource360_Account_Owner` | Account/portfolio | Commercial and unbilled exception ownership | Yes |
| HOD | `Resource360_Head_of_Delivery` | Delivery hierarchy | Margin and delivery exception approval | Yes |
| GM/COO Delegate | `Resource360_GM_COO_Delegate` | Organization | Highest-risk budget approval | Yes |
| Finance/PMO | `Resource360_Finance_PMO` | Portfolio/engagement | Economics review and governed reconciliation | Yes |
| Timesheet Approver | `Resource360_Timesheet_Approver` | Manager subtree | Independent correction final approval | Yes |
| Capability Administrator | `Resource360_Capability_Administrator` | Capability catalogue | Taxonomy, credential and evidence governance | Yes |
| Configuration Operator | `Resource360_Configuration_Operator` | Configuration | Draft, preview and submit configuration | No |
| Configuration Approver | `Resource360_Configuration_Approver` | Configuration | Approve, activate and roll back configuration | No |
| Operations | `Resource360_Operations_User` | Organization | Integrations, schedules, reconciliation and recovery | Yes |
| Auditor | `Resource360_Audit_User` | Authorized audit scope | Read immutable audit and decision evidence | No |
| Executive Viewer | `Resource360_Executive_Viewer` | Organization | Read KPI and portfolio controls | Yes |
| Administrator | `Resource360_Administrator` | Organization | Technical break-glass only | No |

## Screen-module visibility

`Home & global` is available to every authenticated persona. Administrator can open every module for recovery. Other module access is explicit:

| Module | Authorized personas besides Administrator |
|---|---|
| Engagement 360 | Project Manager, COE Staffer, Budget Approver, Portfolio Manager, Account Owner, HOD, GM/COO Delegate, Finance/PMO, Operations, Auditor, Executive Viewer |
| Staffing & allocation | Project Manager, COE Staffer, Reporting Manager, Budget Approver, Portfolio Manager, Account Owner, HOD, GM/COO Delegate, Finance/PMO, Operations, Auditor, Executive Viewer |
| Skills & credentials | Practitioner, Reporting Manager, Project Manager, COE Staffer, Portfolio Manager, HOD, Capability Administrator, Operations, Auditor, Executive Viewer |
| Budgeting & WBS | Project Manager, Budget Approver, Portfolio Manager, Account Owner, HOD, GM/COO Delegate, Finance/PMO, Operations, Auditor, Executive Viewer |
| Timesheet | Practitioner, Reporting Manager, Timesheet Approver, Project Manager, Finance/PMO, Operations, Auditor |
| Command center | COE Staffer, Project Manager, Budget Approver, Portfolio Manager, Account Owner, HOD, GM/COO Delegate, Finance/PMO, Timesheet Approver, Capability Administrator, Operations, Auditor, Executive Viewer |
| Administration | Capability Administrator, Configuration Operator, Configuration Approver, Operations, Auditor |
| Planning intelligence | COE Staffer, Portfolio Manager, Account Owner, HOD, GM/COO Delegate, Finance/PMO, Operations, Auditor, Executive Viewer |

The public companion hides unauthorized modules, search results and routes, and renders an access-denied surface for a restricted deep link. The Lightning workspace applies the same module matrix and server-side custom permissions remain authoritative for every command. Automated tests cover positive navigation, negative navigation, restricted deep links, expired/future scopes, unknown roles, non-delegable roles and absence of implicit business authority.
