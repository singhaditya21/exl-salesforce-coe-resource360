import { useEffect, useMemo, useState } from "react";
import type { StaffingRequest } from "./staffing-workflow";

export type DemoRole = "Practitioner" | "Reporting Manager" | "Project Manager" | "COE Staffer" | "Budget Approver" | "Administrator";
export type BudgetState = "Draft" | "Pending approval" | "Approved" | "Rejected";
export type ClaimState = "Pending" | "Approved" | "Rejected";
export type TimeState = "Draft" | "Submitted" | "Approved" | "Rejected";

export type DemoBudget = {
  id: string; engagement: string; version: number; state: BudgetState; revenue: number;
  baseLabour: number; uplift: number; effortContingency: number; expenseContingency: number;
  travelRate: number; onsiteMonths: number; plannedHours: number; currency: "INR";
  submittedBy?: string; decisionNote?: string;
};

export type DemoPerson = {
  id: string; name: string; initials: string; title: string; tower: string; location: string;
  availability: number; skills: { name: string; level: 1 | 2 | 3 | 4; lastUsed: string }[];
  credentials: { name: string; state: "Verified" | "Maintenance due" | "Expired"; verifiedAt: string }[];
};

export type DemoSkillClaim = {
  id: string; personId: string; capability: string; requestedLevel: 1 | 2 | 3 | 4;
  approvedLevel?: 1 | 2 | 3 | 4; evidence: string; state: ClaimState; submittedAt: string; decisionNote?: string;
};

export type DemoAllocation = {
  id: string; requestId: string; employee: string; role: string; engagement: string;
  startDate: string; endDate: string; allocation: number; classification: string; state: "Accepted";
};

export type DemoTimesheet = {
  id: string; employee: string; allocationId: string; engagement: string; week: string;
  hours: number[]; state: TimeState; note?: string;
};

export type DemoNotification = { id: string; title: string; detail: string; time: string; read: boolean; severity: "Normal" | "High" };
export type DemoAuditEvent = { id: string; action: string; entity: string; actor: string; role: DemoRole; time: string; detail: string };

export type DemoState = {
  version: 2;
  signedIn: boolean;
  activeRole: DemoRole;
  budgets: DemoBudget[];
  people: DemoPerson[];
  claims: DemoSkillClaim[];
  allocations: DemoAllocation[];
  timesheets: DemoTimesheet[];
  notifications: DemoNotification[];
  audit: DemoAuditEvent[];
};

const STORAGE_KEY = "exl-resource360-demo-v2";
const roleNames = ["Beginner", "Intermediate", "Advanced", "SME"];

function now() {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date());
}

export function calculateBudget(budget: DemoBudget) {
  const burdenedLabour = budget.baseLabour * (1 + budget.uplift / 100) * (1 + budget.effortContingency / 100);
  const travel = budget.onsiteMonths * budget.travelRate * (1 + budget.expenseContingency / 100);
  const totalCost = burdenedLabour + travel;
  const grossMargin = budget.revenue - totalCost;
  return {
    burdenedLabour,
    travel,
    totalCost,
    grossMargin,
    marginPercent: budget.revenue > 0 ? (grossMargin / budget.revenue) * 100 : 0,
    blendedCost: budget.plannedHours > 0 ? totalCost / budget.plannedHours : 0,
  };
}

export function fitForPerson(person: DemoPerson, capability: string, requiredLevel = 3) {
  const skill = person.skills.find((item) => item.name.toLowerCase().includes(capability.toLowerCase()));
  const proficiency = skill ? Math.min(skill.level / requiredLevel, 1) : 0;
  const credential = person.credentials.some((item) => item.state === "Verified") ? 1 : 0;
  const availability = Math.min(person.availability / 40, 1);
  return Math.round((proficiency * .65 + credential * .2 + availability * .15) * 100);
}

