import { SCREENS } from '../../force-app/main/default/lwc/resource360Workspace/screenCatalog.js';
import { governedScreens } from '../../force-app/main/default/lwc/resource360Workspace/screenContracts.js';

const catalogue = governedScreens(SCREENS);
const byId = new Map(catalogue.map((screen) => [screen.id, screen]));
const range = (prefix, start, end) => Array.from({ length: end - start + 1 }, (_, index) => `${prefix}-${String(start + index).padStart(2, '0')}`);

const specs = [
  { number: 3, id: 'master-03-staffing-demand-search', outputBase: 'master-03-staffing-demand-resource-search', title: 'Master 03 — Staffing Demand & Resource Search', subtitle: 'From approved project demand to an explainable candidate shortlist', personas: 'Project Manager · COE Staffer', ids: range('STFUI', 1, 12), colors: ['#062d52','#0b83d5'] },
  { number: 4, id: 'master-04-staffing-decisions-capacity', outputBase: 'master-04-staffing-decisions-allocation-capacity', title: 'Master 04 — Staffing Decisions, Allocation & Capacity', subtitle: 'Human decisions, effective-dated allocation and controlled over-allocation', personas: 'COE Staffer · HOD · Project Manager', ids: range('STFUI', 13, 24), colors: ['#07385a','#008f9c'] },
  { number: 5, id: 'master-05-skills-credentials-i', outputBase: 'master-05-skills-credentials-part-1', title: 'Master 05 — Skills & Credentials, Part I', subtitle: 'Resource 360, claims, evidence, credentials and learning readiness', personas: 'Practitioner · Reporting Manager · COE Staffer', ids: range('SKLUI', 1, 12), colors: ['#2f1b69','#7b4ed8'] },
  { number: 6, id: 'master-06-skills-credentials-ii', outputBase: 'master-06-skills-credentials-part-2', title: 'Master 06 — Skills & Credentials, Part II', subtitle: 'Manager review, capability supply, taxonomy and access governance', personas: 'Reporting Manager · Capability Administrator · HOD', ids: range('SKLUI', 13, 24), colors: ['#3f1c66','#a43cb0'] },
  { number: 7, id: 'master-07-budget-commercial', outputBase: 'master-07-budget-wbs-commercial-control', title: 'Master 07 — Budgeting, WBS & Commercial Control', subtitle: 'Versioned economics, delivery costing, approval and contract-to-cash', personas: 'Finance / PMO · Project Manager · Budget Approver', ids: range('BUDUI', 1, 12), colors: ['#064f3d','#18a570'] },
  { number: 8, id: 'master-08-timesheet-actuals', outputBase: 'master-08-timesheet-actuals', title: 'Master 08 — Timesheets & Actuals', subtitle: 'Allocation-authorized time, eight-hour validation and reconciliation', personas: 'Practitioner · Reporting Manager · Timesheet Approver', ids: range('TIMEUI', 1, 8), colors: ['#7b3700','#e98311'] },
  { number: 9, id: 'master-09-command-center', outputBase: 'master-09-command-center-forecast', title: 'Master 09 — Command Center & Forecast', subtitle: 'Certified KPIs, capacity, delivery, commercial and data-quality drill-downs', personas: 'Portfolio Manager · Executive Viewer · Operations', ids: range('CMD', 1, 9), colors: ['#012f4b','#087aa5'] },
  { number: 10, id: 'master-10-admin-assurance', outputBase: 'master-10-administration-configuration-assurance', title: 'Master 10 — Administration, Configuration & Assurance', subtitle: 'Persona access, dual-control configuration, sources and activation', personas: 'Administrator · Configuration Operator · Auditor · Operations', ids: range('ADMUI', 1, 8), colors: ['#273643','#60788a'] },
  { number: 11, id: 'master-11-planning-intelligence', outputBase: 'master-11-planning-intelligence', title: 'Master 11 — Planning Intelligence', subtitle: 'Explainable recommendations, scenarios, guardrails and human checkpoints', personas: 'COE Staffer · Portfolio Manager · Administrator', ids: range('AIUI', 1, 4), colors: ['#291674','#176cc0'] },
  { number: 12, id: 'master-12-executive-golden-path', outputBase: 'master-12-executive-golden-path', title: 'Master 12 — Executive Golden Path', subtitle: 'Account to contract to resource to budget to time to governed completion', personas: 'Executive Viewer · Portfolio Manager · Project Manager · COE Staffer · Finance / PMO', ids: ['GLB-02','ENG-01','ENG-02','STFUI-06','STFUI-07','SKLUI-05','STFUI-10','STFUI-13','STFUI-21','STFUI-23','BUDUI-05','BUDUI-10','TIMEUI-02','TIMEUI-06','CMD-01','CMD-08','PAGES-CMD-08'], colors: ['#071f33','#0b6f9e'] }
];

