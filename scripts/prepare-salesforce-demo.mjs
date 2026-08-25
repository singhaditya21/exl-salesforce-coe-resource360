import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

const targetIndex = process.argv.indexOf("--target-org");
const targetOrg = targetIndex >= 0 ? process.argv[targetIndex + 1] : process.env.RESOURCE360_TARGET_ORG;
assert(targetOrg, "Pass --target-org or set RESOURCE360_TARGET_ORG.");

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

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

const query = (soql, tooling = false) => sfJson([
    "data", "query", "--target-org", targetOrg,
    ...(tooling ? ["--use-tooling-api"] : []),
    "--query", soql
]);

const apiRequest = (url, method = "GET", body) => {
    const args = ["api", "request", "rest", url, "--target-org", targetOrg, "--method", method];
    if (body !== undefined) args.push("--body", body);
    const output = execFileSync("sf", args, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 180_000
    });
    return output.trim() ? JSON.parse(output) : {};
};

const waitFor = async (description, check, timeoutMilliseconds = 120_000) => {
    const deadline = Date.now() + timeoutMilliseconds;
    let lastResult;
    while (Date.now() < deadline) {
        lastResult = await check();
        if (lastResult.ready) return lastResult.value;
        await delay(5_000);
    }
    assert.fail(`${description} did not finish in time: ${JSON.stringify(lastResult?.value ?? null)}`);
};

const groupedCounts = (objectName, fieldName, whereClause = "") => {
    const result = query(
        `SELECT ${fieldName} category, COUNT(Id) total FROM ${objectName} ${whereClause} GROUP BY ${fieldName}`
    );
    return Object.fromEntries(result.records.map((record) => [record.category, record.total]));
};

const assertMinimums = (actual, expected, label) => {
    for (const [category, minimum] of Object.entries(expected)) {
        assert(
            (actual[category] ?? 0) >= minimum,
            `${label} must include at least ${minimum} ${category} record(s); found ${actual[category] ?? 0}.`
        );
    }
};

const permissionGroups = await waitFor("Permission-set group recalculation", async () => {
    const result = query(
        "SELECT DeveloperName, Status FROM PermissionSetGroup WHERE DeveloperName LIKE 'Resource360_%'"
    );
    const nonUpdated = result.records.filter((record) => record.Status !== "Updated");
    return {
        ready: result.totalSize === 17 && nonUpdated.length === 0,
        value: { total: result.totalSize, nonUpdated }
    };
});
assert.equal(permissionGroups.total, 17);

const seedResult = sfJson([
    "apex", "run", "--target-org", targetOrg,
    "--file", "scripts/apex/seedResource360.apex"
]);
assert.equal(seedResult.compiled, true, "The deterministic demo seed did not compile.");
assert.equal(seedResult.success, true, `The deterministic demo seed failed: ${seedResult.exceptionMessage}`);

const provisioningResult = sfJson([
    "apex", "run", "--target-org", targetOrg,
    "--file", "scripts/apex/provisionResource360DemoUsers.apex"
]);
assert.equal(provisioningResult.compiled, true, "The fictional persona provisioner did not compile.");
assert.equal(provisioningResult.success, true, `The fictional persona provisioner failed: ${provisioningResult.exceptionMessage}`);
const scopeJobId = provisioningResult.logs.match(/Scope job: (707\w+)/)?.[1];
assert(scopeJobId, "The fictional persona provisioner did not return its scope job ID.");

const scopeJob = await waitFor("Persona scope and sharing rebuild", async () => {
    const result = query(
        `SELECT Status, NumberOfErrors, ExtendedStatus FROM AsyncApexJob WHERE Id='${scopeJobId}'`
    );
    const job = result.records[0];
    return {
        ready: ["Completed", "Failed", "Aborted"].includes(job?.Status),
        value: job
    };
});
assert.equal(scopeJob.Status, "Completed", `Persona scope job did not complete: ${scopeJob.ExtendedStatus}`);
assert.equal(scopeJob.NumberOfErrors, 0, "Persona scope job reported errors.");

