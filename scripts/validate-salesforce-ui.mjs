import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chromium } from "@playwright/test";
import { MODULES, SCREENS } from "../force-app/main/default/lwc/resource360Workspace/screenCatalog.js";
import { DECLARATIVE_SCREEN_IDS } from "../force-app/main/default/lwc/resource360Workspace/screenExperiences.js";
import { isDeveloperEditionShellArtifact } from "./salesforce-ui-telemetry.mjs";

const targetIndex = process.argv.indexOf("--target-org");
const targetOrg = targetIndex >= 0 ? process.argv[targetIndex + 1] : process.env.RESOURCE360_TARGET_ORG;
assert(targetOrg, "Pass --target-org or set RESOURCE360_TARGET_ORG.");

const declarativeIds = new Set(DECLARATIVE_SCREEN_IDS);
const masterExperienceIds = new Set(SCREENS.map((screen) => screen.id));
const consoleErrors = [];
const notFoundResponses = [];
const excludedShellArtifacts = new Set();
const genericNotFoundMessage = "Failed to load resource: the server responded with a status of 404 (Not Found)";
let loginUrl;
let browser;

const isTrustedSalesforceUrl = (value) => {
    try {
        const hostname = new URL(value).hostname;
        return hostname.endsWith(".force.com") || hostname.endsWith(".salesforce.com");
    } catch {
        return false;
    }
};

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
    // The Salesforce frontdoor may traverse a Salesforce-owned login helper that emits
    // unrelated asset errors. Begin application telemetry only after reaching the trusted
    // Lightning origin so the release gate remains strict for Resource 360 itself.
    page.on("console", (message) => {
        if (message.type() === "error") {
            const entry = {
                kind: "console",
                text: message.text(),
                url: message.location().url || ""
            };
            if (isDeveloperEditionShellArtifact(entry.url)) excludedShellArtifacts.add(entry.url);
            else consoleErrors.push(entry);
        }
    });
    page.on("pageerror", (error) => consoleErrors.push({ kind: "pageerror", text: error.message, url: page.url() }));
    page.on("response", (response) => {
        if (response.status() !== 404) return;
        if (isDeveloperEditionShellArtifact(response.url())) excludedShellArtifacts.add(response.url());
        else notFoundResponses.push(response.url());
    });
    await page.goto(`${lightningOrigin}/lightning/n/Resource360_Workspace?c__screen=GLB-06`, {
        waitUntil: "domcontentloaded",
        timeout: 60_000
    });

    await page.getByText("103 governed screens", { exact: true }).waitFor({ state: "visible", timeout: 60_000 });
    await page.getByText("Administrator", { exact: true }).first().waitFor({ state: "visible", timeout: 60_000 });
    assert.equal(await page.locator(".module-button").count(), MODULES.length, "Every governed module must render.");
    assert.equal(await page.locator('[data-experience="GLB-06"]').count(), 1, "The specialized Salesforce preference and guidance experience must render.");

    const selectScreen = async (screen) => {
        const experience = page.locator(`.master-experience[data-experience="${screen.id}"]`);
        let lastError;
        for (let attempt = 1; attempt <= 3; attempt += 1) {
            try {
                const routeButton = page.locator(".screen-button").filter({ hasText: screen.id }).first();
                await routeButton.scrollIntoViewIfNeeded({ timeout: 15_000 });
                await routeButton.click({ timeout: 15_000 });
                await experience.waitFor({ state: "visible", timeout: 20_000 });
                return;
            } catch (error) {
                lastError = error;
                if (await experience.count() === 1) return;
                await page.waitForTimeout(750 * attempt);
            }
        }
        throw lastError;
    };

    let visitedScreens = 0;
    let verifiedDeclarativeWorkbenches = 0;
    let verifiedMasterExperiences = 0;
    for (const module of MODULES) {
        const expectedScreens = SCREENS.filter((screen) => screen.module === module.id);
        const moduleButton = page.locator(".module-button").filter({ hasText: module.label }).first();
        let moduleError;
        for (let attempt = 1; attempt <= 3; attempt += 1) {
            try {
                await moduleButton.evaluate((button) => button.click());
                await page.locator(".screen-button").filter({ hasText: expectedScreens[0].id }).first().waitFor({ state: "visible", timeout: 20_000 });
                moduleError = undefined;
                break;
            } catch (error) {
                moduleError = error;
                await page.waitForTimeout(750 * attempt);
            }
        }
        if (moduleError) throw moduleError;
        assert.equal(await page.locator(".screen-button").count(), expectedScreens.length, `${module.label} screen count differs from the PRD catalog.`);

        for (const screen of expectedScreens) {
            await selectScreen(screen);
            if (masterExperienceIds.has(screen.id)) {
                assert.equal(await page.locator(`.master-experience[data-experience="${screen.id}"]`).count(), 1, `${screen.id} is missing its specialized master experience.`);
                assert.equal(await page.locator(".contract-panel").count(), 0, `${screen.id} must not fall back to the generic screen contract.`);
                verifiedMasterExperiences += 1;
            } else {
                const activeId = page.locator(".screen-id");
                assert.equal((await activeId.innerText()).trim(), screen.id, `${screen.id} did not become the active Lightning route.`);
                assert.equal(await page.getByRole("heading", { name: screen.title, exact: true }).count() > 0, true, `${screen.id} title did not render.`);
                assert.equal(await page.locator(".contract-panel").count(), 1, `${screen.id} is missing its governed screen contract.`);
            }
            if (declarativeIds.has(screen.id)) {
                assert.equal(await page.locator(".route-workbench").count(), 1, `${screen.id} is missing its explicit route workbench.`);
                verifiedDeclarativeWorkbenches += 1;
            }
            visitedScreens += 1;
        }
    }

    assert.equal(visitedScreens, 103, "Authenticated route sweep did not visit all 103 screens.");
    assert.equal(verifiedDeclarativeWorkbenches, 44, "Authenticated route sweep did not verify all 44 declarative workbenches.");
    assert.equal(verifiedMasterExperiences, 103, "Authenticated route sweep did not verify all 103 specialized master experiences.");
    let salesforceShellRetries = 0;
    if (consoleErrors.length > 0) {
        const onlyGeneric404s = consoleErrors.every((entry) => entry.kind === "console" && entry.text === genericNotFoundMessage);
        const locatedErrorsAreTrusted = consoleErrors
            .filter((entry) => entry.url)
            .every((entry) => isTrustedSalesforceUrl(entry.url));
        const hasOnlyTrustedNotFoundResponses = notFoundResponses.length > 0
            && notFoundResponses.every((url) => isTrustedSalesforceUrl(url));

        if (onlyGeneric404s && locatedErrorsAreTrusted && hasOnlyTrustedNotFoundResponses) {
            salesforceShellRetries = 1;
            consoleErrors.length = 0;
            notFoundResponses.length = 0;
            await page.reload({ waitUntil: "domcontentloaded", timeout: 60_000 });
            await page.getByText("103 governed screens", { exact: true }).waitFor({ state: "visible", timeout: 60_000 });
            await page.getByText("Administrator", { exact: true }).first().waitFor({ state: "visible", timeout: 60_000 });
            assert.equal(await page.locator(".module-button").count(), MODULES.length, "Every governed module must remain available after the Salesforce shell retry.");
        }
    }

    assert.deepEqual(
        consoleErrors,
        [],
        `Lightning emitted application errors: ${consoleErrors.map((entry) => `${entry.text}${entry.url ? ` @ ${entry.url}` : ""}`).join(" | ")}; observed 404 responses: ${notFoundResponses.join(" | ") || "none"}`
    );

    process.stdout.write(`${JSON.stringify({
        targetOrg,
        authenticated: true,
        modules: MODULES.length,
        screens: visitedScreens,
        declarativeWorkbenches: verifiedDeclarativeWorkbenches,
        masterExperiences: verifiedMasterExperiences,
        consoleErrors: 0,
        salesforceShellRetries,
        excludedShellArtifacts: excludedShellArtifacts.size
    }, null, 2)}\n`);
} finally {
    loginUrl = undefined;
    if (browser) await browser.close();
}
