import { api, LightningElement } from "lwc";

const ROUTES = Object.freeze({
    "ENG-01": { title: "Engagement portfolio", kicker: "Project selection", description: "Filter the governed project book, compare delivery health and select the record that drives every downstream 360." },
    "ENG-02": { title: "Project 360", kicker: "Commercial lineage", description: "Reconcile account, portfolio, contract, change-order and acceptance evidence around one selected Salesforce engagement." },
    "ENG-03": { title: "Project roster", kicker: "Resource alignment", description: "Inspect each practitioner allocation, classification, daily capacity and project-role evidence." },
    "ENG-04": { title: "Project economics", kicker: "Budget control", description: "Select the current budget, trace approval state and drill into the costed delivery roster." },
    "ENG-05": { title: "Actuals reconciliation", kicker: "Timesheet control", description: "Filter weekly actuals, select a submitted sheet and prove the eight-hour daily entry guardrail." },
    "ENG-06": { title: "Delivery work plan", kicker: "Milestones and dependencies", description: "Navigate the project WBS, isolate the critical path and inspect acceptance-ready work units." },
    "ENG-07": { title: "Risk and action board", kicker: "Delivery assurance", description: "Filter live project risks by severity and record a visible accountable-review outcome." },
    "ENG-08": { title: "Allocation history", kicker: "Effective-dated lineage", description: "Select a practitioner, compare allocation versions and expose publication and over-allocation evidence." }
});

const ALL_OPTION = Object.freeze([{ label: "All", value: "All" }]);

export default class Resource360EngagementExperience extends LightningElement {
    @api data = {};
    @api activeRole;
    @api recordingMode = false;
    _screenId = "ENG-01";
    selectedEngagementId;
    selectedCommercialId;
    selectedAllocationId;
    selectedBudgetId;
    selectedTimesheetId;
    selectedWorkUnitId;
    selectedRiskId;
    selectedHistoryResourceId;
    projectSearch = "";
    projectStatus = "All";
    rosterClassification = "All";
    rosterSearch = "";
    budgetState = "All";
    timesheetState = "All";
    workPhase = "All";
    criticalOnly = false;
    riskSeverity = "All";
    riskStatus = "All";
    reviewedRiskIds = [];
    actualsValidated = false;
    budgetEvidenceOpened = false;
    versionsCompared = false;

    @api
    get screenId() { return this._screenId; }
    set screenId(value) {
        this._screenId = value || "ENG-01";
        this.actualsValidated = false;
        this.budgetEvidenceOpened = false;
        this.versionsCompared = false;
    }

    get route() { return ROUTES[this.screenId] || ROUTES["ENG-01"]; }
    get experienceClass() { return `master-experience engagement-experience engagement-experience_${this.screenId.toLowerCase().replace("-", "")}`; }
    get routeLabel() { return `${this.screenId} · ${this.route.kicker}`; }
    get routeTitle() { return this.route.title; }
    get routeDescription() { return this.route.description; }
    get generatedLabel() { return this.formatDateTime(this.data?.generatedAt); }
    get isPortfolio() { return this.screenId === "ENG-01"; }
    get isProject360() { return this.screenId === "ENG-02"; }
    get isRoster() { return this.screenId === "ENG-03"; }
    get isEconomics() { return this.screenId === "ENG-04"; }
    get isActuals() { return this.screenId === "ENG-05"; }
    get isWorkPlan() { return this.screenId === "ENG-06"; }
    get isRisks() { return this.screenId === "ENG-07"; }
    get isAllocationHistory() { return this.screenId === "ENG-08"; }

    get engagements() { return this.data?.engagements || []; }
    get defaultEngagement() {
        return this.engagements.find((item) => item.Name?.includes("Global Retail Cloud"))
            || this.engagements.find((item) => item.Status__c === "Active")
            || this.engagements[0];
    }
    get selectedEngagement() { return this.engagements.find((item) => item.Id === this.selectedEngagementId) || this.defaultEngagement || {}; }
    get activeEngagementId() { return this.selectedEngagement?.Id; }
    get selectedProjectName() { return this.selectedEngagement?.Name || "Select a project"; }
    get selectedProjectCode() { return this.selectedEngagement?.Engagement_ID__c || "No project selected"; }