const users = query(
    "SELECT FederationIdentifier, IsActive FROM User WHERE FederationIdentifier LIKE 'R360-DEMO-%'"
);
assert.equal(users.totalSize, 8, "Exactly eight fictional demo identities are required.");
assert.equal(users.records.filter((user) => user.IsActive).length, 8, "Every fictional demo identity must be active.");

const assignments = query(
    "SELECT Assignee.FederationIdentifier, PermissionSetGroup.DeveloperName " +
    "FROM PermissionSetAssignment WHERE Assignee.FederationIdentifier LIKE 'R360-DEMO-%' " +
    "AND PermissionSetGroupId != null"
);
assert.equal(assignments.totalSize, 17, "Every non-administrator persona must have one governed group assignment.");
assert.equal(new Set(assignments.records.map((record) => record.PermissionSetGroup.DeveloperName)).size, 17);

const scopes = query(
    "SELECT Business_Role__c, User__r.FederationIdentifier FROM R360_Role_Scope__c " +
    "WHERE Active__c=true AND User__r.FederationIdentifier LIKE 'R360-DEMO-%'"
);
assert.equal(scopes.totalSize, 17, "Every non-administrator persona must have one certified active scope.");
assert.equal(new Set(scopes.records.map((record) => record.Business_Role__c)).size, 17);

const administratorBusinessScopes = query(
    "SELECT COUNT() FROM R360_Role_Scope__c WHERE Active__c=true " +
    "AND Business_Role__c!='Administrator' AND User__r.Profile.Name='System Administrator'"
);
assert.equal(administratorBusinessScopes.totalSize, 0, "Administrators must not retain active business-persona scopes.");

const resourceLinks = query(
    "SELECT Employee_ID__c FROM Resource__c WHERE Salesforce_User__r.FederationIdentifier LIKE 'R360-DEMO-%'"
);
assert.equal(resourceLinks.totalSize, 3, "Practitioner, manager and project-manager users must link to demo resources.");

const appMenu = query("SELECT Name, IsAccessible FROM AppMenuItem WHERE Name='Resource360'");
assert.equal(appMenu.totalSize, 1, "The Resource 360 Lightning app must exist.");
assert.equal(appMenu.records[0].IsAccessible, true, "The Resource 360 Lightning app must be accessible.");

assert(query("SELECT COUNT() FROM Resource__c").totalSize >= 12, "The demo requires at least 12 resources.");
assert(query("SELECT COUNT() FROM Engagement__c").totalSize >= 4, "The demo requires at least four engagements.");

const staffing = groupedCounts("Staffing_Request__c", "State__c");
assertMinimums(staffing, {
    Draft: 1,
    Pending: 1,
    Accepted: 5,
    Declined: 1,
    Expired: 1,
    Withdrawn: 1
}, "Staffing queue");

const allocations = groupedCounts("Allocation__c", "Classification__c", "WHERE Current__c=true");
assertMinimums(allocations, { Billing: 2, WAR: 1, "IFB/PO Awaited": 1, Training: 1 }, "Allocation control");

const timesheets = groupedCounts("Timesheet__c", "Status__c", "WHERE Current__c=true");
assertMinimums(timesheets, {
    Draft: 1,
    Submitted: 2,
    Approved: 1,
    Rejected: 1,
    "Correction Pending": 1
}, "Timesheet queue");

const configurations = groupedCounts(
    "R360_Configuration__c", "State__c", "WHERE Version_Key__c LIKE 'DEMO-CONFIG-%'"
);
assertMinimums(configurations, { Draft: 1, "Pending Approval": 1, Active: 1, Rejected: 1 }, "Configuration control");

assert.equal(
    query("SELECT COUNT() FROM R360_Learning_Achievement__c WHERE Achievement_ID__c LIKE 'DEMO-LRN-%'").totalSize,
    4,
    "Four learning achievements are required."
);
assert.equal(
    query("SELECT COUNT() FROM R360_Calendar_Exception__c WHERE Exception_Key__c LIKE 'DEMO-CAL-%'").totalSize,
    3,
    "Three calendar exceptions are required."
);
assert.equal(
    query("SELECT COUNT() FROM R360_Integration_Error__c WHERE Integration_Run__r.Run_ID__c='DEMO-SOURCE-ERRORS'").totalSize,
    3,
    "Three integration exceptions are required."
);

