import { LightningElement, wire } from "lwc";
import { CurrentPageReference, NavigationMixin } from "lightning/navigation";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import getWorkspaceData from "@salesforce/apex/Resource360Service.getWorkspaceData";
import seedDemoData from "@salesforce/apex/Resource360DemoData.seed";
import createStaffingRequestV2 from "@salesforce/apex/Resource360Service.createStaffingRequestV2";
import decideStaffingRequest from "@salesforce/apex/Resource360Service.decideStaffingRequest";
import submitBudget from "@salesforce/apex/Resource360Service.submitBudget";
import decideBudget from "@salesforce/apex/Resource360Service.decideBudget";
import createBudgetVersion from "@salesforce/apex/Resource360Service.createBudgetVersion";
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

const SCREENS = governedScreens(RAW_SCREENS);

const RECORD_ACTION = { type: "action", typeAttributes: { rowActions: { fieldName: "rowActions" } } };

export default class Resource360Workspace extends NavigationMixin(LightningElement) {
    selectedModule = "global";
    selectedScreenId = "GLB-02";
    data = {};
    loading = true;
    errorMessage;
    activeRole;
    staffingDraft = { requestedRole: "Salesforce Technical Architect", classification: "Billing", dailyHours: 4, controlReason: "Time-bound delivery control" };
    skillDraft = { requestedLevel: "3", yearsExperience: 3, evidence: "Sanitized delivery evidence for manager review." };
    credentialDraft = { issuer: "Salesforce", state: "Unverified" };
    talentDraft = { minimumLevel: "3", requestedRole: "Salesforce Architect", dailyHours: 4, limitSize: 25 };
    timeDraft = { hours: 4, comment: "Allocation-aligned delivery work." };
    timesheetDraft = {};
    talentResults = [];
    decisionDraft;

    @wire(CurrentPageReference)
    setCurrentPageReference(pageReference) {
        const requested = pageReference?.state?.c__screen;
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
        const today = new Date();
        this.timeDraft = { ...this.timeDraft, workDate: this.isoDate(today) };
        const monday = new Date(today);
        monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
        this.timesheetDraft = { weekStart: this.isoDate(monday) };
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
    }

    get modules() {
        return MODULES.map((module) => ({
            ...module,
            count: SCREENS.filter((screen) => screen.module === module.id).length,
            buttonClass: `module-button ${module.id === this.selectedModule ? "module-button_active" : ""}`
        }));
    }

