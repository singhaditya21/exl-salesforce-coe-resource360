"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { canAccessScreen, defaultScreenId, modules, screenById, screens, type ModuleId, type ScreenSpec } from "./screen-data";
import { useDemoSystem, type DemoSystem } from "./demo-system";
import { AdminDemo, BudgetDemo, CommandDemo, DemoHome, EngagementDemo, NotificationDemo, RoleDemo, ScenarioDemo, SkillsDemo, StaffingPlanningDemo, TimesheetDemo } from "./operational-screens";
import {
  StaffingDecisionForm,
  StaffingQueue,
  StaffingRequestDetail,
  useStaffingWorkflow,
  type StaffingDecision,
  type StaffingRequest,
} from "./staffing-workflow";

type TableModel = { columns: string[]; rows: string[][] };
const initialSelectedRequestId = "SR-1842";

const people = [
  ["Aarav Mehta", "Data Cloud Architect", "Data & AI", "94%", "02 Sep", "Available"],
  ["Riya Sen", "Service Cloud Lead", "Service", "89%", "05 Sep", "72% allocated"],
  ["Kabir Rao", "MuleSoft Developer", "Integration", "86%", "10 Sep", "Available"],
  ["Meera Nair", "FSC Consultant", "Industry", "81%", "16 Sep", "Pending demand"],
  ["Vihaan Iyer", "Technical Architect", "Platform", "78%", "23 Sep", "55% allocated"],
];

const moduleStats: Record<ModuleId, { label: string; value: string; hint: string }[]> = {
  global: [
    { label: "Tasks due today", value: "8", hint: "3 approaching SLA" },
    { label: "Unread notifications", value: "14", hint: "5 decisions" },
    { label: "Active delegations", value: "2", hint: "1 ends Friday" },
    { label: "Source freshness", value: "99.7%", hint: "All critical feeds" },
  ],
  engagement: [
    { label: "Active engagements", value: "38", hint: "+4 this quarter" },
    { label: "Approved budgets", value: "31", hint: "5 in review" },
    { label: "Open staffing gaps", value: "42", hint: "12 urgent" },
    { label: "Forecast margin", value: "28.6%", hint: "+1.4 pts" },
  ],
  staffing: [
    { label: "Pending requests", value: "42", hint: "12 urgent" },
    { label: "Median decision time", value: "1.8d", hint: "Within 3d SLA" },
    { label: "Available in 30 days", value: "68", hint: "16 architects" },
    { label: "Capacity conflicts", value: "7", hint: "Needs arbitration" },
  ],
  skills: [
    { label: "Profile readiness", value: "91%", hint: "+6.2 pts" },
    { label: "Verified credentials", value: "1,284", hint: "43 due soon" },
    { label: "Pending reviews", value: "18", hint: "6 overdue" },
    { label: "Critical capability gaps", value: "7", hint: "90-day demand" },
  ],
  budget: [
    { label: "Planned revenue", value: "₹48.6Cr", hint: "FY26 portfolio" },
    { label: "Forecast margin", value: "28.6%", hint: "+1.4 pts" },
    { label: "Awaiting approval", value: "5", hint: "₹6.2Cr value" },
    { label: "At-risk plans", value: "3", hint: "Margin below 20%" },
  ],
  timesheet: [
    { label: "Compliance", value: "96.2%", hint: "+2.1 pts" },
    { label: "Hours this week", value: "42,680", hint: "91% approved" },
    { label: "Late submissions", value: "23", hint: "7 escalated" },
    { label: "Plan variance", value: "+2.8%", hint: "Within tolerance" },
  ],
  command: [
    { label: "Billed utilization", value: "78.4%", hint: "+2.8 pts" },
    { label: "Active headcount", value: "1,862", hint: "+34 this month" },
    { label: "Unbilled exposure", value: "₹1.2Cr", hint: "9 escalations" },
    { label: "Forecast margin", value: "28.6%", hint: "+1.4 pts" },
  ],
  admin: [
    { label: "Healthy integrations", value: "9/10", hint: "1 degraded" },
    { label: "Privileged roles", value: "26", hint: "Review due in 12d" },
    { label: "Open data exceptions", value: "31", hint: "4 blocking" },
    { label: "Policy versions", value: "18", hint: "2 future-dated" },
  ],
  ai: [
    { label: "Shadow recommendations", value: "186", hint: "Last 30 days" },
    { label: "Top-5 acceptance", value: "67%", hint: "+4.1 pts" },
    { label: "Recall @ 10", value: "88%", hint: "Above 85% gate" },
    { label: "Human checkpoints", value: "100%", hint: "No autonomous writes" },
  ],
};

