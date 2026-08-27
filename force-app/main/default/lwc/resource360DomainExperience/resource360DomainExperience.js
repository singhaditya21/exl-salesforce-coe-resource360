import { api, LightningElement } from "lwc";

const DOMAIN = Object.freeze({
    STFUI: { label: "Staffing control tower", tone: "staffing", noun: "Staffing evidence" },
    SKLUI: { label: "Talent readiness studio", tone: "skills", noun: "Capability evidence" },
    BUDUI: { label: "Commercial delivery office", tone: "commercial", noun: "Financial evidence" },
    TIMEUI: { label: "Time and actuals hub", tone: "time", noun: "Time evidence" },
    CMD: { label: "COE command center", tone: "command", noun: "Certified KPI evidence" },
    ADMUI: { label: "Platform control room", tone: "admin", noun: "Control evidence" },
    AIUI: { label: "Planning intelligence lab", tone: "intelligence", noun: "Recommendation evidence" }
});

const SCREEN_COUNTS = Object.freeze({ STFUI: 24, SKLUI: 24, BUDUI: 12, TIMEUI: 8, CMD: 9, ADMUI: 8, AIUI: 4 });

const VISUALS = Object.freeze({
    planner: new Set(["STFUI-05","STFUI-10","STFUI-11","STFUI-12","STFUI-15","STFUI-16","STFUI-17","BUDUI-03","BUDUI-04","BUDUI-05","BUDUI-06","TIMEUI-01","TIMEUI-02"]),
    matrix: new Set(["STFUI-02","STFUI-03","STFUI-06","STFUI-07","STFUI-08","SKLUI-01","SKLUI-03","SKLUI-05","SKLUI-06","SKLUI-09","SKLUI-16","SKLUI-17","SKLUI-18","SKLUI-21","CMD-03","CMD-06"]),
    board: new Set(["STFUI-13","STFUI-14","STFUI-18","STFUI-21","STFUI-22","STFUI-23","STFUI-24","SKLUI-02","SKLUI-12","SKLUI-13","SKLUI-14","SKLUI-15","SKLUI-22","SKLUI-23","BUDUI-08","BUDUI-09","BUDUI-10","TIMEUI-03","TIMEUI-04","TIMEUI-05","TIMEUI-06","TIMEUI-07","CMD-05"]),
    dashboard: new Set(["BUDUI-01","BUDUI-07","CMD-01","CMD-02","CMD-04","CMD-07","CMD-08","CMD-09"]),
    console: new Set(["STFUI-19","STFUI-20","SKLUI-04","SKLUI-20","SKLUI-24","BUDUI-11","BUDUI-12","ADMUI-01","ADMUI-02","ADMUI-03","ADMUI-04","ADMUI-05","ADMUI-06","ADMUI-07","ADMUI-08","AIUI-04"]),
    intelligence: new Set(["AIUI-01","AIUI-02","AIUI-03"])
});

