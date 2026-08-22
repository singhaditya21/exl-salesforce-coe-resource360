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
