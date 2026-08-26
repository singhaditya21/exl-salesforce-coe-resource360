import { LightningElement, api } from "lwc";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import getProjectOptions from "@salesforce/apex/Resource360ProjectService.getProjectOptions";
import getPortfolioOptions from "@salesforce/apex/Resource360ProjectService.getPortfolioOptions";
import getProjectPlan from "@salesforce/apex/Resource360ProjectService.getProjectPlan";
import createProject from "@salesforce/apex/Resource360ProjectService.createProject";
import createCommercialChange from "@salesforce/apex/Resource360ProjectService.createCommercialChange";
import saveCommercialLine from "@salesforce/apex/Resource360ProjectService.saveCommercialLine";
import saveWorkUnit from "@salesforce/apex/Resource360ProjectService.saveWorkUnit";
import rescheduleWorkUnit from "@salesforce/apex/Resource360ProjectService.rescheduleWorkUnit";
import saveDependency from "@salesforce/apex/Resource360ProjectService.saveDependency";
import updateProgress from "@salesforce/apex/Resource360ProjectService.updateProgress";
import acceptDeliverable from "@salesforce/apex/Resource360ProjectService.acceptDeliverable";
import saveRisk from "@salesforce/apex/Resource360ProjectService.saveRisk";
import closeRisk from "@salesforce/apex/Resource360ProjectService.closeRisk";
import createCloseoutDraft from "@salesforce/apex/Resource360ProjectService.createCloseoutDraft";
import submitCloseout from "@salesforce/apex/Resource360ProjectService.submitCloseout";
import decideCloseout from "@salesforce/apex/Resource360ProjectService.decideCloseout";

const DAY = 86400000;
const emptyTask = () => ({ code: "", name: "", phase: "Build", sequence: 80, startDate: "", endDate: "", plannedHours: 80, dailyHours: 4, assignedResourceId: "", milestone: false, deliverable: true, acceptanceRequired: false });
const emptyIntake = () => ({ code: "", name: "", portfolioId: "", industry: "", tower: "", startDate: "", endDate: "", revenueType: "Time and Materials", currencyCode: "INR", contractExternalId: "", contractValue: 0, correlationId: "" });
const emptyCommercial = () => ({ parentReferenceId: "", externalId: "", referenceType: "Amendment", value: 0, validFrom: "", validTo: "", changeReason: "" });
const emptyCommercialLine = () => ({ referenceId: "", externalId: "", lineType: "Deliverable", description: "", sequence: 10, value: 0, deliveryDate: "", acceptanceRequired: true, workUnitId: "" });

export default class Resource360ProjectWorkbench extends LightningElement {
    @api recordId;
    projects = [];
    portfolios = [];
    projectId;
    plan;
    taskRows = [];
    axisLabels = [];
    zoom = "Month";
    busy = false;
    error;
    draggedTaskId;
    dragMode = "move";
    selectedTaskId;
    selectedRiskId;
    timelineDays = 1;
    ganttStyle = "--timeline-width: 900px; min-width: 1160px;";
    intakeDraft = emptyIntake();
    commercialDraft = emptyCommercial();
    commercialLineDraft = emptyCommercialLine();
    edit = { startDate: "", endDate: "", percentComplete: 0, status: "Active", note: "", cascade: true, acceptanceNote: "" };
    taskDraft = emptyTask();
    dependencyDraft = { predecessorId: "", successorId: "", dependencyType: "Finish-to-Start", lagDays: 0 };
    riskDraft = { externalId: "", title: "", description: "", severity: "Medium", dueDate: "", mitigation: "" };
    closeoutDraft = { completionDate: "", lessonsLearned: "", customerAcceptanceNote: "" };
    closeoutDecisionNote = "All completion gates, final actuals, commercial acceptance and resource release were independently reviewed.";

    connectedCallback() { this.initialise(); }

    async initialise() {
        this.busy = true;
        try {
            [this.projects, this.portfolios] = await Promise.all([getProjectOptions(), getPortfolioOptions()]);
            if (!this.intakeDraft.portfolioId && this.portfolios.length) this.intakeDraft = { ...this.intakeDraft, portfolioId: this.portfolios[0].Id };
            this.projectId = this.recordId || this.projects.find((item) => item.Engagement_ID__c === "ENG-1001")?.Id || this.projects[0]?.Id;
            if (this.projectId) await this.loadPlan();
        } catch (error) { this.fail(error); } finally { this.busy = false; }
    }

