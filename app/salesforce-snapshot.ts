import { useEffect, useMemo, useState } from "react";

export type SnapshotKpi = { code: string; label: string; value: number; target: number; unit: string; status: string; definition: string; ownerRole?: string; date?: string };
export type CapacitySnapshot = { key: string; label: string; role: string; portfolio: string; subPortfolio: string; workDate: string; standardHours: number; allocatedHours: number; remainingHours: number; overageHours: number; utilizationPercent: number; state: string; allocationCount: number; approvedOverallocation: boolean; pendingApprovalCount: number; reconciledAt: string };
export type ForecastSnapshot = { week: string; coveragePercent: number; availableHours: number; committedHours: number; demandHours: number; rollOffHours: number; benchHours: number; overallocatedHours: number; status: string };
export type ProjectSnapshot = { key: string; name: string; account: string; portfolio: string; status: string; lifecycle: string; completionPercent: number; startDate: string; endDate: string; forecastCompletionDate: string; scheduleVarianceDays: number; acceptanceFirstPassPercent: number; csatScore: number; npsScore: number; accountHealthScore: number; releaseCount: number; incidentCount: number; mandatorySkillCoveragePercent: number; roleReadinessPercent: number; riskExposureScore: number; highRiskAgeDays: number; planActualVariancePercent: number; approvedRevenue: number; approvedCost: number; approvedMarginPercent: number; forecastRevenue: number; forecastCost: number; forecastMarginPercent: number; marginErosionPoints: number; estimateToComplete: number; estimateAtCompletion: number; forecastAccuracyPercent: number };

export type SalesforceSnapshot = {
  schemaVersion: number;
  classification: "SANITIZED_DEMO_ONLY";
  generatedAt: string;
  source: { system: string; org: string; mode: string; syncCadence: string; dataCutoff: string; policyVersion: string };
  counts: Record<string, number>;
  kpis: SnapshotKpi[];
  capacity: CapacitySnapshot[];
  forecast: ForecastSnapshot[];
  projects: ProjectSnapshot[];
  portfolios: { key: string; name: string; account: string; status: string; projects: number }[];
  staffing: { byState: Record<string, number>; averageTimeToFillDays: number; averageShortlist: number };
  commercial: Record<string, number>;
  delivery: Record<string, number>;
  unavailability: { key: string; resource: string; type: string; startDate: string; endDate: string; hoursPerDay: number; status: string; source: string }[];
  quality: { guardrailBreaches: number; pendingCapacityApprovals: number; forecastWeeks: number; snapshotRecords: number };
};

type SnapshotState = { snapshot: SalesforceSnapshot | null; loading: boolean; error: string | null; freshness: string };

function freshnessFor(generatedAt: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(generatedAt).getTime()) / 60_000));
  if (minutes < 2) return "just published";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return hours < 48 ? `${hours}h ago` : `${Math.floor(hours / 24)}d ago`;
}

function isSnapshot(value: unknown): value is SalesforceSnapshot {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<SalesforceSnapshot>;
  return item.schemaVersion === 2 && item.classification === "SANITIZED_DEMO_ONLY" && Array.isArray(item.capacity) && Array.isArray(item.forecast) && Array.isArray(item.projects) && Boolean(item.source?.dataCutoff);
}

export function useSalesforceSnapshot(): SnapshotState {
  const [snapshot, setSnapshot] = useState<SalesforceSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${import.meta.env.BASE_URL}data/salesforce-snapshot.json`, { cache: "no-store", signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Snapshot request returned ${response.status}`);
        return response.json();
      })
      .then((value: unknown) => {
        if (!isSnapshot(value)) throw new Error("Snapshot contract validation failed");
        setSnapshot(value);
        setError(null);
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Snapshot unavailable");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  const freshness = useMemo(() => snapshot ? freshnessFor(snapshot.generatedAt) : loading ? "loading" : "unavailable", [loading, snapshot]);
  return { snapshot, loading, error, freshness };
}

export function displayMetric(value: number, unit: string) {
  if (unit === "Percent") return `${value.toFixed(1)}%`;
  if (unit === "Currency") return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", notation: "compact", maximumFractionDigits: 1 }).format(value);
  if (unit === "Hours") return `${value.toLocaleString("en-IN")}h`;
  if (unit === "Days") return `${value.toFixed(1)}d`;
  if (unit === "Ratio") return value.toFixed(2);
  if (unit === "Points") return `${value.toFixed(1)}pt`;
  return value.toLocaleString("en-IN");
}
