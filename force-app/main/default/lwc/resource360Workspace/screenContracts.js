const ALL_ROLES = ["Practitioner", "Project Manager", "Reporting Manager", "COE Staffer", "Budget Approver", "Portfolio Manager", "Account Owner", "HOD", "GM/COO Delegate", "Finance/PMO", "Timesheet Approver", "Capability Administrator", "Configuration Operator", "Configuration Approver", "Operations", "Auditor", "Executive Viewer", "Administrator"];

const MODULE_CONTRACTS = {
  global: { roles: ALL_ROLES, source: "Salesforce identity, notifications and governed global search", requirements: "CORE-001–009; NFR-SEC; NFR-UX", api: "Resource360Service.getWorkspaceData", events: "ROLE_SCOPE_APPLIED; GLOBAL_SEARCHED", validations: "Authenticated user; active effective role scope; sanitized output" },
  engagement: { roles: ["Project Manager","COE Staffer","Budget Approver","Portfolio Manager","Account Owner","HOD","GM/COO Delegate","Finance/PMO","Operations","Auditor","Executive Viewer","Administrator"], source: "Engagement Master projection, commercial references, current budget, allocations and approved actuals", requirements: "CORE-001–009; RAS-001–020; BUD-001–016", api: "Scoped engagement selectors with user-mode SOQL", events: "ENGAGEMENT_OPENED; RECORD_DRILLDOWN", validations: "Portfolio scope; confidentiality; source freshness; effective dates" },
  staffing: { roles: ["Project Manager","COE Staffer","Reporting Manager","Budget Approver","Portfolio Manager","Account Owner","HOD","GM/COO Delegate","Finance/PMO","Operations","Auditor","Executive Viewer","Administrator"], source: "Staffing_Request__c, Allocation__c, signed Budget__c and resource work calendars", requirements: "RAS-001–020; STF-001–009; GOV-001–010", api: "Resource360StaffingService; Resource360TalentService", events: "STAFFING_REQUEST_CREATED; ALLOCATION_COMMITTED; STAFFING_REQUEST_DECLINED/EXPIRED", validations: "Current signed budget; active employment; per-business-day capacity; idempotency; row locks" },
  skills: { roles: ["Practitioner","Reporting Manager","Project Manager","COE Staffer","Portfolio Manager","HOD","Capability Administrator","Operations","Auditor","Executive Viewer","Administrator"], source: "Capabilities, claims, credentials, learning and verified project evidence", requirements: "SMS-001–021; SFCOE-001–008", api: "Resource360SkillService; Resource360TalentService", events: "SKILL_CLAIM_SUBMITTED/DECIDED; CREDENTIAL_VERIFIED/REVOKED", validations: "Self/team scope; proficiency 1–4; evidence; reviewer segregation; credential validity" },
  budget: { roles: ["Project Manager","Budget Approver","Portfolio Manager","Account Owner","HOD","GM/COO Delegate","Finance/PMO","Operations","Auditor","Executive Viewer","Administrator"], source: "Current versioned Budget__c, Budget_Line__c, Commercial_Reference__c and immutable approval decisions", requirements: "BUD-001–016; GOV-001–010", api: "Resource360BudgetService", events: "BUDGET_VERSION_CREATED; BUDGET_SUBMITTED; BUDGET_APPROVED/REJECTED/INVALIDATED", validations: "WBS reconciliation; active commercial value; economic signature; sequential role; no self-approval" },
  timesheet: { roles: ["Practitioner","Reporting Manager","Timesheet Approver","Project Manager","Finance/PMO","Operations","Auditor","Administrator"], source: "Current Timesheet__c versions and entries authorized by accepted allocations", requirements: "TS-001–010; GOV-001–010", api: "Resource360TimeService", events: "TIMESHEET_CREATED; TIME_ENTRY_SAVED; TIME_SUBMITTED/DECIDED/CORRECTED", validations: "Owner/manager scope; allocation dates; aggregate calendar capacity; immutable approved actuals" },
  command: { roles: ["COE Staffer","Project Manager","Budget Approver","Portfolio Manager","Account Owner","HOD","GM/COO Delegate","Finance/PMO","Timesheet Approver","Capability Administrator","Operations","Auditor","Executive Viewer","Administrator"], source: "Governed Salesforce operational read model with freshness and reconciliation status", requirements: "GOV-001–010; NFR-OPS; NFR-PERF", api: "Resource360Service.getWorkspaceData and certified reports", events: "KPI_DRILLDOWN; EXCEPTION_ASSIGNED", validations: "Role/portfolio scope; KPI cutoff; reconciliation certification" },
  admin: { roles: ["Capability Administrator","Configuration Operator","Configuration Approver","Operations","Auditor","Administrator"], source: "Role scopes, policy metadata, calendars, integration runs/errors, outbox and immutable audit", requirements: "ADM-001–006; CORE-003–009; NFR-SEC; NFR-OPS", api: "Resource360InboundApi; Resource360OperationsScheduler; scoped admin services", events: "CONFIG_CHANGED; SYNC_RUN; OUTBOX_RECOVERED; AUDIT_EXPORTED", validations: "Administrative custom permission; effective dates; no secrets; immutable evidence" },
  ai: { roles: ["COE Staffer","Portfolio Manager","Account Owner","HOD","GM/COO Delegate","Finance/PMO","Operations","Auditor","Executive Viewer","Administrator"], source: "Approved Resource 360 read data only; no autonomous write", requirements: "AI release gate in PRD §6.13 and §17", api: "Feature-gated recommendation contract", events: "AI_QUERY; RECOMMENDATION_REVIEWED; HUMAN_DECISION", validations: "Human confirmation; evidence links; model/version; protected attributes excluded" }
};

