import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const metadataRoot = path.join(root, "force-app/main/default");
const objectRoot = path.join(metadataRoot, "objects");

const xml = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const ensure = (directory) => fs.mkdirSync(directory, { recursive: true });
const write = (target, body) => {
  ensure(path.dirname(target));
  fs.writeFileSync(target, `${body.trim()}\n`);
};

const objectDefinitions = [
  {
    api: "R360_KPI_Snapshot__c",
    label: "KPI Snapshot",
    plural: "KPI Snapshots",
    description: "Effective-dated actual, forecast and target values for Resource 360 executive and operational metrics.",
    sharing: "Read",
    prefix: "KPI",
  },
  {
    api: "R360_Resource_Unavailability__c",
    label: "Resource Unavailability",
    plural: "Resource Unavailability",
    description: "Approved leave, training and other capacity-reducing windows used by staffing and forecasting.",
    sharing: "Private",
    prefix: "UNA",
  },
];

for (const object of objectDefinitions) {
  const directory = path.join(objectRoot, object.api);
  write(path.join(directory, `${object.api}.object-meta.xml`), `
<?xml version="1.0" encoding="UTF-8"?>
<CustomObject xmlns="http://soap.sforce.com/2006/04/metadata">
    <allowInChatterGroups>false</allowInChatterGroups>
    <deploymentStatus>Deployed</deploymentStatus>
    <description>${xml(object.description)}</description>
    <enableActivities>true</enableActivities>
    <enableBulkApi>true</enableBulkApi>
    <enableFeeds>false</enableFeeds>
    <enableHistory>true</enableHistory>
    <enableReports>true</enableReports>
    <enableSearch>true</enableSearch>
    <enableSharing>true</enableSharing>
    <enableStreamingApi>true</enableStreamingApi>
    <externalSharingModel>Private</externalSharingModel>
    <label>${object.label}</label>
    <nameField><displayFormat>${object.prefix}-{000000}</displayFormat><label>${object.label} Number</label><trackHistory>false</trackHistory><type>AutoNumber</type></nameField>
    <pluralLabel>${object.plural}</pluralLabel>
    <sharingModel>${object.sharing}</sharingModel>
    <visibility>Public</visibility>
</CustomObject>`);
}

const textField = (label, length, description, options = "") => `<description>${xml(description)}</description><label>${xml(label)}</label><length>${length}</length>${options}<trackHistory>false</trackHistory><type>Text</type>`;
const numberField = (label, precision, scale, description) => `<description>${xml(description)}</description><label>${xml(label)}</label><precision>${precision}</precision><scale>${scale}</scale><trackHistory>false</trackHistory><type>Number</type>`;
const percentField = (label, description) => `<description>${xml(description)}</description><label>${xml(label)}</label><precision>7</precision><scale>2</scale><trackHistory>false</trackHistory><type>Percent</type>`;
const currencyField = (label, description) => `<description>${xml(description)}</description><label>${xml(label)}</label><precision>18</precision><scale>2</scale><trackHistory>false</trackHistory><type>Currency</type>`;
const dateField = (label, description) => `<description>${xml(description)}</description><label>${xml(label)}</label><trackHistory>false</trackHistory><type>Date</type>`;
const dateTimeField = (label, description) => `<description>${xml(description)}</description><label>${xml(label)}</label><trackHistory>false</trackHistory><type>DateTime</type>`;
const checkboxField = (label, description) => `<defaultValue>false</defaultValue><description>${xml(description)}</description><label>${xml(label)}</label><trackHistory>false</trackHistory><type>Checkbox</type>`;
const longTextField = (label, description, length = 32768) => `<description>${xml(description)}</description><label>${xml(label)}</label><length>${length}</length><trackHistory>false</trackHistory><type>LongTextArea</type><visibleLines>3</visibleLines>`;
const picklistField = (label, description, values) => `<description>${xml(description)}</description><label>${xml(label)}</label><required>false</required><trackHistory>false</trackHistory><type>Picklist</type><valueSet><restricted>true</restricted><valueSetDefinition><sorted>false</sorted>${values.map((value) => `<value><fullName>${xml(value)}</fullName><default>false</default><label>${xml(value)}</label></value>`).join("")}</valueSetDefinition></valueSet>`;
const lookupField = (label, description, referenceTo, relationshipLabel, relationshipName) => `<deleteConstraint>SetNull</deleteConstraint><description>${xml(description)}</description><label>${xml(label)}</label><referenceTo>${referenceTo}</referenceTo><relationshipLabel>${xml(relationshipLabel)}</relationshipLabel><relationshipName>${relationshipName}</relationshipName><required>false</required><trackHistory>false</trackHistory><type>Lookup</type>`;
const formulaField = (label, description, returnType, formula, extra = "") => `<description>${xml(description)}</description><formula>${xml(formula)}</formula><formulaTreatBlanksAs>BlankAsZero</formulaTreatBlanksAs><label>${xml(label)}</label>${extra}<trackHistory>false</trackHistory><type>${returnType}</type>`;

