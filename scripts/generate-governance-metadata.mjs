import fs from "node:fs";
import path from "node:path";

const metadataRoot = path.join(process.cwd(), "force-app/main/default");
const objectRoot = path.join(metadataRoot, "objects");
const recordRoot = path.join(metadataRoot, "customMetadata");
const contractRoot = path.join(process.cwd(), "contracts");
const escape = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const typed = (type, value) => {
  const xsi = type === "number" ? "xsd:double" : type === "boolean" ? "xsd:boolean" : type === "date" ? "xsd:date" : "xsd:string";
  return `<value xsi:type="${xsi}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">${escape(value)}</value>`;
};
const fieldXml = (name, label, type, options = {}) => {
  const details = type === "Text" ? `<length>${options.length ?? 255}</length>` : type === "Number" ? `<precision>${options.precision ?? 18}</precision><scale>${options.scale ?? 0}</scale>` : type === "Checkbox" ? `<defaultValue>${options.defaultValue ?? false}</defaultValue>` : "";
  return `<?xml version="1.0" encoding="UTF-8"?>\n<CustomField xmlns="http://soap.sforce.com/2006/04/metadata"><fullName>${name}</fullName>${type === "Checkbox" ? details : ""}<fieldManageability>DeveloperControlled</fieldManageability><label>${escape(label)}</label>${type === "Text" || type === "Number" ? details : ""}<type>${type}</type></CustomField>\n`;
};
const ensureMetadataType = (name, label, pluralLabel, fields) => {
  const typeRoot = path.join(objectRoot, name);
  const fieldsRoot = path.join(typeRoot, "fields");
  fs.mkdirSync(fieldsRoot, { recursive: true });
  fs.writeFileSync(path.join(typeRoot, `${name}.object-meta.xml`), `<?xml version="1.0" encoding="UTF-8"?>\n<CustomObject xmlns="http://soap.sforce.com/2006/04/metadata"><label>${escape(label)}</label><pluralLabel>${escape(pluralLabel)}</pluralLabel><visibility>Public</visibility></CustomObject>\n`);
  for (const field of fields) fs.writeFileSync(path.join(fieldsRoot, `${field[0]}.field-meta.xml`), fieldXml(...field));
};
const writeRecord = (type, developerName, label, values) => {
  const body = Object.entries(values).map(([field, definition]) => `<values><field>${field}</field>${typed(definition[0], definition[1])}</values>`).join("");
  fs.writeFileSync(path.join(recordRoot, `${type}.${developerName}.md-meta.xml`), `<?xml version="1.0" encoding="UTF-8"?>\n<CustomMetadata xmlns="http://soap.sforce.com/2006/04/metadata"><label>${escape(label)}</label><protected>false</protected>${body}</CustomMetadata>\n`);
};
for (const prefix of ["R360_Source_Contract.", "R360_Source_Contract__mdt.", "R360_Persona.", "R360_Persona__mdt.", "R360_Retention_Rule.", "R360_Retention_Rule__mdt."]) {
  for (const file of fs.readdirSync(recordRoot).filter((name) => name.startsWith(prefix))) fs.unlinkSync(path.join(recordRoot, file));
}

ensureMetadataType("R360_Source_Contract__mdt", "Resource 360 Source Contract", "Resource 360 Source Contracts", [
  ["Active__c", "Active", "Checkbox", { defaultValue: true }],
  ["Contract_Version__c", "Contract Version", "Text", { length: 40 }],
  ["Entity_Type__c", "Entity Type", "Text", { length: 80 }],
  ["Authoritative_Source__c", "Authoritative Source", "Text", { length: 120 }],
  ["Stable_Identity__c", "Stable Identity", "Text", { length: 120 }],
  ["Canonical_Fields__c", "Canonical Fields", "Text", { length: 255 }],
  ["Data_Owner__c", "Data Owner", "Text", { length: 120 }],
  ["Freshness_Hours__c", "Freshness Hours", "Number", { precision: 6, scale: 0 }],
  ["Blocking__c", "Blocking", "Checkbox", { defaultValue: false }],
  ["Data_Classification__c", "Data Classification", "Text", { length: 80 }],
  ["Endpoint_Alias__c", "Endpoint Alias", "Text", { length: 120 }],
  ["Direction__c", "Direction", "Text", { length: 30 }],
  ["Approval_Status__c", "Approval Status", "Text", { length: 40 }],
  ["Approved_On__c", "Approved On", "Date"],
]);