    get projectStatusOptions() {
        return this.optionsFor(this.engagements.map((item) => item.Status__c));
    }
    get projectRows() {
        const term = this.projectSearch.trim().toLowerCase();
        return this.engagements
            .filter((item) => this.projectStatus === "All" || item.Status__c === this.projectStatus)
            .filter((item) => !term || `${item.Name} ${item.Engagement_ID__c} ${item.Industry__c} ${item.Salesforce_Tower__c} ${item.Account__r?.Name || ""}`.toLowerCase().includes(term))
            .map((item) => ({
                ...item,
                id: item.Id,
                account: item.Account__r?.Name || "EXL client account",
                portfolio: item.Portfolio__r?.Name || item.Portfolio_ID__c || "Salesforce COE",
                subPortfolio: item.Sub_Portfolio__r?.Name || "Delivery portfolio",
                completion: `${item.Completion_Percent__c || 0}%`,
                progressStyle: `width:${Math.min(Number(item.Completion_Percent__c || 0), 100)}%`,
                healthLabel: `${item.Account_Health_Score__c || 0}/100`,
                riskLabel: `${item.Risk_Exposure_Score__c || 0}`,
                className: `project-card project-card_${this.healthTone(item.Account_Health_Score__c)} ${item.Id === this.activeEngagementId ? "project-card_selected" : ""}`
            }));
    }
    get hasProjectRows() { return this.projectRows.length > 0; }
    get selectedProjectView() {
        const item = this.selectedEngagement || {};
        return {
            ...item,
            account: item.Account__r?.Name || "EXL client account",
            portfolio: item.Portfolio__r?.Name || item.Portfolio_ID__c || "PORT-SFCOE-DEMO",
            subPortfolio: item.Sub_Portfolio__r?.Name || "Salesforce delivery",
            manager: item.Project_Manager__r?.Name || "Assigned project manager",
            start: this.formatDate(item.Start_Date__c),
            end: this.formatDate(item.End_Date__c),
            completion: `${item.Completion_Percent__c || 0}%`,
            progressStyle: `width:${Math.min(Number(item.Completion_Percent__c || 0), 100)}%`,
            disabled: !item.Id
        };
    }

    get projectHeroFacts() {
        const item = this.selectedProjectView;
        return [
            { id: "account", label: "Account", value: item.account, detail: `${item.portfolio} · ${item.subPortfolio}` },
            { id: "tower", label: "Delivery context", value: item.Salesforce_Tower__c || "Salesforce", detail: item.Industry__c || "Industry" },
            { id: "manager", label: "Project manager", value: item.manager, detail: `${item.start} → ${item.end}` },
            { id: "health", label: "Account health", value: `${item.Account_Health_Score__c || 0}/100`, detail: `Risk exposure ${item.Risk_Exposure_Score__c || 0}` },
            { id: "skills", label: "Mandatory skill cover", value: `${item.Mandatory_Skill_Coverage_Percent__c || 0}%`, detail: `Role readiness ${item.Role_Readiness_Percent__c || 0}%` },
            { id: "delivery", label: "Delivery signal", value: `${item.Schedule_Variance_Days__c || 0} days`, detail: `${item.Incident_Count__c || 0} incidents · ${item.Release_Count__c || 0} releases` }
        ];
    }