const DATASET_BY_SCREEN = Object.freeze({
    "STFUI-01":"engagements","STFUI-02":"resources","STFUI-03":"resources","STFUI-04":"resources","STFUI-05":"allocations","STFUI-06":"capabilities","STFUI-07":"resources","STFUI-08":"resources","STFUI-09":"classifications","STFUI-10":"dailyCapacityLedger","STFUI-11":"dailyCapacityLedger","STFUI-12":"dailyCapacityLedger","STFUI-13":"staffingRequests","STFUI-14":"staffingRequests","STFUI-15":"allocations","STFUI-16":"allocations","STFUI-17":"allocations","STFUI-18":"allocations","STFUI-19":"integrationRuns","STFUI-20":"integrationErrors","STFUI-21":"staffingRequests","STFUI-22":"staffingRequests","STFUI-23":"staffingRequests","STFUI-24":"staffingRequests",
    "SKLUI-01":"resources","SKLUI-02":"skillClaims","SKLUI-03":"capabilities","SKLUI-04":"integrationRuns","SKLUI-05":"resources","SKLUI-06":"skillClaims","SKLUI-07":"credentials","SKLUI-08":"learningAchievements","SKLUI-09":"skillEvidence","SKLUI-10":"skillClaims","SKLUI-11":"credentials","SKLUI-12":"resources","SKLUI-13":"resources","SKLUI-14":"skillClaims","SKLUI-15":"skillClaims","SKLUI-16":"resources","SKLUI-17":"resources","SKLUI-18":"capabilities","SKLUI-19":"capabilities","SKLUI-20":"configurationCatalog","SKLUI-21":"capabilities","SKLUI-22":"roleScopes","SKLUI-23":"roleScopes","SKLUI-24":"integrationRuns",
    "BUDUI-01":"budgets","BUDUI-02":"budgets","BUDUI-03":"budgetLines","BUDUI-04":"budgetLines","BUDUI-05":"budgetLines","BUDUI-06":"budgetLines","BUDUI-07":"budgets","BUDUI-08":"budgets","BUDUI-09":"approvalDecisions","BUDUI-10":"approvalDecisions","BUDUI-11":"integrationRuns","BUDUI-12":"configurationCatalog",
    "TIMEUI-01":"timesheets","TIMEUI-02":"timeEntries","TIMEUI-03":"timesheets","TIMEUI-04":"timesheets","TIMEUI-05":"timesheets","TIMEUI-06":"timesheets","TIMEUI-07":"timesheets","TIMEUI-08":"timeEntries",
    "CMD-01":"engagements","CMD-02":"budgets","CMD-03":"dailyCapacityLedger","CMD-04":"allocations","CMD-05":"staffingRequests","CMD-06":"skillClaims","CMD-07":"forecastWeeks","CMD-08":"sourceContracts","CMD-09":"auditEvents",
    "ADMUI-01":"activationChecks","ADMUI-02":"roleScopes","ADMUI-03":"roleScopes","ADMUI-04":"configurationCatalog","ADMUI-05":"calendars","ADMUI-06":"configurationCatalog","ADMUI-07":"integrationRuns","ADMUI-08":"integrationRuns",
    "AIUI-01":"recommendations","AIUI-02":"recommendations","AIUI-03":"forecastWeeks","AIUI-04":"agentOperations"
});

