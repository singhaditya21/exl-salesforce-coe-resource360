import { SCREENS as RAW_SCREENS } from "../screenCatalog";
import { governedScreens } from "../screenContracts";
import {
    DECLARATIVE_SCREEN_IDS,
    ROUTE_EXPERIENCES,
    SPECIALIZED_SCREEN_IDS,
    routeExperienceFor
} from "../screenExperiences";

describe("Resource 360 governed Salesforce screen coverage", () => {
    const screens = governedScreens(RAW_SCREENS);
    const implementedIds = new Set([...SPECIALIZED_SCREEN_IDS, ...DECLARATIVE_SCREEN_IDS]);

    it("implements every one of the 103 PRD screens exactly once", () => {
        expect(screens).toHaveLength(103);
        expect(SPECIALIZED_SCREEN_IDS).toHaveLength(46);
        expect(DECLARATIVE_SCREEN_IDS).toHaveLength(57);
        expect(implementedIds.size).toBe(103);
        expect(screens.map((screen) => screen.id).filter((id) => !implementedIds.has(id))).toEqual([]);
        expect(SPECIALIZED_SCREEN_IDS.filter((id) => DECLARATIVE_SCREEN_IDS.includes(id))).toEqual([]);
    });

    it("gives every declarative route a Salesforce dataset, visual, evidence and action", () => {
        for (const id of DECLARATIVE_SCREEN_IDS) {
            const experience = routeExperienceFor(id);
            expect(experience).toEqual(ROUTE_EXPERIENCES[id]);
            expect(experience.dataset).toBeTruthy();
            expect(experience.visual).toBeTruthy();
            expect(experience.focus).toBeTruthy();
            expect(experience.evidence).toBeTruthy();
            expect(experience.operation).toBeTruthy();
        }
    });

    it("keeps help, AI and governed write routes explicit", () => {
        expect(routeExperienceFor("GLB-06")).toMatchObject({ dataset: "help", visual: "help", operation: "refresh" });
        expect(routeExperienceFor("AIUI-01")).toMatchObject({ dataset: "recommendations", operation: "assistant" });
        expect(routeExperienceFor("STFUI-23")).toMatchObject({ dataset: "staffingRequests", operation: "staffingDecision" });
        expect(routeExperienceFor("BUDUI-10")).toMatchObject({ dataset: "budgets", operation: "budgetDecision" });
        expect(routeExperienceFor("TIMEUI-06")).toMatchObject({ dataset: "timesheets", operation: "timesheetDecision" });
    });
});