function tableFor(screen: ScreenSpec): TableModel {
  if (screen.module === "engagement") return {
    columns: ["Engagement", "Account", "Owner", "Budget", "Staffing", "Margin", "Status"],
    rows: [
      ["Global Retail Cloud", "Northstar Retail", "Neha Gupta", "Approved · v4", "3 gaps", "31.2%", "Active"],
      ["Claims Modernization", "Contoso Insurance", "Arjun Shah", "In approval", "1 gap", "26.8%", "At risk"],
      ["Wealth 360", "Apex Wealth", "Farah Khan", "Approved · v2", "Fully staffed", "29.4%", "Active"],
      ["Integration Factory", "Fabrikam", "Rohit Das", "Draft · v3", "2 gaps", "24.9%", "Needs action"],
      ["Agentforce Launch", "Woodgrove Bank", "Isha Menon", "Approved · v1", "1 pending", "33.6%", "Active"],
    ],
  };
  if (screen.module === "skills") return {
    columns: ["Practitioner", "Role", "Primary capability", "Level", "Credentials", "Freshness", "Status"],
    rows: people.map((p, index) => [p[0], p[1], p[2], ["SME", "Advanced", "Advanced", "Intermediate", "SME"][index], ["5 verified", "4 verified", "3 verified", "2 verified", "6 verified"][index], ["12d", "28d", "7d", "94d", "21d"][index], index === 3 ? "Review due" : "Ready"]),
  };
  if (screen.module === "budget") return {
    columns: ["Engagement", "Version", "Revenue", "Total cost", "Margin", "Approval", "Updated"],
    rows: [
      ["Global Retail Cloud", "v4", "₹8.40Cr", "₹5.78Cr", "31.2%", "Approved", "18 Aug"],
      ["Claims Modernization", "v3", "₹6.90Cr", "₹5.05Cr", "26.8%", "HOD review", "21 Aug"],
      ["Wealth 360", "v2", "₹4.85Cr", "₹3.42Cr", "29.4%", "Approved", "16 Aug"],
      ["Integration Factory", "v3", "₹3.60Cr", "₹2.70Cr", "24.9%", "Draft", "22 Aug"],
      ["Agentforce Launch", "v1", "₹5.25Cr", "₹3.49Cr", "33.6%", "Approved", "12 Aug"],
    ],
  };
  if (screen.module === "timesheet") return {
    columns: ["Employee", "Week", "Submitted", "Approved", "Variance", "Manager", "Status"],
    rows: [
      ["Aarav Mehta", "17–23 Aug", "40h", "40h", "0h", "Pooja Nair", "Approved"],
      ["Riya Sen", "17–23 Aug", "42h", "—", "+2h", "Mohan Rao", "Submitted"],
      ["Kabir Rao", "17–23 Aug", "32h", "—", "−8h", "Sana Ali", "Incomplete"],
      ["Meera Nair", "17–23 Aug", "40h", "32h", "+8h", "Pooja Nair", "Exception"],
      ["Vihaan Iyer", "17–23 Aug", "40h", "40h", "0h", "Arjun Shah", "Auto-approved"],
    ],
  };
  if (screen.module === "admin") return {
    columns: ["Record", "Type", "Owner", "Last run / change", "Records", "Health", "Action"],
    rows: [
      ["EXL People Master", "Integration", "HR Data", "22 Aug · 12:00", "1,862", "Healthy", "View"],
      ["Engagement Master", "Integration", "PMO Data", "22 Aug · 12:12", "412", "Healthy", "View"],
      ["Credential Gateway", "Integration", "Capability", "22 Aug · 02:00", "1,284", "Degraded", "Retry"],
      ["Margin approval v3", "Policy", "Finance", "20 Aug · 16:42", "4 tiers", "Active", "Compare"],
      ["India standard calendar", "Calendar", "HR Operations", "01 Apr · 00:00", "18 holidays", "Active", "Edit"],
    ],
  };
  if (screen.module === "command") return {
    columns: ["Event", "Domain", "Owner", "Severity", "First seen", "Age", "State"],
    rows: [
      ["Credential feed partial", "Data quality", "Capability Ops", "Medium", "22 Aug · 02:08", "11h", "Acknowledged"],
      ["WAR threshold crossed", "Unbilled", "Delivery", "High", "21 Aug · 10:14", "1d", "Open"],
      ["Budget signature changed", "Commercial", "Finance", "High", "22 Aug · 09:32", "4h", "Assigned"],
      ["Timesheet variance >10%", "Actuals", "Project owner", "Medium", "22 Aug · 08:51", "5h", "Investigating"],
      ["Staffing SLA breached", "Staffing", "RMG pool", "High", "21 Aug · 14:10", "23h", "Open"],
    ],
  };
  if (screen.module === "global") return {
    columns: ["Notification", "Area", "Related record", "Received", "Priority", "Status"],
    rows: [
      ["Staffing decision due today", "Staffing", "SR-1842", "18m ago", "High", "Unread"],
      ["Budget approved", "Budget", "Global Retail Cloud · v4", "1h ago", "Normal", "Read"],
      ["Credential maintenance due", "Skills", "Data Cloud Consultant", "3h ago", "High", "Unread"],
      ["Timesheet submitted", "Timesheet", "Riya Sen · W34", "5h ago", "Normal", "Read"],
      ["People feed reconciled", "Operations", "RUN-82914", "7h ago", "Low", "Read"],
    ],
  };
  return {
    columns: ["Request", "Practitioner", "Role", "Engagement", "Dates", "Fit", "Status"],
    rows: [
      ["SR-1842", "Aarav Mehta", "Data Cloud Architect", "Global Retail Cloud", "02 Sep – 31 Mar", "94%", "Awaiting decision"],
      ["SR-1839", "Riya Sen", "Service Cloud Lead", "Claims Modernization", "05 Sep – 30 Nov", "89%", "Conflict"],
      ["SR-1834", "Kabir Rao", "MuleSoft Developer", "Integration Factory", "10 Sep – 28 Feb", "86%", "Awaiting decision"],
      ["SR-1828", "Meera Nair", "FSC Consultant", "Wealth 360", "16 Sep – 31 Dec", "81%", "Budget check"],
      ["SR-1821", "Vihaan Iyer", "Technical Architect", "Agentforce Launch", "23 Sep – 31 Mar", "78%", "Pending"],
    ],
  };
}

function Status({ children }: { children: string }) {
  const lower = children.toLowerCase();
  const tone = lower.includes("approved") || lower.includes("healthy") || lower.includes("ready") || lower.includes("available") || lower.includes("active") ? "good" : lower.includes("risk") || lower.includes("conflict") || lower.includes("exception") || lower.includes("degraded") || lower.includes("incomplete") ? "bad" : lower.includes("pending") || lower.includes("review") || lower.includes("action") || lower.includes("submitted") || lower.includes("unread") ? "warn" : "neutral";
  return <span className={`status-pill ${tone}`}><i />{children}</span>;
}

function StatCards({ module }: { module: ModuleId }) {
  return <section className="stat-grid">{moduleStats[module].map((item, index) => <article className="stat-card" key={item.label}><div><span>{item.label}</span><button aria-label={`More options for ${item.label}`}>•••</button></div><strong>{item.value}</strong><p><b>{index % 2 === 0 ? "↗" : "•"}</b> {item.hint}</p></article>)}</section>;
}

