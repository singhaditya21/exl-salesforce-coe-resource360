import { createElement } from "lwc";
import Resource360GlobalExperience from "c/resource360GlobalExperience";

const flushPromises = async () => { await Promise.resolve(); await Promise.resolve(); };
const data = {
    generatedAt: "2026-08-27T05:00:00.000Z",
    user: { Id: "0051", Name: "Resource 360 Administrator" },
    activeRoles: ["Administrator", "Project Manager"],
    roleScopes: [{ Id: "scope1", Active__c: true, Business_Role__c: "Administrator", Portfolio_ID__c: "PORT-SFCOE-DEMO", Org_Unit_ID__c: "Salesforce COE", Assignment_Source__c: "Mock Entra mapping" }],
    metrics: { fullAllocationCoveragePercent: 100, activeHeadcount: 60, approvedMarginPercent: 32, approvedRevenue: 1000000, overallocatedResources: 3, pendingOverallocationPlans: 1 },
    engagements: [{ Id: "eng1", Name: "Global Retail Cloud", Engagement_ID__c: "ENG-001", Status__c: "Active", Completion_Percent__c: 68, Account_Health_Score__c: 82, Risk_Exposure_Score__c: 23, Salesforce_Tower__c: "Sales Cloud", Industry__c: "Retail" }],
    resources: [{ Id: "res1", Preferred_Name__c: "Asha Rao", Employee_ID__c: "EXL-001", Primary_Role__c: "Architect", Capacity_Status__c: "Fully Allocated", Allocated_Daily_Hours__c: 8 }],
    staffingRequests: [{ Id: "sr1", Name: "SR-001", Engagement__r: { Name: "Global Retail Cloud" }, Requested_Role__c: "Architect", State__c: "Pending", Daily_Hours__c: 4, Fit_Score__c: 91 }],
    timesheets: [{ Id: "ts1", Status__c: "Submitted" }],
    projectRisks: [{ Id: "risk1", Title__c: "Cutover readiness", Severity__c: "High", Status__c: "Open", Description__c: "Decision needed", Mitigation__c: "Complete rehearsal", Owner_User__r: { Name: "PM" } }],
    notifications: [{ Id: "note1", Title__c: "Capacity exception", Message__c: "Review 10-hour controlled plan", Severity__c: "High", State__c: "Open", Accountable_Owner__r: { Name: "Delivery Lead" } }]
};

describe("c-resource360-global-experience", () => {
    afterEach(() => { while (document.body.firstChild) document.body.removeChild(document.body.firstChild); });

    const render = async (screenId) => {
        const element = createElement("c-resource360-global-experience", { is: Resource360GlobalExperience });
        element.screenId = screenId;
        element.activeRole = "Administrator";
        element.data = data;
        document.body.appendChild(element);
        await flushPromises();
        return element;
    };

    it.each(["GLB-01", "GLB-02", "GLB-03", "GLB-04", "GLB-05", "GLB-06"])("renders a dedicated %s experience", async (screenId) => {
        const element = await render(screenId);
        expect(element.shadowRoot.querySelector(`[data-experience="${screenId}"]`)).toBeTruthy();
        expect(element.shadowRoot.querySelector(".master-experience")).toBeTruthy();
    });

    it("shows a visible identity verification outcome", async () => {
        const element = await render("GLB-01");
        element.shadowRoot.querySelector('[data-recording-action="verify-session"]').click();
        await flushPromises();
        expect(element.shadowRoot.textContent).toContain("Verified · MFA assumption");
    });

    it("filters, selects and reviews a live alert", async () => {
        const element = await render("GLB-03");
        element.shadowRoot.querySelector('[data-recording-action="select-alert"]').click();
        element.shadowRoot.querySelector('[data-recording-action="mark-reviewed"]').click();
        await flushPromises();
        expect(element.shadowRoot.textContent).toContain("Reviewed in this session");
    });

    it("searches and selects a cross-object record", async () => {
        const element = await render("GLB-04");
        const input = element.shadowRoot.querySelector('[data-recording-action="search-input"]');
        input.dispatchEvent(new CustomEvent("change", { detail: { value: "Asha" } }));
        await flushPromises();
        expect(element.shadowRoot.textContent).toContain("Asha Rao");
        element.shadowRoot.querySelector('[data-recording-action="select-result"]').click();
        await flushPromises();
        expect(element.shadowRoot.textContent).toContain("Fully Allocated");
    });

    it("saves a visible preference outcome", async () => {
        const element = await render("GLB-06");
        element.shadowRoot.querySelector('[data-recording-action="save-preferences"]').click();
        await flushPromises();
        expect(element.shadowRoot.textContent).toContain("Saved · Comfortable density");
    });
});