    get commercialReferences() {
        return (this.data?.commercialReferences || [])
            .filter((item) => !this.activeEngagementId || item.Engagement__c === this.activeEngagementId)
            .map((item) => ({
                ...item,
                id: item.Id,
                type: item.Reference_Type__c || "Commercial reference",
                valueLabel: this.money(item.Value__c, this.selectedEngagement?.Currency_Code__c),
                signedLabel: this.formatDate(item.Signed_Date__c),
                validity: `${this.formatDate(item.Valid_From__c)} → ${this.formatDate(item.Valid_To__c)}`,
                className: `commercial-card ${item.Id === this.selectedCommercialId ? "commercial-card_selected" : ""}`
            }));
    }
    get selectedCommercial() { return this.commercialReferences.find((item) => item.Id === this.selectedCommercialId) || this.commercialReferences[0]; }
    get selectedCommercialView() {
        const item = this.selectedCommercial || {};
        return {
            ...item,
            title: item.Name || "No commercial reference in scope",
            type: item.type || "Contract",
            valueLabel: item.valueLabel || this.money(0),
            approval: item.Approval_Status__c || "Not available",
            status: item.Status__c || "Not available",
            signedLabel: item.signedLabel || "Not signed",
            validity: item.validity || "No validity window",
            disabled: !item.Id
        };
    }
    get commercialLines() {
        const refId = this.selectedCommercial?.Id;
        return (this.data?.commercialLines || []).filter((item) => item.Commercial_Reference__c === refId).map((item) => ({
            ...item,
            id: item.Id,
            valueLabel: this.money(item.Value__c, this.selectedEngagement?.Currency_Code__c),
            deliveryLabel: this.formatDate(item.Planned_Delivery_Date__c),
            acceptance: item.Acceptance_Required__c ? (item.Acceptance_Status__c || "Required") : "Not required"
        }));
    }
    get hasCommercialLines() { return this.commercialLines.length > 0; }

    get projectAllocations() {
        return (this.data?.allocations || []).filter((item) => !this.activeEngagementId || item.Engagement__c === this.activeEngagementId);
    }
    get rosterClassificationOptions() { return this.optionsFor(this.projectAllocations.map((item) => item.Classification__c)); }
    get rosterRows() {
        const term = this.rosterSearch.trim().toLowerCase();
        return this.projectAllocations
            .filter((item) => this.rosterClassification === "All" || item.Classification__c === this.rosterClassification)
            .filter((item) => !term || `${item.Resource__r?.Preferred_Name__c} ${item.Role__c} ${item.Work_Unit__r?.Name}`.toLowerCase().includes(term))
            .map((item) => ({
                ...item,
                id: item.Id,
                resource: item.Resource__r?.Preferred_Name__c || "Role placeholder",
                workUnit: item.Work_Unit__r?.Name || "Project delivery",
                hoursLabel: `${item.Daily_Hours__c || 0}h/day`,
                utilization: `${item.Allocation_Percent__c || 0}%`,
                className: `roster-card roster-card_${(item.Capacity_Status__c || "allocated").toLowerCase().replaceAll(" ", "-")} ${item.Id === this.selectedAllocationId ? "roster-card_selected" : ""}`
            }));
    }
    get selectedRoster() { return this.rosterRows.find((item) => item.Id === this.selectedAllocationId) || this.rosterRows[0]; }
    get selectedRosterView() {
        const item = this.selectedRoster || {};
        const matches = (this.data?.staffingSkillMatches || []).filter((match) => match.Resource__c === item.Resource__c).slice(0, 4);
        return {
            ...item,
            resource: item.resource || "Select a practitioner allocation",
            role: item.Role__c || "Project role",
            classification: item.Classification__c || "Classification",
            hoursLabel: item.hoursLabel || "0h/day",
            projected: `${item.Projected_Daily_Hours__c || item.Daily_Hours__c || 0}h aggregate`,
            capacity: item.Capacity_Status__c || "Not calculated",
            window: `${this.formatDate(item.Start_Date__c)} → ${this.formatDate(item.End_Date__c)}`,
            approval: item.Overallocation_Status__c || "Standard allocation",
            evidence: matches.length ? matches.map((match) => `${match.Capability__r?.Name}: ${match.Score__c || 0}`).join(" · ") : "Role, tower and availability evidence retained",
            disabled: !item.Id
        };
    }

