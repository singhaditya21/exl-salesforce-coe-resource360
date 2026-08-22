import { useEffect, useMemo, useState } from "react";

export type StaffingDecision = "Accepted" | "Declined";
export type StaffingStatus = "Awaiting decision" | "Conflict" | "Budget check" | StaffingDecision;

export type StaffingRequest = {
  id: string;
  candidate: string;
  initials: string;
  role: string;
  engagement: string;
  account: string;
  location: string;
  startDate: string;
  endDate: string;
  allocation: number;
  fit: number;
  status: StaffingStatus;
  priority: "Critical" | "High" | "Normal";
  ageHours: number;
  slaHours: number;
  budgetCoverage: number;
  margin: number;
  capacityAvailable: number;
  requestedBy: string;
  staffer: string;
  requirements: string[];
  fitEvidence: string[];
  warnings: string[];
  decisionReason?: string;
  decidedAt?: string;
  history: { label: string; detail: string }[];
};

const STORAGE_KEY = "exl-resource360-staffing-v1";

export const initialStaffingRequests: StaffingRequest[] = [
  {
    id: "SR-1842", candidate: "Aarav Mehta", initials: "AM", role: "Data Cloud Architect",
    engagement: "Global Retail Cloud", account: "Northstar Retail", location: "Bengaluru · Hybrid",
    startDate: "02 Sep 2026", endDate: "31 Mar 2027", allocation: 40, fit: 94,
    status: "Awaiting decision", priority: "Critical", ageHours: 66, slaHours: 72,
    budgetCoverage: 100, margin: 31.2, capacityAvailable: 40, requestedBy: "Neha Gupta", staffer: "Maya Patel",
    requirements: ["Data Cloud · Advanced", "Architecture · Advanced", "Data Cloud Consultant credential", "Retail preferred"],
    fitEvidence: ["4.5 years of Data Cloud delivery", "Credential verified 12 Aug 2026", "40% capacity across the full request", "Two relevant retail engagements"],
    warnings: ["Decision is within six hours of the staffing SLA."],
    history: [
      { label: "Capacity revalidated", detail: "Today · 12:14 · Resource360" },
      { label: "Request assigned to Maya Patel", detail: "Today · 09:05 · COE Staffing" },
      { label: "Request submitted", detail: "19 Aug · 18:12 · Neha Gupta" },
    ],
  },
  {
    id: "SR-1839", candidate: "Riya Sen", initials: "RS", role: "Service Cloud Lead",
    engagement: "Claims Modernization", account: "Contoso Insurance", location: "Pune · Remote",
    startDate: "05 Sep 2026", endDate: "30 Nov 2026", allocation: 50, fit: 89,
    status: "Conflict", priority: "High", ageHours: 51, slaHours: 72,
    budgetCoverage: 100, margin: 26.8, capacityAvailable: 35, requestedBy: "Arjun Shah", staffer: "Maya Patel",
    requirements: ["Service Cloud · Advanced", "Delivery leadership", "Insurance preferred"],
    fitEvidence: ["Service Cloud Lead on three programs", "Insurance claims implementation evidence", "Service Cloud Consultant credential verified"],
    warnings: ["Requested allocation exceeds available capacity by 15% from 05–18 September."],
    history: [
      { label: "Capacity conflict detected", detail: "Today · 10:32 · Resource360" },
      { label: "Request assigned to Maya Patel", detail: "20 Aug · 11:20 · COE Staffing" },
      { label: "Request submitted", detail: "20 Aug · 09:03 · Arjun Shah" },
    ],
  },
  {
    id: "SR-1834", candidate: "Kabir Rao", initials: "KR", role: "MuleSoft Developer",
    engagement: "Integration Factory", account: "Fabrikam", location: "Hyderabad · Hybrid",
    startDate: "10 Sep 2026", endDate: "28 Feb 2027", allocation: 80, fit: 86,
    status: "Awaiting decision", priority: "High", ageHours: 40, slaHours: 72,
    budgetCoverage: 96, margin: 24.9, capacityAvailable: 100, requestedBy: "Rohit Das", staffer: "Maya Patel",
    requirements: ["MuleSoft development · Advanced", "API-led connectivity", "MuleSoft Developer credential"],
    fitEvidence: ["Three MuleSoft delivery engagements", "100% available from 10 September", "Mandatory credential verified"],
    warnings: ["Budget coverage is 96%; four percent remains unplanned."],
    history: [
      { label: "Commercial pre-check passed with warning", detail: "Today · 08:42 · Resource360" },
      { label: "Request submitted", detail: "20 Aug · 20:14 · Rohit Das" },
    ],
  },
  {
    id: "SR-1828", candidate: "Meera Nair", initials: "MN", role: "FSC Consultant",
    engagement: "Wealth 360", account: "Apex Wealth", location: "Mumbai · Client site",
    startDate: "16 Sep 2026", endDate: "31 Dec 2026", allocation: 60, fit: 81,
    status: "Budget check", priority: "Normal", ageHours: 29, slaHours: 72,
    budgetCoverage: 82, margin: 29.4, capacityAvailable: 80, requestedBy: "Farah Khan", staffer: "Maya Patel",
    requirements: ["Financial Services Cloud", "Wealth management", "FSC Accredited Professional preferred"],
    fitEvidence: ["Relevant wealth implementation", "80% available for requested dates", "Capability reviewed 18 Aug 2026"],
    warnings: ["Only 82% of requested effort is covered by the approved budget."],
    history: [
      { label: "Budget coverage warning raised", detail: "Today · 07:16 · Resource360" },
      { label: "Request submitted", detail: "21 Aug · 08:02 · Farah Khan" },
    ],
  },
  {
    id: "SR-1821", candidate: "Vihaan Iyer", initials: "VI", role: "Technical Architect",
    engagement: "Agentforce Launch", account: "Woodgrove Bank", location: "Chennai · Hybrid",
    startDate: "23 Sep 2026", endDate: "31 Mar 2027", allocation: 40, fit: 78,
    status: "Awaiting decision", priority: "Normal", ageHours: 18, slaHours: 72,
    budgetCoverage: 100, margin: 33.6, capacityAvailable: 45, requestedBy: "Isha Menon", staffer: "Maya Patel",
    requirements: ["Salesforce architecture · SME", "Agentforce delivery", "Banking preferred"],
    fitEvidence: ["Six architecture engagements", "Banking platform delivery evidence", "45% available across request"],
    warnings: ["Agentforce project evidence has not yet been manager-reviewed."],
    history: [
      { label: "Request assigned to Maya Patel", detail: "Today · 10:14 · COE Staffing" },
      { label: "Request submitted", detail: "Today · 09:58 · Isha Menon" },
    ],
  },
];

