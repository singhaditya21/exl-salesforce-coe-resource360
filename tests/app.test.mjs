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
