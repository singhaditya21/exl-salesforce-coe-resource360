import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const metadataRoot = path.join(root, "force-app/main/default");
const objectRoot = path.join(metadataRoot, "objects");
const permissionRoot = path.join(metadataRoot, "permissionsets");
const groupRoot = path.join(metadataRoot, "permissionsetgroups");
fs.mkdirSync(permissionRoot, { recursive: true });
fs.mkdirSync(groupRoot, { recursive: true });

const allObjects = fs.readdirSync(objectRoot).filter((name) => name.endsWith("__c") && fs.existsSync(path.join(objectRoot, name, `${name}.object-meta.xml`))).sort();
const fieldsFor = (objectName) => {
  const fieldsDir = path.join(objectRoot, objectName, "fields");
  if (!fs.existsSync(fieldsDir)) return [];
  return fs.readdirSync(fieldsDir).filter((name) => name.endsWith(".field-meta.xml")).sort().map((file) => {
    const xml = fs.readFileSync(path.join(fieldsDir, file), "utf8");
    return {
      name: file.replace(".field-meta.xml", ""),
      editable: !xml.includes("<type>Formula</type>") && !xml.includes("<type>RollUpSummary</type>"),
      permissionable: !xml.includes("<required>true</required>") && !xml.includes("<type>MasterDetail</type>")
    };
  });
};

// Runtime configuration drives every workspace payload. Base users need object
// and field describe/read access so the system-mode policy resolver can safely
// expose its curated public snapshot. Private OWD and the absence of explicit
// configuration shares still prevent direct access to governed version records.
const businessObjects = allObjects.filter((name) => !["R360_Audit_Event__c", "R360_Integration_Run__c", "R360_Integration_Error__c", "R360_Outbox_Event__c", "R360_Approval_Decision__c", "R360_Role_Scope__c"].includes(name));
const permissions = (read, create = false, edit = false, remove = false, viewAll = false, modifyAll = false) => ({ read, create, edit, remove, viewAll, modifyAll });
const readOnly = Object.fromEntries(businessObjects.map((name) => [name, permissions(true)]));

