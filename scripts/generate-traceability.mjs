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
  CORE: "Inbound API, integration run/error, role scope/sharing, outbox and workspace source/freshness contracts",
  BUD: "Resource360BudgetService, Budget Guard triggers, immutable approval decisions, formulas and budget report type",
  RAS: "Resource360CalendarService, Resource360StaffingService, effective-dated allocations and allocation report type",
  STF: "Staffing request lifecycle, atomic Staffer decision, SLA scheduler, notifications and staffing report type",
  SMS: "Resource360SkillService, Resource360TalentService v2, project evidence, learning/credential API and permission groups",
  SFCOE: "Capability/credential/evidence model, explainable fit policy v1 and 103 governed screen contracts",
  TS: "Resource360TimeService, immutable actuals, correction lineage, escalation/auto-approval scheduler and actuals report type",
  GOV: "Effective classification metadata, KPI snapshot, role scope sharing, audit/outbox and Command Center screens",
  ADM: "Policy/classification metadata, generated RBAC, field history, immutable audit, operations screens and release controls"
};
const partial = new Set(["BUD-002","BUD-004","BUD-008","BUD-013","BUD-014","BUD-015","RAS-001","RAS-002","RAS-003","RAS-005","RAS-006","RAS-011","RAS-012","RAS-014","RAS-015","RAS-017","RAS-020","STF-008","SMS-003","SMS-005","SMS-006","SMS-007","SMS-015","SMS-016","SMS-017","SMS-018","SFCOE-001","SFCOE-002","SFCOE-006","TS-006","TS-008","TS-009","TS-010","GOV-004","GOV-005","GOV-006","GOV-007","GOV-009","ADM-001","ADM-002","ADM-004","ADM-005","ADM-006"]);
const activation = new Set(["CORE-001","CORE-002","CORE-003","ADM-003"]);
const statusFor = ({ id, priority }) => activation.has(id) ? "Assumed contract; EXL activation" : partial.has(id) ? "Partial / activation backlog" : priority === "P2" ? "Later-phase screen contract" : priority === "P1" ? "Screen contract + implemented foundation" : "Implemented in demo baseline";
const escape = (value) => value.replaceAll("|", "\\|").replaceAll("\n", " ");
const counts = requirements.reduce((map, item) => { const status = statusFor(item); map[status] = (map[status] || 0) + 1; return map; }, {});
const summary = Object.entries(counts).map(([status, count]) => `- ${status}: ${count}`).join("\n");
const rows = requirements.map((item) => `| ${item.id} | ${item.priority} | ${statusFor(item)} | ${escape(evidence[item.id.split("-")[0]])} | ${escape(item.acceptance)} |`).join("\n");
const uatRows = uatScenarios.map((item) => `| ${item.id} | Business UAT required | ${escape(item.scenario)} | ${escape(item.expected)} |`).join("\n");
const document = `# Resource 360 requirements traceability\n\nGenerated from PRD v1.2 and the repository screen catalogue. This matrix is an engineering truth register: “implemented” means deployable in the Salesforce demo baseline; activation items require EXL-owned identity, endpoint, data, licensing, or operating decisions.\n\n## Coverage summary\n\n- Functional/admin requirements traced: ${requirements.length}\n- UAT scenarios traced: ${uatScenarios.length}\n- Total PRD requirement/UAT items traced: ${requirements.length + uatScenarios.length}\n- Governed screen contracts traced: ${new Set(screens).size}\n${summary}\n\n## Requirement matrix\n\n| Requirement | Priority | Delivery status | Repository evidence | Acceptance evidence required |\n|---|---|---|---|---|\n${rows}\n\n## UAT register\n\nAutomated tests are implementation evidence, not a substitute for EXL business acceptance. Every scenario remains explicitly open for named business execution and sign-off.\n\n| Scenario | Status | Business scenario | Expected result |\n|---|---|---|---|\n${uatRows}\n\n## Screen assurance\n\nAll 103 screen IDs are declared once in \`app/screen-data.ts\`, transformed into Salesforce authorization/source/API/state/acceptance contracts by \`screenContracts.js\`, and checked by \`tests/app.test.mjs\`. A screen contract is not a claim that every external EXL dependency is activated.\n`;
await writeFile("docs/REQUIREMENTS_TRACEABILITY.md", document);
console.log(`Generated traceability for ${requirements.length} requirements, ${uatScenarios.length} UAT scenarios and ${new Set(screens).size} screens.`);
