import { api, LightningElement } from "lwc";

const ROUTES = Object.freeze({
    "GLB-01": { title: "Secure entry", kicker: "Identity assurance", description: "Prove the Salesforce session, mapped persona and effective scope before operational access." },
    "GLB-02": { title: "Role-aware home", kicker: "Priority command", description: "Turn governed portfolio signals into the next authorized action for the active persona." },
    "GLB-03": { title: "Notification center", kicker: "Exception lifecycle", description: "Triage live alerts by severity, inspect ownership and record a visible review outcome." },
    "GLB-04": { title: "Global search", kicker: "Cross-object discovery", description: "Search projects, practitioners and staffing requests without crossing the active Salesforce scope." },
    "GLB-05": { title: "Role and scope switcher", kicker: "Effective access", description: "Preview a certified persona and portfolio assignment before applying the operating context." },
    "GLB-06": { title: "Preferences and guidance", kicker: "Personal workspace", description: "Tune the workspace, save the demo-safe preference set and launch role-specific guidance." }
});

const SEVERITY_OPTIONS = Object.freeze([
    { label: "All severities", value: "All" },
    { label: "Critical", value: "Critical" },
    { label: "High", value: "High" },
    { label: "Medium", value: "Medium" },
    { label: "Low", value: "Low" }
]);

const SEARCH_TYPE_OPTIONS = Object.freeze([
    { label: "All Salesforce records", value: "All" },
    { label: "Projects", value: "Project" },
    { label: "Practitioners", value: "Practitioner" },
    { label: "Staffing requests", value: "Staffing request" }
]);

export default class Resource360GlobalExperience extends LightningElement {
    @api data = {};
    @api activeRole;
    @api recordingMode = false;
    _screenId = "GLB-01";
    sessionVerified = false;
    reviewedAlertIds = [];
    severity = "All";
    searchTerm = "";
    searchType = "All";
    selectedSearchId;
    selectedAlertId;
    draftRole;
    draftScope;
    appliedContext;
    density = "Comfortable";
    timezone = "Asia/Kolkata";
    emailAlerts = true;
    browserAlerts = true;
    preferencesSaved = false;

    @api
    get screenId() {
        return this._screenId;
    }

    set screenId(value) {
        this._screenId = value || "GLB-01";
        this.appliedContext = undefined;
        this.preferencesSaved = false;
    }

    get route() { return ROUTES[this.screenId] || ROUTES["GLB-01"]; }
    get experienceClass() { return `master-experience global-experience global-experience_${this.screenId.toLowerCase().replace("-", "")}`; }
    get isSecureEntry() { return this.screenId === "GLB-01"; }
    get isRoleHome() { return this.screenId === "GLB-02"; }
    get isNotifications() { return this.screenId === "GLB-03"; }
    get isSearch() { return this.screenId === "GLB-04"; }
    get isScopeSwitcher() { return this.screenId === "GLB-05"; }
    get isPreferences() { return this.screenId === "GLB-06"; }
    get routeLabel() { return `${this.screenId} · ${this.route.kicker}`; }
    get routeTitle() { return this.route.title; }
    get routeDescription() { return this.route.description; }
    get generatedLabel() { return this.formatDateTime(this.data?.generatedAt); }
    get currentUserLabel() { return this.recordingMode ? "Demo User" : "Authenticated Salesforce user"; }
    get currentRoleLabel() { return this.activeRole || "Certified role loading"; }
    get verifiedClass() { return this.sessionVerified ? "assurance-state assurance-state_verified" : "assurance-state"; }
    get verificationLabel() { return this.sessionVerified ? "Session verified" : "Verify Salesforce session"; }
    get verificationOutcome() { return this.sessionVerified ? "Verified · MFA assumption, persona mapping and record scope reconciled" : "Awaiting operator verification"; }

    get identitySteps() {
        return [
            { id: "entry", number: "01", title: "Salesforce entry", detail: "Trusted Lightning domain and active session", className: "journey-step journey-step_done" },
            { id: "persona", number: "02", title: "Persona mapping", detail: this.currentRoleLabel, className: this.sessionVerified ? "journey-step journey-step_done" : "journey-step journey-step_active" },
            { id: "scope", number: "03", title: "Record scope", detail: this.scopeSummary, className: this.sessionVerified ? "journey-step journey-step_done" : "journey-step" },
            { id: "home", number: "04", title: "Authorized home", detail: "Role-specific work queue", className: "journey-step" }
        ];
    }

    get scopeSummary() {
        const scope = this.activeScope;
        return scope ? `${scope.Portfolio_ID__c || "Enterprise"} · ${scope.Org_Unit_ID__c || "Salesforce COE"}` : "Salesforce COE · permitted records";
    }