const roleConfigs = [
  {
    name: "Resource360_Base_User", label: "Resource 360 Base User", description: "Least-privilege read access to Resource 360 operational business data and the Lightning workspace.",
    objects: readOnly, classes: ["Resource360Service", "Resource360TalentService", "Resource360PlanningService", "Resource360AssuranceService", "Resource360GovernanceService", "Resource360RoleScopeService"], customPermissions: ["Resource360_Access"], editable: {}
  },
  {
    name: "Resource360_Practitioner_Actions", label: "Resource 360 Practitioner Actions", description: "Self-service capability, credential and weekly-time commands; record scope remains server enforced.",
    objects: { Skill_Claim__c: permissions(true, true, true), Credential__c: permissions(true, true, true), Timesheet__c: permissions(true, true, true), Time_Entry__c: permissions(true, true, true) }, classes: ["Resource360Service", "Resource360TalentService"], customPermissions: [],
    editable: {
      Skill_Claim__c: ["Resource__c","Capability__c","Requested_Level__c","Years_Experience__c","Last_Used__c","Evidence__c","State__c","Submitted_At__c","Idempotency_Key__c","Request_Fingerprint__c"],
      Credential__c: ["Resource__c","Credential_ID__c","Credential_Name__c","Issuer__c","Issue_Date__c","Expiry_Date__c","Evidence_URL__c","State__c"],
      Timesheet__c: ["Resource__c","Week_Start__c","Week_Key__c","Status__c","Due_At__c","Version__c","Current__c","Correction_Parent__c","Correction_Requested_By__c","Dual_Control_Required__c","Approval_Step__c","Required_Approval_Role__c","Decision_Note__c"],
      Time_Entry__c: ["Timesheet__c","Allocation__c","Engagement__c","Work_Unit__c","Work_Date__c","Hours__c","Role__c","State__c","Comment__c","Entry_Key__c","Version__c","Correction_Parent__c","Correction_Reason__c"]
    }
  },
  {
    name: "Resource360_Project_Manager_Actions", label: "Resource 360 Project Manager Actions", description: "Create governed staffing demand and manage engagement working records within sharing scope.",
    objects: { Staffing_Request__c: permissions(true, true, false), Budget__c: permissions(true, true, true), Budget_Line__c: permissions(true, true, true), Engagement__c: permissions(true), Allocation__c: permissions(true) }, classes: ["Resource360Service", "Resource360TalentService", "Resource360PlanningService", "Resource360BudgetImportService"], customPermissions: ["Resource360_Manage_Budgets"],
    editable: { Staffing_Request__c: ["Engagement__c","Resource__c","Requested_Role__c","Classification__c","Start_Date__c","End_Date__c","Daily_Hours__c","Priority__c","State__c","Requester__c","SLA_Due__c","Requirement_Summary__c","Request_Version__c","Idempotency_Key__c","Request_Fingerprint__c","Responsible_Owner__c","Review_Date__c","Control_Reason__c","Source_Criteria__c","Budget_Signature__c"], Budget__c: "ALL", Budget_Line__c: "ALL" }
  },
  {
    name: "Resource360_Manager_Actions", label: "Resource 360 Manager Actions", description: "Review skill claims and timesheets only within manager/delegated scope.",
    objects: { Skill_Claim__c: permissions(true, false, true), Timesheet__c: permissions(true, false, true), Time_Entry__c: permissions(true, false, true), R360_Role_Scope__c: permissions(true), R360_Approval_Decision__c: permissions(true, true, true) }, classes: ["Resource360Service", "Resource360TalentService"], customPermissions: ["Resource360_Review_Skills","Resource360_Approve_Timesheets"],
    editable: { Skill_Claim__c: ["State__c","Approved_Level__c","Reviewer__c","Decision_At__c","Decision_Note__c"], Timesheet__c: ["Status__c","Approver__c","Decision_At__c","Decision_Note__c","Approval_Step__c","Required_Approval_Role__c"], Time_Entry__c: ["State__c"], R360_Approval_Decision__c: ["Decision_ID__c","Entity_Type__c","Entity_ID__c","Entity_Version__c","Step_Number__c","Required_Role__c","State__c","Approver__c","Decided_At__c","Decision_Note__c","Correlation_ID__c"] }
  },
  {
    name: "Resource360_Timesheet_Approver_Actions", label: "Resource 360 Timesheet Approver Actions", description: "Approve or reject timesheets and controlled correction stages without capability-review authority.",
    objects: { Timesheet__c: permissions(true, false, true), Time_Entry__c: permissions(true, false, true), R360_Role_Scope__c: permissions(true), R360_Approval_Decision__c: permissions(true, true, true) }, classes: ["Resource360Service"], customPermissions: ["Resource360_Approve_Timesheets"],
    editable: { Timesheet__c: ["Status__c","Approver__c","Decision_At__c","Decision_Note__c","Approval_Step__c","Required_Approval_Role__c"], Time_Entry__c: ["State__c"], R360_Approval_Decision__c: ["Decision_ID__c","Entity_Type__c","Entity_ID__c","Entity_Version__c","Step_Number__c","Required_Role__c","State__c","Approver__c","Decided_At__c","Decision_Note__c","Correlation_ID__c"] }
  },
  {
    name: "Resource360_Staffer_Actions", label: "Resource 360 Staffer Actions", description: "Decide staffing and maintain effective-dated allocations within authorized scope.",
    objects: { Staffing_Request__c: permissions(true, true, true), Allocation__c: permissions(true, true, true), R360_Role_Scope__c: permissions(true), Budget__c: permissions(true), Commercial_Reference__c: permissions(true) }, classes: ["Resource360Service", "Resource360TalentService", "Resource360PlanningService"], customPermissions: ["Resource360_Manage_Staffing"],
    editable: { Staffing_Request__c: "ALL", Allocation__c: "ALL" }
  },
  {
    name: "Resource360_Controlled_Override", label: "Resource 360 Controlled Override", description: "Separately assigned authority for attributable past-date allocation and post-deadline time operations; never included in a default business-role group.",
    objects: { Staffing_Request__c: permissions(true, false, true), Allocation__c: permissions(true, false, true), Timesheet__c: permissions(true, false, true), Time_Entry__c: permissions(true, false, true) }, classes: ["Resource360Service", "Resource360PlanningService"], customPermissions: ["Resource360_Override_Past_Dates","Resource360_Override_Time_Deadline"],
    editable: { Staffing_Request__c: ["Control_Reason__c"], Allocation__c: ["Control_Reason__c"], Timesheet__c: ["Decision_Note__c"], Time_Entry__c: ["Correction_Reason__c"] }
  },
  {
    name: "Resource360_Budget_Approver_Actions", label: "Resource 360 Budget Approver Actions", description: "Create budget versions and decide current signed approval steps within role scope.",
    objects: { Budget__c: permissions(true, true, true), Budget_Line__c: permissions(true, true, true), Commercial_Reference__c: permissions(true), R360_Approval_Decision__c: permissions(true, true, true), R360_Role_Scope__c: permissions(true) }, classes: ["Resource360Service","Resource360BudgetImportService"], customPermissions: ["Resource360_Approve_Budgets","Resource360_Manage_Budgets"],
    editable: { Budget__c: "ALL", Budget_Line__c: "ALL", R360_Approval_Decision__c: ["Decision_ID__c","Entity_Type__c","Entity_ID__c","Entity_Version__c","Step_Number__c","Required_Role__c","State__c","Approver__c","Decided_At__c","Decision_Note__c","Economic_Signature__c","Correlation_ID__c"] }
  },
  {
    name: "Resource360_Finance_PMO_Actions", label: "Resource 360 Finance PMO Actions", description: "Review economics, reconcile commercial context and execute only assigned budget decisions within effective scope.",
    objects: { Budget__c: permissions(true, false, true), Budget_Line__c: permissions(true), Commercial_Reference__c: permissions(true), R360_Approval_Decision__c: permissions(true, true, true), R360_Role_Scope__c: permissions(true) }, classes: ["Resource360Service","Resource360AssuranceService"], customPermissions: ["Resource360_Approve_Budgets"],
    editable: { Budget__c: ["State__c","Approval_Level__c","Approval_Step__c","Approver__c","Approved_At__c","Decision_Note__c"], R360_Approval_Decision__c: ["Decision_ID__c","Entity_Type__c","Entity_ID__c","Entity_Version__c","Step_Number__c","Required_Role__c","State__c","Approver__c","Decided_At__c","Decision_Note__c","Economic_Signature__c","Correlation_ID__c"] }
  },
  {
    name: "Resource360_Portfolio_Control_Actions", label: "Resource 360 Portfolio Control Actions", description: "Read portfolio commercial and delivery controls and close attributable alerts within scope.",
    objects: { Budget__c: permissions(true), Budget_Line__c: permissions(true), Commercial_Reference__c: permissions(true), Staffing_Request__c: permissions(true), Allocation__c: permissions(true), R360_Notification__c: permissions(true, false, true), R360_Role_Scope__c: permissions(true) }, classes: ["Resource360Service","Resource360AssuranceService"], customPermissions: [],
    editable: { R360_Notification__c: ["Resolution_Status__c","Accountable_Owner__c","First_Seen_At__c","Closed_At__c","Closed_By__c","Closure_Note__c"] }
  },
  {
    name: "Resource360_Capability_Admin_Actions", label: "Resource 360 Capability Administrator", description: "Govern capability taxonomy, evidence, learning and credential verification.",
    objects: { Capability__c: permissions(true, true, true), Skill_Claim__c: permissions(true, false, true), Credential__c: permissions(true, true, true), R360_Project_Evidence__c: permissions(true, true, true), R360_Learning_Achievement__c: permissions(true, true, true), R360_Role_Scope__c: permissions(true) }, classes: ["Resource360Service", "Resource360TalentService"], customPermissions: ["Resource360_Review_Skills","Resource360_Manage_Credentials"],
    editable: { Capability__c: "ALL", Skill_Claim__c: "ALL", Credential__c: "ALL", R360_Project_Evidence__c: "ALL", R360_Learning_Achievement__c: "ALL" }
  },
  {
    name: "Resource360_Configuration_Operator_Actions", label: "Resource 360 Configuration Operator", description: "Draft, preview and submit configuration without integration-operation or approval authority.",
    objects: { R360_Configuration__c: permissions(true, true, true), R360_Audit_Event__c: permissions(true), R360_Approval_Decision__c: permissions(true), R360_Work_Calendar__c: permissions(true), R360_Calendar_Exception__c: permissions(true) },
    classes: ["Resource360Service","Resource360ConfigurationService","Resource360GovernanceService"], customPermissions: ["Resource360_Manage_Configuration","Resource360_View_Audit"], editable: { R360_Configuration__c: "ALL" }
  },
  {
    name: "Resource360_Operations", label: "Resource 360 Operations", description: "Operate integrations, reconciliation, schedules and outbox recovery without business or configuration approval authority.",
    objects: { R360_Configuration__c: permissions(true), R360_Integration_Run__c: permissions(true, true, true), R360_Integration_Error__c: permissions(true, true, true), R360_Outbox_Event__c: permissions(true, true, true), R360_Audit_Event__c: permissions(true, true, false), R360_Approval_Decision__c: permissions(true), R360_Role_Scope__c: permissions(true, true, true), R360_Work_Calendar__c: permissions(true, true, true), R360_Calendar_Exception__c: permissions(true, true, true), R360_Org_Unit__c: permissions(true, true, true), R360_Portfolio__c: permissions(true, true, true), R360_Notification__c: permissions(true, false, true) },
    classes: ["Resource360Service","Resource360AssuranceService","Resource360BulkService","Resource360GovernanceService","Resource360RoleScopeService","Resource360InboundApi","Resource360OperationsScheduler","Resource360OutboxPublisher","Resource360NotificationDispatcher"], customPermissions: ["Resource360_View_Operations","Resource360_Manage_Integrations","Resource360_Manage_Bulk_Operations","Resource360_View_Audit","Resource360_Run_Reconciliation"],
    editable: { R360_Integration_Run__c: "ALL", R360_Integration_Error__c: "ALL", R360_Outbox_Event__c: "ALL", R360_Role_Scope__c: "ALL", R360_Work_Calendar__c: "ALL", R360_Calendar_Exception__c: "ALL", R360_Org_Unit__c: "ALL", R360_Portfolio__c: "ALL", R360_Notification__c: ["Resolution_Status__c","Accountable_Owner__c","First_Seen_At__c","Closed_At__c","Closed_By__c","Closure_Note__c"] }
  },
  {
    name: "Resource360_Configuration_Approver_Actions", label: "Resource 360 Configuration Approver", description: "Review, activate, schedule and roll back validated configuration versions without integration-operation authority.",
    objects: { R360_Configuration__c: permissions(true, false, true), R360_Audit_Event__c: permissions(true), R360_Approval_Decision__c: permissions(true), R360_Work_Calendar__c: permissions(true), R360_Calendar_Exception__c: permissions(true) },
    classes: ["Resource360Service","Resource360ConfigurationService"], customPermissions: ["Resource360_Approve_Configuration","Resource360_View_Audit"], editable: { R360_Configuration__c: ["State__c","Current__c","Effective_To__c","Approved_By__c","Approved_At__c","Change_Reason__c"] }
  },
  {
    name: "Resource360_Auditor", label: "Resource 360 Auditor", description: "Read-only audit, decision, policy and integration evidence.",
    objects: { R360_Audit_Event__c: permissions(true), R360_Approval_Decision__c: permissions(true), R360_Configuration__c: permissions(true), R360_Integration_Run__c: permissions(true), R360_Integration_Error__c: permissions(true), R360_Outbox_Event__c: permissions(true), R360_Role_Scope__c: permissions(true) }, classes: ["Resource360Service","Resource360ConfigurationService"], customPermissions: ["Resource360_View_Audit","Resource360_View_Operations"], editable: {}
  },
  {
    name: "Resource360_Executive_Viewer_Actions", label: "Resource 360 Executive Viewer", description: "Read-only organization-level KPI, portfolio, economics, staffing and assurance context.",
    objects: { R360_Portfolio__c: permissions(true), Engagement__c: permissions(true), Budget__c: permissions(true), Budget_Line__c: permissions(true), Staffing_Request__c: permissions(true), Allocation__c: permissions(true), R360_Notification__c: permissions(true), R360_Role_Scope__c: permissions(true) }, classes: ["Resource360Service","Resource360AssuranceService","Resource360GovernanceService"], customPermissions: [], editable: {}
  }
];

