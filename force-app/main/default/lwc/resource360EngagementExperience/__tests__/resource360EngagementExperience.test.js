import { createElement } from "lwc";
import Resource360EngagementExperience from "c/resource360EngagementExperience";

const flushPromises = async () => { await Promise.resolve(); await Promise.resolve(); };
const engagement = { Id: "eng1", Name: "Global Retail Cloud", Engagement_ID__c: "ENG-001", Status__c: "Active", Lifecycle_Stage__c: "Deliver", Completion_Percent__c: 68, Account_Health_Score__c: 82, Risk_Exposure_Score__c: 23, Mandatory_Skill_Coverage_Percent__c: 92, Role_Readiness_Percent__c: 88, Start_Date__c: "2026-01-01", End_Date__c: "2026-12-31", Salesforce_Tower__c: "Sales Cloud", Industry__c: "Retail", Currency_Code__c: "USD", Portfolio_ID__c: "PORT-SFCOE-DEMO", Account__r: { Name: "Global Retail Group" }, Portfolio__r: { Name: "Salesforce COE" }, Sub_Portfolio__r: { Name: "Retail" }, Project_Manager__r: { Name: "Demo PM" } };
const data = {
    generatedAt: "2026-08-27T05:00:00.000Z",
    engagements: [engagement],
    commercialReferences: [{ Id: "com1", Name: "SOW-001", Engagement__c: "eng1", Reference_Type__c: "SOW", Version__c: 1, Value__c: 1000000, Signed_Date__c: "2026-01-01", Status__c: "Active", Approval_Status__c: "Approved", Valid_From__c: "2026-01-01", Valid_To__c: "2026-12-31" }],
    commercialLines: [{ Id: "line1", Commercial_Reference__c: "com1", Description__c: "Sales Cloud release", Line_Type__c: "Deliverable", Value__c: 250000, Status__c: "Active", Acceptance_Required__c: true, Acceptance_Status__c: "Accepted" }],
    allocations: [{ Id: "alloc1", Resource__c: "res1", Resource__r: { Preferred_Name__c: "Asha Rao" }, Engagement__c: "eng1", Engagement__r: { Name: engagement.Name }, Work_Unit__r: { Name: "Solution design" }, Role__c: "Salesforce Architect", Classification__c: "Billable", Daily_Hours__c: 8, Allocation_Percent__c: 100, Projected_Daily_Hours__c: 8, Capacity_Status__c: "Fully Allocated", State__c: "Accepted", Current__c: true, Version__c: 2 }],
    allocationHistory: [{ Id: "alloc0", Resource__c: "res1", Resource__r: { Preferred_Name__c: "Asha Rao" }, Engagement__c: "eng1", Role__c: "Salesforce Architect", Classification__c: "Billable", Daily_Hours__c: 4, Capacity_Status__c: "Underallocated", State__c: "Superseded", Current__c: false, Version__c: 1 }, { Id: "alloc1", Resource__c: "res1", Resource__r: { Preferred_Name__c: "Asha Rao" }, Engagement__c: "eng1", Role__c: "Salesforce Architect", Classification__c: "Billable", Daily_Hours__c: 8, Capacity_Status__c: "Fully Allocated", State__c: "Accepted", Current__c: true, Version__c: 2 }],
    staffingSkillMatches: [{ Resource__c: "res1", Capability__r: { Name: "Sales Cloud" }, Score__c: 94 }],
    budgets: [{ Id: "bud1", Name: "Budget v1", Engagement__c: "eng1", Version__c: 1, Current__c: true, State__c: "Approved", Revenue__c: 1000000, Total_Cost__c: 650000, Margin_Percent__c: 35, Forecast_Margin_Percent__c: 33, Planned_Hours__c: 6000, Approval_Step__c: 2, Policy_Version__c: "CAP-1" }],
    budgetLines: [{ Id: "bl1", Budget__c: "bud1", Resource__r: { Preferred_Name__c: "Asha Rao" }, Role__c: "Architect", Phase__c: "Design", Work_Unit__c: "Solution", Planned_Hours__c: 320, Planned_Cost__c: 50000 }],
    timesheets: [{ Id: "ts1", Resource__r: { Preferred_Name__c: "Asha Rao" }, Week_Start__c: "2026-08-24", Status__c: "Submitted", Required_Approval_Role__c: "Reporting Manager" }],
    timeEntries: [{ Id: "te1", Timesheet__c: "ts1", Engagement__r: { Name: engagement.Name }, Work_Date__c: "2026-08-24", Hours__c: 8, Role__c: "Architect", State__c: "Submitted" }],
    workUnits: [{ Id: "wu1", Name: "Solution design", Engagement__c: "eng1", Work_Unit_Code__c: "WBS-01", Phase__c: "Design", Sequence__c: 1, Start_Date__c: "2026-02-01", End_Date__c: "2026-03-01", Status__c: "In Progress", Percent_Complete__c: 70, Planned_Hours__c: 320, Critical_Path__c: true, Acceptance_Required__c: true, Acceptance_Status__c: "Pending", Assigned_Resource__r: { Preferred_Name__c: "Asha Rao" } }],
    workDependencies: [],
    projectRisks: [{ Id: "risk1", Engagement__c: "eng1", Title__c: "Cutover readiness", Severity__c: "High", Status__c: "Open", Description__c: "Rehearsal is required", Mitigation__c: "Complete rehearsal", Due_Date__c: "2026-09-01", Owner_User__r: { Name: "Demo PM" } }]
};

