import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("builds a static GitHub Pages application", async () => {
  const [html, viteConfig, workflow] = await Promise.all([
    readFile(new URL("../dist/index.html", import.meta.url), "utf8"),
    readFile(new URL("../vite.config.ts", import.meta.url), "utf8"),
    readFile(new URL("../.github/workflows/deploy-pages.yml", import.meta.url), "utf8"),
  ]);
  assert.match(html, /<title>EXL Salesforce COE Resource360<\/title>/i);
  assert.match(html, /id="root"/i);
  assert.match(viteConfig, /GITHUB_REPOSITORY/);
  assert.match(workflow, /actions\/deploy-pages@v5/);
  assert.doesNotMatch(`${viteConfig}\n${workflow}`, /openai|chatgpt|cloudflare|vinext/i);
});

test("contains exactly 103 unique PRD screens", async () => {
  const source = await readFile(new URL("../app/screen-data.ts", import.meta.url), "utf8");
  const ids = [...source.matchAll(/^\s*s\("([A-Z]+[A-Z0-9-]*)"/gm)].map((match) => match[1]);
  assert.equal(ids.length, 103);
  assert.equal(new Set(ids).size, 103);
  for (const prefix of ["GLB-", "ENG-", "STFUI-", "SKLUI-", "BUDUI-", "TIMEUI-", "CMD-", "ADMUI-", "AIUI-"]) {
    assert.ok(ids.some((id) => id.startsWith(prefix)), `missing ${prefix} screens`);
  }
});

test("ships the working staffing decision slice", async () => {
  const [page, staffing] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/staffing-workflow.tsx", import.meta.url), "utf8"),
  ]);
  for (const id of ["STFUI-21", "STFUI-22", "STFUI-23"]) assert.match(page, new RegExp(id));
  assert.match(staffing, /localStorage\.setItem/);
  assert.match(staffing, /Accept request/);
  assert.match(staffing, /Decline request/);
  assert.match(staffing, /Capacity validation/);
});

test("connects the full static-demo transaction chain", async () => {
  const [page, operations, system] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/operational-screens.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/demo-system.ts", import.meta.url), "utf8"),
  ]);
  for (const term of ["BudgetDemo", "SkillsDemo", "StaffingPlanningDemo", "TimesheetDemo", "CommandDemo", "AdminDemo"]) assert.match(page, new RegExp(term));
  for (const action of ["submitBudget", "decideBudget", "submitClaim", "decideClaim", "commitAllocation", "submitTimesheet", "decideTimesheet"]) assert.match(`${operations}\n${system}`, new RegExp(action));
  assert.match(system, /ALLOCATION_COMMITTED/);
  assert.match(system, /TIME_SUBMITTED/);
});

test("renders route-specific Pages workbenches instead of module-wide repeated screens", async () => {
  const [page, operations, synchronized] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/operational-screens.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/synchronized-360.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(page, /data-route-experience/);
  assert.match(page, /data-active-screen/);
  assert.doesNotMatch(page, /if \(screen\.module === "engagement"\) return <EngagementDemo/);
  assert.doesNotMatch(page, /if \(screen\.module === "budget"\) return <BudgetDemo/);
  assert.doesNotMatch(page, /if \(screen\.module === "skills"\) return <SkillsDemo/);
  for (const id of ["CMD-02", "CMD-03", "CMD-04", "CMD-05", "CMD-06", "CMD-07"]) assert.match(operations, new RegExp(id));
  for (const title of ["Utilization explorer", "Supply, demand and capacity", "Unbilled governance", "Staffing performance", "Salesforce capability coverage", "Engagement economics", "Data quality and sync operations"]) assert.match(operations, new RegExp(title));
  assert.match(synchronized, /Account 360 · synchronized/);
  assert.match(synchronized, /Twenty-project selector/);
  assert.match(synchronized, /Sixty-resource selector/);
  assert.doesNotMatch(page, /is available in the browser demo/);
});

