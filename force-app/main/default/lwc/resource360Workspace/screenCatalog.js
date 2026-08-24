export const MODULES = [
  {
    "id": "global",
    "label": "Home & global",
    "icon": "utility:home"
  },
  {
    "id": "engagement",
    "label": "Engagement 360",
    "icon": "standard:work_order"
  },
  {
    "id": "staffing",
    "label": "Staffing & allocation",
    "icon": "standard:service_resource"
  },
  {
    "id": "skills",
    "label": "Skills & credentials",
    "icon": "standard:skill_entity"
  },
  {
    "id": "budget",
    "label": "Budgeting & WBS",
    "icon": "standard:currency"
  },
  {
    "id": "timesheet",
    "label": "Timesheet",
    "icon": "standard:timesheet"
  },
  {
    "id": "command",
    "label": "Command center",
    "icon": "standard:dashboard"
  },
  {
    "id": "admin",
    "label": "Administration",
    "icon": "utility:settings"
  },
  {
    "id": "ai",
    "label": "Planning intelligence",
    "icon": "utility:einstein"
  }
];

export const SCREENS = [
  {
    "id": "GLB-01",
    "title": "EXL SSO entry",
    "module": "global",
    "kind": "form",
    "description": "Secure Entra ID entry with access, privacy and service guidance.",
    "primary": "Continue with EXL SSO",
    "release": "R0",
    "eyebrow": "Identity"
  },
  {
    "id": "GLB-02",
    "title": "Role-aware home",
    "module": "global",
    "kind": "home",
    "description": "Priorities, approvals, allocations and quick actions tailored to the active business role.",
    "primary": "New staffing request",
    "release": "R1",
    "eyebrow": "My workspace"
  },
  {
    "id": "GLB-03",
    "title": "Notification center",
    "module": "global",
    "kind": "list",
    "description": "One actionable feed for staffing, budget, skill, credential and time events.",
    "primary": "Mark all read",
    "release": "R0",
    "eyebrow": "Inbox"
  },
  {
    "id": "GLB-04",
    "title": "Global search",
    "module": "global",
    "kind": "list",
    "description": "Search engagements, people, capabilities, credentials and requests without losing scope.",
    "primary": "Search",
    "release": "R1",
    "eyebrow": "Find anything"
  },
  {
    "id": "GLB-05",
    "title": "Role and scope switcher",
    "module": "global",
    "kind": "form",
    "description": "Choose the active role, portfolio scope and effective delegation for this session.",
    "primary": "Apply scope",
    "release": "R0",
    "eyebrow": "Access context"
  },
  {
    "id": "GLB-06",
    "title": "User preferences and help",
    "module": "global",
    "kind": "form",
    "description": "Personalize time zone, density, accessibility, saved views and support paths.",
    "primary": "Save preferences",
    "release": "R0",
    "eyebrow": "Personal settings"
  },
  {
    "id": "ENG-01",
    "title": "Engagement list",
    "module": "engagement",
    "kind": "list",
    "description": "Track delivery, staffing health, approved economics and attention across engagements.",
    "primary": "New engagement view",
    "release": "R1",
    "eyebrow": "Portfolio"
  },
  {
    "id": "ENG-02",
    "title": "Engagement 360 overview",
    "module": "engagement",
    "kind": "detail",
    "description": "A complete delivery, commercial and workforce picture for one engagement.",
    "primary": "Open staffing",
    "release": "R1",
    "eyebrow": "Global Retail Cloud"
  },
  {
    "id": "ENG-03",
    "title": "Resources tab",
    "module": "engagement",
    "kind": "list",
    "description": "Accepted, pending and declined assignments with role, classification and effective dates.",
    "primary": "Add resource",
    "release": "R1",
    "eyebrow": "Engagement 360"
  },
  {
    "id": "ENG-04",
    "title": "Budget tab",
    "module": "engagement",
    "kind": "detail",
    "description": "Approved budget, plan, margin and current plan-to-allocation variance.",
    "primary": "Open budget",
    "release": "R1",
    "eyebrow": "Engagement 360"
  },
  {
    "id": "ENG-05",
    "title": "Actuals and timesheet tab",
    "module": "engagement",
    "kind": "dashboard",
    "description": "Planned, submitted and approved effort with exceptions and reconciliation.",
    "primary": "Export actuals",
    "release": "R1",
    "eyebrow": "Engagement 360"
  },
  {
    "id": "ENG-06",
    "title": "Work plan and milestones",
    "module": "engagement",
    "kind": "planner",
    "description": "Phases, work units, milestones, owners and delivery dates used across the product.",
    "primary": "Add milestone",
    "release": "R1",
    "eyebrow": "Engagement 360"
  },
  {
    "id": "ENG-07",
    "title": "Risks and actions",
    "module": "engagement",
    "kind": "list",
    "description": "A governed action register for staffing, commercial, skill, time and margin risks.",
    "primary": "Add action",
    "release": "R1",
    "eyebrow": "Engagement 360"
  },
  {
    "id": "ENG-08",
    "title": "Allocation history",
    "module": "engagement",
    "kind": "list",
    "description": "Immutable, effective-dated request, decision and allocation change history.",
    "primary": "Export history",
    "release": "R1",
    "eyebrow": "Engagement 360"
  },
  {
    "id": "STFUI-01",
    "title": "Add-resource launcher",
    "module": "staffing",
    "kind": "form",
    "description": "Start a governed resource request from an approved engagement and budget.",
    "primary": "Continue",
    "release": "R1",
    "eyebrow": "New staffing request"
  },
  {
    "id": "STFUI-02",
    "title": "Search by availability",
    "module": "staffing",
    "kind": "form",
    "description": "Find capacity by dates, organizational scope, grade, geography and work pattern.",
    "primary": "Search availability",
    "release": "R1",
    "eyebrow": "Candidate search"
  },
  {
    "id": "STFUI-03",
    "title": "Availability results",
    "module": "staffing",
    "kind": "list",
    "description": "Compare accepted availability, pending demand and capability entry points.",
    "primary": "Add selected",
    "release": "R1",
    "eyebrow": "Candidate search"
  },
  {
    "id": "STFUI-04",
    "title": "Search by resource",
    "module": "staffing",
    "kind": "form",
    "description": "Locate a named practitioner and open their cross-engagement schedule.",
    "primary": "Show schedule",
    "release": "R1",
    "eyebrow": "Candidate search"
  },
  {
    "id": "STFUI-05",
    "title": "Cross-engagement schedule",
    "module": "staffing",
    "kind": "planner",
    "description": "Accepted and pending assignments across projects with capacity remaining by period.",
    "primary": "Propose allocation",
    "release": "R1",
    "eyebrow": "Resource schedule"
  },
  {
    "id": "STFUI-06",
    "title": "Requirement builder",
    "module": "staffing",
    "kind": "form",
    "description": "Define required and preferred role, capability, credential, industry and availability criteria.",
    "primary": "Find candidates",
    "release": "R1",
    "eyebrow": "Skills-aware staffing"
  },
  {
    "id": "STFUI-07",
    "title": "Candidate shortlist",
    "module": "staffing",
    "kind": "list",
    "description": "Compare eligible, partial and unavailable candidates with transparent fit evidence.",
    "primary": "Compare selected",
    "release": "R1",
    "eyebrow": "Skills-aware staffing"
  },
  {
    "id": "STFUI-08",
    "title": "Practitioner 360 drawer",
    "module": "staffing",
    "kind": "detail",
    "description": "Review capability, credential, project evidence and schedule without leaving the shortlist.",
    "primary": "Add to request",
    "release": "R1",
    "eyebrow": "Practitioner profile"
  },
  {
    "id": "STFUI-09",
    "title": "Classification step",
    "module": "staffing",
    "kind": "form",
    "description": "Set role, classification, derived billability, tower and unbilled control fields.",
    "primary": "Apply classification",
    "release": "R1",
    "eyebrow": "New staffing request"
  },
  {
    "id": "STFUI-10",
    "title": "Scheduling Gantt",
    "module": "staffing",
    "kind": "planner",
    "description": "Plan daily effort against accepted commitments, non-working days, WBS and capacity.",
    "primary": "Review request",
    "release": "R1",
    "eyebrow": "Allocation planning"
  },
  {
    "id": "STFUI-11",
    "title": "Effort editor",
    "module": "staffing",
    "kind": "form",
    "description": "Edit dates, effort, work days, phase and work unit with live validation.",
    "primary": "Save effort",
    "release": "R1",
    "eyebrow": "Allocation planning"
  },
  {
    "id": "STFUI-12",
    "title": "Auto-allocation review",
    "module": "staffing",
    "kind": "planner",
    "description": "Review a capacity-aware proposed schedule and unresolved cells before accepting it.",
    "primary": "Accept proposal",
    "release": "R1",
    "eyebrow": "Allocation planning"
  },
  {
    "id": "STFUI-13",
    "title": "Request review and submit",
    "module": "staffing",
    "kind": "detail",
    "description": "Confirm people, roles, classifications, effort, fit, budget coverage and warnings.",
    "primary": "Submit request",
    "release": "R1",
    "eyebrow": "New staffing request"
  },
  {
    "id": "STFUI-14",
    "title": "Request success and status",
    "module": "staffing",
    "kind": "detail",
    "description": "See created request IDs, SLA, notifications and next steps after submission.",
    "primary": "View engagement",
    "release": "R1",
    "eyebrow": "Request submitted"
  },
  {
    "id": "STFUI-15",
    "title": "Modify allocation",
    "module": "staffing",
    "kind": "form",
    "description": "Change a future segment with before/after capacity, economics and approval impact.",
    "primary": "Submit modification",
    "release": "R1",
    "eyebrow": "Allocation change"
  },
  {
    "id": "STFUI-16",
    "title": "Split allocation",
    "module": "staffing",
    "kind": "planner",
    "description": "Split an assignment into effective-dated segments without rewriting history.",
    "primary": "Confirm split",
    "release": "R1",
    "eyebrow": "Allocation change"
  },
  {
    "id": "STFUI-17",
    "title": "Deallocate resource",
    "module": "staffing",
    "kind": "form",
    "description": "End the intended future period with downstream time and capacity impact shown.",
    "primary": "Confirm deallocation",
    "release": "R1",
    "eyebrow": "Allocation change"
  },
  {
    "id": "STFUI-18",
    "title": "Allocation action menu",
    "module": "staffing",
    "kind": "detail",
    "description": "Permission-aware details, schedule, modify, split and deallocation actions.",
    "primary": "View details",
    "release": "R1",
    "eyebrow": "Allocation actions"
  },
  {
    "id": "STFUI-19",
    "title": "Bulk import wizard",
    "module": "staffing",
    "kind": "form",
    "description": "Map, validate and dry-run controlled allocation request files before commit.",
    "primary": "Run validation",
    "release": "R2",
    "eyebrow": "Bulk operations"
  },
  {
    "id": "STFUI-20",
    "title": "Import result",
    "module": "staffing",
    "kind": "list",
    "description": "Audit success, failures, created requests and corrected-row retry for one batch.",
    "primary": "Download errors",
    "release": "R2",
    "eyebrow": "Bulk operations"
  },
  {
    "id": "STFUI-21",
    "title": "Staffing queue",
    "module": "staffing",
    "kind": "list",
    "description": "Prioritized pending requests with age, fit, conflict, budget and ownership context.",
    "primary": "Review next",
    "release": "R1",
    "eyebrow": "Staffer workbench"
  },
  {
    "id": "STFUI-22",
    "title": "Staffing request detail",
    "module": "staffing",
    "kind": "detail",
    "description": "Full request, candidate, budget, capacity and decision history for arbitration.",
    "primary": "Make decision",
    "release": "R1",
    "eyebrow": "Staffer workbench"
  },
  {
    "id": "STFUI-23",
    "title": "Accept or decline decision",
    "module": "staffing",
    "kind": "form",
    "description": "Revalidate capacity and commercial controls before an attributable decision.",
    "primary": "Accept request",
    "release": "R1",
    "eyebrow": "Staffer decision"
  },
  {
    "id": "STFUI-24",
    "title": "Staffing workload and SLA",
    "module": "staffing",
    "kind": "dashboard",
    "description": "Queue aging, outcome, conflict, reason and pool workload performance.",
    "primary": "Export report",
    "release": "R2",
    "eyebrow": "Staffing performance"
  },
  {
    "id": "SKLUI-01",
    "title": "Individual skills home",
    "module": "skills",
    "kind": "home",
    "description": "Personal capability, credential, learning and review-readiness overview.",
    "primary": "Add capability",
    "release": "R1",
    "eyebrow": "My profile"
  },
  {
    "id": "SKLUI-02",
    "title": "Manager skills home",
    "module": "skills",
    "kind": "dashboard",
    "description": "Team coverage, pending reviews, stale profiles and credential risks.",
    "primary": "Review claims",
    "release": "R2",
    "eyebrow": "My team"
  },
  {
    "id": "SKLUI-03",
    "title": "COE and Staffer skills home",
    "module": "skills",
    "kind": "dashboard",
    "description": "Supply depth, demand gaps, profile readiness and capability freshness.",
    "primary": "Open talent search",
    "release": "R2",
    "eyebrow": "COE capability"
  },
  {
    "id": "SKLUI-04",
    "title": "Admin skills home",
    "module": "skills",
    "kind": "admin",
    "description": "Catalogue, access, connector and identity-match health for administrators.",
    "primary": "Review sync health",
    "release": "R2",
    "eyebrow": "Skills administration"
  },
  {
    "id": "SKLUI-05",
    "title": "Profile — particulars",
    "module": "skills",
    "kind": "detail",
    "description": "Authoritative employee, role, organization, location and reporting context.",
    "primary": "View capabilities",
    "release": "R1",
    "eyebrow": "Practitioner profile"
  },
  {
    "id": "SKLUI-06",
    "title": "Profile — Salesforce capabilities",
    "module": "skills",
    "kind": "list",
    "description": "Approved proficiency, years, recency, reviewer and evidence by Salesforce capability.",
    "primary": "Add capability",
    "release": "R1",
    "eyebrow": "Practitioner profile"
  },
  {
    "id": "SKLUI-07",
    "title": "Profile — industry skills",
    "module": "skills",
    "kind": "list",
    "description": "Approved domain skills, experience, evidence and review history.",
    "primary": "Add industry skill",
    "release": "R1",
    "eyebrow": "Practitioner profile"
  },
  {
    "id": "SKLUI-08",
    "title": "Profile — learning",
    "module": "skills",
    "kind": "list",
    "description": "Read-only EXL and Salesforce learning progress with source freshness.",
    "primary": "Explore learning",
    "release": "R1",
    "eyebrow": "Practitioner profile"
  },
  {
    "id": "SKLUI-09",
    "title": "Profile — certifications",
    "module": "skills",
    "kind": "list",
    "description": "Verified Salesforce credentials, maintenance state, source and linked capabilities.",
    "primary": "Add certification",
    "release": "R1",
    "eyebrow": "Practitioner profile"
  },
  {
    "id": "SKLUI-10",
    "title": "Add capability claim",
    "module": "skills",
    "kind": "form",
    "description": "Submit proficiency, experience, recency and evidence for manager review.",
    "primary": "Submit claim",
    "release": "R1",
    "eyebrow": "Capability claim"
  },
  {
    "id": "SKLUI-11",
    "title": "Add certification",
    "module": "skills",
    "kind": "form",
    "description": "Register a credential and consent to governed verification.",
    "primary": "Verify credential",
    "release": "R1",
    "eyebrow": "Credential"
  },
  {
    "id": "SKLUI-12",
    "title": "My team list",
    "module": "skills",
    "kind": "list",
    "description": "Direct reports with capability coverage, credential health and profile freshness.",
    "primary": "Review profiles",
    "release": "R2",
    "eyebrow": "Manager workspace"
  },
  {
    "id": "SKLUI-13",
    "title": "Team hierarchy",
    "module": "skills",
    "kind": "detail",
    "description": "Expandable reporting structure with governed capability coverage.",
    "primary": "Open profile",
    "release": "R2",
    "eyebrow": "Manager workspace"
  },
  {
    "id": "SKLUI-14",
    "title": "Pending reviews",
    "module": "skills",
    "kind": "list",
    "description": "Prioritized capability claims with evidence, age and decision entry points.",
    "primary": "Review next",
    "release": "R1",
    "eyebrow": "Manager workspace"
  },
  {
    "id": "SKLUI-15",
    "title": "Review decision",
    "module": "skills",
    "kind": "form",
    "description": "Approve, adjust or reject a claim against level descriptors and evidence.",
    "primary": "Approve claim",
    "release": "R1",
    "eyebrow": "Capability review"
  },
  {
    "id": "SKLUI-16",
    "title": "Talent search builder",
    "module": "skills",
    "kind": "form",
    "description": "Compose multiple mandatory and preferred criteria in strict or ranked mode.",
    "primary": "Run talent search",
    "release": "R1",
    "eyebrow": "Talent discovery"
  },
  {
    "id": "SKLUI-17",
    "title": "Talent search results",
    "module": "skills",
    "kind": "list",
    "description": "Ranked or eligible practitioners with factor-level fit and availability.",
    "primary": "Add to staffing request",
    "release": "R1",
    "eyebrow": "Talent discovery"
  },
  {
    "id": "SKLUI-18",
    "title": "Capability inventory",
    "module": "skills",
    "kind": "list",
    "description": "Browse the active taxonomy, holder counts, levels and capability demand.",
    "primary": "Create capability",
    "release": "R2",
    "eyebrow": "Catalogue"
  },
  {
    "id": "SKLUI-19",
    "title": "Capability detail",
    "module": "skills",
    "kind": "detail",
    "description": "Definition, levels, distribution, holders, credentials and demand signal.",
    "primary": "Edit capability",
    "release": "R2",
    "eyebrow": "Catalogue"
  },
  {
    "id": "SKLUI-20",
    "title": "Catalogue create and edit",
    "module": "skills",
    "kind": "form",
    "description": "Maintain capability identity, hierarchy, aliases, levels and active state.",
    "primary": "Save capability",
    "release": "R1",
    "eyebrow": "Catalogue administration"
  },
  {
    "id": "SKLUI-21",
    "title": "Proficiency tier editor",
    "module": "skills",
    "kind": "form",
    "description": "Define the four ordered proficiency levels with observable behaviors.",
    "primary": "Publish tiers",
    "release": "R1",
    "eyebrow": "Catalogue administration"
  },
  {
    "id": "SKLUI-22",
    "title": "Role permissions",
    "module": "skills",
    "kind": "admin",
    "description": "Configure resource, action and scope permissions with separation controls.",
    "primary": "Preview changes",
    "release": "R1",
    "eyebrow": "Access administration"
  },
  {
    "id": "SKLUI-23",
    "title": "User access management",
    "module": "skills",
    "kind": "admin",
    "description": "Manage user roles, scope, delegation, identity state and import results.",
    "primary": "Assign role",
    "release": "R1",
    "eyebrow": "Access administration"
  },
  {
    "id": "SKLUI-24",
    "title": "Skills settings and sync health",
    "module": "skills",
    "kind": "admin",
    "description": "Monitor People, Learning and Credential connectors, freshness and identity matches.",
    "primary": "Run authorized retry",
    "release": "R1",
    "eyebrow": "Operations"
  },
  {
    "id": "BUDUI-01",
    "title": "Budget portfolio and projects",
    "module": "budget",
    "kind": "list",
    "description": "Compare project economics, approval state and active versions across the portfolio.",
    "primary": "Create budget",
    "release": "R1",
    "eyebrow": "Budgeting"
  },
  {
    "id": "BUDUI-02",
    "title": "Budget details",
    "module": "budget",
    "kind": "form",
    "description": "Set governed revenue, uplift, contingency, travel, duration and currency assumptions.",
    "primary": "Save and continue",
    "release": "R1",
    "eyebrow": "Budget editor"
  },
  {
    "id": "BUDUI-03",
    "title": "Phase plan",
    "module": "budget",
    "kind": "planner",
    "description": "Build contiguous delivery phases and validate them against engagement dates.",
    "primary": "Add phase",
    "release": "R1",
    "eyebrow": "Budget editor"
  },
  {
    "id": "BUDUI-04",
    "title": "Resource plan grid",
    "module": "budget",
    "kind": "planner",
    "description": "Plan role, location, rate and monthly effort across phase-colored periods.",
    "primary": "Add plan row",
    "release": "R1",
    "eyebrow": "Budget editor"
  },
  {
    "id": "BUDUI-05",
    "title": "WBS and P&L summary",
    "module": "budget",
    "kind": "dashboard",
    "description": "Reconcile effort, labor, travel, cost, revenue, gross margin and blended cost.",
    "primary": "Review version",
    "release": "R1",
    "eyebrow": "Budget editor"
  },
  {
    "id": "BUDUI-06",
    "title": "Versions and timeline",
    "module": "budget",
    "kind": "detail",
    "description": "Review immutable budget versions, decisions and current economic signature.",
    "primary": "Compare versions",
    "release": "R1",
    "eyebrow": "Budget governance"
  },
  {
    "id": "BUDUI-07",
    "title": "Version comparison",
    "module": "budget",
    "kind": "detail",
    "description": "Explain assumption, phase, resource, cost and margin changes between versions.",
    "primary": "Return to version",
    "release": "R1",
    "eyebrow": "Budget governance"
  },
  {
    "id": "BUDUI-08",
    "title": "Submit and routing",
    "module": "budget",
    "kind": "form",
    "description": "Preview the active margin policy and route a version for approval.",
    "primary": "Submit for approval",
    "release": "R1",
    "eyebrow": "Budget governance"
  },
  {
    "id": "BUDUI-09",
    "title": "Approval queue",
    "module": "budget",
    "kind": "list",
    "description": "Prioritize budgets by active approval level, margin, change and age.",
    "primary": "Review next",
    "release": "R1",
    "eyebrow": "Approvals"
  },
  {
    "id": "BUDUI-10",
    "title": "Approval detail and decision",
    "module": "budget",
    "kind": "detail",
    "description": "Decide against a read-only version, comparison, exceptions and prior approvals.",
    "primary": "Approve budget",
    "release": "R1",
    "eyebrow": "Approvals"
  },
  {
    "id": "BUDUI-11",
    "title": "Budget import and export",
    "module": "budget",
    "kind": "form",
    "description": "Validate controlled workbooks, recalculate server-side and audit every batch.",
    "primary": "Import workbook",
    "release": "R2",
    "eyebrow": "Budget operations"
  },
  {
    "id": "BUDUI-12",
    "title": "Budget administration",
    "module": "budget",
    "kind": "admin",
    "description": "Maintain margin tiers, routes, access, fields and policy effective dates.",
    "primary": "Preview policy",
    "release": "R1",
    "eyebrow": "Budget administration"
  },
  {
    "id": "TIMEUI-01",
    "title": "Weekly timesheet",
    "module": "timesheet",
    "kind": "planner",
    "description": "Record time only against accepted engagement, role and work-unit eligibility.",
    "primary": "Submit week",
    "release": "R1",
    "eyebrow": "My time"
  },
  {
    "id": "TIMEUI-02",
    "title": "Time-entry editor",
    "module": "timesheet",
    "kind": "form",
    "description": "Enter hours, role, work unit and comment with allocation-aware validation.",
    "primary": "Save entry",
    "release": "R1",
    "eyebrow": "My time"
  },
  {
    "id": "TIMEUI-03",
    "title": "Submit week review",
    "module": "timesheet",
    "kind": "detail",
    "description": "Review completeness, totals, exceptions and lock consequences before submission.",
    "primary": "Confirm submission",
    "release": "R1",
    "eyebrow": "My time"
  },
  {
    "id": "TIMEUI-04",
    "title": "Manager team view",
    "module": "timesheet",
    "kind": "list",
    "description": "Track employee-week state, totals, exceptions and approval entry points.",
    "primary": "Review next",
    "release": "R1",
    "eyebrow": "Team time"
  },
  {
    "id": "TIMEUI-05",
    "title": "Team summary",
    "module": "timesheet",
    "kind": "dashboard",
    "description": "Monitor period compliance, approved, pending, rejected and auto-approved effort.",
    "primary": "Export summary",
    "release": "R1",
    "eyebrow": "Team time"
  },
  {
    "id": "TIMEUI-06",
    "title": "Approval detail",
    "module": "timesheet",
    "kind": "detail",
    "description": "Compare submitted time with allocations by day, project, role and work unit.",
    "primary": "Approve week",
    "release": "R1",
    "eyebrow": "Timesheet approval"
  },
  {
    "id": "TIMEUI-07",
    "title": "Controlled correction",
    "module": "timesheet",
    "kind": "form",
    "description": "Route a locked-period project, role or hour correction through dual control.",
    "primary": "Submit correction",
    "release": "R1",
    "eyebrow": "Timesheet exception"
  },
  {
    "id": "TIMEUI-08",
    "title": "Timesheet compliance",
    "module": "timesheet",
    "kind": "dashboard",
    "description": "Find missing, late, unapproved or plan-variance time with accountable owners.",
    "primary": "Export exceptions",
    "release": "R2",
    "eyebrow": "Compliance"
  },
  {
    "id": "CMD-01",
    "title": "Executive overview",
    "module": "command",
    "kind": "dashboard",
    "description": "Headcount, utilization, bench, economics and critical action in one leadership view.",
    "primary": "Export briefing",
    "release": "R2",
    "eyebrow": "COE command center"
  },
  {
    "id": "CMD-02",
    "title": "Utilization explorer",
    "module": "command",
    "kind": "dashboard",
    "description": "Drill from geography to portfolio, engagement and employee across allocation and actuals.",
    "primary": "Open drill-down",
    "release": "R2",
    "eyebrow": "COE command center"
  },
  {
    "id": "CMD-03",
    "title": "Supply, demand and capacity",
    "module": "command",
    "kind": "dashboard",
    "description": "Compare committed supply, soft demand, bench, roll-offs and role gaps over 90 days.",
    "primary": "View demand gaps",
    "release": "R2",
    "eyebrow": "COE command center"
  },
  {
    "id": "CMD-04",
    "title": "Unbilled governance",
    "module": "command",
    "kind": "dashboard",
    "description": "Govern WAR, IFB, Blocked, Shadow and internal capacity by age and escalation.",
    "primary": "Assign action",
    "release": "R2",
    "eyebrow": "COE command center"
  },
  {
    "id": "CMD-05",
    "title": "Staffing performance",
    "module": "command",
    "kind": "dashboard",
    "description": "Measure queue, SLA, decisions, conflicts, expiry and staffer workload.",
    "primary": "View overdue",
    "release": "R2",
    "eyebrow": "COE command center"
  },
  {
    "id": "CMD-06",
    "title": "Salesforce capability coverage",
    "module": "command",
    "kind": "dashboard",
    "description": "See supply depth, credentials, demand gaps and profile readiness by tower and role.",
    "primary": "Open capability gap",
    "release": "R2",
    "eyebrow": "COE command center"
  },
  {
    "id": "CMD-07",
    "title": "Engagement economics",
    "module": "command",
    "kind": "dashboard",
    "description": "Track budget, actual, ETC, EAC, margin and erosion alerts across engagements.",
    "primary": "Review margin risk",
    "release": "R2",
    "eyebrow": "COE command center"
  },
  {
    "id": "CMD-08",
    "title": "Data quality and sync operations",
    "module": "command",
    "kind": "dashboard",
    "description": "Monitor freshness, volume, duplicates, unmatched joins and failed integration events.",
    "primary": "Open runbook",
    "release": "R0",
    "eyebrow": "Operations center"
  },
  {
    "id": "CMD-09",
    "title": "Audit and override explorer",
    "module": "command",
    "kind": "list",
    "description": "Search attributable decisions, changes, overrides and correlated technical events.",
    "primary": "Export audit",
    "release": "R0",
    "eyebrow": "Control center"
  },
  {
    "id": "ADMUI-01",
    "title": "Administration landing",
    "module": "admin",
    "kind": "admin",
    "description": "Run the five-pillar demo activation for SSO, integrations, fictional data, approvals and operations.",
    "primary": "Run demo activation",
    "release": "R0",
    "eyebrow": "Administration"
  },
  {
    "id": "ADMUI-02",
    "title": "People and access",
    "module": "admin",
    "kind": "list",
    "description": "Manage identity state, roles, scope, delegation and access exceptions.",
    "primary": "Add assignment",
    "release": "R0",
    "eyebrow": "Access"
  },
  {
    "id": "ADMUI-03",
    "title": "Role-permission matrix",
    "module": "admin",
    "kind": "admin",
    "description": "Control resource-action-scope permissions with separation-of-duty checks.",
    "primary": "Preview changes",
    "release": "R0",
    "eyebrow": "Access"
  },
  {
    "id": "ADMUI-04",
    "title": "Field values and LOVs",
    "module": "admin",
    "kind": "list",
    "description": "Maintain effective-dated business values, codes and deactivation impact.",
    "primary": "Add value",
    "release": "R0",
    "eyebrow": "Configuration"
  },
  {
    "id": "ADMUI-05",
    "title": "Calendars and capacity",
    "module": "admin",
    "kind": "planner",
    "description": "Maintain regions, holidays, work patterns, capacity and employee overrides.",
    "primary": "Add calendar",
    "release": "R0",
    "eyebrow": "Configuration"
  },
  {
    "id": "ADMUI-06",
    "title": "Approval and escalation policy",
    "module": "admin",
    "kind": "admin",
    "description": "Configure budget tiers, staffing SLA, time windows, unbilled timers and routes.",
    "primary": "Create policy version",
    "release": "R0",
    "eyebrow": "Configuration"
  },
  {
    "id": "ADMUI-07",
    "title": "Integration configuration",
    "module": "admin",
    "kind": "admin",
    "description": "Monitor non-secret connector metadata, schedules, health and authorized tests.",
    "primary": "Test connection",
    "release": "R0",
    "eyebrow": "Platform"
  },
  {
    "id": "ADMUI-08",
    "title": "Import and batch operations",
    "module": "admin",
    "kind": "list",
    "description": "Operate governed batches with counts, errors, retry, cancel and correlation history.",
    "primary": "View failed batches",
    "release": "R0",
    "eyebrow": "Operations"
  },
  {
    "id": "AIUI-01",
    "title": "Resource assistant",
    "module": "ai",
    "kind": "assistant",
    "description": "Ask evidence-backed questions across authorized staffing, capability and delivery data.",
    "primary": "Ask Resource360",
    "release": "R3",
    "eyebrow": "Planning intelligence"
  },
  {
    "id": "AIUI-02",
    "title": "Recommendation detail",
    "module": "ai",
    "kind": "detail",
    "description": "Inspect candidate or reallocation factors, alternatives, impact and feedback.",
    "primary": "Add to review",
    "release": "R3",
    "eyebrow": "Planning intelligence"
  },
  {
    "id": "AIUI-03",
    "title": "What-if planner",
    "module": "ai",
    "kind": "planner",
    "description": "Model isolated demand, capacity, skill and margin scenarios before governed publish.",
    "primary": "Run scenario",
    "release": "R3",
    "eyebrow": "Planning intelligence"
  },
  {
    "id": "AIUI-04",
    "title": "Agent operations",
    "module": "ai",
    "kind": "admin",
    "description": "Monitor agent health, inputs, tools, approvals, alerts and immutable run history.",
    "primary": "Pause agent",
    "release": "R3",
    "eyebrow": "AI operations"
  }
];