function readRequests() {
  if (typeof window === "undefined") return initialStaffingRequests;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return initialStaffingRequests;
    const parsed = JSON.parse(stored) as StaffingRequest[];
    return Array.isArray(parsed) && parsed.length ? parsed : initialStaffingRequests;
  } catch {
    return initialStaffingRequests;
  }
}

export function useStaffingWorkflow() {
  const [requests, setRequests] = useState<StaffingRequest[]>(readRequests);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
  }, [requests]);

  function decide(id: string, decision: StaffingDecision, reason: string) {
    const timestamp = new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata",
    }).format(new Date());
    setRequests((current) => current.map((request) => request.id === id ? {
      ...request,
      status: decision,
      decisionReason: reason.trim() || (decision === "Accepted" ? "Capacity, fit and commercial controls validated." : "Request declined after governed review."),
      decidedAt: timestamp,
      history: [{ label: `Request ${decision.toLowerCase()}`, detail: `${timestamp} · Maya Patel` }, ...request.history],
    } : request));
  }

  function reset() {
    setRequests(initialStaffingRequests);
  }

  return { requests, decide, reset };
}

function WorkflowStatus({ status }: { status: StaffingStatus }) {
  const tone = status === "Accepted" ? "good" : status === "Declined" || status === "Conflict" ? "bad" : "warn";
  return <span className={`status-pill ${tone}`}><i />{status}</span>;
}

