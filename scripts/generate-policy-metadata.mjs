import fs from "node:fs";
import path from "node:path";

const root=path.join(process.cwd(),"force-app/main/default/customMetadata");
const policies=[
  ["Policy_Version","Policy Version","text","R360-POLICY-2.0","Visible active policy version captured on governed decisions."],
  ["Default_Daily_Capacity","Default Daily Capacity","number",8,"Fallback business-day capacity when no employee calendar overrides it."],
  ["Capacity_Max_Range_Days","Capacity Maximum Range Days","number",1100,"Maximum server-side capacity validation range."],
  ["Planning_Preview_Max_Days","Planning Preview Maximum Days","number",366,"Maximum interactive planning preview range."],
  ["Planning_Effort_Modes","Planning Effort Modes","text","Daily Hours|Allocation Percent|Total Hours","Available normalized effort-entry modes."],
  ["Staffing_Expiry_Hours","Staffing Expiry Hours","number",72,"Pending staffing request decision SLA."],
  ["People_Freshness_Warn_Hours","People Freshness Warning Hours","number",8,"Age at which People Master data is shown as stale."],
  ["People_Freshness_Block_Hours","People Freshness Blocking Hours","number",24,"Maximum People Master age allowed for staffing acceptance."],
  ["Engagement_Freshness_Block_Hours","Engagement Freshness Blocking Hours","number",4,"Maximum Engagement Master age allowed for a staffing request or acceptance."],
  ["Commercial_Freshness_Block_Hours","Commercial Freshness Blocking Hours","number",24,"Maximum Commercial Master age allowed for budget submission."],
  ["Learning_Freshness_Warn_Hours","Learning Freshness Warning Hours","number",48,"Age at which learning-only evidence is shown as stale."],
  ["Learning_Freshness_Disable_Hours","Learning Freshness Disable Hours","number",168,"Age at which learning-only evidence is excluded from governed matching."],
  ["Budget_Auto_Approve_Margin","Budget Auto Approve Margin","number",30,"Margin at or above this value is auto-approved."],
  ["Budget_HOD_Margin","Budget HOD Margin","number",25,"Margins below this value require HOD approval after Portfolio Manager."],
  ["Budget_Executive_Margin","Budget Executive Margin","number",20,"Margins below this value require executive delegate approval."],
  ["Budget_Portfolio_Approver_Role","Budget Portfolio Approver Role","text","Portfolio Manager","Business role required for the first routed budget step."],
  ["Budget_HOD_Approver_Role","Budget HOD Approver Role","text","HOD","Business role required for the HOD budget step."],
  ["Budget_Executive_Approver_Role","Budget Executive Approver Role","text","GM/COO Delegate","Business role required for the executive budget step."],
  ["Budget_Phases","Budget Phases","text","Discover|Design|Build|Test|Deploy|Deliver","Governed budget phase values shown in the WBS editor."],
  ["Budget_Max_Months","Budget Maximum Months","number",36,"Maximum distinct monthly periods in one budget version."],
  ["Budget_Work_Units","Budget Work Units","text","Architecture|Delivery|Data Cloud Foundation|Integration|Quality Assurance|Release","Governed work-unit values shown in budget and time forms."],
  ["Budget_Standard_Monthly_Hours","Budget Standard Monthly Hours","number",160,"Standard monthly capacity used for budget roster allocation-percent conversions and assurance checks."],
  ["Delivery_Locations","Delivery Locations","text","India|Bengaluru|Pune|Hyderabad|Noida|Gurugram|Onsite","Governed delivery-location values used by planning and WBS."],
  ["Credential_Warning_Days","Credential Warning Days","number",90,"Days before credential expiry when maintenance alerts begin."],
  ["Skill_Max_Level","Skill Maximum Level","number",4,"Maximum configured proficiency level."],
  ["Skill_Max_Experience_Years","Skill Maximum Experience Years","number",50,"Maximum accepted experience value."],
  ["Talent_Default_Results","Talent Default Results","number",50,"Default candidate result limit."],
  ["Talent_Max_Results","Talent Maximum Results","number",100,"Maximum candidate result limit."],
  ["Talent_Default_Experience_Years","Talent Default Experience Years","number",10,"Experience denominator when no minimum is supplied."],
  ["Talent_Project_Recent_Days","Talent Project Recent Days","number",365,"Upper age boundary for fully recent project evidence."],
  ["Talent_Project_Mid_Days","Talent Project Mid Days","number",730,"Upper age boundary for mid-recency project evidence."],
  ["Talent_Project_Old_Days","Talent Project Old Days","number",1095,"Upper age boundary for older project evidence."],
  ["Talent_Project_Mid_Ratio","Talent Project Mid Ratio","number",0.75,"Recency ratio for mid-age project evidence."],
  ["Talent_Project_Old_Ratio","Talent Project Old Ratio","number",0.4,"Recency ratio for older project evidence."],
  ["Talent_Project_Stale_Ratio","Talent Project Stale Ratio","number",0.1,"Recency ratio for stale project evidence."],
  ["Talent_Project_Duration_Full_Days","Talent Project Full Duration Days","number",365,"Project duration that satisfies the duration dimension fully."],
  ["Talent_Weight_Capability","Talent Capability Weight","number",35,"Fit-score weight for approved capability proficiency."],
  ["Talent_Weight_Project","Talent Project Evidence Weight","number",20,"Fit-score weight for verified project evidence."],
  ["Talent_Weight_Industry","Talent Industry Weight","number",15,"Fit-score weight for industry experience."],
  ["Talent_Weight_Credential","Talent Credential Weight","number",10,"Fit-score weight for preferred verified credentials."],
  ["Talent_Weight_Experience","Talent Experience Weight","number",10,"Fit-score weight for relevant years of experience."],
  ["Talent_Weight_Availability","Talent Availability Weight","number",10,"Fit-score weight for allocation availability."],
  ["Timesheet_Submission_Business_Days","Timesheet Submission Business Days","number",2,"Business days after week end before employee time locks."],
  ["Timesheet_Submission_Hour","Timesheet Submission Local Hour","number",18,"Employee-calendar local hour for submission lock."],
  ["Timesheet_Decision_Days","Timesheet Decision Days","number",5,"Calendar days after submission before manager escalation."],
  ["Timesheet_Auto_Approve_Days","Timesheet Auto Approve Days","number",7,"Calendar days before exception-free automatic approval."],
  ["Timesheet_Correction_Business_Days","Timesheet Correction Business Days","number",2,"Business days allowed for a governed correction version."],
  ["Timesheet_Correction_Hour","Timesheet Correction Local Hour","number",18,"Employee-calendar local hour for correction lock."],
  ["Timesheet_Correction_Dual_Control","Timesheet Correction Dual Control","boolean",true,"Whether a corrected approved timesheet requires controlled approval."],
  ["Time_Correction_First_Approver_Role","Timesheet Correction First Approver","text","Reporting Manager","Business role required for the first correction decision."],
  ["Time_Correction_Second_Approver_Role","Timesheet Correction Second Approver","text","Timesheet Approver","Independent business role required for final correction approval."],
  ["Time_Max_Daily_Hours","Time Maximum Daily Hours","number",24,"Maximum absolute time-entry hours before calendar capacity is applied."],
  ["Bulk_Max_Rows","Bulk Maximum Rows","number",200,"Maximum interactive controlled-import rows."],
  ["Inbound_Max_Rows","Inbound Maximum Rows","number",200,"Maximum records in one inbound API contract request."],
  ["Integration_Error_Retry_Minutes","Integration Error Retry Minutes","number",5,"Initial retry delay for recoverable inbound row errors."],
  ["Source_Completeness_Threshold_Percent","Source Completeness Threshold Percent","number",95,"Minimum accepted completeness for a mock or production source reconciliation."],
  ["Outbox_Max_Attempts","Outbox Maximum Attempts","number",3,"Maximum durable-event publication attempts before dead letter."],
  ["Outbox_Retry_Minutes","Outbox Retry Minutes","text","1|5|30","Retry delay sequence in minutes for durable-event publication."],
  ["Operations_Schedule_Cron","Operations Schedule Cron","text","0 0 * * * ?","Salesforce cron expression for operational controls."],
  ["Audit_Retention_Days","Audit Retention Days","number",2555,"Mock-baseline retention period for immutable audit evidence; production legal policy must replace this assumption."],
  ["Business_History_Retention_Days","Business History Retention Days","number",2555,"Mock-baseline retention period for inactive business history."],
  ["Retention_Legal_Hold","Retention Legal Hold","boolean",false,"Prevents retention execution while an authorized legal hold is active."],
  ["Scenario_Max_Days","Scenario Maximum Days","number",730,"Maximum planning horizon for a saved what-if scenario."],
  ["Alert_Closure_Requires_Note","Alert Closure Requires Note","boolean",true,"Requires an accountable closure note while preserving the original alert trigger."],
  ["Escalation_WAR_Tiers","WAR Escalation Tiers","text",'[{"days":28,"role":"Delivery Head","severity":"High"},{"days":42,"role":"Account Owner","severity":"High"},{"days":56,"role":"Operations","severity":"Critical"}]',"Machine-readable WAR allocation escalation tiers."],
  ["Escalation_IFB_Blocked_Tiers","IFB and Blocked Escalation Tiers","text",'[{"days":14,"role":"Delivery Head","severity":"High"},{"days":28,"role":"Account Owner","severity":"High"},{"days":42,"role":"Operations","severity":"Critical"}]',"Machine-readable IFB/PO Awaited and Blocked allocation escalation tiers."],
  ["Escalation_Shadow_Lateral_Tiers","Shadow Lateral Escalation Tiers","text",'[{"days":28,"role":"Delivery Head","severity":"High"},{"days":42,"role":"Operations","severity":"Critical"}]',"Machine-readable Shadow Lateral allocation escalation tiers."],
  ["Escalation_Default_Tiers","Default Unbilled Escalation Tiers","text",'[{"days":30,"role":"Responsible Owner","severity":"High"}]',"Fallback machine-readable escalation tier for other controlled unbilled classifications."],
  ["KPI_Billed_Target_Percent","KPI Billed Target Percent","number",75,"Billed utilization planning target."],
  ["KPI_WAR_Max_Percent","KPI WAR Maximum Percent","number",10,"Maximum Workforce Awaiting Revenue planning target."],
  ["KPI_IFB_Max_Percent","KPI IFB Maximum Percent","number",2,"Maximum investment-for-business planning target."],
  ["KPI_Actuals_Window_Days","KPI Actuals Window Days","number",30,"Inclusive approved-actuals lookback used by Command Center metrics."],
  ["KPI_Staffing_Window_Days","KPI Staffing Window Days","number",90,"Staffing lifecycle lookback used by Command Center metrics."],
  ["Notification_Channels","Notification Channels","text","Salesforce|Email|Teams","Approved notification routes; channel activation remains environment controlled."]
];

const escape=(value)=>String(value).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
const typed=(type,value)=>{
  const xsi=type==="number"?"xsd:double":type==="boolean"?"xsd:boolean":"xsd:string";
  return `<value xsi:type="${xsi}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">${escape(value)}</value>`;
};
for(const [name,label,type,value,description] of policies){
  const valueField=type==="number"?"Numeric_Value__c":type==="boolean"?"Boolean_Value__c":"Text_Value__c";
  const xml=`<?xml version="1.0" encoding="UTF-8"?>\n<CustomMetadata xmlns="http://soap.sforce.com/2006/04/metadata"><label>${escape(label)}</label><protected>false</protected><values><field>Active__c</field>${typed("boolean",true)}</values><values><field>${valueField}</field>${typed(type,value)}</values><values><field>Description__c</field>${typed("text",description)}</values><values><field>Effective_From__c</field><value xsi:type="xsd:date" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">2025-01-01</value></values></CustomMetadata>\n`;
  fs.writeFileSync(path.join(root,`R360_Policy.${name}.md-meta.xml`),xml);
}
console.log(`Generated ${policies.length} governed policy defaults.`);