ensureMetadataType("R360_Persona__mdt", "Resource 360 Persona", "Resource 360 Personas", [
  ["Active__c", "Active", "Checkbox", { defaultValue: true }],
  ["Business_Role__c", "Business Role", "Text", { length: 100 }],
  ["Permission_Set_Group__c", "Permission Set Group", "Text", { length: 120 }],
  ["Entra_Group_Alias__c", "Entra Group Alias", "Text", { length: 120 }],
  ["Scope_Type__c", "Scope Type", "Text", { length: 80 }],
  ["Decision_Authority__c", "Decision Authority", "Text", { length: 255 }],
  ["Segregation_Class__c", "Segregation Class", "Text", { length: 80 }],
  ["Delegation_Allowed__c", "Delegation Allowed", "Checkbox", { defaultValue: false }],
  ["License_Assumption__c", "License Assumption", "Text", { length: 80 }],
  ["Control_Owner__c", "Control Owner", "Text", { length: 120 }],
  ["Approval_Status__c", "Approval Status", "Text", { length: 40 }],
  ["Approved_On__c", "Approved On", "Date"],
]);

ensureMetadataType("R360_Retention_Rule__mdt", "Resource 360 Retention Rule", "Resource 360 Retention Rules", [
  ["Active__c", "Active", "Checkbox", { defaultValue: true }],
  ["Record_Category__c", "Record Category", "Text", { length: 120 }],
  ["Retention_Days__c", "Retention Days", "Number", { precision: 7, scale: 0 }],
  ["Legal_Hold_Eligible__c", "Legal Hold Eligible", "Checkbox", { defaultValue: true }],
  ["Disposition_Action__c", "Disposition Action", "Text", { length: 80 }],
  ["Recovery_Window_Days__c", "Recovery Window Days", "Number", { precision: 6, scale: 0 }],
  ["Control_Owner__c", "Control Owner", "Text", { length: 120 }],
  ["Approval_Status__c", "Approval Status", "Text", { length: 40 }],
  ["Approved_On__c", "Approved On", "Date"],
  ["Evidence_Reference__c", "Evidence Reference", "Text", { length: 255 }],
]);

const sources = [
  ["People_Master", "People Master", "Employee", "Mock EXL People Master", "Employee ID", "preferredName|status|manager|grade|tower|location|orgUnitId|capacity", "HRIS / People Data", 24, true, "Confidential", "R360_People_Master", "Inbound"],
  ["Entra_Identity", "Microsoft Entra ID", "Identity", "Mock Microsoft Entra ID", "Entra Object ID + Salesforce User ID", "authentication|MFA|lifecycle|groupAliases", "Identity and Access Management", 1, true, "Restricted", "R360_Entra_ID", "Inbound"],
  ["Engagement_Master", "Engagement Master", "Engagement", "Mock EXL Engagement Master", "Engagement ID", "engagementId|name|startDate|endDate|status|revenueType|currency|confidentiality|portfolioId|salesforceTower|industry|poValue", "PSA / Delivery Operations", 4, true, "Confidential", "R360_Engagement_Master", "Inbound"],
  ["Commercial_Master", "Commercial Master", "CommercialReference", "Mock EXL Commercial Master", "External reference ID + Engagement ID", "type|value|validity|status|signature|currency", "Finance / Commercial Operations", 24, true, "Restricted", "R360_Commercial_Master", "Inbound"],
  ["Learning_Hub", "Learning Hub", "LearningAchievement", "Mock EXL Learning Gateway", "Achievement ID + Employee ID", "course|provider|completion|mappedCapability|state", "L&D", 168, false, "Confidential", "R360_Learning_Hub", "Inbound"],
  ["Credential_Gateway", "Credential Gateway", "Credential", "Mock Salesforce Credential Gateway", "Credential ID + Employee ID", "name|issuer|issue|expiry|maintenance|verificationState", "Salesforce Capability / L&D", 168, true, "Confidential", "R360_Credential_Gateway", "Inbound"],
  ["Org_Hierarchy", "Org Hierarchy", "OrgUnit", "Mock EXL Org Hierarchy", "Org Unit ID", "name|type|parent|effectiveDates|current", "HRIS / People Data", 24, true, "Confidential", "R360_Org_Hierarchy", "Inbound"],
  ["Portfolio_Master", "Portfolio Master", "Portfolio", "Mock EXL Portfolio Master", "Portfolio ID", "name|parent|effectiveDates|current", "Delivery Operations", 24, true, "Confidential", "R360_Portfolio_Master", "Inbound"],
  ["Capability_Catalogue", "Capability catalogue", "Capability", "Resource360 governed catalogue", "Capability ID", "name|type|tower|category|aliases|effectiveDates|active", "Salesforce Capability Lead", 0, false, "Internal", "Resource360_Native", "Inbound"],
  ["Capability_Evidence", "Capability and skill evidence", "SkillClaim", "Resource360", "Skill Claim ID + Resource ID + Capability ID", "requestedLevel|approvedLevel|evidence|reviewer|decision", "Salesforce Capability Lead", 0, false, "Confidential", "Resource360_Native", "Native"],
  ["Budget_WBS", "Budget and WBS", "Budget", "Resource360", "Engagement ID + Budget Version", "economics|roster|WBS|signature|approvals|policyVersion", "Finance / PMO", 0, true, "Restricted", "Resource360_Native", "Native"],
  ["Staffing_Allocation", "Staffing and allocation", "Allocation", "Resource360", "Request ID + Allocation Version", "candidate|role|classification|dates|effort|decision|lineage", "COE Staffing", 0, true, "Confidential", "Resource360_Native", "Native"],
  ["Approved_Time", "Approved actual time", "ApprovedTime", "Resource360", "Timesheet ID + Entry Key + Version", "allocation|engagement|workDate|hours|approval|correctionLineage", "Delivery Operations", 0, true, "Restricted", "Resource360_Approved_Time", "Outbound"],
];
for (const source of sources) writeRecord("R360_Source_Contract", source[0], source[1], {
  Active__c: ["boolean", true], Contract_Version__c: ["text", "R360-MOCK-1.2"], Entity_Type__c: ["text", source[2]], Authoritative_Source__c: ["text", source[3]], Stable_Identity__c: ["text", source[4]], Canonical_Fields__c: ["text", source[5]], Data_Owner__c: ["text", source[6]], Freshness_Hours__c: ["number", source[7]], Blocking__c: ["boolean", source[8]], Data_Classification__c: ["text", source[9]], Endpoint_Alias__c: ["text", source[10]], Direction__c: ["text", source[11]], Approval_Status__c: ["text", "Approved mock assumption"], Approved_On__c: ["date", "2026-08-24"],
});