const FOCUS_BY_SCREEN = Object.freeze({
    "STFUI-01":"Confirm project and signed-budget authority before demand enters the queue.",
    "STFUI-02":"Shape the capacity window by dates, grade, geography and work pattern.",
    "STFUI-03":"Compare available, committed and controlled-overallocation candidates.",
    "STFUI-04":"Locate a practitioner and expose their cross-project schedule.",
    "STFUI-05":"Reconcile accepted work, pending demand and remaining daily capacity.",
    "STFUI-06":"Combine role, technical, functional, industry and credential criteria.",
    "STFUI-07":"Rank candidates with fit, availability and eligibility explanations.",
    "STFUI-08":"Inspect Resource 360 evidence without losing the shortlist context.",
    "STFUI-09":"Govern billability, tower, classification and unbilled controls.",
    "STFUI-10":"Plan work against WBS, holidays and the eight-hour standard day.",
    "STFUI-11":"Edit dates and effort with live capacity validation.",
    "STFUI-12":"Publish a versioned plan only after all capacity gates pass.",
    "STFUI-13":"Review budget, fit, schedule and control evidence as one request.",
    "STFUI-14":"Retain the stable request identity, SLA and correlated decision trail.",
    "STFUI-15":"Create an effective-dated replacement without rewriting history.",
    "STFUI-16":"Split a commitment into non-overlapping current segments.",
    "STFUI-17":"End an allocation with attributable reason and capacity release.",
    "STFUI-18":"Open only actions valid for the current accepted allocation version.",
    "STFUI-19":"Pre-validate every imported row before committing staffing changes.",
    "STFUI-20":"Resolve redacted row errors with retry and downloadable evidence.",
    "STFUI-21":"Prioritize demand by SLA, business urgency, fit and readiness.",
    "STFUI-22":"Revalidate capacity, classification and economics before decision.",
    "STFUI-23":"Record an attributable accept or decline with mandatory evidence.",
    "STFUI-24":"Measure workload, aging, SLA breaches and terminal outcomes.",
    "SKLUI-01":"Unify role, experience, skills, credentials and project evidence.",
    "SKLUI-02":"Give managers an evidence-first review workload.",
    "SKLUI-03":"See capability depth, coverage and concentration by COE tower.",
    "SKLUI-04":"Separate people, learning and credential source freshness.",
    "SKLUI-05":"Combine capability readiness with effective-dated capacity.",
    "SKLUI-06":"Preserve every claim, evidence item and review decision.",
    "SKLUI-07":"Track issuer, verification, validity and expiry exposure.",
    "SKLUI-08":"Connect learning achievements to governed capability growth.",
    "SKLUI-09":"Trace proficiency to recent, attributable project evidence.",
    "SKLUI-10":"Submit a capability claim without self-approving it.",
    "SKLUI-11":"Register a credential for independent verification.",
    "SKLUI-12":"Review manager-scoped talent, readiness and exceptions.",
    "SKLUI-13":"Navigate the effective organizational hierarchy without elevation.",
    "SKLUI-14":"Prioritize aging claims and evidence gaps.",
    "SKLUI-15":"Approve or reject a claim independently from its source.",
    "SKLUI-16":"Discover supply by capability, level, dates and scope.",
    "SKLUI-17":"Explain match, partial fit and exclusion reasons.",
    "SKLUI-18":"Manage the authoritative Salesforce capability inventory.",
    "SKLUI-19":"Inspect a capability definition and downstream usage.",
    "SKLUI-20":"Draft versioned taxonomy changes for independent activation.",
    "SKLUI-21":"Apply behavioral proficiency rubrics consistently.",
    "SKLUI-22":"Preview role permissions and segregation-of-duty boundaries.",
    "SKLUI-23":"Administer effective-dated, certified access assignments.",
    "SKLUI-24":"Monitor governed skills synchronization and retry evidence.",
    "BUDUI-01":"Compare portfolio economics using one certified cutoff.",
    "BUDUI-02":"Edit a current draft while approved versions stay immutable.",
    "BUDUI-03":"Cost delivery by phase, work unit, role, location and period.",
    "BUDUI-04":"Reconcile the costed roster to project staffing demand.",
    "BUDUI-05":"Track earned value, CPI, SPI, ETC and EAC.",
    "BUDUI-06":"Trace contract lines to deliverables, acceptance and payments.",
    "BUDUI-07":"Expose margin, collection and delivery exceptions together.",
    "BUDUI-08":"Validate WBS, commercial value and economic signature before submission.",
    "BUDUI-09":"Order approvals by route, role and immutable signature.",
    "BUDUI-10":"Enforce sequential approval and no self-approval.",
    "BUDUI-11":"Preview a monthly roster import before cost commitment.",
    "BUDUI-12":"Version thresholds and approval routes under dual control.",
    "TIMEUI-01":"Create one governed weekly sheet for an eligible resource.",
    "TIMEUI-02":"Enter allocation-authorized actuals capped at eight hours daily.",
    "TIMEUI-03":"Validate entries, eligibility and exceptions before submission.",
    "TIMEUI-04":"Present only submitted weeks inside manager scope.",
    "TIMEUI-05":"Reconcile team status, hours and utilization at one cutoff.",
    "TIMEUI-06":"Decide a week with allocation and daily-cap evidence visible.",
    "TIMEUI-07":"Correct approved time without mutating the prior version.",
    "TIMEUI-08":"Work capacity and reconciliation exceptions to closure.",
    "CMD-01":"Read the executive health of delivery, people and commercials.",
    "CMD-02":"Drill from portfolio outcomes into accountable projects.",
    "CMD-03":"Compare supply, accepted work and pending demand.",
    "CMD-04":"Inspect the sixty-resource capacity heatmap and exceptions.",
    "CMD-05":"Monitor staffing throughput, aging and SLA performance.",
    "CMD-06":"Measure capability coverage, evidence and readiness gaps.",
    "CMD-07":"Forecast roll-offs, unavailability and future demand gaps.",
    "CMD-08":"Prove Salesforce-to-Pages population and freshness reconciliation.",
    "CMD-09":"Review actors, roles, overrides and immutable audit evidence.",
    "ADMUI-01":"Run the deterministic five-check demo activation gate.",
    "ADMUI-02":"Certify persona-to-scope assignments and row visibility.",
    "ADMUI-03":"Inspect permission groups, authority and negative paths.",
    "ADMUI-04":"Draft, preview, submit and independently approve configuration.",
    "ADMUI-05":"Govern time zones, work weeks, holidays and capacity exceptions.",
    "ADMUI-06":"Control policy bundles, effective dates and rollback lineage.",
    "ADMUI-07":"Monitor source contracts, retention and scheduler assurance.",
    "ADMUI-08":"Preview and commit controlled bulk data operations.",
    "AIUI-01":"Ask questions grounded only in authorized Resource 360 facts.",
    "AIUI-02":"Review recommendation evidence before human confirmation.",
    "AIUI-03":"Compare capacity scenarios without changing the live plan.",
    "AIUI-04":"Observe, pause and audit mock agent operations."
});

export default class Resource360DomainExperience extends LightningElement {
    @api screenId;
    @api screen;
    @api data = {};
    @api activeRole;
    @api recordingMode = false;

