import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const targetIndex = process.argv.indexOf("--target-org");
const outputIndex = process.argv.indexOf("--output");
const targetOrg = targetIndex >= 0 ? process.argv[targetIndex + 1] : process.env.RESOURCE360_TARGET_ORG;
const outputPath = outputIndex >= 0 ? process.argv[outputIndex + 1] : "public/data/salesforce-snapshot.json";
assert(targetOrg, "Pass --target-org or set RESOURCE360_TARGET_ORG.");

const sfJson = (args) => {
  const output = execFileSync("sf", [...args, "--json"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 180_000,
    maxBuffer: 32 * 1024 * 1024,
  });
  const response = JSON.parse(output);
  assert.equal(response.status, 0, `Salesforce CLI command failed: sf ${args.join(" ")}`);
  return response.result;
};

const query = (soql) => sfJson(["data", "query", "--target-org", targetOrg, "--query", soql]);
const records = (soql) => query(soql).records ?? [];
const count = (objectName, where = "") => query(`SELECT COUNT() FROM ${objectName}${where ? ` WHERE ${where}` : ""}`).totalSize;
const number = (value) => Number(value ?? 0);
const round = (value, precision = 1) => Number(number(value).toFixed(precision));
const isoDate = (value) => value ? String(value).slice(0, 10) : null;
const labelForStatus = (hours) => hours < 8 ? "Underallocated" : hours === 8 ? "Fully allocated" : "Approved overallocated";
const countByEngagement = (objectName) => new Map(records(
  `SELECT Engagement__r.Engagement_ID__c engagementKey, COUNT(Id) total FROM ${objectName} WHERE Engagement__r.Account__r.R360_Demo__c=true GROUP BY Engagement__r.Engagement_ID__c`,
).map((item) => [item.engagementKey, number(item.total)]));

const generatedAt = new Date().toISOString();
const counts = Object.fromEntries([
  ["accounts", "Account", "R360_Demo__c=true"], ["portfolios", "R360_Portfolio__c", "Account__r.R360_Demo__c=true"], ["subPortfolios", "R360_Sub_Portfolio__c", "Account__r.R360_Demo__c=true"],
  ["projects", "Engagement__c", "Account__r.R360_Demo__c=true"], ["contracts", "Commercial_Reference__c", "Engagement__r.Account__r.R360_Demo__c=true"], ["payments", "Contract_Payment__c", "Engagement__r.Account__r.R360_Demo__c=true"],
  ["resources", "Resource__c", "Id IN (SELECT Resource__c FROM R360_Delivery_Membership__c WHERE Account__r.R360_Demo__c=true AND Current__c=true)"], ["deliveryMemberships", "R360_Delivery_Membership__c", "Account__r.R360_Demo__c=true AND Current__c=true"], ["projectModules", "Project_Module__c", "Engagement__r.Account__r.R360_Demo__c=true"],
  ["workUnits", "Work_Unit__c", "Engagement__r.Account__r.R360_Demo__c=true"], ["staffingRequests", "Staffing_Request__c", "Engagement__r.Account__r.R360_Demo__c=true"], ["allocations", "Allocation__c", "Engagement__r.Account__r.R360_Demo__c=true"],
  ["budgetVersions", "Budget__c", "Engagement__r.Account__r.R360_Demo__c=true"], ["kpiSnapshots", "R360_KPI_Snapshot__c", "Policy_Version__c='R360-KPI-1.0'"], ["unavailabilityEvents", "R360_Resource_Unavailability__c", "Resource__c IN (SELECT Resource__c FROM R360_Delivery_Membership__c WHERE Account__r.R360_Demo__c=true AND Current__c=true)"],
  ["reports", "Report", "FolderName='Resource 360 Demo Reports'"], ["dashboards", "Dashboard", "FolderName='Resource 360 Demo Dashboards'"],
].map(([key, objectName, where]) => [key, count(objectName, where)]));

