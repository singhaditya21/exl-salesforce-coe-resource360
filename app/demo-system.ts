import { useEffect, useMemo, useState } from "react";
import type { StaffingRequest } from "./staffing-workflow";

export const demoRoles = ["Practitioner", "Project Manager", "Reporting Manager", "COE Staffer", "Budget Approver", "Portfolio Manager", "Account Owner", "HOD", "GM/COO Delegate", "Finance/PMO", "Timesheet Approver", "Capability Administrator", "Configuration Operator", "Configuration Approver", "Operations", "Auditor", "Executive Viewer", "Administrator"] as const;
export type DemoRole = typeof demoRoles[number];
export type BudgetState = "Draft" | "Pending approval" | "Approved" | "Rejected";
export type ClaimState = "Pending" | "Approved" | "Rejected";
export type TimeState = "Draft" | "Submitted" | "Approved" | "Rejected";

export type DemoBudget = {
  id: string; engagement: string; version: number; state: BudgetState; revenue: number;
  baseLabour: number; uplift: number; effortContingency: number; expenseContingency: number;
  travelRate: number; onsiteMonths: number; plannedHours: number; currency: "INR";
  submittedBy?: string; decisionNote?: string;
};

export type DemoPerson = {
  id: string; name: string; initials: string; title: string; tower: string; location: string;
  availability: number; skills: { name: string; level: 1 | 2 | 3 | 4; lastUsed: string }[];
  credentials: { name: string; state: "Verified" | "Maintenance due" | "Expired"; verifiedAt: string }[];
};

export type DemoSkillClaim = {
  id: string; personId: string; capability: string; requestedLevel: 1 | 2 | 3 | 4;
  approvedLevel?: 1 | 2 | 3 | 4; evidence: string; state: ClaimState; submittedAt: string; decisionNote?: string;
};

export type DemoAllocation = {
  id: string; requestId: string; employee: string; role: string; engagement: string;
  startDate: string; endDate: string; allocation: number; classification: string; state: "Accepted";
};

export type DemoTimesheet = {
  id: string; employee: string; allocationId: string; engagement: string; week: string;
  hours: number[]; state: TimeState; note?: string;
};

export type DemoNotification = { id: string; title: string; detail: string; time: string; read: boolean; severity: "Normal" | "High"; resolution: "Open" | "Closed"; owner?: string; firstSeen: string; closureNote?: string };
export type DemoAuditEvent = { id: string; action: string; entity: string; actor: string; role: DemoRole; time: string; detail: string };
export type ConfigurationState = "Draft" | "Pending approval" | "Active" | "Rejected" | "Retired";
export type DemoConfiguration = {
  id: string; domain: string; code: string; label: string; value: string; unit?: string;
  version: number; effectiveFrom: string; state: ConfigurationState; reason: string; releaseKey?: string;
};

export type DemoBudgetRosterLine = { id: string; budgetId: string; employeeId: string; employee: string; role: string; month: string; allocation: number; plannedHours: number; costRate: number; roleStart: string; roleEnd: string };
export type MockSourceContract = { id: string; source: string; entity: string; identity: string; canonicalFields: string; owner: string; cadenceHours: number; blocking: boolean; direction: "Inbound" | "Outbound" | "Native"; approvalStatus: "Approved mock assumption"; state: "Fresh" | "Stale" | "Partial" | "Not run" | "Native"; completeness: number; inserted: number; updated: number; collisions: number; cutoff: string; contractVersion: "R360-MOCK-1.2" };
export type DemoPersona = { id: string; role: DemoRole; permissionSetGroup: string; entraGroupAlias: string; scope: string; authority: string; segregation: string; delegationAllowed: boolean; owner: string; approvalStatus: "Approved mock assumption" };
export type DemoRetentionRule = { id: string; category: string; retentionDays: number; legalHoldEligible: boolean; action: string; recoveryDays: number; owner: string; approvalStatus: "Approved mock assumption" };
export type DemoScenario = { id: string; name: string; startDate: string; endDate: string; headcountDelta: number; billableAllocation: number; capacityHours: number; billableHours: number; savedAt: string };
export type DemoActivationPillar = {
  id: "IDENTITY_SSO" | "INTEGRATIONS" | "FICTIONAL_DATA" | "LEGAL_APPROVALS" | "OPERATIONS";
  label: string; owner: string; simulation: string; evidence: string;
  state: "Ready" | "Passed"; lastEvidence?: string;
};
export type DemoActivationRun = { id: string; state: "Passed"; completedAt: string; checksPassed: number; checksTotal: number; boundary: "Sanitized demo only" };
export type DemoApprovalEvidence = { id: string; decision: string; owner: string; status: "Approved mock"; evidenceReference: string; decidedOn: "24 Aug 2026" };

export type DemoState = {
  version: 6;
  signedIn: boolean;
  activeRole: DemoRole;
  budgets: DemoBudget[];
  people: DemoPerson[];
  claims: DemoSkillClaim[];
  allocations: DemoAllocation[];
  timesheets: DemoTimesheet[];
  notifications: DemoNotification[];
  audit: DemoAuditEvent[];
  configurations: DemoConfiguration[];
  budgetRoster: DemoBudgetRosterLine[];
  sourceContracts: MockSourceContract[];
  personas: DemoPersona[];
  retentionRules: DemoRetentionRule[];
  activationPillars: DemoActivationPillar[];
  approvalEvidence: DemoApprovalEvidence[];
  activationRun: DemoActivationRun | null;
  scenarios: DemoScenario[];
};

const STORAGE_KEY = "exl-resource360-demo-v6";
const roleNames = ["Beginner", "Intermediate", "Advanced", "SME"];