    get activeScope() {
        return (this.data?.roleScopes || []).find((item) => item.Active__c && (!this.activeRole || item.Business_Role__c === this.activeRole))
            || (this.data?.roleScopes || []).find((item) => item.Active__c);
    }

    get assuranceFacts() {
        const scope = this.activeScope || {};
        return [
            { id: "identity", label: "Authenticated identity", value: this.currentUserLabel, detail: "Salesforce UserInfo context" },
            { id: "role", label: "Effective business role", value: this.currentRoleLabel, detail: scope.Assignment_Source__c || "Permission-set group mapping" },
            { id: "portfolio", label: "Portfolio scope", value: scope.Portfolio_ID__c || "PORT-SFCOE-DEMO", detail: scope.Org_Unit_ID__c || "EXL Salesforce COE" },
            { id: "certified", label: "Last certified", value: this.formatDateTime(scope.Last_Certified_At__c), detail: scope.Approval_Reference__c || "Demo access certification" }
        ];
    }

    get homeMetrics() {
        const metrics = this.data?.metrics || {};
        return [
            { id: "coverage", label: "Capacity coverage", value: `${metrics.fullAllocationCoveragePercent ?? 0}%`, trend: `${metrics.activeHeadcount ?? 0} active practitioners`, tone: "teal" },
            { id: "projects", label: "Projects in scope", value: this.data?.engagements?.length || 0, trend: `${this.activeProjects} active delivery`, tone: "blue" },
            { id: "margin", label: "Approved margin", value: `${metrics.approvedMarginPercent ?? 0}%`, trend: this.money(metrics.approvedRevenue || 0), tone: "purple" },
            { id: "exceptions", label: "Controlled exceptions", value: metrics.overallocatedResources ?? 0, trend: `${metrics.pendingOverallocationPlans ?? 0} awaiting decision`, tone: "orange" }
        ];
    }

    get activeProjects() { return (this.data?.engagements || []).filter((item) => !["Completed", "Cancelled"].includes(item.Status__c)).length; }
    get pendingStaffing() { return (this.data?.staffingRequests || []).filter((item) => ["Draft", "Pending"].includes(item.State__c)).length; }
    get openRisks() { return (this.data?.projectRisks || []).filter((item) => item.Status__c !== "Closed").length; }
    get submittedTimesheets() { return (this.data?.timesheets || []).filter((item) => item.Status__c === "Submitted").length; }

    get homeQueues() {
        return [
            { id: "delivery", eyebrow: "Delivery", title: "Review project health", count: this.activeProjects, detail: "Completion, commercial cover and delivery risk", target: "ENG-01", className: "priority-card priority-card_blue" },
            { id: "staffing", eyebrow: "Staffing", title: "Resolve demand queue", count: this.pendingStaffing, detail: "Budget-backed requests and capacity fit", target: "STFUI-21", className: "priority-card priority-card_teal" },
            { id: "risk", eyebrow: "Exceptions", title: "Triage accountable risks", count: this.openRisks, detail: "Severity, due date, owner and mitigation", target: "GLB-03", className: "priority-card priority-card_orange" },
            { id: "time", eyebrow: "Actuals", title: "Review submitted time", count: this.submittedTimesheets, detail: "Daily cap, approval step and evidence", target: "TIMEUI-04", className: "priority-card priority-card_purple" }
        ];
    }

    get portfolioPulse() {
        return (this.data?.engagements || []).slice(0, 5).map((item) => ({
            ...item,
            id: item.Id,
            completion: `${item.Completion_Percent__c || 0}%`,
            health: item.Account_Health_Score__c || 0,
            risk: item.Risk_Exposure_Score__c || 0,
            className: `pulse-row pulse-row_${this.toneForHealth(item.Account_Health_Score__c)}`
        }));
    }

    get severityOptions() { return SEVERITY_OPTIONS; }
    get searchTypeOptions() { return SEARCH_TYPE_OPTIONS; }
    get notificationRows() {
        const source = (this.data?.notifications || []).length ? this.data.notifications : this.riskNotifications;
        return source
            .filter((item) => this.severity === "All" || (item.Severity__c || "Medium") === this.severity)
            .map((item) => ({
                ...item,
                id: item.Id,
                title: item.Title__c || item.Title || item.Name,
                message: item.Message__c || item.Description__c || "Review the accountable delivery exception.",
                owner: item.Accountable_Owner__r?.Name || item.Owner_User__r?.Name || "Delivery owner",
                state: this.reviewedAlertIds.includes(item.Id) ? "Reviewed in this session" : (item.Resolution_Status__c || item.State__c || item.Status__c || "Open"),
                className: `alert-card alert-card_${(item.Severity__c || "medium").toLowerCase()} ${item.Id === this.selectedNotification?.Id ? "alert-card_selected" : ""}`
            }));
    }

