# Resource 360 project-delivery golden path

## Demo contract

The permanent `Resource360Hub` Developer Edition contains an idempotent, fully linked Salesforce-native scenario for `ENG-1001 · Global Retail Cloud`. EXL identities, source responses and commercial facts are fictional; Salesforce records, permissions, sharing, transactions, audit, pages, reports and dashboard behavior are real.

The operating chain is:

**Governed intake → approved SOW/amendment/change order → budget and WBS → industry/functional/technical skill requirements → staffing decisions → current allocations → PM-controlled dynamic Gantt → approved actuals and acceptance → risk closure → independently approved project closeout.**

## Seeded traceability

| Control point | Deterministic evidence |
|---|---|
| Project | `ENG-1001`, lifecycle `Delivery`, earned completion calculated from active WBS effort |
| Commercial | Three approved versions: SOW ₹84m, amendment ₹6m and change order ₹9m; six delivery/acceptance lines mapped to work units |
| Budget | Current approved version 4, 960 planned hours, signed economics and approval lineage |
| Work plan | Seven governed `WBS-SF-*` work units, seven finish-to-start dependencies, baselines, forecasts, percent complete, milestones, deliverables, acceptance and critical-path flags |
| Skill demand | Eleven requirements: three industry, four functional and four technical, with proficiency, weight, mandatory gate, role, dates and evidence |
| Candidate evidence | Eleven persisted eligible match records with candidate level, weighted score, evidence, policy version and gap field |
| Staffing | Four accepted golden staffing requests, each mapped to a work unit and candidate, with fit scores from 91–98 |
| Allocation | Four golden current allocations plus the broader scenario allocation set; each is traceable to an accepted request and project work |
| Actuals | Two approved golden time entries mapped to WBS items; approved actuals are immutable and visible to the Project Manager through parent Timesheet sharing |
| Delivery control | Two risks, including one open high risk; a Draft closeout exposes work, acceptance, risk, time, commercial and budget blockers |
| History | The original `WBS-DC-01` compact-seed placeholder is retained as `Cancelled`, excluded from the Gantt, earned completion and closeout gates |

`Resource360GoldenPathData.ensure()` is safe to rerun. `scripts/apex/seedResource360GoldenPath.apex` reseeds only this chain; `scripts/apex/seedResource360.apex` rebuilds the complete fictional scenario.

## Salesforce experiences

- `Resource360_Executive_Home` is the Resource 360 app Home override and renders the role-aware operating workspace.
- `Resource360_Engagement_Record` is the app-specific Engagement record page with dynamic highlights, the project workbench and governed related lists.
- `resource360ProjectWorkbench` provides Week/Month/Quarter/Year zoom, baseline/forecast bars, drag-and-cascade rescheduling, critical path, WBS creation, dependencies, progress, acceptance, contract/budget traceability, risk actions and closeout gates.
- Nine native list views cover active delivery, closeout, work/acceptance, contracts, staffing, allocations and risk.
- Eleven report types and reports cover lifecycle, contract changes, WBS delivery, skill demand/match, staffing, allocations, capability supply, budgets, actuals, risk and closeout.
- `Resource 360 Command Center` contains eleven live components backed by those reports.

## Acceptance evidence

The automated demo preparation gate asserts the exact golden-path counts, portfolio scopes, explicit share matrix, eleven non-empty reports and eleven refreshed dashboard components. The controlled Login As gate opens every fictional persona, verifies positive and negative route access, and additionally executes an unchanged progress update from the real Project Manager Lightning session. The resulting `WORK_PROGRESS_UPDATED` audit event must identify `R360 Project Manager` as actor.