    async loadPlan() {
        const raw = await getProjectPlan({ engagementId: this.projectId });
        this.plan = JSON.parse(raw);
        this.closeoutDraft = {
            completionDate: this.plan.closeout?.Completion_Date__c || this.plan.engagement.End_Date__c,
            lessonsLearned: this.plan.closeout?.Lessons_Learned__c || "Preserve early architecture validation and weekly skill-fit reviews.",
            customerAcceptanceNote: this.plan.closeout?.Customer_Acceptance_Note__c || "Final customer acceptance will be attached after the production-readiness gate."
        };
        const references = this.plan.commercialReferences || [];
        const latestReference = references[references.length - 1];
        if (latestReference && !this.commercialDraft.parentReferenceId) this.commercialDraft = { ...this.commercialDraft, parentReferenceId: latestReference.Id, validFrom: this.plan.engagement.Start_Date__c, validTo: this.plan.engagement.End_Date__c };
        if (latestReference && !this.commercialLineDraft.referenceId) this.commercialLineDraft = { ...this.commercialLineDraft, referenceId: latestReference.Id, deliveryDate: this.plan.engagement.End_Date__c };
        this.buildGantt();
        if (this.selectedTaskId && this.taskRows.some((task) => task.Id === this.selectedTaskId)) this.selectTask(this.selectedTaskId);
    }

    buildGantt() {
        const tasks = this.plan?.tasks || [];
        if (!tasks.length) { this.taskRows = []; this.axisLabels = []; return; }
        const start = new Date(Math.min(...tasks.map((item) => this.utc(item.Start_Date__c))));
        const end = new Date(Math.max(...tasks.map((item) => this.utc(item.End_Date__c))));
        this.timelineDays = Math.max(1, Math.round((end - start) / DAY) + 1);
        const tickDays = { Week: 14, Month: 30, Quarter: 91, Year: 365 }[this.zoom];
        const width = Math.max(900, Math.ceil(this.timelineDays / tickDays) * 150);
        this.ganttStyle = `--timeline-width: ${width}px; min-width: ${width + 260}px;`;
        const taskById = new Map(tasks.map((task) => [task.Id, task]));
        const incoming = new Map();
        for (const link of this.plan.dependencies || []) {
            const predecessor = taskById.get(link.Predecessor__c);
            if (!incoming.has(link.Successor__c)) incoming.set(link.Successor__c, []);
            incoming.get(link.Successor__c).push(`${predecessor?.Work_Unit_Code__c || "Task"} · ${link.Dependency_Type__c} +${link.Lag_Days__c || 0}d`);
        }
        this.taskRows = tasks.map((task) => {
            const offset = Math.round((this.utc(task.Start_Date__c) - start.getTime()) / DAY);
            const duration = Math.max(1, Math.round((this.utc(task.End_Date__c) - this.utc(task.Start_Date__c)) / DAY) + 1);
            const left = offset / this.timelineDays * 100;
            const widthPercent = Math.max(duration / this.timelineDays * 100, 0.65);
            return {
                ...task,
                actualHours: this.plan.actualHoursByWorkUnit?.[task.Id] || 0,
                resourceName: task.Assigned_Resource__r?.Preferred_Name__c || "Unassigned",
                dependencyText: incoming.get(task.Id)?.join(" · ") || "No predecessor",
                barClass: `task-bar ${task.Critical_Path__c ? "task-bar_critical" : ""} ${task.Milestone__c ? "task-bar_milestone" : ""}`,
                barStyle: `left:${left}%;width:${widthPercent}%;`,
                progressStyle: `width:${task.Percent_Complete__c || 0}%;`,
                rowClass: task.Id === this.selectedTaskId ? "gantt-row gantt-row_selected" : "gantt-row"
            };
        });
        const labels = [];
        for (let offset = 0; offset < this.timelineDays; offset += tickDays) {
            const value = new Date(start.getTime() + offset * DAY);
            labels.push({ key: `${this.zoom}-${offset}`, label: this.formatAxis(value), style: `left:${offset / this.timelineDays * 100}%;` });
        }
        this.axisLabels = labels;
        this.timelineStart = start;
    }

