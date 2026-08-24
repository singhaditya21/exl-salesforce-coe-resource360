import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { demoRoles } from "../../app/demo-system";
import { canAccessScreen, screens } from "../../app/screen-data";

async function switchRole(page: import("@playwright/test").Page, role: string) {
  await page.goto("/?screen=GLB-05");
  await page.locator(".role-grid button").filter({ has: page.getByText(role, { exact: true }) }).click();
  await page.getByRole("button", { name: /Apply role and scope/ }).click();
}

test("publishes the complete governed screen directory", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".page-header h1")).toHaveText("Role-aware home");
  await page.getByRole("button", { name: "Product workspace" }).click();
  const directory = page.getByRole("dialog", { name: "All Resource360 screens" });
  await expect(directory.getByRole("heading", { name: "All 103 Resource360 screens" })).toBeVisible();
  await expect(directory.locator(".screen-card-grid > button")).toHaveCount(103);
});

test("publishes five playable validated product recordings", async ({ page }) => {
  await page.goto("/?screen=GLB-06");
  await expect(page.getByRole("heading", { name: "Validated product walkthroughs" })).toBeVisible();
  await expect(page.locator(".video-library video")).toHaveCount(5);
  await expect(page.getByText("5 recordings verified", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Download MP4" })).toHaveCount(5);
  for (const video of await page.locator(".video-library video").all()) {
    await expect(video).toHaveAttribute("poster", /demo-videos\/.+\.jpg$/);
    await expect(video.locator("source")).toHaveAttribute("src", /demo-videos\/.+\.mp4$/);
    await expect(video.locator("track")).toHaveAttribute("src", /demo-videos\/.+\.vtt$/);
  }
});

test("renders every one of the 103 PRD routes", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile-chromium", "Full catalogue is exercised once in desktop Chromium.");
  test.slow();
  expect(screens).toHaveLength(103);
  for (const screen of screens) {
    await page.goto(`/?screen=${screen.id}`);
    await expect(page.locator(".page-header h1")).toHaveText(screen.title);
    await expect(page.locator(".prototype-footer")).toContainText("of 103");
  }
});

test("executes the attributable staffing decision path", async ({ page }) => {
  await page.goto("/?screen=GLB-05");
  await page.getByRole("button", { name: /COE Staffer Salesforce COE/ }).click();
  await page.getByRole("button", { name: /Apply role and scope/ }).click();
  await expect(page.locator(".topbar .eyebrow")).toHaveText("COE Staffer");

  await page.goto("/?screen=STFUI-21");
  await page.getByRole("row", { name: /SR-1842/ }).getByRole("button", { name: /Review/ }).click();
  await page.locator(".decision-panel").getByRole("button", { name: /Make decision/ }).click();
  await page.getByLabel(/I confirm the current controls/).check();
  await page.getByRole("button", { name: /Confirm accepted/ }).click();
  await expect(page.locator(".decision-outcome").getByText("Request accepted", { exact: true })).toBeVisible();
  await expect(page.getByText(/SR-1842 accepted and saved/)).toBeVisible();
});

test("shows all approved persona, lineage and retention contracts", async ({ page }) => {
  await switchRole(page, "Operations");
  await page.goto("/?screen=ADMUI-03");
  await expect(page.getByRole("heading", { name: "Persona assignment matrix" })).toBeVisible();
  await expect(page.locator(".responsive-table tbody tr")).toHaveCount(18);

  await page.goto("/?screen=ADMUI-07");
  await expect(page.locator(".source-contract-grid > article")).toHaveCount(13);
  await expect(page.getByRole("heading", { name: "Approved mock retention schedule" })).toBeVisible();
  await expect(page.locator(".data-surface .responsive-table tbody tr")).toHaveCount(8);
});

test("runs all five external domains as safe demo activation simulations", async ({ page }) => {
  await switchRole(page, "Administrator");
  await page.goto("/?screen=ADMUI-01");
  await expect(page.getByRole("heading", { name: "Demo Activation Center" })).toBeVisible();
  await expect(page.locator(".activation-grid > article")).toHaveCount(5);
  await expect(page.getByText("Identity and SSO", { exact: true })).toBeVisible();
  await expect(page.getByText("EXL integrations", { exact: true })).toBeVisible();
  await expect(page.getByText("Production-like data", { exact: true })).toBeVisible();
  await expect(page.getByText("Legal and business approvals", { exact: true })).toBeVisible();
  await expect(page.getByText("Operational controls", { exact: true })).toBeVisible();
  await expect(page.locator(".activation-approvals tbody tr")).toHaveCount(6);
  await page.getByRole("button", { name: "Run complete demo activation" }).click();
  await expect(page.getByText("5/5 passed", { exact: true })).toBeVisible();
  await expect(page.getByText(/passed all five sanitized activation simulations/)).toBeVisible();
  await expect(page.getByText("Sanitized demo only", { exact: true })).toBeVisible();
});

test("applies positive and negative persona navigation contracts", async ({ page }) => {
  await switchRole(page, "Executive Viewer");
  await expect(page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: /Command center/ })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: /Administration/ })).toHaveCount(0);
  await page.goto("/?screen=ADMUI-03");
  await expect(page.getByRole("heading", { name: "Screen unavailable for Executive Viewer" })).toBeVisible();

  await switchRole(page, "Configuration Approver");
  await expect(page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: /Administration/ })).toBeVisible();
  await page.goto("/?screen=ADMUI-06");
  await expect(page.getByRole("heading", { name: "Approval and escalation policy", level: 1 })).toBeVisible();

  await switchRole(page, "Finance/PMO");
  await expect(page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: /Budgeting & WBS/ })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: /Administration/ })).toHaveCount(0);
});