function now() {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date());
}

export function calculateBudget(budget: DemoBudget) {
  const burdenedLabour = budget.baseLabour * (1 + budget.uplift / 100) * (1 + budget.effortContingency / 100);
  const travel = budget.onsiteMonths * budget.travelRate * (1 + budget.expenseContingency / 100);
  const totalCost = burdenedLabour + travel;
  const grossMargin = budget.revenue - totalCost;
  return {
    burdenedLabour,
    travel,
    totalCost,
    grossMargin,
    marginPercent: budget.revenue > 0 ? (grossMargin / budget.revenue) * 100 : 0,
    blendedCost: budget.plannedHours > 0 ? totalCost / budget.plannedHours : 0,
  };
}

export function fitForPerson(person: DemoPerson, capability: string, requiredLevel = 3) {
  const skill = person.skills.find((item) => item.name.toLowerCase().includes(capability.toLowerCase()));
  const proficiency = skill ? Math.min(skill.level / requiredLevel, 1) : 0;
  const credential = person.credentials.some((item) => item.state === "Verified") ? 1 : 0;
  const availability = Math.min(person.availability / 40, 1);
  return Math.round((proficiency * .65 + credential * .2 + availability * .15) * 100);
}

export const initialDemoState: DemoState = {
  version: 6,
  signedIn: true,
  activeRole: "COE Staffer",
  budgets: [
    { id: "BUD-1004", engagement: "Global Retail Cloud", version: 4, state: "Approved", revenue: 84_000_000, baseLabour: 51_500_000, uplift: 5, effortContingency: 3, expenseContingency: 2, travelRate: 180_000, onsiteMonths: 6, plannedHours: 11680, currency: "INR", decisionNote: "Approved under the ≥30% route." },
    { id: "BUD-1003", engagement: "Claims Modernization", version: 3, state: "Pending approval", revenue: 69_000_000, baseLabour: 43_800_000, uplift: 5, effortContingency: 4, expenseContingency: 3, travelRate: 165_000, onsiteMonths: 7, plannedHours: 9640, currency: "INR", submittedBy: "Arjun Shah" },
    { id: "BUD-1002", engagement: "Integration Factory", version: 3, state: "Draft", revenue: 36_000_000, baseLabour: 24_000_000, uplift: 4, effortContingency: 5, expenseContingency: 2, travelRate: 150_000, onsiteMonths: 4, plannedHours: 5820, currency: "INR" },
  ],
  people: [
    { id: "EXL-018462", name: "Aarav Mehta", initials: "AM", title: "Data Cloud Architect", tower: "Data & AI", location: "Bengaluru", availability: 40, skills: [{ name: "Data Cloud", level: 4, lastUsed: "Aug 2026" }, { name: "Architecture", level: 4, lastUsed: "Jul 2026" }, { name: "Retail", level: 3, lastUsed: "Aug 2026" }], credentials: [{ name: "Salesforce Data Cloud Consultant", state: "Verified", verifiedAt: "12 Aug 2026" }] },
    { id: "EXL-017091", name: "Riya Sen", initials: "RS", title: "Service Cloud Lead", tower: "Service", location: "Pune", availability: 35, skills: [{ name: "Service Cloud", level: 4, lastUsed: "Aug 2026" }, { name: "Financial Services", level: 3, lastUsed: "Jun 2026" }], credentials: [{ name: "Service Cloud Consultant", state: "Verified", verifiedAt: "06 Aug 2026" }] },
    { id: "EXL-019830", name: "Kabir Rao", initials: "KR", title: "MuleSoft Developer", tower: "Integration", location: "Hyderabad", availability: 100, skills: [{ name: "MuleSoft", level: 3, lastUsed: "Aug 2026" }, { name: "API-led Connectivity", level: 3, lastUsed: "Jul 2026" }], credentials: [{ name: "MuleSoft Developer", state: "Verified", verifiedAt: "15 Aug 2026" }] },
    { id: "EXL-016225", name: "Meera Nair", initials: "MN", title: "FSC Consultant", tower: "Industry", location: "Mumbai", availability: 80, skills: [{ name: "Financial Services Cloud", level: 3, lastUsed: "Aug 2026" }, { name: "Wealth Management", level: 3, lastUsed: "Aug 2026" }], credentials: [{ name: "FSC Accredited Professional", state: "Maintenance due", verifiedAt: "18 May 2026" }] },
    { id: "EXL-013884", name: "Vihaan Iyer", initials: "VI", title: "Technical Architect", tower: "Platform", location: "Chennai", availability: 45, skills: [{ name: "Architecture", level: 4, lastUsed: "Aug 2026" }, { name: "Agentforce", level: 2, lastUsed: "Jul 2026" }], credentials: [{ name: "System Architect", state: "Verified", verifiedAt: "09 Aug 2026" }] },
  ],
  claims: [
    { id: "CLM-2201", personId: "EXL-019830", capability: "API-led Connectivity", requestedLevel: 4, evidence: "Integration Factory architecture and delivery evidence", state: "Pending", submittedAt: "21 Aug 2026" },
  ],
  allocations: [
    { id: "AL-1201", requestId: "SR-1701", employee: "Riya Sen", role: "Service Cloud Lead", engagement: "Claims Modernization", startDate: "01 Aug 2026", endDate: "30 Nov 2026", allocation: 50, classification: "Billing", state: "Accepted" },
  ],
  timesheets: [
    { id: "TS-3401", employee: "Riya Sen", allocationId: "AL-1201", engagement: "Claims Modernization", week: "17–23 Aug 2026", hours: [8, 8, 8, 8, 8, 0, 0], state: "Submitted" },
  ],
  notifications: [
    { id: "NTF-1", title: "Staffing decision due", detail: "SR-1842 reaches SLA in six hours", time: "18 minutes ago", read: false, severity: "High", resolution: "Open", owner: "COE Staffing Pool", firstSeen: "24 Aug 2026, 10:02 am" },
    { id: "NTF-2", title: "Budget approval required", detail: "Claims Modernization · Budget v3", time: "1 hour ago", read: false, severity: "High", resolution: "Open", owner: "Portfolio Finance", firstSeen: "24 Aug 2026, 9:20 am" },
    { id: "NTF-3", title: "Capability claim awaiting review", detail: "Kabir Rao · API-led Connectivity", time: "3 hours ago", read: false, severity: "Normal", resolution: "Open", owner: "Reporting Manager", firstSeen: "24 Aug 2026, 7:41 am" },
  ],
  audit: [
    { id: "AUD-1", action: "BUDGET_SUBMITTED", entity: "BUD-1003", actor: "Arjun Shah", role: "Project Manager", time: "21 Aug 2026, 4:42 pm", detail: "Budget v3 routed for approval" },
    { id: "AUD-2", action: "SKILL_CLAIM_SUBMITTED", entity: "CLM-2201", actor: "Kabir Rao", role: "Practitioner", time: "21 Aug 2026, 2:05 pm", detail: "Requested SME proficiency" },
  ],
  configurations: [
    { id: "CFG-101", domain: "Policy", code: "Staffing_Expiry_Hours", label: "Staffing request SLA", value: "72", unit: "hours", version: 2, effectiveFrom: "2026-04-01", state: "Active", reason: "Initial COE staffing control" },
    { id: "CFG-102", domain: "Approval", code: "Budget_Auto_Approve_Margin", label: "Budget auto-approval margin", value: "30", unit: "percent", version: 3, effectiveFrom: "2026-04-01", state: "Active", reason: "Finance-approved margin route" },
    { id: "CFG-103", domain: "Policy", code: "People_Freshness_Block_Hours", label: "People freshness block", value: "24", unit: "hours", version: 1, effectiveFrom: "2026-08-24", state: "Active", reason: "Fail-closed staffing threshold" },
    { id: "CFG-104", domain: "Escalation", code: "Escalation_WAR_Tiers", label: "WAR escalation tiers", value: "28d Delivery Head · 42d Account Owner · 56d Operations", version: 2, effectiveFrom: "2026-04-01", state: "Active", reason: "Delivery Operations escalation matrix" },
    { id: "CFG-105", domain: "KPI", code: "KPI_Billed_Target_Percent", label: "Billed utilization target", value: "75", unit: "percent", version: 1, effectiveFrom: "2026-08-24", state: "Active", reason: "Assumed EXL demo target" },
    { id: "CFG-106", domain: "Approval", code: "Timesheet_Correction_Dual_Control", label: "Correction dual control", value: "true", version: 1, effectiveFrom: "2026-08-24", state: "Active", reason: "Independent corrected-time approval" },
    { id: "CFG-107", domain: "Policy", code: "Source_Completeness_Threshold_Percent", label: "Source completeness threshold", value: "95", unit: "percent", version: 2, effectiveFrom: "2026-09-01", state: "Draft", reason: "Mock contract completeness release", releaseKey: "EXL-MOCK-2026-09-R1" },
    { id: "CFG-108", domain: "Policy", code: "Scenario_Max_Days", label: "Scenario maximum horizon", value: "730", unit: "days", version: 2, effectiveFrom: "2026-09-01", state: "Draft", reason: "Mock scenario guardrail release", releaseKey: "EXL-MOCK-2026-09-R1" },
  ],
  budgetRoster: [
    { id: "BR-1001", budgetId: "BUD-1004", employeeId: "EXL-DEMO-1001", employee: "Aarav Mehta", role: "Data Cloud Architect", month: "2026-09", allocation: 50, plannedHours: 80, costRate: 4200, roleStart: "2026-09-02", roleEnd: "2027-03-31" },
    { id: "BR-1002", budgetId: "BUD-1004", employeeId: "EXL-DEMO-1002", employee: "Kabir Rao", role: "MuleSoft Developer", month: "2026-09", allocation: 40, plannedHours: 64, costRate: 2750, roleStart: "2026-09-02", roleEnd: "2027-03-31" },
    { id: "BR-1003", budgetId: "BUD-1004", employeeId: "EXL-DEMO-1003", employee: "Riya Sen", role: "Service Cloud Lead", month: "2026-10", allocation: 35, plannedHours: 56, costRate: 3500, roleStart: "2026-10-01", roleEnd: "2027-02-28" },
  ],
  sourceContracts: [
    { id: "People_Master", source: "Mock EXL People Master", entity: "Employee", identity: "Employee ID", canonicalFields: "Name, employment, manager, grade, tower, location, org and capacity", owner: "HRIS / People Data", cadenceHours: 24, blocking: true, direction: "Inbound", approvalStatus: "Approved mock assumption", state: "Fresh", completeness: 99.7, inserted: 4, updated: 1858, collisions: 0, cutoff: "24 Aug 2026, 9:48 am", contractVersion: "R360-MOCK-1.2" },
    { id: "Entra_Identity", source: "Mock Microsoft Entra ID", entity: "Identity", identity: "Entra Object ID + Salesforce User ID", canonicalFields: "Authentication, MFA, lifecycle and governed group aliases", owner: "Identity and Access Management", cadenceHours: 1, blocking: true, direction: "Inbound", approvalStatus: "Approved mock assumption", state: "Fresh", completeness: 100, inserted: 0, updated: 18, collisions: 0, cutoff: "24 Aug 2026, 10:12 am", contractVersion: "R360-MOCK-1.2" },
    { id: "Engagement_Master", source: "Mock EXL Engagement Master", entity: "Engagement", identity: "Engagement ID", canonicalFields: "Name, account, category, revenue type, dates, status, PM and PO value", owner: "PSA / Delivery Operations", cadenceHours: 4, blocking: true, direction: "Inbound", approvalStatus: "Approved mock assumption", state: "Fresh", completeness: 100, inserted: 1, updated: 37, collisions: 0, cutoff: "24 Aug 2026, 10:03 am", contractVersion: "R360-MOCK-1.2" },
    { id: "Commercial_Master", source: "Mock EXL Commercial Master", entity: "CommercialReference", identity: "External reference ID + Engagement ID", canonicalFields: "Type, value, validity, status, signature and currency", owner: "Finance / Commercial Operations", cadenceHours: 24, blocking: true, direction: "Inbound", approvalStatus: "Approved mock assumption", state: "Fresh", completeness: 100, inserted: 0, updated: 38, collisions: 0, cutoff: "24 Aug 2026, 9:30 am", contractVersion: "R360-MOCK-1.2" },
    { id: "Learning_Hub", source: "Mock EXL Learning Gateway", entity: "LearningAchievement", identity: "Achievement ID + Employee ID", canonicalFields: "Course, provider, completion, mapped capability and state", owner: "L&D", cadenceHours: 168, blocking: false, direction: "Inbound", approvalStatus: "Approved mock assumption", state: "Partial", completeness: 96.4, inserted: 82, updated: 214, collisions: 3, cutoff: "23 Aug 2026, 7:00 pm", contractVersion: "R360-MOCK-1.2" },
    { id: "Credential_Gateway", source: "Mock Salesforce Credential Gateway", entity: "Credential", identity: "Credential ID + Employee ID", canonicalFields: "Name, issuer, issue, expiry, maintenance and verification state", owner: "Salesforce Capability / L&D", cadenceHours: 168, blocking: true, direction: "Inbound", approvalStatus: "Approved mock assumption", state: "Fresh", completeness: 99.2, inserted: 11, updated: 1273, collisions: 0, cutoff: "24 Aug 2026, 8:00 am", contractVersion: "R360-MOCK-1.2" },
    { id: "Org_Hierarchy", source: "Mock EXL Org Hierarchy", entity: "OrgUnit", identity: "Org Unit ID", canonicalFields: "Name, type, parent, effective dates and current state", owner: "HRIS / People Data", cadenceHours: 24, blocking: true, direction: "Inbound", approvalStatus: "Approved mock assumption", state: "Fresh", completeness: 98.9, inserted: 2, updated: 47, collisions: 0, cutoff: "24 Aug 2026, 9:45 am", contractVersion: "R360-MOCK-1.2" },
    { id: "Portfolio_Master", source: "Mock EXL Portfolio Master", entity: "Portfolio", identity: "Portfolio ID", canonicalFields: "Name, parent, effective dates and current state", owner: "Delivery Operations", cadenceHours: 24, blocking: true, direction: "Inbound", approvalStatus: "Approved mock assumption", state: "Fresh", completeness: 100, inserted: 0, updated: 8, collisions: 0, cutoff: "24 Aug 2026, 9:45 am", contractVersion: "R360-MOCK-1.2" },
    { id: "Capability_Catalogue", source: "Resource360 governed catalogue", entity: "Capability", identity: "Capability ID", canonicalFields: "Name, type, tower, category, aliases, effective dates and active state", owner: "Salesforce Capability Lead", cadenceHours: 0, blocking: false, direction: "Inbound", approvalStatus: "Approved mock assumption", state: "Native", completeness: 100, inserted: 3, updated: 0, collisions: 0, cutoff: "Current Salesforce metadata", contractVersion: "R360-MOCK-1.2" },
    { id: "Capability_Evidence", source: "Resource360", entity: "SkillClaim", identity: "Skill Claim ID + Resource ID + Capability ID", canonicalFields: "Requested and approved level, evidence, reviewer and decision", owner: "Salesforce Capability Lead", cadenceHours: 0, blocking: false, direction: "Native", approvalStatus: "Approved mock assumption", state: "Native", completeness: 100, inserted: 1, updated: 3, collisions: 0, cutoff: "Transactional", contractVersion: "R360-MOCK-1.2" },
    { id: "Budget_WBS", source: "Resource360", entity: "Budget", identity: "Engagement ID + Budget Version", canonicalFields: "Economics, roster, WBS, signature, approvals and policy version", owner: "Finance / PMO", cadenceHours: 0, blocking: true, direction: "Native", approvalStatus: "Approved mock assumption", state: "Native", completeness: 100, inserted: 3, updated: 4, collisions: 0, cutoff: "Transactional", contractVersion: "R360-MOCK-1.2" },
    { id: "Staffing_Allocation", source: "Resource360", entity: "Allocation", identity: "Request ID + Allocation Version", canonicalFields: "Candidate, role, classification, dates, effort, decision and lineage", owner: "COE Staffing", cadenceHours: 0, blocking: true, direction: "Native", approvalStatus: "Approved mock assumption", state: "Native", completeness: 100, inserted: 1, updated: 1, collisions: 0, cutoff: "Transactional", contractVersion: "R360-MOCK-1.2" },
    { id: "Approved_Time", source: "Resource360", entity: "ApprovedTime", identity: "Timesheet ID + Entry Key + Version", canonicalFields: "Allocation, engagement, date, hours, approval and correction lineage", owner: "Delivery Operations", cadenceHours: 0, blocking: true, direction: "Outbound", approvalStatus: "Approved mock assumption", state: "Fresh", completeness: 100, inserted: 0, updated: 1, collisions: 0, cutoff: "Post-approval event", contractVersion: "R360-MOCK-1.2" },
  ],
  personas: [
    ["Practitioner","Resource360_Practitioner","EXL-R360-Practitioner","Self","Own skills, credentials and time","Self service",false,"Salesforce COE"],
    ["Project Manager","Resource360_Project_Manager","EXL-R360-Project-Manager","Engagement","Budget/WBS and staffing demand","Requester",true,"Delivery Operations"],
    ["Reporting Manager","Resource360_Reporting_Manager","EXL-R360-Reporting-Manager","Manager subtree","Skill review and first-line time approval","People approver",true,"HR / Delivery"],
    ["COE Staffer","Resource360_COE_Staffer","EXL-R360-COE-Staffer","Talent pool and engagement","Staffing arbitration and allocation","Staffing approver",true,"COE Staffing"],
    ["Budget Approver","Resource360_Budget_Approver","EXL-R360-Budget-Approver","Assigned portfolio/engagement","Assigned budget decisions","Budget approver",true,"Finance / Delivery"],
    ["Portfolio Manager","Resource360_Portfolio_Lead","EXL-R360-Portfolio-Lead","Portfolio","First routed budget approval","Budget approver L1",true,"Delivery Leadership"],
    ["Account Owner","Resource360_Account_Owner","EXL-R360-Account-Owner","Account/portfolio","Commercial and unbilled controls","Commercial owner",true,"Account Leadership"],
    ["HOD","Resource360_Head_of_Delivery","EXL-R360-HOD","Delivery hierarchy","Margin and delivery exception approval","Budget approver L2",true,"Delivery Leadership"],
    ["GM/COO Delegate","Resource360_GM_COO_Delegate","EXL-R360-GM-COO","Organization","Highest-risk budget approval","Budget approver L3",true,"COE Leadership"],
    ["Finance/PMO","Resource360_Finance_PMO","EXL-R360-Finance-PMO","Portfolio/engagement","Economics review and reconciliation","Financial control",true,"Finance / PMO"],
    ["Timesheet Approver","Resource360_Timesheet_Approver","EXL-R360-Time-Approver","Manager subtree","Independent correction approval","Time approver L2",true,"Delivery Operations"],
    ["Capability Administrator","Resource360_Capability_Administrator","EXL-R360-Capability-Admin","Capability catalogue","Taxonomy and evidence governance","Capability control",true,"Capability / L&D"],
    ["Configuration Operator","Resource360_Configuration_Operator","EXL-R360-Config-Operator","Configuration","Draft, preview and submit","Configuration maker",false,"Product Operations"],
    ["Configuration Approver","Resource360_Configuration_Approver","EXL-R360-Config-Approver","Configuration","Approve, activate and rollback","Configuration checker",false,"Control Owner"],
    ["Operations","Resource360_Operations_User","EXL-R360-Operations","Organization","Integrations, schedules and recovery","Technical operator",true,"Product Operations"],
    ["Auditor","Resource360_Audit_User","EXL-R360-Auditor","Authorized audit scope","Read immutable evidence","Independent assurance",false,"Risk / Audit"],
    ["Executive Viewer","Resource360_Executive_Viewer","EXL-R360-Executive-Viewer","Organization","Read KPI and portfolio controls","Read-only leadership",true,"COE Leadership"],
    ["Administrator","Resource360_Administrator","EXL-R360-Break-Glass","Organization","Technical break-glass only","Break glass",false,"Salesforce Platform Owner"],
  ].map(([role,permissionSetGroup,entraGroupAlias,scope,authority,segregation,delegationAllowed,owner],index)=>({id:`PER-${String(index+1).padStart(2,"0")}`,role:role as DemoRole,permissionSetGroup:String(permissionSetGroup),entraGroupAlias:String(entraGroupAlias),scope:String(scope),authority:String(authority),segregation:String(segregation),delegationAllowed:Boolean(delegationAllowed),owner:String(owner),approvalStatus:"Approved mock assumption" as const})),
  retentionRules: [
    ["RET-01","Immutable audit evidence",2555,"Retain immutable; production disposition disabled","Risk / Audit"],
    ["RET-02","Approval decisions",2555,"Retain immutable; production disposition disabled","Control Owners"],
    ["RET-03","Budget, staffing and allocation history",2555,"Archive then dispose after approval","Delivery Operations / Finance"],
    ["RET-04","Approved time and corrections",2555,"Archive then dispose after approval","Delivery Operations / Finance"],
    ["RET-05","Skill, credential and learning evidence",2555,"Anonymize or dispose after approval","Capability / L&D"],
    ["RET-06","Integration runs and redacted errors",365,"Dispose after recovery window","Product Operations"],
    ["RET-07","Notifications and closure evidence",365,"Dispose after recovery window","Product Operations"],
    ["RET-08","Outbox and dead-letter evidence",90,"Dispose after recovery window","Product Operations"],
  ].map(([id,category,retentionDays,action,owner])=>({id:String(id),category:String(category),retentionDays:Number(retentionDays),legalHoldEligible:true,action:String(action),recoveryDays:30,owner:String(owner),approvalStatus:"Approved mock assumption" as const})),
  activationPillars: [
    { id: "IDENTITY_SSO", label: "Identity and SSO", owner: "Identity and Access Management", simulation: "Entra SSO assertion, MFA, lifecycle, group-to-permission mapping and active role scope", evidence: "18 governed personas · effective-dated scope · no password or token collected", state: "Ready" },
    { id: "INTEGRATIONS", label: "EXL integrations", owner: "Product Operations", simulation: "Contract-version, schema, freshness, completeness, collision and retry checks for every source", evidence: "13 R360-MOCK-1.2 source contracts · deterministic payload fixtures", state: "Ready" },
    { id: "FICTIONAL_DATA", label: "Production-like data", owner: "Data Governance", simulation: "Fictional volume profile across people, engagements, budgets, staffing, skills and time", evidence: "1,862-person source run · 38 engagements · .invalid identities only", state: "Ready" },
    { id: "LEGAL_APPROVALS", label: "Legal and business approvals", owner: "Risk, Legal, Privacy and Control Owners", simulation: "Mock privacy, retention, legal-hold, security, accessibility and UAT evidence decisions", evidence: "8 retention rules · non-destructive disposition · named fictional control owners", state: "Ready" },
    { id: "OPERATIONS", label: "Operational controls", owner: "Product Operations", simulation: "Scheduler, monitoring, alert, retry/dead-letter, backup, restore and DR rehearsal", evidence: "Hourly control contract · attributable recovery · no external notification sent", state: "Ready" },
  ],
  approvalEvidence: [
    { id: "APR-PRIVACY", decision: "Privacy impact rehearsal", owner: "Privacy Office", status: "Approved mock", evidenceReference: "MOCK-PIA-2026-08", decidedOn: "24 Aug 2026" },
    { id: "APR-SECURITY", decision: "Threat model and access review", owner: "Information Security", status: "Approved mock", evidenceReference: "MOCK-SEC-2026-08", decidedOn: "24 Aug 2026" },
    { id: "APR-RETENTION", decision: "Retention, recovery and legal hold", owner: "Legal / Records Management", status: "Approved mock", evidenceReference: "MOCK-RET-2026-08", decidedOn: "24 Aug 2026" },
    { id: "APR-A11Y", decision: "Accessibility conformance review", owner: "Accessibility Lead", status: "Approved mock", evidenceReference: "MOCK-A11Y-2026-08", decidedOn: "24 Aug 2026" },
    { id: "APR-UAT", decision: "25-scenario business UAT rehearsal", owner: "Salesforce COE Product Owner", status: "Approved mock", evidenceReference: "MOCK-UAT-25-OF-25", decidedOn: "24 Aug 2026" },
    { id: "APR-CUTOVER", decision: "Cutover, rollback and recovery rehearsal", owner: "Release Management", status: "Approved mock", evidenceReference: "MOCK-CUTOVER-2026-08", decidedOn: "24 Aug 2026" },
  ],
  activationRun: null,
  scenarios: [],
};