const objectBlock = (name, p) => `    <objectPermissions><allowCreate>${p.create}</allowCreate><allowDelete>${p.remove}</allowDelete><allowEdit>${p.edit}</allowEdit><allowRead>${p.read}</allowRead><modifyAllRecords>${p.modifyAll}</modifyAllRecords><object>${name}</object><viewAllRecords>${p.viewAll}</viewAllRecords></objectPermissions>`;
const fieldBlocks = (config) => {
  const blocks = [];
  for (const [objectName, p] of Object.entries(config.objects)) {
    if (!p.read) continue;
    const editableConfig = config.editable?.[objectName];
    for (const field of fieldsFor(objectName).filter((item) => item.permissionable)) {
      const editable = Boolean(p.edit && field.editable && (editableConfig === "ALL" || editableConfig?.includes(field.name)));
      blocks.push(`    <fieldPermissions><editable>${editable}</editable><field>${objectName}.${field.name}</field><readable>true</readable></fieldPermissions>`);
    }
  }
  return blocks;
};

const writePermissionSet = (config) => {
  const lines = ['<?xml version="1.0" encoding="UTF-8"?>','<PermissionSet xmlns="http://soap.sforce.com/2006/04/metadata">',`    <description>${config.description}</description>`,'    <hasActivationRequired>false</hasActivationRequired>',`    <label>${config.label}</label>`];
  if (config.name === "Resource360_Base_User" || config.name === "Resource360_Administrator") {
    lines.push('    <applicationVisibilities><application>Resource360</application><visible>true</visible></applicationVisibilities>');
    lines.push('    <tabSettings><tab>Resource360_Workspace</tab><visibility>Visible</visibility></tabSettings>');
    for (const permission of ["LightningExperienceUser", "RunReports", "ViewPublicDashboards", "ViewPublicReports"]) {
      lines.push(`    <userPermissions><enabled>true</enabled><name>${permission}</name></userPermissions>`);
    }
  }
  for (const className of [...new Set(config.classes)].sort()) lines.push(`    <classAccesses><apexClass>${className}</apexClass><enabled>true</enabled></classAccesses>`);
  if (config.name === "Resource360_Base_User" || config.name === "Resource360_Administrator") {
    for (const metadataType of ["R360_Classification__mdt","R360_Delivery_Role__mdt","R360_Persona__mdt","R360_Policy__mdt","R360_Retention_Rule__mdt","R360_Source_Contract__mdt"]) lines.push(`    <customMetadataTypeAccesses><enabled>true</enabled><name>${metadataType}</name></customMetadataTypeAccesses>`);
  }
  for (const permission of [...new Set(config.customPermissions)].sort()) lines.push(`    <customPermissions><enabled>true</enabled><name>${permission}</name></customPermissions>`);
  lines.push(...fieldBlocks(config));
  for (const [objectName, p] of Object.entries(config.objects).sort(([a],[b]) => a.localeCompare(b))) lines.push(objectBlock(objectName,p));
  lines.push('</PermissionSet>','');
  fs.writeFileSync(path.join(permissionRoot, `${config.name}.permissionset-meta.xml`), lines.join('\n'));
};
for (const config of roleConfigs) writePermissionSet(config);

