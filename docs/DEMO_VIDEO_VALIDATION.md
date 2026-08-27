# Resource360 demo video validation

## Decision

The immutable `resource360-demo-v3.0-complete-suite` baseline was completed on 27 August 2026. Twelve narrated masters run for 149:55. Masters 01–11 cover all 103 governed Salesforce screens exactly once; Master 12 adds a 17-stage overlapping Executive Golden Path across decisive Salesforce lifecycle states and the synchronized Pages publication-lineage view. Masters 03–12 contain 106 new interaction stages, including the 89 screens that were not covered by Masters 01 and 02. Every master is 1920×1080/30 fps H.264 with AAC narration, embedded English subtitles and a WebVTT sidecar. Each stage contains actual filtering, selection, drill-down, evidence and/or visible action outcome footage. Browser chrome, unrelated tabs, session URLs, credentials and authenticated user names are excluded.

Five silent, captioned 1280×720 GitHub Pages micro-walkthroughs from 24 August 2026 remain published as explicitly labelled supplemental legacy evidence and are not counted toward master completion. All identities, engagements, economics and decisions shown are fictional. The machine-readable `manifest.json` records source surface, screen coverage, format, duration, file size, SHA-256 and validated outcome. `pnpm test:videos` fails if any of the seventeen library recordings, posters or caption files is missing, malformed, replaced or truncated, or if the v3 suite loses its 106-stage/89-unique-screen arithmetic, stream contract, frame diversity or complete contact-sheet evidence.

## Recording catalog

| Recording | Personas shown | Executed evidence | Validated outcome |
| --- | --- | --- | --- |
| `master-01-global-entry-home-access.mp4` | All personas; Administrator-operated recording | Authenticated Salesforce traversal of `GLB-01`–`GLB-06`; session verification; priority route selection; severity filter and review; governed search and practitioner drill-down; role/scope apply; preference save and guide launch | Six visually distinct global workspaces show continuous interaction and visible outcomes |
| `master-02-engagement-360.mp4` | Project Manager journey; Administrator-operated recording | Authenticated Salesforce traversal of `ENG-01`–`ENG-08`; active-project filter and selection; commercial drill-down; roster/resource drill-down; approval evidence; time-cap validation; WBS/critical path; risk acknowledgement; allocation comparison | Eight visually distinct project workspaces prove the account-to-delivery chain with record-specific interactions and outcomes |
| `master-03-staffing-demand-resource-search.mp4` | Project Manager; COE Staffer | `STFUI-01`–`STFUI-12`; approved demand, availability, resource schedule, multidimensional requirement, explainable shortlist, classification and Gantt review | Demand becomes a governed, evidence-backed candidate plan with outcome-specific actions |
| `master-04-staffing-decisions-allocation-capacity.mp4` | COE Staffer; HOD; Project Manager | `STFUI-13`–`STFUI-24`; request review, human decisions, effective-dated changes, import, queue, capacity and SLA | Staffing decisions retain authority, lineage and controlled over-allocation evidence |
| `master-05-skills-credentials-part-1.mp4` | Practitioner; Reporting Manager; COE Staffer | `SKLUI-01`–`SKLUI-12`; Resource 360, claims, credentials, evidence and team readiness | People, capability, credential and learning evidence remain source-owned and governed |
| `master-06-skills-credentials-part-2.mp4` | Reporting Manager; Capability Administrator; HOD | `SKLUI-13`–`SKLUI-24`; review, search, inventory, taxonomy, permissions and sync | Independent review and effective-dated capability governance are visible end to end |
| `master-07-budget-wbs-commercial-control.mp4` | Finance/PMO; Project Manager; Budget Approver | `BUDUI-01`–`BUDUI-12`; budget versions, WBS cost, EVM, contract-to-cash, submission and sequential approval | Delivery economics are reconciled, immutable after approval and traceable to commercials |
| `master-08-timesheet-actuals.mp4` | Practitioner; Reporting Manager; Timesheet Approver | `TIMEUI-01`–`TIMEUI-08`; eligible time, eight-hour validation, submission, approval, correction and exception | Actuals remain allocation-authorized, capped and versioned through manager decision |
| `master-09-command-center-forecast.mp4` | Portfolio Manager; Executive Viewer; Operations | `CMD-01`–`CMD-09`; certified KPIs, capacity, forecast, commercial, skills, quality and audit drill-downs | Executive metrics share one certified cutoff and retain source lineage |
| `master-10-administration-configuration-assurance.mp4` | Administrator; Configuration Operator; Auditor; Operations | `ADMUI-01`–`ADMUI-08`; personas, permissions, dual control, calendar, policy, source and activation assurance | Configuration and mock activation prove separation of duties and zero external calls |
| `master-11-planning-intelligence.mp4` | COE Staffer; Portfolio Manager; Administrator | `AIUI-01`–`AIUI-04`; grounded questions, recommendation evidence, scenarios and agent operations | Planning intelligence remains explainable, scope-bound and human-confirmed |
| `master-12-executive-golden-path.mp4` | Executive, portfolio, project, staffing and finance personas | 17-stage account-to-completion traversal across Salesforce, ending at synchronized `PAGES-CMD-08` | One continuous lifecycle connects account, project, commercials, talent, capacity, economics, time, KPIs and public evidence |
| `01-product-overview.mp4` | Administrator | Role-aware home, all-screen directory, command center | All 103 screen contracts are discoverable; four executive KPIs render |
| `02-skills-and-talent.mp4` | COE Staffer | Role switch, talent search, profile and claim form | Five candidates rank for MuleSoft; governed capability claim is available |
| `03-staffing-decision.mp4` | COE Staffer | Requirement, soft request, queue, review and explicit decision | `SR-1842` becomes Accepted and displays committed decision evidence |
| `04-budget-and-actuals.mp4` | Finance/PMO, Budget Approver, Practitioner, Reporting Manager | Recalculation, submission, approval, 40-hour entry and manager decision | Budget is approved; timesheet submission and approval complete |
| `05-demo-activation.mp4` | Administrator | Mock SSO, persona mapping, integrations and activation center | 18 persona mappings, 13 source contracts, six approvals and 5/5 activation render |