    get moduleScreens() {
        return SCREENS.filter((screen) => screen.module === this.selectedModule).map((screen) => ({
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

    get summaryCards() {
        const metrics = this.data.metrics || {};
        return [
            { label: "Active resources", value: metrics.activeHeadcount ?? 0, note: `${metrics.utilizationPercent ?? 0}% current allocation utilization` },
            { label: "Pending staffing", value: metrics.pendingStaffing ?? 0, note: `${metrics.overdueStaffing ?? 0} beyond configured SLA` },
            { label: "Approved revenue", value: this.money(metrics.approvedRevenue || 0), note: `${metrics.approvedMarginPercent ?? 0}% weighted gross margin` },
            { label: "Time approvals", value: metrics.overdueTimesheets ?? 0, note: `${metrics.approvedActualHours30Days ?? 0} approved hours · 30 days` }
        ];
    }

    get roleOptions() {
        return (this.data.activeRoles || []).map((value) => ({ label: value, value }));
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

    get classificationOptions() {
        return (this.data.classifications || []).map((value) => ({ label: value, value }));
    }

    get levelOptions() {
        return [
            { label: "1 · Beginner", value: "1" }, { label: "2 · Intermediate", value: "2" },
            { label: "3 · Advanced", value: "3" }, { label: "4 · SME", value: "4" }
        ];
    }

    get showStaffingForm() { return this.selectedScreenId === "STFUI-01"; }
    get showTalentSearch() { return ["STFUI-02", "STFUI-03", "STFUI-06", "STFUI-07", "SKLUI-16", "SKLUI-17"].includes(this.selectedScreenId); }
    get showSkillsForm() { return this.selectedScreenId === "SKLUI-10"; }
    get showCredentialForm() { return this.selectedScreenId === "SKLUI-11"; }
    get showTimesheetCreate() { return this.selectedScreenId === "TIMEUI-01"; }
    get showTimeEntryForm() { return this.selectedScreenId === "TIMEUI-02"; }
    get hasTalentResults() { return this.talentResults.length > 0; }
    get talentColumns() { return [{ label: "Candidate", fieldName: "name" }, { label: "Role", fieldName: "role" }, { label: "Tower", fieldName: "tower" }, { label: "Location", fieldName: "location" }, { label: "Level", fieldName: "approvedLevel", type: "number" }, { label: "Availability", fieldName: "availabilityFraction", type: "percent", typeAttributes: { minimumFractionDigits: 0 } }, { label: "Fit score", fieldName: "score", type: "number" }, { label: "Explanation", fieldName: "explanation", wrapText: true }]; }
    get showDecisionPanel() { return Boolean(this.decisionDraft); }
    get decisionRequiresLevel() { return this.decisionDraft?.actionName === "approveClaim"; }
    get decisionNoteRequired() { return ["decline", "rejectClaim", "rejectBudget", "rejectTimesheet", "correctTimesheet"].includes(this.decisionDraft?.actionName); }
    get hasRows() { return this.tableRows.length > 0; }

    get tableColumns() {
        const columns = {
            global: [this.linkColumn("Notification", "label"), { label: "Severity", fieldName: "status" }, { label: "Message", fieldName: "detail", wrapText: true }, { label: "Occurred", fieldName: "date", type: "date" }],
            engagement: [this.linkColumn("Engagement", "label"), { label: "ID", fieldName: "secondary" }, { label: "Status", fieldName: "status" }, { label: "Tower", fieldName: "detail" }, { label: "Start", fieldName: "date", type: "date" }, { label: "End", fieldName: "endDate", type: "date" }],
            staffing: [this.linkColumn("Request", "label"), { label: "Engagement", fieldName: "secondary" }, { label: "Candidate", fieldName: "person" }, { label: "Role", fieldName: "detail" }, { label: "State", fieldName: "status" }, { label: "Daily hours", fieldName: "value", type: "number" }, RECORD_ACTION],
            skills: [this.linkColumn("Claim", "label"), { label: "Practitioner", fieldName: "person" }, { label: "Capability", fieldName: "secondary" }, { label: "Requested", fieldName: "value", type: "number" }, { label: "State", fieldName: "status" }, RECORD_ACTION],
            budget: [this.linkColumn("Budget", "label"), { label: "Engagement", fieldName: "secondary" }, { label: "Version", fieldName: "value", type: "number" }, { label: "State", fieldName: "status" }, { label: "Revenue", fieldName: "money", type: "currency", typeAttributes: { currencyCode: "INR" } }, { label: "Margin", fieldName: "percent", type: "percent", typeAttributes: { minimumFractionDigits: 1 } }, RECORD_ACTION],
            timesheet: [this.linkColumn("Timesheet", "label"), { label: "Practitioner", fieldName: "person" }, { label: "Week", fieldName: "date", type: "date" }, { label: "State", fieldName: "status" }, RECORD_ACTION],
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
        if (this.selectedModule === "timesheet") return (this.data.timesheets || []).map((item) => ({ ...this.row(item, item.Name, item.Decision_Note__c, item.Status__c, null, item.Week_Start__c, null, item.Resource__r?.Preferred_Name__c), rowActions: this.timesheetActions(item) }));
        if (this.selectedModule === "command") return (this.data.allocations || []).map((item) => ({ ...this.row(item, item.Name, item.Engagement__r?.Name, item.Classification__c, item.Role__c, item.Start_Date__c, item.Daily_Hours__c, item.Resource__r?.Preferred_Name__c), percent: (item.Allocation_Percent__c || 0) / 100 }));
        if (this.selectedModule === "admin") return (this.data.auditEvents || []).map((item) => this.row(item, item.Name, `${item.Entity_Type__c} · ${item.Entity_ID__c}`, item.Action__c, item.Detail__c, item.Occurred_At__c, item.Entity_Version__c, item.Actor__r?.Name));
        if (this.selectedModule === "ai") return (this.data.resources || []).map((item) => ({ ...this.row(item, item.Preferred_Name__c, item.Primary_Role__c, item.Tower__c, item.Location__c, null, null, null), percent: (item.Available_Percent__c || 0) / 100 }));
        return (this.data.notifications || []).map((item) => this.row(item, item.Title__c, null, item.Severity__c, item.Message__c, item.Occurred_At__c));
    }

    linkColumn(label, fieldName) {
        return { label, fieldName: "url", type: "url", typeAttributes: { label: { fieldName }, target: "_self" } };
    }

    row(item, label, secondary, status, detail, date, value, person, endDate) {
        return { id: item.Id, url: `/lightning/r/${this.objectForModule()}/${item.Id}/view`, label, secondary, status, detail, date, value, person, endDate };
    }

    objectForModule() {
        return { global: "R360_Notification__c", engagement: "Engagement__c", staffing: "Staffing_Request__c", skills: "Skill_Claim__c", budget: "Budget__c", timesheet: "Timesheet__c", command: "Allocation__c", admin: "R360_Audit_Event__c", ai: "Resource__c" }[this.selectedModule];
    }

    staffingActions(item) { return item.State__c === "Pending" ? [{ label: "Accept request", name: "accept" }, { label: "Decline request", name: "decline" }, { label: "Open record", name: "view" }] : [{ label: "Open record", name: "view" }]; }
    skillActions(item) { return item.State__c === "Pending" ? [{ label: "Approve requested level", name: "approveClaim" }, { label: "Reject claim", name: "rejectClaim" }, { label: "Open record", name: "view" }] : [{ label: "Open record", name: "view" }]; }
    budgetActions(item) { return item.State__c === "Draft" || item.State__c === "Rejected" || item.State__c === "Invalidated" ? [{ label: "Submit budget", name: "submitBudget" }, { label: "Open record", name: "view" }] : item.State__c === "Pending Approval" ? [{ label: "Approve current step", name: "approveBudget" }, { label: "Reject budget", name: "rejectBudget" }, { label: "Open record", name: "view" }] : [{ label: "Create next version", name: "createBudgetVersion" }, { label: "Open record", name: "view" }]; }
    timesheetActions(item) { return item.Status__c === "Draft" || item.Status__c === "Rejected" ? [{ label: "Submit week", name: "submitTimesheet" }, { label: "Open record", name: "view" }] : item.Status__c === "Submitted" ? [{ label: "Approve week", name: "approveTimesheet" }, { label: "Reject week", name: "rejectTimesheet" }, { label: "Open record", name: "view" }] : [{ label: "Create correction", name: "correctTimesheet" }, { label: "Open record", name: "view" }]; }

    handleModule(event) {
        this.selectedModule = event.currentTarget.dataset.module;
        this.selectedScreenId = SCREENS.find((screen) => screen.module === this.selectedModule)?.id;
    }

    handleScreen(event) {
        this.selectedScreenId = event.currentTarget.dataset.screen;
        this[NavigationMixin.Navigate]({ type: "standard__navItemPage", attributes: { apiName: "Resource360_Workspace" }, state: { c__screen: this.selectedScreenId } });
    }
    handleRole(event) { this.activeRole = event.detail.value; }
    handleStaffingInput(event) { this.staffingDraft = { ...this.staffingDraft, [event.target.dataset.field]: event.detail?.value ?? event.target.value }; }
    handleSkillInput(event) { this.skillDraft = { ...this.skillDraft, [event.target.dataset.field]: event.detail?.value ?? event.target.value }; }
    handleCredentialInput(event) { this.credentialDraft = { ...this.credentialDraft, [event.target.dataset.field]: event.detail?.value ?? event.target.value }; }
    handleTalentInput(event) { this.talentDraft = { ...this.talentDraft, [event.target.dataset.field]: event.detail?.value ?? event.target.value }; }
    handleTimeInput(event) { this.timeDraft = { ...this.timeDraft, [event.target.dataset.field]: event.detail?.value ?? event.target.value }; }
    handleTimesheetInput(event) { this.timesheetDraft = { ...this.timesheetDraft, [event.target.dataset.field]: event.detail?.value ?? event.target.value }; }
    handleDecisionInput(event) { this.decisionDraft = { ...this.decisionDraft, [event.target.dataset.field]: event.detail?.value ?? event.target.value }; }
    handleCancelDecision() { this.decisionDraft = undefined; }

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
            this.talentResults = rows.map((row) => ({ ...row, availabilityFraction: (row.availablePercent || 0) / 100 }));
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
            correctTimesheet: () => createTimeCorrection({ timesheetId: draft.row.id, reason: draft.note })
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

    navigateToRecord(recordId) {
        this[NavigationMixin.Navigate]({ type: "standard__recordPage", attributes: { recordId, actionName: "view" } });
    }

    messageFor(error) { return error?.body?.message || error?.message || "Resource 360 could not complete the operation."; }
    money(value) { return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", notation: "compact", maximumFractionDigits: 1 }).format(value || 0); }
    isoDate(value) { return value.toISOString().slice(0, 10); }
}
