import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chromium } from "@playwright/test";
import { MODULES, SCREENS as RAW_SCREENS } from "../force-app/main/default/lwc/resource360Workspace/screenCatalog.js";
import { governedScreens } from "../force-app/main/default/lwc/resource360Workspace/screenContracts.js";

const targetIndex = process.argv.indexOf("--target-org");
const targetOrg = targetIndex >= 0 ? process.argv[targetIndex + 1] : process.env.RESOURCE360_TARGET_ORG;
assert(targetOrg, "Pass --target-org or set RESOURCE360_TARGET_ORG.");

const SCREENS = governedScreens(RAW_SCREENS);
const PERSONAS = Object.freeze([
    { alias: "r360pmgr", role: "Project Manager", screen: "ENG-01", minimumRecords: 20 },
    { alias: "r360staf", role: "COE Staffer", screen: "STFUI-21", minimumRecords: 1 },
    { alias: "r360mgr", role: "Reporting Manager", screen: "SKLUI-12", minimumRecords: 1 },
    { alias: "r360capa", role: "Capability Administrator", screen: "SKLUI-14", minimumRecords: 1 },
    { alias: "r360cfgm", role: "Configuration Operator", screen: "ADMUI-04", evidence: "Stage and validate configuration" },
    { alias: "r360chkr", role: "Configuration Approver", screen: "ADMUI-06", evidence: "Approve atomically" },
    { alias: "r360aprv", role: "Budget Approver", screen: "BUDUI-09", minimumRecords: 1 },
    { alias: "r360prac", role: "Practitioner", screen: "SKLUI-06", evidence: "Data Cloud" }
]);

const sfJson = (args) => {
    const output = execFileSync("sf", [...args, "--json"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 180_000
    });
    const response = JSON.parse(output);
    assert.equal(response.status, 0, `Salesforce CLI command failed: sf ${args.join(" ")}`);
    return response.result;
};

const query = (soql) => sfJson([
    "data", "query", "--target-org", targetOrg, "--query", soql
]);

const authenticatedAdminUrl = () => sfJson([
    "org", "open", "--target-org", targetOrg, "--url-only"
]).url;

const org = sfJson(["org", "display", "--target-org", targetOrg]);
assert(org.id, "The Salesforce organization ID is required for controlled Login As.");
assert(org.instanceUrl, "The Salesforce instance URL is required for controlled Login As.");

const usersResult = query(
    "SELECT Id, Alias, Name, FederationIdentifier, Profile.PermissionsModifyAllData, Profile.PermissionsViewAllData FROM User " +
    "WHERE IsActive=true AND FederationIdentifier LIKE 'R360-DEMO-%'"
);
assert.equal(usersResult.totalSize, 8, "Exactly eight active fictional demo identities are required.");
const usersByAlias = new Map(usersResult.records.map((user) => [user.Alias, user]));

const scopesResult = query(
    "SELECT User__r.Alias, Business_Role__c, Portfolio_ID__c FROM R360_Role_Scope__c " +
    "WHERE Active__c=true AND Valid_From__c<=TODAY AND (Valid_To__c=null OR Valid_To__c>=TODAY) " +
    "AND User__r.FederationIdentifier LIKE 'R360-DEMO-%'"
);
assert.equal(scopesResult.totalSize, 17, "Exactly seventeen certified fictional persona scopes are required.");
assert(
    scopesResult.records.every((scope) => scope.Portfolio_ID__c === "PORT-SFCOE-DEMO"),
    "Every persona must be scoped to PORT-SFCOE-DEMO before Lightning validation."
);
const rolesByAlias = new Map();
for (const scope of scopesResult.records) {
    const alias = scope.User__r.Alias;
    if (!rolesByAlias.has(alias)) rolesByAlias.set(alias, []);
    rolesByAlias.get(alias).push(scope.Business_Role__c);
}
for (const roles of rolesByAlias.values()) roles.sort();

const intakePortfolio = query(
    "SELECT Name, Portfolio_ID__c FROM R360_Portfolio__c WHERE Portfolio_ID__c='PORT-SFCOE-DEMO' LIMIT 1"
).records[0];
assert(intakePortfolio, "The governed intake portfolio is required.");
const intakePortfolioLabel = `${intakePortfolio.Portfolio_ID__c} · ${intakePortfolio.Name}`;

const moduleFor = (screenId) => {
    const screen = SCREENS.find((candidate) => candidate.id === screenId);
    assert(screen, `Unknown governed screen ${screenId}.`);
    return MODULES.find((module) => module.id === screen.module);
};

const negativeModuleFor = (role) => MODULES.find((module) =>
    !SCREENS.some((screen) => screen.module === module.id && screen.allowedRoles.includes(role))
);

const trustedSalesforceHost = (url) => {
    const hostname = new URL(url).hostname;
    return hostname.endsWith(".salesforce.com") || hostname.endsWith(".force.com");
};