## Validation performed

- Master 01 reports H.264 video at 1920×1080/30 fps, narrated AAC audio and English subtitle streams.
- Master 01 is 187.28 seconds, 9,659,194 bytes and has SHA-256 `2f5b47cc0774e2321582fadab4725210889d11cd434153809639e93d648965bf`.
- Master 02 reports H.264 video at 1920×1080/30 fps, narrated AAC audio and English subtitle streams.
- Master 02 is 219.95 seconds, 11,847,439 bytes and has SHA-256 `d5fee2d3aab1df76785a1ef720092201b4af98924cbfbea6bdbe36bf02e93040`.
- Machine QA found 11–22 unique frames per Master 01 screen and 5–15 unique frames per Master 02 screen, above the four-state minimum used to reject static takes.
- Masters 03–12 run for 8,588.19 seconds (143:08), contain 333,556,906 video bytes, and each report H.264 1920×1080/30 fps video, AAC narration and embedded English subtitle streams; exact individual hashes are protected by `manifest.json`.
- V3 capture QA retained 2,368 raw interaction frames across 106 stages, with 5–19 distinct frames per stage against the four-state minimum.
- Dynamically sized contact sheets contain one midpoint state for the title and every scene: 13 states for each 12-screen master, nine for each eight-screen master, ten for Master 09, five for Master 11 and eighteen for Master 12.
- Contact-sheet review confirms seven operational visual archetypes, module-specific themes, route-specific titles, live evidence, filters, selection states and action outcomes rather than repeated generic answer panels.
- A tab-native capture path prevents unrelated desktop or browser content from appearing while preserving genuine Salesforce states after real selections. Recording mode replaces shell identity, publisher and user-owner names with `Demo User`, `Demo Publisher` and `Demo Project Owner`.
- Live browser interaction showed the expected role restrictions and authorized routes.
- Staffing acceptance, budget approval, time submission/approval and demo activation produced visible outcome evidence.
- The activation run displayed `5/5 passed`, `Sanitized demo only` and zero external calls.
- Browser console validation found no errors on the activation workflow.
- Every MP4 decoded without media errors; the manifest distinguishes the 1080p narrated master format from the legacy 720p format.
- Posters and video hashes are protected by the repository test suite.
- The existing browser and accessibility suite continues to exercise desktop and mobile behavior.
- Salesforce validation remains independent: the current release gate runs all 14 local test classes/66 executable methods at 91% org-wide coverage, LWC Jest, and an authenticated 103/103 Lightning route sweep with 103/103 route-specific master experiences, 44/44 declarative workbenches and zero console errors.

## Source archive note

The original 4.8 GB `RMG.zip` contains 37 MP4 requirement, meeting and walkthrough recordings. The standard macOS `unzip` utility reports a central-directory error, while 7-Zip can enumerate the video entries. This does not affect these new product recordings, which were generated from the deployed Resource360 demo and are stored as independently validated MP4 assets.

## Boundary

These recordings prove implemented demo behavior. They do not claim live EXL integrations, enterprise SSO, production data, binding legal approval or production operations. Those domains are intentionally exercised as deterministic simulations and remain outside the demo boundary.