test("publishes an allowlisted Salesforce snapshot without credentials or record ids", async () => {
  const [workflow, exporter, snapshotText] = await Promise.all([
    readFile(new URL("../.github/workflows/deploy-pages.yml", import.meta.url), "utf8"),
    readFile(new URL("../scripts/export-salesforce-pages-snapshot.mjs", import.meta.url), "utf8"),
    readFile(new URL("../public/data/salesforce-snapshot.json", import.meta.url), "utf8"),
  ]);
  const snapshot = JSON.parse(snapshotText);
  assert.match(workflow, /cron: "17 \* \* \* \*"/);
  assert.match(workflow, /RESOURCE360_SFDX_AUTH_URL/);
  assert.match(workflow, /export-salesforce-pages-snapshot/);
  assert.match(exporter, /SANITIZED_DEMO_ONLY/);
  assert.equal(snapshot.schemaVersion, 2);
  assert.equal(snapshot.classification, "SANITIZED_DEMO_ONLY");
  assert.equal(snapshot.counts.accounts, 10);
  assert.equal(snapshot.counts.projects, 20);
  assert.equal(snapshot.counts.resources, 60);
  assert.equal(snapshot.accounts.length, 10);
  assert.equal(snapshot.projects.length, 20);
  assert.ok(snapshot.projects.every((project) => project.contractCount >= 1));
  assert.ok(snapshot.projects.every((project) => project.paymentCount >= 1));
  assert.ok(snapshot.projects.every((project) => project.moduleCount >= 1));
  assert.ok(snapshot.projects.every((project) => project.workUnitCount >= 1));
  assert.equal(snapshot.capacity.length, 60);
  assert.equal(snapshot.forecast.length, 13);
  assert.equal(snapshot.quality.guardrailBreaches, 0);
  assert.doesNotMatch(snapshotText, /@|gh[pousr]_|sfdxAuthUrl|access.?token|refresh.?token|instanceUrl|"Id"\s*:/i);
});

test("the help screen publishes the validated recording library", async () => {
  const [page, operations] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/operational-screens.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(operations, /export function VideoLibrary/);
  assert.match(operations, /5 recordings verified/);
  for (const name of ["01-product-overview", "02-skills-and-talent", "03-staffing-decision", "04-budget-and-actuals", "05-demo-activation"]) assert.match(operations, new RegExp(name));
  assert.match(page, /screen\.id === "GLB-06"/);
});

test("includes static-host resilience and repository security controls", async () => {
  const [html, serviceWorker, manifest, security, codeql] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../public/sw.js", import.meta.url), "utf8"),
    readFile(new URL("../public/manifest.webmanifest", import.meta.url), "utf8"),
    readFile(new URL("../SECURITY.md", import.meta.url), "utf8"),
    readFile(new URL("../.github/workflows/codeql.yml", import.meta.url), "utf8"),
  ]);
  assert.match(html, /Content-Security-Policy/);
  assert.match(serviceWorker, /resource360-demo-v2/);
  assert.match(manifest, /standalone/);
  assert.match(security, /must not contain EXL production data/i);
  assert.match(codeql, /javascript-typescript/);
});

