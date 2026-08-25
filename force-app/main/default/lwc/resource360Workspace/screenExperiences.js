const experience = (dataset, filter, visual, focus, evidence, target, operation = "navigate") => ({
    dataset, filter, visual, focus, evidence, target, operation
});

/**
 * Route-specific Salesforce workbenches for screen contracts that do not use
 * one of the command/editor panels in resource360Workspace.html. Each route
 * owns its dataset, filter, visual archetype, operational focus and evidence.
 */
export const ROUTE_EXPERIENCES = Object.freeze({
    "GLB-01": experience("identity", "active", "identity", "Federated-entry assurance", "Salesforce session, MFA assumption, mapped group and effective scope are shown separately.", "GLB-02"),
    "GLB-02": experience("summary", "all", "home", "Role-prioritized work", "Live staffing, economics, utilization and exception metrics determine the next task.", "STFUI-01"),
    "GLB-04": experience("search", "all", "search", "Cross-object discovery", "Results are limited to records readable under the selected effective role.", null, "refresh"),
    "GLB-05": experience("roleScopes", "active", "scope", "Effective role and scope", "Certified user, organization, portfolio, validity and assignment source prove authorization.", "ADMUI-02"),
    "GLB-06": experience("help", "all", "help", "Salesforce-native guidance", "Runbooks, walkthroughs, release boundary and support routes are available without leaving the app.", null, "refresh"),

    "ENG-01": experience("engagements", "active", "list", "Scoped engagement portfolio", "Source freshness, project owner, tower and effective dates support selection.", "ENG-02"),
    "ENG-02": experience("commercialReferences", "active", "overview", "Commercial and delivery overview", "Engagement, SOW/PO context and source cutoff are reconciled before downstream actions.", "ENG-03"),
    "ENG-03": experience("allocations", "current", "roster", "Current engagement roster", "Accepted allocation, classification, role and effective window are the staffing truth.", "STFUI-01"),
    "ENG-04": experience("budgets", "current", "economics", "Current budget economics", "Only the signed current version drives staffing and profitability controls.", "BUDUI-02"),
    "ENG-05": experience("timesheets", "submittedOrApproved", "actuals", "Approved and submitted actuals", "Weekly actuals retain approval state, exception code and accountable deadline.", "TIMEUI-08"),
    "ENG-06": experience("workUnits", "active", "milestones", "WBS and delivery milestones", "Work-unit code, phase, owner context and dates align budget and time.", "BUDUI-03"),
    "ENG-07": experience("notifications", "open", "risk", "Accountable risk and action register", "Original trigger, severity, owner, first-seen time and closure evidence remain attributable.", "GLB-03"),
    "ENG-08": experience("allocations", "all", "timeline", "Effective-dated allocation history", "Originating request, version, state and dates preserve staffing lineage.", null, "export"),

    "STFUI-04": experience("resources", "active", "finder", "Named-practitioner lookup", "Employee identity, role, location and availability lead into the governed schedule.", "STFUI-05"),
    "STFUI-08": experience("resources", "active", "drawer", "Candidate evidence drawer", "Profile, role, tower, manager, location and availability remain source-attributed.", "SKLUI-05"),
    "STFUI-09": experience("classifications", "all", "classification", "Classification and control gate", "Billability, accountable owner, review date and control evidence are server governed.", "STFUI-10"),
    "STFUI-13": experience("staffingRequests", "draftOrPending", "review", "Submission readiness review", "Candidate, signed budget, fit, dates, effort and warnings are reviewed together.", "STFUI-01"),
    "STFUI-14": experience("staffingRequests", "recent", "confirmation", "Request receipt and status", "Stable request identity, SLA, state and correlated decision evidence support follow-up.", "ENG-03"),
    "STFUI-18": experience("allocations", "current", "actions", "Allocation command context", "Only current accepted allocation versions expose modification, split or deallocation entry points.", "STFUI-15"),
    "STFUI-19": experience("integrationRuns", "staffing", "import", "Staffing batch pre-validation", "Source file, contract, commit mode, row counts and collisions are retained before commit.", "ADMUI-08"),
    "STFUI-20": experience("integrationErrors", "open", "result", "Import results and row errors", "Exact redacted validation errors remain downloadable and retryable by authorized operations users.", null, "export"),
    "STFUI-21": experience("staffingRequests", "pending", "queue", "Prioritized staffing queue", "Priority, SLA due time, fit score and budget-backed request context drive ordering.", "STFUI-22"),
    "STFUI-22": experience("staffingRequests", "pending", "detail", "Staffing decision detail", "Capacity, classification, commercial coverage and accountable controls are revalidated.", "STFUI-23"),
    "STFUI-23": experience("staffingRequests", "pending", "decision", "Attributable accept or decline", "The deciding identity and server-derived role are written with mandatory decline evidence.", null, "staffingDecision"),
    "STFUI-24": experience("staffingRequests", "all", "sla", "Workload and SLA performance", "Pending, overdue, accepted, declined and expired states use the governed SLA cutoff.", null, "export"),

    "SKLUI-02": experience("skillClaims", "pending", "manager", "Manager review workload", "Claimed level, evidence, experience and review scope are visible before decision.", "SKLUI-14"),
    "SKLUI-03": experience("capabilities", "active", "coverage", "COE capability coverage", "Active taxonomy and practitioner evidence support transparent staffing search.", "SKLUI-16"),
    "SKLUI-04": experience("integrationRuns", "learning", "admin", "Skills-source health", "Learning, credential and people freshness are separated from practitioner claims.", "SKLUI-24"),
    "SKLUI-12": experience("resources", "active", "team", "Manager team roster", "Manager, organizational scope, primary role and source freshness constrain the team view.", "SKLUI-13"),
    "SKLUI-13": experience("resources", "active", "hierarchy", "Effective team hierarchy", "Manager relationships and governed scope support drill-down without client-side elevation.", "SKLUI-05"),
    "SKLUI-14": experience("skillClaims", "pending", "queue", "Pending capability reviews", "Submission age, requested level and evidence support a prioritized review queue.", "SKLUI-15"),
    "SKLUI-15": experience("skillClaims", "pending", "decision", "Manager capability decision", "Approved level and decision note are stored independently from the original claim.", null, "skillDecision"),
    "SKLUI-18": experience("capabilities", "active", "inventory", "Governed capability inventory", "Stable capability identity, tower, category and active dates drive downstream matching.", "SKLUI-19"),
    "SKLUI-19": experience("capabilities", "active", "detail", "Capability definition and usage", "Taxonomy identity is separated from claims, learning and verified project evidence.", "SKLUI-20"),
    "SKLUI-20": experience("configurationCatalog", "capability", "editor", "Catalogue maker workbench", "Draft changes remain versioned and require independent activation.", "ADMUI-04"),
    "SKLUI-21": experience("capabilities", "active", "tiers", "Proficiency rubric", "Levels one through four preserve behavioral descriptors and review expectations.", "SKLUI-19"),
    "SKLUI-22": experience("identity", "active", "permissions", "Role-permission preview", "Permission-set groups, decision authority and segregation class are reviewed before deployment.", "ADMUI-03"),
    "SKLUI-23": experience("roleScopes", "active", "access", "User access administration", "Every assignment is effective-dated, certified and attributable to an approved mock source.", "ADMUI-02"),
    "SKLUI-24": experience("integrationRuns", "skills", "sync", "Skills synchronization health", "Contract version, freshness, processed counts and row errors support authorized retry.", "ADMUI-07"),

    "BUDUI-01": experience("budgets", "current", "portfolio", "Portfolio and project economics", "Revenue, total cost, margin, approval state and policy version share one cutoff.", "BUDUI-02"),
    "BUDUI-08": experience("budgets", "editable", "submit", "Budget submission assurance", "WBS reconciliation, commercial value and route-driving economic signature are checked.", null, "budgetSubmit"),
    "BUDUI-09": experience("budgets", "pending", "queue", "Assigned approval queue", "Current step, required role, margin and immutable economic signature determine eligibility.", "BUDUI-10"),
    "BUDUI-10": experience("budgets", "pending", "decision", "Budget approval decision", "Sequential role, no self-approval and mandatory rejection evidence are enforced in Apex.", null, "budgetDecision"),
    "BUDUI-12": experience("configurationCatalog", "budget", "admin", "Budget policy administration", "Thresholds, route rules and effective versions are previewed before controlled activation.", "ADMUI-06"),

    "TIMEUI-03": experience("timesheets", "draftOrRejected", "review", "Week submission review", "Entries, allocation eligibility, capacity and exception state are checked before submission.", null, "timesheetSubmit"),
    "TIMEUI-04": experience("timesheets", "submitted", "team", "Manager approval queue", "Only submitted weeks inside manager scope appear for decision.", "TIMEUI-06"),
    "TIMEUI-05": experience("timesheets", "all", "summary", "Team time summary", "Draft, submitted, approved, rejected and correction states share a governed week cutoff.", null, "export"),
    "TIMEUI-06": experience("timesheets", "submitted", "decision", "Timesheet approval detail", "Allocation-authorized entries, daily capacity and exception route support the decision.", null, "timesheetDecision"),
    "TIMEUI-07": experience("timesheets", "approvedOrCorrection", "correction", "Controlled correction lineage", "The prior approved version remains immutable while a dual-control correction is created.", null, "timesheetCorrection"),

    "CMD-03": experience("resources", "active", "capacity", "Supply, demand and capacity", "Availability, accepted allocation and pending demand use the same effective date range.", "STFUI-21"),
    "CMD-05": experience("staffingRequests", "all", "performance", "Staffing SLA performance", "Queue age and terminal outcomes are measured against configured policy.", "STFUI-24"),
    "CMD-06": experience("skillClaims", "all", "capability", "Salesforce capability coverage", "Approved proficiency and recent evidence expose actionable capability gaps.", "SKLUI-18"),
    "CMD-09": experience("auditEvents", "all", "audit", "Audit and controlled overrides", "Actor, active role, correlation, reason and immutable detail support export and review.", null, "export"),

    "ADMUI-05": experience("calendars", "all", "calendar", "Work calendars and capacity exceptions", "Time zone, work week, daily capacity and dated exceptions control planning deadlines.", null, "refresh"),

    "AIUI-01": experience("recommendations", "available", "assistant", "Evidence-grounded resource assistant", "Responses use only authorized Resource 360 facts and never execute a write autonomously.", "AIUI-02", "assistant"),
    "AIUI-02": experience("recommendations", "available", "recommendation", "Recommendation evidence review", "Availability, role, tower, location and source freshness remain visible for human confirmation.", "STFUI-13"),
    "AIUI-04": experience("agentOperations", "all", "agent", "Agent operations and safety", "Feature state, last run, human-review boundary and mock contract are observable and pausable.", "ADMUI-01", "agentToggle")
});

export const DECLARATIVE_SCREEN_IDS = Object.freeze(Object.keys(ROUTE_EXPERIENCES));
export const SPECIALIZED_SCREEN_IDS = Object.freeze([
    "GLB-03","STFUI-01","STFUI-02","STFUI-03","STFUI-05","STFUI-06","STFUI-07","STFUI-10","STFUI-11","STFUI-12","STFUI-15","STFUI-16","STFUI-17",
    "SKLUI-01","SKLUI-05","SKLUI-06","SKLUI-07","SKLUI-08","SKLUI-09","SKLUI-10","SKLUI-11","SKLUI-16","SKLUI-17",
    "BUDUI-02","BUDUI-03","BUDUI-04","BUDUI-05","BUDUI-06","BUDUI-07","BUDUI-11","TIMEUI-01","TIMEUI-02","TIMEUI-08",
    "CMD-01","CMD-02","CMD-04","CMD-07","CMD-08","ADMUI-01","ADMUI-02","ADMUI-03","ADMUI-04","ADMUI-06","ADMUI-07","ADMUI-08","AIUI-03"
]);

export function routeExperienceFor(screenId) {
    return ROUTE_EXPERIENCES[screenId];
}