    get projectBudgets() {
        return (this.data?.budgets || []).filter((item) => !this.activeEngagementId || item.Engagement__c === this.activeEngagementId);
    }
    get budgetStateOptions() { return this.optionsFor(this.projectBudgets.map((item) => item.State__c)); }
    get budgetRows() {
        return this.projectBudgets.filter((item) => this.budgetState === "All" || item.State__c === this.budgetState).map((item) => ({
            ...item,
            id: item.Id,
            revenueLabel: this.money(item.Revenue__c, this.selectedEngagement?.Currency_Code__c),
            costLabel: this.money(item.Total_Cost__c, this.selectedEngagement?.Currency_Code__c),
            marginLabel: `${item.Margin_Percent__c || 0}%`,
            className: `budget-row ${item.Id === this.selectedBudgetId ? "budget-row_selected" : ""}`
        }));
    }
    get selectedBudget() { return this.budgetRows.find((item) => item.Id === this.selectedBudgetId) || this.budgetRows[0] || this.projectBudgets[0]; }
    get budgetView() {
        const item = this.selectedBudget || {};
        return {
            ...item,
            name: item.Name || "No current budget in scope",
            revenue: this.money(item.Revenue__c, this.selectedEngagement?.Currency_Code__c),
            cost: this.money(item.Total_Cost__c, this.selectedEngagement?.Currency_Code__c),
            margin: `${item.Margin_Percent__c || 0}%`,
            forecastMargin: `${item.Forecast_Margin_Percent__c || 0}%`,
            eac: this.money(item.Estimate_At_Completion__c, this.selectedEngagement?.Currency_Code__c),
            etc: this.money(item.Estimate_To_Complete__c, this.selectedEngagement?.Currency_Code__c),
            plannedHours: new Intl.NumberFormat("en-IN").format(item.Planned_Hours__c || 0),
            marginStyle: `width:${Math.min(Math.max(Number(item.Margin_Percent__c || 0), 0), 100)}%`,
            forecastStyle: `width:${Math.min(Math.max(Number(item.Forecast_Margin_Percent__c || 0), 0), 100)}%`,
            disabled: !item.Id
        };
    }
    get selectedBudgetLines() {
        const budgetId = this.selectedBudget?.Id;
        return (this.data?.budgetLines || []).filter((item) => item.Budget__c === budgetId).slice(0, 8).map((item) => ({
            ...item,
            id: item.Id,
            resource: item.Resource__r?.Preferred_Name__c || "Role placeholder",
            hours: new Intl.NumberFormat("en-IN").format(item.Planned_Hours__c || 0),
            cost: this.money(item.Planned_Cost__c, this.selectedEngagement?.Currency_Code__c)
        }));
    }

    get projectTimeEntries() {
        return (this.data?.timeEntries || []).filter((item) => !this.selectedProjectName || item.Engagement__r?.Name === this.selectedProjectName);
    }
    get projectTimesheets() {
        const ids = new Set(this.projectTimeEntries.map((entry) => entry.Timesheet__c));
        const scoped = (this.data?.timesheets || []).filter((item) => !ids.size || ids.has(item.Id));
        return scoped;
    }
    get timesheetStateOptions() { return this.optionsFor(this.projectTimesheets.map((item) => item.Status__c)); }
    get timesheetRows() {
        return this.projectTimesheets.filter((item) => this.timesheetState === "All" || item.Status__c === this.timesheetState).map((item) => {
            const entries = this.projectTimeEntries.filter((entry) => entry.Timesheet__c === item.Id);
            const total = entries.reduce((sum, entry) => sum + Number(entry.Hours__c || 0), 0);
            return {
                ...item,
                id: item.Id,
                resource: item.Resource__r?.Preferred_Name__c || "Practitioner",
                weekLabel: this.formatDate(item.Week_Start__c),
                hours: `${total}h`,
                exception: item.Exception_Code__c || "No exception",
                className: `timesheet-row ${item.Id === this.selectedTimesheetId ? "timesheet-row_selected" : ""}`
            };
        });
    }
    get selectedTimesheet() { return this.timesheetRows.find((item) => item.Id === this.selectedTimesheetId) || this.timesheetRows[0]; }
    get selectedTimesheetEntries() {
        const id = this.selectedTimesheet?.Id;
        return this.projectTimeEntries.filter((item) => item.Timesheet__c === id).map((item) => ({ ...item, id: item.Id, date: this.formatDate(item.Work_Date__c), hours: `${item.Hours__c || 0}h`, className: Number(item.Hours__c || 0) > 8 ? "actual-day actual-day_breach" : "actual-day actual-day_valid" }));
    }
    get timesheetView() {
        const item = this.selectedTimesheet || {};
        return { ...item, resource: item.resource || "Select a weekly timesheet", week: item.weekLabel || "No week", hours: item.hours || "0h", status: item.Status__c || "No state", approval: item.Required_Approval_Role__c || "Standard manager route", outcome: this.actualsValidated ? "Validated · no time entry exceeds the governed 8-hour daily cap" : "Run the daily-cap validation", disabled: !item.Id };
    }