const personas = [
  ["Practitioner", "Practitioner", "Resource360_Practitioner", "EXL-R360-Practitioner", "Self", "Own skills, credentials and time", "Self service", false, "Salesforce Platform", "Salesforce COE"],
  ["Project_Manager", "Project Manager", "Resource360_Project_Manager", "EXL-R360-Project-Manager", "Engagement", "Budget/WBS and staffing demand", "Requester", true, "Salesforce Platform", "Delivery Operations"],
  ["Reporting_Manager", "Reporting Manager", "Resource360_Reporting_Manager", "EXL-R360-Reporting-Manager", "Manager subtree", "Skill review and first-line time approval", "People approver", true, "Salesforce Platform", "HR / Delivery"],
  ["COE_Staffer", "COE Staffer", "Resource360_COE_Staffer", "EXL-R360-COE-Staffer", "Talent pool and engagement", "Staffing arbitration and allocation", "Staffing approver", true, "Salesforce Platform", "COE Staffing"],
  ["Budget_Approver", "Budget Approver", "Resource360_Budget_Approver", "EXL-R360-Budget-Approver", "Assigned portfolio/engagement", "Assigned budget decisions under the captured route", "Budget approver", true, "Salesforce Platform", "Finance / Delivery"],
  ["Portfolio_Manager", "Portfolio Manager", "Resource360_Portfolio_Lead", "EXL-R360-Portfolio-Lead", "Portfolio", "First routed budget approval and portfolio controls", "Budget approver L1", true, "Salesforce Platform", "Delivery Leadership"],
  ["Account_Owner", "Account Owner", "Resource360_Account_Owner", "EXL-R360-Account-Owner", "Account/portfolio", "Commercial and unbilled exception ownership", "Commercial owner", true, "Salesforce Platform", "Account Leadership"],
  ["HOD", "HOD", "Resource360_Head_of_Delivery", "EXL-R360-HOD", "Delivery hierarchy", "Margin and delivery exception approval", "Budget approver L2", true, "Salesforce Platform", "Delivery Leadership"],
  ["GM_COO_Delegate", "GM/COO Delegate", "Resource360_GM_COO_Delegate", "EXL-R360-GM-COO", "Organization", "Highest-risk budget approval", "Budget approver L3", true, "Salesforce Platform", "COE Leadership"],
  ["Finance_PMO", "Finance/PMO", "Resource360_Finance_PMO", "EXL-R360-Finance-PMO", "Portfolio/engagement", "Economics review and governed reconciliation", "Financial control", true, "Salesforce Platform", "Finance / PMO"],
  ["Timesheet_Approver", "Timesheet Approver", "Resource360_Timesheet_Approver", "EXL-R360-Time-Approver", "Manager subtree", "Independent correction final approval", "Time approver L2", true, "Salesforce Platform", "Delivery Operations"],
  ["Capability_Administrator", "Capability Administrator", "Resource360_Capability_Administrator", "EXL-R360-Capability-Admin", "Capability catalogue", "Taxonomy, credential and evidence governance", "Capability control", true, "Salesforce Platform", "Capability / L&D"],
  ["Configuration_Operator", "Configuration Operator", "Resource360_Configuration_Operator", "EXL-R360-Config-Operator", "Configuration", "Draft, preview and submit configuration", "Configuration maker", false, "Salesforce Platform", "Product Operations"],
  ["Configuration_Approver", "Configuration Approver", "Resource360_Configuration_Approver", "EXL-R360-Config-Approver", "Configuration", "Approve, activate and roll back configuration", "Configuration checker", false, "Salesforce Platform", "Control Owner"],
  ["Operations", "Operations", "Resource360_Operations_User", "EXL-R360-Operations", "Organization", "Integrations, schedules, reconciliation and recovery", "Technical operator", true, "Salesforce Platform", "Product Operations"],
  ["Auditor", "Auditor", "Resource360_Audit_User", "EXL-R360-Auditor", "Authorized audit scope", "Read immutable audit and decision evidence", "Independent assurance", false, "Salesforce Platform", "Risk / Audit"],
  ["Executive_Viewer", "Executive Viewer", "Resource360_Executive_Viewer", "EXL-R360-Executive-Viewer", "Organization", "Read KPI and portfolio controls", "Read-only leadership", true, "Salesforce Platform", "COE Leadership"],
  ["Administrator", "Administrator", "Resource360_Administrator", "EXL-R360-Break-Glass", "Organization", "Technical break-glass only; no implicit business approval", "Break glass", false, "Salesforce", "Salesforce Platform Owner"],
];
for (const persona of personas) writeRecord("R360_Persona", persona[0], persona[1], {
  Active__c: ["boolean", true], Business_Role__c: ["text", persona[1]], Permission_Set_Group__c: ["text", persona[2]], Entra_Group_Alias__c: ["text", persona[3]], Scope_Type__c: ["text", persona[4]], Decision_Authority__c: ["text", persona[5]], Segregation_Class__c: ["text", persona[6]], Delegation_Allowed__c: ["boolean", persona[7]], License_Assumption__c: ["text", persona[8]], Control_Owner__c: ["text", persona[9]], Approval_Status__c: ["text", "Approved mock assumption"], Approved_On__c: ["date", "2026-08-24"],
});

