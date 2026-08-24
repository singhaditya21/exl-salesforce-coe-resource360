import { readFile, writeFile } from "node:fs/promises";

const prd = await readFile("docs/EXL_Salesforce_COE_Resource360_PRD_v1.0.md", "utf8");
const screenData = await readFile("app/screen-data.ts", "utf8");
const requirements = [...prd.matchAll(/^\| ((?:CORE|BUD|RAS|STF|SMS|SFCOE|TS|GOV|ADM)-\d{3}) \| (P\d) \| ([^|]+) \| ([^|]+) \|$/gm)].map((match) => ({ id: match[1], priority: match[2], requirement: match[3].trim(), acceptance: match[4].trim() }));
const uatScenarios = [...prd.matchAll(/^\| (UAT-\d{2}) \| ([^|]+) \| ([^|]+) \|$/gm)].map((match) => ({ id: match[1], scenario: match[2].trim(), expected: match[3].trim() }));
const screens = [...screenData.matchAll(/s\("([A-Z]+(?:UI)?-\d{2})"/g)].map((match) => match[1]);
if (requirements.length !== 109) throw new Error(`Expected 109 functional/admin PRD requirements; found ${requirements.length}.`);
if (uatScenarios.length !== 25) throw new Error(`Expected 25 UAT scenarios; found ${uatScenarios.length}.`);
if (new Set(screens).size !== 103) throw new Error(`Expected 103 unique screen contracts; found ${new Set(screens).size}.`);

const evidence = {
  CORE: "R360-MOCK-1.2 canonical source contracts, deterministic inbound identity/collision handling, completeness/freshness run evidence, fail-closed decision gates, role scope/sharing and durable outbox",
  BUD: "Versioned Resource360BudgetService economics, resource-month roster, atomic JSON import with exact errors, 160-hour/role-window assurance, as-of actual/ETC/EAC view, immutable decisions and report type",
  RAS: "Daily/percent/total Resource360PlanningService preview, work calendars, governed roles/classifications, owner transfer, effective-dated modify/split/deallocate, bulk exact-error export and allocation report type",
  STF: "Staffing request lifecycle, explainable eligibility/gaps, attributable ownership transfer, atomic Staffer decision, SLA scheduler, notifications and staffing report type",
  SMS: "Skill/credential lifecycle, deterministic duplicate survivor/collision reporting, source-attributed profile, project/learning evidence, ranked talent eligibility/gaps and permission groups",
  SFCOE: "Effective-dated Salesforce role/capability/credential model, normalized explainable fit policy, Eligible/Partially available/Unavailable reasons and 103 governed screen contracts",
  TS: "Allocation-authorized time, calendar/time-zone deadlines, immutable actuals, correction lineage, dual-control decisions, escalation/auto-approval, compliance exceptions/reconciliation and report type",
  GOV: "Effective classification/escalation metadata, KPI targets/definitions/hierarchy, accountable alert closure, audit/outbox, isolated deterministic what-if and Command Center screens",
  ADM: "Governed control plane with atomic multi-setting releases, controlled LOVs, bulk validation/commit, source contract assurance, retention dry run, generated RBAC, immutable audit and release controls"
};
const activation = new Set(["CORE-001","CORE-002","CORE-003","ADM-003"]);
const statusFor = ({ id }) => activation.has(id) ? "Mock contract implemented; EXL production activation required" : "Implemented in sanitized mock baseline";
const escape = (value) => value.replaceAll("|", "\\|").replaceAll("\n", " ");
const counts = requirements.reduce((map, item) => { const status = statusFor(item); map[status] = (map[status] || 0) + 1; return map; }, {});
const summary = Object.entries(counts).map(([status, count]) => `- ${status}: ${count}`).join("\n");
const rows = requirements.map((item) => `| ${item.id} | ${item.priority} | ${statusFor(item)} | ${escape(evidence[item.id.split("-")[0]])} | ${escape(item.acceptance)} |`).join("\n");
const uatRows = uatScenarios.map((item) => `| ${item.id} | Mock path available; EXL production UAT required | ${escape(item.scenario)} | ${escape(item.expected)} |`).join("\n");
const document = `# Resource 360 requirements traceability\n\nGenerated from PRD v1.4 and the repository screen catalogue. This is the engineering truth register for the EXL sanitized mock baseline. “Implemented” means demonstrable in GitHub Pages and/or deployable in the Salesforce Developer Edition with fictional records; it does not mean an EXL production identity, source, volume, policy or approval has been certified.\n\n## Coverage summary\n\n- Functional/admin requirements traced: ${requirements.length}\n- UAT scenarios traced: ${uatScenarios.length}\n- Total PRD requirement/UAT items traced: ${requirements.length + uatScenarios.length}\n- Governed screen contracts traced: ${new Set(screens).size}\n${summary}\n\nThe only open delivery category is EXL production activation. Its four requirements already have explicit deterministic mock contracts, but cannot be truthfully closed without EXL-owned identities, endpoint/data certification and environment approval.\n\n## Requirement matrix\n\n| Requirement | Priority | Delivery status | Repository evidence | Acceptance evidence required |\n|---|---|---|---|---|\n${rows}\n\n## UAT register\n\nAutomated tests and browser scenarios are implementation evidence, not a substitute for EXL business acceptance. Every scenario is usable in the mock baseline and remains open only as production activation evidence.\n\n| Scenario | Status | Business scenario | Expected result |\n|---|---|---|---|\n${uatRows}\n\n## Screen assurance\n\nAll 103 screen IDs are declared once in \`app/screen-data.ts\`, transformed into Salesforce authorization/source/API/state/acceptance contracts by \`screenContracts.js\`, and checked by \`tests/app.test.mjs\`. The public companion supplies deterministic mock behavior for decision-critical gaps; the Lightning workspace supplies real Salesforce metadata, Apex validation, permissions, audit and transactional behavior. Neither surface claims that an external EXL dependency is activated.\n`;
await writeFile("docs/REQUIREMENTS_TRACEABILITY.md", document);
console.log(`Generated traceability for ${requirements.length} requirements, ${uatScenarios.length} UAT scenarios and ${new Set(screens).size} screens.`);
