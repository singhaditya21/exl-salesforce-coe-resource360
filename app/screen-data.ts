import type { DemoRole } from "./demo-system";

export type ModuleId = "global" | "engagement" | "staffing" | "skills" | "budget" | "timesheet" | "command" | "admin" | "ai";
export type ScreenKind = "home" | "list" | "detail" | "form" | "planner" | "dashboard" | "admin" | "assistant";

export type ScreenSpec = {
  id: string;
  title: string;
  module: ModuleId;
  kind: ScreenKind;
  description: string;
  primary: string;
  release: "R0" | "R1" | "R2" | "R3";
  eyebrow?: string;
};

export const modules: { id: ModuleId; label: string; icon: string; accent: string }[] = [
  { id: "global", label: "Home & global", icon: "⌂", accent: "#c93600" },
  { id: "engagement", label: "Engagement 360", icon: "◫", accent: "#005071" },
  { id: "staffing", label: "Staffing & allocation", icon: "◎", accent: "#006b72" },
  { id: "skills", label: "Skills & credentials", icon: "◇", accent: "#6558a6" },
  { id: "budget", label: "Budgeting & WBS", icon: "▤", accent: "#8a5b00" },
  { id: "timesheet", label: "Timesheet", icon: "◷", accent: "#236a4d" },
  { id: "command", label: "Command center", icon: "◈", accent: "#233f59" },
  { id: "admin", label: "Administration", icon: "⚙", accent: "#59636c" },
  { id: "ai", label: "Planning intelligence", icon: "✦", accent: "#814f94" },
];

const allRoles: readonly DemoRole[] = ["Practitioner", "Project Manager", "Reporting Manager", "COE Staffer", "Budget Approver", "Portfolio Manager", "Account Owner", "HOD", "GM/COO Delegate", "Finance/PMO", "Timesheet Approver", "Capability Administrator", "Configuration Operator", "Configuration Approver", "Operations", "Auditor", "Executive Viewer", "Administrator"];

export const moduleRoles: Record<ModuleId, readonly DemoRole[]> = {
  global: allRoles,
  engagement: ["Project Manager", "COE Staffer", "Budget Approver", "Portfolio Manager", "Account Owner", "HOD", "GM/COO Delegate", "Finance/PMO", "Operations", "Auditor", "Executive Viewer", "Administrator"],
  staffing: ["Project Manager", "COE Staffer", "Reporting Manager", "Budget Approver", "Portfolio Manager", "Account Owner", "HOD", "GM/COO Delegate", "Finance/PMO", "Operations", "Auditor", "Executive Viewer", "Administrator"],
  skills: ["Practitioner", "Reporting Manager", "Project Manager", "COE Staffer", "Portfolio Manager", "HOD", "Capability Administrator", "Operations", "Auditor", "Executive Viewer", "Administrator"],
  budget: ["Project Manager", "Budget Approver", "Portfolio Manager", "Account Owner", "HOD", "GM/COO Delegate", "Finance/PMO", "Operations", "Auditor", "Executive Viewer", "Administrator"],
  timesheet: ["Practitioner", "Reporting Manager", "Timesheet Approver", "Project Manager", "Finance/PMO", "Operations", "Auditor", "Administrator"],
  command: ["COE Staffer", "Project Manager", "Budget Approver", "Portfolio Manager", "Account Owner", "HOD", "GM/COO Delegate", "Finance/PMO", "Timesheet Approver", "Capability Administrator", "Operations", "Auditor", "Executive Viewer", "Administrator"],
  admin: ["Capability Administrator", "Configuration Operator", "Configuration Approver", "Operations", "Auditor", "Administrator"],
  ai: ["COE Staffer", "Portfolio Manager", "Account Owner", "HOD", "GM/COO Delegate", "Finance/PMO", "Operations", "Auditor", "Executive Viewer", "Administrator"],
};

export const screenRoleOverrides: Readonly<Partial<Record<string, readonly DemoRole[]>>> = {
  "STFUI-23": ["COE Staffer", "Administrator"],
};

