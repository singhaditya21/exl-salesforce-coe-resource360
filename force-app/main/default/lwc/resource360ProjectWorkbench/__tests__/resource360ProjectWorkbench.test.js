import { createElement } from "lwc";
import Resource360ProjectWorkbench from "c/resource360ProjectWorkbench";
import getProjectOptions from "@salesforce/apex/Resource360ProjectService.getProjectOptions";
import getProjectPlan from "@salesforce/apex/Resource360ProjectService.getProjectPlan";
import updateProgress from "@salesforce/apex/Resource360ProjectService.updateProgress";

jest.mock("@salesforce/apex/Resource360ProjectService.getProjectOptions", () => ({ default: jest.fn() }), { virtual: true });
jest.mock("@salesforce/apex/Resource360ProjectService.getProjectPlan", () => ({ default: jest.fn() }), { virtual: true });
jest.mock("@salesforce/apex/Resource360ProjectService.saveWorkUnit", () => ({ default: jest.fn() }), { virtual: true });
jest.mock("@salesforce/apex/Resource360ProjectService.rescheduleWorkUnit", () => ({ default: jest.fn() }), { virtual: true });
jest.mock("@salesforce/apex/Resource360ProjectService.saveDependency", () => ({ default: jest.fn() }), { virtual: true });
jest.mock("@salesforce/apex/Resource360ProjectService.updateProgress", () => ({ default: jest.fn() }), { virtual: true });
jest.mock("@salesforce/apex/Resource360ProjectService.acceptDeliverable", () => ({ default: jest.fn() }), { virtual: true });
jest.mock("@salesforce/apex/Resource360ProjectService.saveRisk", () => ({ default: jest.fn() }), { virtual: true });
jest.mock("@salesforce/apex/Resource360ProjectService.closeRisk", () => ({ default: jest.fn() }), { virtual: true });
jest.mock("@salesforce/apex/Resource360ProjectService.createCloseoutDraft", () => ({ default: jest.fn() }), { virtual: true });
jest.mock("@salesforce/apex/Resource360ProjectService.submitCloseout", () => ({ default: jest.fn() }), { virtual: true });

const flushPromises = async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
};

const task = (number, overrides = {}) => ({
    Id: `a0E00000000000${number}`,
    Name: `Delivery task ${number}`,
    Work_Unit_Code__c: `WBS-SF-0${number}`,
    Phase__c: number < 3 ? "Discover" : "Build",
    Sequence__c: number * 10,
    Start_Date__c: `2026-0${Math.min(number + 1, 9)}-01`,
    End_Date__c: `2026-0${Math.min(number + 1, 9)}-20`,
    Baseline_Start_Date__c: `2026-0${Math.min(number + 1, 9)}-01`,
    Baseline_End_Date__c: `2026-0${Math.min(number + 1, 9)}-20`,
    Status__c: number < 3 ? "Complete" : "Active",
    Percent_Complete__c: number < 3 ? 100 : 35,
    Planned_Hours__c: 160,
    Daily_Hours__c: 4,
    Assigned_Resource__c: `a0R00000000000${number}`,
    Assigned_Resource__r: { Preferred_Name__c: `Consultant ${number}` },
    Milestone__c: number === 7,
    Deliverable__c: true,
    Acceptance_Required__c: true,
    Acceptance_Status__c: number < 3 ? "Accepted" : "Pending",
    Critical_Path__c: number !== 4,
    ...overrides
});

const plan = {
    engagement: { Id: "a06000000000001", Name: "Global Retail Cloud", Engagement_ID__c: "ENG-1001", Start_Date__c: "2026-06-01", End_Date__c: "2027-06-01", Lifecycle_Stage__c: "Delivery", Completion_Percent__c: 42 },
    tasks: Array.from({ length: 7 }, (_, index) => task(index + 1)),
    dependencies: [],
    allocations: Array.from({ length: 9 }, (_, index) => ({ Id: `a0000000000000${index}`, Resource__c: `a0R00000000000${(index % 7) + 1}`, Resource__r: { Preferred_Name__c: `Consultant ${(index % 7) + 1}` }, Role__c: "Salesforce Consultant", State__c: "Accepted" })),
    commercialReferences: [
        { Id: "cr1", External_ID__c: "SOW-R360-1001", Reference_Type__c: "SOW", Version__c: 1, Approval_Status__c: "Approved", Value__c: 84000000 },
        { Id: "cr2", External_ID__c: "AMD-R360-1001-01", Reference_Type__c: "Amendment", Version__c: 2, Approval_Status__c: "Approved", Value__c: 6000000 },
        { Id: "cr3", External_ID__c: "CO-R360-1001-01", Reference_Type__c: "Change Order", Version__c: 3, Approval_Status__c: "Approved", Value__c: 9000000 }
    ],
    commercialLines: [],
    budget: { Version__c: 4, State__c: "Approved", Planned_Hours__c: 960 },
    risks: [{ Id: "risk1", External_ID__c: "GOLD-RISK-01", Title__c: "Integration readiness", Severity__c: "High", Status__c: "Open", Mitigation__c: "Daily dependency review." }],
    closeout: { Id: "closeout1", State__c: "Draft", Completion_Date__c: "2027-06-01" },
    actualHoursByWorkUnit: { a0E000000000003: 8 },
    closeoutGates: { ready: false, blockers: ["5 work unit(s) are incomplete."] },
    zoomOptions: ["Week", "Month", "Quarter", "Year"]
};

describe("c-resource360-project-workbench", () => {
    afterEach(() => {
        while (document.body.firstChild) document.body.removeChild(document.body.firstChild);
        jest.clearAllMocks();
    });

    it("renders the governed seven-task golden path and executes a PM progress command", async () => {
        getProjectOptions.mockResolvedValue([{ Id: plan.engagement.Id, Name: plan.engagement.Name, Engagement_ID__c: "ENG-1001" }]);
        getProjectPlan.mockResolvedValue(JSON.stringify(plan));
        updateProgress.mockResolvedValue({ success: true, message: "Work-unit progress updated." });

        const element = createElement("c-resource360-project-workbench", { is: Resource360ProjectWorkbench });
        document.body.appendChild(element);
        await flushPromises();

        expect(element.shadowRoot.querySelector("h1").textContent).toBe("Project delivery workbench");
        expect(element.shadowRoot.querySelectorAll(".gantt-row")).toHaveLength(7);
        expect(element.shadowRoot.textContent).toContain("WBS-SF-07");
        expect(element.shadowRoot.textContent).not.toContain("WBS-DC-01");
        expect(element.shadowRoot.textContent).toContain("3 governed version(s)");
        expect(element.shadowRoot.textContent).toContain("Delivery capacity9current accepted allocation(s)");

        element.shadowRoot.querySelector(".task-label[data-id='a0E000000000003']").click();
        await flushPromises();
        const progressButton = [...element.shadowRoot.querySelectorAll("lightning-button")]
            .find((button) => button.label === "Update progress");
        expect(progressButton).toBeTruthy();
        progressButton.click();
        await flushPromises();

        expect(updateProgress).toHaveBeenCalledWith({
            workUnitId: "a0E000000000003",
            percentComplete: 35,
            status: "Active",
            note: "PM plan update with governed reason."
        });
        expect(getProjectPlan).toHaveBeenCalledTimes(2);
    });
});