const fields = {
  R360_KPI_Snapshot__c: {
    Snapshot_Key__c: textField("Snapshot Key", 100, "Stable idempotency key for one metric, scope and period.", "<externalId>true</externalId><required>true</required><unique>true</unique>"),
    Metric_Code__c: textField("Metric Code", 80, "Stable semantic code used by reports, APIs and Pages."),
    Metric_Label__c: textField("Metric Label", 120, "Business-facing metric label."),
    Snapshot_Date__c: dateField("Snapshot Date", "Actual or forecast period date represented by the snapshot."),
    Grain__c: picklistField("Grain", "Time grain of this value.", ["Daily", "Weekly", "Monthly", "Quarterly", "Forecast Week"]),
    Scope_Type__c: picklistField("Scope Type", "Business scope represented by this snapshot.", ["Enterprise", "Account", "Portfolio", "Sub-portfolio", "Engagement", "Resource", "Role", "Capability"]),
    Scope_Key__c: textField("Scope Key", 100, "Stable source key for the metric scope."),
    Scope_Label__c: textField("Scope Label", 120, "Human-readable scope label safe for operational reporting."),
    Numerator__c: numberField("Numerator", 18, 4, "Metric numerator retained for reconciliation."),
    Denominator__c: numberField("Denominator", 18, 4, "Metric denominator retained for reconciliation."),
    Metric_Value__c: numberField("Metric Value", 18, 4, "Certified calculated or seeded demo value."),
    Target_Value__c: numberField("Target Value", 18, 4, "Approved threshold or target in the same unit."),
    Unit__c: picklistField("Unit", "Display and semantic unit.", ["Percent", "Hours", "Days", "Currency", "Count", "Ratio", "Score", "Points"]),
    Status__c: picklistField("Status", "Target evaluation state.", ["On Target", "Watch", "At Risk", "Breached", "Informational"]),
    Forecast__c: checkboxField("Forecast", "True when the value represents an approved planning forecast rather than an actual."),
    Source_Cutoff__c: dateTimeField("Source Cutoff", "Latest source cutoff represented in the metric."),
    Definition__c: longTextField("Definition", "Certified calculation and population definition.", 1000),
    Owner_Role__c: textField("Owner Role", 80, "Business role accountable for reviewing and acting on the metric."),
    Policy_Version__c: textField("Policy Version", 80, "Effective metric or operating-policy version."),
    Portfolio__c: lookupField("Portfolio", "Optional portfolio scope.", "R360_Portfolio__c", "KPI Snapshots", "KPI_Snapshots"),
    Engagement__c: lookupField("Engagement", "Optional project scope.", "Engagement__c", "KPI Snapshots", "KPI_Snapshots"),
  },
  R360_Resource_Unavailability__c: {
    Unavailability_Key__c: textField("Unavailability Key", 100, "Stable idempotency key from the approved source.", "<externalId>true</externalId><required>true</required><unique>true</unique>"),
    Resource__c: lookupField("Resource", "Resource whose standard availability is reduced.", "Resource__c", "Unavailability", "Unavailability"),
    Type__c: picklistField("Type", "Capacity-reducing event type.", ["Leave", "PTO", "Training", "Holiday Override", "Medical", "Other"]),
    Start_Date__c: dateField("Start Date", "Inclusive effective start date."),
    End_Date__c: dateField("End Date", "Inclusive effective end date."),
    Hours_Per_Day__c: numberField("Hours per Day", 4, 2, "Daily hours removed from standard capacity during the window."),
    Status__c: picklistField("Status", "Governed event state.", ["Draft", "Submitted", "Approved", "Rejected", "Cancelled"]),
    Reason__c: longTextField("Reason", "Non-sensitive operational reason or source note.", 1000),
    Approved_By__c: lookupField("Approved By", "Attributable approving user.", "User", "Approved Unavailability", "Approved_Unavailability"),
    Approved_At__c: dateTimeField("Approved At", "Approval timestamp."),
    Source_System__c: textField("Source System", 80, "Approved mock or production system of record."),
    Source_Last_Sync__c: dateTimeField("Source Last Sync", "Latest source synchronization timestamp."),
  },
  Resource__c: {
    Expected_Roll_Off_Date__c: dateField("Expected Roll-Off Date", "Forecast date on which the current committed assignment is expected to release capacity."),
    Bench_Start_Date__c: dateField("Bench Start Date", "Date continuous available or bench capacity began."),
    Bench_Age_Days__c: formulaField("Bench Age Days", "Continuous bench age as of today.", "Number", "IF(ISBLANK(Bench_Start_Date__c), 0, TODAY() - Bench_Start_Date__c)", "<precision>8</precision><scale>0</scale>"),
    Preferred_Location__c: textField("Preferred Location", 80, "Practitioner project-location preference."),
    Preferred_Shift__c: textField("Preferred Shift", 80, "Practitioner working-window preference."),
    Travel_Preference__c: picklistField("Travel Preference", "Practitioner travel preference used as an advisory staffing factor.", ["No travel", "Up to 25%", "Up to 50%", "Flexible"]),
    Preferred_Project_Type__c: textField("Preferred Project Type", 120, "Preferred delivery or project archetype."),
    Preferred_Capability__c: textField("Preferred Capability", 120, "Preferred capability-development direction."),
    Consecutive_Overallocation_Days__c: numberField("Consecutive Overallocation Days", 5, 0, "Rolling count of consecutive days above standard capacity."),
    Rolling_Overage_Hours_13W__c: numberField("Rolling Overage Hours 13W", 10, 2, "Approved overage hours over the latest thirteen-week window."),
  },
  Allocation__c: {
    Cost_Rate_Snapshot__c: currencyField("Cost Rate Snapshot", "Governed cost rate frozen when the allocation version is published."),
    Billing_Rate_Snapshot__c: currencyField("Billing Rate Snapshot", "Governed billing rate frozen when the allocation version is published."),
    Concurrent_Project_Count__c: numberField("Concurrent Project Count", 3, 0, "Concurrent accepted project count in the effective period."),
    Context_Switch_Count__c: numberField("Context Switch Count", 3, 0, "Estimated weekly project context switches created by the plan."),
    Expected_Roll_Off_Date__c: dateField("Expected Roll-Off Date", "Forecast release date for this allocation segment."),
  },
  Staffing_Request__c: {
    Submitted_At__c: dateTimeField("Submitted At", "Timestamp at which the request entered the staffed decision queue."),
    Filled_At__c: dateTimeField("Filled At", "Timestamp at which a candidate was accepted."),
    Time_To_Fill_Hours__c: numberField("Time to Fill Hours", 10, 2, "Elapsed hours from governed submission to accepted staffing decision."),
    Shortlist_Count__c: numberField("Shortlist Count", 5, 0, "Candidates included in the decision shortlist."),
    Shortlist_Conversion_Percent__c: percentField("Shortlist Conversion Percent", "Accepted candidates divided by shortlisted candidates for this demand."),
  },
  Work_Unit__c: {
    Forecast_Start_Date__c: dateField("Forecast Start Date", "Current forecast start date."),
    Forecast_End_Date__c: dateField("Forecast End Date", "Current forecast end date."),
    Actual_Start_Date__c: dateField("Actual Start Date", "Actual delivery start date."),
    Actual_End_Date__c: dateField("Actual End Date", "Actual delivery completion date."),
    Milestone_Delay_Days__c: numberField("Milestone Delay Days", 6, 0, "Forecast or actual delay versus the approved baseline."),
    Forecast_Completion_Date__c: dateField("Forecast Completion Date", "Current expected completion date."),
    Planned_Value__c: currencyField("Planned Value", "Budgeted cost of work scheduled at the performance cutoff."),
    Earned_Value__c: currencyField("Earned Value", "Budgeted cost of work performed at the performance cutoff."),
    Actual_Cost__c: currencyField("Actual Cost", "Actual cost of work performed at the performance cutoff."),
    Estimate_To_Complete__c: currencyField("Estimate to Complete", "Forecast remaining project cost."),
    Estimate_At_Completion__c: currencyField("Estimate at Completion", "Forecast total project cost."),
    Schedule_Performance_Index__c: numberField("Schedule Performance Index", 8, 3, "Earned value divided by planned value."),
    Cost_Performance_Index__c: numberField("Cost Performance Index", 8, 3, "Earned value divided by actual cost."),
    Defect_Count__c: numberField("Defect Count", 8, 0, "Open and closed defects attributable to this work unit."),
    Test_Pass_Percent__c: percentField("Test Pass Percent", "Passed tests divided by executed tests."),
  },
  Budget__c: {
    Forecast_Revenue__c: currencyField("Forecast Revenue", "Latest forecast revenue through completion."),
    Forecast_Cost__c: currencyField("Forecast Cost", "Latest forecast cost through completion."),
    Forecast_Margin_Percent__c: percentField("Forecast Margin Percent", "Latest forecast gross margin percentage."),
    Margin_Erosion_Points__c: numberField("Margin Erosion Points", 7, 2, "Approved-budget margin less current forecast margin, in percentage points."),
    Estimate_To_Complete__c: currencyField("Estimate to Complete", "Forecast remaining cost."),
    Estimate_At_Completion__c: currencyField("Estimate at Completion", "Forecast total cost at project completion."),
    Forecast_Accuracy_Percent__c: percentField("Forecast Accuracy Percent", "Accuracy of prior-period forecast versus realized value."),
  },
  Contract_Payment__c: {
    Revenue_Recognized_Amount__c: currencyField("Revenue Recognized Amount", "Revenue recognized against the contract payment or milestone."),
    Write_Off_Amount__c: currencyField("Write-Off Amount", "Approved non-collectible or waived value."),
    Billing_Realization_Percent__c: percentField("Billing Realization Percent", "Recognized or collected value divided by planned billable value."),
    DSO_Days__c: numberField("DSO Days", 6, 0, "Days sales outstanding for this payment obligation."),
    Collection_Effectiveness_Percent__c: percentField("Collection Effectiveness Percent", "Paid amount divided by due and collectible invoiced value."),
  },
  Engagement__c: {
    Forecast_Completion_Date__c: dateField("Forecast Completion Date", "Current integrated forecast completion date."),
    Schedule_Variance_Days__c: numberField("Schedule Variance Days", 7, 0, "Forecast completion variance versus the approved baseline end date."),
    Acceptance_First_Pass_Percent__c: percentField("Acceptance First Pass Percent", "Deliverables accepted on first submission divided by all accepted deliverables."),
    CSAT_Score__c: numberField("CSAT Score", 5, 2, "Latest customer satisfaction score on a five-point scale."),
    NPS_Score__c: numberField("NPS Score", 5, 0, "Latest customer net promoter score."),
    Account_Health_Score__c: numberField("Account Health Score", 5, 2, "Composite commercial, delivery and relationship health score."),
    Release_Count__c: numberField("Release Count", 6, 0, "Completed production releases."),
    Incident_Count__c: numberField("Incident Count", 6, 0, "Delivery-related production incidents in the current period."),
    Mandatory_Skill_Coverage_Percent__c: percentField("Mandatory Skill Coverage Percent", "Filled mandatory skill demand divided by total mandatory skill demand."),
    Role_Readiness_Percent__c: percentField("Role Readiness Percent", "Required delivery roles with ready qualified supply divided by total required roles."),
    Risk_Exposure_Score__c: numberField("Risk Exposure Score", 10, 2, "Sum of current risk probability-impact exposure."),
    High_Risk_Age_Days__c: numberField("High Risk Age Days", 7, 0, "Age of the oldest unresolved high-severity risk."),
    Plan_Actual_Variance_Percent__c: percentField("Plan Actual Variance Percent", "Approved actual effort variance versus planned effort."),
  },
  Credential__c: {
    Days_To_Expiry__c: formulaField("Days to Expiry", "Calendar days remaining until credential expiry.", "Number", "IF(ISBLANK(Expiry_Date__c), NULL, Expiry_Date__c - TODAY())", "<precision>8</precision><scale>0</scale>"),
    Expiry_Risk_Band__c: picklistField("Expiry Risk Band", "Operational renewal risk bucket.", ["Expired", "0-30 days", "31-60 days", "61-90 days", "Beyond 90 days", "No expiry"]),
  },
  Skill_Claim__c: {
    Freshness_Days__c: numberField("Freshness Days", 7, 0, "Days since the capability was last used or revalidated."),
    Decay_Status__c: picklistField("Decay Status", "Capability freshness and decay classification.", ["Current", "Review Due", "Stale", "Revalidation Required"]),
  },
  Project_Risk__c: {
    Probability_Percent__c: percentField("Probability Percent", "Estimated likelihood of the risk materializing."),
    Impact_Score__c: numberField("Impact Score", 5, 2, "Standardized delivery or economic impact score."),
    Exposure_Score__c: numberField("Exposure Score", 10, 2, "Probability multiplied by impact."),
    Age_Days__c: numberField("Age Days", 7, 0, "Age of the open risk at the latest snapshot."),
    Mitigation_Overdue__c: checkboxField("Mitigation Overdue", "True when a mitigation action remains open beyond its due date."),
  },
  R360_Integration_Run__c: {
    Processing_Latency_Seconds__c: numberField("Processing Latency Seconds", 12, 2, "Elapsed processing latency for the governed run."),
    Identity_Match_Percent__c: percentField("Identity Match Percent", "Source rows matched to a stable Resource 360 identity."),
    Orphan_Record_Count__c: numberField("Orphan Record Count", 10, 0, "Rows without a valid parent or identity relationship."),
    Field_Completeness_Percent__c: percentField("Field Completeness Percent", "Required canonical fields populated across processed records."),
    Data_Quality_Score__c: percentField("Data Quality Score", "Composite completeness, uniqueness, validity and relationship score."),
    Retry_Count__c: numberField("Retry Count", 5, 0, "Technical retry attempts for the run."),
  },
  R360_Role_Scope__c: {
    Recertification_Due_Date__c: dateField("Recertification Due Date", "Next mandatory access recertification date."),
    SoD_Conflict__c: checkboxField("SoD Conflict", "True when the assignment conflicts with the approved segregation matrix."),
    SoD_Conflict_Detail__c: longTextField("SoD Conflict Detail", "Detected segregation conflict and required remediation.", 1000),
  },
};

for (const [objectName, definitions] of Object.entries(fields)) {
  const fieldsDirectory = path.join(objectRoot, objectName, "fields");
  for (const [apiName, body] of Object.entries(definitions)) {
    write(path.join(fieldsDirectory, `${apiName}.field-meta.xml`), `<?xml version="1.0" encoding="UTF-8"?>\n<CustomField xmlns="http://soap.sforce.com/2006/04/metadata"><fullName>${apiName}</fullName>${body}</CustomField>`);
  }
}

const tabs = [
  ["R360_KPI_Snapshot__c", "Custom66: Dice"],
  ["R360_Resource_Unavailability__c", "Custom15: People"],
];
for (const [apiName, motif] of tabs) {
  write(path.join(metadataRoot, "tabs", `${apiName}.tab-meta.xml`), `<?xml version="1.0" encoding="UTF-8"?>\n<CustomTab xmlns="http://soap.sforce.com/2006/04/metadata"><customObject>true</customObject><motif>${motif}</motif></CustomTab>`);
}

process.stdout.write(`Generated performance metadata for ${objectDefinitions.length} new objects and ${Object.values(fields).reduce((sum, value) => sum + Object.keys(value).length, 0)} governed fields.\n`);