export function StaffingQueue({
  requests, onOpen, onReset,
}: {
  requests: StaffingRequest[];
  onOpen: (id: string) => void;
  onReset: () => void;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StaffingStatus | "Open" | "All">("Open");
  const results = useMemo(() => requests.filter((request) => {
    const matchesQuery = `${request.id} ${request.candidate} ${request.role} ${request.engagement}`.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = status === "All" || (status === "Open" ? !["Accepted", "Declined"].includes(request.status) : request.status === status);
    return matchesQuery && matchesStatus;
  }), [query, requests, status]);
  const openCount = requests.filter((request) => !["Accepted", "Declined"].includes(request.status)).length;
  const urgentCount = requests.filter((request) => !["Accepted", "Declined"].includes(request.status) && request.slaHours - request.ageHours <= 24).length;

  return <>
    <section className="workflow-banner">
      <div><span className="section-kicker">Working R1 workflow</span><h2>Staffing decision queue</h2><p>Review requests, validate capacity and commercial controls, then record an attributable decision.</p></div>
      <span className="demo-badge">Demo data · saved in this browser</span>
    </section>
    <section className="stat-grid">
      <article className="stat-card"><div><span>Open requests</span></div><strong>{openCount}</strong><p><b>•</b> In Maya Patel&apos;s scope</p></article>
      <article className="stat-card"><div><span>Due within 24 hours</span></div><strong>{urgentCount}</strong><p><b>!</b> Prioritized by SLA</p></article>
      <article className="stat-card"><div><span>Decisions completed</span></div><strong>{requests.length - openCount}</strong><p><b>✓</b> Persisted locally</p></article>
      <article className="stat-card"><div><span>Median fit</span></div><strong>{Math.round(requests.reduce((sum, item) => sum + item.fit, 0) / requests.length)}%</strong><p><b>↗</b> Evidence-backed factors</p></article>
    </section>
    <section className="surface data-surface workflow-table">
      <div className="filter-bar">
        <label className="inline-search"><span>⌕</span><input aria-label="Search staffing queue" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search request, candidate or engagement..." /></label>
        <label className="select-field"><span className="sr-only">Queue status</span><select value={status} onChange={(event) => setStatus(event.target.value as StaffingStatus | "Open" | "All")}><option>Open</option><option>All</option><option>Awaiting decision</option><option>Conflict</option><option>Budget check</option><option>Accepted</option><option>Declined</option></select></label>
        <span className="filter-spacer" /><button className="tertiary-button" onClick={onReset}>Reset demo</button>
      </div>
      <div className="responsive-table"><table><thead><tr><th>Priority</th><th>Request</th><th>Candidate</th><th>Engagement</th><th>Dates / effort</th><th>Fit</th><th>SLA remaining</th><th>Status</th><th /></tr></thead><tbody>{results.map((request) => {
        const remaining = request.slaHours - request.ageHours;
        return <tr key={request.id}><td><span className={`priority-tag ${request.priority.toLowerCase()}`}>{request.priority}</span></td><td><strong>{request.id}</strong><small className="table-subline">{request.role}</small></td><td><span className="person-cell"><i>{request.initials}</i><span><strong>{request.candidate}</strong><small>{request.location}</small></span></span></td><td><strong>{request.engagement}</strong><small className="table-subline">{request.account}</small></td><td>{request.startDate} – {request.endDate}<small className="table-subline">{request.allocation}% allocation</small></td><td><strong className="fit-score">{request.fit}%</strong></td><td><strong className={remaining <= 12 ? "danger-text" : ""}>{remaining}h</strong></td><td><WorkflowStatus status={request.status} /></td><td><button className="row-action" onClick={() => onOpen(request.id)}>Review <span>→</span></button></td></tr>;
      })}</tbody></table></div>
      {results.length === 0 && <div className="empty-state"><strong>No matching requests</strong><span>Change the search or queue status filter.</span></div>}
    </section>
  </>;
}

export function StaffingRequestDetail({
  request, onBack, onDecide,
}: {
  request: StaffingRequest;
  onBack: () => void;
  onDecide: () => void;
}) {
  const remaining = request.slaHours - request.ageHours;
  const closed = request.status === "Accepted" || request.status === "Declined";
  return <>
    <div className="workflow-nav"><button onClick={onBack}>← Back to staffing queue</button><span>Last revalidated · 12 minutes ago</span></div>
    <section className="record-banner workflow-record">
      <div className="record-avatar person">{request.initials}</div><div className="record-title"><span>Staffing request · {request.id}</span><h2>{request.role}</h2><p>{request.candidate} · {request.engagement}</p></div><WorkflowStatus status={request.status} />
      <div className="record-meta"><span>Fit<strong>{request.fit}%</strong></span><span>Allocation<strong>{request.allocation}%</strong></span><span>SLA remaining<strong>{remaining}h</strong></span></div>
    </section>
    {closed && <section className={`decision-outcome ${request.status.toLowerCase()}`}><span>{request.status === "Accepted" ? "✓" : "×"}</span><div><strong>Request {request.status.toLowerCase()}</strong><p>{request.decisionReason}</p><small>{request.decidedAt} · Maya Patel</small></div></section>}
    <section className="detail-grid workflow-detail-grid">
      <div>
        <article className="surface workflow-section"><div className="surface-heading"><div><span className="section-kicker">Request context</span><h2>Assignment and economics</h2></div></div><dl className="workflow-dl"><div><dt>Candidate</dt><dd>{request.candidate}</dd></div><div><dt>Engagement</dt><dd>{request.engagement}</dd></div><div><dt>Requested dates</dt><dd>{request.startDate} – {request.endDate}</dd></div><div><dt>Requested allocation</dt><dd>{request.allocation}%</dd></div><div><dt>Available capacity</dt><dd>{request.capacityAvailable}%</dd></div><div><dt>Budget coverage</dt><dd>{request.budgetCoverage}%</dd></div><div><dt>Forecast margin</dt><dd>{request.margin}%</dd></div><div><dt>Requested by</dt><dd>{request.requestedBy}</dd></div></dl></article>
        <article className="surface workflow-section"><div className="surface-heading"><div><span className="section-kicker">Explainable fit</span><h2>Requirements and evidence</h2></div><strong className="large-fit">{request.fit}% fit</strong></div><div className="evidence-columns"><div><h3>Required and preferred criteria</h3><ul>{request.requirements.map((item) => <li key={item}><i>✓</i>{item}</li>)}</ul></div><div><h3>Candidate evidence</h3><ul>{request.fitEvidence.map((item) => <li key={item}><i>✓</i>{item}</li>)}</ul></div></div>{request.warnings.map((warning) => <div className="workflow-warning" key={warning}><span>!</span><p>{warning}</p></div>)}</article>
      </div>
      <aside className="surface timeline-panel workflow-timeline"><div className="surface-heading"><div><span className="section-kicker">Governed record</span><h2>Decision history</h2></div></div><ol className="timeline">{request.history.map((item) => <li key={`${item.label}-${item.detail}`}><i /><span><strong>{item.label}</strong><small>{item.detail}</small></span></li>)}</ol><div className="decision-panel"><span>Assigned staffer</span><strong>{request.staffer}</strong><small>{closed ? "Decision recorded and immutable in this demo history." : "Capacity and budget will be revalidated on submission."}</small>{!closed && <button className="primary-button" onClick={onDecide}>Make decision <b>→</b></button>}</div></aside>
    </section>
  </>;
}

export function StaffingDecisionForm({
  request, onBack, onSubmit,
}: {
  request: StaffingRequest;
  onBack: () => void;
  onSubmit: (decision: StaffingDecision, reason: string) => void;
}) {
  const [decision, setDecision] = useState<StaffingDecision>("Accepted");
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const canSubmit = confirmed && (decision === "Accepted" || reason.trim().length >= 10);
  return <>
    <div className="workflow-nav"><button onClick={onBack}>← Back to request</button><span>{request.id} · {request.candidate}</span></div>
    <section className="form-layout decision-form-layout"><article className="surface form-surface"><div className="stepper"><span className="done">1<b>Request</b></span><i /><span className="done">2<b>Controls</b></span><i /><span className="active">3<b>Decision</b></span></div><div className="form-heading"><span className="section-kicker">Human approval checkpoint</span><h2>Accept or decline {request.id}</h2><p>Record an attributable staffing decision after reviewing the current capacity, fit and commercial controls.</p></div>
      <div className="decision-choice" role="radiogroup" aria-label="Staffing decision"><button className={decision === "Accepted" ? "active accept" : ""} onClick={() => setDecision("Accepted")} role="radio" aria-checked={decision === "Accepted"}><i>✓</i><span><strong>Accept request</strong><small>Create the committed allocation for {request.candidate}.</small></span></button><button className={decision === "Declined" ? "active decline" : ""} onClick={() => setDecision("Declined")} role="radio" aria-checked={decision === "Declined"}><i>×</i><span><strong>Decline request</strong><small>Return the demand with a governed business reason.</small></span></button></div>
      <div className="decision-fields"><label htmlFor="decision-reason"><span>Decision reason {decision === "Declined" && <b>*</b>}</span><textarea id="decision-reason" value={reason} onChange={(event) => setReason(event.target.value)} rows={4} placeholder={decision === "Accepted" ? "Optional note for the allocation history..." : "Explain why this request cannot be accepted (minimum 10 characters)..."} /></label><div className="confirmation-check"><input id="decision-confirmed" type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} aria-labelledby="decision-confirmation-label" /><span id="decision-confirmation-label"><strong>I confirm the current controls and evidence have been reviewed.</strong><small>This demo records Maya Patel and the current IST timestamp.</small></span></div></div>
      <div className="sticky-actions"><button className="secondary-button" onClick={onBack}>Cancel</button><span /><button className="primary-button" disabled={!canSubmit} onClick={() => onSubmit(decision, reason)}>Confirm {decision.toLowerCase()} <b>→</b></button></div>
    </article><aside className="surface review-rail"><div className="surface-heading"><div><span className="section-kicker">Submission pre-check</span><h2>Current controls</h2></div></div><ul className="check-list"><li className={request.capacityAvailable >= request.allocation ? "pass" : "warn"}><i>{request.capacityAvailable >= request.allocation ? "✓" : "!"}</i><span><strong>Capacity validation</strong><small>{request.capacityAvailable}% available for {request.allocation}% request</small></span></li><li className={request.budgetCoverage === 100 ? "pass" : "warn"}><i>{request.budgetCoverage === 100 ? "✓" : "!"}</i><span><strong>Approved budget coverage</strong><small>{request.budgetCoverage}% of requested effort</small></span></li><li className="pass"><i>✓</i><span><strong>Fit evidence current</strong><small>{request.fit}% match · protected attributes excluded</small></span></li><li className="pass"><i>✓</i><span><strong>Human decision owner</strong><small>Maya Patel · COE Staffer</small></span></li></ul><div className="policy-box"><span>Active policy</span><strong>Resource360 staffing v1.0</strong><small>Every decision retains policy, actor, timestamp and reason.</small></div></aside></section>
  </>;
}
