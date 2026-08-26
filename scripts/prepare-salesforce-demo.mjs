import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

const targetIndex = process.argv.indexOf("--target-org");
const targetOrg = targetIndex >= 0 ? process.argv[targetIndex + 1] : process.env.RESOURCE360_TARGET_ORG;
assert(targetOrg, "Pass --target-org or set RESOURCE360_TARGET_ORG.");

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const sfJson = (args) => {
    let output;
    try {
        output = execFileSync("sf", [...args, "--json"], {
            encoding: "utf8",
            stdio: ["ignore", "pipe", "pipe"],
            timeout: 180_000
        });
    } catch (error) {
        // The Salesforce CLI can leave its update-check worker open after the
        // command has returned a complete successful JSON response. Accept only
        // a parseable status-0 response; partial or failed output still throws.
        const completedOutput = typeof error?.stdout === "string" ? error.stdout.trim() : "";
        if (!completedOutput) throw error;
        const completedResponse = JSON.parse(completedOutput);
        assert.equal(completedResponse.status, 0, `Salesforce CLI command failed: sf ${args.join(" ")}`);
        return completedResponse.result;
    }
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

const executeAnonymous = (apex, label) => {
    const result = apiRequest(
        `/services/data/v67.0/tooling/executeAnonymous/?anonymousBody=${encodeURIComponent(apex)}`
    );
    assert.equal(result.compiled, true, `${label} did not compile: ${result.compileProblem ?? "unknown error"}`);
    assert.equal(result.success, true, `${label} failed: ${result.exceptionMessage ?? "unknown error"}`);
    return result;
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

let demoUserIds = [];
const shareCountCache = new Map();
const shareCount = (objectName, userId) => {
    if (!shareCountCache.has(objectName)) {
        assert(demoUserIds.length > 0, "Demo users must be loaded before scope shares are counted.");
        const userFilter = demoUserIds.map((id) => `'${id}'`).join(",");
        const result = query(
            `SELECT UserOrGroupId, COUNT(Id) total FROM ${objectName.replace("__c", "__Share")} ` +
            `WHERE UserOrGroupId IN (${userFilter}) AND RowCause='Resource360_Scope__c' GROUP BY UserOrGroupId`
        );
        shareCountCache.set(
            objectName,
            new Map(result.records.map((record) => [record.UserOrGroupId, record.total]))
        );
    }
    return shareCountCache.get(objectName).get(userId) ?? 0;
};

const assertShareCount = (objectName, userId, expected, label) => {
    const actual = shareCount(objectName, userId);
    assert.equal(actual, expected, `${label} requires ${expected} ${objectName} scope share(s); found ${actual}.`);
    return actual;
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
const basePermission = query(
    "SELECT PermissionsLightningExperienceUser FROM PermissionSet WHERE Name='Resource360_Base_User' LIMIT 1"
);
assert.equal(basePermission.totalSize, 1, "The Resource 360 base permission set is missing.");
assert.equal(
    basePermission.records[0].PermissionsLightningExperienceUser,
    true,
    "Every persona permission-set group must enable Lightning Experience through the base permission set."
);

// Keep the compact baseline and enterprise graph in separate transactions.
// Their combined DML triggers legitimately exceed a single transaction's
// 100-query governor limit in a populated Developer Edition org.
executeAnonymous("Resource360DemoData.seed();", "The deterministic core demo seed");
executeAnonymous("Resource360ScaleDemoData.ensure();", "The deterministic 10-account/20-project seed");

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
    "SELECT Id, Alias, FederationIdentifier, IsActive, UserPreferencesLightningExperiencePreferred " +
    "FROM User WHERE FederationIdentifier LIKE 'R360-DEMO-%'"
);
assert.equal(users.totalSize, 8, "Exactly eight fictional demo identities are required.");
assert.equal(users.records.filter((user) => user.IsActive).length, 8, "Every fictional demo identity must be active.");
assert(
    users.records.every((user) => user.UserPreferencesLightningExperiencePreferred),
    "Every fictional demo identity must prefer Lightning Experience."
);
demoUserIds = users.records.map((user) => user.Id);

const assignments = query(
    "SELECT Assignee.FederationIdentifier, PermissionSetGroup.DeveloperName " +
    "FROM PermissionSetAssignment WHERE Assignee.FederationIdentifier LIKE 'R360-DEMO-%' " +
    "AND PermissionSetGroupId != null"
);
assert.equal(assignments.totalSize, 17, "Every non-administrator persona must have one governed group assignment.");
assert.equal(new Set(assignments.records.map((record) => record.PermissionSetGroup.DeveloperName)).size, 17);

const scopes = query(
    "SELECT Business_Role__c, Portfolio_ID__c, User__r.FederationIdentifier FROM R360_Role_Scope__c " +
    "WHERE Active__c=true AND User__r.FederationIdentifier LIKE 'R360-DEMO-%'"
);
assert.equal(scopes.totalSize, 17, "Every non-administrator persona must have one certified active scope.");
assert.equal(new Set(scopes.records.map((record) => record.Business_Role__c)).size, 17);
assert(
    scopes.records.every((scope) => scope.Portfolio_ID__c === "PORT-SFCOE-DEMO"),
    "Every fictional persona must be scoped to the seeded PORT-SFCOE-DEMO portfolio."
);

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

assert.equal(query("SELECT COUNT() FROM Resource__c WHERE Employee_ID__c LIKE 'SCALE-EXL-%' OR Employee_ID__c LIKE 'DEMO-EXL-%' OR Employee_ID__c IN ('EXL-017091','EXL-018462','EXL-019830')").totalSize, 60, "The scaled demo requires exactly 60 governed resources.");
const capacityPopulation = query("SELECT Resource__c, Allocated_Hours__c, Standard_Hours__c, Capacity_Status__c, Approved_Overallocated__c, Pending_Approval_Count__c, Resource__r.Allocated_Daily_Hours__c, Resource__r.Available_Percent__c, Resource__r.Capacity_Status__c, Resource__r.Capacity_As_Of__c FROM R360_Daily_Capacity__c WHERE Work_Date__c=TODAY").records;
assert.equal(capacityPopulation.length, 60, "The current daily-capacity ledger requires exactly one reconciled row for every demo resource.");
assert(capacityPopulation.every((row) => Number(row.Allocated_Hours__c) >= 8), "Every demo resource must have at least eight aggregate accepted allocation hours.");
assert(capacityPopulation.every((row) => Number(row.Allocated_Hours__c) <= 12), "No demo resource may exceed the twelve-hour safety ceiling.");
const controlledOverallocations = capacityPopulation.filter((row) => Number(row.Allocated_Hours__c) > 8);
assert(controlledOverallocations.length >= 10, "The demo requires at least one controlled over-allocation example per account.");
assert(controlledOverallocations.every((row) => row.Approved_Overallocated__c), "Every published over-allocation must carry active approval evidence.");
assert(capacityPopulation.every((row) => Number(row.Pending_Approval_Count__c) === 0), "The certified demo baseline must not contain an undecided capacity plan.");
assert(capacityPopulation.every((row) => Number(row.Resource__r.Allocated_Daily_Hours__c) === Number(row.Allocated_Hours__c) && row.Resource__r.Capacity_Status__c === row.Capacity_Status__c && row.Resource__r.Capacity_As_Of__c), "Resource 360 capacity fields must reconcile to the ledger.");
assert.equal(query("SELECT COUNT() FROM Allocation__c WHERE Current__c=true AND Daily_Hours__c>8").totalSize,0,"No project-allocation line may exceed eight hours per day.");
const overageEvidence=query("SELECT Id,Overallocation_Reason__c,Overallocation_Status__c,Overallocation_Approved_By__c,Overallocation_Approved_At__c,Overallocation_Expiry_Date__c FROM Allocation__c WHERE State__c='Accepted' AND Current__c=true AND Overallocated__c=true").records;
assert(overageEvidence.length>=10,"At least ten published allocation lines must demonstrate governed over-allocation.");
assert(overageEvidence.every((row)=>row.Overallocation_Status__c==="Approved"&&row.Overallocation_Reason__c&&row.Overallocation_Approved_By__c&&row.Overallocation_Approved_At__c&&row.Overallocation_Expiry_Date__c),"Every governed over-allocation line must retain reason, approval, approver, timestamp and review expiry.");
const membershipPopulation=query("SELECT Id,Resource__c,Capacity_Percent__c,Allocated_Daily_Hours__c,Available_Percent__c,Capacity_Status__c,Capacity_As_Of__c FROM R360_Delivery_Membership__c WHERE Membership_ID__c LIKE 'SCALE-DM-%' AND Current__c=true").records;
assert.equal(membershipPopulation.length,60,"The scaled demo requires one current delivery membership for every governed resource.");
const allocationHoursByMembership=new Map(query("SELECT Delivery_Membership__c membershipId,SUM(Daily_Hours__c) hours FROM Allocation__c WHERE Delivery_Membership__c!=null AND State__c='Accepted' AND Current__c=true AND Start_Date__c<=TODAY AND End_Date__c>=TODAY GROUP BY Delivery_Membership__c").records.map((row)=>[row.membershipId,Number(row.hours)]));
const expectedMembershipStatus=(allocated,authorized)=>allocated===0?"Bench":allocated<authorized?"Underallocated":allocated===authorized?"Fully Allocated":"Overallocated";
assert(membershipPopulation.every((row)=>{const authorized=8*Number(row.Capacity_Percent__c??100)/100;const allocated=allocationHoursByMembership.get(row.Id)??0;const available=authorized===0?0:Math.max(0,(authorized-allocated)/authorized*100);return Number(row.Allocated_Daily_Hours__c)===allocated&&Math.abs(Number(row.Available_Percent__c)-available)<0.01&&row.Capacity_Status__c===expectedMembershipStatus(allocated,authorized)&&row.Capacity_As_Of__c;}),"Membership capacity, availability and status must reconcile to membership-attributed accepted allocations.");
const actualHoursByResourceDay=query("SELECT Timesheet__r.Resource__c resourceId,Work_Date__c workDate,SUM(Hours__c) total FROM Time_Entry__c WHERE Timesheet__r.Current__c=true AND State__c IN ('Draft','Submitted','Approved') GROUP BY Timesheet__r.Resource__c,Work_Date__c").records;
assert(actualHoursByResourceDay.every((row)=>Number(row.total)<=8),"Actual time must remain capped at eight aggregate hours per resource-day.");
const capacitySummary={underallocated:capacityPopulation.filter((row)=>row.Capacity_Status__c==="Underallocated").length,fullyAllocated:capacityPopulation.filter((row)=>row.Capacity_Status__c==="Fully Allocated").length,overallocated:controlledOverallocations.length,minimumHours:Math.min(...capacityPopulation.map((row)=>Number(row.Allocated_Hours__c))),maximumHours:Math.max(...capacityPopulation.map((row)=>Number(row.Allocated_Hours__c))),averageUtilization:Number((capacityPopulation.reduce((sum,row)=>sum+(Number(row.Allocated_Hours__c)/Number(row.Standard_Hours__c)*100),0)/capacityPopulation.length).toFixed(2)),reconciledMemberships:membershipPopulation.length};
const scaleProjectFilter = "Intake_Correlation_ID__c LIKE 'R360-SCALE-10X20-V1-%'";
assert.equal(query(`SELECT COUNT() FROM Engagement__c WHERE ${scaleProjectFilter}`).totalSize, 20, "The scaled demo requires exactly twenty governed projects.");

const scaleGraph = {
    accounts: query("SELECT COUNT() FROM Account WHERE R360_Demo__c=true AND R360_Account_ID__c LIKE 'R360-ACC-%'").totalSize,
    portfolios: query("SELECT COUNT() FROM R360_Portfolio__c WHERE Portfolio_ID__c='PORT-SFCOE-DEMO' OR Portfolio_ID__c LIKE 'R360-PORT-%'").totalSize,
    subPortfolios: query("SELECT COUNT() FROM R360_Sub_Portfolio__c WHERE Sub_Portfolio_ID__c LIKE 'R360-SUB-%'").totalSize,
    projects: query(`SELECT COUNT() FROM Engagement__c WHERE ${scaleProjectFilter}`).totalSize,
    contracts: query(`SELECT COUNT() FROM Commercial_Reference__c WHERE Engagement__r.${scaleProjectFilter}`).totalSize,
    payments: query(`SELECT COUNT() FROM Contract_Payment__c WHERE Engagement__r.${scaleProjectFilter}`).totalSize,
    resources: query("SELECT COUNT() FROM Resource__c WHERE Employee_ID__c LIKE 'SCALE-EXL-%' OR Employee_ID__c LIKE 'DEMO-EXL-%' OR Employee_ID__c IN ('EXL-017091','EXL-018462','EXL-019830')").totalSize,
    memberships: query("SELECT COUNT() FROM R360_Delivery_Membership__c WHERE Membership_ID__c LIKE 'SCALE-DM-%'").totalSize,
    modules: query("SELECT COUNT() FROM Project_Module__c WHERE Module_ID__c LIKE 'SCALE-MOD-%'").totalSize,
    workUnits: query(`SELECT COUNT() FROM Work_Unit__c WHERE Engagement__r.${scaleProjectFilter}`).totalSize,
    dependencies: query(`SELECT COUNT() FROM Work_Dependency__c WHERE Engagement__r.${scaleProjectFilter}`).totalSize,
    staffingRequests: query(`SELECT COUNT() FROM Staffing_Request__c WHERE Engagement__r.${scaleProjectFilter}`).totalSize,
    allocations: query(`SELECT COUNT() FROM Allocation__c WHERE Engagement__r.${scaleProjectFilter}`).totalSize,
    budgets: query(`SELECT COUNT() FROM Budget__c WHERE Engagement__r.${scaleProjectFilter} AND Current__c=true`).totalSize,
    skillRequirements: query(`SELECT COUNT() FROM Engagement_Skill_Requirement__c WHERE Engagement__r.${scaleProjectFilter}`).totalSize,
    risks: query(`SELECT COUNT() FROM Project_Risk__c WHERE Engagement__r.${scaleProjectFilter}`).totalSize,
    approvedActuals: query(`SELECT COUNT() FROM Time_Entry__c WHERE Engagement__r.${scaleProjectFilter} AND State__c='Approved'`).totalSize,
    approvedCloseouts: query("SELECT COUNT() FROM Project_Closeout__c WHERE Closeout_ID__c LIKE 'SCALE-CLOSE-%' AND State__c='Approved'").totalSize
};
assert.deepEqual({ accounts: scaleGraph.accounts, portfolios: scaleGraph.portfolios, subPortfolios: scaleGraph.subPortfolios, projects: scaleGraph.projects, resources: scaleGraph.resources, memberships: scaleGraph.memberships, modules: scaleGraph.modules, budgets: scaleGraph.budgets, approvedCloseouts: scaleGraph.approvedCloseouts }, { accounts: 10, portfolios: 10, subPortfolios: 20, projects: 20, resources: 60, memberships: 60, modules: 60, budgets: 20, approvedCloseouts: 4 }, "The exact 10-account/20-project hierarchy is incomplete.");
assert(scaleGraph.contracts >= 40 && scaleGraph.payments >= 120 && scaleGraph.workUnits >= 115 && scaleGraph.dependencies >= 95 && scaleGraph.staffingRequests >= 76 && scaleGraph.allocations >= 76 && scaleGraph.skillRequirements >= 57 && scaleGraph.risks >= 38 && scaleGraph.approvedActuals >= 38, "The rich project relationship graph is below its storage-conscious minimums.");

const assertGroupedGraph = (soql, expectedGroups, predicate, message) => {
    const grouped = query(soql).records;
    assert.equal(grouped.length, expectedGroups, `${message} Expected ${expectedGroups} groups; found ${grouped.length}.`);
    assert(grouped.every((record) => predicate(Number(record.total))), message);
};
assertGroupedGraph(`SELECT Account__c category, COUNT(Id) total FROM Engagement__c WHERE ${scaleProjectFilter} GROUP BY Account__c`, 10, (total) => total === 2, "Every account must own exactly two governed projects.");
assertGroupedGraph(`SELECT Engagement__c category, COUNT(Id) total FROM Commercial_Reference__c WHERE Engagement__r.${scaleProjectFilter} GROUP BY Engagement__c`, 20, (total) => total >= 2, "Every project must have multiple contracts.");
assertGroupedGraph(`SELECT Commercial_Reference__c category, COUNT(Id) total FROM Contract_Payment__c WHERE Engagement__r.${scaleProjectFilter} GROUP BY Commercial_Reference__c`, scaleGraph.contracts, (total) => total === 3, "Every contract must have exactly three payment milestones.");
assertGroupedGraph("SELECT Engagement__c category, COUNT(Id) total FROM Project_Module__c WHERE Module_ID__c LIKE 'SCALE-MOD-%' GROUP BY Engagement__c", 20, (total) => total === 3, "Every project must have exactly three governed modules.");
assertGroupedGraph("SELECT Account__c category, COUNT(Id) total FROM R360_Delivery_Membership__c WHERE Membership_ID__c LIKE 'SCALE-DM-%' GROUP BY Account__c", 10, (total) => total === 6, "Every account must have six named delivery members.");
assertGroupedGraph(`SELECT Engagement__c category, COUNT(Id) total FROM Work_Unit__c WHERE Engagement__r.${scaleProjectFilter} GROUP BY Engagement__c`, 20, (total) => total >= 6, "Every project must have a multi-unit delivery plan.");
assertGroupedGraph(`SELECT Engagement__c category, COUNT(Id) total FROM Budget__c WHERE Engagement__r.${scaleProjectFilter} AND Current__c=true GROUP BY Engagement__c`, 20, (total) => total >= 1, "Every project must have a current governed budget.");

const coreRecordCounts = Object.fromEntries([
    "Engagement__c",
    "Staffing_Request__c",
    "Allocation__c",
    "Budget__c",
    "Commercial_Reference__c",
    "R360_Approval_Decision__c",
    "R360_Portfolio__c"
].map((objectName) => [objectName, query(`SELECT COUNT() FROM ${objectName}`).totalSize]));
const portfolioShareExpected = new Map(users.records.map((user) => [user.Id, user.Alias === "r360staf" ? scaleGraph.portfolios : 1]));
const portfolioShareReadiness = await waitFor("Persona portfolio scope sharing", async () => {
    const userFilter = demoUserIds.map((id) => `'${id}'`).join(",");
    const result = query(
        "SELECT UserOrGroupId, COUNT(Id) total FROM R360_Portfolio__Share " +
        `WHERE UserOrGroupId IN (${userFilter}) AND RowCause='Resource360_Scope__c' GROUP BY UserOrGroupId`
    );
    const counts = new Map(result.records.map((record) => [record.UserOrGroupId, record.total]));
    return {
        ready: demoUserIds.every((id) => counts.get(id) === portfolioShareExpected.get(id)),
        value: Object.fromEntries(demoUserIds.map((id) => [id, counts.get(id) ?? 0]))
    };
}, 180_000);
assert.equal(Object.keys(portfolioShareReadiness).length, demoUserIds.length);
const shareMatrix = {};
for (const user of users.records) {
    const expectedPortfolios = portfolioShareExpected.get(user.Id);
    const expectedEngagements = user.Alias === "r360pmgr" ? scaleGraph.projects : 2;
    shareMatrix[user.Alias] = {
        portfolios: assertShareCount("R360_Portfolio__c", user.Id, expectedPortfolios, user.FederationIdentifier),
        engagements: assertShareCount("Engagement__c", user.Id, expectedEngagements, user.FederationIdentifier)
    };
}

const staffingAliases = new Set(["r360pmgr", "r360staf", "r360prac"]);
const allocationAliases = new Set([...staffingAliases, "r360chkr"]);
const budgetAliases = new Set(["r360pmgr", "r360capa", "r360cfgm", "r360chkr", "r360aprv", "r360prac"]);
const commercialAliases = new Set(["r360pmgr", "r360staf", "r360capa", "r360cfgm", "r360chkr", "r360aprv", "r360prac"]);
const approvalAliases = new Set(["r360staf", "r360capa", "r360cfgm", "r360chkr", "r360aprv", "r360prac"]);
for (const user of users.records) {
    const isGlobalProjectManager = user.Alias === "r360pmgr";
    const scopedProjectClause = isGlobalProjectManager ? "" : " WHERE Engagement__r.Portfolio_ID__c='PORT-SFCOE-DEMO'";
    const staffingExpected = staffingAliases.has(user.Alias) ? query(`SELECT COUNT() FROM Staffing_Request__c${scopedProjectClause}`).totalSize : 0;
    const allocationExpected = allocationAliases.has(user.Alias) ? query(`SELECT COUNT() FROM Allocation__c${scopedProjectClause}`).totalSize : 0;
    const budgetExpected = budgetAliases.has(user.Alias) ? query(`SELECT COUNT() FROM Budget__c${scopedProjectClause}`).totalSize : 0;
    const commercialExpected = commercialAliases.has(user.Alias) ? query(`SELECT COUNT() FROM Commercial_Reference__c${scopedProjectClause}`).totalSize : 0;
    const approvalExpected = approvalAliases.has(user.Alias) ? coreRecordCounts.R360_Approval_Decision__c : 0;
    Object.assign(shareMatrix[user.Alias], {
        staffingRequests: assertShareCount("Staffing_Request__c", user.Id, staffingExpected, user.FederationIdentifier),
        allocations: assertShareCount("Allocation__c", user.Id, allocationExpected, user.FederationIdentifier),
        budgets: assertShareCount("Budget__c", user.Id, budgetExpected, user.FederationIdentifier),
        commercialReferences: assertShareCount("Commercial_Reference__c", user.Id, commercialExpected, user.FederationIdentifier),
        approvalDecisions: assertShareCount("R360_Approval_Decision__c", user.Id, approvalExpected, user.FederationIdentifier)
    });
    shareMatrix[user.Alias].dailyCapacity = assertShareCount("R360_Daily_Capacity__c", user.Id, 60, user.FederationIdentifier);
}

const practitioner = users.records.find((user) => user.Alias === "r360prac");
assert(practitioner, "The fictional practitioner identity is required.");
const projectManager = users.records.find((user) => user.Alias === "r360pmgr");
assert(projectManager, "The fictional project-manager identity is required.");
const deliveryTimesheetCount = query(
    "SELECT Timesheet__c FROM Time_Entry__c WHERE Timesheet__c!=null GROUP BY Timesheet__c"
).totalSize;
shareMatrix[projectManager.Alias].deliveryTimesheets = assertShareCount(
    "Timesheet__c",
    projectManager.Id,
    deliveryTimesheetCount,
    projectManager.FederationIdentifier
);
for (const [objectName, matrixKey] of [
    ["Skill_Claim__c", "skillClaims"],
    ["Credential__c", "credentials"],
    ["R360_Project_Evidence__c", "projectEvidence"],
    ["R360_Learning_Achievement__c", "learningAchievements"],
    ["Timesheet__c", "timesheets"]
]) {
    const selfCount = query(
        `SELECT COUNT() FROM ${objectName} WHERE Resource__r.Salesforce_User__c='${practitioner.Id}'`
    ).totalSize;
    shareMatrix[practitioner.Alias][matrixKey] = assertShareCount(
        objectName,
        practitioner.Id,
        selfCount,
        practitioner.FederationIdentifier
    );
}

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

const goldenProject = query("SELECT Id FROM Engagement__c WHERE Engagement_ID__c='ENG-1001' LIMIT 1").records[0];
assert(goldenProject, "The ENG-1001 golden-path project is required.");
const goldenProjectId = goldenProject.Id;
const goldenPath = {
    contractVersions: query(`SELECT COUNT() FROM Commercial_Reference__c WHERE Engagement__c='${goldenProjectId}' AND Approval_Status__c='Approved'`).totalSize,
    commercialLines: query(`SELECT COUNT() FROM Commercial_Line__c WHERE Commercial_Reference__r.Engagement__c='${goldenProjectId}' AND External_ID__c LIKE 'GOLD-CL-%'`).totalSize,
    workUnits: query(`SELECT COUNT() FROM Work_Unit__c WHERE Engagement__c='${goldenProjectId}' AND Work_Unit_Code__c LIKE 'WBS-SF-%'`).totalSize,
    dependencies: query(`SELECT COUNT() FROM Work_Dependency__c WHERE Engagement__c='${goldenProjectId}' AND External_ID__c LIKE 'GOLD-DEP-%'`).totalSize,
    skillRequirements: query(`SELECT COUNT() FROM Engagement_Skill_Requirement__c WHERE Engagement__c='${goldenProjectId}' AND Requirement_Key__c LIKE 'GOLD-REQ-%'`).totalSize,
    eligibleSkillMatches: query("SELECT COUNT() FROM Staffing_Skill_Match__c WHERE Match_Key__c LIKE 'GOLD-MATCH-%' AND Eligible__c=true").totalSize,
    acceptedStaffing: query(`SELECT COUNT() FROM Staffing_Request__c WHERE Engagement__c='${goldenProjectId}' AND Idempotency_Key__c LIKE 'GOLD-SR-%' AND State__c='Accepted'`).totalSize,
    currentAllocations: query(`SELECT COUNT() FROM Allocation__c WHERE Engagement__c='${goldenProjectId}' AND Originating_Request__r.Idempotency_Key__c LIKE 'GOLD-SR-%' AND Current__c=true`).totalSize,
    risks: query(`SELECT COUNT() FROM Project_Risk__c WHERE Engagement__c='${goldenProjectId}' AND External_ID__c LIKE 'GOLD-RISK-%'`).totalSize,
    closeouts: query(`SELECT COUNT() FROM Project_Closeout__c WHERE Engagement__c='${goldenProjectId}' AND Closeout_ID__c='GOLD-CLOSEOUT-ENG-1001'`).totalSize,
    approvedActuals: query(`SELECT COUNT() FROM Time_Entry__c WHERE Engagement__c='${goldenProjectId}' AND Entry_Key__c LIKE 'GOLD-TE-%' AND State__c='Approved'`).totalSize,
    retiredLegacyTasks: query(`SELECT COUNT() FROM Work_Unit__c WHERE Engagement__c='${goldenProjectId}' AND Work_Unit_Code__c='WBS-DC-01' AND Status__c='Cancelled'`).totalSize
};
assert.deepEqual(goldenPath, {
    contractVersions: 3,
    commercialLines: 6,
    workUnits: 7,
    dependencies: 7,
    skillRequirements: 11,
    eligibleSkillMatches: 11,
    acceptedStaffing: 4,
    currentAllocations: 4,
    risks: 2,
    closeouts: 1,
    approvedActuals: 2,
    retiredLegacyTasks: 1
}, "The governed ENG-1001 lifecycle must be complete and internally traceable.");

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
    "('Allocation_Control','Budget_Economics','Capability_Supply','Staffing_Performance','Timesheet_Actuals'," +
    "'Project_Lifecycle','Workplan_Delivery','Contract_Changes','Skill_Demand_Match','Project_Risk_Control','Closeout_Readiness'," +
    "'Portfolio_Hierarchy','Project_Module_Delivery','Contract_Payment_Position','Delivery_Membership_Capacity'," +
    "'Daily_Capacity_Control','Overallocation_Exceptions')"
);
assert.equal(reports.totalSize, 17, "Seventeen native Salesforce reports are required.");
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
    const terminal = statuses.length === 17 && statuses.every((status) => status.refreshStatus === "IDLE");
    return { ready: terminal, value: statuses };
});
const dashboard = apiRequest(`/services/data/v67.0/analytics/dashboards/${dashboardId}`);
assert.equal(dashboard.componentData.length, 17, "The Command Center must have seventeen dashboard components.");
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
assert(new Set(["WAITING","ACQUIRED"]).has(scheduler.records[0].State),"The Resource 360 operational scheduler must be waiting or actively executing.");

process.stdout.write(`${JSON.stringify({
    targetOrg,
    permissionSetGroups: 17,
    fictionalUsers: 8,
    personaAssignments: assignments.totalSize,
    certifiedScopes: scopes.totalSize,
    portfolioScope: "PORT-SFCOE-DEMO",
    shareMatrix,
    resources: query("SELECT COUNT() FROM Resource__c").totalSize,
    engagements: query("SELECT COUNT() FROM Engagement__c").totalSize,
    staffing,
    allocations,
    timesheets,
    configurations,
    scaleGraph,
    capacitySummary,
    goldenPath,
    walkthroughs: walkthroughs.totalSize,
    reportRows,
    dashboardComponents: dashboard.componentData.length,
    dashboardRows,
    scheduler: scheduler.records[0].State
}, null, 2)}\n`);
