# Resource 360 project-delivery golden path

## Demo contract

The permanent `Resource360Hub` Developer Edition contains an idempotent, fully linked Salesforce-native scenario for `ENG-1001 · Global Retail Cloud` and a storage-conscious enterprise portfolio graph named `R360-SCALE-10X20-V1`. EXL identities, source responses and commercial facts are fictional; Salesforce records, permissions, sharing, transactions, audit, pages, reports and dashboard behavior are real.

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

## Enterprise scale contract

| Level | Deterministic evidence |
|---|---|
| Account hierarchy | Exactly 10 fictional enterprise Accounts, 10 account-aligned Portfolios and 20 Sub-portfolios; every Account owns one Portfolio, two Sub-portfolios and exactly two Projects |
| Delivery organization | Exactly 60 governed Resources and 60 effective-dated Delivery Memberships; every Account has six members whose membership links Account, Portfolio and Sub-portfolio |
| Project portfolio | Exactly 20 Projects across multiple industries, Salesforce towers, commercial models, health/completion states and dates; 16 are in delivery and four have independently approved closeouts |
| Commercial chain | Every Project has at least two approved contract references; every contract has exactly three dated payment milestones tied to the project, commercial evidence and deliverable/work context |
| Delivery decomposition | Exactly three Project Modules per Project and at least six active Work Units per Project, with module linkage, owners, dates, effort, progress, milestones, acceptance and finish-to-start dependencies |
| Economics | At least one current governed Budget per Project, including resource-month lines and signed approval/economic state |
| Skills and staffing | Every non-anchor Project has Industry, Functional and Technical requirements, evidence-backed match results, four staffing decisions and membership-linked allocations; the richer `ENG-1001` anchor retains eleven requirements and its controlled golden-path decisions |
| Execution evidence | Every non-anchor Project has two delivery risks and two approved actuals; Completed projects have an approved closeout and active projects retain current delivery controls |

`Resource360ScaleDemoData.ensure()` upserts this graph without deleting user data. The preparation gate independently checks the exact hierarchy and minimum relationship cardinalities, including two projects per account, six memberships per account, three modules per project, two or more contracts per project, three payments per contract and six or more active work units per project.

## Salesforce experiences

- `Resource360_Executive_Home` is the Resource 360 app Home override and renders the role-aware operating workspace.
- `Resource360_Engagement_Record` is the app-specific Engagement record page with dynamic highlights, the project workbench and governed related lists.
- `resource360ProjectWorkbench` provides governed project/initial-SOW intake, amendment/change-order and contract-line entry, Week/Month/Quarter/Year zoom, baseline/forecast bars, direct drag and duration-resize handles with successor auto-scheduling, critical path, WBS creation, dependencies, progress, acceptance, risk actions, closeout gates and independent approval actions.
- Thirteen native list views cover active delivery, closeout, work/acceptance, contracts, contract payments, modules, delivery membership, sub-portfolios, staffing, allocations and risk.
- Fifteen report types and reports cover lifecycle, portfolio hierarchy, contract changes/payment position, module/WBS delivery, skill demand/match, staffing, delivery membership capacity, allocations, capability supply, budgets, actuals, risk and closeout.
- `Resource 360 Command Center` contains fifteen live components backed by those reports.

## Acceptance evidence

The automated demo preparation gate asserts the exact golden-path counts, exact scale hierarchy, per-parent relationship cardinalities, portfolio scopes, explicit share matrix, fifteen non-empty reports and fifteen refreshed dashboard components. The controlled Login As gate opens every fictional persona, verifies positive and negative route access, and additionally proves that the Project Manager can see all 20 governed projects plus the intake/contract controls, seven direct Gantt resize handles, a governed forecast-date write and a progress update in the real Lightning session. The resulting reschedule and progress audit evidence must identify `R360 Project Manager` as actor.