const portfolioRecords = records("SELECT Name, Portfolio_ID__c, Account__r.Name, Current__c FROM R360_Portfolio__c WHERE Account__r.R360_Demo__c=true ORDER BY Portfolio_ID__c LIMIT 50");
const portfolioById = new Map(portfolioRecords.map((item, index) => [item.Portfolio_ID__c, { key: `PORTFOLIO-${String(index + 1).padStart(2, "0")}`, name: item.Name, account: item.Account__r?.Name ?? "Mock account", status: item.Current__c ? "Current" : "Historic" }]));

const membershipRecords = records("SELECT Resource__c, Delivery_Role__c, Portfolio__r.Portfolio_ID__c, Sub_Portfolio__r.Name FROM R360_Delivery_Membership__c WHERE Current__c=true AND Account__r.R360_Demo__c=true ORDER BY Resource__c LIMIT 100");
const membershipByResource = new Map(membershipRecords.map((item) => [item.Resource__c, item]));
const capacityRecords = records("SELECT Resource__c, Work_Date__c, Standard_Hours__c, Allocated_Hours__c, Remaining_Hours__c, Overage_Hours__c, Utilization_Percent__c, Capacity_Status__c, Allocation_Count__c, Approved_Overallocated__c, Pending_Approval_Count__c, Reconciled_At__c FROM R360_Daily_Capacity__c WHERE Work_Date__c=TODAY AND Resource__c IN (SELECT Resource__c FROM R360_Delivery_Membership__c WHERE Account__r.R360_Demo__c=true AND Current__c=true) ORDER BY Allocated_Hours__c DESC, Resource__c LIMIT 100");
const resourceAliasById = new Map(capacityRecords.map((item, index) => [item.Resource__c, { key: `RESOURCE-${String(index + 1).padStart(3, "0")}`, label: `Practitioner ${String(index + 1).padStart(2, "0")}` }]));
const capacity = capacityRecords.map((item) => {
  const membership = membershipByResource.get(item.Resource__c);
  const portfolio = portfolioById.get(membership?.Portfolio__r?.Portfolio_ID__c);
  const alias = resourceAliasById.get(item.Resource__c);
  const hours = number(item.Allocated_Hours__c);
  return {
    key: alias.key,
    label: alias.label,
    role: membership?.Delivery_Role__c ?? "Salesforce Practitioner",
    portfolio: portfolio?.name ?? "Salesforce COE",
    subPortfolio: membership?.Sub_Portfolio__r?.Name ?? "Delivery Pool",
    workDate: isoDate(item.Work_Date__c), standardHours: number(item.Standard_Hours__c), allocatedHours: hours,
    remainingHours: number(item.Remaining_Hours__c), overageHours: number(item.Overage_Hours__c),
    utilizationPercent: number(item.Utilization_Percent__c), state: labelForStatus(hours),
    allocationCount: number(item.Allocation_Count__c), approvedOverallocation: Boolean(item.Approved_Overallocated__c),
    pendingApprovalCount: number(item.Pending_Approval_Count__c), reconciledAt: item.Reconciled_At__c,
  };
});

