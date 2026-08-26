import type { ReactNode } from "react";
import type { ScreenSpec } from "./screen-data";
import type { AccountSnapshot, CapacitySnapshot, ProjectSnapshot, SalesforceSnapshot } from "./salesforce-snapshot";

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", notation: "compact", maximumFractionDigits: 1 });
const date = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

function Status({ children, tone = "neutral" }: { children: ReactNode; tone?: "good" | "warn" | "bad" | "neutral" }) {
  return <span className={`status-pill ${tone}`}><i />{children}</span>;
}

function Stat({ label, value, note, tone = "neutral" }: { label: string; value: string; note: string; tone?: "good" | "warn" | "bad" | "neutral" }) {
  return <article className="stat-card"><div><span>{label}</span><Status tone={tone}>{tone === "good" ? "On Target" : tone === "warn" ? "Watch" : tone === "bad" ? "At Risk" : "Certified"}</Status></div><strong>{value}</strong><p>{note}</p></article>;
}

function Freshness({ snapshot }: { snapshot: SalesforceSnapshot }) {
  return <Status tone="good">Salesforce cutoff · {new Date(snapshot.source.dataCutoff).toLocaleString("en-IN")}</Status>;
}

function AccountSummary({ account }: { account: AccountSnapshot }) {
  return <>
    <section className="surface workflow-section" data-account-360={account.key}>
      <div className="surface-heading"><div><span className="section-kicker">Account 360 · synchronized</span><h2>{account.name}</h2></div><Status tone={account.deliveryRiskScore <= 10 ? "good" : "warn"}>Health {account.accountHealthScore}</Status></div>
      <dl className="workflow-dl"><div><dt>Portfolio</dt><dd>{account.portfolio}</dd></div><div><dt>Projects</dt><dd>{account.activeProjectCount} active / {account.projectCount} total</dd></div><div><dt>Approved revenue</dt><dd>{currency.format(account.approvedRevenue)}</dd></div><div><dt>Forecast revenue</dt><dd>{currency.format(account.forecastRevenue)}</dd></div><div><dt>Contracts / payments</dt><dd>{account.contractCount} / {account.paymentCount}</dd></div><div><dt>Accepted allocations</dt><dd>{account.allocationCount}</dd></div></dl>
    </section>
  </>;
}

