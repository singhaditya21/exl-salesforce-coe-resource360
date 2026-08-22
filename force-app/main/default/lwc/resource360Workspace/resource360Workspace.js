import { LightningElement } from "lwc";
import { NavigationMixin } from "lightning/navigation";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import getWorkspaceData from "@salesforce/apex/Resource360Service.getWorkspaceData";
import seedDemoData from "@salesforce/apex/Resource360DemoData.seed";
import createStaffingRequest from "@salesforce/apex/Resource360Service.createStaffingRequest";
import decideStaffingRequest from "@salesforce/apex/Resource360Service.decideStaffingRequest";
import submitBudget from "@salesforce/apex/Resource360Service.submitBudget";
import decideBudget from "@salesforce/apex/Resource360Service.decideBudget";
import submitSkillClaim from "@salesforce/apex/Resource360Service.submitSkillClaim";
import decideSkillClaim from "@salesforce/apex/Resource360Service.decideSkillClaim";
import submitTimesheet from "@salesforce/apex/Resource360Service.submitTimesheet";
import decideTimesheet from "@salesforce/apex/Resource360Service.decideTimesheet";
import { MODULES, SCREENS } from "./screenCatalog";

const RECORD_ACTION = { type: "action", typeAttributes: { rowActions: { fieldName: "rowActions" } } };

export default class Resource360Workspace extends NavigationMixin(LightningElement) {
    selectedModule = "global";
    selectedScreenId = "GLB-02";
    data = {};
    loading = true;
    errorMessage;
    activeRole = "COE Staffer";
    staffingDraft = { requestedRole: "Salesforce Technical Architect", classification: "Billing", dailyHours: 4 };
    skillDraft = { requestedLevel: "3", yearsExperience: 3, evidence: "Sanitized delivery evidence for manager review." };

    connectedCallback() {
        const start = new Date();
        start.setDate(start.getDate() + 7);
        const end = new Date(start);
        end.setDate(end.getDate() + 90);
        this.staffingDraft = { ...this.staffingDraft, startDate: this.isoDate(start), endDate: this.isoDate(end) };
        this.loadData();
    }