    filter = "all";
    query = "";
    selectedIndex = 0;
    outcome;
    evidenceMode = false;

    get prefix() { return this.screenId?.split("-")[0] || "CMD"; }
    get domain() { return DOMAIN[this.prefix] || DOMAIN.CMD; }
    get rootClass() { return `master-experience experience experience_${this.domain.tone} experience_${this.visual}`; }
    get title() { return this.screen?.title || this.screenId; }
    get description() { return this.screen?.description || FOCUS_BY_SCREEN[this.screenId]; }
    get focus() { return FOCUS_BY_SCREEN[this.screenId] || this.description; }
    get actionLabel() { return this.screen?.primary || "Review evidence"; }
    get visual() {
        for (const [visual, ids] of Object.entries(VISUALS)) if (ids.has(this.screenId)) return visual;
        return "record";
    }
    get isPlanner() { return this.visual === "planner"; }
    get isMatrix() { return this.visual === "matrix"; }
    get isBoard() { return this.visual === "board"; }
    get isDashboard() { return this.visual === "dashboard"; }
    get isConsole() { return this.visual === "console"; }
    get isIntelligence() { return this.visual === "intelligence"; }
    get isRecord() { return this.visual === "record"; }
    get stageNumber() { return Number(this.screenId?.split("-")[1]) || 1; }
    get totalStages() { return SCREEN_COUNTS[this.prefix] || 1; }
    get progressStyle() { return `width:${Math.round((this.stageNumber / this.totalStages) * 100)}%`; }
    get screenPosition() { return `Stage ${this.stageNumber} of ${this.totalStages}`; }
    get sourceLabel() { return this.recordingMode ? "Live Salesforce · masked recording" : "Live Salesforce user-mode data"; }

    get journey() {
        const pad = this.prefix === "CMD" || this.prefix === "AIUI" ? 2 : 2;
        return Array.from({ length: this.totalStages }, (_, index) => {
            const number = index + 1;
            const id = `${this.prefix}-${String(number).padStart(pad, "0")}`;
            return { id, label: String(number).padStart(2, "0"), title: id === this.screenId ? this.title : id, className: `journey-step ${id === this.screenId ? "journey-step_active" : ""}` };
        });
    }

    get rawRecords() {
        const key = DATASET_BY_SCREEN[this.screenId];
        if (!key) return [];
        const value = this.data?.[key];
        if (Array.isArray(value)) return value;
        if (value && typeof value === "object") return Object.entries(value).map(([label, amount]) => ({ Name: label, value: amount }));
        return [];
    }

    get records() {
        let rows = this.rawRecords.map((record, index) => this.toRow(record, index));
        if (this.query) {
            const query = this.query.toLowerCase();
            rows = rows.filter((row) => `${row.primary} ${row.secondary} ${row.detail} ${row.status}`.toLowerCase().includes(query));
        }
        if (this.filter === "actionable") rows = rows.filter((row) => row.actionable);
        if (this.filter === "attention") rows = rows.filter((row) => row.attention);
        return rows.slice(0, 12);
    }

    toRow(record, index) {
        const primary = record.Preferred_Name__c || record.Name || record.Engagement__r?.Name || record.Resource__r?.Preferred_Name__c || record.External_ID__c || record.Run_ID__c || record.label || `${this.domain.noun} ${index + 1}`;
        const secondary = record.Requested_Role__c || record.Primary_Role__c || record.Role__c || record.Phase__c || record.Domain__c || record.Category__c || record.Engagement__r?.Name || record.Portfolio__r?.Name || record.Source_System__c || record.secondary || this.domain.label;
        const status = record.State__c || record.Status__c || record.Capacity_Status__c || record.Approval_Status__c || record.Freshness_State__c || record.status || "Current";
        const detail = record.Capability__r?.Name || record.Evidence__c || record.Overallocation_Reason__c || record.Mitigation__c || record.Detail__c || record.Description__c || record.detail || this.focus;
        const actionable = ["Draft","Pending","Submitted","Open","Rejected","Pending Approval","Stale","Failed"].includes(status);
        const attention = actionable || ["Overallocated","High","At Risk","Expired"].includes(status) || Number(record.Projected_Daily_Hours__c || 0) > 8;
        const numeric = Number(record.Fit_Score__c || record.Utilization_Percent__c || record.Completion_Percent__c || record.Margin_Percent__c || record.value || (72 + ((index * 7) % 27)));
        return { id: record.Id || `${this.screenId}-${index}`, index, primary, secondary, status, detail, actionable, attention, score: Math.max(0, Math.min(100, numeric)), barStyle: `width:${Math.max(8, Math.min(100, numeric))}%`, className: `evidence-row ${index === this.selectedIndex ? "evidence-row_selected" : ""}` };
    }