test("enforces positive and negative screen contracts for every governed persona", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile-chromium", "The complete persona matrix is exercised once in desktop Chromium.");
  test.slow();
  expect(demoRoles).toHaveLength(18);
  for (const role of demoRoles) {
    const authorized = screens.find((screen) => canAccessScreen(role, screen));
    const restricted = screens.find((screen) => !canAccessScreen(role, screen));
    expect(authorized, `${role} must have an authorized route`).toBeDefined();
    await switchRole(page, role);
    await page.goto(`/?screen=${authorized!.id}`);
    await expect(page.locator(".page-header h1")).toHaveText(authorized!.title);
    await expect(page.locator(".access-denied")).toHaveCount(0);

    if (role === "Administrator") {
      expect(restricted, "Administrator is the explicit unrestricted control persona").toBeUndefined();
    } else {
      expect(restricted, `${role} must have a restricted route`).toBeDefined();
      await page.goto(`/?screen=${restricted!.id}`);
      await expect(page.getByRole("heading", { name: `Screen unavailable for ${role}` })).toBeVisible();
    }
  }
});

test("has no serious or critical automated accessibility findings on control surfaces", async ({ page }) => {
  await switchRole(page, "Administrator");
  for (const id of ["GLB-02", "GLB-06", "STFUI-23", "BUDUI-08", "TIMEUI-01", "ADMUI-01", "ADMUI-03", "ADMUI-07"]) {
    await page.goto(`/?screen=${id}`);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    const blocking = results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact || ""));
    expect(blocking, `${id}: ${blocking.map((item) => `${item.id} (${item.nodes.length})`).join(", ")}`).toEqual([]);
  }
});

test("keeps primary content usable at a narrow viewport approximating 200 percent zoom", async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 900 });
  await switchRole(page, "Administrator");
  await page.goto("/?screen=ADMUI-03");
  await expect(page.locator(".page-header h1")).toHaveText("Role-permission matrix");
  await expect(page.getByRole("heading", { name: "Persona assignment matrix" })).toBeVisible();
  const documentOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(documentOverflow).toBeLessThanOrEqual(1);
});