export function SynchronizedEngagement360({ screen, snapshot, selectedAccountKey, selectedProjectKey, onAccountSelect, onProjectSelect, onSelect }: {
  screen: ScreenSpec;
  snapshot: SalesforceSnapshot | null;
  selectedAccountKey: string;
  selectedProjectKey: string;
  onAccountSelect: (account: AccountSnapshot) => void;
  onProjectSelect: (project: ProjectSnapshot) => void;
  onSelect: (id: string) => void;
}) {
  if (!snapshot) return <section className="surface operational-empty"><span>◇</span><strong>Salesforce snapshot unavailable</strong><p>The synchronized 360 fails closed instead of substituting unsynchronized project data.</p></section>;
  const account = snapshot.accounts.find((item) => item.key === selectedAccountKey) ?? snapshot.accounts[0];
  const accountProjects = snapshot.projects.filter((item) => item.account === account.name);
  const project = snapshot.projects.find((item) => item.key === selectedProjectKey) ?? accountProjects[0] ?? snapshot.projects[0];

  if (screen.id === "ENG-01") return <div data-route-experience="ENG-01">
    <section className="demo-section-banner"><div><span>Account and project master · Salesforce snapshot</span><h2>Account and project 360</h2><p>Ten fictional accounts and twenty related projects from the current allowlisted Developer Org publication.</p></div><Freshness snapshot={snapshot} /></section>
    <section className="admin-grid" aria-label="Synchronized account selector">{snapshot.accounts.map((item) => <button className={`admin-card ${item.key === account.key ? "active" : ""}`} key={item.key} onClick={() => onAccountSelect(item)}><span>{item.key}</span><div><strong>{item.name}</strong><small>{item.projectCount} projects · {item.contractCount} contracts</small></div><Status tone={item.deliveryRiskScore <= 10 ? "good" : "warn"}>Health {item.accountHealthScore}</Status><b>→</b></button>)}</section>
    <AccountSummary account={account} />
    <section className="surface data-surface"><div className="surface-heading"><div><span className="section-kicker">Project portfolio · {account.key}</span><h2>{account.name} projects</h2></div><Status tone="good">{accountProjects.length}/{account.projectCount} reconciled</Status></div><div className="responsive-table"><table><thead><tr><th>Project</th><th>Lifecycle</th><th>Completion</th><th>Revenue</th><th>Margin</th><th>Related graph</th><th /></tr></thead><tbody>{accountProjects.map((item) => <tr key={item.key}><td><strong>{item.name}</strong><small className="table-subline">{item.key} · {item.portfolio}</small></td><td><Status tone={item.status === "Active" ? "good" : "neutral"}>{item.lifecycle}</Status></td><td>{item.completionPercent}%</td><td>{currency.format(item.approvedRevenue)}</td><td>{item.forecastMarginPercent.toFixed(1)}%</td><td>{item.contractCount} contracts · {item.allocationCount} allocations</td><td><button className="row-action" onClick={() => onProjectSelect(item)}>Open project 360 →</button></td></tr>)}</tbody></table></div></section>
  </div>;

  return <div data-route-experience="ENG-02" data-project-360={project.key}>
    <section className="demo-section-banner"><div><span>Project 360 · Salesforce snapshot · {project.key}</span><h2>{project.name}</h2><p>{project.account} · {project.portfolio} · {date(project.startDate)}–{date(project.endDate)}</p></div><div className="button-cluster"><button className="secondary-button inverse" onClick={() => onSelect("BUDUI-05")}>Open economics</button><button className="primary-button" onClick={() => onSelect("STFUI-01")}>Open staffing</button></div></section>
    <section className="stat-grid"><Stat label="Completion" value={`${project.completionPercent}%`} note={`${project.lifecycle} · forecast ${date(project.forecastCompletionDate)}`} tone={project.scheduleVarianceDays <= 5 ? "good" : "warn"} /><Stat label="Approved revenue" value={currency.format(project.approvedRevenue)} note={`${project.budgetState} budget · ${project.approvedMarginPercent.toFixed(1)}% approved margin`} tone="good" /><Stat label="Forecast margin" value={`${project.forecastMarginPercent.toFixed(1)}%`} note={`${project.marginErosionPoints.toFixed(1)}pt erosion · ${project.forecastAccuracyPercent}% accuracy`} tone={project.marginErosionPoints <= 2 ? "good" : "warn"} /><Stat label="Delivery assurance" value={`${project.acceptanceFirstPassPercent}%`} note={`CPI-informed EAC ${currency.format(project.estimateAtCompletion)}`} tone={project.riskExposureScore <= 10 ? "good" : "warn"} /></section>
    <section className="detail-grid"><article className="surface workflow-section"><div className="surface-heading"><div><span className="section-kicker">Governed project record</span><h2>Schedule, economics and readiness</h2></div><Freshness snapshot={snapshot} /></div><dl className="workflow-dl"><div><dt>Account</dt><dd>{project.account}</dd></div><div><dt>Status / lifecycle</dt><dd>{project.status} · {project.lifecycle}</dd></div><div><dt>Schedule variance</dt><dd>{project.scheduleVarianceDays} days</dd></div><div><dt>Plan-to-actual variance</dt><dd>{project.planActualVariancePercent}%</dd></div><div><dt>Mandatory skill coverage</dt><dd>{project.mandatorySkillCoveragePercent}%</dd></div><div><dt>Role readiness</dt><dd>{project.roleReadinessPercent}%</dd></div><div><dt>CSAT / NPS</dt><dd>{project.csatScore.toFixed(1)} / {project.npsScore}</dd></div><div><dt>Account health</dt><dd>{project.accountHealthScore}</dd></div></dl></article><aside className="surface"><div className="surface-heading"><div><span className="section-kicker">Related Salesforce graph</span><h2>Operational records</h2></div></div><div className="related-actions"><button onClick={() => onSelect("ENG-04")}>Contracts <b>{project.contractCount}</b></button><button onClick={() => onSelect("CMD-04")}>Payments <b>{project.paymentCount}</b></button><button onClick={() => onSelect("ENG-06")}>Modules <b>{project.moduleCount}</b></button><button onClick={() => onSelect("ENG-06")}>Work units <b>{project.workUnitCount}</b></button><button onClick={() => onSelect("ENG-03")}>Allocations <b>{project.allocationCount}</b></button><button onClick={() => onSelect("ENG-07")}>Risks <b>{project.riskCount}</b></button></div></aside></section>
    <section className="surface data-surface"><div className="surface-heading"><div><span className="section-kicker">Twenty-project selector</span><h2>Open another synchronized project</h2></div></div><div className="responsive-table"><table><thead><tr><th>Project</th><th>Account</th><th>Completion</th><th>Forecast margin</th><th>Action</th></tr></thead><tbody>{snapshot.projects.map((item) => <tr key={item.key}><td><strong>{item.name}</strong><small className="table-subline">{item.key}</small></td><td>{item.account}</td><td>{item.completionPercent}%</td><td>{item.forecastMarginPercent.toFixed(1)}%</td><td><button className="row-action" onClick={() => onProjectSelect(item)}>{item.key === project.key ? "Current project" : "Open 360 →"}</button></td></tr>)}</tbody></table></div></section>
  </div>;
}