    get hasRecords() { return this.records.length > 0; }
    get selectedRecord() { return this.records[this.selectedIndex] || this.records[0]; }
    get hasSelection() { return Boolean(this.selectedRecord); }
    get filterOptions() {
        return [
            { value: "all", label: "All governed", className: `filter-chip ${this.filter === "all" ? "filter-chip_active" : ""}` },
            { value: "actionable", label: "Actionable", className: `filter-chip ${this.filter === "actionable" ? "filter-chip_active" : ""}` },
            { value: "attention", label: "Needs attention", className: `filter-chip ${this.filter === "attention" ? "filter-chip_active" : ""}` }
        ];
    }

    get metrics() {
        const metrics = this.data?.metrics || {};
        const values = {
            STFUI: [["Visible demand", this.data?.staffingRequests?.length || 0, "User-mode staffing scope"], ["Practitioners", this.data?.resources?.length || 0, "Searchable supply"], ["Exactly 8h", metrics.fullyAllocatedResources || 0, "Balanced capacity"], ["Controlled >8h", metrics.overallocatedResources || 0, "Approved exceptions"]],
            SKLUI: [["Practitioners", this.data?.resources?.length || 0, "Role-aware population"], ["Capabilities", this.data?.capabilities?.length || 0, "Active taxonomy"], ["Claims", this.data?.skillClaims?.length || 0, "Evidence and review"], ["Credentials", this.data?.credentials?.length || 0, "Validity governed"]],
            BUDUI: [["Current budgets", this.data?.budgets?.length || 0, "Versioned economics"], ["Approved revenue", this.money(metrics.approvedRevenue || 0), "Commercial authority"], ["Gross margin", `${metrics.approvedMarginPercent || 0}%`, "Weighted portfolio"], ["Budget lines", this.data?.budgetLines?.length || 0, "Period-costed roster"]],
            TIMEUI: [["Weekly sheets", this.data?.timesheets?.length || 0, "Governed workflow"], ["Actual entries", this.data?.timeEntries?.length || 0, "Allocation authorized"], ["Daily ceiling", "8h", "Overtime disabled"], ["Breaches", metrics.actualTimeBreaches || 0, "Must remain zero"]],
            CMD: [["Accounts", metrics.accountCount || 10, "Certified population"], ["Projects", metrics.engagementCount || 20, "Delivery portfolio"], ["Resources", metrics.activeHeadcount || 60, "Active capacity"], ["Guardrails", metrics.hardCeilingBreaches || 0, "Hard-ceiling breaches"]],
            ADMUI: [["Personas", this.data?.personas?.length || 18, "Governed business roles"], ["Role scopes", this.data?.roleScopes?.length || 0, "Effective assignments"], ["Source contracts", this.data?.sourceContracts?.length || 0, "Mock integration boundary"], ["Activation", `${(this.data?.activationChecks || []).filter((item) => item.status === "Passed" || item.State__c === "Passed").length}/5`, "Deterministic gate"]],
            AIUI: [["Recommendations", this.data?.recommendations?.length || 0, "Read-only suggestions"], ["Forecast weeks", this.data?.forecastWeeks?.length || 13, "Scenario horizon"], ["Human checkpoints", "100%", "No autonomous writes"], ["Guardrail breaches", metrics.hardCeilingBreaches || 0, "Scenario safety"]]
        };
        return (values[this.prefix] || values.CMD).map(([label, value, note], index) => ({ id: `${this.screenId}-metric-${index}`, label, value, note }));
    }

    get boardColumns() {
        const rows = this.records;
        const groups = [
            { id: "new", label: "New / draft", rows: rows.filter((row, index) => index % 3 === 0) },
            { id: "review", label: "In review", rows: rows.filter((row, index) => index % 3 === 1) },
            { id: "controlled", label: "Controlled outcome", rows: rows.filter((row, index) => index % 3 === 2) }
        ];
        return groups.map((group) => ({ ...group, count: group.rows.length, empty: group.rows.length === 0 }));
    }

