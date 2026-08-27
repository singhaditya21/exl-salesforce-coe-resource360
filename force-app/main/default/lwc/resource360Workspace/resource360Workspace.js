import { LightningElement, wire } from "lwc";
import { CurrentPageReference, NavigationMixin } from "lightning/navigation";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import getWorkspaceData from "@salesforce/apex/Resource360Service.getWorkspaceData";
import seedDemoData from "@salesforce/apex/Resource360DemoData.seed";
import createStaffingRequestV2 from "@salesforce/apex/Resource360Service.createStaffingRequestV2";
import decideStaffingRequest from "@salesforce/apex/Resource360Service.decideStaffingRequest";
import modifyAllocation from "@salesforce/apex/Resource360Service.modifyAllocation";
import splitAllocation from "@salesforce/apex/Resource360Service.splitAllocation";
import deallocate from "@salesforce/apex/Resource360Service.deallocate";
import decideOverallocation from "@salesforce/apex/Resource360Service.decideOverallocation";
import previewAllocationPlan from "@salesforce/apex/Resource360PlanningService.preview";
import submitBudget from "@salesforce/apex/Resource360Service.submitBudget";
import decideBudget from "@salesforce/apex/Resource360Service.decideBudget";
import createBudgetVersion from "@salesforce/apex/Resource360Service.createBudgetVersion";
import saveBudgetDraft from "@salesforce/apex/Resource360Service.saveBudgetDraft";
import saveBudgetLine from "@salesforce/apex/Resource360Service.saveBudgetLine";
import saveBudgetRosterLine from "@salesforce/apex/Resource360Service.saveBudgetRosterLine";
import previewBudgetRoster from "@salesforce/apex/Resource360BudgetImportService.preview";
import commitBudgetRoster from "@salesforce/apex/Resource360BudgetImportService.commitRoster";
import budgetAssurance from "@salesforce/apex/Resource360AssuranceService.budgetAssurance";
import runWhatIf from "@salesforce/apex/Resource360AssuranceService.whatIf";
import runMockRetention from "@salesforce/apex/Resource360AssuranceService.runMockRetention";
import runDemoActivation from "@salesforce/apex/Resource360AssuranceService.runDemoActivation";
import closeAlert from "@salesforce/apex/Resource360Service.closeAlert";
import previewBulk from "@salesforce/apex/Resource360BulkService.preview";
import commitBulk from "@salesforce/apex/Resource360BulkService.executeBatch";
import previewConfiguration from "@salesforce/apex/Resource360ConfigurationService.preview";
import saveConfigurationDraft from "@salesforce/apex/Resource360ConfigurationService.saveDraft";
import submitConfiguration from "@salesforce/apex/Resource360ConfigurationService.submit";
import decideConfiguration from "@salesforce/apex/Resource360ConfigurationService.decide";
import rollbackConfiguration from "@salesforce/apex/Resource360ConfigurationService.rollback";
import rescheduleOperations from "@salesforce/apex/Resource360ConfigurationService.rescheduleOperations";
import assignConfigurationRelease from "@salesforce/apex/Resource360ConfigurationService.assignRelease";
import previewConfigurationRelease from "@salesforce/apex/Resource360ConfigurationService.previewRelease";
import submitConfigurationRelease from "@salesforce/apex/Resource360ConfigurationService.submitRelease";
import decideConfigurationRelease from "@salesforce/apex/Resource360ConfigurationService.decideRelease";
import submitSkillClaim from "@salesforce/apex/Resource360Service.submitSkillClaim";
import decideSkillClaim from "@salesforce/apex/Resource360Service.decideSkillClaim";
import addCredential from "@salesforce/apex/Resource360Service.addCredential";
import searchCandidates from "@salesforce/apex/Resource360TalentService.searchCandidates";
import createTimesheet from "@salesforce/apex/Resource360Service.createTimesheet";
import saveTimeEntry from "@salesforce/apex/Resource360Service.saveTimeEntry";
import submitTimesheet from "@salesforce/apex/Resource360Service.submitTimesheet";
import decideTimesheet from "@salesforce/apex/Resource360Service.decideTimesheet";
import createTimeCorrection from "@salesforce/apex/Resource360Service.createTimeCorrection";
import { MODULES, SCREENS as RAW_SCREENS } from "./screenCatalog";
import { governedScreens } from "./screenContracts";
import { routeExperienceFor } from "./screenExperiences";
import walkthrough01 from "@salesforce/resourceUrl/Resource360_Walkthrough_01";
import walkthrough02 from "@salesforce/resourceUrl/Resource360_Walkthrough_02";
import walkthrough03 from "@salesforce/resourceUrl/Resource360_Walkthrough_03";
import walkthrough04 from "@salesforce/resourceUrl/Resource360_Walkthrough_04";
import walkthrough05 from "@salesforce/resourceUrl/Resource360_Walkthrough_05";

const SCREENS = governedScreens(RAW_SCREENS);
const HELP_VIDEOS = Object.freeze([
    {
        id: "walkthrough-01", title: "Product overview", duration: "00:16", personas: "Administrator",
        outcome: "All 103 governed screen contracts and the executive command center render.",
        videoUrl: `${walkthrough01}/01-product-overview.mp4`, posterUrl: `${walkthrough01}/01-product-overview.jpg`, captionUrl: `${walkthrough01}/01-product-overview.vtt`
    },
    {
        id: "walkthrough-02", title: "Skills and talent", duration: "00:20", personas: "COE Staffer",
        outcome: "Five candidates rank and the governed Salesforce capability claim is available.",
        videoUrl: `${walkthrough02}/02-skills-and-talent.mp4`, posterUrl: `${walkthrough02}/02-skills-and-talent.jpg`, captionUrl: `${walkthrough02}/02-skills-and-talent.vtt`
    },
    {
        id: "walkthrough-03", title: "Staffing decision", duration: "00:22", personas: "COE Staffer",
        outcome: "The staffing request is accepted with attributable decision evidence.",
        videoUrl: `${walkthrough03}/03-staffing-decision.mp4`, posterUrl: `${walkthrough03}/03-staffing-decision.jpg`, captionUrl: `${walkthrough03}/03-staffing-decision.vtt`
    },
    {
        id: "walkthrough-04", title: "Budget and actuals", duration: "00:46", personas: "Finance / PMO, approvers, practitioner",
        outcome: "Budget approval and the 40-hour timesheet submission and approval complete.",
        videoUrl: `${walkthrough04}/04-budget-and-actuals.mp4`, posterUrl: `${walkthrough04}/04-budget-and-actuals.jpg`, captionUrl: `${walkthrough04}/04-budget-and-actuals.vtt`
    },
    {
        id: "walkthrough-05", title: "Demo activation", duration: "00:26", personas: "Administrator",
        outcome: "The sanitized 5/5 activation gate completes with zero external calls.",
        videoUrl: `${walkthrough05}/05-demo-activation.mp4`, posterUrl: `${walkthrough05}/05-demo-activation.jpg`, captionUrl: `${walkthrough05}/05-demo-activation.vtt`
    }
]);

const RECORD_ACTION = { type: "action", typeAttributes: { rowActions: { fieldName: "rowActions" } } };

export default class Resource360Workspace extends NavigationMixin(LightningElement) {
    selectedModule = "global";
    selectedScreenId = "GLB-02";
    data = {};
    loading = true;
    errorMessage;
    activeRole;
    staffingDraft = { requestedRole: "Salesforce Technical Architect", classification: "Billing", dailyHours: 4, controlReason: "Time-bound delivery control" };
    planningDraft = { mode: "Daily Hours", effort: 4, allowPastOverride: false, overrideReason: "" };
    allocationDraft = { firstDailyHours: 4, secondDailyHours: 4, dailyHours: 4, reason: "Approved effective-dated delivery plan change." };
    budgetDraft = { revenue: 0, upliftPercent: 0, effortContingencyPercent: 0, expenseContingencyPercent: 0, travelRate: 0, onsiteMonths: 0 };
    budgetLineDraft = { phase: "Deliver", workUnit: "Delivery", roleName: "Salesforce Architect", location: "India", plannedHours: 160, costRate: 1, allocationPercent: 100, onsite: false };
    budgetImportDraft = { sourceFileName: "resource360-monthly-roster.json", jsonRows: '[{"employeeId":"EXL-019830","periodStart":"2026-09-01","phase":"Deliver","workUnit":"Delivery","role":"Salesforce Architect","location":"India","plannedHours":160,"costRate":25,"allocationPercent":100,"roleStart":"2026-09-01","roleEnd":"2026-09-30"}]' };
    bulkDraft = { entityType: "Employee", commitMode: "Partial", sourceFileName: "resource360-controlled-import.json", jsonRows: '[{"employeeId":"EXL-DEMO-9001","preferredName":"Demo Practitioner","employmentStart":"2026-01-01","tower":"Delivery","status":"Active","dailyCapacityHours":8}]' };
    configurationDraft = { domain: "Policy", code: "Staffing_Expiry_Hours", displayLabel: "Staffing Expiry Hours", valueType: "Number", numericValue: 72, booleanValue: false, unit: "hours", reason: "Governed policy adjustment for EXL Salesforce COE operations." };
    configurationReleaseKey = "EXL-MOCK-2026-09-R1";
    configurationReleaseSettingId;
    profileResourceId;
    skillDraft = { requestedLevel: "3", yearsExperience: 3, evidence: "Sanitized delivery evidence for manager review." };
    credentialDraft = { issuer: "Salesforce", state: "Unverified" };
    talentDraft = { minimumLevel: "3", requestedRole: "Salesforce Architect", dailyHours: 4, limitSize: 25 };
    scenarioDraft = { name: "EXL Salesforce COE capacity option", headcountDelta: 3, billableAllocationPercent: 75 };
    alertClosureNote = "Reviewed in the EXL sanitized mock baseline; accountable follow-up recorded.";
    timeDraft = { hours: 4, comment: "Allocation-aligned delivery work." };
    timesheetDraft = {};
    talentResults = [];
    planningPreview;
    bulkPreview;
    budgetImportPreview;
    budgetAssuranceResult;
    scenarioResult;
    configurationPreview;
    configurationReleasePreview;
    decisionDraft;
    assistantQuestion = "Which available Salesforce practitioner best fits the next priority request?";
    assistantResponse;
    agentPaused = false;
    recordingMode = false;

    @wire(CurrentPageReference)
    setCurrentPageReference(pageReference) {
        const requested = pageReference?.state?.c__screen;
        this.recordingMode = pageReference?.state?.c__recording === "1";
        if (requested && SCREENS.some((screen) => screen.id === requested)) {
            this.selectedScreenId = requested;
            this.selectedModule = SCREENS.find((screen) => screen.id === requested).module;
        }
    }

    connectedCallback() {
        const start = new Date();
        start.setDate(start.getDate() + 7);
        const end = new Date(start);
        end.setDate(end.getDate() + 90);
        this.staffingDraft = { ...this.staffingDraft, startDate: this.isoDate(start), endDate: this.isoDate(end) };
        this.talentDraft = { ...this.talentDraft, startDate: this.isoDate(start), endDate: this.isoDate(end) };
        this.planningDraft = { ...this.planningDraft, startDate: this.isoDate(start), endDate: this.isoDate(end) };
        this.allocationDraft = { ...this.allocationDraft, startDate: this.isoDate(start), endDate: this.isoDate(end), splitDate: this.isoDate(start), effectiveEndDate: this.isoDate(end) };
        const today = new Date();
        this.timeDraft = { ...this.timeDraft, workDate: this.isoDate(today) };
        const monday = new Date(today);
        monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
        this.timesheetDraft = { weekStart: this.isoDate(monday) };
        this.budgetLineDraft = { ...this.budgetLineDraft, periodStart: `${this.isoDate(today).slice(0, 7)}-01` };
        this.scenarioDraft = { ...this.scenarioDraft, startDate: this.isoDate(today), endDate: this.isoDate(end) };
        this.configurationDraft = { ...this.configurationDraft, effectiveFrom: this.isoDate(today) };
        this.loadData();
    }

    async loadData() {
        this.loading = true;
        this.errorMessage = undefined;
        try {
            this.data = JSON.parse(await getWorkspaceData());
            const roles = this.data.activeRoles || [];
            if (!this.activeRole || !roles.includes(this.activeRole)) this.activeRole = roles[0];
            this.defaultFormSelections();
        } catch (error) {
            this.errorMessage = this.messageFor(error);
        } finally {
            this.loading = false;
        }
    }