function readState() {
  if (typeof window === "undefined") return initialDemoState;
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (!value) return initialDemoState;
    const parsed = JSON.parse(value) as DemoState;
    return parsed.version === initialDemoState.version ? parsed : initialDemoState;
  } catch {
    return initialDemoState;
  }
}

export function useDemoSystem() {
  const [state, setState] = useState<DemoState>(readState);
  useEffect(() => window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)), [state]);

  function transact(action: string, entity: string, detail: string, mutate: (current: DemoState) => DemoState, notification?: Omit<DemoNotification, "id" | "time" | "read" | "resolution" | "firstSeen">) {
    setState((current) => {
      const next = mutate(current);
      const time = now();
      const audit: DemoAuditEvent = { id: `AUD-${Date.now()}`, action, entity, actor: "Maya Patel", role: current.activeRole, time, detail };
      return { ...next, audit: [audit, ...next.audit], notifications: notification ? [{ ...notification, id: `NTF-${Date.now()}`, time: "Just now", read: false, resolution: "Open", firstSeen: time }, ...next.notifications] : next.notifications };
    });
  }

  function setRole(role: DemoRole) { setState((current) => ({ ...current, activeRole: role })); }
  function setSignedIn(signedIn: boolean) { setState((current) => ({ ...current, signedIn })); }
  function markNotificationsRead() { setState((current) => ({ ...current, notifications: current.notifications.map((item) => ({ ...item, read: true })) })); }
  function closeNotification(id: string, closureNote: string) { transact("ALERT_CLOSED", id, closureNote, (current) => ({ ...current, notifications: current.notifications.map((item) => item.id === id ? { ...item, resolution: "Closed", owner: item.owner ?? "Maya Patel", closureNote, read: true } : item) })); }

  function updateBudget(id: string, patch: Partial<Pick<DemoBudget, "revenue" | "baseLabour" | "uplift" | "effortContingency" | "expenseContingency" | "travelRate" | "onsiteMonths" | "plannedHours">>) {
    transact("BUDGET_SAVED", id, "Draft assumptions recalculated", (current) => ({ ...current, budgets: current.budgets.map((item) => item.id === id ? { ...item, ...patch, state: "Draft", version: item.state === "Approved" ? item.version + 1 : item.version } : item) }));
  }
  function submitBudget(id: string) {
    transact("BUDGET_SUBMITTED", id, "Budget routed under the active margin policy", (current) => ({ ...current, budgets: current.budgets.map((item) => item.id === id ? { ...item, state: "Pending approval", submittedBy: "Maya Patel" } : item) }), { title: "Budget submitted", detail: `${id} is awaiting an attributable decision`, severity: "Normal" });
  }
  function decideBudget(id: string, decision: "Approved" | "Rejected", note: string) {
    transact(`BUDGET_${decision.toUpperCase()}`, id, note || `${decision} in demo workflow`, (current) => ({ ...current, budgets: current.budgets.map((item) => item.id === id ? { ...item, state: decision, decisionNote: note || `${decision} by Maya Patel` } : item) }), { title: `Budget ${decision.toLowerCase()}`, detail: `${id} · ${note || "Decision recorded"}`, severity: decision === "Rejected" ? "High" : "Normal" });
  }
  function importBudgetRoster(budgetId: string, rows: Omit<DemoBudgetRosterLine, "id" | "budgetId">[]) { transact("BUDGET_ROSTER_IMPORTED", budgetId, `${rows.length} monthly roster rows committed atomically`, (current) => ({ ...current, budgetRoster: [...rows.map((row, index) => ({ ...row, budgetId, id: `BR-${Date.now()}-${index + 1}` })), ...current.budgetRoster] }), { title: "Budget roster imported", detail: `${budgetId} · ${rows.length} validated rows`, severity: "Normal" }); }

  function submitClaim(personId: string, capability: string, requestedLevel: 1 | 2 | 3 | 4, evidence: string) {
    const id = `CLM-${Date.now().toString().slice(-6)}`;
    transact("SKILL_CLAIM_SUBMITTED", id, `${capability} · ${roleNames[requestedLevel - 1]}`, (current) => ({ ...current, claims: [{ id, personId, capability, requestedLevel, evidence, state: "Pending", submittedAt: now() }, ...current.claims] }), { title: "Capability claim submitted", detail: `${capability} is pending manager review`, severity: "Normal" });
  }
  function decideClaim(id: string, decision: "Approved" | "Rejected", approvedLevel: 1 | 2 | 3 | 4, note: string) {
    transact(`SKILL_CLAIM_${decision.toUpperCase()}`, id, note || decision, (current) => {
      const claim = current.claims.find((item) => item.id === id);
      const claims = current.claims.map((item) => item.id === id ? { ...item, state: decision, approvedLevel: decision === "Approved" ? approvedLevel : undefined, decisionNote: note } : item);
      const people = decision === "Approved" && claim ? current.people.map((person) => person.id === claim.personId ? { ...person, skills: [...person.skills.filter((item) => item.name !== claim.capability), { name: claim.capability, level: approvedLevel, lastUsed: "Aug 2026" }] } : person) : current.people;
      return { ...current, claims, people };
    }, { title: `Capability claim ${decision.toLowerCase()}`, detail: `${id} · ${note || "Decision recorded"}`, severity: decision === "Rejected" ? "High" : "Normal" });
  }

  function commitAllocation(request: StaffingRequest) {
    if (state.allocations.some((item) => item.requestId === request.id)) return;
    const allocation: DemoAllocation = { id: `AL-${Date.now().toString().slice(-6)}`, requestId: request.id, employee: request.candidate, role: request.role, engagement: request.engagement, startDate: request.startDate, endDate: request.endDate, allocation: request.allocation, classification: "Billing", state: "Accepted" };
    transact("ALLOCATION_COMMITTED", allocation.id, `${request.candidate} · ${request.allocation}%`, (current) => ({ ...current, allocations: [allocation, ...current.allocations], timesheets: [{ id: `TS-${Date.now().toString().slice(-6)}`, employee: request.candidate, allocationId: allocation.id, engagement: request.engagement, week: "24–30 Aug 2026", hours: [0, 0, 0, 0, 0, 0, 0], state: "Draft" }, ...current.timesheets] }), { title: "Allocation committed", detail: `${request.candidate} can now record eligible time`, severity: "Normal" });
  }

  function updateTimesheet(id: string, day: number, hours: number) { setState((current) => ({ ...current, timesheets: current.timesheets.map((item) => item.id === id ? { ...item, hours: item.hours.map((value, index) => index === day ? Math.max(0, Math.min(8, hours)) : value), state: "Draft" } : item) })); }
  function submitTimesheet(id: string) { transact("TIME_SUBMITTED", id, "Weekly time submitted", (current) => ({ ...current, timesheets: current.timesheets.map((item) => item.id === id ? { ...item, state: "Submitted" } : item) }), { title: "Timesheet submitted", detail: `${id} is ready for manager review`, severity: "Normal" }); }
  function decideTimesheet(id: string, decision: "Approved" | "Rejected", note = "") { transact(`TIME_${decision.toUpperCase()}`, id, note || decision, (current) => ({ ...current, timesheets: current.timesheets.map((item) => item.id === id ? { ...item, state: decision, note } : item) }), { title: `Timesheet ${decision.toLowerCase()}`, detail: `${id} · ${note || "Decision recorded"}`, severity: decision === "Rejected" ? "High" : "Normal" }); }

  function saveConfiguration(input: Pick<DemoConfiguration, "domain" | "code" | "label" | "value" | "unit" | "effectiveFrom" | "reason">) {
    const nextVersion = Math.max(0, ...state.configurations.filter((item) => item.code === input.code).map((item) => item.version)) + 1;
    const id = `CFG-${Date.now().toString().slice(-6)}`;
    const draft: DemoConfiguration = { ...input, id, version: nextVersion, state: "Draft" };
    transact("CONFIG_DRAFT_SAVED", id, `${input.code} v${nextVersion} validated`, (current) => ({ ...current, configurations: [draft, ...current.configurations] }));
    return id;
  }
  function submitConfiguration(id: string) { transact("CONFIG_SUBMITTED", id, "Configuration submitted for independent approval", (current) => ({ ...current, configurations: current.configurations.map((item) => item.id === id ? { ...item, state: "Pending approval" } : item) })); }
  function decideConfiguration(id: string, approve: boolean, note: string) {
    transact(approve ? "CONFIG_ACTIVATED" : "CONFIG_REJECTED", id, note, (current) => {
      const target = current.configurations.find((item) => item.id === id);
      if (!target) return current;
      return { ...current, configurations: current.configurations.map((item) => item.id === id ? { ...item, state: approve ? "Active" : "Rejected" } : approve && item.code === target.code && item.state === "Active" ? { ...item, state: "Retired" } : item) };
    }, { title: approve ? "Configuration activated" : "Configuration rejected", detail: `${id} · ${note}`, severity: approve ? "Normal" : "High" });
  }
  function restoreConfiguration(id: string) {
    const prior = state.configurations.find((item) => item.id === id); if (!prior) return;
    const nextVersion = Math.max(...state.configurations.filter((item) => item.code === prior.code).map((item) => item.version)) + 1;
    const restored = { ...prior, id: `CFG-${Date.now().toString().slice(-6)}`, version: nextVersion, state: "Active" as ConfigurationState, effectiveFrom: new Date().toISOString().slice(0, 10), reason: `Rollback to ${prior.id}` };
    transact("CONFIG_ROLLED_BACK", restored.id, `${prior.code} restored as v${nextVersion}`, (current) => ({ ...current, configurations: [restored, ...current.configurations.map((item) => item.code === prior.code && item.state === "Active" ? { ...item, state: "Retired" as ConfigurationState } : item)] }));
  }

  function assignConfigurationRelease(id: string, releaseKey: string) { transact("CONFIG_RELEASE_ASSIGNED", id, `${id} assigned to ${releaseKey}`, (current) => ({ ...current, configurations: current.configurations.map((item) => item.id === id ? { ...item, releaseKey } : item) })); }
  function submitConfigurationRelease(releaseKey: string) { transact("CONFIG_RELEASE_SUBMITTED", releaseKey, "Atomic release submitted for independent approval", (current) => ({ ...current, configurations: current.configurations.map((item) => item.releaseKey === releaseKey && ["Draft", "Rejected"].includes(item.state) ? { ...item, state: "Pending approval" } : item) })); }
  function decideConfigurationRelease(releaseKey: string, approve: boolean, note: string) { transact(approve ? "CONFIG_RELEASE_ACTIVATED" : "CONFIG_RELEASE_REJECTED", releaseKey, note, (current) => ({ ...current, configurations: current.configurations.map((item) => item.releaseKey === releaseKey && item.state === "Pending approval" ? { ...item, state: approve ? "Active" : "Rejected" } : approve && current.configurations.some((target) => target.releaseKey === releaseKey && target.code === item.code) && item.state === "Active" ? { ...item, state: "Retired" } : item) })); }
  function runMockReconciliation(sourceId: string) { transact("MOCK_SOURCE_RECONCILED", sourceId, "R360-MOCK-1.2 deterministic completeness and collision checks passed", (current) => ({ ...current, sourceContracts: current.sourceContracts.map((item) => item.id === sourceId ? { ...item, state: "Fresh", completeness: 100, collisions: 0, cutoff: now(), updated: item.updated + 1 } : item) }), { title: "Mock source reconciled", detail: `${sourceId} is fresh and 100% complete`, severity: "Normal" }); }
  function runRetentionDryRun() { transact("RETENTION_DRY_RUN", "R360-MOCK-ACTIVATION-2026-08-24", `${state.retentionRules.length} approved mock retention rules evaluated; no records deleted`, (current) => current, { title: "Retention dry run complete", detail: "Approved mock schedule · no data deleted · legal hold false", severity: "Normal" }); }
  function runDemoActivation() {
    const completedAt = now();
    const run: DemoActivationRun = { id: `ACT-${Date.now().toString().slice(-8)}`, state: "Passed", completedAt, checksPassed: 5, checksTotal: 5, boundary: "Sanitized demo only" };
    transact("DEMO_ACTIVATION_PASSED", run.id, "SSO, integrations, fictional data, approvals and operational-control simulations passed without external calls or destructive actions", (current) => ({
      ...current,
      activationRun: run,
      activationPillars: current.activationPillars.map((item) => ({ ...item, state: "Passed", lastEvidence: completedAt })),
      sourceContracts: current.sourceContracts.map((item) => item.direction === "Native" ? item : { ...item, state: "Fresh", completeness: 100, collisions: 0, cutoff: completedAt, updated: item.updated + 1 }),
    }), { title: "Demo activation assurance passed", detail: "5/5 sanitized simulations passed · no EXL system contacted", severity: "Normal" });
    return run.id;
  }
  function saveScenario(input: Omit<DemoScenario, "id" | "savedAt">) { const scenario = { ...input, id: `SCN-${Date.now().toString().slice(-6)}`, savedAt: now() }; transact("WHAT_IF_SCENARIO_SAVED", scenario.id, `${scenario.headcountDelta} HC · ${scenario.billableAllocation}% billable`, (current) => ({ ...current, scenarios: [scenario, ...current.scenarios] })); return scenario.id; }

  function reset() { setState(initialDemoState); }
  const unread = useMemo(() => state.notifications.filter((item) => !item.read).length, [state.notifications]);
  return { state, unread, setRole, setSignedIn, markNotificationsRead, closeNotification, updateBudget, submitBudget, decideBudget, importBudgetRoster, submitClaim, decideClaim, commitAllocation, updateTimesheet, submitTimesheet, decideTimesheet, saveConfiguration, submitConfiguration, decideConfiguration, restoreConfiguration, assignConfigurationRelease, submitConfigurationRelease, decideConfigurationRelease, runMockReconciliation, runRetentionDryRun, runDemoActivation, saveScenario, reset };
}

export type DemoSystem = ReturnType<typeof useDemoSystem>;