const visualInteraction = (screen) => {
  if (screen.id.startsWith('CMD-')) return 'Apply the certified scope filter, select a KPI or exception, expose source lineage and drill toward accountable evidence.';
  if (screen.kind === 'planner') return 'Select an effective-dated plan line, compare the eight-hour capacity state, expose control evidence and continue through the visible journey.';
  if (screen.kind === 'form') return 'Filter the authorized choices, select live Salesforce evidence, expose validation lineage and prepare the governed primary action.';
  if (screen.kind === 'dashboard') return 'Filter the certified view, inspect a KPI state, expose the common cutoff and retain the drill-down evidence.';
  return 'Filter the user-mode records, select one evidence item, reveal source and policy lineage and prepare the accountable next action.';
};

const narrationFor = (screen, spec, index) => `${screen.id} is ${screen.title}, stage ${index + 1} in ${spec.title.replace(/^Master \d+ — /, '')}. ${screen.description} The acting ${spec.personas.replaceAll(' · ', ' or ')} works only with records returned inside the effective Salesforce role and portfolio scope. In this live interaction we use the visible filters, select a specific record or planning state, expose source ownership and server-validation evidence, and prepare “${screen.primary}”. ${screen.validations} The screen retains ${screen.events} so the resulting choice is attributable and reviewable. The operational surface differs from the preceding stage because it is designed around this decision: its live dataset, visual model, exception state and primary control follow the ${screen.module} contract rather than a generic call-to-action. No EXL production identity or integration is invoked; all records are fictional, while the Salesforce metadata, Apex authority, sharing, effective dates and audit behavior are genuine in the Developer Edition demonstration.`;

function pageScene() {
  return {
    id: 'PAGES-CMD-08', title: 'GitHub Pages synchronized replay', module: 'command', kind: 'dashboard', description: 'The public companion replays the allowlisted Salesforce population, freshness cutoff and project/resource/account 360 evidence without record IDs or credentials.', primary: 'Verify synchronized companion', validations: 'Allowlisted snapshot; exact counts; zero credentials or Salesforce IDs', events: 'PAGES_SNAPSHOT_VERIFIED',
  };
}

export function masterConfig(number) {
  const spec = specs.find((item) => item.number === number);
  if (!spec) throw new Error(`Unknown master ${number}`);
  const screens = spec.ids.map((id) => id === 'PAGES-CMD-08' ? pageScene() : byId.get(id));
  if (screens.some((screen) => !screen)) throw new Error(`Master ${number} has an unknown screen.`);
  return {
    id: spec.id,
    authoredRoot: '../v3',
    rawFolder: `master-${String(number).padStart(2, '0')}`,
    outputBase: spec.outputBase,
    captureFramesPerSecond: 2.5,
    introMinimumSeconds: number === 12 ? 34 : 30,
    baseline: 'resource360-demo-v3.0-complete-suite',
    title: spec.title,
    subtitle: spec.subtitle,
    personas: spec.personas,
    titleColors: spec.colors,
    intro: `Welcome to ${spec.title} for EXL Salesforce COE Resource 360. This recording covers ${screens.length} governed stages through actual Salesforce navigation${number === 12 ? ' and closes with the synchronized GitHub Pages companion' : ''}. The acting personas are ${spec.personas}. Every stage uses fictional seeded data, visible selection, filtering, evidence lineage and an action outcome. Salesforce remains the transactional system of record; the public companion is read-only and sanitized.`,
    scenes: screens.map((screen, index) => ({
      screen: screen.id,
      raw: `${String(index + 1).padStart(2, '0')}-${screen.id.toLowerCase()}`,
      title: screen.title,
      interaction: visualInteraction(screen),
      narration: narrationFor(screen, spec, index),
    })),
  };
}

export const MASTER_NUMBERS = specs.map((item) => item.number);