    get projectOptions() { return this.projects.map((item) => ({ label: `${item.Engagement_ID__c} · ${item.Name}`, value: item.Id })); }
    get portfolioOptions() { return this.portfolios.map((item) => ({ label: `${item.Portfolio_ID__c} · ${item.Name}`, value: item.Id })); }
    get zoomOptions() { return (this.plan?.zoomOptions || ["Week", "Month", "Quarter", "Year"]).map((value) => ({ label: value, value })); }
    get taskOptions() { return this.taskRows.map((item) => ({ label: `${item.Work_Unit_Code__c} · ${item.Name}`, value: item.Id })); }
    get resourceOptions() {
        const seen = new Set(); const options = [{ label: "Unassigned", value: "" }];
        for (const item of this.plan?.allocations || []) if (item.Resource__c && !seen.has(item.Resource__c)) { seen.add(item.Resource__c); options.push({ label: `${item.Resource__r?.Preferred_Name__c} · ${item.Role__c}`, value: item.Resource__c }); }
        return options;
    }
    get commercialReferenceOptions() { return (this.plan?.commercialReferences || []).map((item) => ({ label: `${item.External_ID__c} · v${item.Version__c}`, value: item.Id })); }
    get statusOptions() { return ["Planned", "Active", "Complete", "Cancelled"].map((value) => ({ label: value, value })); }
    get dependencyTypeOptions() { return ["Finish-to-Start", "Start-to-Start", "Finish-to-Finish", "Start-to-Finish"].map((value) => ({ label: value, value })); }
    get severityOptions() { return ["Low", "Medium", "High", "Critical"].map((value) => ({ label: value, value })); }
    get revenueTypeOptions() { return ["Time and Materials", "Fixed Price", "Managed Services"].map((value) => ({ label: value, value })); }
    get commercialChangeTypeOptions() { return ["Amendment", "Change Order"].map((value) => ({ label: value, value })); }
    get commercialLineTypeOptions() { return ["Deliverable", "Service", "Acceptance Milestone"].map((value) => ({ label: value, value })); }
    get selectedTask() { return this.taskRows.find((item) => item.Id === this.selectedTaskId); }
    get selectedRisk() { return (this.plan?.risks || []).find((item) => item.Id === this.selectedRiskId); }
    get hasTasks() { return this.taskRows.length > 0; }
    get hasRisks() { return (this.plan?.risks || []).length > 0; }
    get hasCommercials() { return (this.plan?.commercialReferences || []).length > 0; }
    get contractValue() { return (this.plan?.commercialReferences || []).reduce((sum, item) => sum + (item.Value__c || 0), 0); }
    get budgetState() { return this.plan?.budget?.State__c || "Not budgeted"; }
    get budgetVersion() { return this.plan?.budget?.Version__c || "—"; }
    get budgetHours() { return this.plan?.budget?.Planned_Hours__c || 0; }
    get activeAllocationCount() { return (this.plan?.allocations || []).filter((item) => item.State__c === "Accepted").length; }
    get openRiskCount() { return (this.plan?.risks || []).filter((item) => !["Closed", "Accepted"].includes(item.Status__c)).length; }
    get gateBlockers() { return this.plan?.closeoutGates?.blockers || []; }
    get closeoutReady() { return this.plan?.closeoutGates?.ready === true; }
    get closeoutStatus() { return this.plan?.closeout?.State__c || "Not started"; }
    get canManageProjects() { return this.plan?.canManageProjects === true; }
    get canApproveCloseout() { return this.plan?.canApproveCloseout === true && this.plan?.closeout?.State__c === "Pending Approval"; }

    handleProject(event) { this.projectId = event.detail.value; this.selectedTaskId = null; this.run("Load project", () => this.loadPlan(), false); }
    handleZoom(event) { this.zoom = event.detail.value; this.buildGantt(); }
    handleRefresh() { this.run("Refresh plan", () => this.loadPlan(), false); }
    handleTaskSelect(event) { this.selectTask(event.currentTarget.dataset.id); }
    selectTask(id) {
        this.selectedTaskId = id; const task = this.taskRows.find((item) => item.Id === id); if (!task) return;
        this.edit = { startDate: task.Start_Date__c, endDate: task.End_Date__c, percentComplete: task.Percent_Complete__c || 0, status: task.Status__c, note: "PM plan update with governed reason.", cascade: true, acceptanceNote: "Customer acceptance evidence reviewed and retained." };
        this.buildGantt();
    }
    handleEdit(event) { const field = event.target.dataset.field; this.edit = { ...this.edit, [field]: event.target.type === "checkbox" ? event.target.checked : event.detail?.value ?? event.target.value }; }
    handleIntakeDraft(event) { const field = event.target.dataset.field; this.intakeDraft = { ...this.intakeDraft, [field]: event.detail?.value ?? event.target.value }; }
    handleCommercialDraft(event) { const field = event.target.dataset.field; this.commercialDraft = { ...this.commercialDraft, [field]: event.detail?.value ?? event.target.value }; }
    handleCommercialLineDraft(event) { const field = event.target.dataset.field; this.commercialLineDraft = { ...this.commercialLineDraft, [field]: event.target.type === "checkbox" ? event.target.checked : event.detail?.value ?? event.target.value }; }
    handleCloseoutDecisionNote(event) { this.closeoutDecisionNote = event.detail?.value ?? event.target.value; }
    handleTaskDraft(event) { const field = event.target.dataset.field; this.taskDraft = { ...this.taskDraft, [field]: event.target.type === "checkbox" ? event.target.checked : event.detail?.value ?? event.target.value }; }
    handleDependencyDraft(event) { this.dependencyDraft = { ...this.dependencyDraft, [event.target.dataset.field]: event.detail?.value ?? event.target.value }; }
    handleRiskDraft(event) { this.riskDraft = { ...this.riskDraft, [event.target.dataset.field]: event.detail?.value ?? event.target.value }; }
    handleCloseoutDraft(event) { this.closeoutDraft = { ...this.closeoutDraft, [event.target.dataset.field]: event.detail?.value ?? event.target.value }; }
    handleRiskSelect(event) { this.selectedRiskId = event.currentTarget.dataset.id; }