    defaultFormSelections() {
        const effortModes = this.data.configuration?.effortModes || [];
        if (effortModes.length && !effortModes.includes(this.planningDraft.mode)) this.planningDraft = { ...this.planningDraft, mode: effortModes[0] };
        const phases = this.data.configuration?.budgetPhases || [];
        const workUnits = this.data.configuration?.workUnits || [];
        const locations = this.data.configuration?.locations || [];
        if (phases.length && !phases.includes(this.budgetLineDraft.phase)) this.budgetLineDraft = { ...this.budgetLineDraft, phase: phases[0] };
        if (workUnits.length && !workUnits.includes(this.budgetLineDraft.workUnit)) this.budgetLineDraft = { ...this.budgetLineDraft, workUnit: workUnits[0] };
        if (locations.length && !locations.includes(this.budgetLineDraft.location)) this.budgetLineDraft = { ...this.budgetLineDraft, location: locations[0] };
        if (!this.staffingDraft.engagementId && this.data.engagements?.length) {
            this.staffingDraft = { ...this.staffingDraft, engagementId: this.data.engagements[0].Id };
        }
        if (!this.staffingDraft.resourceId && this.data.resources?.length) {
            this.staffingDraft = { ...this.staffingDraft, resourceId: this.data.resources[0].Id };
        }
        if (!this.skillDraft.resourceId && this.data.resources?.length) {
            this.skillDraft = { ...this.skillDraft, resourceId: this.data.resources[0].Id };
        }
        if (!this.skillDraft.capabilityId && this.data.capabilities?.length) {
            this.skillDraft = { ...this.skillDraft, capabilityId: this.data.capabilities[0].Id };
        }
        if (!this.staffingDraft.responsibleOwnerId && this.data.user?.Id) this.staffingDraft = { ...this.staffingDraft, responsibleOwnerId: this.data.user.Id };
        if (!this.credentialDraft.resourceId && this.data.resources?.length) this.credentialDraft = { ...this.credentialDraft, resourceId: this.data.resources[0].Id };
        if (!this.talentDraft.capabilityId && this.data.capabilities?.length) this.talentDraft = { ...this.talentDraft, capabilityId: this.data.capabilities[0].Id };
        if (!this.timeDraft.timesheetId && this.data.timesheets?.length) this.timeDraft = { ...this.timeDraft, timesheetId: this.data.timesheets[0].Id };
        if (!this.timeDraft.allocationId && this.data.allocations?.length) this.timeDraft = { ...this.timeDraft, allocationId: this.data.allocations[0].Id };
        if (!this.timesheetDraft.resourceId && this.data.resources?.length) this.timesheetDraft = { ...this.timesheetDraft, resourceId: this.data.resources[0].Id };
        if (!this.planningDraft.resourceId && this.data.resources?.length) this.planningDraft = { ...this.planningDraft, resourceId: this.data.resources[0].Id };
        if (!this.profileResourceId && this.data.resources?.length) this.profileResourceId = this.data.resources[0].Id;
        if (!this.allocationDraft.allocationId && this.data.allocations?.length) this.selectAllocation(this.data.allocations.find((item) => item.State__c === "Accepted" && item.Current__c));
        if (!this.budgetDraft.budgetId && this.data.budgets?.length) this.selectBudget(this.data.budgets.find((item) => ["Draft", "Rejected", "Invalidated"].includes(item.State__c)) || this.data.budgets[0]);
        if (!this.configurationReleaseSettingId && this.configurationReleaseSettingOptions.length) this.configurationReleaseSettingId = this.configurationReleaseSettingOptions[0].value;
    }

    get modules() {
        return MODULES.map((module) => ({
            ...module,
            count: this.authorizedScreens.filter((screen) => screen.module === module.id).length,
            buttonClass: `module-button ${module.id === this.selectedModule ? "module-button_active" : ""}`
        })).filter((module) => module.count > 0);
    }

    get authorizedScreens() {
        if (!this.activeRole) return [];
        return SCREENS.filter((screen) => this.activeRole === "Administrator" || screen.allowedRoles.includes(this.activeRole));
    }

    get moduleScreens() {
        return this.authorizedScreens.filter((screen) => screen.module === this.selectedModule).map((screen) => ({
            ...screen,
            buttonClass: `screen-button ${screen.id === this.selectedScreenId ? "screen-button_active" : ""}`
        }));
    }

    get selectedScreen() {
        return SCREENS.find((screen) => screen.id === this.selectedScreenId) || SCREENS[0];
    }

    get isAuthorized() {
        return this.activeRole === "Administrator" || this.selectedScreen.allowedRoles.includes(this.activeRole);
    }

    get stateVariants() { return this.selectedScreen.states.map((label) => ({ label, key: `${this.selectedScreen.id}-${label}` })); }

    get screenCountLabel() {
        return `${SCREENS.length} governed screens`;
    }