const SCREEN_OVERRIDES = {
  "GLB-01": { source: "Mock Entra assertion in the sanitized demo; Salesforce My Domain and EXL federation only after production activation", api: "Resource360AssuranceService.startMockSession; Salesforce SAML/OIDC in production", validations: "No credential collection; fictional identity, MFA, lifecycle, group alias and active scope" },
  "STFUI-01": { delivery: "Operational command", fields: "Engagement, candidate, role, classification, dates, daily hours, owner/review controls" },
  "STFUI-02": { delivery: "Operational search", fields: "Capability, minimum level, role, tower, location, dates and daily hours" },
  "STFUI-15": { delivery: "Operational command", api: "Resource360StaffingService.modifyAllocation", fields: "Current allocation, effective dates, role, classification, daily hours and reason" },
  "STFUI-17": { delivery: "Operational command", api: "Resource360StaffingService.deallocate", fields: "Current allocation, effective end date and mandatory reason" },
  "STFUI-23": { roles: ["COE Staffer","Administrator"], delivery: "Operational decision", api: "Resource360StaffingService.decide", fields: "Staffing request, capacity and commercial revalidation, outcome and mandatory decision evidence" },
  "SKLUI-10": { delivery: "Operational command", fields: "Practitioner, capability, requested proficiency, experience and evidence" },
  "SKLUI-11": { delivery: "Operational command", api: "Resource360SkillService.addCredential", fields: "Credential identity, issuer, dates and HTTPS evidence" },
  "SKLUI-15": { delivery: "Operational decision", api: "Resource360SkillService.decideClaim", fields: "Claim, approved level and mandatory decision evidence" },
  "SKLUI-16": { delivery: "Operational search", fields: "Capability hard gate and weighted skill/availability/experience/recency/credential/context scoring" },
  "BUDUI-06": { delivery: "Operational command", api: "Resource360BudgetService.createVersion", fields: "Current budget version and immutable clone" },
  "BUDUI-08": { delivery: "Operational command", api: "Resource360BudgetService.submit", fields: "WBS reconciliation, commercial value, margin route and economic signature" },
  "BUDUI-10": { delivery: "Operational decision", api: "Resource360BudgetService.decide", fields: "Current approval step, role, signature and decision note" },
  "TIMEUI-01": { delivery: "Operational command", api: "Resource360TimeService.createTimesheet", fields: "Employee and Monday week start" },
  "TIMEUI-02": { delivery: "Operational command", api: "Resource360TimeService.saveEntry", fields: "Timesheet, allocation, work date, work unit, hours and comment" },
  "TIMEUI-07": { delivery: "Operational command", api: "Resource360TimeService.createCorrection", fields: "Approved current timesheet and correction reason" },
  "ADMUI-01": { delivery: "Five-pillar demo activation rehearsal", api: "Resource360AssuranceService.mockAssuranceSnapshot/runDemoActivation", fields: "Identity/SSO, integrations, fictional data, legal/business approvals, operations, run evidence and non-production boundary" },
  "ADMUI-04": { delivery: "Governed configuration control", api: "Resource360ConfigurationService plus role/classification/LOV runtime catalogs", fields: "Delivery role, classification and LOV code, label, enabled state, effective dates and typed attributes" },
  "ADMUI-06": { delivery: "Governed configuration control", api: "Resource360ConfigurationService plus Resource360Policy", fields: "SLA, approval, escalation, KPI and notification controls with preview, approval, activation and rollback" },
  "ADMUI-07": { delivery: "Governed configuration and operational control", api: "Resource360ConfigurationService; Resource360InboundApi v1.1", fields: "Non-secret integration policy, schedule, logical source, run ID, entity contract, cutoff, status and record-level errors" },
  "ADMUI-08": { delivery: "Operational control", api: "Resource360BulkService preview/commit; integration run and row-error register", fields: "Entity contract, source file name/hash, atomic/partial mode, row validation, run counts and redacted errors" },
  "AIUI-01": { delivery: "Feature-gated future release" },
  "AIUI-02": { delivery: "Feature-gated future release" },
  "AIUI-03": { delivery: "Feature-gated future release" },
  "AIUI-04": { delivery: "Feature-gated future release" }
};

export function governedScreens(screens) {
  return screens.map((screen) => {
    const base = MODULE_CONTRACTS[screen.module];
    const override = SCREEN_OVERRIDES[screen.id] || {};
    return {
      ...screen,
      allowedRoles: override.roles || base.roles,
      roleLabel: (override.roles || base.roles).join(", "),
      source: override.source || base.source,
      requirements: override.requirements || base.requirements,
      api: override.api || base.api,
      events: override.events || base.events,
      validations: override.validations || base.validations,
      fields: override.fields || `${screen.kind} archetype fields defined by the PRD catalogue and Salesforce source dictionary`,
      delivery: override.delivery || (screen.module === "ai" ? "Feature-gated future release" : "Governed read/action view"),
      states: ["Loading", "Ready", "Empty", "Filtered empty", "Stale", "Partial data", "Unauthorized", "Failure"],
      acceptance: `Deep link ${screen.id}; server-enforced role/scope; keyboard-operable primary action; correlated audit/event evidence; no browser-authoritative state.`
    };
  });
}