export function canAccessScreen(role: DemoRole, screen: ScreenSpec) {
  if (role === "Administrator") return true;
  return (screenRoleOverrides[screen.id] ?? moduleRoles[screen.module]).includes(role);
}

const s = (id: string, title: string, module: ModuleId, kind: ScreenKind, description: string, primary: string, release: ScreenSpec["release"], eyebrow?: string): ScreenSpec => ({ id, title, module, kind, description, primary, release, eyebrow });

export const screens: ScreenSpec[] = [
  s("GLB-01", "EXL SSO entry", "global", "form", "Secure Entra ID entry with access, privacy and service guidance.", "Continue with EXL SSO", "R0", "Identity"),
  s("GLB-02", "Role-aware home", "global", "home", "Priorities, approvals, allocations and quick actions tailored to the active business role.", "New staffing request", "R1", "My workspace"),
  s("GLB-03", "Notification center", "global", "list", "One actionable feed for staffing, budget, skill, credential and time events.", "Mark all read", "R0", "Inbox"),
  s("GLB-04", "Global search", "global", "list", "Search engagements, people, capabilities, credentials and requests without losing scope.", "Search", "R1", "Find anything"),
  s("GLB-05", "Role and scope switcher", "global", "form", "Choose the active role, portfolio scope and effective delegation for this session.", "Apply scope", "R0", "Access context"),
  s("GLB-06", "User preferences and help", "global", "form", "Personalize time zone, density, accessibility, saved views and support paths.", "Save preferences", "R0", "Personal settings"),

  s("ENG-01", "Engagement list", "engagement", "list", "Track delivery, staffing health, approved economics and attention across engagements.", "New engagement view", "R1", "Portfolio"),
  s("ENG-02", "Engagement 360 overview", "engagement", "detail", "A complete delivery, commercial and workforce picture for one engagement.", "Open staffing", "R1", "Global Retail Cloud"),
  s("ENG-03", "Resources tab", "engagement", "list", "Accepted, pending and declined assignments with role, classification and effective dates.", "Add resource", "R1", "Engagement 360"),
  s("ENG-04", "Budget tab", "engagement", "detail", "Approved budget, plan, margin and current plan-to-allocation variance.", "Open budget", "R1", "Engagement 360"),
  s("ENG-05", "Actuals and timesheet tab", "engagement", "dashboard", "Planned, submitted and approved effort with exceptions and reconciliation.", "Export actuals", "R1", "Engagement 360"),
  s("ENG-06", "Work plan and milestones", "engagement", "planner", "Phases, work units, milestones, owners and delivery dates used across the product.", "Add milestone", "R1", "Engagement 360"),
  s("ENG-07", "Risks and actions", "engagement", "list", "A governed action register for staffing, commercial, skill, time and margin risks.", "Add action", "R1", "Engagement 360"),
  s("ENG-08", "Allocation history", "engagement", "list", "Immutable, effective-dated request, decision and allocation change history.", "Export history", "R1", "Engagement 360"),

  s("STFUI-01", "Add-resource launcher", "staffing", "form", "Start a governed resource request from an approved engagement and budget.", "Select engagement and demand source", "R1", "New staffing request"),
  s("STFUI-02", "Search by availability", "staffing", "form", "Find capacity by dates, organizational scope, grade, geography and work pattern.", "Search availability", "R1", "Candidate search"),
  s("STFUI-03", "Availability results", "staffing", "list", "Compare accepted availability, pending demand and capability entry points.", "Add selected", "R1", "Candidate search"),
  s("STFUI-04", "Search by resource", "staffing", "form", "Locate a named practitioner and open their cross-engagement schedule.", "Show schedule", "R1", "Candidate search"),
  s("STFUI-05", "Cross-engagement schedule", "staffing", "planner", "Accepted and pending assignments across projects with capacity remaining by period.", "Propose allocation", "R1", "Resource schedule"),
  s("STFUI-06", "Requirement builder", "staffing", "form", "Define required and preferred role, capability, credential, industry and availability criteria.", "Find candidates", "R1", "Skills-aware staffing"),
  s("STFUI-07", "Candidate shortlist", "staffing", "list", "Compare eligible, partial and unavailable candidates with transparent fit evidence.", "Compare selected", "R1", "Skills-aware staffing"),
  s("STFUI-08", "Practitioner 360 drawer", "staffing", "detail", "Review capability, credential, project evidence and schedule without leaving the shortlist.", "Add to request", "R1", "Practitioner profile"),
  s("STFUI-09", "Classification step", "staffing", "form", "Set role, classification, derived billability, tower and unbilled control fields.", "Apply classification", "R1", "New staffing request"),
  s("STFUI-10", "Scheduling Gantt", "staffing", "planner", "Plan daily effort against accepted commitments, non-working days, WBS and capacity.", "Review request", "R1", "Allocation planning"),
  s("STFUI-11", "Effort editor", "staffing", "form", "Edit dates, effort, work days, phase and work unit with live validation.", "Save effort", "R1", "Allocation planning"),
  s("STFUI-12", "Auto-allocation review", "staffing", "planner", "Review a capacity-aware proposed schedule and unresolved cells before accepting it.", "Accept proposal", "R1", "Allocation planning"),
  s("STFUI-13", "Request review and submit", "staffing", "detail", "Confirm people, roles, classifications, effort, fit, budget coverage and warnings.", "Submit request", "R1", "New staffing request"),
  s("STFUI-14", "Request success and status", "staffing", "detail", "See created request IDs, SLA, notifications and next steps after submission.", "View engagement", "R1", "Request submitted"),
  s("STFUI-15", "Modify allocation", "staffing", "form", "Change a future segment with before/after capacity, economics and approval impact.", "Submit modification", "R1", "Allocation change"),
  s("STFUI-16", "Split allocation", "staffing", "planner", "Split an assignment into effective-dated segments without rewriting history.", "Confirm split", "R1", "Allocation change"),
  s("STFUI-17", "Deallocate resource", "staffing", "form", "End the intended future period with downstream time and capacity impact shown.", "Confirm deallocation", "R1", "Allocation change"),
  s("STFUI-18", "Allocation action menu", "staffing", "detail", "Permission-aware details, schedule, modify, split and deallocation actions.", "Open selected allocation controls", "R1", "Allocation actions"),
  s("STFUI-19", "Bulk import wizard", "staffing", "form", "Map, validate and dry-run controlled allocation request files before commit.", "Run validation", "R2", "Bulk operations"),
  s("STFUI-20", "Import result", "staffing", "list", "Audit success, failures, created requests and corrected-row retry for one batch.", "Download errors", "R2", "Bulk operations"),
  s("STFUI-21", "Staffing queue", "staffing", "list", "Prioritized pending requests with age, fit, conflict, budget and ownership context.", "Review highest-priority staffing request", "R1", "Staffer workbench"),
  s("STFUI-22", "Staffing request detail", "staffing", "detail", "Full request, candidate, budget, capacity and decision history for arbitration.", "Make decision", "R1", "Staffer workbench"),
  s("STFUI-23", "Accept or decline decision", "staffing", "form", "Revalidate capacity and commercial controls before an attributable decision.", "Accept request", "R1", "Staffer decision"),
  s("STFUI-24", "Staffing workload and SLA", "staffing", "dashboard", "Queue aging, outcome, conflict, reason and pool workload performance.", "Export report", "R2", "Staffing performance"),

  s("SKLUI-01", "Individual skills home", "skills", "home", "Personal capability, credential, learning and review-readiness overview.", "Add capability", "R1", "My profile"),
  s("SKLUI-02", "Manager skills home", "skills", "dashboard", "Team coverage, pending reviews, stale profiles and credential risks.", "Review claims", "R2", "My team"),
  s("SKLUI-03", "COE and Staffer skills home", "skills", "dashboard", "Supply depth, demand gaps, profile readiness and capability freshness.", "Open talent search", "R2", "COE capability"),
  s("SKLUI-04", "Admin skills home", "skills", "admin", "Catalogue, access, connector and identity-match health for administrators.", "Review sync health", "R2", "Skills administration"),
  s("SKLUI-05", "Profile — particulars", "skills", "detail", "Authoritative employee, role, organization, location and reporting context.", "View capabilities", "R1", "Practitioner profile"),
  s("SKLUI-06", "Profile — Salesforce capabilities", "skills", "list", "Approved proficiency, years, recency, reviewer and evidence by Salesforce capability.", "Add capability", "R1", "Practitioner profile"),
  s("SKLUI-07", "Profile — industry skills", "skills", "list", "Approved domain skills, experience, evidence and review history.", "Add industry skill", "R1", "Practitioner profile"),
  s("SKLUI-08", "Profile — learning", "skills", "list", "Read-only EXL and Salesforce learning progress with source freshness.", "Explore learning", "R1", "Practitioner profile"),
  s("SKLUI-09", "Profile — certifications", "skills", "list", "Verified Salesforce credentials, maintenance state, source and linked capabilities.", "Add certification", "R1", "Practitioner profile"),
  s("SKLUI-10", "Add capability claim", "skills", "form", "Submit proficiency, experience, recency and evidence for manager review.", "Submit claim", "R1", "Capability claim"),
  s("SKLUI-11", "Add certification", "skills", "form", "Register a credential and consent to governed verification.", "Verify credential", "R1", "Credential"),
  s("SKLUI-12", "My team list", "skills", "list", "Direct reports with capability coverage, credential health and profile freshness.", "Review profiles", "R2", "Manager workspace"),
  s("SKLUI-13", "Team hierarchy", "skills", "detail", "Expandable reporting structure with governed capability coverage.", "Open profile", "R2", "Manager workspace"),
  s("SKLUI-14", "Pending reviews", "skills", "list", "Prioritized capability claims with evidence, age and decision entry points.", "Review oldest pending capability claim", "R1", "Manager workspace"),
  s("SKLUI-15", "Review decision", "skills", "form", "Approve, adjust or reject a claim against level descriptors and evidence.", "Approve claim", "R1", "Capability review"),
  s("SKLUI-16", "Talent search builder", "skills", "form", "Compose multiple mandatory and preferred criteria in strict or ranked mode.", "Run talent search", "R1", "Talent discovery"),
  s("SKLUI-17", "Talent search results", "skills", "list", "Ranked or eligible practitioners with factor-level fit and availability.", "Add to staffing request", "R1", "Talent discovery"),
  s("SKLUI-18", "Capability inventory", "skills", "list", "Browse the active taxonomy, holder counts, levels and capability demand.", "Create capability", "R2", "Catalogue"),
  s("SKLUI-19", "Capability detail", "skills", "detail", "Definition, levels, distribution, holders, credentials and demand signal.", "Edit capability", "R2", "Catalogue"),
  s("SKLUI-20", "Catalogue create and edit", "skills", "form", "Maintain capability identity, hierarchy, aliases, levels and active state.", "Save capability", "R1", "Catalogue administration"),
  s("SKLUI-21", "Proficiency tier editor", "skills", "form", "Define the four ordered proficiency levels with observable behaviors.", "Publish tiers", "R1", "Catalogue administration"),
  s("SKLUI-22", "Role permissions", "skills", "admin", "Configure resource, action and scope permissions with separation controls.", "Preview changes", "R1", "Access administration"),
  s("SKLUI-23", "User access management", "skills", "admin", "Manage user roles, scope, delegation, identity state and import results.", "Assign role", "R1", "Access administration"),
  s("SKLUI-24", "Skills settings and sync health", "skills", "admin", "Monitor People, Learning and Credential connectors, freshness and identity matches.", "Run authorized retry", "R1", "Operations"),

  s("BUDUI-01", "Budget portfolio and projects", "budget", "list", "Compare project economics, approval state and active versions across the portfolio.", "Create budget", "R1", "Budgeting"),
  s("BUDUI-02", "Budget details", "budget", "form", "Set governed revenue, uplift, contingency, travel, duration and currency assumptions.", "Save and continue", "R1", "Budget editor"),
  s("BUDUI-03", "Phase plan", "budget", "planner", "Build contiguous delivery phases and validate them against engagement dates.", "Add phase", "R1", "Budget editor"),
  s("BUDUI-04", "Resource plan grid", "budget", "planner", "Plan role, location, rate and monthly effort across phase-colored periods.", "Add plan row", "R1", "Budget editor"),
  s("BUDUI-05", "WBS and P&L summary", "budget", "dashboard", "Reconcile effort, labor, travel, cost, revenue, gross margin and blended cost.", "Review version", "R1", "Budget editor"),
  s("BUDUI-06", "Versions and timeline", "budget", "detail", "Review immutable budget versions, decisions and current economic signature.", "Compare versions", "R1", "Budget governance"),
  s("BUDUI-07", "Version comparison", "budget", "detail", "Explain assumption, phase, resource, cost and margin changes between versions.", "Return to version", "R1", "Budget governance"),
  s("BUDUI-08", "Submit and routing", "budget", "form", "Preview the active margin policy and route a version for approval.", "Submit for approval", "R1", "Budget governance"),
  s("BUDUI-09", "Approval queue", "budget", "list", "Prioritize budgets by active approval level, margin, change and age.", "Review next budget approval", "R1", "Approvals"),
  s("BUDUI-10", "Approval detail and decision", "budget", "detail", "Decide against a read-only version, comparison, exceptions and prior approvals.", "Approve budget", "R1", "Approvals"),
  s("BUDUI-11", "Budget import and export", "budget", "form", "Validate controlled workbooks, recalculate server-side and audit every batch.", "Import workbook", "R2", "Budget operations"),
  s("BUDUI-12", "Budget administration", "budget", "admin", "Maintain margin tiers, routes, access, fields and policy effective dates.", "Preview policy", "R1", "Budget administration"),

  s("TIMEUI-01", "Weekly timesheet", "timesheet", "planner", "Record time only against accepted engagement, role and work-unit eligibility.", "Submit week", "R1", "My time"),
  s("TIMEUI-02", "Time-entry editor", "timesheet", "form", "Enter hours, role, work unit and comment with allocation-aware validation.", "Save entry", "R1", "My time"),
  s("TIMEUI-03", "Submit week review", "timesheet", "detail", "Review completeness, totals, exceptions and lock consequences before submission.", "Confirm submission", "R1", "My time"),
  s("TIMEUI-04", "Manager team view", "timesheet", "list", "Track employee-week state, totals, exceptions and approval entry points.", "Review next submitted timesheet", "R1", "Team time"),
  s("TIMEUI-05", "Team summary", "timesheet", "dashboard", "Monitor period compliance, approved, pending, rejected and auto-approved effort.", "Export summary", "R1", "Team time"),
  s("TIMEUI-06", "Approval detail", "timesheet", "detail", "Compare submitted time with allocations by day, project, role and work unit.", "Approve week", "R1", "Timesheet approval"),
  s("TIMEUI-07", "Controlled correction", "timesheet", "form", "Route a locked-period project, role or hour correction through dual control.", "Submit correction", "R1", "Timesheet exception"),
  s("TIMEUI-08", "Timesheet compliance", "timesheet", "dashboard", "Find missing, late, unapproved or plan-variance time with accountable owners.", "Export exceptions", "R2", "Compliance"),

  s("CMD-01", "Executive overview", "command", "dashboard", "Headcount, utilization, bench, economics and critical action in one leadership view.", "Export briefing", "R2", "COE command center"),
  s("CMD-02", "Utilization explorer", "command", "dashboard", "Drill from geography to portfolio, engagement and employee across allocation and actuals.", "Open drill-down", "R2", "COE command center"),
  s("CMD-03", "Supply, demand and capacity", "command", "dashboard", "Compare committed supply, soft demand, bench, roll-offs and role gaps over 90 days.", "View demand gaps", "R2", "COE command center"),
  s("CMD-04", "Unbilled governance", "command", "dashboard", "Govern WAR, IFB, Blocked, Shadow and internal capacity by age and escalation.", "Assign action", "R2", "COE command center"),
  s("CMD-05", "Staffing performance", "command", "dashboard", "Measure queue, SLA, decisions, conflicts, expiry and staffer workload.", "View overdue", "R2", "COE command center"),
  s("CMD-06", "Salesforce capability coverage", "command", "dashboard", "See supply depth, credentials, demand gaps and profile readiness by tower and role.", "Open capability gap", "R2", "COE command center"),
  s("CMD-07", "Engagement economics", "command", "dashboard", "Track budget, actual, ETC, EAC, margin and erosion alerts across engagements.", "Review margin risk", "R2", "COE command center"),
  s("CMD-08", "Data quality and sync operations", "command", "dashboard", "Monitor freshness, volume, duplicates, unmatched joins and failed integration events.", "Open runbook", "R0", "Operations center"),
  s("CMD-09", "Audit and override explorer", "command", "list", "Search attributable decisions, changes, overrides and correlated technical events.", "Export audit", "R0", "Control center"),

  s("ADMUI-01", "Administration landing", "admin", "admin", "Run the five-pillar demo activation for SSO, integrations, fictional data, approvals and operations.", "Run demo activation", "R0", "Administration"),
  s("ADMUI-02", "People and access", "admin", "list", "Manage identity state, roles, scope, delegation and access exceptions.", "Add assignment", "R0", "Access"),
  s("ADMUI-03", "Role-permission matrix", "admin", "admin", "Control resource-action-scope permissions with separation-of-duty checks.", "Preview changes", "R0", "Access"),
  s("ADMUI-04", "Field values and LOVs", "admin", "list", "Maintain effective-dated business values, codes and deactivation impact.", "Add value", "R0", "Configuration"),
  s("ADMUI-05", "Calendars and capacity", "admin", "planner", "Maintain regions, holidays, work patterns, capacity and employee overrides.", "Add calendar", "R0", "Configuration"),
  s("ADMUI-06", "Approval and escalation policy", "admin", "admin", "Configure budget tiers, staffing SLA, time windows, unbilled timers and routes.", "Create policy version", "R0", "Configuration"),
  s("ADMUI-07", "Integration configuration", "admin", "admin", "Monitor non-secret connector metadata, schedules, health and authorized tests.", "Test connection", "R0", "Platform"),
  s("ADMUI-08", "Import and batch operations", "admin", "list", "Operate governed batches with counts, errors, retry, cancel and correlation history.", "View failed batches", "R0", "Operations"),

  s("AIUI-01", "Resource assistant", "ai", "assistant", "Ask evidence-backed questions across authorized staffing, capability and delivery data.", "Ask Resource360", "R3", "Planning intelligence"),
  s("AIUI-02", "Recommendation detail", "ai", "detail", "Inspect candidate or reallocation factors, alternatives, impact and feedback.", "Add to review", "R3", "Planning intelligence"),
  s("AIUI-03", "What-if planner", "ai", "planner", "Model isolated demand, capacity, skill and margin scenarios before governed publish.", "Run scenario", "R3", "Planning intelligence"),
  s("AIUI-04", "Agent operations", "ai", "admin", "Monitor agent health, inputs, tools, approvals, alerts and immutable run history.", "Pause agent", "R3", "AI operations"),
];

export const defaultScreenId = "GLB-02";

export const screenById = Object.fromEntries(screens.map((screen) => [screen.id, screen])) as Record<string, ScreenSpec>;