    get projectWorkUnits() { return (this.data?.workUnits || []).filter((item) => !this.activeEngagementId || item.Engagement__c === this.activeEngagementId); }
    get workPhaseOptions() { return this.optionsFor(this.projectWorkUnits.map((item) => item.Phase__c)); }
    get workUnitRows() {
        return this.projectWorkUnits
            .filter((item) => this.workPhase === "All" || item.Phase__c === this.workPhase)
            .filter((item) => !this.criticalOnly || item.Critical_Path__c)
            .map((item) => ({
                ...item,
                id: item.Id,
                owner: item.Assigned_Resource__r?.Preferred_Name__c || (this.recordingMode && item.Owner_User__r?.Name ? "Demo Project Owner" : item.Owner_User__r?.Name) || "Delivery owner",
                dateRange: `${this.shortDate(item.Start_Date__c)} → ${this.shortDate(item.End_Date__c)}`,
                completion: `${item.Percent_Complete__c || 0}%`,
                progressStyle: `width:${Math.min(Number(item.Percent_Complete__c || 0), 100)}%`,
                className: `work-unit ${item.Critical_Path__c ? "work-unit_critical" : ""} ${item.Id === this.selectedWorkUnitId ? "work-unit_selected" : ""}`
            }));
    }
    get selectedWorkUnit() { return this.workUnitRows.find((item) => item.Id === this.selectedWorkUnitId) || this.workUnitRows[0]; }
    get selectedWorkUnitView() {
        const item = this.selectedWorkUnit || {};
        const dependencies = (this.data?.workDependencies || []).filter((dep) => dep.Predecessor__c === item.Id || dep.Successor__c === item.Id);
        return {
            ...item,
            title: item.Name || "Select a work unit",
            code: item.Work_Unit_Code__c || "WBS",
            owner: item.owner || "Delivery owner",
            phase: item.Phase__c || "Phase",
            completion: item.completion || "0%",
            window: item.dateRange || "No schedule",
            acceptance: item.Acceptance_Required__c ? (item.Acceptance_Status__c || "Required") : "Not required",
            dependency: dependencies.length ? dependencies.map((dep) => `${dep.Predecessor__r?.Name} → ${dep.Successor__r?.Name} (${dep.Dependency_Type__c})`).join(" · ") : "No linked predecessor or successor",
            disabled: !item.Id
        };
    }
    get criticalButtonLabel() { return this.criticalOnly ? "Show all work units" : "Show critical path"; }