const budgetRecords = records("SELECT Engagement__c, Engagement__r.Engagement_ID__c, Revenue__c, Total_Cost__c, Margin_Percent__c, Forecast_Revenue__c, Forecast_Cost__c, Forecast_Margin_Percent__c, Margin_Erosion_Points__c, Estimate_To_Complete__c, Estimate_At_Completion__c, Forecast_Accuracy_Percent__c, State__c FROM Budget__c WHERE Current__c=true AND Engagement__r.Account__r.R360_Demo__c=true ORDER BY Engagement__c LIMIT 100");
const budgetByEngagement = new Map(budgetRecords.map((item) => [item.Engagement__r?.Engagement_ID__c, item]));
const relatedCounts = {
  contracts: countByEngagement("Commercial_Reference__c"), payments: countByEngagement("Contract_Payment__c"),
  modules: countByEngagement("Project_Module__c"), workUnits: countByEngagement("Work_Unit__c"),
  staffingRequests: countByEngagement("Staffing_Request__c"), allocations: countByEngagement("Allocation__c"),
  risks: countByEngagement("Project_Risk__c"),
};
const engagementRecords = records("SELECT Name, Engagement_ID__c, Account__r.Name, Portfolio__r.Portfolio_ID__c, Status__c, Lifecycle_Stage__c, Completion_Percent__c, Start_Date__c, End_Date__c, Forecast_Completion_Date__c, Schedule_Variance_Days__c, Acceptance_First_Pass_Percent__c, CSAT_Score__c, NPS_Score__c, Account_Health_Score__c, Release_Count__c, Incident_Count__c, Mandatory_Skill_Coverage_Percent__c, Role_Readiness_Percent__c, Risk_Exposure_Score__c, High_Risk_Age_Days__c, Plan_Actual_Variance_Percent__c FROM Engagement__c WHERE Account__r.R360_Demo__c=true ORDER BY Engagement_ID__c LIMIT 100");
const projects = engagementRecords.map((item, index) => {
  const budget = budgetByEngagement.get(item.Engagement_ID__c) ?? budgetRecords[index];
  const portfolio = portfolioById.get(item.Portfolio__r?.Portfolio_ID__c);
  return {
    key: `PROJECT-${String(index + 1).padStart(3, "0")}`, name: item.Name, account: item.Account__r?.Name ?? "Mock account",
    portfolio: portfolio?.name ?? "Salesforce COE", status: item.Status__c, lifecycle: item.Lifecycle_Stage__c,
    completionPercent: number(item.Completion_Percent__c), startDate: isoDate(item.Start_Date__c), endDate: isoDate(item.End_Date__c),
    forecastCompletionDate: isoDate(item.Forecast_Completion_Date__c), scheduleVarianceDays: number(item.Schedule_Variance_Days__c),
    acceptanceFirstPassPercent: number(item.Acceptance_First_Pass_Percent__c), csatScore: number(item.CSAT_Score__c), npsScore: number(item.NPS_Score__c),
    accountHealthScore: number(item.Account_Health_Score__c), releaseCount: number(item.Release_Count__c), incidentCount: number(item.Incident_Count__c),
    mandatorySkillCoveragePercent: number(item.Mandatory_Skill_Coverage_Percent__c), roleReadinessPercent: number(item.Role_Readiness_Percent__c),
    riskExposureScore: number(item.Risk_Exposure_Score__c), highRiskAgeDays: number(item.High_Risk_Age_Days__c), planActualVariancePercent: number(item.Plan_Actual_Variance_Percent__c),
    approvedRevenue: number(budget?.Revenue__c), approvedCost: number(budget?.Total_Cost__c), approvedMarginPercent: number(budget?.Margin_Percent__c),
    forecastRevenue: number(budget?.Forecast_Revenue__c), forecastCost: number(budget?.Forecast_Cost__c), forecastMarginPercent: number(budget?.Forecast_Margin_Percent__c),
    marginErosionPoints: number(budget?.Margin_Erosion_Points__c), estimateToComplete: number(budget?.Estimate_To_Complete__c), estimateAtCompletion: number(budget?.Estimate_At_Completion__c), forecastAccuracyPercent: number(budget?.Forecast_Accuracy_Percent__c),
    budgetState: budget?.State__c ?? "Not available", contractCount: relatedCounts.contracts.get(item.Engagement_ID__c) ?? 0,
    paymentCount: relatedCounts.payments.get(item.Engagement_ID__c) ?? 0, moduleCount: relatedCounts.modules.get(item.Engagement_ID__c) ?? 0,
    workUnitCount: relatedCounts.workUnits.get(item.Engagement_ID__c) ?? 0, staffingRequestCount: relatedCounts.staffingRequests.get(item.Engagement_ID__c) ?? 0,
    allocationCount: relatedCounts.allocations.get(item.Engagement_ID__c) ?? 0, riskCount: relatedCounts.risks.get(item.Engagement_ID__c) ?? 0,
  };
});

