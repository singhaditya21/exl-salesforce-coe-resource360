# Resource360 demo video validation

## Decision

The v2.1 live-interaction baseline was completed on 27 August 2026. Master 01 is a 3:07 authenticated Salesforce recording covering `GLB-01` through `GLB-06`. Master 02 is a 3:40 authenticated Salesforce recording covering `ENG-01` through `ENG-08`. Both are 1920×1080, 30 fps H.264 recordings with AAC narration, embedded English subtitles and WebVTT sidecars. Unlike the superseded still-dominant v2.0 cuts, every v2.1 screen contains continuous footage with visible filtering, record selection, drill-down, action and/or outcome evidence. Browser chrome, unrelated tabs, session URLs, credentials and authenticated user names are excluded.

Five silent, captioned 1280×720 GitHub Pages micro-walkthroughs from 24 August 2026 remain published as explicitly labelled legacy functional evidence while the twelve-master, 103-screen suite is completed. All identities, engagements, economics and decisions shown are fictional. The machine-readable `manifest.json` records source surface, screen coverage, format, duration, file size, SHA-256 and validated outcome. `pnpm test:videos` fails if a video, poster or WebVTT caption file is missing, malformed, replaced or truncated.

## Recording catalog

| Recording | Personas shown | Executed evidence | Validated outcome |
| --- | --- | --- | --- |
| `master-01-global-entry-home-access.mp4` | All personas; Administrator-operated recording | Authenticated Salesforce traversal of `GLB-01`–`GLB-06`; session verification; priority route selection; severity filter and review; governed search and practitioner drill-down; role/scope apply; preference save and guide launch | Six visually distinct global workspaces show continuous interaction and visible outcomes |
| `master-02-engagement-360.mp4` | Project Manager journey; Administrator-operated recording | Authenticated Salesforce traversal of `ENG-01`–`ENG-08`; active-project filter and selection; commercial drill-down; roster/resource drill-down; approval evidence; time-cap validation; WBS/critical path; risk acknowledgement; allocation comparison | Eight visually distinct project workspaces prove the account-to-delivery chain with record-specific interactions and outcomes |
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
- Contact-sheet review confirms the overview slides and fourteen specialized workspaces are visually distinct; full decode, black-frame and long-silence checks pass.
- A tab-native capture path prevents unrelated desktop or browser content from appearing while preserving genuine Salesforce states after real selections. Recording mode replaces shell identity, publisher and user-owner names with `Demo User`, `Demo Publisher` and `Demo Project Owner`.
- Live browser interaction showed the expected role restrictions and authorized routes.
- Staffing acceptance, budget approval, time submission/approval and demo activation produced visible outcome evidence.
- The activation run displayed `5/5 passed`, `Sanitized demo only` and zero external calls.
- Browser console validation found no errors on the activation workflow.
- Every MP4 decoded without media errors; the manifest distinguishes the 1080p narrated master format from the legacy 720p format.
- Posters and video hashes are protected by the repository test suite.
- The existing browser and accessibility suite continues to exercise desktop and mobile behavior.
- Salesforce validation remains independent: the current release gate runs all 14 local test classes/53 executable methods, LWC Jest, and an authenticated 103/103 Lightning route sweep with 57/57 explicit workbenches and zero console errors.

## Source archive note

The original 4.8 GB `RMG.zip` contains 37 MP4 requirement, meeting and walkthrough recordings. The standard macOS `unzip` utility reports a central-directory error, while 7-Zip can enumerate the video entries. This does not affect these new product recordings, which were generated from the deployed Resource360 demo and are stored as independently validated MP4 assets.

## Boundary

These recordings prove implemented demo behavior. They do not claim live EXL integrations, enterprise SSO, production data, binding legal approval or production operations. Those domains are intentionally exercised as deterministic simulations and remain outside the demo boundary.