    get projectRisks() { return (this.data?.projectRisks || []).filter((item) => !this.activeEngagementId || item.Engagement__c === this.activeEngagementId); }
    get riskSeverityOptions() { return this.optionsFor(this.projectRisks.map((item) => item.Severity__c)); }
    get riskStatusOptions() { return this.optionsFor(this.projectRisks.map((item) => item.Status__c)); }
    get riskRows() {
        return this.projectRisks
            .filter((item) => this.riskSeverity === "All" || item.Severity__c === this.riskSeverity)
            .filter((item) => this.riskStatus === "All" || item.Status__c === this.riskStatus)
            .map((item) => ({
                ...item,
                id: item.Id,
                title: item.Title__c || item.Name,
                owner: item.Owner_User__r?.Name || "Delivery owner",
                due: this.formatDate(item.Due_Date__c),
                reviewState: this.reviewedRiskIds.includes(item.Id) ? "Reviewed in this session" : item.Status__c,
                className: `risk-card risk-card_${(item.Severity__c || "medium").toLowerCase()} ${item.Id === this.selectedRiskId ? "risk-card_selected" : ""}`
            }));
    }
    get selectedRisk() { return this.riskRows.find((item) => item.Id === this.selectedRiskId) || this.riskRows[0]; }
    get riskView() {
        const item = this.selectedRisk || {};
        return { ...item, title: item.title || "No risk matches this filter", severity: item.Severity__c || "Informational", owner: item.owner || "Delivery owner", due: item.due || "No due date", status: item.reviewState || "No state", description: item.Description__c || "Risk evidence is not available.", mitigation: item.Mitigation__c || "Mitigation pending", disabled: !item.Id || this.reviewedRiskIds.includes(item.Id) };
    }

    get allocationHistory() {
        const rows = (this.data?.allocationHistory || this.data?.allocations || []).filter((item) => !this.activeEngagementId || item.Engagement__c === this.activeEngagementId);
        return rows;
    }
    get historyResourceOptions() {
        const unique = new Map();
        this.allocationHistory.forEach((item) => { if (item.Resource__c && !unique.has(item.Resource__c)) unique.set(item.Resource__c, { label: item.Resource__r?.Preferred_Name__c || item.Resource__c, value: item.Resource__c }); });
        return [...unique.values()];
    }
    get activeHistoryResourceId() { return this.selectedHistoryResourceId || this.historyResourceOptions[0]?.value; }
    get historyRows() {
        return this.allocationHistory.filter((item) => !this.activeHistoryResourceId || item.Resource__c === this.activeHistoryResourceId).map((item, index) => ({
            ...item,
            id: item.Id,
            resource: item.Resource__r?.Preferred_Name__c || "Practitioner",
            versionLabel: `Version ${item.Version__c || index + 1}`,
            hours: `${item.Daily_Hours__c || 0}h/day`,
            window: `${this.formatDate(item.Start_Date__c)} → ${this.formatDate(item.End_Date__c)}`,
            currentLabel: item.Current__c ? "Current" : "Superseded",
            publication: item.Published_By__r?.Name ? `Published by ${this.recordingMode ? "Demo Publisher" : item.Published_By__r.Name}` : (item.Planning_Status__c || "Historical"),
            className: `history-version ${item.Current__c ? "history-version_current" : ""}`
        }));
    }
    get historySummary() {
        const rows = this.historyRows;
        const current = rows.find((item) => item.Current__c) || rows[0] || {};
        return {
            resource: current.resource || "Select a practitioner",
            role: current.Role__c || "Project role",
            versions: rows.length,
            currentHours: current.hours || "0h/day",
            capacity: current.Capacity_Status__c || "Not calculated",
            comparison: this.versionsCompared ? `${rows.length} version(s) compared · prior states preserved · current publication identified` : "Select compare to expose effective-dated lineage"
        };
    }

