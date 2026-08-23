import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const classifications = [
  ["Billing", "Billing", true, false, false, 90, "Commercial owner review at engagement cadence"],
  ["Contractual_Shadow", "Contractual Shadow", false, true, true, 30, "SOW coverage and monthly Delivery review"],
  ["WAR", "WAR", false, true, false, 28, "Delivery Head week 4; Account Owner week 6; Operations week 8"],
  ["IFB_PO_Awaited", "IFB/PO Awaited", false, true, false, 14, "Delivery week 2; Account Owner week 4; Operations week 6"],
  ["Blocked", "Blocked", false, true, false, 14, "Delivery week 2; Account Owner week 4; Operations week 6"],
  ["Value_Consulting_Pre_sales", "Value Consulting/Pre-sales", false, true, false, 30, "Capability owner monthly review"],
  ["Shadow_Trainee", "Shadow Trainee", false, true, false, 30, "Reporting Manager monthly review"],
  ["Shadow_Lateral", "Shadow Lateral", false, true, false, 28, "Delivery week 4; Operations week 6"],
  ["Leadership_PMO", "Leadership/PMO", false, true, false, 30, "Delivery leadership monthly review"],
  ["Testing_COE", "Testing COE", false, true, false, 30, "COE owner monthly review"],
  ["DLP_COE", "DLP COE", false, true, false, 30, "COE owner monthly review"],
  ["Regression", "Regression", false, true, false, 30, "Delivery owner monthly review"],
  ["Training", "Training", false, true, false, 30, "Learning owner monthly review"],
  ["Investment_COE", "Investment/COE", false, true, false, 30, "Investment owner monthly review"],
  ["AFB", "AFB", false, true, false, 14, "Delivery and Operations review"],
  ["NAFB", "NAFB", false, true, false, 14, "Delivery and Operations review"]
];
const values = (field, value, type = "xsd:string") => `<values><field>${field}</field><value xsi:type="${type}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">${String(value).replaceAll("&", "&amp;")}</value></values>`;
const target = path.resolve("force-app/main/default/customMetadata");
await mkdir(target, { recursive: true });
for (const [developerName, label, billable, control, sow, days, escalation] of classifications) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?><CustomMetadata xmlns="http://soap.sforce.com/2006/04/metadata"><label>${label.replaceAll("&", "&amp;")}</label><protected>false</protected>${values("Classification_Value__c", label)}${values("Active__c", true, "xsd:boolean")}${values("Billable__c", billable, "xsd:boolean")}${values("Requires_Control__c", control, "xsd:boolean")}${values("Requires_SOW__c", sow, "xsd:boolean")}${values("Default_Review_Days__c", days, "xsd:double")}${values("Escalation_Policy__c", escalation)}</CustomMetadata>\n`;
  await writeFile(path.join(target, `R360_Classification.${developerName}.md-meta.xml`), xml);
}
console.log(`Generated ${classifications.length} governed classification records.`);
