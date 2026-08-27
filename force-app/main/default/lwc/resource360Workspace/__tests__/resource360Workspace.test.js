import { createElement } from "lwc";
import Resource360Workspace from "c/resource360Workspace";
import getWorkspaceData from "@salesforce/apex/Resource360Service.getWorkspaceData";

jest.mock("@salesforce/apex/Resource360Service.getWorkspaceData", () => ({ default: jest.fn() }), { virtual: true });

const flushPromises = async () => {
    await Promise.resolve();
    await Promise.resolve();
};

describe("c-resource360-workspace", () => {
    afterEach(() => {
        while (document.body.firstChild) document.body.removeChild(document.body.firstChild);
        jest.clearAllMocks();
    });

    it("renders the authenticated 103-screen shell and specialized Global experiences", async () => {
        getWorkspaceData.mockResolvedValue(JSON.stringify({
            generatedAt: "2026-08-25T05:00:00.000Z",
            user: { Id: "005000000000001", Name: "Resource 360 Administrator" },
            activeRoles: ["Administrator"],
            metrics: { activeHeadcount: 12, pendingStaffing: 1, approvedRevenue: 84000000, approvedMarginPercent: 32.4, targets: {} },
            configuration: {},
            assurance: { personas: [] },
            resources: [], engagements: [], capabilities: [], allocations: [], budgets: [], timesheets: [], notifications: []
        }));

        const element = createElement("c-resource360-workspace", { is: Resource360Workspace });
        document.body.appendChild(element);
        await flushPromises();

        expect(element.shadowRoot.querySelector("h1").textContent).toBe("Resource 360");
        expect(element.shadowRoot.textContent).toContain("103 governed screens");
        expect(element.shadowRoot.textContent).toContain("Administrator");
        const identity = element.shadowRoot.querySelector(".session-identity");
        expect(identity.textContent).toContain("Signed in as");
        expect(identity.textContent).toContain("Resource 360 Administrator");
        expect(identity.dataset.userId).toBe("005000000000001");

        const helpButton = [...element.shadowRoot.querySelectorAll("button")]
            .find((button) => button.textContent.includes("GLB-06"));
        expect(helpButton).toBeTruthy();
        helpButton.click();
        await flushPromises();

        expect(element.shadowRoot.querySelector("c-resource360-global-experience")).toBeTruthy();
        expect(element.shadowRoot.querySelector(".contract-panel")).toBeNull();
    });
});