    get riskNotifications() {
        return (this.data?.projectRisks || []).map((risk) => ({
            ...risk,
            Title__c: risk.Title__c,
            Message__c: risk.Mitigation__c,
            State__c: risk.Status__c,
            Accountable_Owner__r: risk.Owner_User__r
        }));
    }

    get selectedNotification() {
        const all = (this.data?.notifications || []).length ? this.data.notifications : this.riskNotifications;
        return all.find((item) => item.Id === this.selectedAlertId) || all[0];
    }

    get selectedNotificationView() {
        const item = this.selectedNotification || {};
        return {
            id: item.Id,
            title: item.Title__c || item.Title || item.Name || "No notification in scope",
            message: item.Message__c || item.Description__c || "No alert detail is currently available.",
            severity: item.Severity__c || "Informational",
            owner: item.Accountable_Owner__r?.Name || item.Owner_User__r?.Name || "Delivery owner",
            occurred: this.formatDateTime(item.Occurred_At__c || item.First_Seen_At__c || item.Due_Date__c),
            resolution: this.reviewedAlertIds.includes(item.Id) ? "Reviewed in this session" : (item.Resolution_Status__c || item.State__c || item.Status__c || "Open"),
            actionDisabled: !item.Id || this.reviewedAlertIds.includes(item.Id)
        };
    }

    get searchResults() {
        const term = this.searchTerm.trim().toLowerCase();
        const projects = (this.data?.engagements || []).map((item) => ({ id: item.Id, type: "Project", title: item.Name, subtitle: `${item.Engagement_ID__c} · ${item.Salesforce_Tower__c || "Salesforce"}`, status: item.Status__c, detail: `${item.Industry__c || "Industry"} · ${item.Completion_Percent__c || 0}% complete`, target: "ENG-02" }));
        const people = (this.data?.resources || []).map((item) => ({ id: item.Id, type: "Practitioner", title: item.Preferred_Name__c, subtitle: `${item.Employee_ID__c} · ${item.Primary_Role__c || item.Tower__c}`, status: item.Capacity_Status__c || item.Status__c, detail: `${item.Location__c || "Location"} · ${item.Allocated_Daily_Hours__c || 0}h allocated`, target: "SKLUI-05" }));
        const requests = (this.data?.staffingRequests || []).map((item) => ({ id: item.Id, type: "Staffing request", title: item.Name, subtitle: `${item.Engagement__r?.Name || "Project"} · ${item.Requested_Role__c}`, status: item.State__c, detail: `${item.Daily_Hours__c || 0}h/day · fit ${item.Fit_Score__c || 0}`, target: "STFUI-22" }));
        return [...projects, ...people, ...requests]
            .filter((item) => this.searchType === "All" || item.type === this.searchType)
            .filter((item) => !term || `${item.title} ${item.subtitle} ${item.detail}`.toLowerCase().includes(term))
            .slice(0, 12)
            .map((item) => ({ ...item, className: `search-result ${item.id === this.selectedSearchId ? "search-result_selected" : ""}` }));
    }

    get selectedSearchRecord() {
        return this.searchResults.find((item) => item.id === this.selectedSearchId) || this.searchResults[0];
    }

    get selectedSearchView() {
        const result = this.selectedSearchRecord || {};
        return {
            ...result,
            title: result.title || "Start with a record name, project ID or role",
            type: result.type || "Scoped discovery",
            subtitle: result.subtitle || "Search remains inside the active persona and portfolio scope.",
            status: result.status || "Ready",
            detail: result.detail || "Projects, practitioners and staffing demand are indexed from the live workspace response.",
            disabled: !result.id
        };
    }

    get roleOptions() { return (this.data?.activeRoles || []).map((value) => ({ label: value, value })); }
    get scopeOptions() {
        const scopes = (this.data?.roleScopes || []).filter((item) => item.Active__c);
        if (!scopes.length) return [{ label: "PORT-SFCOE-DEMO · Salesforce COE", value: "PORT-SFCOE-DEMO" }];
        const unique = new Map();
        scopes.forEach((item) => {
            const value = item.Portfolio_ID__c || item.Org_Unit_ID__c || item.Id;
            if (!unique.has(value)) unique.set(value, { label: `${value} · ${item.Org_Unit_ID__c || "EXL Salesforce COE"}`, value });
        });
        return [...unique.values()];
    }