const retentionRules = [
  ["Audit_Evidence", "Immutable audit evidence", 2555, true, "Retain immutable; production disposition disabled", 30, "Risk / Audit"],
  ["Approval_Decisions", "Approval decisions", 2555, true, "Retain immutable; production disposition disabled", 30, "Control Owners"],
  ["Budget_Staffing_Allocation", "Budget, staffing and allocation history", 2555, true, "Archive then dispose after approval", 30, "Delivery Operations / Finance"],
  ["Approved_Time", "Approved time and corrections", 2555, true, "Archive then dispose after approval", 30, "Delivery Operations / Finance"],
  ["Capability_Evidence", "Skill, credential and learning evidence", 2555, true, "Anonymize or dispose after approval", 30, "Capability / L&D"],
  ["Integration_Runs", "Integration runs and redacted errors", 365, true, "Dispose after recovery window", 30, "Product Operations"],
  ["Notifications", "Notifications and closure evidence", 365, true, "Dispose after recovery window", 30, "Product Operations"],
  ["Outbox_Events", "Outbox and dead-letter evidence", 90, true, "Dispose after recovery window", 30, "Product Operations"],
];
for (const rule of retentionRules) writeRecord("R360_Retention_Rule", rule[0], rule[1], {
  Active__c: ["boolean", true], Record_Category__c: ["text", rule[1]], Retention_Days__c: ["number", rule[2]], Legal_Hold_Eligible__c: ["boolean", rule[3]], Disposition_Action__c: ["text", rule[4]], Recovery_Window_Days__c: ["number", rule[5]], Control_Owner__c: ["text", rule[6]], Approval_Status__c: ["text", "Approved mock assumption"], Approved_On__c: ["date", "2026-08-24"], Evidence_Reference__c: ["text", "R360-MOCK-ACTIVATION-2026-08-24; execution remains non-destructive in the demo"],
});