function ListCanvas({ screen }: { screen: ScreenSpec }) {
  const model = tableFor(screen);
  return <>
    <div className="filter-bar"><label className="inline-search"><span>⌕</span><input aria-label={`Search ${screen.title}`} placeholder={`Search ${screen.title.toLowerCase()}...`} /></label><button className="filter-button">Status <span>⌄</span></button><button className="filter-button">My scope <span>⌄</span></button><button className="filter-button">Date range <span>⌄</span></button><span className="filter-spacer" /><button className="view-button active" aria-label="Table view">▤</button><button className="view-button" aria-label="Card view">▦</button></div>
    <StatCards module={screen.module} />
    <section className="surface data-surface"><div className="surface-heading"><div><span className="section-kicker">Live workspace</span><h2>{screen.title}</h2></div><div className="table-actions"><button>Columns</button><button>Export</button><span>{model.rows.length} of {screen.module === "staffing" ? "42" : "186"}</span></div></div><div className="responsive-table"><table><thead><tr><th><input type="checkbox" aria-label="Select all" /></th>{model.columns.map((column) => <th key={column}>{column}</th>)}<th /></tr></thead><tbody>{model.rows.map((row, index) => <tr key={row.join("-")}><td><input type="checkbox" aria-label={`Select row ${index + 1}`} /></td>{row.map((cell, cellIndex) => <td key={`${cell}-${cellIndex}`}>{cellIndex === 0 ? <strong>{cell}</strong> : cellIndex === row.length - 1 ? <Status>{cell}</Status> : cell}</td>)}<td><button className="row-action">Open <span>→</span></button></td></tr>)}</tbody></table></div><div className="pagination"><span>Showing 1–5</span><div><button disabled>←</button><button className="active">1</button><button>2</button><button>3</button><button>→</button></div></div></section>
  </>;
}

function HomeCanvas({ module }: { module: ModuleId }) {
  const requests = tableFor({ module: "staffing" } as ScreenSpec).rows.slice(0, 4);
  return <>
    <section className="welcome-band"><div><span className="section-kicker">Saturday, 22 August</span><h2>Good morning, Maya.</h2><p>Here is what needs attention across the Salesforce COE today.</p></div><div className="readiness-ring"><span><strong>91%</strong><small>COE ready</small></span></div></section>
    <StatCards module={module} />
    <section className="home-grid"><article className="surface"><div className="surface-heading"><div><span className="section-kicker">Staffing control</span><h2>Priority requests</h2></div><button className="link-button">View all 42 →</button></div><div className="compact-list">{requests.map((row) => <button key={row[0]}><span className="record-icon">{row[1].split(" ").map((p) => p[0]).join("")}</span><span><strong>{row[2]}</strong><small>{row[3]} · {row[1]}</small></span><b>{row[5]}</b><Status>{row[6]}</Status><i>→</i></button>)}</div></article><aside className="surface"><div className="surface-heading"><div><span className="section-kicker">My work</span><h2>Needs attention</h2></div><span className="round-count">8</span></div><div className="task-list"><button><i className="orange">!</i><span><strong>3 staffing requests breach SLA</strong><small>Oldest request is 2d 18h</small></span><b>→</b></button><button><i className="blue">₹</i><span><strong>2 budgets awaiting approval</strong><small>₹1.8Cr planned revenue</small></span><b>→</b></button><button><i className="violet">◇</i><span><strong>18 profiles need review</strong><small>Data Cloud readiness cohort</small></span><b>→</b></button><button><i className="red">◷</i><span><strong>7 unbilled allocations aging</strong><small>3 crossed threshold</small></span><b>→</b></button></div></aside></section>
  </>;
}

function DetailCanvas({ screen }: { screen: ScreenSpec }) {
  const isPerson = screen.module === "skills" || screen.id === "STFUI-08";
  const title = isPerson ? "Aarav Mehta" : screen.module === "budget" ? "Global Retail Cloud · Budget v4" : screen.module === "timesheet" ? "Riya Sen · Week 34" : screen.module === "staffing" ? "SR-1842 · Data Cloud Architect" : "Global Retail Cloud";
  const subtitle = isPerson ? "Data Cloud Architect · Advanced · Bengaluru" : "Northstar Retail · Salesforce Data & AI · India";
  return <>
    <section className="record-banner"><div className={`record-avatar ${isPerson ? "person" : ""}`}>{isPerson ? "AM" : "GR"}</div><div className="record-title"><span>{screen.eyebrow}</span><h2>{title}</h2><p>{subtitle}</p></div><Status>{screen.id.includes("14") ? "Pending" : "Active"}</Status><div className="record-meta"><span>Source freshness<strong>12 minutes ago</strong></span><span>Owner<strong>{isPerson ? "Pooja Nair" : "Neha Gupta"}</strong></span><span>Scope<strong>India Salesforce COE</strong></span></div></section>
    <nav className="tab-strip" aria-label="Record sections"><button className="active">Overview</button><button>Details</button><button>{isPerson ? "Capabilities" : "Resources"}</button><button>{isPerson ? "Credentials" : "Budget"}</button><button>History</button></nav>
    <StatCards module={screen.module} />
    <section className="detail-grid"><article className="surface info-panel"><div className="surface-heading"><div><span className="section-kicker">Core information</span><h2>{screen.title}</h2></div><button className="link-button">Edit details</button></div><dl><div><dt>Identifier</dt><dd>{isPerson ? "EXL-018462" : screen.module === "staffing" ? "SR-1842" : "ENG-004291"}</dd></div><div><dt>Business status</dt><dd><Status>{screen.module === "budget" ? "Approved" : "Active"}</Status></dd></div><div><dt>Salesforce tower</dt><dd>Data & AI</dd></div><div><dt>Primary location</dt><dd>Bengaluru · IST</dd></div><div><dt>Effective period</dt><dd>02 Sep 2026 – 31 Mar 2027</dd></div><div><dt>Last governed review</dt><dd>18 Aug 2026 · Maya Patel</dd></div></dl><div className="annotation"><span>i</span><p><strong>Source-governed information</strong>Identity and commercial values are read-only and synchronized through the EXL master contracts.</p></div></article><aside className="surface timeline-panel"><div className="surface-heading"><div><span className="section-kicker">Decision history</span><h2>Recent activity</h2></div></div><ol className="timeline"><li><i /><span><strong>Current version validated</strong><small>Today · 12:14 · Resource360</small></span></li><li><i /><span><strong>Review completed</strong><small>18 Aug · Pooja Nair</small></span></li><li><i /><span><strong>Supporting evidence added</strong><small>16 Aug · Aarav Mehta</small></span></li><li><i /><span><strong>Record synchronized</strong><small>15 Aug · EXL People Master</small></span></li></ol></aside></section>
  </>;
}