const adminObjects = Object.fromEntries(allObjects.map((name) => [name, name === "R360_Audit_Event__c" ? permissions(true,true,false,false,true,false) : permissions(true,true,true,true,true,true)]));
writePermissionSet({ name: "Resource360_Administrator", label: "Resource 360 Administrator", description: "Full Resource 360 administration. Audit deletion/update remains blocked by immutable triggers.", objects: adminObjects, classes: fs.readdirSync(path.join(metadataRoot,"classes")).filter((name)=>name.endsWith(".cls")&&!name.endsWith("Test.cls")).map((name)=>name.replace(".cls","")), customPermissions: fs.readdirSync(path.join(metadataRoot,"customPermissions")).map((name)=>name.replace(".customPermission-meta.xml","")), editable: Object.fromEntries(allObjects.map((name)=>[name,"ALL"])) });

const groups = {
  Resource360_Practitioner: ["Resource360_Base_User","Resource360_Practitioner_Actions"],
  Resource360_Project_Manager: ["Resource360_Base_User","Resource360_Project_Manager_Actions"],
  Resource360_Reporting_Manager: ["Resource360_Base_User","Resource360_Manager_Actions"],
  Resource360_COE_Staffer: ["Resource360_Base_User","Resource360_Staffer_Actions"],
  Resource360_Budget_Approver: ["Resource360_Base_User","Resource360_Budget_Approver_Actions"],
  Resource360_Capability_Administrator: ["Resource360_Base_User","Resource360_Capability_Admin_Actions"],
  Resource360_Operations_User: ["Resource360_Base_User","Resource360_Operations"],
  Resource360_Audit_User: ["Resource360_Base_User","Resource360_Auditor"],
  Resource360_Configuration_Operator: ["Resource360_Base_User","Resource360_Configuration_Operator_Actions"],
  Resource360_Configuration_Approver: ["Resource360_Base_User","Resource360_Configuration_Approver_Actions"],
  Resource360_Portfolio_Lead: ["Resource360_Base_User","Resource360_Budget_Approver_Actions"],
  Resource360_Account_Owner: ["Resource360_Base_User","Resource360_Portfolio_Control_Actions"],
  Resource360_Head_of_Delivery: ["Resource360_Base_User","Resource360_Budget_Approver_Actions"],
  Resource360_GM_COO_Delegate: ["Resource360_Base_User","Resource360_Budget_Approver_Actions"],
  Resource360_Finance_PMO: ["Resource360_Base_User","Resource360_Finance_PMO_Actions"],
  Resource360_Timesheet_Approver: ["Resource360_Base_User","Resource360_Timesheet_Approver_Actions"],
  Resource360_Executive_Viewer: ["Resource360_Base_User","Resource360_Executive_Viewer_Actions"]
};
const obsoleteConfigurationGroup=path.join(groupRoot,"Resource360_Configuration_Control.permissionsetgroup-meta.xml");if(fs.existsSync(obsoleteConfigurationGroup))fs.unlinkSync(obsoleteConfigurationGroup);
for(const obsolete of ["Resource360_Configuration_Operator.permissionset-meta.xml","Resource360_Configuration_Approver.permissionset-meta.xml"]){const target=path.join(permissionRoot,obsolete);if(fs.existsSync(target))fs.unlinkSync(target);}
for (const [name, sets] of Object.entries(groups)) {
  const label = name.replaceAll("_", " ");
  const xml = ['<?xml version="1.0" encoding="UTF-8"?>','<PermissionSetGroup xmlns="http://soap.sforce.com/2006/04/metadata">',`    <description>Composed least-privilege access for ${label}.</description>`,`    <label>${label}</label>`,...sets.map((set)=>`    <permissionSets>${set}</permissionSets>`),'</PermissionSetGroup>',''].join('\n');
  fs.writeFileSync(path.join(groupRoot, `${name}.permissionsetgroup-meta.xml`), xml);
}

process.stdout.write(`Generated ${roleConfigs.length + 1} permission sets and ${Object.keys(groups).length} permission-set groups for ${allObjects.length} objects.\n`);