    get generatedLabel() {
        return this.data.generatedAt ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(this.data.generatedAt)) : "Not loaded";
    }

    get signedInUserName() {
        return this.recordingMode ? "Demo User" : (this.data.user?.Name || "Loading identity");
    }

    get signedInUserId() {
        return this.recordingMode ? "" : (this.data.user?.Id || "");
    }

    get summaryCards() {
        const metrics = this.data.metrics || {};
        const targets = metrics.targets || {};
        return [
            { label: "Full-allocation coverage", value: `${metrics.fullAllocationCoveragePercent ?? 0}%`, note: `${metrics.activeHeadcount ?? 0} active · target ${targets.fullAllocationCoveragePercent ?? 100}% at ≥8h` },
            { label: "Exactly at 8 hours", value: `${metrics.balancedCapacityPercent ?? 0}%`, note: `${metrics.fullyAllocatedResources ?? 0} balanced resources` },
            { label: "Controlled over-allocation", value: `${metrics.overallocatedResources ?? 0}`, note: `${metrics.totalOverageHours ?? 0} overage hours · ${metrics.pendingOverallocationPlans ?? 0} pending` },
            { label: "Capacity guardrails", value: (metrics.hardCeilingBreaches || metrics.unapprovedOverallocatedResources || metrics.actualTimeBreaches) ? "Exception" : "All clear", note: `>12h ${metrics.hardCeilingBreaches ?? 0} · unapproved ${metrics.unapprovedOverallocatedResources ?? 0} · actuals >8h ${metrics.actualTimeBreaches ?? 0}` },
            { label: "Approved revenue", value: this.money(metrics.approvedRevenue || 0), note: `${metrics.approvedMarginPercent ?? 0}% weighted gross margin` },
            { label: "Billable mix", value: `${metrics.billingMixPercent ?? 0}%`, note: `WAR ${metrics.warPercent ?? 0}% · IFB ${metrics.ifbPercent ?? 0}%` }
        ];
    }

    get businessRoleOptions() {
        return (this.data.activeRoles || []).map((value) => ({ label: value, value }));
    }

    get deliveryRoleOptions() {
        return (this.data.deliveryRoles || []).map((item) => ({ label: `${item.label} · ${item.tower}`, value: item.label }));
    }

    get engagementOptions() {
        return (this.data.engagements || []).map((item) => ({ label: `${item.Name} · ${item.Engagement_ID__c}`, value: item.Id }));
    }

    get resourceOptions() {
        return (this.data.resources || []).map((item) => ({ label: `${item.Preferred_Name__c} · ${item.Primary_Role__c || item.Tower__c}`, value: item.Id }));
    }

    get userOptions() { return this.data.user?.Id ? [{ label: this.data.user.Name, value: this.data.user.Id }] : []; }

    get capabilityOptions() {
        return (this.data.capabilities || []).filter((item) => item.Active__c).map((item) => ({ label: `${item.Name} · ${item.Tower__c || item.Type__c}`, value: item.Id }));
    }

    get timesheetOptions() { return (this.data.timesheets || []).map((item) => ({ label: `${item.Name} · ${item.Resource__r?.Preferred_Name__c} · ${item.Week_Start__c}`, value: item.Id })); }
    get allocationOptions() { return (this.data.allocations || []).filter((item) => item.State__c === "Accepted" && item.Current__c).map((item) => ({ label: `${item.Resource__r?.Preferred_Name__c} · ${item.Engagement__r?.Name} · ${item.Role__c}`, value: item.Id })); }
    get budgetOptions() { return (this.data.budgets || []).map((item) => ({ label: `${item.Name} · ${item.Engagement__r?.Name} · ${item.State__c}`, value: item.Id })); }

    get classificationOptions() {
        return (this.data.classifications || []).map((value) => ({ label: value, value }));
    }

    get levelOptions() {
        return [
            { label: "1 · Beginner", value: "1" }, { label: "2 · Intermediate", value: "2" },
            { label: "3 · Advanced", value: "3" }, { label: "4 · SME", value: "4" }
        ];
    }

    get effortModeOptions() { return (this.data.configuration?.effortModes || ["Daily Hours", "Allocation Percent", "Total Hours"]).map((value) => ({ label: value, value })); }
    get budgetPhaseOptions() { return (this.data.configuration?.budgetPhases || ["Discover","Design","Build","Test","Deploy","Deliver"]).map((value)=>({label:value,value})); }
    get workUnitOptions() { return (this.data.configuration?.workUnits || ["Architecture","Delivery"]).map((value)=>({label:value,value})); }
    get locationOptions() { return (this.data.configuration?.locations || ["India"]).map((value)=>({label:value,value})); }

    get showStaffingForm() { return this.selectedScreenId === "STFUI-01"; }
    get showPlanningPreview() { return ["STFUI-05", "STFUI-10", "STFUI-11", "STFUI-12"].includes(this.selectedScreenId); }
    get showModifyAllocation() { return this.selectedScreenId === "STFUI-15"; }
    get showSplitAllocation() { return this.selectedScreenId === "STFUI-16"; }
    get showDeallocate() { return this.selectedScreenId === "STFUI-17"; }
    get showBudgetEditor() { return this.selectedScreenId === "BUDUI-02"; }
    get showBudgetLineEditor() { return ["BUDUI-03", "BUDUI-04"].includes(this.selectedScreenId); }
    get showBudgetLines() { return ["BUDUI-03", "BUDUI-04", "BUDUI-05", "BUDUI-06", "BUDUI-07"].includes(this.selectedScreenId); }
    get showBudgetImport() { return this.selectedScreenId === "BUDUI-11"; }
    get showBulkOperations() { return this.selectedScreenId === "ADMUI-08"; }
    get showConfigurationConsole() { return ["ADMUI-04","ADMUI-06","ADMUI-07"].includes(this.selectedScreenId); }
    get showPractitionerProfile() { return ["SKLUI-01","SKLUI-05","SKLUI-06","SKLUI-07","SKLUI-08","SKLUI-09"].includes(this.selectedScreenId); }
    get showTalentSearch() { return ["STFUI-02", "STFUI-03", "STFUI-06", "STFUI-07", "SKLUI-16", "SKLUI-17"].includes(this.selectedScreenId); }
    get showSkillsForm() { return this.selectedScreenId === "SKLUI-10"; }
    get showCredentialForm() { return this.selectedScreenId === "SKLUI-11"; }
    get showTimesheetCreate() { return this.selectedScreenId === "TIMEUI-01"; }
    get showTimeEntryForm() { return this.selectedScreenId === "TIMEUI-02"; }
    get showTimeExceptions() { return this.selectedScreenId === "TIMEUI-08"; }
    get showPersonaAssurance() { return ["ADMUI-02", "ADMUI-03"].includes(this.selectedScreenId); }
    get showSourceAssurance() { return ["ADMUI-07", "CMD-08"].includes(this.selectedScreenId); }
    get showRetentionAssurance() { return this.selectedScreenId === "ADMUI-07"; }
    get showDemoActivation() { return this.selectedScreenId === "ADMUI-01"; }
    get showKpiHierarchy() { return ["CMD-01", "CMD-02", "CMD-04", "CMD-07"].includes(this.selectedScreenId); }
    get showCapacityControl() { return ["STFUI-05","STFUI-10","STFUI-12","SKLUI-05","CMD-01","CMD-02","CMD-04","CMD-07"].includes(this.selectedScreenId); }
    get showScenarioPlanner() { return this.selectedScreenId === "AIUI-03"; }
    get showGlobalMasterExperience() { return ["GLB-01","GLB-02","GLB-03","GLB-04","GLB-05","GLB-06"].includes(this.selectedScreenId); }
    get showEngagementMasterExperience() { return ["ENG-01","ENG-02","ENG-03","ENG-04","ENG-05","ENG-06","ENG-07","ENG-08"].includes(this.selectedScreenId); }
    get showDomainMasterExperience() { return /^(STFUI|SKLUI|BUDUI|TIMEUI|CMD|ADMUI|AIUI)-/.test(this.selectedScreenId); }
    get showMasterExperience() { return this.showGlobalMasterExperience || this.showEngagementMasterExperience; }
    get showStandardExperience() { return !this.showMasterExperience; }
    get showStandardShell() { return this.showStandardExperience && !this.showDomainMasterExperience; }
    get showAlertLifecycle() { return false; }
    get showHelpCenter() { return false; }
    get helpVideos() { return HELP_VIDEOS; }
    get routeExperience() {
        const configured = routeExperienceFor(this.selectedScreenId);
        if (!configured) return undefined;
        return {
            ...configured,
            eyebrow: `${this.selectedScreenId} · ${configured.visual}`,
            heading: configured.focus,
            primaryLabel: this.selectedScreen.primary,
            panelClass: `route-workbench route-workbench_${configured.visual}`
        };
    }
    get showRouteWorkbench() { return this.showStandardExperience && Boolean(this.routeExperience); }
    get showDefaultRecords() { return this.showStandardExperience && !this.showRouteWorkbench; }
    get routeSteps() {
        const experience = this.routeExperience;
        if (!experience) return [];
        return [
            { id: `${this.selectedScreenId}-scope`, number: "1", label: "Authorize and scope", detail: this.selectedScreen.validations },
            { id: `${this.selectedScreenId}-work`, number: "2", label: experience.focus, detail: experience.evidence },
            { id: `${this.selectedScreenId}-evidence`, number: "3", label: this.selectedScreen.primary, detail: `Complete through ${this.selectedScreen.api}; retain ${this.selectedScreen.events}.` }
        ];
    }
    get routeFacts() {
        const rows = this.routeRows;
        const actionable = rows.filter((row) => ["Pending","Pending Approval","Submitted","Open","Stale","Failed","Draft","Rejected"].includes(row.status)).length;
        return [
            { id: `${this.selectedScreenId}-records`, label: "Visible records", value: rows.length, detail: "Salesforce user-mode scope" },
            { id: `${this.selectedScreenId}-actionable`, label: "Actionable now", value: actionable, detail: this.routeExperience?.filter || "all" },
            { id: `${this.selectedScreenId}-role`, label: "Acting role", value: this.activeRole || "Unassigned", detail: "Effective certified role" },
            { id: `${this.selectedScreenId}-source`, label: "Evidence mode", value: this.routeExperience?.visual || "view", detail: "Live Salesforce + sanitized mock" }
        ];
    }
    get routeRows() {
        const experience = this.routeExperience;
        if (!experience) return [];
        const records = this.routeRecords(experience.dataset);
        return this.filterRouteRecords(records, experience.filter).map((item, index) => this.routeRow(experience.dataset, item, index));
    }
    get hasRouteRows() { return this.routeRows.length > 0; }
    get routeColumns() {
        const dataset = this.routeExperience?.dataset;
        const first = ["identity","summary","classifications","help"].includes(dataset)
            ? { label: this.routeFirstColumnLabel, fieldName: "primary" }
            : this.linkColumn(this.routeFirstColumnLabel, "primary");
        return [first,{label:"Context",fieldName:"secondary",wrapText:true},{label:"State",fieldName:"status"},{label:"Evidence",fieldName:"detail",wrapText:true},{label:"As of",fieldName:"date",type:"date"}];
    }
    get routeFirstColumnLabel() {
        return {identity:"Persona",summary:"Metric",search:"Result",roleScopes:"User / scope",help:"Walkthrough",engagements:"Engagement",commercialReferences:"Commercial reference",allocations:"Allocation",budgets:"Budget",timesheets:"Timesheet",workUnits:"Work unit",notifications:"Risk / notification",resources:"Practitioner",classifications:"Classification",staffingRequests:"Staffing request",integrationRuns:"Integration run",integrationErrors:"Row error",capabilities:"Capability",skillClaims:"Capability claim",configurationCatalog:"Configuration",timeEntries:"Time entry",approvalDecisions:"Approval decision",auditEvents:"Audit event",calendars:"Calendar / exception",recommendations:"Recommendation",agentOperations:"Agent control"}[this.routeExperience?.dataset] || "Record";
    }
    get routePrimaryIsExport() { return this.routeExperience?.operation === "export"; }
    get routePrimaryIsButton() { return !this.routePrimaryIsExport; }
    get routePrimaryDisabled() {
        return ["staffingDecision","skillDecision","budgetSubmit","budgetDecision","timesheetSubmit","timesheetDecision","timesheetCorrection"].includes(this.routeExperience?.operation) && !this.hasRouteRows;
    }
    get routeExportUrl() {
        const header=["Record","Context","State","Evidence","As of"];
        const rows=this.routeRows.map((row)=>[row.primary,row.secondary,row.status,row.detail,row.date]);
        const csv=[header,...rows].map((row)=>row.map((value)=>this.csvCell(value)).join(",")).join("\r\n");
        return `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
    }
    get routeExportName() { return `${this.selectedScreenId.toLowerCase()}-resource360.csv`; }
    get showAssistantControls() { return this.routeExperience?.operation === "assistant"; }
    get showAgentControls() { return this.routeExperience?.operation === "agentToggle"; }
    get hasAssistantResponse() { return Boolean(this.assistantResponse); }
    get agentStateLabel() { return this.agentPaused ? "Paused — human review only" : "Active mock — read-only recommendations"; }
    get agentButtonLabel() { return this.agentPaused ? "Resume mock agent" : "Pause mock agent"; }
    get hasTalentResults() { return this.talentResults.length > 0; }
    get hasPlanningPreview() { return Boolean(this.planningPreview); }
    get planningDays() { return (this.planningPreview?.days || []).map((day) => ({ ...day, id: day.workDate, status: day.capacityStatus || (!day.workingDay ? "Non-working" : day.conflict ? "Ceiling breach" : day.requiresApproval ? "Approval required" : "Available") })); }
    get planningStatus() { return !this.planningPreview?.allowed ? "Blocked above 12 hours" : this.planningPreview?.requiresApproval ? "Draft · approval required" : this.planningPreview?.capacityStatus || "Valid capacity plan"; }
    get planningColumns() { return [{ label: "Date", fieldName: "workDate", type: "date" }, { label: "Capacity state", fieldName: "status" }, { label: "Standard", fieldName: "capacityHours", type: "number" }, { label: "Accepted", fieldName: "acceptedHours", type: "number" }, { label: "Pending", fieldName: "pendingHours", type: "number" }, { label: "Proposed line", fieldName: "requestedHours", type: "number" }, { label: "Projected", fieldName: "projectedHours", type: "number" }, { label: "Overage", fieldName: "overageHours", type: "number" }, { label: "Remaining to 8h", fieldName: "remainingHours", type: "number" }, { label: "Accepted context", fieldName: "acceptedContext", wrapText: true }]; }
    get capacityHeatRows() { return (this.data.dailyCapacityLedger || []).map((row)=>({...row,id:row.Id,name:row.Resource__r?.Preferred_Name__c||row.Name,className:`capacity-cell capacity-cell_${(row.Capacity_Status__c||"Bench").toLowerCase().replaceAll(" ","-")}`,utilizationLabel:`${row.Utilization_Percent__c||0}%`,approvalLabel:row.Capacity_Status__c==="Overallocated"?(row.Approved_Overallocated__c?"Approved exception":"Approval missing"):`${row.Allocation_Count__c||0} allocation line(s)`})); }
    get hasCapacityRows() { return this.capacityHeatRows.length > 0; }
    get capacityExceptionRows() { return (this.data.allocations || []).filter((row)=>row.Planning_Status__c==="Pending Approval"||row.Overallocated__c).map((row)=>({...row,resourceName:row.Resource__r?.Preferred_Name__c,projectName:row.Engagement__r?.Name,approverName:row.Overallocation_Approved_By__r?.Name||"—",rowActions:row.Planning_Status__c==="Pending Approval"&&this.canApproveOverallocation?[{label:"Approve controlled exception",name:"approveOverallocation"},{label:"Reject exception",name:"rejectOverallocation"},{label:"Open record",name:"view"}]:[{label:"Open record",name:"view"}]})); }
    get hasCapacityExceptions() { return this.capacityExceptionRows.length > 0; }
    get capacityExceptionColumns() { return [{label:"Resource",fieldName:"resourceName"},{label:"Project",fieldName:"projectName"},{label:"Line hours",fieldName:"Daily_Hours__c",type:"number"},{label:"Projected daily",fieldName:"Projected_Daily_Hours__c",type:"number"},{label:"Planning",fieldName:"Planning_Status__c"},{label:"Approval",fieldName:"Overallocation_Status__c"},{label:"Reason",fieldName:"Overallocation_Reason__c",wrapText:true},{label:"Approver",fieldName:"approverName"},{label:"Review expiry",fieldName:"Overallocation_Expiry_Date__c",type:"date"},{type:"action",typeAttributes:{rowActions:{fieldName:"rowActions"}}}]; }
    get canApproveOverallocation() { return Boolean(this.data.configurationCapabilities?.approveOverallocation); }
    get budgetLineRows() { return (this.data.budgetLines || []).filter((line) => !this.budgetDraft.budgetId || line.Budget__c === this.budgetDraft.budgetId).map((line) => ({ ...line, resourceName: line.Resource__r?.Preferred_Name__c || "Role placeholder", allocationFraction: (line.Allocation_Percent__c || 0) / 100 })); }
    get hasBudgetLines() { return this.budgetLineRows.length > 0; }
    get budgetLineColumns() { return [{ label: "Period", fieldName: "Period_Start__c", type: "date" }, { label: "Practitioner", fieldName: "resourceName" }, { label: "Role start", fieldName: "Role_Start__c", type: "date" }, { label: "Role end", fieldName: "Role_End__c", type: "date" }, { label: "Phase", fieldName: "Phase__c" }, { label: "Work unit", fieldName: "Work_Unit__c" }, { label: "Role", fieldName: "Role__c" }, { label: "Location", fieldName: "Location__c" }, { label: "Hours", fieldName: "Planned_Hours__c", type: "number" }, { label: "Rate", fieldName: "Cost_Rate__c", type: "currency" }, { label: "Cost", fieldName: "Planned_Cost__c", type: "currency" }, { label: "Allocation", fieldName: "allocationFraction", type: "percent" }]; }
    get budgetIsEditable() { const budget=(this.data.budgets||[]).find((item)=>item.Id===this.budgetDraft.budgetId);return Boolean(budget&&budget.Current__c&&["Draft","Rejected","Invalidated"].includes(budget.State__c)); }
    get budgetFieldsDisabled() { return !this.budgetIsEditable; }
    get bulkEntityOptions() { return ["Employee","Engagement","Capability","Credential","LearningAchievement","CommercialReference","OrgUnit","Portfolio"].map((value)=>({label:value.replace(/([a-z])([A-Z])/g,"$1 $2"),value})); }
    get bulkModeOptions() { return [{label:"Atomic — all rows or none",value:"Atomic"},{label:"Partial — valid rows only",value:"Partial"}]; }
    get hasBulkPreview() { return Boolean(this.bulkPreview); }
    get bulkMaxRows() { return this.data.configuration?.bulkMaxRows || 200; }
    get bulkPreviewRows() { return this.bulkPreview?.rows || []; }
    get bulkPreviewColumns() { return [{label:"Row",fieldName:"rowNumber",type:"number"},{label:"External ID",fieldName:"externalId"},{label:"Valid",fieldName:"valid",type:"boolean"},{label:"Outcome",fieldName:"message",wrapText:true}]; }
    get bulkRunRows() { return this.data.integrationRuns || []; }
    get hasBulkRuns() { return this.bulkRunRows.length > 0; }
    get bulkRunColumns() { return [{label:"Run ID",fieldName:"Run_ID__c"},{label:"Entity",fieldName:"Entity_Type__c"},{label:"State",fieldName:"State__c"},{label:"Mode",fieldName:"Commit_Mode__c"},{label:"Contract",fieldName:"Contract_Version__c"},{label:"Inserted",fieldName:"Inserted_Count__c",type:"number"},{label:"Updated",fieldName:"Updated_Count__c",type:"number"},{label:"Collisions",fieldName:"Collision_Count__c",type:"number"},{label:"Complete %",fieldName:"Completeness_Percent__c",type:"number"},{label:"Freshness",fieldName:"Freshness_State__c"},{label:"Failed",fieldName:"Failure_Count__c",type:"number"},{label:"Started",fieldName:"Started_At__c",type:"date"}]; }
    get hasBudgetImportPreview() { return Boolean(this.budgetImportPreview); }
    get budgetImportRows() { return this.budgetImportPreview?.rows || []; }
    get budgetImportColumns() { return [{label:"Row",fieldName:"rowNumber",type:"number"},{label:"Employee ID",fieldName:"employeeId"},{label:"Valid",fieldName:"valid",type:"boolean"},{label:"Exact outcome",fieldName:"message",wrapText:true}]; }
    get hasBudgetImportErrors() { return Boolean(this.budgetImportPreview?.errorCsv); }
    get budgetImportErrorUrl() { return `data:text/csv;charset=utf-8,${encodeURIComponent(this.budgetImportPreview?.errorCsv || "")}`; }
    get hasBudgetAssurance() { return Boolean(this.budgetAssuranceResult); }
    get budgetAssuranceMonthlyRows() { return (this.budgetAssuranceResult?.monthlyGrid || []).map((row,index)=>({...row,id:`month-${index}`})); }
    get budgetAssuranceRosterRows() { return (this.budgetAssuranceResult?.rosterAssurance || []).map((row)=>({...row,windowReady:Boolean(row.roleWindowCoversMonth)})); }
    get budgetAssuranceMonthlyColumns() { return [{label:"Month",fieldName:"period",type:"date"},{label:"Plan hours",fieldName:"plannedHours",type:"number"},{label:"Actual hours",fieldName:"actualHours",type:"number"},{label:"Variance",fieldName:"varianceHours",type:"number"},{label:"Plan cost",fieldName:"plannedCost",type:"currency"},{label:"As-of state",fieldName:"asOfState"}]; }
    get budgetAssuranceRosterColumns() { return [{label:"Practitioner",fieldName:"resource"},{label:"Role",fieldName:"role"},{label:"Month",fieldName:"period",type:"date"},{label:"Planned",fieldName:"plannedHours",type:"number"},{label:"160h allocation standard",fieldName:"standardHoursAtAllocation",type:"number"},{label:"Variance",fieldName:"varianceFromStandardHours",type:"number"},{label:"Role window valid",fieldName:"windowReady",type:"boolean"},{label:"State",fieldName:"state"}]; }
    get personaRows() { return (this.data.assurance?.personas || []).map((row,index)=>({...row,id:row.id||`persona-${index}`,delegationLabel:row.delegationAllowed?"Effective-dated":"Not permitted"})); }
    get hasPersonas() { return this.personaRows.length > 0; }
    get personaColumns() { return [{label:"Business role",fieldName:"businessRole"},{label:"Salesforce assignment",fieldName:"permissionSetGroup"},{label:"Entra group alias",fieldName:"entraGroupAlias"},{label:"Scope",fieldName:"scopeType"},{label:"Decision authority",fieldName:"decisionAuthority",wrapText:true},{label:"SoD class",fieldName:"segregationClass"},{label:"Delegation",fieldName:"delegationLabel"},{label:"Control owner",fieldName:"controlOwner"},{label:"Status",fieldName:"approvalStatus"}]; }
    get sourceContractRows() { return (this.data.assurance?.sourceContracts || []).map((row,index)=>({...row,id:row.id||`source-${index}`,blockingLabel:row.blocking?"Fail closed":"Advisory"})); }
    get hasSourceContracts() { return this.sourceContractRows.length > 0; }
    get sourceContractColumns() { return [{label:"Mock source",fieldName:"source"},{label:"Entity",fieldName:"entity"},{label:"Stable identity",fieldName:"identity",wrapText:true},{label:"Canonical fields",fieldName:"canonicalFields",wrapText:true},{label:"Owner",fieldName:"owner"},{label:"Direction",fieldName:"direction"},{label:"Gate",fieldName:"blockingLabel"},{label:"Cadence (h)",fieldName:"expectedCadenceHours",type:"number"},{label:"Latest state",fieldName:"latestState"},{label:"Freshness",fieldName:"freshness"},{label:"Complete %",fieldName:"completenessPercent",type:"number"},{label:"Collisions",fieldName:"collisions",type:"number"},{label:"Contract",fieldName:"contractVersion"},{label:"Status",fieldName:"approvalStatus"}]; }
    get retentionRows() { return (this.data.assurance?.retention?.rules || []).map((row,index)=>({...row,id:row.id||`retention-${index}`,legalHoldLabel:row.legalHoldEligible?"Eligible":"Not applicable"})); }
    get hasRetentionRules() { return this.retentionRows.length > 0; }
    get retentionColumns() { return [{label:"Record category",fieldName:"category"},{label:"Retention days",fieldName:"retentionDays",type:"number"},{label:"Disposition contract",fieldName:"dispositionAction",wrapText:true},{label:"Recovery days",fieldName:"recoveryWindowDays",type:"number"},{label:"Legal hold",fieldName:"legalHoldLabel"},{label:"Control owner",fieldName:"controlOwner"},{label:"Status",fieldName:"approvalStatus"},{label:"Evidence",fieldName:"evidenceReference",wrapText:true}]; }
    get activationRows() { return (this.data.assurance?.activation?.pillars || []).map((row,index)=>({...row,id:row.id||`activation-${index}`})); }
    get hasActivationRows() { return this.activationRows.length > 0; }
    get activationColumns() { return [{label:"Simulation",fieldName:"label"},{label:"Mock owner",fieldName:"owner"},{label:"Control exercised",fieldName:"simulation",wrapText:true},{label:"Evidence",fieldName:"evidence",wrapText:true},{label:"State",fieldName:"state"}]; }
    get activationApprovalRows() { return this.data.assurance?.activation?.approvalEvidence || []; }
    get hasActivationApprovalRows() { return this.activationApprovalRows.length > 0; }
    get activationApprovalColumns() { return [{label:"Decision",fieldName:"decision"},{label:"Mock owner",fieldName:"owner"},{label:"Evidence reference",fieldName:"evidenceReference"},{label:"Decision date",fieldName:"decidedOn"},{label:"Status",fieldName:"status"}]; }
    get demoActivationDisabled() { return !this.data.assuranceCapabilities?.operate; }
    get timeExceptionRows() { return (this.data.assurance?.timeExceptions || []).map((row)=>({...row,reasonsText:(row.reasons || []).join(" · ")})); }
    get hasTimeExceptions() { return this.timeExceptionRows.length > 0; }
    get timeExceptionColumns() { return [{label:"Timesheet",fieldName:"timesheet"},{label:"Practitioner",fieldName:"resource"},{label:"Week",fieldName:"weekStart",type:"date"},{label:"Status",fieldName:"status"},{label:"Exception and accountable route",fieldName:"reasonsText",wrapText:true}]; }
    get hierarchyRows() { return (this.data.assurance?.hierarchy || []).map((row,index)=>({...row,id:`hierarchy-${index}`,billingMixFraction:(row.billingMixPercent || 0)/100})); }
    get hasHierarchyRows() { return this.hierarchyRows.length > 0; }
    get hierarchyColumns() { return [{label:"Portfolio / Salesforce tower",fieldName:"path"},{label:"Daily capacity",fieldName:"totalDailyHours",type:"number"},{label:"Billable",fieldName:"billableDailyHours",type:"number"},{label:"WAR",fieldName:"warDailyHours",type:"number"},{label:"Billing mix",fieldName:"billingMixFraction",type:"percent"}]; }
    get bulkErrorRows() { return (this.data.integrationErrors || []).map((row)=>({...row,runId:row.Integration_Run__r?.Run_ID__c})); }
    get hasBulkErrors() { return this.bulkErrorRows.length > 0; }
    get hasDownloadableBulkErrors() { return this.bulkPreviewRows.some((row)=>!row.valid)||this.hasBulkErrors; }
    get bulkErrorDownloadUrl() {
        const rows=[
            ...this.bulkPreviewRows.filter((row)=>!row.valid).map((row)=>["Pre-validation",row.rowNumber,row.externalId,"VALIDATION",row.message,"Blocked"]),
            ...this.bulkErrorRows.map((row)=>[row.runId,row.Row_Number__c,row.External_Record_ID__c,row.Error_Code__c,row.Error_Message__c,row.State__c])
        ];
        const csv=[["Run","Row","External ID","Code","Exact error","State"],...rows].map((row)=>row.map((value)=>this.csvCell(value)).join(",")).join("\r\n");
        return `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
    }
    get bulkErrorColumns() { return [{label:"Run",fieldName:"runId"},{label:"Row",fieldName:"Row_Number__c",type:"number"},{label:"External ID",fieldName:"External_Record_ID__c"},{label:"Code",fieldName:"Error_Code__c"},{label:"Exact error",fieldName:"Error_Message__c",wrapText:true},{label:"State",fieldName:"State__c"}]; }
    get configurationDomainOptions() { return ["Policy","Delivery Role","Classification","General LOV","Approval","Escalation","Notification","Integration","KPI"].map((value)=>({label:value,value})); }
    get configurationTypeOptions() { return ["Number","Text","Boolean","JSON"].map((value)=>({label:value,value})); }
    get canManageConfiguration() { return Boolean(this.data.configurationCapabilities?.manage); }
    get canApproveConfiguration() { return Boolean(this.data.configurationCapabilities?.approve); }
    get configurationIsNumber() { return this.configurationDraft.valueType === "Number"; }
    get configurationIsText() { return this.configurationDraft.valueType === "Text"; }
    get configurationIsBoolean() { return this.configurationDraft.valueType === "Boolean"; }
    get configurationRows() { return (this.data.configurationCatalog||[]).map((row)=>({...row,rowActions:this.configurationActions(row)})); }
    get hasConfigurationRows() { return this.configurationRows.length>0; }
    get hasConfigurationPreview() { return Boolean(this.configurationPreview); }
    get configurationPreviewDecision() { return this.configurationPreview?.valid ? "Ready to save" : "Blocked"; }
    get configurationPreviewClass() { return `preview-summary preview-summary_four ${this.configurationPreview?.valid ? "configuration-preview_valid" : "configuration-preview_invalid"}`; }
    get configurationPreviewErrors() { return (this.configurationPreview?.errors||[]).join(" · "); }
    get configurationPreviewWarnings() { return (this.configurationPreview?.warnings||[]).join(" · "); }
    get hasConfigurationErrors() { return Boolean(this.configurationPreview?.errors?.length); }
    get hasConfigurationWarnings() { return Boolean(this.configurationPreview?.warnings?.length); }
    get configurationColumns() { return [{label:"Source",fieldName:"source"},{label:"Domain",fieldName:"domain"},{label:"Code",fieldName:"code"},{label:"Label",fieldName:"label"},{label:"Value",fieldName:"value",wrapText:true},{label:"State",fieldName:"state"},{label:"Release",fieldName:"releaseKey"},{label:"Version",fieldName:"version",type:"number"},{label:"Effective",fieldName:"effectiveFrom",type:"date"},{label:"Impact",fieldName:"impact",wrapText:true},{type:"action",typeAttributes:{rowActions:{fieldName:"rowActions"}}}]; }
    get configurationReleaseSettingOptions() { return this.configurationRows.filter((row)=>row.id&&["Draft","Rejected"].includes(row.state)).map((row)=>({label:`${row.key} v${row.version} · ${row.state}`,value:row.id})); }
    get hasConfigurationReleaseCandidates() { return this.configurationReleaseSettingOptions.length > 0; }
    get configurationReleaseAssignmentDisabled() { return !this.configurationReleaseSettingId; }
    get hasConfigurationReleasePreview() { return Boolean(this.configurationReleasePreview); }
    get configurationReleaseItems() { return this.configurationReleasePreview?.items || []; }
    get configurationReleaseColumns() { return [{label:"Key",fieldName:"key"},{label:"Current",fieldName:"currentValue"},{label:"Proposed",fieldName:"normalizedValue"},{label:"Valid",fieldName:"valid",type:"boolean"},{label:"Impact",fieldName:"impact",wrapText:true},{label:"Validation",fieldName:"validation",wrapText:true}]; }
    get configurationReleaseErrors() { return (this.configurationReleasePreview?.errors || []).join(" · "); }
    get configurationReleaseWarnings() { return (this.configurationReleasePreview?.warnings || []).join(" · "); }
    get hasConfigurationReleaseErrors() { return Boolean(this.configurationReleasePreview?.errors?.length); }
    get hasConfigurationReleaseWarnings() { return Boolean(this.configurationReleasePreview?.warnings?.length); }
    get selectedProfile() { return (this.data.resources||[]).find((resource)=>resource.Id===this.profileResourceId); }
    get profileFacts() { const item=this.selectedProfile;if(!item)return [];const unavailable="Unavailable from EXL source";return [{label:"Employee ID",value:item.Employee_ID__c||unavailable},{label:"Primary Salesforce role",value:item.Primary_Role__c||unavailable},{label:"Tower",value:item.Tower__c||unavailable},{label:"Grade",value:item.Grade__c||unavailable},{label:"Location",value:item.Location__c||unavailable},{label:"Time zone",value:item.Time_Zone__c||item.Work_Calendar__r?.Time_Zone__c||unavailable},{label:"Manager",value:item.Manager__r?.Preferred_Name__c||unavailable},{label:"Organization",value:item.Org_Unit_ID__c||unavailable},{label:"Work email",value:item.Work_Email__c||unavailable},{label:"Source freshness",value:item.Source_Last_Sync__c||unavailable}]; }
    get profileClaimRows() { return (this.data.skillClaims||[]).filter((row)=>row.Resource__c===this.profileResourceId).map((row)=>({...row,type:row.Capability__r?.Type__c,capability:row.Capability__r?.Name,reviewer:row.Reviewer__r?.Name,source:"Practitioner claim + manager decision"})); }
    get hasProfileClaims() { return this.profileClaimRows.length>0; }
    get profileClaimColumns() { return [{label:"Capability",fieldName:"capability"},{label:"Type",fieldName:"type"},{label:"Claimed",fieldName:"Requested_Level__c",type:"number"},{label:"Approved",fieldName:"Approved_Level__c",type:"number"},{label:"Experience",fieldName:"Years_Experience__c",type:"number"},{label:"State",fieldName:"State__c"},{label:"Reviewer",fieldName:"reviewer"},{label:"Decision",fieldName:"Decision_At__c",type:"date"},{label:"Source",fieldName:"source"}]; }
    get profileCredentialRows() { return (this.data.credentials||[]).filter((row)=>row.Resource__c===this.profileResourceId); }
    get hasProfileCredentials() { return this.profileCredentialRows.length>0; }
    get profileCredentialColumns() { return [{label:"Certification",fieldName:"Credential_Name__c"},{label:"Issuer",fieldName:"Issuer__c"},{label:"State",fieldName:"State__c"},{label:"Issued",fieldName:"Issue_Date__c",type:"date"},{label:"Expiry",fieldName:"Expiry_Date__c",type:"date"},{label:"Verification source",fieldName:"Verification_Source__c"},{label:"Verified",fieldName:"Verified_At__c",type:"date"},{label:"Last checked",fieldName:"Last_Checked_At__c",type:"date"}]; }
    get profileLearningRows() { return (this.data.learningAchievements||[]).filter((row)=>row.Resource__c===this.profileResourceId).map((row)=>({...row,capability:row.Capability__r?.Name})); }
    get hasProfileLearning() { return this.profileLearningRows.length>0; }
    get profileLearningColumns() { return [{label:"Program",fieldName:"Course_Name__c"},{label:"Provider",fieldName:"Provider__c"},{label:"Capability",fieldName:"capability"},{label:"State",fieldName:"State__c"},{label:"Completed",fieldName:"Completed_On__c",type:"date"},{label:"Source freshness",fieldName:"Source_Last_Sync__c",type:"date"}]; }
    get profileEvidenceRows() { return (this.data.projectEvidence||[]).filter((row)=>row.Resource__c===this.profileResourceId).map((row)=>({...row,engagement:row.Engagement__r?.Name,capability:row.Capability__r?.Name,verifier:row.Verified_By__r?.Name})); }
    get hasProfileEvidence() { return this.profileEvidenceRows.length>0; }
    get profileEvidenceColumns() { return [{label:"Capability",fieldName:"capability"},{label:"Engagement",fieldName:"engagement"},{label:"Role",fieldName:"Role__c"},{label:"From",fieldName:"Start_Date__c",type:"date"},{label:"To",fieldName:"End_Date__c",type:"date"},{label:"State",fieldName:"State__c"},{label:"Verified by",fieldName:"verifier"},{label:"Verified",fieldName:"Verified_At__c",type:"date"},{label:"Evidence summary",fieldName:"Summary__c",wrapText:true}]; }
    get talentColumns() { return [{ label: "Candidate", fieldName: "name" }, { label: "Eligibility", fieldName: "availabilityStatus" }, { label: "Role", fieldName: "role" }, { label: "Tower", fieldName: "tower" }, { label: "Location", fieldName: "location" }, { label: "Level", fieldName: "approvedLevel", type: "number" }, { label: "Availability", fieldName: "availabilityFraction", type: "percent", typeAttributes: { minimumFractionDigits: 0 } }, { label: "Gap reasons", fieldName: "gapSummary", wrapText: true }, { label: "Fit score", fieldName: "score", type: "number" }, { label: "Explanation", fieldName: "explanation", wrapText: true }]; }
    get notificationLifecycleRows() { return (this.data.notifications || []).map((item)=>({...item,ownerName:item.Accountable_Owner__r?.Name || "Unassigned",closedByName:item.Closed_By__r?.Name || "—",rowActions:item.Resolution_Status__c==="Closed"?[]:[{label:"Close with evidence",name:"closeAlert"}]})); }
    get hasNotificationLifecycleRows() { return this.notificationLifecycleRows.length > 0; }
    get notificationLifecycleColumns() { return [{label:"Alert",fieldName:"Title__c"},{label:"Severity",fieldName:"Severity__c"},{label:"Resolution",fieldName:"Resolution_Status__c"},{label:"Owner",fieldName:"ownerName"},{label:"First seen",fieldName:"First_Seen_At__c",type:"date"},{label:"Closed",fieldName:"Closed_At__c",type:"date"},{label:"Closed by",fieldName:"closedByName"},{label:"Closure evidence",fieldName:"Closure_Note__c",wrapText:true},{type:"action",typeAttributes:{rowActions:{fieldName:"rowActions"}}}]; }
    get hasScenarioResult() { return Boolean(this.scenarioResult); }
    get showDecisionPanel() { return Boolean(this.decisionDraft); }
    get decisionRequiresLevel() { return this.decisionDraft?.actionName === "approveClaim"; }
    get decisionNoteRequired() { return ["decline", "rejectClaim", "rejectBudget", "rejectTimesheet", "correctTimesheet", "approveOverallocation", "rejectOverallocation"].includes(this.decisionDraft?.actionName); }
    get hasRows() { return this.tableRows.length > 0; }

    get tableColumns() {
        const columns = {
            global: [this.linkColumn("Notification", "label"), { label: "Severity", fieldName: "status" }, { label: "Message", fieldName: "detail", wrapText: true }, { label: "Occurred", fieldName: "date", type: "date" }],
            engagement: [this.linkColumn("Engagement", "label"), { label: "ID", fieldName: "secondary" }, { label: "Status", fieldName: "status" }, { label: "Tower", fieldName: "detail" }, { label: "Start", fieldName: "date", type: "date" }, { label: "End", fieldName: "endDate", type: "date" }],
            staffing: [this.linkColumn("Request", "label"), { label: "Engagement", fieldName: "secondary" }, { label: "Candidate", fieldName: "person" }, { label: "Role", fieldName: "detail" }, { label: "State", fieldName: "status" }, { label: "Daily hours", fieldName: "value", type: "number" }, RECORD_ACTION],
            skills: [this.linkColumn("Claim", "label"), { label: "Practitioner", fieldName: "person" }, { label: "Capability", fieldName: "secondary" }, { label: "Requested", fieldName: "value", type: "number" }, { label: "State", fieldName: "status" }, RECORD_ACTION],
            budget: [this.linkColumn("Budget", "label"), { label: "Engagement", fieldName: "secondary" }, { label: "Version", fieldName: "value", type: "number" }, { label: "State", fieldName: "status" }, { label: "Revenue", fieldName: "money", type: "currency", typeAttributes: { currencyCode: "INR" } }, { label: "Margin", fieldName: "percent", type: "percent", typeAttributes: { minimumFractionDigits: 1 } }, RECORD_ACTION],
            timesheet: [this.linkColumn("Timesheet", "label"), { label: "Practitioner", fieldName: "person" }, { label: "Week", fieldName: "date", type: "date" }, { label: "State", fieldName: "status" }, { label: "Required approval", fieldName: "secondary" }, RECORD_ACTION],
            command: [this.linkColumn("Allocation", "label"), { label: "Practitioner", fieldName: "person" }, { label: "Engagement", fieldName: "secondary" }, { label: "Classification", fieldName: "status" }, { label: "Allocation", fieldName: "percent", type: "percent" }],
            admin: [this.linkColumn("Audit event", "label"), { label: "Action", fieldName: "status" }, { label: "Entity", fieldName: "secondary" }, { label: "Actor", fieldName: "person" }, { label: "Occurred", fieldName: "date", type: "date" }, { label: "Detail", fieldName: "detail", wrapText: true }],
            ai: [this.linkColumn("Candidate", "label"), { label: "Role", fieldName: "secondary" }, { label: "Tower", fieldName: "status" }, { label: "Location", fieldName: "detail" }, { label: "Availability", fieldName: "percent", type: "percent" }]
        };
        return columns[this.selectedModule] || columns.global;
    }

    get tableRows() {
        if (this.selectedModule === "engagement") return (this.data.engagements || []).map((item) => this.row(item, item.Name, item.Engagement_ID__c, item.Status__c, item.Salesforce_Tower__c, item.Start_Date__c, null, null, item.End_Date__c));
        if (this.selectedModule === "staffing") return (this.data.staffingRequests || []).map((item) => ({ ...this.row(item, item.Name, item.Engagement__r?.Name, item.State__c, item.Requested_Role__c, item.Start_Date__c, item.Daily_Hours__c, item.Resource__r?.Preferred_Name__c), rowActions: this.staffingActions(item) }));
        if (this.selectedModule === "skills") return (this.data.skillClaims || []).map((item) => ({ ...this.row(item, item.Name, item.Capability__r?.Name, item.State__c, item.Decision_Note__c, item.Submitted_At__c, item.Requested_Level__c, item.Resource__r?.Preferred_Name__c), rowActions: this.skillActions(item) }));
        if (this.selectedModule === "budget") return (this.data.budgets || []).map((item) => ({ ...this.row(item, item.Name, item.Engagement__r?.Name, item.State__c, item.Approval_Level__c, null, item.Version__c), money: item.Revenue__c, percent: (item.Margin_Percent__c || 0) / 100, rowActions: this.budgetActions(item) }));
        if (this.selectedModule === "timesheet") return (this.data.timesheets || []).map((item) => ({ ...this.row(item, item.Name, item.Required_Approval_Role__c || item.Decision_Note__c, item.Status__c, null, item.Week_Start__c, null, item.Resource__r?.Preferred_Name__c), rowActions: this.timesheetActions(item) }));
        if (this.selectedModule === "command") return (this.data.allocations || []).map((item) => ({ ...this.row(item, item.Name, item.Engagement__r?.Name, item.Classification__c, item.Role__c, item.Start_Date__c, item.Daily_Hours__c, item.Resource__r?.Preferred_Name__c), percent: (item.Allocation_Percent__c || 0) / 100 }));
        if (this.selectedModule === "admin") return (this.data.auditEvents || []).map((item) => this.row(item, item.Name, `${item.Entity_Type__c} · ${item.Entity_ID__c}`, item.Action__c, item.Detail__c, item.Occurred_At__c, item.Entity_Version__c, item.Actor__r?.Name));
        if (this.selectedModule === "ai") return (this.data.resources || []).map((item) => ({ ...this.row(item, item.Preferred_Name__c, item.Primary_Role__c, item.Tower__c, item.Location__c, null, null, null), percent: (item.Available_Percent__c || 0) / 100 }));
        return (this.data.notifications || []).map((item) => this.row(item, item.Title__c, null, item.Severity__c, item.Message__c, item.Occurred_At__c));
    }

    routeRecords(dataset) {
        if (dataset === "identity") return this.data.assurance?.personas || [];
        if (dataset === "summary") return this.summaryCards;
        if (dataset === "search") return [
            ...(this.data.resources || []).map((item)=>({...item,_dataset:"resources"})),
            ...(this.data.engagements || []).map((item)=>({...item,_dataset:"engagements"})),
            ...(this.data.staffingRequests || []).map((item)=>({...item,_dataset:"staffingRequests"}))
        ];
        if (dataset === "help") return [
            {id:"help-start",primary:"Start the Salesforce demo",secondary:"App access, persona selection and demo reset",status:"Ready",detail:"DEMO_ACTIVATION_RUNBOOK · Salesforce-native golden path",target:"ADMUI-01"},
            {id:"help-staffing",primary:"Staffing and allocation walkthrough",secondary:"Request → shortlist → decision → allocation",status:"Ready",detail:"Governed capacity and signed-budget controls",target:"STFUI-01"},
            {id:"help-budget",primary:"Budget and approval walkthrough",secondary:"Economics → WBS → routing → decision",status:"Ready",detail:"Sequential approval and immutable economic signature",target:"BUDUI-01"},
            {id:"help-skills",primary:"Skills and talent walkthrough",secondary:"Claim → evidence → review → matching",status:"Ready",detail:"Source-attributed Salesforce capability profile",target:"SKLUI-01"},
            {id:"help-time",primary:"Timesheet and correction walkthrough",secondary:"Eligible time → approval → controlled correction",status:"Ready",detail:"Allocation authorization and dual control",target:"TIMEUI-01"},
            {id:"help-operations",primary:"Operations and audit walkthrough",secondary:"Sources → errors → schedules → audit",status:"Ready",detail:"Sanitized mock boundary and immutable evidence",target:"CMD-08"}
        ];
        if (dataset === "classifications") return (this.data.classifications || []).map((value)=>({id:value,label:value,state:"Active",detail:value==="Billing"?"Billable snapshot; signed budget required":"Unbilled control owner, review date and reason required"}));
        if (dataset === "calendars") return [
            ...(this.data.workCalendars || []).map((item)=>({...item,_dataset:"workCalendars"})),
            ...(this.data.calendarExceptions || []).map((item)=>({...item,_dataset:"calendarExceptions"}))
        ];
        if (dataset === "recommendations") return this.data.resources || [];
        if (dataset === "agentOperations") return [
            {id:"agent-policy",primary:"Resource assistant policy",secondary:"Authorized read model only",status:this.agentPaused?"Paused":"Active mock",detail:"No autonomous write; human confirmation is mandatory.",date:this.data.generatedAt},
            ...(this.data.integrationRuns || []).slice(0,5).map((item)=>({...item,_dataset:"integrationRuns"}))
        ];
        return this.data[dataset] || [];
    }

    filterRouteRecords(records, filter) {
        if (!filter || filter === "all") return records;
        return records.filter((item) => {
            const state = item.State__c || item.Status__c || item.state || item.status || item.approvalStatus || "";
            if (filter === "active") return item.Active__c !== false && !["Inactive","Retired","Revoked"].includes(state);
            if (filter === "current") return item.Current__c !== false;
            if (filter === "recent") return true;
            if (filter === "open") return item.Resolution_Status__c ? item.Resolution_Status__c === "Open" : !["Closed","Succeeded","Resolved"].includes(state);
            if (filter === "pending") return ["Pending","Pending Approval","Submitted"].includes(state);
            if (filter === "submitted") return state === "Submitted";
            if (filter === "submittedOrApproved") return ["Submitted","Approved","Correction Pending"].includes(state);
            if (filter === "draftOrPending") return ["Draft","Pending"].includes(state);
            if (filter === "draftOrRejected") return ["Draft","Rejected"].includes(state);
            if (filter === "approvedOrCorrection") return ["Approved","Correction Pending"].includes(state);
            if (filter === "editable") return ["Draft","Rejected","Invalidated"].includes(state);
            if (filter === "available") return Number(item.Available_Percent__c || 0) > 0 && state !== "Inactive";
            if (filter === "staffing") return `${item.Entity_Type__c || ""} ${item.Source_File_Name__c || ""}`.toLowerCase().includes("staff");
            if (filter === "learning") return `${item.Entity_Type__c || ""} ${item.Source_System__c || ""}`.toLowerCase().includes("learning");
            if (filter === "skills") return /learning|credential|capability|people/i.test(`${item.Entity_Type__c || ""} ${item.Source_System__c || ""}`);
            if (filter === "capability") return /capability|delivery role|classification/i.test(`${item.domain || ""} ${item.key || ""}`);
            if (filter === "budget") return /budget|margin|commercial/i.test(`${item.domain || ""} ${item.key || ""} ${item.code || ""}`);
            return true;
        });
    }

    routeRow(dataset, item, index) {
        if (item._dataset) {
            const { _dataset: nestedDataset, ...nestedItem } = item;
            return this.routeRow(nestedDataset, nestedItem, index);
        }
        const fallbackId=`${this.selectedScreenId}-${dataset}-${index}`;
        const mapped={id:item.Id||item.id||fallbackId,record:item,date:item.LastModifiedDate||item.Source_Last_Sync__c||item.Occurred_At__c||item.Started_At__c||item.Submitted_At__c||item.Start_Date__c||item.date||this.data.generatedAt};
        if(dataset==="identity")return{...mapped,primary:item.businessRole,secondary:item.permissionSetGroup,status:item.approvalStatus,detail:`${item.scopeType} · ${item.decisionAuthority}`,date:item.approvedOn};
        if(dataset==="summary")return{...mapped,primary:item.label,secondary:item.note,status:"Live",detail:item.value,date:this.data.generatedAt};
        if(dataset==="help")return{...mapped,url:`/lightning/n/Resource360_Workspace?c__screen=${item.target}`,primary:item.primary,secondary:item.secondary,status:item.status,detail:item.detail};
        if(dataset==="roleScopes")return{...mapped,url:this.routeRecordUrl("R360_Role_Scope__c",item.Id),primary:item.User__r?.Name||item.Name,secondary:`${item.Business_Role__c} · ${item.Org_Unit_ID__c||"All org"} · ${item.Portfolio_ID__c||"All portfolios"}`,status:item.Active__c?"Active":"Inactive",detail:`${item.Assignment_Source__c||"Unspecified"} · ${item.Approval_Reference__c||"Uncertified"}`,date:item.Last_Certified_At__c||item.Valid_From__c};
        if(dataset==="engagements")return{...mapped,url:this.routeRecordUrl("Engagement__c",item.Id),primary:item.Name,secondary:`${item.Engagement_ID__c} · ${item.Project_Manager__r?.Name||"Unassigned PM"}`,status:item.Status__c,detail:`${item.Salesforce_Tower__c||"No tower"} · ${item.Industry__c||"No industry"}`,date:item.Start_Date__c};
        if(dataset==="commercialReferences")return{...mapped,url:this.routeRecordUrl("Commercial_Reference__c",item.Id),primary:item.External_ID__c||item.Name,secondary:item.Engagement__r?.Name,status:item.Status__c,detail:`${item.Reference_Type__c} · ${this.money(item.Value__c)}`,date:item.Valid_From__c};
        if(dataset==="allocations")return{...mapped,url:this.routeRecordUrl("Allocation__c",item.Id),primary:item.Resource__r?.Preferred_Name__c||item.Name,secondary:`${item.Engagement__r?.Name} · ${item.Role__c}`,status:item.Classification__c,detail:`${item.Daily_Hours__c}h/day · v${item.Version__c||1} · ${item.State__c}`,date:item.Start_Date__c};
        if(dataset==="budgets")return{...mapped,url:this.routeRecordUrl("Budget__c",item.Id),primary:item.Name,secondary:`${item.Engagement__r?.Name} · v${item.Version__c}`,status:item.State__c,detail:`${this.money(item.Revenue__c)} revenue · ${item.Margin_Percent__c||0}% margin · ${item.Approval_Level__c||"No route"}`,date:item.Engagement__r?.Start_Date__c};
        if(dataset==="timesheets")return{...mapped,url:this.routeRecordUrl("Timesheet__c",item.Id),primary:item.Name,secondary:`${item.Resource__r?.Preferred_Name__c} · ${item.Week_Start__c}`,status:item.Status__c,detail:item.Required_Approval_Role__c||item.Decision_Note__c||"No active exception",date:item.Submitted_At__c||item.Week_Start__c};
        if(dataset==="workUnits")return{...mapped,url:this.routeRecordUrl("Work_Unit__c",item.Id),primary:item.Name,secondary:`${item.Engagement__r?.Name} · ${item.Phase__c}`,status:item.Status__c,detail:item.Work_Unit_Code__c,date:item.Start_Date__c};
        if(dataset==="notifications")return{...mapped,url:this.routeRecordUrl("R360_Notification__c",item.Id),primary:item.Title__c,secondary:item.Accountable_Owner__r?.Name||item.Recipient__r?.Name||"Unassigned",status:item.Resolution_Status__c||item.State__c,detail:`${item.Severity__c} · ${item.Message__c}`,date:item.Occurred_At__c};
        if(dataset==="resources"||dataset==="recommendations")return{...mapped,url:this.routeRecordUrl("Resource__c",item.Id),primary:item.Preferred_Name__c,secondary:`${item.Primary_Role__c||"Role not sourced"} · ${item.Location__c||"Location not sourced"}`,status:item.Status__c||"Active",detail:`${item.Tower__c||"No tower"} · ${item.Available_Percent__c||0}% available`,date:item.Source_Last_Sync__c};
        if(dataset==="classifications")return{...mapped,primary:item.label,secondary:"Effective Salesforce classification",status:item.state,detail:item.detail,date:this.data.generatedAt};
        if(dataset==="staffingRequests")return{...mapped,url:this.routeRecordUrl("Staffing_Request__c",item.Id),primary:item.Name,secondary:`${item.Engagement__r?.Name} · ${item.Resource__r?.Preferred_Name__c}`,status:item.State__c,detail:`${item.Priority__c} · ${item.Requested_Role__c} · ${item.Daily_Hours__c}h/day`,date:item.SLA_Due__c};
        if(dataset==="integrationRuns")return{...mapped,url:this.routeRecordUrl("R360_Integration_Run__c",item.Id),primary:item.Run_ID__c||item.Name,secondary:`${item.Source_System__c||"Resource 360"} · ${item.Entity_Type__c||"Control"}`,status:item.State__c,detail:`${item.Processed_Count__c||0} processed · ${item.Failure_Count__c||0} failed · ${item.Contract_Version__c||"No contract"}`,date:item.Started_At__c};
        if(dataset==="integrationErrors")return{...mapped,url:this.routeRecordUrl("R360_Integration_Error__c",item.Id),primary:item.Error_Code__c||item.Name,secondary:`${item.Integration_Run__r?.Run_ID__c||"Run"} · row ${item.Row_Number__c||"—"}`,status:item.State__c,detail:item.Error_Message__c,date:item.Next_Retry_At__c};
        if(dataset==="capabilities")return{...mapped,url:this.routeRecordUrl("Capability__c",item.Id),primary:item.Name,secondary:`${item.Capability_ID__c} · ${item.Category__c||"Uncategorized"}`,status:item.Active__c?"Active":"Inactive",detail:`${item.Type__c} · ${item.Tower__c}`,date:this.data.generatedAt};
        if(dataset==="skillClaims")return{...mapped,url:this.routeRecordUrl("Skill_Claim__c",item.Id),primary:item.Capability__r?.Name||item.Name,secondary:`${item.Resource__r?.Preferred_Name__c} · requested L${item.Requested_Level__c}`,status:item.State__c,detail:`Approved L${item.Approved_Level__c||"—"} · ${item.Decision_Note__c||"Awaiting review"}`,date:item.Submitted_At__c};
        if(dataset==="configurationCatalog")return{...mapped,url:item.id?this.routeRecordUrl("R360_Configuration__c",item.id):null,primary:item.label||item.code,secondary:`${item.domain} · ${item.source}`,status:item.state,detail:`${item.value} · ${item.impact}`,date:item.effectiveFrom};
        if(dataset==="timeEntries")return{...mapped,url:this.routeRecordUrl("Time_Entry__c",item.Id),primary:item.Name,secondary:`${item.Engagement__r?.Name} · ${item.Role__c}`,status:item.State__c,detail:`${item.Hours__c}h · ${item.Comment__c||"No comment"}`,date:item.Work_Date__c};
        if(dataset==="approvalDecisions")return{...mapped,url:this.routeRecordUrl("R360_Approval_Decision__c",item.Id),primary:item.Name,secondary:`${item.Entity_Type__c} · step ${item.Step_Number__c}`,status:item.State__c,detail:`${item.Required_Role__c} · ${item.Decision_Note__c||"Pending"}`,date:item.Decided_At__c};
        if(dataset==="auditEvents")return{...mapped,url:this.routeRecordUrl("R360_Audit_Event__c",item.Id),primary:item.Action__c||item.Name,secondary:`${item.Entity_Type__c} · ${item.Entity_ID__c}`,status:item.Active_Role__c,detail:item.Detail__c,date:item.Occurred_At__c};
        if(dataset==="workCalendars")return{...mapped,url:this.routeRecordUrl("R360_Work_Calendar__c",item.Id),primary:item.Name,secondary:`${item.Time_Zone__c} · days ${item.Work_Days__c}`,status:item.Current__c?"Current":"Historical",detail:`${item.Daily_Capacity_Hours__c}h daily capacity`,date:item.Effective_From__c};
        if(dataset==="calendarExceptions")return{...mapped,url:this.routeRecordUrl("R360_Calendar_Exception__c",item.Id),primary:item.Reason__c,secondary:item.Calendar__r?.Name,status:`${item.Capacity_Hours__c}h capacity`,detail:item.Exception_Key__c,date:item.Exception_Date__c};
        if(dataset==="agentOperations")return{...mapped,primary:item.primary,secondary:item.secondary,status:item.status,detail:item.detail,date:item.date};
        return{...mapped,primary:item.Name||item.label||"Resource 360 record",secondary:item.secondary||"Salesforce",status:item.State__c||item.Status__c||item.status||"Ready",detail:item.Detail__c||item.detail||this.routeExperience?.evidence};
    }

    routeRecordUrl(objectApiName, recordId) { return recordId?`/lightning/r/${objectApiName}/${recordId}/view`:null; }

    linkColumn(label, fieldName) {
        return { label, fieldName: "url", type: "url", typeAttributes: { label: { fieldName }, target: "_self" } };
    }

    row(item, label, secondary, status, detail, date, value, person, endDate) {
        return { id: item.Id, url: `/lightning/r/${this.objectForModule()}/${item.Id}/view`, label, secondary, status, detail, date, value, person, endDate };
    }

    csvCell(value) { return `"${String(value??"").replaceAll('"','""')}"`; }

    objectForModule() {
        return { global: "R360_Notification__c", engagement: "Engagement__c", staffing: "Staffing_Request__c", skills: "Skill_Claim__c", budget: "Budget__c", timesheet: "Timesheet__c", command: "Allocation__c", admin: "R360_Audit_Event__c", ai: "Resource__c" }[this.selectedModule];
    }

    staffingActions(item) { return item.State__c === "Pending" ? [{ label: "Accept request", name: "accept" }, { label: "Decline request", name: "decline" }, { label: "Open record", name: "view" }] : [{ label: "Open record", name: "view" }]; }
    skillActions(item) { return item.State__c === "Pending" ? [{ label: "Approve requested level", name: "approveClaim" }, { label: "Reject claim", name: "rejectClaim" }, { label: "Open record", name: "view" }] : [{ label: "Open record", name: "view" }]; }
    budgetActions(item) { return item.State__c === "Draft" || item.State__c === "Rejected" || item.State__c === "Invalidated" ? [{ label: "Submit budget", name: "submitBudget" }, { label: "Open record", name: "view" }] : item.State__c === "Pending Approval" ? [{ label: "Approve current step", name: "approveBudget" }, { label: "Reject budget", name: "rejectBudget" }, { label: "Open record", name: "view" }] : [{ label: "Create next version", name: "createBudgetVersion" }, { label: "Open record", name: "view" }]; }
    timesheetActions(item) { return item.Status__c === "Draft" || item.Status__c === "Rejected" ? [{ label: "Submit week", name: "submitTimesheet" }, { label: "Open record", name: "view" }] : item.Status__c === "Submitted" ? [{ label: "Approve week", name: "approveTimesheet" }, { label: "Reject week", name: "rejectTimesheet" }, { label: "Open record", name: "view" }] : [{ label: "Create correction", name: "correctTimesheet" }, { label: "Open record", name: "view" }]; }
    configurationActions(item) { if(item.source==="Deployed Default")return this.canManageConfiguration?[{label:"Create runtime override",name:"override"}]:[];if(["Draft","Rejected"].includes(item.state))return this.canManageConfiguration?[{label:"Edit draft",name:"edit"},{label:"Submit for approval",name:"submit"}]:[];if(item.state==="Pending Approval")return this.canApproveConfiguration?[{label:"Approve and activate",name:"approve"},{label:"Reject",name:"reject"}]:[];return this.canApproveConfiguration?[{label:"Restore as new version",name:"rollback"}]:[]; }

    handleModule(event) {
        this.selectedModule = event.currentTarget.dataset.module;
        this.selectedScreenId = this.authorizedScreens.find((screen) => screen.module === this.selectedModule)?.id;
    }

    handleScreen(event) {
        this.selectedScreenId = event.currentTarget.dataset.screen;
        this.navigateToScreen(this.selectedScreenId);
    }
    handleExperienceNavigate(event) {
        const requested = event.detail;
        const screen = SCREENS.find((item) => item.id === requested);
        if (!screen) return;
        this.selectedModule = screen.module;
        this.selectedScreenId = screen.id;
        this.navigateToScreen(screen.id);
    }
    handleExperienceRole(event) {
        this.activeRole = event.detail;
    }
    navigateToScreen(screenId) {
        const state = { c__screen: screenId };
        if (this.recordingMode) state.c__recording = "1";
        this[NavigationMixin.Navigate]({ type: "standard__navItemPage", attributes: { apiName: "Resource360_Workspace" }, state });
    }
    handleRole(event) {
        this.activeRole = event.detail.value;
        if (!this.isAuthorized) {
            const fallback = this.authorizedScreens.find((screen) => screen.module === "global") || this.authorizedScreens[0];
            if (fallback) {
                this.selectedModule = fallback.module;
                this.selectedScreenId = fallback.id;
            }
        }
    }
    handleStaffingInput(event) { this.staffingDraft = { ...this.staffingDraft, [event.target.dataset.field]: event.detail?.value ?? event.target.value }; }
    handlePlanningInput(event) { const value = event.target.type === "checkbox" ? event.target.checked : event.detail?.value ?? event.target.value; this.planningDraft = { ...this.planningDraft, [event.target.dataset.field]: value }; }
    handleAllocationInput(event) { this.allocationDraft = { ...this.allocationDraft, [event.target.dataset.field]: event.detail?.value ?? event.target.value }; if (event.target.dataset.field === "allocationId") this.selectAllocation((this.data.allocations || []).find((item) => item.Id === event.detail.value)); }
    handleBudgetInput(event) { this.budgetDraft = { ...this.budgetDraft, [event.target.dataset.field]: event.detail?.value ?? event.target.value }; if (event.target.dataset.field === "budgetId") this.selectBudget((this.data.budgets || []).find((item) => item.Id === event.detail.value)); }
    handleBudgetLineInput(event) { const value = event.target.type === "checkbox" ? event.target.checked : event.detail?.value ?? event.target.value; this.budgetLineDraft = { ...this.budgetLineDraft, [event.target.dataset.field]: value }; }
    handleBudgetImportInput(event) { this.budgetImportDraft = { ...this.budgetImportDraft, [event.target.dataset.field]: event.detail?.value ?? event.target.value }; }
    handleBulkInput(event) { this.bulkDraft = { ...this.bulkDraft, [event.target.dataset.field]: event.detail?.value ?? event.target.value }; }
    handleConfigurationInput(event) { const value=event.target.type==="checkbox"?event.target.checked:event.detail?.value??event.target.value;this.configurationDraft={...this.configurationDraft,[event.target.dataset.field]:value}; }
    handleConfigurationReleaseInput(event) { const field=event.target.dataset.field;const value=event.detail?.value??event.target.value;if(field==="releaseKey")this.configurationReleaseKey=value;else this.configurationReleaseSettingId=value;this.configurationReleasePreview=undefined; }
    handleProfileInput(event) { this.profileResourceId = event.detail.value; }
    handleSkillInput(event) { this.skillDraft = { ...this.skillDraft, [event.target.dataset.field]: event.detail?.value ?? event.target.value }; }
    handleCredentialInput(event) { this.credentialDraft = { ...this.credentialDraft, [event.target.dataset.field]: event.detail?.value ?? event.target.value }; }
    handleTalentInput(event) { this.talentDraft = { ...this.talentDraft, [event.target.dataset.field]: event.detail?.value ?? event.target.value }; }
    handleScenarioInput(event) { this.scenarioDraft = { ...this.scenarioDraft, [event.target.dataset.field]: event.detail?.value ?? event.target.value }; }
    handleAlertClosureNote(event) { this.alertClosureNote = event.detail?.value ?? event.target.value; }
    handleTimeInput(event) { this.timeDraft = { ...this.timeDraft, [event.target.dataset.field]: event.detail?.value ?? event.target.value }; }
    handleTimesheetInput(event) { this.timesheetDraft = { ...this.timesheetDraft, [event.target.dataset.field]: event.detail?.value ?? event.target.value }; }
    handleDecisionInput(event) { this.decisionDraft = { ...this.decisionDraft, [event.target.dataset.field]: event.detail?.value ?? event.target.value }; }
    handleAssistantInput(event) { this.assistantQuestion = event.detail?.value ?? event.target.value; }
    handleCancelDecision() { this.decisionDraft = undefined; }

    handleOpenReports() {
        this[NavigationMixin.Navigate]({ type: "standard__objectPage", attributes: { objectApiName: "Report", actionName: "home" } });
    }

    handleOpenDashboards() {
        this[NavigationMixin.Navigate]({ type: "standard__objectPage", attributes: { objectApiName: "Dashboard", actionName: "home" } });
    }

    async handleRoutePrimary() {
        const experience=this.routeExperience;
        if(!experience)return;
        if(experience.operation==="refresh")return this.loadData();
        if(experience.operation==="assistant")return this.handleAssistantAsk();
        if(experience.operation==="agentToggle")return this.handleAgentToggle();
        const first=this.routeRows[0];
        const decisionActions={staffingDecision:"accept",skillDecision:"approveClaim",budgetDecision:"approveBudget",timesheetDecision:"approveTimesheet",timesheetCorrection:"correctTimesheet"};
        if(decisionActions[experience.operation]&&first){this.decisionDraft={actionName:decisionActions[experience.operation],row:{...first.record,id:first.id},title:this.selectedScreen.primary,note:"",approvedLevel:String(first.record?.Requested_Level__c||3)};return;}
        if(experience.operation==="budgetSubmit"&&first)return this.execute(this.selectedScreen.primary,()=>submitBudget({budgetId:first.id}));
        if(experience.operation==="timesheetSubmit"&&first)return this.execute(this.selectedScreen.primary,()=>submitTimesheet({timesheetId:first.id}));
        if(experience.target){this.openScreen(experience.target);return;}
        if(first?.id)return this.navigateToRecord(first.id);
        return this.loadData();
    }

    handleAssistantAsk() {
        const candidate=[...(this.data.resources||[])].sort((a,b)=>(b.Available_Percent__c||0)-(a.Available_Percent__c||0))[0];
        const pending=(this.data.staffingRequests||[]).filter((item)=>item.State__c==="Pending").length;
        this.assistantResponse=candidate
            ? `${candidate.Preferred_Name__c} currently has the highest visible availability at ${candidate.Available_Percent__c||0}%. Role: ${candidate.Primary_Role__c||"not sourced"}; tower: ${candidate.Tower__c||"not sourced"}; location: ${candidate.Location__c||"not sourced"}. ${pending} pending staffing request(s) remain. Review AIUI-02 and confirm the decision in the governed staffing workflow.`
            : "No readable practitioner record is available in the current Salesforce scope.";
    }

    handleAgentToggle() {
        this.agentPaused=!this.agentPaused;
        this.dispatchEvent(new ShowToastEvent({title:"Resource assistant operations",message:this.agentStateLabel,variant:this.agentPaused?"warning":"success"}));
    }

    openScreen(screenId) {
        const screen=SCREENS.find((item)=>item.id===screenId);
        if(!screen)return;
        this.selectedScreenId=screenId;this.selectedModule=screen.module;
        this[NavigationMixin.Navigate]({type:"standard__navItemPage",attributes:{apiName:"Resource360_Workspace"},state:{c__screen:screenId}});
    }

    async handleSeed() { await this.execute("Load demo data", () => seedDemoData()); }

    async handleCreateStaffing() {
        const draft = this.staffingDraft;
        await this.execute("Submit staffing request", () => createStaffingRequestV2({
            engagementId: draft.engagementId, resourceId: draft.resourceId, requestedRole: draft.requestedRole,
            classification: draft.classification, startDate: draft.startDate, endDate: draft.endDate,
            dailyHours: Number(draft.dailyHours), responsibleOwnerId: draft.responsibleOwnerId || null,
            reviewDate: draft.reviewDate || null, controlReason: draft.controlReason || null,
            sourceCriteria: JSON.stringify({ screen: this.selectedScreenId, activeRole: this.activeRole }), idempotencyKey: `UI-${Date.now()}`
        }));
    }

    async handlePreviewPlan() {
        const draft = this.planningDraft; this.loading = true;
        try { this.planningPreview = await previewAllocationPlan({ resourceId: draft.resourceId, startDate: draft.startDate, endDate: draft.endDate, mode: draft.mode, effort: Number(draft.effort), excludedAllocationId: draft.excludedAllocationId || null, allowPastOverride: Boolean(draft.allowPastOverride), overrideReason: draft.overrideReason || null }); }
        catch (error) { this.dispatchEvent(new ShowToastEvent({ title: "Allocation preview", message: this.messageFor(error), variant: "error", mode: "sticky" })); }
        finally { this.loading = false; }
    }

    async handleModifyAllocation() { const draft=this.allocationDraft;await this.execute("Modify allocation",()=>modifyAllocation({ allocationId:draft.allocationId,startDate:draft.startDate,endDate:draft.endDate,dailyHours:Number(draft.dailyHours),roleName:draft.roleName,classification:draft.classification,responsibleOwnerId:draft.responsibleOwnerId||null,reviewDate:draft.reviewDate||null,reason:draft.reason })); }
    async handleSplitAllocation() { const draft=this.allocationDraft;await this.execute("Split allocation",()=>splitAllocation({ allocationId:draft.allocationId,splitDate:draft.splitDate,firstDailyHours:Number(draft.firstDailyHours),secondDailyHours:Number(draft.secondDailyHours),reason:draft.reason })); }
    async handleDeallocate() { const draft=this.allocationDraft;await this.execute("Deallocate resource",()=>deallocate({ allocationId:draft.allocationId,effectiveEndDate:draft.effectiveEndDate,reason:draft.reason })); }
    async handleSaveBudget() { const draft=this.budgetDraft;await this.execute("Save budget assumptions",()=>saveBudgetDraft({ budgetId:draft.budgetId,revenue:Number(draft.revenue),upliftPercent:Number(draft.upliftPercent),effortContingencyPercent:Number(draft.effortContingencyPercent),expenseContingencyPercent:Number(draft.expenseContingencyPercent),travelRate:Number(draft.travelRate),onsiteMonths:Number(draft.onsiteMonths) })); }
    async handleSaveBudgetLine() { const draft=this.budgetLineDraft;const command=draft.resourceId||draft.roleStart||draft.roleEnd?()=>saveBudgetRosterLine({ budgetId:this.budgetDraft.budgetId,lineId:draft.lineId||null,resourceId:draft.resourceId||null,periodStart:draft.periodStart,phase:draft.phase,workUnit:draft.workUnit,roleName:draft.roleName,location:draft.location,plannedHours:Number(draft.plannedHours),costRate:Number(draft.costRate),allocationPercent:Number(draft.allocationPercent),onsite:Boolean(draft.onsite),roleStart:draft.roleStart||null,roleEnd:draft.roleEnd||null }):()=>saveBudgetLine({ budgetId:this.budgetDraft.budgetId,lineId:draft.lineId||null,periodStart:draft.periodStart,phase:draft.phase,workUnit:draft.workUnit,roleName:draft.roleName,location:draft.location,plannedHours:Number(draft.plannedHours),costRate:Number(draft.costRate),allocationPercent:Number(draft.allocationPercent),onsite:Boolean(draft.onsite) });await this.execute("Save monthly roster line",command); }
    async handlePreviewBudgetImport() { const draft=this.budgetImportDraft;this.loading=true;try{this.budgetImportPreview=await previewBudgetRoster({budgetId:this.budgetDraft.budgetId,jsonRows:draft.jsonRows});}catch(error){this.dispatchEvent(new ShowToastEvent({title:"Budget roster pre-validation",message:this.messageFor(error),variant:"error",mode:"sticky"}));}finally{this.loading=false;} }
    async handleCommitBudgetImport() { const draft=this.budgetImportDraft;await this.execute("Commit monthly budget roster",()=>commitBudgetRoster({budgetId:this.budgetDraft.budgetId,jsonRows:draft.jsonRows,sourceFileName:draft.sourceFileName}));this.budgetImportPreview=undefined; }
    async handleBudgetAssurance() { this.loading=true;try{this.budgetAssuranceResult=JSON.parse(await budgetAssurance({budgetId:this.budgetDraft.budgetId,asOfDate:this.isoDate(new Date())}));}catch(error){this.dispatchEvent(new ShowToastEvent({title:"Budget assurance",message:this.messageFor(error),variant:"error",mode:"sticky"}));}finally{this.loading=false;} }
    async handlePreviewBulk() { const draft=this.bulkDraft;this.loading=true;try{this.bulkPreview=await previewBulk({entityType:draft.entityType,jsonRows:draft.jsonRows});}catch(error){this.dispatchEvent(new ShowToastEvent({title:"Bulk pre-validation",message:this.messageFor(error),variant:"error",mode:"sticky"}));}finally{this.loading=false;} }
    async handleCommitBulk() { const draft=this.bulkDraft;await this.execute("Commit controlled batch",()=>commitBulk({entityType:draft.entityType,jsonRows:draft.jsonRows,sourceFileName:draft.sourceFileName,commitMode:draft.commitMode})); }
    async handlePreviewConfiguration() { const draft=this.configurationDraft;this.loading=true;try{this.configurationPreview=await previewConfiguration({domain:draft.domain,code:draft.code,displayLabel:draft.displayLabel,valueType:draft.valueType,numericValue:draft.numericValue===undefined||draft.numericValue===""?null:Number(draft.numericValue),textValue:draft.textValue||null,booleanValue:Boolean(draft.booleanValue),attributesJson:draft.attributesJson||null,unit:draft.unit||null,effectiveFrom:draft.effectiveFrom,effectiveTo:draft.effectiveTo||null,reason:draft.reason});}catch(error){this.dispatchEvent(new ShowToastEvent({title:"Configuration preview",message:this.messageFor(error),variant:"error",mode:"sticky"}));}finally{this.loading=false;} }
    async handleSaveConfiguration() { const draft=this.configurationDraft;await this.execute("Save configuration draft",()=>saveConfigurationDraft({settingId:draft.settingId||null,domain:draft.domain,code:draft.code,displayLabel:draft.displayLabel,valueType:draft.valueType,numericValue:draft.numericValue===undefined||draft.numericValue===""?null:Number(draft.numericValue),textValue:draft.textValue||null,booleanValue:Boolean(draft.booleanValue),attributesJson:draft.attributesJson||null,unit:draft.unit||null,effectiveFrom:draft.effectiveFrom,effectiveTo:draft.effectiveTo||null,reason:draft.reason}));this.configurationPreview=undefined; }
    async handleRescheduleOperations() { await this.execute("Apply operations schedule",()=>rescheduleOperations()); }
    async handleAssignConfigurationRelease() { const settingId=this.configurationReleaseSettingId;this.configurationReleaseSettingId=undefined;await this.execute("Assign configuration release",()=>assignConfigurationRelease({settingId,releaseKey:this.configurationReleaseKey}));this.configurationReleasePreview=undefined; }
    async handlePreviewConfigurationRelease() { this.loading=true;try{this.configurationReleasePreview=await previewConfigurationRelease({releaseKey:this.configurationReleaseKey});}catch(error){this.dispatchEvent(new ShowToastEvent({title:"Atomic release preview",message:this.messageFor(error),variant:"error",mode:"sticky"}));}finally{this.loading=false;} }
    async handleSubmitConfigurationRelease() { await this.execute("Submit atomic configuration release",()=>submitConfigurationRelease({releaseKey:this.configurationReleaseKey}));this.configurationReleasePreview=undefined; }
    async handleApproveConfigurationRelease() { await this.execute("Activate atomic configuration release",()=>decideConfigurationRelease({releaseKey:this.configurationReleaseKey,approve:true,note:"Independent release assurance completed."}));this.configurationReleasePreview=undefined; }
    async handleRejectConfigurationRelease() { await this.execute("Reject atomic configuration release",()=>decideConfigurationRelease({releaseKey:this.configurationReleaseKey,approve:false,note:"Release requires correction before activation."}));this.configurationReleasePreview=undefined; }
    async handleRunRetention() { await this.execute("Run retention assurance",()=>runMockRetention({reason:"Authorized non-destructive EXL mock dry run from ADMUI-07."})); }
    async handleRunDemoActivation() { await this.execute("Run complete demo activation",()=>runDemoActivation({reason:"Authorized five-pillar sanitized activation rehearsal from ADMUI-01."})); }
    async handleConfigurationAction(event) { const {action,row}=event.detail;if(action.name==="override"||action.name==="edit"){const numberValue=row.valueType==="Number"?Number(row.value):undefined;this.configurationDraft={settingId:action.name==="edit"?row.id:null,domain:row.domain,code:row.code,displayLabel:row.label,valueType:row.valueType,numericValue:numberValue,textValue:row.valueType==="Text"?row.value:undefined,booleanValue:row.valueType==="Boolean"&&row.value==="true",attributesJson:row.valueType==="JSON"?row.value:undefined,unit:row.unit,effectiveFrom:action.name==="edit"&&row.effectiveFrom?row.effectiveFrom:this.isoDate(new Date()),effectiveTo:action.name==="edit"?row.effectiveTo:undefined,reason:`${action.name==="edit"?"Edit":"Override"} ${row.key} with reviewed EXL control evidence.`};this.configurationPreview=undefined;return;}if(action.name==="submit")return this.execute("Submit configuration",()=>submitConfiguration({settingId:row.id}));if(action.name==="approve")return this.execute("Activate configuration",()=>decideConfiguration({settingId:row.id,approve:true,note:this.configurationDraft.reason||"Validated configuration activation."}));if(action.name==="reject")return this.execute("Reject configuration",()=>decideConfiguration({settingId:row.id,approve:false,note:this.configurationDraft.reason||"Configuration requires correction."}));if(action.name==="rollback")return this.execute("Restore configuration",()=>rollbackConfiguration({priorSettingId:row.id,reason:this.configurationDraft.reason||"Controlled rollback from administration console."})); }

    async handleSubmitClaim() {
        const draft = this.skillDraft;
        await this.execute("Submit skill claim", () => submitSkillClaim({
            resourceId: draft.resourceId, capabilityId: draft.capabilityId, requestedLevel: Number(draft.requestedLevel),
            yearsExperience: Number(draft.yearsExperience), evidence: draft.evidence, idempotencyKey: `UI-CLAIM-${Date.now()}`
        }));
    }

    async handleAddCredential() {
        const draft = this.credentialDraft;
        await this.execute("Submit credential", () => addCredential({ resourceId: draft.resourceId, credentialId: draft.credentialId, credentialName: draft.credentialName, issuer: draft.issuer, issueDate: draft.issueDate || null, expiryDate: draft.expiryDate || null, evidenceUrl: draft.evidenceUrl || null }));
    }

    async handleTalentSearch() {
        const draft = this.talentDraft;
        this.loading = true;
        try {
            const rows = await searchCandidates({ capabilityId: draft.capabilityId || null, minimumLevel: Number(draft.minimumLevel), requestedRole: draft.requestedRole || null, startDate: draft.startDate, endDate: draft.endDate, dailyHours: Number(draft.dailyHours), tower: draft.tower || null, location: draft.location || null, requestedLimit: Number(draft.limitSize) });
            this.talentResults = rows.map((row) => ({ ...row, availabilityFraction: (row.availablePercent || 0) / 100, gapSummary: (row.gapReasons || []).join(" · ") || "No material availability gap" }));
        } catch (error) {
            this.dispatchEvent(new ShowToastEvent({ title: "Talent search", message: this.messageFor(error), variant: "error", mode: "sticky" }));
        } finally { this.loading = false; }
    }

    async handleCreateTimesheet() {
        await this.execute("Create timesheet", () => createTimesheet({ resourceId: this.timesheetDraft.resourceId, weekStart: this.timesheetDraft.weekStart }));
    }

    async handleSaveTimeEntry() {
        const draft = this.timeDraft;
        await this.execute("Save time entry", () => saveTimeEntry({ timesheetId: draft.timesheetId, allocationId: draft.allocationId, workDate: draft.workDate, hours: Number(draft.hours), workUnitId: null, comment: draft.comment }));
    }

    async handleRunScenario() {
        this.loading = true;
        try {
            const draft=this.scenarioDraft;
            this.scenarioResult=JSON.parse(await runWhatIf({scenarioJson:JSON.stringify({name:draft.name,startDate:draft.startDate,endDate:draft.endDate,headcountDelta:Number(draft.headcountDelta),billableAllocationPercent:Number(draft.billableAllocationPercent)})}));
        } catch (error) {
            this.dispatchEvent(new ShowToastEvent({ title: "What-if scenario", message: this.messageFor(error), variant: "error", mode: "sticky" }));
        } finally { this.loading = false; }
    }

    async handleNotificationLifecycleAction(event) {
        const { action, row } = event.detail;
        if (action.name === "closeAlert") await this.execute("Close accountable alert",()=>closeAlert({notificationId:row.Id,closureNote:this.alertClosureNote}));
    }

    async handleCapacityAction(event) {
        const {action,row}=event.detail;
        if(action.name==="view")return this.navigateToRecord(row.Id);
        this.decisionDraft={actionName:action.name,row:{...row,id:row.Id},title:action.label,note:""};
    }

    async handleRowAction(event) {
        const { action, row } = event.detail;
        if (action.name === "view") return this.navigateToRecord(row.id);
        if (action.name === "submitBudget") return this.execute(action.label, () => submitBudget({ budgetId: row.id }));
        if (action.name === "createBudgetVersion") return this.execute(action.label, () => createBudgetVersion({ sourceBudgetId: row.id }));
        if (action.name === "submitTimesheet") return this.execute(action.label, () => submitTimesheet({ timesheetId: row.id }));
        this.decisionDraft = { actionName: action.name, row, title: action.label, note: "", approvedLevel: row.value ? String(row.value) : "3" };
    }

    async handleConfirmDecision() {
        const draft = this.decisionDraft;
        if (this.decisionNoteRequired && !draft.note?.trim()) {
            this.dispatchEvent(new ShowToastEvent({ title: draft.title, message: "Decision evidence is required.", variant: "error" }));
            return;
        }
        const operations = {
            accept: () => decideStaffingRequest({ requestId: draft.row.id, accept: true, note: draft.note || null, activeRole: this.activeRole }),
            decline: () => decideStaffingRequest({ requestId: draft.row.id, accept: false, note: draft.note, activeRole: this.activeRole }),
            approveClaim: () => decideSkillClaim({ claimId: draft.row.id, approve: true, approvedLevel: Number(draft.approvedLevel), note: draft.note || null }),
            rejectClaim: () => decideSkillClaim({ claimId: draft.row.id, approve: false, approvedLevel: null, note: draft.note }),
            approveBudget: () => decideBudget({ budgetId: draft.row.id, approve: true, note: draft.note || null, activeRole: this.activeRole }),
            rejectBudget: () => decideBudget({ budgetId: draft.row.id, approve: false, note: draft.note, activeRole: this.activeRole }),
            approveTimesheet: () => decideTimesheet({ timesheetId: draft.row.id, approve: true, note: draft.note || null }),
            rejectTimesheet: () => decideTimesheet({ timesheetId: draft.row.id, approve: false, note: draft.note }),
            correctTimesheet: () => createTimeCorrection({ timesheetId: draft.row.id, reason: draft.note }),
            approveOverallocation: () => decideOverallocation({ allocationId: draft.row.id, approve: true, note: draft.note }),
            rejectOverallocation: () => decideOverallocation({ allocationId: draft.row.id, approve: false, note: draft.note })
        };
        this.decisionDraft = undefined;
        if (operations[draft.actionName]) await this.execute(draft.title, operations[draft.actionName]);
    }

    async execute(title, operation) {
        this.loading = true;
        try {
            const result = await operation();
            this.dispatchEvent(new ShowToastEvent({ title, message: result.message, variant: result.success ? "success" : "error" }));
            await this.loadData();
        } catch (error) {
            this.dispatchEvent(new ShowToastEvent({ title, message: this.messageFor(error), variant: "error", mode: "sticky" }));
            this.loading = false;
        }
    }

    selectAllocation(item) { if (!item) return; const splitDate=this.addDays(item.Start_Date__c,1);this.allocationDraft = { ...this.allocationDraft, allocationId:item.Id,startDate:item.Start_Date__c,endDate:item.End_Date__c,effectiveEndDate:item.End_Date__c,splitDate:splitDate<=item.End_Date__c?splitDate:item.Start_Date__c,dailyHours:item.Daily_Hours__c,firstDailyHours:item.Daily_Hours__c,secondDailyHours:item.Daily_Hours__c,roleName:item.Role__c,classification:item.Classification__c,responsibleOwnerId:item.Responsible_Owner__c,reviewDate:item.Review_Date__c }; this.planningDraft = { ...this.planningDraft, resourceId:item.Resource__c,startDate:item.Start_Date__c,endDate:item.End_Date__c,effort:item.Daily_Hours__c,excludedAllocationId:item.Id }; }
    selectBudget(item) { if (!item) return; this.budgetDraft = { ...this.budgetDraft,budgetId:item.Id,revenue:item.Revenue__c||0,upliftPercent:item.Uplift_Percent__c||0,effortContingencyPercent:item.Effort_Contingency_Percent__c||0,expenseContingencyPercent:item.Expense_Contingency_Percent__c||0,travelRate:item.Travel_Rate__c||0,onsiteMonths:item.Onsite_Months__c||0 };this.budgetLineDraft={...this.budgetLineDraft,roleStart:item.Engagement__r?.Start_Date__c,roleEnd:item.Engagement__r?.End_Date__c};this.budgetImportPreview=undefined;this.budgetAssuranceResult=undefined; }

    navigateToRecord(recordId) {
        this[NavigationMixin.Navigate]({ type: "standard__recordPage", attributes: { recordId, actionName: "view" } });
    }

    messageFor(error) { return error?.body?.message || error?.message || "Resource 360 could not complete the operation."; }
    money(value) { return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", notation: "compact", maximumFractionDigits: 1 }).format(value || 0); }
    isoDate(value) { return value.toISOString().slice(0, 10); }
    addDays(isoValue,days) { const value=new Date(`${isoValue}T00:00:00.000Z`);value.setUTCDate(value.getUTCDate()+days);return this.isoDate(value); }
}