    handleDragStart(event) { this.dragMode = "move"; this.draggedTaskId = event.currentTarget.dataset.id; event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", this.draggedTaskId); }
    handleResizeStart(event) { event.stopPropagation(); this.dragMode = "resize"; this.draggedTaskId = event.currentTarget.dataset.id; event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", this.draggedTaskId); }
    allowDrop(event) { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }
    handleDrop(event) {
        event.preventDefault(); const taskId = this.draggedTaskId || event.dataTransfer.getData("text/plain"); const task = this.taskRows.find((item) => item.Id === taskId); if (!task) return;
        const bounds = event.currentTarget.getBoundingClientRect(); const ratio = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
        const rawOffset = Math.round(ratio * (this.timelineDays - 1)); const snap = { Week: 1, Month: 7, Quarter: 14, Year: 30 }[this.zoom]; const offset = Math.round(rawOffset / snap) * snap;
        const duration = Math.round((this.utc(task.End_Date__c) - this.utc(task.Start_Date__c)) / DAY);
        let startDate; let endDate; let label; let reason;
        if (this.dragMode === "resize") {
            startDate = task.Start_Date__c; const minimumOffset = Math.round((this.utc(task.Start_Date__c) - this.timelineStart.getTime()) / DAY); const endOffset = Math.max(minimumOffset, offset);
            endDate = this.iso(new Date(this.timelineStart.getTime() + endOffset * DAY)); label = "Resize Gantt task"; reason = `Drag resize in ${this.zoom} view with successor auto-scheduling.`;
        } else {
            startDate = this.iso(new Date(this.timelineStart.getTime() + offset * DAY)); endDate = this.iso(new Date(this.timelineStart.getTime() + (offset + duration) * DAY)); label = "Move Gantt task"; reason = `Drag reschedule in ${this.zoom} view.`;
        }
        this.dragMode = "move";
        this.run(label, () => rescheduleWorkUnit({ workUnitId: taskId, startDate, endDate, cascadeSuccessors: true, reason }));
    }

    handleReschedule() { this.run("Reschedule task", () => rescheduleWorkUnit({ workUnitId: this.selectedTaskId, startDate: this.edit.startDate, endDate: this.edit.endDate, cascadeSuccessors: this.edit.cascade, reason: this.edit.note })); }
    handleCreateProject() {
        const draft = this.intakeDraft;
        this.run("Create project", async () => {
            const result = await createProject({ projectCode: draft.code, projectName: draft.name, portfolioId: draft.portfolioId, industry: draft.industry, tower: draft.tower, startDate: draft.startDate, endDate: draft.endDate, revenueType: draft.revenueType, currencyCode: draft.currencyCode, contractExternalId: draft.contractExternalId, contractValue: Number(draft.contractValue), intakeCorrelationId: draft.correlationId || null });
            this.projects = await getProjectOptions(); this.projectId = result.recordId; return result;
        }, true, () => { this.intakeDraft = { ...emptyIntake(), portfolioId: this.portfolios[0]?.Id || "" }; });
    }
    handleCreateCommercialChange() { const draft = this.commercialDraft; this.run("Record commercial change", () => createCommercialChange({ engagementId: this.projectId, parentReferenceId: draft.parentReferenceId, externalId: draft.externalId, referenceType: draft.referenceType, value: Number(draft.value), validFrom: draft.validFrom, validTo: draft.validTo, changeReason: draft.changeReason }), true, () => { this.commercialDraft = { ...emptyCommercial(), validFrom: this.plan.engagement.Start_Date__c, validTo: this.plan.engagement.End_Date__c }; }); }
    handleCreateCommercialLine() { const draft = this.commercialLineDraft; this.run("Add contract line", () => saveCommercialLine({ referenceId: draft.referenceId, lineId: null, externalId: draft.externalId, lineType: draft.lineType, description: draft.description, sequence: Number(draft.sequence), value: Number(draft.value), deliveryDate: draft.deliveryDate || null, acceptanceRequired: draft.acceptanceRequired, workUnitId: draft.workUnitId || null }), true, () => { this.commercialLineDraft = { ...emptyCommercialLine(), deliveryDate: this.plan.engagement.End_Date__c }; }); }
    handleProgress() { this.run("Update progress", () => updateProgress({ workUnitId: this.selectedTaskId, percentComplete: Number(this.edit.percentComplete), status: this.edit.status, note: this.edit.note })); }
    handleAcceptance() { this.run("Record acceptance", () => acceptDeliverable({ workUnitId: this.selectedTaskId, acceptanceNote: this.edit.acceptanceNote })); }
    handleCreateTask() {
        const draft = this.taskDraft;
        this.run("Create work unit", () => saveWorkUnit({ engagementId: this.projectId, workUnitId: null, code: draft.code, name: draft.name, phase: draft.phase, sequence: Number(draft.sequence), startDate: draft.startDate, endDate: draft.endDate, plannedHours: Number(draft.plannedHours), dailyHours: Number(draft.dailyHours), assignedResourceId: draft.assignedResourceId || null, milestone: draft.milestone, deliverable: draft.deliverable, acceptanceRequired: draft.acceptanceRequired }), true, () => { this.taskDraft = emptyTask(); });
    }
    handleCreateDependency() { const draft = this.dependencyDraft; this.run("Create dependency", () => saveDependency({ engagementId: this.projectId, predecessorId: draft.predecessorId, successorId: draft.successorId, dependencyType: draft.dependencyType, lagDays: Number(draft.lagDays), externalId: null })); }
    handleCreateRisk() { const draft = this.riskDraft; this.run("Create risk", () => saveRisk({ engagementId: this.projectId, riskId: null, externalId: draft.externalId, title: draft.title, description: draft.description, severity: draft.severity, ownerUserId: null, dueDate: draft.dueDate, mitigation: draft.mitigation }), true, () => { this.riskDraft = { externalId: "", title: "", description: "", severity: "Medium", dueDate: "", mitigation: "" }; }); }
    handleCloseRisk() { this.run("Close risk", () => closeRisk({ riskId: this.selectedRiskId, closureNote: "Mitigation completed and evidence reviewed by the project manager." })); }
    handleSaveCloseout() { const draft = this.closeoutDraft; this.run("Save closeout", () => createCloseoutDraft({ engagementId: this.projectId, completionDate: draft.completionDate, lessonsLearned: draft.lessonsLearned, customerAcceptanceNote: draft.customerAcceptanceNote })); }
    handleSubmitCloseout() { if (!this.plan?.closeout?.Id) { this.toast("Save the closeout draft before submission.", "warning"); return; } this.run("Submit closeout", () => submitCloseout({ closeoutId: this.plan.closeout.Id })); }
    handleCloseoutDecision(event) { const approve = event.currentTarget.dataset.approve === "true"; this.run(approve ? "Approve closeout" : "Reject closeout", () => decideCloseout({ closeoutId: this.plan.closeout.Id, approve, note: this.closeoutDecisionNote })); }

    async run(label, action, notify = true, afterSuccess) {
        this.busy = true; this.error = undefined;
        try { const result = await action(); if (result?.success === false) throw new Error(result.message); if (afterSuccess) afterSuccess(result); await this.loadPlan(); if (notify) this.toast(result?.message || `${label} completed.`, "success"); }
        catch (error) { this.fail(error); } finally { this.busy = false; }
    }
    fail(error) { this.error = error?.body?.message || error?.message || "The governed project operation failed."; this.toast(this.error, "error"); }
    toast(message, variant) { this.dispatchEvent(new ShowToastEvent({ title: variant === "error" ? "Resource 360" : "Project workbench", message, variant })); }
    utc(value) { return new Date(`${value}T00:00:00Z`).getTime(); }
    iso(value) { return value.toISOString().slice(0, 10); }
    formatAxis(value) { return value.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: this.zoom === "Year" ? "numeric" : undefined, timeZone: "UTC" }); }
}
