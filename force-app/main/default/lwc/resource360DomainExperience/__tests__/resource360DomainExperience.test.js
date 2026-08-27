import { createElement } from "lwc";
import Resource360DomainExperience from "c/resource360DomainExperience";

const modules = [
    ["STFUI", 24], ["SKLUI", 24], ["BUDUI", 12], ["TIMEUI", 8],
    ["CMD", 9], ["ADMUI", 8], ["AIUI", 4]
];

const fixture = {
    metrics: { activeHeadcount: 60, engagementCount: 20, accountCount: 10, fullyAllocatedResources: 50, overallocatedResources: 10, approvedRevenue: 120000000, approvedMarginPercent: 31, actualTimeBreaches: 0, hardCeilingBreaches: 0 },
    engagements: [{ Id: "eng-1", Name: "Global Retail Cloud", State__c: "Active" }],
    resources: [{ Id: "res-1", Preferred_Name__c: "Riya Sen", Primary_Role__c: "Salesforce Architect", Status__c: "Active" }],
    capabilities: [{ Id: "cap-1", Name: "Salesforce Architecture", Status__c: "Active" }],
    allocations: [{ Id: "all-1", Resource__r: { Preferred_Name__c: "Riya Sen" }, Engagement__r: { Name: "Global Retail Cloud" }, State__c: "Accepted", Daily_Hours__c: 8 }],
    dailyCapacityLedger: [{ Id: "capday-1", Resource__r: { Preferred_Name__c: "Riya Sen" }, Capacity_Status__c: "Fully Allocated", Utilization_Percent__c: 100 }],
    staffingRequests: [{ Id: "sr-1", Name: "SR-1001", Requested_Role__c: "Salesforce Architect", State__c: "Pending" }],
    classifications: [{ Name: "Billing", Status__c: "Active" }], integrationRuns: [{ Id: "run-1", Run_ID__c: "RUN-01", State__c: "Completed" }], integrationErrors: [],
    skillClaims: [{ Id: "claim-1", Name: "Architecture L3", State__c: "Pending" }], credentials: [{ Id: "cred-1", Name: "Application Architect", Status__c: "Verified" }],
    learningAchievements: [{ Id: "learn-1", Name: "Architecture trail", Status__c: "Completed" }], skillEvidence: [{ Id: "evidence-1", Name: "Project evidence", Status__c: "Verified" }],
    roleScopes: [{ Id: "scope-1", Name: "Project Manager · PORT-SFCOE-DEMO", Status__c: "Active" }], configurationCatalog: [{ Id: "cfg-1", Name: "Capacity ceiling", State__c: "Active" }],
    budgets: [{ Id: "bud-1", Name: "Budget v1", State__c: "Approved", Margin_Percent__c: 31 }], budgetLines: [{ Id: "line-1", Name: "Build · Architect", Phase__c: "Build", Status__c: "Current" }], approvalDecisions: [{ Id: "dec-1", Name: "Approval step", State__c: "Pending" }],
    timesheets: [{ Id: "time-1", Name: "Week 35", State__c: "Submitted" }], timeEntries: [{ Id: "entry-1", Name: "2026-08-26 · 8h", Status__c: "Valid" }],
    forecastWeeks: [{ Name: "Week +1", Status__c: "Balanced" }], sourceContracts: [{ Name: "People Master", Status__c: "Mock Active" }], auditEvents: [{ Name: "Configuration submitted", Status__c: "Recorded" }],
    activationChecks: [{ Name: "Identity", status: "Passed" }], calendars: [{ Name: "India work calendar", Status__c: "Active" }], recommendations: [{ Name: "Riya Sen", Status__c: "Recommended" }], agentOperations: [{ Name: "Planner", Status__c: "Active" }]
};

describe("c-resource360-domain-experience", () => {
    afterEach(() => { while (document.body.firstChild) document.body.removeChild(document.body.firstChild); });

    it("renders a specialized experience for all 89 remaining governed screens", () => {
        let rendered = 0;
        for (const [prefix, count] of modules) {
            for (let index = 1; index <= count; index += 1) {
                const id = `${prefix}-${String(index).padStart(2, "0")}`;
                const element = createElement("c-resource360-domain-experience", { is: Resource360DomainExperience });
                element.screenId = id;
                element.screen = { id, title: `Screen ${id}`, description: "Governed screen", primary: "Review evidence", source: "Salesforce", api: "Resource360Service", validations: "User mode", events: "SCREEN_REVIEWED" };
                element.data = fixture;
                element.activeRole = "Administrator";
                document.body.appendChild(element);
                const experience = element.shadowRoot.querySelector(`[data-experience="${id}"]`);
                expect(experience).toBeTruthy();
                expect(experience.classList.contains("master-experience")).toBe(true);
                expect(element.shadowRoot.querySelector(".canvas")).toBeTruthy();
                element.remove();
                rendered += 1;
            }
        }
        expect(rendered).toBe(89);
    });

    it("supports filtering, evidence lineage, selection outcomes and in-product navigation", async () => {
        const element = createElement("c-resource360-domain-experience", { is: Resource360DomainExperience });
        element.screenId = "STFUI-07";
        element.screen = { id: "STFUI-07", title: "Candidate shortlist", primary: "Compare selected", source: "Salesforce talent projection", api: "Resource360TalentService.searchCandidates", validations: "Scope and eligibility", events: "CANDIDATES_COMPARED" };
        element.data = fixture;
        element.activeRole = "COE Staffer";
        document.body.appendChild(element);

        element.shadowRoot.querySelector('[data-filter="actionable"]').click();
        await Promise.resolve();
        expect(element.shadowRoot.querySelector(".outcome").textContent).toContain("Filter applied");
        element.shadowRoot.querySelector(".evidence-button").click();
        await Promise.resolve();
        expect(element.shadowRoot.querySelector(".lineage")).toBeTruthy();
        element.shadowRoot.querySelector('[data-action="primary"]').click();
        await Promise.resolve();
        expect(element.shadowRoot.querySelector(".outcome").textContent).toContain("Compare selected");

        const listener = jest.fn();
        element.addEventListener("navigate", listener);
        element.shadowRoot.querySelector('[data-action="next"]').click();
        expect(listener).toHaveBeenCalledWith(expect.objectContaining({ detail: "STFUI-08" }));
    });
});