function FormCanvas({ screen }: { screen: ScreenSpec }) {
  const isSearch = screen.title.toLowerCase().includes("search") || screen.title.toLowerCase().includes("requirement");
  const isDecision = screen.title.toLowerCase().includes("decision") || screen.title.toLowerCase().includes("submit") || screen.title.toLowerCase().includes("deallocate");
  const labels = isSearch ? ["Engagement", "Start date", "End date", "Salesforce role", "Required capability", "Minimum proficiency", "Credential", "Availability"] : isDecision ? ["Decision", "Effective date", "Business reason", "Notification recipients", "Supporting note", "Confirmation"] : screen.module === "budget" ? ["Engagement", "Planning currency", "Revenue", "Uplift", "Effort contingency", "Expense contingency", "Travel rate", "Planning periods"] : ["Record type", "Effective date", "Primary value", "Secondary value", "Owner", "Evidence or note"];
  return <section className="form-layout"><article className="surface form-surface"><div className="stepper"><span className="done">1<b>Context</b></span><i /><span className="active">2<b>{isDecision ? "Decision" : "Details"}</b></span><i /><span>3<b>Review</b></span></div><div className="form-heading"><span className="section-kicker">{screen.eyebrow}</span><h2>{screen.title}</h2><p>{screen.description}</p></div><div className="field-grid">{labels.map((label, index) => <label className={index === labels.length - 1 ? "wide-field" : ""} key={label}><span>{label}{index < 4 && <b>*</b>}</span>{label.toLowerCase().includes("note") || label.toLowerCase().includes("reason") || label === "Confirmation" ? <textarea placeholder={`Enter ${label.toLowerCase()}...`} rows={3} /> : <div className="mock-input"><span>{["Global Retail Cloud", "02 Sep 2026", "31 Mar 2027", "Data Cloud Architect", "Data Cloud", "Advanced", "Data Cloud Consultant", "40% capacity"][index] ?? "Select a value"}</span>{index % 3 === 0 && <b>⌄</b>}</div>}<small>{index === 2 ? "This value is validated against the active source contract." : ""}</small></label>)}</div><div className="form-notice"><span>✓</span><p><strong>Pre-checks passed</strong>Identity, source freshness, scope and current business state are valid.</p></div><div className="sticky-actions"><button className="tertiary-button">Save draft</button><span /><button className="secondary-button">Cancel</button><button className="primary-button">{screen.primary} <b>→</b></button></div></article><aside className="surface review-rail"><div className="surface-heading"><div><span className="section-kicker">Live review</span><h2>Decision context</h2></div></div><div className="review-score"><span>Readiness</span><strong>92%</strong><div><i style={{ width: "92%" }} /></div></div><ul className="check-list"><li className="pass"><i>✓</i><span><strong>Current approved budget</strong><small>Version 4 · 31.2% margin</small></span></li><li className="pass"><i>✓</i><span><strong>Capacity available</strong><small>40% through 31 March</small></span></li><li className="pass"><i>✓</i><span><strong>Mandatory credential valid</strong><small>Verified 12 August</small></span></li><li className="warn"><i>!</i><span><strong>One preferred criterion missing</strong><small>Manufacturing industry evidence</small></span></li></ul><div className="policy-box"><span>Active policy</span><strong>Resource360 v1 · effective 01 Apr 2026</strong><small>Every decision records this version.</small></div></aside></section>;
}

function PlannerCanvas({ screen }: { screen: ScreenSpec }) {
  const isTimesheet = screen.module === "timesheet";
  const periods = isTimesheet ? ["Mon 17", "Tue 18", "Wed 19", "Thu 20", "Fri 21", "Sat 22", "Sun 23"] : ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
  const rows = isTimesheet ? [
    ["Global Retail Cloud", "Data strategy", "8", "8", "8", "8", "8", "—", "—"],
    ["COE Investment", "Capability build", "—", "—", "—", "2", "—", "—", "—"],
    ["Learning", "Data Cloud maintenance", "—", "—", "—", "—", "2", "—", "—"],
  ] : [
    ["Aarav Mehta", "Data Cloud Architect", "40", "60", "80", "80", "60", "40", "—"],
    ["Riya Sen", "Service Cloud Lead", "75", "75", "50", "25", "—", "—", "—"],
    ["Kabir Rao", "MuleSoft Developer", "—", "40", "60", "80", "80", "80", "60"],
    ["Open demand", "FSC Consultant", "—", "—", "40", "60", "60", "40", "—"],
  ];
  return <>
    <div className="planner-toolbar"><div className="segmented"><button className="active">{isTimesheet ? "This week" : "Month"}</button><button>{isTimesheet ? "Previous" : "Quarter"}</button><button>{isTimesheet ? "Next" : "Year"}</button></div><button className="filter-button">02 Sep 2026 – 31 Mar 2027 <span>⌄</span></button><button className="filter-button">Hours / % <span>⌄</span></button><span /><button className="secondary-button">Auto-plan</button></div>
    <section className="surface planning-surface"><div className="surface-heading"><div><span className="section-kicker">Interactive planning canvas</span><h2>{screen.title}</h2></div><div className="legend"><span><i className="accepted" />Accepted</span><span><i className="pending" />Pending</span><span><i className="conflict" />Conflict</span></div></div><div className="plan-grid"><div className="plan-head"><span>{isTimesheet ? "Engagement / work unit" : "Practitioner / role"}</span>{periods.map((period) => <b key={period}>{period}</b>)}<strong>Total</strong></div>{rows.map((row, rowIndex) => <div className="plan-row" key={row[0]}><span><strong>{row[0]}</strong><small>{row[1]}</small></span>{row.slice(2).map((value, cellIndex) => <button className={`${value === "—" ? "empty" : "filled"} ${rowIndex === 3 && cellIndex === 3 ? "conflict" : ""}`} key={`${value}-${cellIndex}`}>{value}{value !== "—" && !isTimesheet ? "%" : value !== "—" ? "h" : ""}</button>)}<strong>{isTimesheet ? row.slice(2).reduce((sum, value) => sum + (value === "—" ? 0 : Number(value)), 0) + "h" : ["360%", "225%", "400%", "200%"][rowIndex]}</strong></div>)}</div><div className="plan-summary"><div><span>Planned effort</span><strong>{isTimesheet ? "44h" : "11,680h"}</strong></div><div><span>Available capacity</span><strong>{isTimesheet ? "40h" : "2,940h"}</strong></div><div><span>Unresolved cells</span><strong className="orange-text">{isTimesheet ? "2" : "7"}</strong></div><div><span>Budget coverage</span><strong>96%</strong></div></div></section>
  </>;
}

