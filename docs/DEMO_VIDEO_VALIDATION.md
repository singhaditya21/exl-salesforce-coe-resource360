# Resource360 demo video validation

## Decision

Five product walkthroughs were recorded on 24 August 2026 from the deployed GitHub Pages application at 1280×720. They are silent, captioned H.264 MP4 files because the objective is reproducible functional evidence, not narrated marketing content. All identities, engagements, economics and decisions shown are fictional.

The recordings are published on `GLB-06 · User preferences and help` from five private Salesforce static-resource bundles and stored under `public/demo-videos/` for the sanitized Pages companion. The machine-readable `manifest.json` records format, duration, file size, SHA-256 and validated outcome. `pnpm test:videos` fails if a video, poster or WebVTT caption file is missing, malformed, replaced or truncated.

## Recording catalog

| Recording | Personas shown | Executed evidence | Validated outcome |
| --- | --- | --- | --- |
| `01-product-overview.mp4` | Administrator | Role-aware home, all-screen directory, command center | All 103 screen contracts are discoverable; four executive KPIs render |
| `02-skills-and-talent.mp4` | COE Staffer | Role switch, talent search, profile and claim form | Five candidates rank for MuleSoft; governed capability claim is available |
| `03-staffing-decision.mp4` | COE Staffer | Requirement, soft request, queue, review and explicit decision | `SR-1842` becomes Accepted and displays committed decision evidence |
| `04-budget-and-actuals.mp4` | Finance/PMO, Budget Approver, Practitioner, Reporting Manager | Recalculation, submission, approval, 40-hour entry and manager decision | Budget is approved; timesheet submission and approval complete |
| `05-demo-activation.mp4` | Administrator | Mock SSO, persona mapping, integrations and activation center | 18 persona mappings, 13 source contracts, six approvals and 5/5 activation render |

## Validation performed

- Live browser interaction showed the expected role restrictions and authorized routes.
- Staffing acceptance, budget approval, time submission/approval and demo activation produced visible outcome evidence.
- The activation run displayed `5/5 passed`, `Sanitized demo only` and zero external calls.
- Browser console validation found no errors on the activation workflow.
- Every MP4 decoded without media errors and reports H.264, 1280×720 and 24 fps.
- Posters and video hashes are protected by the repository test suite.
- The existing browser and accessibility suite continues to exercise desktop and mobile behavior.
- Salesforce validation remains independent: the current release gate runs all 13 local test classes/52 executable methods, LWC Jest, and an authenticated 103/103 Lightning route sweep with 57/57 explicit workbenches and zero console errors.

## Source archive note

The original 4.8 GB `RMG.zip` contains 37 MP4 requirement, meeting and walkthrough recordings. The standard macOS `unzip` utility reports a central-directory error, while 7-Zip can enumerate the video entries. This does not affect these new product recordings, which were generated from the deployed Resource360 demo and are stored as independently validated MP4 assets.

## Boundary

These recordings prove implemented demo behavior. They do not claim live EXL integrations, enterprise SSO, production data, binding legal approval or production operations. Those domains are intentionally exercised as deterministic simulations and remain outside the demo boundary.