export function SynchronizedResource360({ snapshot, selectedResourceKey, onResourceSelect, onSelect }: {
  snapshot: SalesforceSnapshot | null;
  selectedResourceKey: string;
  onResourceSelect: (resource: CapacitySnapshot) => void;
  onSelect: (id: string) => void;
}) {
  if (!snapshot) return <section className="surface operational-empty"><span>◇</span><strong>Salesforce snapshot unavailable</strong><p>The synchronized Resource 360 fails closed instead of rendering a fictional local profile.</p></section>;
  const resource = snapshot.capacity.find((item) => item.key === selectedResourceKey) ?? snapshot.capacity[0];
  const absences = snapshot.unavailability.filter((item) => item.resourceKey === resource.key);
  const tone = resource.allocatedHours > 8 ? "warn" : resource.allocatedHours === 8 ? "good" : "bad";
  return <div data-route-experience="SKLUI-05" data-resource-360={resource.key}>
    <section className="demo-section-banner"><div><span>Resource 360 · Salesforce snapshot · {resource.key}</span><h2>{resource.label}</h2><p>{resource.role} · {resource.portfolio} · {resource.subPortfolio}</p></div><div className="button-cluster"><button className="secondary-button inverse" onClick={() => onSelect("STFUI-05")}>Open schedule</button><button className="primary-button" onClick={() => onSelect("SKLUI-06")}>View capabilities</button></div></section>
    <section className="stat-grid"><Stat label="Daily allocation" value={`${resource.allocatedHours}h`} note={`${resource.standardHours}h standard · ${resource.remainingHours}h remaining`} tone={tone} /><Stat label="Utilization" value={`${resource.utilizationPercent}%`} note={resource.state} tone={tone} /><Stat label="Allocation lines" value={`${resource.allocationCount}`} note="Accepted project commitments" tone="good" /><Stat label="Approved absence" value={`${absences.reduce((sum, item) => sum + item.hoursPerDay, 0)}h`} note={absences.length ? absences.map((item) => item.type).join(", ") : "No approved event on the published horizon"} /></section>
    <section className="detail-grid"><article className="surface workflow-section"><div className="surface-heading"><div><span className="section-kicker">Delivery membership</span><h2>Capacity and organizational scope</h2></div><Freshness snapshot={snapshot} /></div><dl className="workflow-dl"><div><dt>Sanitized resource key</dt><dd>{resource.key}</dd></div><div><dt>Delivery role</dt><dd>{resource.role}</dd></div><div><dt>Portfolio</dt><dd>{resource.portfolio}</dd></div><div><dt>Sub-portfolio</dt><dd>{resource.subPortfolio}</dd></div><div><dt>Work date</dt><dd>{date(resource.workDate)}</dd></div><div><dt>Capacity state</dt><dd>{resource.state}</dd></div><div><dt>Overage</dt><dd>{resource.overageHours}h · {resource.approvedOverallocation ? "approved" : "not applicable"}</dd></div><div><dt>Pending approvals</dt><dd>{resource.pendingApprovalCount}</dd></div></dl></article><aside className="surface"><div className="surface-heading"><div><span className="section-kicker">Availability evidence</span><h2>Leave and training</h2></div></div>{absences.length ? <div className="control-status">{absences.map((item) => <p key={item.key}><Status tone="good">{item.status}</Status><span>{item.type} · {date(item.startDate)}–{date(item.endDate)}</span><b>{item.hoursPerDay}h/day</b></p>)}</div> : <p className="annotation">No approved unavailability event is attached to this sanitized resource in the published horizon.</p>}</aside></section>
    <section className="surface data-surface"><div className="surface-heading"><div><span className="section-kicker">Sixty-resource selector</span><h2>Current daily capacity ledger</h2></div><Status tone="good">{snapshot.capacity.length}/60 reconciled</Status></div><div className="responsive-table"><table><thead><tr><th>Resource</th><th>Role</th><th>Portfolio</th><th>Hours</th><th>Utilization</th><th>State</th><th /></tr></thead><tbody>{snapshot.capacity.map((item) => <tr key={item.key}><td><strong>{item.label}</strong><small className="table-subline">{item.key}</small></td><td>{item.role}</td><td>{item.portfolio}</td><td>{item.allocatedHours}h</td><td>{item.utilizationPercent}%</td><td><Status tone={item.allocatedHours > 8 ? "warn" : item.allocatedHours === 8 ? "good" : "bad"}>{item.state}</Status></td><td><button className="row-action" onClick={() => onResourceSelect(item)}>{item.key === resource.key ? "Current resource" : "Open 360 →"}</button></td></tr>)}</tbody></table></div></section>
  </div>;
}