function DashboardCanvas({ screen }: { screen: ScreenSpec }) {
  const bars = [62, 71, 69, 76, 74, 81, 78, 84, 82, 88, 86, 91];
  return <><div className="dashboard-filters"><button className="filter-button">FY 2026–27 <span>⌄</span></button><button className="filter-button">India <span>⌄</span></button><button className="filter-button">All Salesforce towers <span>⌄</span></button><button className="filter-button">Certified view <span>✓</span></button><span>Data cutoff · 22 Aug, 12:15 IST · active targets: billed 75%, WAR ≤10%, IFB ≤2%</span></div><StatCards module={screen.module} /><section className="dashboard-grid"><article className="surface chart-panel large-chart"><div className="surface-heading"><div><span className="section-kicker">12-month trend</span><h2>{screen.title}</h2></div><div className="segmented"><button className="active">Actual</button><button>Forecast</button></div></div><div className="bar-chart" aria-label="Monthly performance trend">{bars.map((height, index) => <div key={index}><span style={{ height: `${height}%` }}><i>{height}%</i></span><small>{["Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"][index]}</small></div>)}</div></article><article className="surface chart-panel"><div className="surface-heading"><div><span className="section-kicker">Distribution</span><h2>Capacity mix</h2></div></div><div className="donut-wrap"><div className="donut"><span><strong>78%</strong><small>Billed</small></span></div><ul><li><i className="d1" />Billing <b>78.4% / 75% target</b></li><li><i className="d2" />WAR / IFB <b>8.6% / ≤12%</b></li><li><i className="d3" />Investment <b>7.2%</b></li><li><i className="d4" />Available <b>5.8%</b></li></ul></div></article><article className="surface exception-panel"><div className="surface-heading"><div><span className="section-kicker">Action register</span><h2>Priority exceptions</h2></div><button className="link-button">View all →</button></div><div className="exception-list"><button><span className="severity high">High</span><span><strong>WAR allocation over 6 weeks</strong><small>Global Retail Cloud · 4 practitioners</small></span><b>₹18.4L</b><i>→</i></button><button><span className="severity high">High</span><span><strong>Margin erosion above 3 points</strong><small>Claims Modernization</small></span><b>−3.8pt</b><i>→</i></button><button><span className="severity medium">Med</span><span><strong>Credential supply below demand</strong><small>Data Cloud Architect · 90 days</small></span><b>−7</b><i>→</i></button></div></article></section></>;
}

function AdminCanvas({ screen }: { screen: ScreenSpec }) {
  const cards = [
    ["People and access", "1,862 active identities", "Healthy", "⌘"],
    ["Role permissions", "14 role definitions", "Review due", "▦"],
    ["Business values", "126 active values", "Healthy", "≡"],
    ["Calendars and capacity", "18 regional calendars", "Healthy", "▧"],
    ["Approval policies", "6 active versions", "2 future", "↗"],
    ["Integrations", "9 of 10 healthy", "Degraded", "⇄"],
  ];
  return <><section className="admin-grid">{cards.map((card) => <button className="admin-card" key={card[0]}><span>{card[3]}</span><div><strong>{card[0]}</strong><small>{card[1]}</small></div><Status>{card[2]}</Status><b>→</b></button>)}</section><section className="surface config-surface"><div className="surface-heading"><div><span className="section-kicker">Effective configuration</span><h2>{screen.title}</h2></div><div><button className="secondary-button">Compare versions</button><button className="primary-button">{screen.primary}</button></div></div><div className="config-list"><div className="config-row head"><span>Configuration</span><span>Owner</span><span>Effective</span><span>Health</span><span>Enabled</span><span /></div>{[["Staffing request SLA", "COE Staffing", "01 Apr 2026", "Active"],["Margin approval tiers", "Finance", "01 Apr 2026", "Active"],["Timesheet submission window", "Delivery Ops", "01 Jul 2026", "Active"],["Credential evidence fallback", "Capability", "15 Jul 2026", "Review due"],["Unbilled escalation matrix", "Delivery Ops", "01 Apr 2026", "Active"]].map((row, index) => <div className="config-row" key={row[0]}><span><strong>{row[0]}</strong><small>Version {index + 2}.0 · audited</small></span><span>{row[1]}</span><span>{row[2]}</span><Status>{row[3]}</Status><label className="toggle"><span className="sr-only">{row[0]} enabled</span><input type="checkbox" defaultChecked={index !== 3} /><i /></label><button>Open →</button></div>)}</div></section></>;
}