    handleProjectSearch(event) { this.projectSearch = event.target.value || ""; }
    handleProjectStatus(event) { this.projectStatus = event.detail.value; }
    handleSelectProject(event) { this.selectProject(event.currentTarget.dataset.recordId); }
    handleOpenProject360() { this.navigate("ENG-02"); }
    handleProjectPicker(event) { this.selectProject(event.detail.value); }
    selectProject(id) {
        this.selectedEngagementId = id;
        this.selectedCommercialId = undefined;
        this.selectedAllocationId = undefined;
        this.selectedBudgetId = undefined;
        this.selectedTimesheetId = undefined;
        this.selectedWorkUnitId = undefined;
        this.selectedRiskId = undefined;
        this.selectedHistoryResourceId = undefined;
    }
    handleSelectCommercial(event) { this.selectedCommercialId = event.currentTarget.dataset.recordId; }
    handleOpenCommercialLine() { this.navigate("ENG-06"); }
    handleRosterClassification(event) { this.rosterClassification = event.detail.value; this.selectedAllocationId = undefined; }
    handleRosterSearch(event) { this.rosterSearch = event.target.value || ""; this.selectedAllocationId = undefined; }
    handleSelectRoster(event) { this.selectedAllocationId = event.currentTarget.dataset.recordId; }
    handleOpenResource360() { this.navigate("SKLUI-05"); }
    handleBudgetState(event) { this.budgetState = event.detail.value; this.selectedBudgetId = undefined; this.budgetEvidenceOpened = false; }
    handleSelectBudget(event) { this.selectedBudgetId = event.currentTarget.dataset.recordId; this.budgetEvidenceOpened = false; }
    handleBudgetEvidence() { this.budgetEvidenceOpened = true; }
    handleTimesheetState(event) { this.timesheetState = event.detail.value; this.selectedTimesheetId = undefined; this.actualsValidated = false; }
    handleSelectTimesheet(event) { this.selectedTimesheetId = event.currentTarget.dataset.recordId; this.actualsValidated = false; }
    handleValidateActuals() { this.actualsValidated = true; }
    handleWorkPhase(event) { this.workPhase = event.detail.value; this.selectedWorkUnitId = undefined; }
    handleToggleCritical() { this.criticalOnly = !this.criticalOnly; this.selectedWorkUnitId = undefined; }
    handleSelectWorkUnit(event) { this.selectedWorkUnitId = event.currentTarget.dataset.recordId; }
    handleOpenProjectRisks() { this.navigate("ENG-07"); }
    handleRiskSeverity(event) { this.riskSeverity = event.detail.value; this.selectedRiskId = undefined; }
    handleRiskStatus(event) { this.riskStatus = event.detail.value; this.selectedRiskId = undefined; }
    handleSelectRisk(event) { this.selectedRiskId = event.currentTarget.dataset.recordId; }
    handleReviewRisk() { const id = this.selectedRisk?.Id; if (id && !this.reviewedRiskIds.includes(id)) this.reviewedRiskIds = [...this.reviewedRiskIds, id]; }
    handleHistoryResource(event) { this.selectedHistoryResourceId = event.detail.value; this.versionsCompared = false; }
    handleCompareVersions() { this.versionsCompared = true; }

    get projectOptions() { return this.engagements.map((item) => ({ label: `${item.Name} · ${item.Engagement_ID__c}`, value: item.Id })); }
    get budgetEvidenceOutcome() { return this.budgetEvidenceOpened ? `Evidence opened · ${this.budgetView.State__c || "State"} · approval step ${this.budgetView.Approval_Step__c || 0} · policy ${this.budgetView.Policy_Version__c || "current"}` : "Select review to expose approval and policy evidence"; }

    navigate(screenId) { this.dispatchEvent(new CustomEvent("navigate", { detail: screenId, bubbles: true, composed: true })); }
    optionsFor(values) { return [...ALL_OPTION, ...[...new Set(values.filter(Boolean))].map((value) => ({ label: value, value }))]; }
    healthTone(value) { return Number(value || 0) >= 80 ? "good" : Number(value || 0) >= 60 ? "watch" : "risk"; }
    money(value, currency = "USD") { return new Intl.NumberFormat("en-IN", { style: "currency", currency: currency || "USD", notation: "compact", maximumFractionDigits: 1 }).format(Number(value || 0)); }
    formatDate(value) { return value ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value)) : "Open ended"; }
    shortDate(value) { return value ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" }).format(new Date(value)) : "Open"; }
    formatDateTime(value) { return value ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Current workspace"; }
}