const loginAsUrl = (userId) => {
    const url = new URL("/servlet/servlet.su", org.instanceUrl);
    url.searchParams.set("oid", org.id);
    url.searchParams.set("suorgadminid", userId);
    url.searchParams.set("retURL", "/005");
    url.searchParams.set("targetURL", "/lightning/n/Resource360_Workspace?c__screen=GLB-02");
    return url.href;
};

let browser;
const results = [];
try {
    browser = await chromium.launch({ headless: true });
    for (const persona of PERSONAS) {
        process.stderr.write(`Validating ${persona.alias}/${persona.role}...\n`);
        const user = usersByAlias.get(persona.alias);
        assert(user, `The ${persona.alias} fictional identity is missing.`);
        assert.equal(user.Profile.PermissionsModifyAllData, false, `${persona.alias} must not have Modify All Data.`);
        assert.equal(user.Profile.PermissionsViewAllData, false, `${persona.alias} must not have View All Data.`);
        const expectedRoles = rolesByAlias.get(persona.alias) ?? [];
        assert(expectedRoles.includes(persona.role), `${persona.alias} is missing the ${persona.role} certified scope.`);

        const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
        const page = await context.newPage();
        const consoleErrors = [];
        try {
            const adminUrl = authenticatedAdminUrl();
            assert(adminUrl, "Salesforce CLI did not return an authenticated administrator route.");
            await page.goto(adminUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
            await page.waitForURL((url) => !url.pathname.includes("/secur/frontdoor.jsp"), { timeout: 60_000 });
            assert(trustedSalesforceHost(page.url()), "Administrator authentication did not reach Salesforce.");

            await page.goto(loginAsUrl(user.Id), { waitUntil: "domcontentloaded", timeout: 60_000 });
            const switchToLightning = page.getByText("Switch to Lightning Experience", { exact: true });
            if (await switchToLightning.count()) {
                await switchToLightning.first().click();
                await page.waitForURL((url) => url.hostname.endsWith(".lightning.force.com"), { timeout: 60_000 });
            }

            const currentOrigin = new URL(page.url()).origin;
            await page.goto(`${currentOrigin}/lightning/n/Resource360_Workspace?c__screen=GLB-02`, {
                waitUntil: "domcontentloaded",
                timeout: 60_000
            });
            await page.getByText("Salesforce demo system of record", { exact: true }).waitFor({ state: "visible", timeout: 60_000 });
            const signedInIdentity = page.locator(".session-identity").filter({ hasText: user.Name });
            await signedInIdentity.waitFor({ state: "visible", timeout: 60_000 });
            assert.equal(await signedInIdentity.getAttribute("data-user-id"), user.Id, `Login As session did not resolve the expected ${user.Name} identity.`);
            assert((await signedInIdentity.textContent()).includes(user.Name), `Resource 360 did not display the expected signed-in user ${user.Name}.`);
            await page.locator(".role-chip, .error-panel").first().waitFor({ state: "visible", timeout: 60_000 });
            assert.equal(await page.locator(".error-panel").count(), 0, `${persona.alias} workspace raised a data-load error.`);

            page.on("console", (message) => {
                if (message.type() === "error") consoleErrors.push(message.text());
            });
            page.on("pageerror", (error) => consoleErrors.push(error.message));

            const rolePicker = page.getByRole("combobox", { name: "Active business role" });
            const intendedRoleChip = page.locator(".role-chip").filter({ hasText: persona.role });
            let intendedRoleActive = false;
            try {
                await intendedRoleChip.waitFor({ state: "visible", timeout: 5_000 });
                intendedRoleActive = true;
            } catch {
                // The user's first active scope can differ from the route persona.
            }
            if (!intendedRoleActive) {
                await rolePicker.click();
                const roleOption = page.getByRole("option", { name: persona.role, exact: true });
                await roleOption.waitFor({ state: "visible", timeout: 15_000 });
                // Salesforce renders the base-combobox listbox in a transient overlay.
                // Dispatching the option's own click avoids unrelated utility panels
                // stealing the pointer between Playwright's visibility and click phases.
                await roleOption.evaluate((option) => option.click());
            }
            await intendedRoleChip.waitFor({ state: "visible", timeout: 15_000 });

            const positiveModule = moduleFor(persona.screen);
            await page.locator(".module-button").filter({ hasText: positiveModule.label }).first().click();
            await page.locator(".screen-button").filter({ hasText: persona.screen }).first().click();
            await page.locator(".screen-id").filter({ hasText: persona.screen }).waitFor({ state: "visible", timeout: 15_000 });
            assert.equal(await page.locator(".contract-panel").count(), 1, `${persona.alias} did not render the governed ${persona.screen} contract.`);

            let visibleRecords;
            if (persona.minimumRecords !== undefined) {
                const visibleFact = page.locator(".route-facts article").filter({ hasText: "Visible records" }).first();
                await visibleFact.waitFor({ state: "visible", timeout: 15_000 });
                visibleRecords = Number((await visibleFact.locator("strong").innerText()).trim());
                assert(
                    visibleRecords >= persona.minimumRecords,
                    `${persona.alias}/${persona.role} requires at least ${persona.minimumRecords} live record(s) on ${persona.screen}; found ${visibleRecords}.`
                );
            } else {
                await page.getByText(persona.evidence, { exact: true }).first().waitFor({ state: "visible", timeout: 15_000 });
            }

            const unavailableModule = negativeModuleFor(persona.role);
            assert(unavailableModule, `${persona.role} unexpectedly authorizes every governed module.`);
            assert.equal(
                await page.locator(".module-button").filter({ hasText: unavailableModule.label }).count(),
                0,
                `${persona.alias}/${persona.role} exposed unauthorized ${unavailableModule.label} navigation.`
            );
            assert.deepEqual(consoleErrors, [], `${persona.alias} Lightning emitted application errors: ${consoleErrors.join(" | ")}`);

            let projectWorkbench;
            if (persona.alias === "r360pmgr") {
                await page.goto(`${currentOrigin}/lightning/n/Resource360_Project_Workbench`, {
                    waitUntil: "domcontentloaded",
                    timeout: 60_000
                });
                await page.getByRole("heading", { name: "Project delivery workbench", exact: true })
                    .waitFor({ state: "visible", timeout: 60_000 });
                await page.getByText("3 governed version(s)", { exact: true })
                    .waitFor({ state: "visible", timeout: 30_000 });
                assert.equal(await page.locator(".gantt-row").count(), 7, "Project Manager must see the seven governed WBS items.");
                assert.equal(await page.locator(".resize-handle").count(), 7, "Every governed Gantt bar must expose a direct duration-resize handle.");
                assert.equal(await page.getByText("WBS-DC-01", { exact: true }).count(), 0, "The retired legacy work item must not appear in the Gantt.");
                const taskActualLabels = await page.locator(".task-label small").allTextContents();
                const positiveActualLabels = taskActualLabels.filter((label) => /·\s*[1-9]\d*(?:\.\d+)?h actual\s*$/.test(label));
                assert.equal(
                    positiveActualLabels.length >= 2,
                    true,
                    `Project Manager must see both shared approved delivery actuals; found ${positiveActualLabels.join(" | ") || "none"}.`
                );
                const intakeSection = page.getByText("Governed project intake · create project and initial SOW", { exact: true });
                await intakeSection.waitFor({ state: "visible", timeout: 30_000 });
                await intakeSection.click();
                const portfolioPicker = page.getByRole("combobox", { name: "Authorized portfolio", exact: true });
                await portfolioPicker.waitFor({ state: "visible", timeout: 30_000 });
                await page.getByText(intakePortfolioLabel, { exact: true })
                    .waitFor({ state: "visible", timeout: 30_000 });

                await page.locator(".task-label").filter({ hasText: "WBS-SF-03" }).first().click();
                await page.getByRole("button", { name: "Save forecast dates", exact: true }).click();
                await page.getByText("Work unit rescheduled with successors.", { exact: true })
                    .waitFor({ state: "visible", timeout: 30_000 });
                await page.getByRole("button", { name: "Update progress", exact: true }).click();
                await page.getByText("Work-unit progress updated.", { exact: true })
                    .waitFor({ state: "visible", timeout: 30_000 });
                await page.getByRole("tab", { name: "Contract & budget", exact: true }).click();
                await page.getByRole("heading", { name: "Add amendment or change order", exact: true })
                    .waitFor({ state: "visible", timeout: 30_000 });
                await page.getByRole("heading", { name: "Add contract line", exact: true })
                    .waitFor({ state: "visible", timeout: 30_000 });
                projectWorkbench = {
                    governedTasks: 7,
                    contractVersions: 3,
                    approvedActualsVisible: true,
                    projectIntakeVisible: true,
                    authorizedPortfolioSelected: true,
                    directResizeHandles: 7,
                    forecastWrite: true,
                    progressWrite: true,
                    contractChangeControls: true
                };
                assert.deepEqual(consoleErrors, [], `${persona.alias} Project Workbench emitted application errors: ${consoleErrors.join(" | ")}`);
            }

            results.push({
                alias: persona.alias,
                federationIdentifier: user.FederationIdentifier,
                name: user.Name,
                loginAs: true,
                assignedRoles: expectedRoles,
                activeRole: persona.role,
                positiveScreen: persona.screen,
                visibleRecords,
                negativeModule: unavailableModule.label,
                projectWorkbench,
                consoleErrors: 0
            });
        } catch (error) {
            await page.screenshot({ path: `/tmp/resource360-${persona.alias}-failure.png`, fullPage: true });
            error.message = `${persona.alias}/${persona.role}: ${error.message}`;
            throw error;
        } finally {
            await context.close();
        }
    }

    process.stdout.write(`${JSON.stringify({
        targetOrg,
        method: "Salesforce Administrator Login As",
        fictionalIdentities: results.length,
        certifiedScopes: scopesResult.totalSize,
        portfolioScope: "PORT-SFCOE-DEMO",
        results
    }, null, 2)}\n`);
} finally {
    if (browser) await browser.close();
}