function AssistantCanvas() {
  return <section className="assistant-layout"><article className="surface chat-surface"><div className="assistant-hero"><span className="ai-orb">✦</span><div><span className="section-kicker">Resource360 intelligence</span><h2>What would you like to plan?</h2><p>Answers use only your authorized COE data and always show source freshness.</p></div></div><div className="suggestion-grid"><button>Who can start as a Data Cloud Architect in September?<span>→</span></button><button>Which allocations create margin risk this quarter?<span>→</span></button><button>Show Service Cloud credential gaps for the next 90 days.<span>→</span></button><button>What changes if the Claims project moves by four weeks?<span>→</span></button></div><div className="chat-box"><textarea aria-label="Ask Resource360" placeholder="Ask a staffing, capability or delivery question..." rows={3} /><div><span>Scope: Salesforce COE · India</span><button>Ask Resource360 <b>↑</b></button></div></div><p className="ai-disclaimer">Human review is required before any staffing, budget or allocation action. Protected characteristics are excluded.</p></article><aside className="surface source-rail"><div className="surface-heading"><div><span className="section-kicker">Answer controls</span><h2>Trusted context</h2></div></div><ul className="source-list"><li><i className="good" /><span><strong>People Master</strong><small>Fresh · 12 minutes</small></span></li><li><i className="good" /><span><strong>Staffing ledger</strong><small>Live · 36 seconds</small></span></li><li><i className="good" /><span><strong>Skills & credentials</strong><small>Fresh · 2 hours</small></span></li><li><i className="warn" /><span><strong>Learning Gateway</strong><small>Partial · 14 hours</small></span></li></ul><div className="model-card"><span>Recommendation policy</span><strong>R360-POLICY-2.0</strong><small>Governed effective version · Human approval required</small></div></aside></section>;
}

function SsoCanvas({ onContinue }: { onContinue: () => void }) {
  return <section className="sso-stage"><div className="sso-art"><span className="brand-mark giant">exl</span><span>Salesforce COE</span><h2>One governed view of<br />skills, staffing and delivery.</h2><p>Resource360 connects approved economics to verified capability, committed capacity and actual effort.</p><div className="sso-metrics"><span><strong>Sanitized</strong>Demo fixtures</span><span><strong>103</strong>Screen inventory</span><span><strong>5</strong>Connected demo steps</span></div></div><div className="sso-card"><div><span className="brand-mark">exl</span><strong>Resource360</strong></div><h3>Demo access</h3><p>This GitHub Pages build simulates EXL Entra SSO. No password, token or production identity is collected.</p><button className="sso-button" onClick={onContinue}><i>▦</i> Enter sanitized demo</button><span className="secure-note">⌾ Production requires Microsoft Entra ID</span><div className="sso-links"><button>Privacy</button><button>Accessibility</button><button>Get help</button></div></div></section>;
}

function ScreenCanvas({
  screen,
  staffingRequests,
  selectedStaffingRequest,
  onOpenStaffingRequest,
  onOpenStaffingDecision,
  onBackToStaffingQueue,
  onBackToStaffingRequest,
  onSubmitStaffingDecision,
  onResetStaffingDemo,
  onCreateStaffingRequest,
  system,
  onSelect,
  onToast,
}: {
  screen: ScreenSpec;
  staffingRequests: StaffingRequest[];
  selectedStaffingRequest: StaffingRequest;
  onOpenStaffingRequest: (id: string) => void;
  onOpenStaffingDecision: () => void;
  onBackToStaffingQueue: () => void;
  onBackToStaffingRequest: () => void;
  onSubmitStaffingDecision: (decision: StaffingDecision, reason: string) => void;
  onResetStaffingDemo: () => void;
  onCreateStaffingRequest: (request: StaffingRequest) => void;
  system: DemoSystem;
  onSelect: (id: string) => void;
  onToast: (message: string) => void;
}) {
  if (!canAccessScreen(system.state.activeRole, screen)) return <section className="surface access-denied" role="alert"><span className="section-kicker">Access control</span><h2>Screen unavailable for {system.state.activeRole}</h2><p>This sanitized demo applies the same persona-to-module contract as Salesforce. Switch to an authorized active role to open {screen.id}; restricted data has not been rendered.</p><button className="primary-button" onClick={() => onSelect("GLB-05")}>Switch role and scope →</button></section>;
  if (screen.id === "GLB-01") return <SsoCanvas onContinue={() => { system.setSignedIn(true); onSelect("GLB-02"); onToast("Sanitized demo session started"); }} />;
  if (screen.id === "GLB-02") return <DemoHome system={system} onSelect={onSelect} />;
  if (screen.id === "GLB-03") return <NotificationDemo system={system} onSelect={onSelect} />;
  if (screen.id === "GLB-05") return <RoleDemo system={system} onSelect={onSelect} onToast={onToast} />;
  if (screen.module === "engagement") return <EngagementDemo screen={screen} system={system} onSelect={onSelect} />;
  if (screen.module === "budget") return <BudgetDemo screen={screen} system={system} onSelect={onSelect} onToast={onToast} />;
  if (screen.module === "skills") return <SkillsDemo screen={screen} system={system} onSelect={onSelect} onToast={onToast} />;
  if (screen.id === "STFUI-21") return <StaffingQueue requests={staffingRequests} onOpen={onOpenStaffingRequest} onReset={onResetStaffingDemo} />;
  if (screen.id === "STFUI-22") return <StaffingRequestDetail request={selectedStaffingRequest} onBack={onBackToStaffingQueue} onDecide={onOpenStaffingDecision} />;
  if (screen.id === "STFUI-23") return <StaffingDecisionForm request={selectedStaffingRequest} onBack={onBackToStaffingRequest} onSubmit={onSubmitStaffingDecision} />;
  if (screen.module === "staffing") return <StaffingPlanningDemo screen={screen} system={system} onSelect={onSelect} onCreate={onCreateStaffingRequest} onToast={onToast} />;
  if (screen.module === "timesheet") return <TimesheetDemo screen={screen} system={system} onToast={onToast} />;
  if (screen.id === "CMD-09") return <AdminDemo screen={screen} system={system} onToast={onToast} />;
  if (screen.module === "command") return <CommandDemo screen={screen} system={system} onSelect={onSelect} />;
  if (screen.module === "admin") return <AdminDemo screen={screen} system={system} onToast={onToast} />;
  if (screen.id === "AIUI-03") return <ScenarioDemo system={system} onToast={onToast} />;
  if (screen.kind === "home") return <HomeCanvas module={screen.module} />;
  if (screen.kind === "list") return <ListCanvas screen={screen} />;
  if (screen.kind === "detail") return <DetailCanvas screen={screen} />;
  if (screen.kind === "form") return <FormCanvas screen={screen} />;
  if (screen.kind === "planner") return <PlannerCanvas screen={screen} />;
  if (screen.kind === "dashboard") return <DashboardCanvas screen={screen} />;
  if (screen.kind === "admin") return <AdminCanvas screen={screen} />;
  return <AssistantCanvas />;
}