const accounts = [...new Set(projects.map((project) => project.account))].sort().map((name, index) => {
  const accountProjects = projects.filter((project) => project.account === name);
  const sum = (field) => accountProjects.reduce((total, project) => total + number(project[field]), 0);
  return {
    key: `ACCOUNT-${String(index + 1).padStart(2, "0")}`, name,
    portfolio: portfolioRecords.find((item) => item.Account__r?.Name === name)?.Name ?? "Salesforce COE",
    projectCount: accountProjects.length, activeProjectCount: accountProjects.filter((project) => project.status === "Active").length,
    approvedRevenue: sum("approvedRevenue"), forecastRevenue: sum("forecastRevenue"), contractCount: sum("contractCount"),
    paymentCount: sum("paymentCount"), allocationCount: sum("allocationCount"),
    accountHealthScore: round(accountProjects.reduce((total, project) => total + project.accountHealthScore, 0) / Math.max(1, accountProjects.length)),
    deliveryRiskScore: round(accountProjects.reduce((total, project) => total + project.riskExposureScore, 0) / Math.max(1, accountProjects.length)),
  };
});

const kpiRecords = records("SELECT Metric_Code__c, Metric_Label__c, Snapshot_Date__c, Grain__c, Scope_Type__c, Scope_Key__c, Scope_Label__c, Numerator__c, Denominator__c, Metric_Value__c, Target_Value__c, Unit__c, Status__c, Forecast__c, Source_Cutoff__c, Definition__c, Owner_Role__c, Policy_Version__c FROM R360_KPI_Snapshot__c WHERE Policy_Version__c='R360-KPI-1.0' ORDER BY Snapshot_Date__c, Metric_Code__c LIMIT 500");
const sanitizedKpis = kpiRecords.map((item) => ({
  code: item.Metric_Code__c, label: item.Metric_Label__c, date: isoDate(item.Snapshot_Date__c), grain: item.Grain__c,
  scopeType: item.Scope_Type__c, scopeKey: item.Scope_Key__c, scopeLabel: item.Scope_Label__c,
  numerator: number(item.Numerator__c), denominator: number(item.Denominator__c), value: number(item.Metric_Value__c), target: number(item.Target_Value__c),
  unit: item.Unit__c, status: item.Status__c, forecast: Boolean(item.Forecast__c), sourceCutoff: item.Source_Cutoff__c,
  definition: item.Definition__c, ownerRole: item.Owner_Role__c, policyVersion: item.Policy_Version__c,
}));
const forecastDates = [...new Set(sanitizedKpis.filter((item) => item.forecast && item.grain === "Forecast Week").map((item) => item.date))];
const forecast = forecastDates.map((date) => {
  const byCode = Object.fromEntries(sanitizedKpis.filter((item) => item.date === date && item.forecast).map((item) => [item.code, item]));
  return {
    week: date, coveragePercent: number(byCode.CAPACITY_COVERAGE_13W?.value), availableHours: number(byCode.CAPACITY_COVERAGE_13W?.numerator),
    committedHours: number(byCode.COMMITTED_HOURS?.value), demandHours: number(byCode.FORECAST_DEMAND_HOURS?.value),
    rollOffHours: number(byCode.EXPECTED_ROLL_OFF_HOURS?.value), benchHours: number(byCode.BENCH_HOURS?.value),
    overallocatedHours: number(byCode.OVERALLOCATION_EXPOSURE_HOURS?.value), status: byCode.CAPACITY_COVERAGE_13W?.status ?? "Informational",
  };
});
const latestEnterprise = Object.values(Object.fromEntries(sanitizedKpis.filter((item) => !item.forecast && item.scopeType === "Enterprise").map((item) => [item.code, item])));