const walkthroughs = query(
    "SELECT Name, ContentType, CacheControl FROM StaticResource WHERE Name LIKE 'Resource360_Walkthrough_%'"
);
assert.equal(walkthroughs.totalSize, 5, "Five Salesforce walkthrough resources are required.");
assert(
    walkthroughs.records.every((resource) => resource.ContentType === "application/zip" && resource.CacheControl === "Private"),
    "Every walkthrough must be a private ZIP static resource."
);

const reports = query(
    "SELECT Id, DeveloperName FROM Report WHERE DeveloperName IN " +
    "('Allocation_Control','Budget_Economics','Capability_Supply','Staffing_Performance','Timesheet_Actuals')"
);
assert.equal(reports.totalSize, 5, "Five native Salesforce reports are required.");
const reportRows = {};
for (const report of reports.records) {
    const result = apiRequest(`/services/data/v67.0/analytics/reports/${report.Id}?includeDetails=false`);
    const rowCount = result.factMap?.["T!T"]?.aggregates?.[0]?.value ?? 0;
    assert(rowCount > 0, `${report.DeveloperName} must return demo data.`);
    reportRows[report.DeveloperName] = rowCount;
}

const dashboards = query("SELECT Id FROM Dashboard WHERE DeveloperName='Command_Center'");
assert.equal(dashboards.totalSize, 1, "The Resource 360 Command Center dashboard is required.");
const dashboardId = dashboards.records[0].Id;
const refreshRequest = apiRequest(
    `/services/data/v67.0/analytics/dashboards/${dashboardId}`,
    "PUT",
    "{}"
);
const statusUrl = refreshRequest.statusUrl ?? `/services/data/v67.0/analytics/dashboards/${dashboardId}/status`;
await waitFor("Command Center dashboard refresh", async () => {
    const result = apiRequest(statusUrl);
    const statuses = result.componentStatus ?? [];
    const terminal = statuses.length === 5 && statuses.every((status) => status.refreshStatus === "IDLE");
    return { ready: terminal, value: statuses };
});
const dashboard = apiRequest(`/services/data/v67.0/analytics/dashboards/${dashboardId}`);
assert.equal(dashboard.componentData.length, 5, "The Command Center must have five dashboard components.");
assert(
    dashboard.componentData.every((component) => component.status.componentDataStatus === "DATA"),
    "Every Command Center component must contain refreshed data."
);
const dashboardRows = dashboard.componentData.map(
    (component) => component.reportResult?.factMap?.["T!T"]?.aggregates?.[0]?.value ?? 0
);
assert(dashboardRows.every((count) => count > 0), "Every Command Center component must return at least one row.");

const scheduler = query(
    "SELECT State, NextFireTime FROM CronTrigger WHERE CronJobDetail.Name='Resource360 Operational Controls'"
);
assert.equal(scheduler.totalSize, 1, "Exactly one Resource 360 operational scheduler must be active.");
assert.equal(scheduler.records[0].State, "WAITING", "The Resource 360 operational scheduler must be waiting.");

process.stdout.write(`${JSON.stringify({
    targetOrg,
    permissionSetGroups: 17,
    fictionalUsers: 8,
    personaAssignments: assignments.totalSize,
    certifiedScopes: scopes.totalSize,
    resources: query("SELECT COUNT() FROM Resource__c").totalSize,
    engagements: query("SELECT COUNT() FROM Engagement__c").totalSize,
    staffing,
    allocations,
    timesheets,
    configurations,
    walkthroughs: walkthroughs.totalSize,
    reportRows,
    dashboardComponents: dashboard.componentData.length,
    dashboardRows,
    scheduler: scheduler.records[0].State
}, null, 2)}\n`);
