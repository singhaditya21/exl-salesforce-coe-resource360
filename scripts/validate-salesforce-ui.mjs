import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chromium } from "@playwright/test";
import { MODULES, SCREENS } from "../force-app/main/default/lwc/resource360Workspace/screenCatalog.js";
import { DECLARATIVE_SCREEN_IDS } from "../force-app/main/default/lwc/resource360Workspace/screenExperiences.js";

const targetIndex = process.argv.indexOf("--target-org");
const targetOrg = targetIndex >= 0 ? process.argv[targetIndex + 1] : process.env.RESOURCE360_TARGET_ORG;
assert(targetOrg, "Pass --target-org or set RESOURCE360_TARGET_ORG.");

const declarativeIds = new Set(DECLARATIVE_SCREEN_IDS);
const consoleErrors = [];
let loginUrl;
let browser;

try {
    const loginResult = JSON.parse(execFileSync(
        "sf",
        ["org", "open", "--target-org", targetOrg, "--url-only", "--json"],
        { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
    ));
    loginUrl = loginResult?.result?.url;
    assert(loginUrl, "Salesforce CLI did not return an authenticated login route.");

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => consoleErrors.push(error.message));

    try {
        await page.goto(loginUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
        await page.waitForURL(
            (url) => !url.pathname.includes("/secur/frontdoor.jsp"),
            { timeout: 60_000 }
        );
    } catch {
        throw new Error("Authenticated Salesforce frontdoor login failed.");
    } finally {
        loginUrl = undefined;
    }

    const lightningOrigin = new URL(page.url()).origin;
    const lightningHostname = new URL(lightningOrigin).hostname;
    assert(
        lightningHostname.endsWith(".lightning.force.com") || lightningHostname.endsWith(".my.salesforce.com"),
        "Authentication did not reach a trusted Salesforce host."
    );
    await page.goto(`${lightningOrigin}/lightning/n/Resource360_Workspace?c__screen=GLB-06`, {
        waitUntil: "domcontentloaded",
        timeout: 60_000
    });

    await page.getByText("103 governed screens", { exact: true }).waitFor({ state: "visible", timeout: 60_000 });
    await page.getByText("Administrator", { exact: true }).first().waitFor({ state: "visible", timeout: 60_000 });
    assert.equal(await page.locator(".module-button").count(), MODULES.length, "Every governed module must render.");
    assert.equal(await page.locator("video").count(), 5, "The Salesforce help center must expose five walkthroughs.");
    assert.equal(await page.locator("video track[kind='captions']").count(), 5, "Every walkthrough must have captions.");

    const selectScreen = async (screen) => {
        try {
            await page.locator(".screen-button").filter({ hasText: screen.id }).first().click({ timeout: 15_000 });
        } catch (error) {
            const observedId = (await page.locator(".screen-id").innerText()).trim();
            if (observedId !== screen.id) throw error;
        }
        await page.locator(".screen-id").filter({ hasText: screen.id }).waitFor({ state: "visible", timeout: 15_000 });
    };

    let visitedScreens = 0;
    let verifiedDeclarativeWorkbenches = 0;
    for (const module of MODULES) {
        const expectedScreens = SCREENS.filter((screen) => screen.module === module.id);
        const moduleButton = page.locator(".module-button").filter({ hasText: module.label }).first();
        await moduleButton.click();
        await page.locator(".screen-button").filter({ hasText: expectedScreens[0].id }).first().waitFor({ state: "visible", timeout: 15_000 });
        assert.equal(await page.locator(".screen-button").count(), expectedScreens.length, `${module.label} screen count differs from the PRD catalog.`);

        for (const screen of expectedScreens) {
            await selectScreen(screen);
            const activeId = page.locator(".screen-id");
            assert.equal((await activeId.innerText()).trim(), screen.id, `${screen.id} did not become the active Lightning route.`);
            assert.equal(await page.getByRole("heading", { name: screen.title, exact: true }).count() > 0, true, `${screen.id} title did not render.`);
            assert.equal(await page.locator(".contract-panel").count(), 1, `${screen.id} is missing its governed screen contract.`);
            if (declarativeIds.has(screen.id)) {
                assert.equal(await page.locator(".route-workbench").count(), 1, `${screen.id} is missing its explicit route workbench.`);
                verifiedDeclarativeWorkbenches += 1;
            }
            visitedScreens += 1;
        }
    }

    assert.equal(visitedScreens, 103, "Authenticated route sweep did not visit all 103 screens.");
    assert.equal(verifiedDeclarativeWorkbenches, 57, "Authenticated route sweep did not verify all 57 declarative workbenches.");
    assert.deepEqual(consoleErrors, [], `Lightning emitted application errors: ${consoleErrors.join(" | ")}`);

    process.stdout.write(`${JSON.stringify({
        targetOrg,
        authenticated: true,
        modules: MODULES.length,
        screens: visitedScreens,
        declarativeWorkbenches: verifiedDeclarativeWorkbenches,
        walkthroughVideos: 5,
        consoleErrors: 0
    }, null, 2)}\n`);
} finally {
    loginUrl = undefined;
    if (browser) await browser.close();
}