export const initialDemoState: DemoState = {
  version: 2,
  signedIn: true,
  activeRole: "COE Staffer",
  budgets: [
    { id: "BUD-1004", engagement: "Global Retail Cloud", version: 4, state: "Approved", revenue: 84_000_000, baseLabour: 51_500_000, uplift: 5, effortContingency: 3, expenseContingency: 2, travelRate: 180_000, onsiteMonths: 6, plannedHours: 11680, currency: "INR", decisionNote: "Approved under the ≥30% route." },
    { id: "BUD-1003", engagement: "Claims Modernization", version: 3, state: "Pending approval", revenue: 69_000_000, baseLabour: 43_800_000, uplift: 5, effortContingency: 4, expenseContingency: 3, travelRate: 165_000, onsiteMonths: 7, plannedHours: 9640, currency: "INR", submittedBy: "Arjun Shah" },
    { id: "BUD-1002", engagement: "Integration Factory", version: 3, state: "Draft", revenue: 36_000_000, baseLabour: 24_000_000, uplift: 4, effortContingency: 5, expenseContingency: 2, travelRate: 150_000, onsiteMonths: 4, plannedHours: 5820, currency: "INR" },
  ],
  people: [
    { id: "EXL-018462", name: "Aarav Mehta", initials: "AM", title: "Data Cloud Architect", tower: "Data & AI", location: "Bengaluru", availability: 40, skills: [{ name: "Data Cloud", level: 4, lastUsed: "Aug 2026" }, { name: "Architecture", level: 4, lastUsed: "Jul 2026" }, { name: "Retail", level: 3, lastUsed: "Aug 2026" }], credentials: [{ name: "Salesforce Data Cloud Consultant", state: "Verified", verifiedAt: "12 Aug 2026" }] },
    { id: "EXL-017091", name: "Riya Sen", initials: "RS", title: "Service Cloud Lead", tower: "Service", location: "Pune", availability: 35, skills: [{ name: "Service Cloud", level: 4, lastUsed: "Aug 2026" }, { name: "Financial Services", level: 3, lastUsed: "Jun 2026" }], credentials: [{ name: "Service Cloud Consultant", state: "Verified", verifiedAt: "06 Aug 2026" }] },
    { id: "EXL-019830", name: "Kabir Rao", initials: "KR", title: "MuleSoft Developer", tower: "Integration", location: "Hyderabad", availability: 100, skills: [{ name: "MuleSoft", level: 3, lastUsed: "Aug 2026" }, { name: "API-led Connectivity", level: 3, lastUsed: "Jul 2026" }], credentials: [{ name: "MuleSoft Developer", state: "Verified", verifiedAt: "15 Aug 2026" }] },
    { id: "EXL-016225", name: "Meera Nair", initials: "MN", title: "FSC Consultant", tower: "Industry", location: "Mumbai", availability: 80, skills: [{ name: "Financial Services Cloud", level: 3, lastUsed: "Aug 2026" }, { name: "Wealth Management", level: 3, lastUsed: "Aug 2026" }], credentials: [{ name: "FSC Accredited Professional", state: "Maintenance due", verifiedAt: "18 May 2026" }] },
    { id: "EXL-013884", name: "Vihaan Iyer", initials: "VI", title: "Technical Architect", tower: "Platform", location: "Chennai", availability: 45, skills: [{ name: "Architecture", level: 4, lastUsed: "Aug 2026" }, { name: "Agentforce", level: 2, lastUsed: "Jul 2026" }], credentials: [{ name: "System Architect", state: "Verified", verifiedAt: "09 Aug 2026" }] },
  ],
  claims: [
    { id: "CLM-2201", personId: "EXL-019830", capability: "API-led Connectivity", requestedLevel: 4, evidence: "Integration Factory architecture and delivery evidence", state: "Pending", submittedAt: "21 Aug 2026" },
  ],
  allocations: [
    { id: "AL-1201", requestId: "SR-1701", employee: "Riya Sen", role: "Service Cloud Lead", engagement: "Claims Modernization", startDate: "01 Aug 2026", endDate: "30 Nov 2026", allocation: 50, classification: "Billing", state: "Accepted" },
  ],
  timesheets: [
    { id: "TS-3401", employee: "Riya Sen", allocationId: "AL-1201", engagement: "Claims Modernization", week: "17–23 Aug 2026", hours: [8, 8, 8, 8, 8, 0, 0], state: "Submitted" },
  ],
  notifications: [
    { id: "NTF-1", title: "Staffing decision due", detail: "SR-1842 reaches SLA in six hours", time: "18 minutes ago", read: false, severity: "High" },
    { id: "NTF-2", title: "Budget approval required", detail: "Claims Modernization · Budget v3", time: "1 hour ago", read: false, severity: "High" },
    { id: "NTF-3", title: "Capability claim awaiting review", detail: "Kabir Rao · API-led Connectivity", time: "3 hours ago", read: false, severity: "Normal" },
  ],
  audit: [
    { id: "AUD-1", action: "BUDGET_SUBMITTED", entity: "BUD-1003", actor: "Arjun Shah", role: "Project Manager", time: "21 Aug 2026, 4:42 pm", detail: "Budget v3 routed for approval" },
    { id: "AUD-2", action: "SKILL_CLAIM_SUBMITTED", entity: "CLM-2201", actor: "Kabir Rao", role: "Practitioner", time: "21 Aug 2026, 2:05 pm", detail: "Requested SME proficiency" },
  ],
};