describe("c-resource360-engagement-experience", () => {
    afterEach(() => { while (document.body.firstChild) document.body.removeChild(document.body.firstChild); });
    const render = async (screenId) => {
        const element = createElement("c-resource360-engagement-experience", { is: Resource360EngagementExperience });
        element.screenId = screenId;
        element.activeRole = "Administrator";
        element.data = data;
        document.body.appendChild(element);
        await flushPromises();
        return element;
    };

    it.each([
        ["ENG-01", "Engagement portfolio"], ["ENG-02", "Project 360"], ["ENG-03", "Project roster"], ["ENG-04", "Project economics"],
        ["ENG-05", "Actuals reconciliation"], ["ENG-06", "Delivery work plan"], ["ENG-07", "Risk and action board"], ["ENG-08", "Allocation history"]
    ])("renders a dedicated %s experience", async (screenId, title) => {
        const element = await render(screenId);
        expect(element.shadowRoot.querySelector(`[data-experience="${screenId}"]`)).toBeTruthy();
        expect(element.shadowRoot.textContent).toContain(title);
    });

    it("selects a project and exposes the Project 360 action", async () => {
        const element = await render("ENG-01");
        element.shadowRoot.querySelector('[data-recording-action="select-project"]').click();
        await flushPromises();
        expect(element.shadowRoot.textContent).toContain("Global Retail Group");
        expect(element.shadowRoot.querySelector('[data-recording-action="open-project-360"]')).toBeTruthy();
    });

    it("drills into contract line acceptance evidence", async () => {
        const element = await render("ENG-02");
        element.shadowRoot.querySelector('[data-recording-action="select-commercial"]').click();
        await flushPromises();
        expect(element.shadowRoot.textContent).toContain("Sales Cloud release");
        expect(element.shadowRoot.textContent).toContain("Accepted");
    });

    it("validates daily actuals and shows the outcome", async () => {
        const element = await render("ENG-05");
        element.shadowRoot.querySelector('[data-recording-action="select-timesheet"]').click();
        element.shadowRoot.querySelector('[data-recording-action="validate-actuals"]').click();
        await flushPromises();
        expect(element.shadowRoot.textContent).toContain("Validated · no time entry exceeds");
    });

    it("isolates the critical path and acknowledges a risk", async () => {
        const workPlan = await render("ENG-06");
        workPlan.shadowRoot.querySelector('[data-recording-action="critical-path"]').click();
        await flushPromises();
        expect(workPlan.shadowRoot.querySelector('[data-recording-action="critical-path"]').label).toBe("Show all work units");
        document.body.removeChild(workPlan);
        const risks = await render("ENG-07");
        risks.shadowRoot.querySelector('[data-recording-action="review-risk"]').click();
        await flushPromises();
        expect(risks.shadowRoot.textContent).toContain("Reviewed in this session");
    });

    it("compares immutable allocation versions", async () => {
        const element = await render("ENG-08");
        element.shadowRoot.querySelector('[data-recording-action="compare-versions"]').click();
        await flushPromises();
        expect(element.shadowRoot.textContent).toContain("2 version(s) compared");
        expect(element.shadowRoot.textContent).toContain("Superseded");
    });

    it("masks authenticated Salesforce user names in recording mode", async () => {
        const element = createElement("c-resource360-engagement-experience", { is: Resource360EngagementExperience });
        element.screenId = "ENG-08";
        element.recordingMode = true;
        element.activeRole = "Administrator";
        element.data = {
            ...data,
            allocationHistory: data.allocationHistory.map((item) => ({
                ...item,
                Published_By__r: { Name: "Authenticated Administrator" }
            }))
        };
        document.body.appendChild(element);
        await flushPromises();
        expect(element.shadowRoot.textContent).toContain("Published by Demo Publisher");
        expect(element.shadowRoot.textContent).not.toContain("Authenticated Administrator");
    });
});