    async loadData() {
        this.loading = true;
        this.errorMessage = undefined;
        try {
            this.data = JSON.parse(await getWorkspaceData());
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

    get screenCountLabel() {
        return `${SCREENS.length} governed screens`;
    }

    get generatedLabel() {
        return this.data.generatedAt ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(this.data.generatedAt)) : "Not loaded";
    }

    get summaryCards() {
        const budgets = this.data.budgets || [];
        const requests = this.data.staffingRequests || [];
        const resources = this.data.resources || [];
        const timesheets = this.data.timesheets || [];
        const approvedRevenue = budgets.filter((item) => item.State__c === "Approved").reduce((total, item) => total + (item.Revenue__c || 0), 0);
        return [
            { label: "Active resources", value: resources.filter((item) => item.Status__c === "Active").length, note: `${resources.length} synchronized profiles` },
            { label: "Pending staffing", value: requests.filter((item) => item.State__c === "Pending").length, note: "Soft demand awaiting Staffer" },
            { label: "Approved revenue", value: this.money(approvedRevenue), note: "Current approved budget versions" },
            { label: "Time approvals", value: timesheets.filter((item) => item.Status__c === "Submitted").length, note: "Employee weeks requiring review" }
        ];
    }

    get roleOptions() {
        return ["Practitioner", "Reporting Manager", "Project Manager", "COE Staffer", "Budget Approver", "Administrator"].map((value) => ({ label: value, value }));
    }

    get engagementOptions() {
        return (this.data.engagements || []).map((item) => ({ label: `${item.Name} · ${item.Engagement_ID__c}`, value: item.Id }));
    }

    get resourceOptions() {
        return (this.data.resources || []).map((item) => ({ label: `${item.Preferred_Name__c} · ${item.Primary_Role__c || item.Tower__c}`, value: item.Id }));
    }

    get capabilityOptions() {
        return (this.data.capabilities || []).filter((item) => item.Active__c).map((item) => ({ label: `${item.Name} · ${item.Tower__c || item.Type__c}`, value: item.Id }));
    }

    get classificationOptions() {
        return ["Billing", "Contractual Shadow", "WAR", "IFB/PO Awaited", "Blocked", "Value Consulting/Pre-sales", "Shadow Trainee", "Shadow Lateral", "Leadership/PMO", "Testing COE", "DLP COE", "Regression", "Training", "Investment/COE", "AFB", "NAFB"].map((value) => ({ label: value, value }));
    }

    get levelOptions() {
        return [
            { label: "1 · Beginner", value: "1" }, { label: "2 · Intermediate", value: "2" },
            { label: "3 · Advanced", value: "3" }, { label: "4 · SME", value: "4" }
        ];
    }

    get showStaffingForm() { return this.selectedScreenId === "STFUI-01"; }
    get showSkillsForm() { return this.selectedScreenId === "SKLUI-10"; }
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
    budgetActions(item) { return item.State__c === "Draft" || item.State__c === "Rejected" || item.State__c === "Invalidated" ? [{ label: "Submit budget", name: "submitBudget" }, { label: "Open record", name: "view" }] : item.State__c === "Pending Approval" ? [{ label: "Approve budget", name: "approveBudget" }, { label: "Reject budget", name: "rejectBudget" }, { label: "Open record", name: "view" }] : [{ label: "Open record", name: "view" }]; }
    timesheetActions(item) { return item.Status__c === "Draft" || item.Status__c === "Rejected" ? [{ label: "Submit week", name: "submitTimesheet" }, { label: "Open record", name: "view" }] : item.Status__c === "Submitted" ? [{ label: "Approve week", name: "approveTimesheet" }, { label: "Reject week", name: "rejectTimesheet" }, { label: "Open record", name: "view" }] : [{ label: "Open record", name: "view" }]; }

    handleModule(event) {
        this.selectedModule = event.currentTarget.dataset.module;
        this.selectedScreenId = SCREENS.find((screen) => screen.module === this.selectedModule)?.id;
    }

    handleScreen(event) { this.selectedScreenId = event.currentTarget.dataset.screen; }
    handleRole(event) { this.activeRole = event.detail.value; }
    handleStaffingInput(event) { this.staffingDraft = { ...this.staffingDraft, [event.target.dataset.field]: event.detail?.value ?? event.target.value }; }
    handleSkillInput(event) { this.skillDraft = { ...this.skillDraft, [event.target.dataset.field]: event.detail?.value ?? event.target.value }; }

    async handleSeed() { await this.execute("Load demo data", () => seedDemoData()); }

    async handleCreateStaffing() {
        const draft = this.staffingDraft;
        await this.execute("Submit staffing request", () => createStaffingRequest({
            engagementId: draft.engagementId, resourceId: draft.resourceId, requestedRole: draft.requestedRole,
            classification: draft.classification, startDate: draft.startDate, endDate: draft.endDate,
            dailyHours: Number(draft.dailyHours), idempotencyKey: `UI-${Date.now()}`
        }));
    }

    async handleSubmitClaim() {
        const draft = this.skillDraft;
        await this.execute("Submit skill claim", () => submitSkillClaim({
            resourceId: draft.resourceId, capabilityId: draft.capabilityId, requestedLevel: Number(draft.requestedLevel),
            yearsExperience: Number(draft.yearsExperience), evidence: draft.evidence, idempotencyKey: `UI-CLAIM-${Date.now()}`
        }));
    }

    async handleRowAction(event) {
        const { action, row } = event.detail;
        if (action.name === "view") return this.navigateToRecord(row.id);
        const operations = {
            accept: () => decideStaffingRequest({ requestId: row.id, accept: true, note: "Accepted from Resource 360 workspace.", activeRole: this.activeRole }),
            decline: () => decideStaffingRequest({ requestId: row.id, accept: false, note: "Declined after governed demo review.", activeRole: this.activeRole }),
            approveClaim: () => decideSkillClaim({ claimId: row.id, approve: true, approvedLevel: Number(row.value), note: "Approved against Resource 360 proficiency descriptors." }),
            rejectClaim: () => decideSkillClaim({ claimId: row.id, approve: false, approvedLevel: null, note: "Additional evidence required." }),
            submitBudget: () => submitBudget({ budgetId: row.id }),
            approveBudget: () => decideBudget({ budgetId: row.id, approve: true, note: "Approved in Resource 360.", activeRole: this.activeRole }),
            rejectBudget: () => decideBudget({ budgetId: row.id, approve: false, note: "Commercial assumptions require revision.", activeRole: this.activeRole }),
            submitTimesheet: () => submitTimesheet({ timesheetId: row.id }),
            approveTimesheet: () => decideTimesheet({ timesheetId: row.id, approve: true, note: "Allocation-aligned time approved." }),
            rejectTimesheet: () => decideTimesheet({ timesheetId: row.id, approve: false, note: "Please correct the highlighted week." })
        };
        if (operations[action.name]) await this.execute(action.label, operations[action.name]);
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