function readState() {
  if (typeof window === "undefined") return initialDemoState;
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (!value) return initialDemoState;
    const parsed = JSON.parse(value) as DemoState;
    return parsed.version === initialDemoState.version ? parsed : initialDemoState;
  } catch {
    return initialDemoState;
  }
}

export function useDemoSystem() {
  const [state, setState] = useState<DemoState>(readState);
  useEffect(() => window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)), [state]);

  function transact(action: string, entity: string, detail: string, mutate: (current: DemoState) => DemoState, notification?: Omit<DemoNotification, "id" | "time" | "read">) {
    setState((current) => {
      const next = mutate(current);
      const time = now();
      const audit: DemoAuditEvent = { id: `AUD-${Date.now()}`, action, entity, actor: "Maya Patel", role: current.activeRole, time, detail };
      return { ...next, audit: [audit, ...next.audit], notifications: notification ? [{ ...notification, id: `NTF-${Date.now()}`, time: "Just now", read: false }, ...next.notifications] : next.notifications };
    });
  }

  function setRole(role: DemoRole) { setState((current) => ({ ...current, activeRole: role })); }
  function setSignedIn(signedIn: boolean) { setState((current) => ({ ...current, signedIn })); }
  function markNotificationsRead() { setState((current) => ({ ...current, notifications: current.notifications.map((item) => ({ ...item, read: true })) })); }

  function updateBudget(id: string, patch: Partial<Pick<DemoBudget, "revenue" | "baseLabour" | "uplift" | "effortContingency" | "expenseContingency" | "travelRate" | "onsiteMonths" | "plannedHours">>) {
    transact("BUDGET_SAVED", id, "Draft assumptions recalculated", (current) => ({ ...current, budgets: current.budgets.map((item) => item.id === id ? { ...item, ...patch, state: "Draft", version: item.state === "Approved" ? item.version + 1 : item.version } : item) }));
  }
  function submitBudget(id: string) {
    transact("BUDGET_SUBMITTED", id, "Budget routed under the active margin policy", (current) => ({ ...current, budgets: current.budgets.map((item) => item.id === id ? { ...item, state: "Pending approval", submittedBy: "Maya Patel" } : item) }), { title: "Budget submitted", detail: `${id} is awaiting an attributable decision`, severity: "Normal" });
  }
  function decideBudget(id: string, decision: "Approved" | "Rejected", note: string) {
    transact(`BUDGET_${decision.toUpperCase()}`, id, note || `${decision} in demo workflow`, (current) => ({ ...current, budgets: current.budgets.map((item) => item.id === id ? { ...item, state: decision, decisionNote: note || `${decision} by Maya Patel` } : item) }), { title: `Budget ${decision.toLowerCase()}`, detail: `${id} · ${note || "Decision recorded"}`, severity: decision === "Rejected" ? "High" : "Normal" });
  }

  function submitClaim(personId: string, capability: string, requestedLevel: 1 | 2 | 3 | 4, evidence: string) {
    const id = `CLM-${Date.now().toString().slice(-6)}`;
    transact("SKILL_CLAIM_SUBMITTED", id, `${capability} · ${roleNames[requestedLevel - 1]}`, (current) => ({ ...current, claims: [{ id, personId, capability, requestedLevel, evidence, state: "Pending", submittedAt: now() }, ...current.claims] }), { title: "Capability claim submitted", detail: `${capability} is pending manager review`, severity: "Normal" });
  }
  function decideClaim(id: string, decision: "Approved" | "Rejected", approvedLevel: 1 | 2 | 3 | 4, note: string) {
    transact(`SKILL_CLAIM_${decision.toUpperCase()}`, id, note || decision, (current) => {
      const claim = current.claims.find((item) => item.id === id);
      const claims = current.claims.map((item) => item.id === id ? { ...item, state: decision, approvedLevel: decision === "Approved" ? approvedLevel : undefined, decisionNote: note } : item);
      const people = decision === "Approved" && claim ? current.people.map((person) => person.id === claim.personId ? { ...person, skills: [...person.skills.filter((item) => item.name !== claim.capability), { name: claim.capability, level: approvedLevel, lastUsed: "Aug 2026" }] } : person) : current.people;
      return { ...current, claims, people };
    }, { title: `Capability claim ${decision.toLowerCase()}`, detail: `${id} · ${note || "Decision recorded"}`, severity: decision === "Rejected" ? "High" : "Normal" });
  }

  function commitAllocation(request: StaffingRequest) {
    if (state.allocations.some((item) => item.requestId === request.id)) return;
    const allocation: DemoAllocation = { id: `AL-${Date.now().toString().slice(-6)}`, requestId: request.id, employee: request.candidate, role: request.role, engagement: request.engagement, startDate: request.startDate, endDate: request.endDate, allocation: request.allocation, classification: "Billing", state: "Accepted" };
    transact("ALLOCATION_COMMITTED", allocation.id, `${request.candidate} · ${request.allocation}%`, (current) => ({ ...current, allocations: [allocation, ...current.allocations], timesheets: [{ id: `TS-${Date.now().toString().slice(-6)}`, employee: request.candidate, allocationId: allocation.id, engagement: request.engagement, week: "24–30 Aug 2026", hours: [0, 0, 0, 0, 0, 0, 0], state: "Draft" }, ...current.timesheets] }), { title: "Allocation committed", detail: `${request.candidate} can now record eligible time`, severity: "Normal" });
  }

  function updateTimesheet(id: string, day: number, hours: number) { setState((current) => ({ ...current, timesheets: current.timesheets.map((item) => item.id === id ? { ...item, hours: item.hours.map((value, index) => index === day ? Math.max(0, Math.min(24, hours)) : value), state: "Draft" } : item) })); }
  function submitTimesheet(id: string) { transact("TIME_SUBMITTED", id, "Weekly time submitted", (current) => ({ ...current, timesheets: current.timesheets.map((item) => item.id === id ? { ...item, state: "Submitted" } : item) }), { title: "Timesheet submitted", detail: `${id} is ready for manager review`, severity: "Normal" }); }
  function decideTimesheet(id: string, decision: "Approved" | "Rejected", note = "") { transact(`TIME_${decision.toUpperCase()}`, id, note || decision, (current) => ({ ...current, timesheets: current.timesheets.map((item) => item.id === id ? { ...item, state: decision, note } : item) }), { title: `Timesheet ${decision.toLowerCase()}`, detail: `${id} · ${note || "Decision recorded"}`, severity: decision === "Rejected" ? "High" : "Normal" }); }

  function reset() { setState(initialDemoState); }
  const unread = useMemo(() => state.notifications.filter((item) => !item.read).length, [state.notifications]);
  return { state, unread, setRole, setSignedIn, markNotificationsRead, updateBudget, submitBudget, decideBudget, submitClaim, decideClaim, commitAllocation, updateTimesheet, submitTimesheet, decideTimesheet, reset };
}

export type DemoSystem = ReturnType<typeof useDemoSystem>;