const demoActivationPillars = [
  ["IDENTITY_SSO", "Identity and SSO", "Identity and Access Management", "Mock Entra SSO assertion, MFA, lifecycle, group-to-permission mapping and effective role scope", "18 governed personas; no credential collection or external authentication call"],
  ["INTEGRATIONS", "EXL integrations", "Product Operations", "Schema, version, freshness, completeness, collision, idempotency and retry rehearsal", "13 R360-MOCK-1.2 source contracts with deterministic payload fixtures"],
  ["FICTIONAL_DATA", "Production-like data", "Data Governance", "Fictional volume and reconciliation profile across people, engagements, budgets, staffing, skills and time", "Sanitized seeded records and .invalid identities only"],
  ["LEGAL_APPROVALS", "Legal and business approvals", "Risk, Legal, Privacy and Control Owners", "Mock privacy, retention, legal-hold, security, accessibility and UAT decisions", "Eight legal-hold-eligible rules; non-destructive disposition; fictional owners"],
  ["OPERATIONS", "Operational controls", "Product Operations", "Scheduler, monitoring, alerting, retry/dead-letter, backup, restore and disaster-recovery rehearsal", "Attributable dry run with zero external notification or destructive action"],
];
const demoApprovalEvidence = [
  ["APR-PRIVACY", "Privacy impact rehearsal", "Privacy Office", "MOCK-PIA-2026-08"],
  ["APR-SECURITY", "Threat model and access review", "Information Security", "MOCK-SEC-2026-08"],
  ["APR-RETENTION", "Retention, recovery and legal hold", "Legal / Records Management", "MOCK-RET-2026-08"],
  ["APR-A11Y", "Accessibility conformance review", "Accessibility Lead", "MOCK-A11Y-2026-08"],
  ["APR-UAT", "30-scenario business UAT rehearsal", "Salesforce COE Product Owner", "MOCK-UAT-30-OF-30"],
  ["APR-CUTOVER", "Cutover, rollback and recovery rehearsal", "Release Management", "MOCK-CUTOVER-2026-08"],
];

fs.mkdirSync(contractRoot, { recursive: true });
fs.writeFileSync(path.join(contractRoot, "resource360-governance-register.json"), `${JSON.stringify({
  schemaVersion: "1.0",
  decisionId: "R360-MOCK-ACTIVATION-2026-08-24",
  contractVersion: "R360-MOCK-1.2",
  evidenceBoundary: "Approved sanitized mock; EXL production activation is not asserted.",
  sourceContracts: sources.map((source) => ({
    id: source[0], label: source[1], entityType: source[2], authoritativeSource: source[3],
    stableIdentity: source[4], canonicalFields: source[5].split("|"), dataOwner: source[6],
    freshnessHours: source[7], blocking: source[8], dataClassification: source[9],
    endpointAlias: source[10], direction: source[11], approvalStatus: "Approved mock assumption",
  })),
  personas: personas.map((persona) => ({
    id: persona[0], businessRole: persona[1], permissionSetGroup: persona[2], entraGroupAlias: persona[3],
    scopeType: persona[4], decisionAuthority: persona[5], segregationClass: persona[6],
    delegationAllowed: persona[7], licenseAssumption: persona[8], controlOwner: persona[9],
    approvalStatus: "Approved mock assumption",
  })),
  retentionRules: retentionRules.map((rule) => ({
    id: rule[0], recordCategory: rule[1], retentionDays: rule[2], legalHoldEligible: rule[3],
    dispositionAction: rule[4], recoveryWindowDays: rule[5], controlOwner: rule[6],
    approvalStatus: "Approved mock assumption",
  })),
  demoActivationPillars: demoActivationPillars.map((pillar) => ({
    id: pillar[0], label: pillar[1], controlOwner: pillar[2], simulation: pillar[3],
    evidence: pillar[4], state: "Ready", mode: "Sanitized deterministic simulation",
    nonProductionBoundary: "No EXL credential, endpoint, identity, approval or production record is used.",
  })),
  demoApprovalEvidence: demoApprovalEvidence.map((approval) => ({
    id: approval[0], decision: approval[1], mockOwner: approval[2], evidenceReference: approval[3],
    decisionDate: "2026-08-24", status: "Approved mock assumption",
    nonProductionBoundary: "Fictional demonstration evidence; not an EXL approval.",
  })),
}, null, 2)}\n`);

console.log(`Generated ${sources.length} source contracts, ${personas.length} persona mappings, ${retentionRules.length} retention rules, ${demoActivationPillars.length} demo activation pillars and ${demoApprovalEvidence.length} mock approval decisions.`);