    get plannerRows() {
        const source = this.records.length ? this.records.slice(0, 7) : Array.from({ length: 7 }, (_, index) => ({ id: `plan-${index}`, primary: `Delivery work ${index + 1}`, secondary: "Current plan", status: index === 3 ? "Approval required" : "Within capacity", detail: this.focus, score: 42 + index * 7 }));
        return source.map((row, index) => ({ ...row, planStyle: `left:${Math.min(62, index * 8)}%;width:${Math.max(18, Math.min(48, row.score / 2))}%`, hours: index === 4 ? "10h" : index % 3 === 0 ? "4h + 4h" : "8h" }));
    }

    get matrixRows() {
        return (this.records.length ? this.records : Array.from({ length: 8 }, (_, index) => ({ id: `matrix-${index}`, primary: `Practitioner ${index + 1}`, secondary: "Salesforce COE", status: "Eligible", detail: this.focus, score: 78 + index * 2 }))).slice(0, 8);
    }

    get dashboardBars() {
        const labels = this.prefix === "CMD" ? ["Delivery health","Capacity coverage","Skills readiness","Commercial control","Time compliance","Data quality"] : ["Revenue coverage","Planned cost","Forecast margin","Earned value","Collections","Delivery readiness"];
        return labels.map((label, index) => ({ id: `${this.screenId}-bar-${index}`, label, value: 62 + ((index * 7 + this.stageNumber * 3) % 35), style: `width:${62 + ((index * 7 + this.stageNumber * 3) % 35)}%` }));
    }

    get consoleChecks() {
        return [
            { id: "scope", label: "Authority and scope", state: "Passed", detail: this.activeRole || "Administrator" },
            { id: "source", label: "Source contract", state: "Mock active", detail: this.sourceLabel },
            { id: "validation", label: "Server validation", state: "Ready", detail: this.screen?.api || "Resource360Service" },
            { id: "audit", label: "Audit correlation", state: "Enabled", detail: this.screen?.events || "RESOURCE360_EVENT" }
        ];
    }

    get recommendationCards() {
        return [
            { id: "recommended", rank: "01", title: "Recommended governed option", score: 94, detail: this.focus, className: "recommendation recommendation_primary" },
            { id: "alternate", rank: "02", title: "Balanced alternative", score: 87, detail: "Preserves the eight-hour standard day with explainable trade-offs.", className: "recommendation" },
            { id: "stretch", rank: "03", title: "Controlled stretch option", score: 79, detail: "Requires a reason, approver, expiry and audit evidence above eight hours.", className: "recommendation recommendation_warning" }
        ];
    }

    get evidenceButtonLabel() { return this.evidenceMode ? "Hide evidence lineage" : "Show evidence lineage"; }
    get nextScreenId() { return this.stageNumber < this.totalStages ? `${this.prefix}-${String(this.stageNumber + 1).padStart(2, "0")}` : undefined; }
    get previousScreenId() { return this.stageNumber > 1 ? `${this.prefix}-${String(this.stageNumber - 1).padStart(2, "0")}` : undefined; }
    get hasNext() { return Boolean(this.nextScreenId); }
    get hasPrevious() { return Boolean(this.previousScreenId); }
    get noNext() { return !this.hasNext; }
    get noPrevious() { return !this.hasPrevious; }

    handleJourney(event) { this.navigate(event.currentTarget.dataset.screen); }
    handleFilter(event) { this.filter = event.currentTarget.dataset.filter; this.selectedIndex = 0; this.outcome = `Filter applied: ${event.currentTarget.textContent.trim()}. ${this.records.length} governed records remain visible.`; }
    handleQuery(event) { this.query = event.target.value || ""; this.selectedIndex = 0; this.outcome = this.query ? `Live Salesforce evidence filtered for “${this.query}”.` : "Search cleared; full governed scope restored."; }
    handleSelect(event) { this.selectedIndex = Number(event.currentTarget.dataset.index); this.outcome = `${this.records[this.selectedIndex]?.primary || this.domain.noun} selected with source, status and control evidence.`; }
    handlePrimary() { this.outcome = `${this.actionLabel} is ready. Server authority, validation and audit controls are shown with the live transaction workspace.`; }
    handleEvidence() { this.evidenceMode = !this.evidenceMode; this.outcome = this.evidenceMode ? "Source ownership, policy and audit lineage are now visible." : "Evidence lineage collapsed; the operational view remains unchanged."; }
    handleNext() { this.navigate(this.nextScreenId); }
    handlePrevious() { this.navigate(this.previousScreenId); }
    navigate(screenId) { if (screenId) this.dispatchEvent(new CustomEvent("navigate", { detail: screenId, bubbles: true, composed: true })); }
    money(value) { return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value || 0); }
}