test("has no remaining ChatGPT Sites binding", async () => {
  await assert.rejects(access(new URL("../.openai/hosting.json", root)));
  const [packageJson, readme] = await Promise.all([
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../README.md", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(packageJson, /openai|sites-vite-plugin|cloudflare|vinext|wrangler/i);
  assert.match(readme, /GitHub Pages/);
});

test("publishes complete, version-aligned governance and integration contracts", async () => {
  const [registerText, projectText, envelopeText] = await Promise.all([
    readFile(new URL("../contracts/resource360-governance-register.json", import.meta.url), "utf8"),
    readFile(new URL("../contracts/resource360-common-project-contract.schema.json", import.meta.url), "utf8"),
    readFile(new URL("../contracts/resource360-master-data-envelope.schema.json", import.meta.url), "utf8"),
  ]);
  const register = JSON.parse(registerText);
  const project = JSON.parse(projectText);
  const envelope = JSON.parse(envelopeText);
  assert.equal(register.contractVersion, "R360-MOCK-1.2");
  assert.equal(register.sourceContracts.length, 13);
  assert.equal(register.personas.length, 18);
  assert.equal(register.retentionRules.length, 8);
  assert.equal(register.demoActivationPillars.length, 5);
  assert.ok(register.demoActivationPillars.every((item) => item.mode === "Sanitized deterministic simulation"));
  assert.equal(register.demoApprovalEvidence.length, 6);
  assert.ok(register.demoApprovalEvidence.every((item) => item.status === "Approved mock assumption"));
  assert.equal(new Set(register.personas.map((item) => item.businessRole)).size, 18);
  assert.ok(register.personas.every((item) => item.permissionSetGroup && item.entraGroupAlias));
  assert.ok(register.retentionRules.every((item) => item.legalHoldEligible));
  assert.equal(project["x-resource360"].contractVersion, register.contractVersion);
  assert.equal(envelope.properties.contractVersion.const, register.contractVersion);
  assert.equal(envelope.properties.records.maxItems, 200);
  assert.deepEqual(project.required, ["engagementId", "name", "startDate", "endDate", "status", "revenueType", "currency"]);
});

test("keeps all Salesforce LWC persona routes positive and least-privilege negative", async () => {
  const [screenSource, registerText, lwcContracts] = await Promise.all([
    readFile(new URL("../app/screen-data.ts", import.meta.url), "utf8"),
    readFile(new URL("../contracts/resource360-governance-register.json", import.meta.url), "utf8"),
    import(new URL("../force-app/main/default/lwc/resource360Workspace/screenContracts.js", import.meta.url)),
  ]);
  const catalogue = [...screenSource.matchAll(/^\s*s\("([A-Z]+[A-Z0-9-]*)",\s*"([^"]+)",\s*"([^"]+)"/gm)].map((match) => ({ id: match[1], title: match[2], module: match[3], kind: "contract" }));
  const governed = lwcContracts.governedScreens(catalogue);
  const roles = JSON.parse(registerText).personas.map((persona) => persona.businessRole);
  assert.equal(governed.length, 103);
  assert.equal(roles.length, 18);
  for (const role of roles) {
    assert.ok(governed.some((screen) => screen.allowedRoles.includes(role)), `${role} requires a positive LWC route`);
    if (role === "Administrator") assert.ok(governed.every((screen) => screen.allowedRoles.includes(role)), "Administrator is the explicit unrestricted control persona");
    else assert.ok(governed.some((screen) => !screen.allowedRoles.includes(role)), `${role} requires a negative LWC route`);
  }
});

test("gives every Salesforce route either a specialized command panel or a distinct declarative workbench", async () => {
  const [catalogue, experiences] = await Promise.all([
    import(new URL("../force-app/main/default/lwc/resource360Workspace/screenCatalog.js", import.meta.url)),
    import(new URL("../force-app/main/default/lwc/resource360Workspace/screenExperiences.js", import.meta.url)),
  ]);
  const allIds = catalogue.SCREENS.map((screen) => screen.id);
  const implemented = [...experiences.SPECIALIZED_SCREEN_IDS, ...experiences.DECLARATIVE_SCREEN_IDS];
  assert.equal(experiences.SPECIALIZED_SCREEN_IDS.length, 46);
  assert.equal(experiences.DECLARATIVE_SCREEN_IDS.length, 57);
  assert.equal(new Set(implemented).size, 103);
  assert.deepEqual(new Set(implemented), new Set(allIds));
  for (const id of experiences.DECLARATIVE_SCREEN_IDS) {
    const route = experiences.routeExperienceFor(id);
    assert.ok(route.dataset, `${id} requires a live Salesforce dataset`);
    assert.ok(route.visual && route.focus && route.evidence, `${id} requires a distinct operational experience`);
    assert.ok(route.target || route.operation, `${id} requires an executable primary action`);
  }
});
