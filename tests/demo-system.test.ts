import { describe, expect, it } from "vitest";
import { calculateBudget, demoRoles, fitForPerson, initialDemoState, type DemoBudget, type DemoPerson } from "../app/demo-system";
import { canAccessScreen, moduleRoles, screens } from "../app/screen-data";

describe("budget policy calculations", () => {
  const budget: DemoBudget = {
    id: "TEST", engagement: "Test engagement", version: 1, state: "Draft", currency: "INR",
    revenue: 1_000, baseLabour: 500, uplift: 10, effortContingency: 20,
    expenseContingency: 10, travelRate: 50, onsiteMonths: 2, plannedHours: 10,
  };

  it("derives burdened labour, travel, margin and blended cost from inputs", () => {
    const result = calculateBudget(budget);
    expect(result.burdenedLabour).toBeCloseTo(660);
    expect(result.travel).toBeCloseTo(110);
    expect(result.totalCost).toBeCloseTo(770);
    expect(result.grossMargin).toBeCloseTo(230);
    expect(result.marginPercent).toBeCloseTo(23);
    expect(result.blendedCost).toBeCloseTo(77);
  });

  it("returns defined zero values when revenue and effort are zero", () => {
    const result = calculateBudget({ ...budget, revenue: 0, plannedHours: 0 });
    expect(result.marginPercent).toBe(0);
    expect(result.blendedCost).toBe(0);
  });
});

describe("explainable candidate fit", () => {
  const person: DemoPerson = {
    id: "EXL-TEST", name: "Demo Person", initials: "DP", title: "Consultant", tower: "Platform",
    location: "India", availability: 40,
    skills: [{ name: "Data Cloud", level: 3, lastUsed: "Aug 2026" }],
    credentials: [{ name: "Data Cloud Consultant", state: "Verified", verifiedAt: "Aug 2026" }],
  };

  it("caps proficiency and availability contribution at full fit", () => {
    expect(fitForPerson(person, "Data Cloud", 3)).toBe(100);
  });

  it("does not treat an expired credential as verified", () => {
    const partial = { ...person, availability: 20, skills: [{ ...person.skills[0], level: 1 as const }], credentials: [{ ...person.credentials[0], state: "Expired" as const }] };
    expect(fitForPerson(partial, "Data Cloud", 4)).toBe(24);
  });
});

describe("sanitized fixture integrity", () => {
  it("ships every connected demo aggregate with a versioned state", () => {
    expect(initialDemoState.version).toBe(5);
    expect(initialDemoState.budgets.length).toBeGreaterThan(0);
    expect(initialDemoState.people.length).toBeGreaterThan(0);
    expect(initialDemoState.configurations.some((item) => item.code === "People_Freshness_Block_Hours" && item.state === "Active")).toBe(true);
    expect(initialDemoState.allocations.length).toBeGreaterThan(0);
    expect(initialDemoState.timesheets.length).toBeGreaterThan(0);
    expect(initialDemoState.audit.length).toBeGreaterThan(0);
    expect(initialDemoState.sourceContracts).toHaveLength(13);
    expect(initialDemoState.sourceContracts.every((item) => item.contractVersion === "R360-MOCK-1.2")).toBe(true);
    expect(initialDemoState.personas).toHaveLength(18);
    expect(initialDemoState.personas.every((item) => item.approvalStatus === "Approved mock assumption")).toBe(true);
    expect(initialDemoState.retentionRules).toHaveLength(8);
    expect(initialDemoState.retentionRules.every((item) => item.legalHoldEligible)).toBe(true);
    expect(initialDemoState.budgetRoster.length).toBeGreaterThan(0);
  });

  it("maps every governed persona to at least one screen and preserves least privilege", () => {
    expect(demoRoles).toHaveLength(18);
    expect(Object.values(moduleRoles).flat()).toEqual(expect.arrayContaining([...demoRoles]));
    for (const role of demoRoles) expect(screens.some((screen) => canAccessScreen(role, screen)), role).toBe(true);
    expect(canAccessScreen("Executive Viewer", screens.find((screen) => screen.id === "CMD-01")!)).toBe(true);
    expect(canAccessScreen("Executive Viewer", screens.find((screen) => screen.id === "ADMUI-03")!)).toBe(false);
    expect(canAccessScreen("Configuration Approver", screens.find((screen) => screen.id === "ADMUI-06")!)).toBe(true);
    expect(canAccessScreen("Finance/PMO", screens.find((screen) => screen.id === "BUDUI-10")!)).toBe(true);
  });
});
