# Resource 360 analytics and operations contract

## Native analytics baseline

The deployable baseline uses `Resource360AnalyticsService`, eleven Salesforce custom report types/reports and the eleven-component Lightning Command Center. The reporting set covers project lifecycle, contract changes, WBS delivery, skill demand/match, staffing performance, allocations, capability supply, budgets, approved actuals, project risks and closeout readiness. This avoids inventing CRM Analytics or Tableau licensing in the Developer Edition. A licensed EXL target may add either visualization layer later without changing governed metric definitions.

| Metric/control | Authoritative population | Cutoff and drill path |
|---|---|---|
| Billed utilization | Accepted current allocations and approved actual time | Policy cutoff; portfolio → tower → engagement → allocation/time |
| WAR / IFB / blocked exposure | Current accepted unbilled allocation classifications | Current policy date; owner and age tier |
| Staffing SLA | Request lifecycle timestamps and current responsible owner | Configured lookback; portfolio → request → decision |
| Budget vs actual / EAC | Current approved budget version, approved time and captured economics | Explicit as-of date; portfolio → engagement → budget/version |
| Capability supply and gaps | Approved skill claims, verified credentials and demand criteria | Source freshness displayed; tower/capability → practitioner evidence |
| Timesheet compliance | Eligible accepted allocations, submitted/approved time and exception records | Week and policy cutoff; manager → practitioner → entry |
| Source health | Integration run cutoff, processed/success/failure/collision counts | Source and contract version → redacted row error |
| Control health | Open notifications, dead letters, scheduler runs and retention preview | Severity/owner → evidence record/correlation ID |

Every displayed KPI must expose its definition, target, source population, cutoff and drill-down. Runtime policy changes are effective-dated and do not rewrite historic decision snapshots.

## Operations

The hourly `Resource360 Operational Controls` Apex schedule expires staffing demand, updates credential state, escalates/auto-approves eligible time, maintains unbilled alerts, publishes outbox events, dispatches notifications and records an integration run. Overlap protection prevents a second active scheduler run inside the governed window. Recovery is through retry/dead-letter state and audited commands, not direct database edits.

`ADMUI-01` also provides a self-contained operational rehearsal for the demo. It validates the mock scheduler/monitoring/alert/retry/dead-letter/backup/restore/DR contract alongside identity, integration, data and approval simulations, then records a 5/5 dry-run result and correlation evidence. It performs no callout, external notification, backup mutation, restore or failover.

Production activation must select the enterprise monitoring destination, incident route, backup/restore service, Event Monitoring/SIEM design and CRM Analytics or Tableau license. Those environment choices are deliberately not encoded as fictional product completion.