    get selectedDraftRole() { return this.draftRole || this.activeRole || this.roleOptions[0]?.value; }
    get selectedDraftScope() { return this.draftScope || this.activeScope?.Portfolio_ID__c || this.scopeOptions[0]?.value; }
    get scopePreviewFacts() {
        const scope = (this.data?.roleScopes || []).find((item) => item.Business_Role__c === this.selectedDraftRole && (item.Portfolio_ID__c || item.Org_Unit_ID__c || item.Id) === this.selectedDraftScope) || this.activeScope || {};
        return [
            { id: "role", label: "Persona", value: this.selectedDraftRole || "Administrator", detail: "Server-derived authority" },
            { id: "scope", label: "Portfolio", value: this.selectedDraftScope || "PORT-SFCOE-DEMO", detail: scope.Org_Unit_ID__c || "Salesforce COE" },
            { id: "validity", label: "Effective window", value: `${this.formatDate(scope.Valid_From__c)} → ${this.formatDate(scope.Valid_To__c)}`, detail: scope.Active__c === false ? "Inactive" : "Active certified assignment" },
            { id: "source", label: "Assignment evidence", value: scope.Assignment_Source__c || "Mock Entra mapping", detail: scope.Approval_Reference__c || "EXL-DEMO-ACCESS" }
        ];
    }

    get densityOptions() { return [{ label: "Comfortable", value: "Comfortable" }, { label: "Compact", value: "Compact" }, { label: "Spacious", value: "Spacious" }]; }
    get timezoneOptions() { return [{ label: "India Standard Time", value: "Asia/Kolkata" }, { label: "UK time", value: "Europe/London" }, { label: "US Eastern", value: "America/New_York" }]; }
    get preferenceOutcome() { return this.preferencesSaved ? `Saved · ${this.density} density · ${this.timezone}` : "No unsaved preference changes"; }
    get guideCards() {
        return [
            { id: "overview", number: "01", title: "Product orientation", detail: "Role-aware navigation, record scope and demo boundary", target: "GLB-02", tone: "navy" },
            { id: "engagement", number: "02", title: "Project 360 runbook", detail: "Commercial lineage, roster, economics and work plan", target: "ENG-01", tone: "blue" },
            { id: "staffing", number: "03", title: "Staffing decision guide", detail: "Skills fit, daily capacity and publication controls", target: "STFUI-21", tone: "teal" },
            { id: "finance", number: "04", title: "Budget and actuals", detail: "Versioned economics, approvals and reconciliation", target: "BUDUI-01", tone: "purple" }
        ].map((item) => ({ ...item, className: `guide-card guide-card_${item.tone}` }));
    }

    handleVerifySession() { this.sessionVerified = true; }
    handleHomeQueue(event) { this.navigate(event.currentTarget.dataset.target); }
    handleNavigateHome() { this.navigate("GLB-02"); }
    handleSeverity(event) { this.severity = event.detail.value; this.selectedAlertId = undefined; }
    handleSelectAlert(event) { this.selectedAlertId = event.currentTarget.dataset.recordId; }
    handleMarkReviewed() {
        const id = this.selectedNotification?.Id;
        if (id && !this.reviewedAlertIds.includes(id)) this.reviewedAlertIds = [...this.reviewedAlertIds, id];
    }
    handleSearchInput(event) { this.searchTerm = event.target.value || ""; this.selectedSearchId = undefined; }
    handleSearchType(event) { this.searchType = event.detail.value; this.selectedSearchId = undefined; }
    handleSelectSearch(event) { this.selectedSearchId = event.currentTarget.dataset.recordId; }
    handleOpenSearchResult() { if (this.selectedSearchRecord?.target) this.navigate(this.selectedSearchRecord.target); }
    handleDraftRole(event) { this.draftRole = event.detail.value; this.appliedContext = undefined; }
    handleDraftScope(event) { this.draftScope = event.detail.value; this.appliedContext = undefined; }
    handleApplyContext() {
        this.appliedContext = `${this.selectedDraftRole} · ${this.selectedDraftScope}`;
        this.dispatchEvent(new CustomEvent("rolechange", { detail: this.selectedDraftRole, bubbles: true, composed: true }));
    }
    handleDensity(event) { this.density = event.detail.value; this.preferencesSaved = false; }
    handleTimezone(event) { this.timezone = event.detail.value; this.preferencesSaved = false; }
    handleToggle(event) { this[event.target.dataset.preference] = event.target.checked; this.preferencesSaved = false; }
    handleSavePreferences() { this.preferencesSaved = true; }
    handleGuide(event) { this.navigate(event.currentTarget.dataset.target); }

    navigate(screenId) {
        this.dispatchEvent(new CustomEvent("navigate", { detail: screenId, bubbles: true, composed: true }));
    }

    toneForHealth(value) { return Number(value || 0) >= 80 ? "good" : Number(value || 0) >= 60 ? "watch" : "risk"; }
    money(value) { return new Intl.NumberFormat("en-IN", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(Number(value || 0)); }
    formatDate(value) { return value ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value)) : "Open ended"; }
    formatDateTime(value) { return value ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Current session"; }
}