const staffingGroups = records("SELECT State__c category, COUNT(Id) total, AVG(Time_To_Fill_Hours__c) averageFillHours, AVG(Shortlist_Count__c) averageShortlist FROM Staffing_Request__c WHERE Engagement__r.Account__r.R360_Demo__c=true GROUP BY State__c");
const staffing = {
  byState: Object.fromEntries(staffingGroups.map((item) => [item.category ?? "Unknown", number(item.total)])),
  averageTimeToFillDays: round(staffingGroups.reduce((sum, item) => sum + number(item.averageFillHours) * number(item.total), 0) / Math.max(1, staffingGroups.reduce((sum, item) => sum + number(item.total), 0)) / 24),
  averageShortlist: round(staffingGroups.reduce((sum, item) => sum + number(item.averageShortlist), 0) / Math.max(1, staffingGroups.length)),
};

const commercialRows = records("SELECT SUM(Planned_Amount__c) planned, SUM(Invoiced_Amount__c) invoiced, SUM(Paid_Amount__c) paid, SUM(Outstanding_Amount__c) outstanding, SUM(Revenue_Recognized_Amount__c) recognized, SUM(Write_Off_Amount__c) writtenOff, AVG(Billing_Realization_Percent__c) realization, AVG(DSO_Days__c) dso, AVG(Collection_Effectiveness_Percent__c) collection FROM Contract_Payment__c WHERE Engagement__r.Account__r.R360_Demo__c=true");
const commercialSource = commercialRows[0] ?? {};
const commercial = { planned: number(commercialSource.planned), invoiced: number(commercialSource.invoiced), paid: number(commercialSource.paid), outstanding: number(commercialSource.outstanding), revenueRecognized: number(commercialSource.recognized), writeOff: number(commercialSource.writtenOff), billingRealizationPercent: round(commercialSource.realization), dsoDays: round(commercialSource.dso), collectionEffectivenessPercent: round(commercialSource.collection) };

const workRows = records("SELECT SUM(Planned_Value__c) plannedValue, SUM(Earned_Value__c) earnedValue, SUM(Actual_Cost__c) actualCost, SUM(Estimate_To_Complete__c) etcValue, SUM(Estimate_At_Completion__c) eacValue, AVG(Schedule_Performance_Index__c) spi, AVG(Cost_Performance_Index__c) cpi, AVG(Test_Pass_Percent__c) testPass, SUM(Defect_Count__c) defects FROM Work_Unit__c WHERE Engagement__r.Account__r.R360_Demo__c=true");
const workSource = workRows[0] ?? {};
const delivery = { plannedValue: number(workSource.plannedValue), earnedValue: number(workSource.earnedValue), actualCost: number(workSource.actualCost), estimateToComplete: number(workSource.etcValue), estimateAtCompletion: number(workSource.eacValue), schedulePerformanceIndex: round(workSource.spi, 2), costPerformanceIndex: round(workSource.cpi, 2), testPassPercent: round(workSource.testPass), defectCount: number(workSource.defects) };

const unavailability = records("SELECT Resource__c, Type__c, Start_Date__c, End_Date__c, Hours_Per_Day__c, Status__c, Source_System__c FROM R360_Resource_Unavailability__c WHERE Status__c='Approved' AND Resource__c IN (SELECT Resource__c FROM R360_Delivery_Membership__c WHERE Account__r.R360_Demo__c=true AND Current__c=true) ORDER BY Start_Date__c LIMIT 100").map((item, index) => { const alias = resourceAliasById.get(item.Resource__c); return { key: `UNAVAILABLE-${String(index + 1).padStart(3, "0")}`, resourceKey: alias?.key ?? "RESOURCE-UNKNOWN", resource: alias?.label ?? "Sanitized practitioner", type: item.Type__c, startDate: isoDate(item.Start_Date__c), endDate: isoDate(item.End_Date__c), hoursPerDay: number(item.Hours_Per_Day__c), status: item.Status__c, source: item.Source_System__c }; });