function ScreenDirectory({ onClose, onSelect }: { onClose: () => void; onSelect: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [moduleFilter, setModuleFilter] = useState<ModuleId | "all">("all");
  const results = screens.filter((screen) => (moduleFilter === "all" || screen.module === moduleFilter) && `${screen.id} ${screen.title} ${screen.description}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="directory-backdrop" role="dialog" aria-modal="true" aria-label="All Resource360 screens"><section className="screen-directory"><header><div><span className="section-kicker">Design inventory</span><h2>All 103 Resource360 screens</h2><p>Every routed page, full-screen step and decision-critical modal from the PRD.</p></div><button className="close-button" onClick={onClose} aria-label="Close screen directory">×</button></header><div className="directory-tools"><label className="inline-search"><span>⌕</span><input aria-label="Search Resource360 screens" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search screen ID, title or purpose..." /></label><div className="module-chips"><button className={moduleFilter === "all" ? "active" : ""} onClick={() => setModuleFilter("all")}>All · 103</button>{modules.map((moduleItem) => <button className={moduleFilter === moduleItem.id ? "active" : ""} key={moduleItem.id} onClick={() => setModuleFilter(moduleItem.id)}>{moduleItem.label} · {screens.filter((screen) => screen.module === moduleItem.id).length}</button>)}</div></div><div className="screen-card-grid">{results.map((screen) => { const moduleItem = modules.find((item) => item.id === screen.module)!; return <button key={screen.id} onClick={() => onSelect(screen.id)} style={{ "--card-accent": moduleItem.accent } as CSSProperties}><div><span>{screen.id}</span><b>{screen.release}</b></div><i>{moduleItem.icon}</i><h3>{screen.title}</h3><p>{screen.description}</p><footer><span>{moduleItem.label}</span><b>Open →</b></footer></button>; })}</div></section></div>;
}

export default function Home() {
  const demoSystem = useDemoSystem();
  const staffingWorkflow = useStaffingWorkflow();
  const [activeId, setActiveId] = useState(defaultScreenId);
  const [selectedStaffingRequestId, setSelectedStaffingRequestId] = useState(initialSelectedRequestId);
  const [screenFilter, setScreenFilter] = useState("");
  const [globalQuery, setGlobalQuery] = useState("");
  const [showDirectory, setShowDirectory] = useState(false);
  const [toast, setToast] = useState("");
  const [isOnline, setIsOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);
  const active = screenById[activeId] ?? screenById[defaultScreenId];
  const activeModule = modules.find((module) => module.id === active.module)!;
  const authorizedScreens = useMemo(() => screens.filter((screen) => canAccessScreen(demoSystem.state.activeRole, screen)), [demoSystem.state.activeRole]);
  const authorizedModules = useMemo(() => modules.filter((module) => authorizedScreens.some((screen) => screen.module === module.id)), [authorizedScreens]);
  const moduleScreens = useMemo(() => authorizedScreens.filter((screen) => screen.module === active.module && `${screen.id} ${screen.title}`.toLowerCase().includes(screenFilter.toLowerCase())), [active.module, authorizedScreens, screenFilter]);
  const globalResults = globalQuery.length > 1 ? authorizedScreens.filter((screen) => `${screen.id} ${screen.title} ${screen.description}`.toLowerCase().includes(globalQuery.toLowerCase())).slice(0, 7) : [];
  const selectedStaffingRequest = staffingWorkflow.requests.find((request) => request.id === selectedStaffingRequestId) ?? staffingWorkflow.requests[0];

  useEffect(() => {
    const syncFromUrl = () => {
      const requested = new URLSearchParams(window.location.search).get("screen");
      if (requested && screenById[requested]) setActiveId(requested);
    };
    const timer = window.setTimeout(syncFromUrl, 0);
    window.addEventListener("popstate", syncFromUrl);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("popstate", syncFromUrl);
    };
  }, []);

  useEffect(() => {
    const online = () => setIsOnline(true);
    const offline = () => setIsOnline(false);
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    return () => { window.removeEventListener("online", online); window.removeEventListener("offline", offline); };
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      document.querySelectorAll<HTMLElement>(".responsive-table, .timesheet-workspace").forEach((region, index) => {
        region.tabIndex = 0;
        region.setAttribute("role", "region");
        region.setAttribute("aria-label", `Scrollable workspace region ${index + 1}`);
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeId]);

  function selectScreen(id: string) {
    setActiveId(id);
    setScreenFilter("");
    setGlobalQuery("");
    setShowDirectory(false);
    const url = new URL(window.location.href);
    url.searchParams.set("screen", id);
    window.history.replaceState({}, "", url);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showAction(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }

  function openStaffingRequest(id: string) {
    setSelectedStaffingRequestId(id);
    selectScreen("STFUI-22");
  }

  function submitStaffingDecision(decision: StaffingDecision, reason: string) {
    staffingWorkflow.decide(selectedStaffingRequest.id, decision, reason);
    if (decision === "Accepted") demoSystem.commitAllocation(selectedStaffingRequest);
    selectScreen("STFUI-22");
    showAction(`${selectedStaffingRequest.id} ${decision.toLowerCase()} and saved in this browser`);
  }

  function resetStaffingDemo() {
    staffingWorkflow.reset();
    demoSystem.reset();
    setSelectedStaffingRequestId(initialSelectedRequestId);
    showAction("Staffing demo restored to its initial state");
  }

  function createStaffingRequest(request: StaffingRequest) {
    staffingWorkflow.create(request);
    setSelectedStaffingRequestId(request.id);
  }

  return <main className="app-shell" style={{ "--module-accent": activeModule.accent } as CSSProperties}>
    <aside className="sidebar">
      <div className="brand-block"><div className="brand-mark">exl</div><div className="brand-name"><span>Salesforce COE</span><strong>Resource360</strong></div></div>
      <nav aria-label="Primary navigation">{authorizedModules.map((module) => <button className={`nav-item ${active.module === module.id ? "active" : ""}`} key={module.id} onClick={() => selectScreen(authorizedScreens.find((screen) => screen.module === module.id)!.id)}><span className="nav-icon">{module.icon}</span><span>{module.label}</span><b>{authorizedScreens.filter((screen) => screen.module === module.id).length}</b></button>)}</nav>
      <div className="sidebar-bottom"><button className="all-screens-button" onClick={() => setShowDirectory(true)}><span>▦</span><span>All screens</span><b>103</b></button><div className="profile-mini"><span className="avatar">MP</span><span><strong>Maya Patel</strong><small>{demoSystem.state.activeRole}</small></span><button aria-label="Open profile menu" onClick={() => selectScreen("GLB-05")}>•••</button></div></div>
    </aside>

    <section className="workspace">
      <header className="topbar"><span className="demo-chip">DEMO</span><div className="scope"><span className="eyebrow">{demoSystem.state.activeRole}</span><button onClick={() => selectScreen("GLB-05")}>Salesforce COE · India <span>⌄</span></button></div><div className="global-search-wrap"><label className="global-search"><span>⌕</span><input aria-label="Search screens and records" value={globalQuery} onChange={(event) => setGlobalQuery(event.target.value)} placeholder="Search screens, people, engagements..." /><kbd>⌘ K</kbd></label>{globalResults.length > 0 && <div className="global-results">{globalResults.map((screen) => <button key={screen.id} onClick={() => selectScreen(screen.id)}><span>{screen.id}</span><strong>{screen.title}</strong><small>{modules.find((module) => module.id === screen.module)?.label}</small><b>→</b></button>)}</div>}</div><button className="icon-button" aria-label={`${demoSystem.unread} unread notifications`} onClick={() => selectScreen("GLB-03")}>♢{demoSystem.unread > 0 && <span className="notification-count">{demoSystem.unread}</span>}</button><button className="help-button" aria-label="Help" onClick={() => selectScreen("GLB-06")}>?</button></header>
      {!isOnline && <div className="offline-banner" role="status">Offline demo mode · saved browser data remains available. Changes will stay on this device.</div>}

      <div className="workbench">
        <aside className="screen-rail"><div className="rail-title"><span className="rail-icon">{activeModule.icon}</span><div><small>{activeModule.label}</small><strong>{authorizedScreens.filter((screen) => screen.module === active.module).length} authorized screens</strong></div></div><label className="rail-search"><span>⌕</span><input value={screenFilter} onChange={(event) => setScreenFilter(event.target.value)} placeholder="Filter screens..." /></label><div className="screen-links">{moduleScreens.map((screen) => <button className={screen.id === active.id ? "active" : ""} key={screen.id} onClick={() => selectScreen(screen.id)}><span>{screen.id}</span><strong>{screen.title}</strong><b>{screen.release}</b></button>)}</div><button className="rail-all" onClick={() => setShowDirectory(true)}>Browse all 103 screens <span>→</span></button></aside>

        <section className="canvas"><header className="page-header"><div className="breadcrumbs"><button onClick={() => setShowDirectory(true)}>Product workspace</button><span>/</span><button>{activeModule.label}</button><span>/</span><b>{active.id}</b></div><div className="title-row"><div><span className="page-eyebrow">{active.eyebrow ?? activeModule.label}<b>{active.release}</b></span><h1>{active.title}</h1><p>{active.description}</p></div><div className="page-actions"><button className="secondary-button" onClick={() => showAction("Demo states include seeded, changed and empty paths")}>View states <span>⌄</span></button><button className="primary-button" onClick={() => showAction(`${active.primary} is available in the browser demo`)}>{active.primary} <span>＋</span></button></div></div></header><div className="canvas-content"><ScreenCanvas screen={active} staffingRequests={staffingWorkflow.requests} selectedStaffingRequest={selectedStaffingRequest} onOpenStaffingRequest={openStaffingRequest} onOpenStaffingDecision={() => selectScreen("STFUI-23")} onBackToStaffingQueue={() => selectScreen("STFUI-21")} onBackToStaffingRequest={() => selectScreen("STFUI-22")} onSubmitStaffingDecision={submitStaffingDecision} onResetStaffingDemo={resetStaffingDemo} onCreateStaffingRequest={createStaffingRequest} system={demoSystem} onSelect={selectScreen} onToast={showAction} /></div><footer className="prototype-footer"><span>Screen {screens.findIndex((screen) => screen.id === active.id) + 1} of 103</span><b>EXL Salesforce COE Resource360 · sanitized GitHub Pages demo</b><button onClick={() => setShowDirectory(true)}>Open screen directory</button></footer></section>
      </div>
    </section>
    {showDirectory && <ScreenDirectory onClose={() => setShowDirectory(false)} onSelect={selectScreen} />}
    {toast && <div className="toast" role="status"><span>✓</span>{toast}</div>}
  </main>;
}