const capacityTotals = capacity.reduce((result, item) => ({ standard: result.standard + item.standardHours, allocated: result.allocated + item.allocatedHours, overage: result.overage + item.overageHours }), { standard: 0, allocated: 0, overage: 0 });
const kpis = [
  { code: "ACTIVE_HEADCOUNT", label: "Active resources", value: counts.resources, unit: "Count", target: 60, status: counts.resources === 60 ? "On Target" : "Watch", definition: "Active governed Resource 360 resource records." },
  { code: "FULL_ALLOCATION_COVERAGE", label: "Full-allocation coverage", value: round(capacity.filter((item) => item.allocatedHours >= 8).length / Math.max(1, capacity.length) * 100), unit: "Percent", target: 100, status: capacity.every((item) => item.allocatedHours >= 8) ? "On Target" : "At Risk", definition: "Resources with at least eight aggregate accepted hours divided by current capacity-ledger population." },
  { code: "ALLOCATED_UTILIZATION", label: "Allocated utilization", value: round(capacityTotals.allocated / Math.max(1, capacityTotals.standard) * 100), unit: "Percent", target: 100, status: "Informational", definition: "Current accepted allocation hours divided by standard capacity hours." },
  { code: "CONTROLLED_OVERALLOCATION", label: "Controlled over-allocation", value: capacity.filter((item) => item.allocatedHours > 8).length, unit: "Count", target: 12, status: capacity.every((item) => item.allocatedHours <= 12 && (item.allocatedHours <= 8 || item.approvedOverallocation)) ? "On Target" : "Breached", definition: "Resources above eight hours with active approval evidence and at or below the twelve-hour ceiling." },
  ...latestEnterprise,
];

const snapshot = {
  schemaVersion: 2, classification: "SANITIZED_DEMO_ONLY", generatedAt,
  source: { system: "Salesforce", org: "Resource 360 Developer Org", mode: "Allowlisted build-time snapshot", syncCadence: "Hourly GitHub Actions publication", dataCutoff: generatedAt, policyVersion: "R360-KPI-1.0" },
  counts, kpis, capacity, forecast, accounts, projects,
  portfolios: portfolioRecords.map((item, index) => ({ key: `PORTFOLIO-${String(index + 1).padStart(2, "0")}`, name: item.Name, account: item.Account__r?.Name ?? "Mock account", status: item.Current__c ? "Current" : "Historic", projects: projects.filter((project) => project.portfolio === item.Name).length })),
  staffing, commercial, delivery, unavailability,
  quality: { guardrailBreaches: capacity.filter((item) => item.allocatedHours > 12 || (item.allocatedHours > 8 && !item.approvedOverallocation)).length, pendingCapacityApprovals: capacity.reduce((sum, item) => sum + item.pendingApprovalCount, 0), forecastWeeks: forecast.length, snapshotRecords: sanitizedKpis.length },
};

assert.equal(snapshot.classification, "SANITIZED_DEMO_ONLY");
assert.equal(snapshot.counts.accounts, 10, "Snapshot requires exactly the seeded ten-account population.");
assert.equal(snapshot.counts.projects, 20, "Snapshot requires exactly the seeded twenty-project population.");
assert.equal(snapshot.accounts.length, 10, "Snapshot requires ten sanitized account summaries.");
assert.equal(snapshot.capacity.length, 60, "Snapshot requires one current capacity row per demo resource.");
assert.equal(snapshot.forecast.length, 13, "Snapshot requires thirteen forecast weeks.");
assert.equal(snapshot.counts.kpiSnapshots, 214, "Snapshot requires exactly 214 governed KPI observations.");
assert.equal(snapshot.counts.unavailabilityEvents, 12, "Snapshot requires exactly twelve approved unavailability events.");
assert(snapshot.kpis.length >= 10, "Snapshot requires certified operational KPIs.");
const serialized = `${JSON.stringify(snapshot, null, 2)}\n`;
for (const forbidden of [/@/, /gh[pousr]_/i, /sfdxAuthUrl/i, /access.?token/i, /refresh.?token/i, /instanceUrl/i, /"Id"\s*:/]) assert(!forbidden.test(serialized), `Public snapshot failed secret or identity scan: ${forbidden}`);
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, serialized);
process.stdout.write(`Published ${snapshot.counts.projects} projects, ${snapshot.capacity.length} capacity rows, ${snapshot.forecast.length} forecast weeks and ${sanitizedKpis.length} KPI snapshots to ${outputPath}.\n`);
