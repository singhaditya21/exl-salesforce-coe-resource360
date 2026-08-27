# Resource360 demo video validation

## Decision

The narrated v2.0 master programme started on 27 August 2026. Master 01 is an 8:05, 1920×1080, 30 fps H.264 recording with AAC narration, embedded English subtitles and a WebVTT sidecar. Its twelve source frames were captured from the authenticated Salesforce Lightning tab after real screen-rail selections covering `GLB-01` through `GLB-06`. Browser chrome, unrelated tabs, session URLs and credentials are excluded.

Five silent, captioned 1280×720 GitHub Pages micro-walkthroughs from 24 August 2026 remain published as explicitly labelled legacy functional evidence while the twelve-master, 103-screen suite is completed. All identities, engagements, economics and decisions shown are fictional. The machine-readable `manifest.json` records source surface, screen coverage, format, duration, file size, SHA-256 and validated outcome. `pnpm test:videos` fails if a video, poster or WebVTT caption file is missing, malformed, replaced or truncated.

## Recording catalog

| Recording | Personas shown | Executed evidence | Validated outcome |
| --- | --- | --- | --- |
| `master-01-global-entry-home-access.mp4` | All personas; Administrator narration | Authenticated Salesforce screen-rail traversal of `GLB-01`–`GLB-06`; overview slide; summary and workbench states | Secure entry, role-aware home, accountable notifications, governed search, effective role/scope and preferences/help are narrated and visible |
| `01-product-overview.mp4` | Administrator | Role-aware home, all-screen directory, command center | All 103 screen contracts are discoverable; four executive KPIs render |
| `02-skills-and-talent.mp4` | COE Staffer | Role switch, talent search, profile and claim form | Five candidates rank for MuleSoft; governed capability claim is available |
| `03-staffing-decision.mp4` | COE Staffer | Requirement, soft request, queue, review and explicit decision | `SR-1842` becomes Accepted and displays committed decision evidence |
| `04-budget-and-actuals.mp4` | Finance/PMO, Budget Approver, Practitioner, Reporting Manager | Recalculation, submission, approval, 40-hour entry and manager decision | Budget is approved; timesheet submission and approval complete |
| `05-demo-activation.mp4` | Administrator | Mock SSO, persona mapping, integrations and activation center | 18 persona mappings, 13 source contracts, six approvals and 5/5 activation render |

## Validation performed

- Master 01 reports H.264 video at 1920×1080/30 fps, narrated AAC audio and English subtitle streams.
- Master 01 is 485.33 seconds, 21,092,288 bytes and has SHA-256 `90937bfa20dab10595e07b648aba21ac8d427ec3013a733621a574f50b2656a4`.
- Scene-level frames confirm the opening coverage slide and each of `GLB-01` through `GLB-06`; black-frame and long-silence checks report no runs.
- A tab-native capture path prevents unrelated desktop or browser content from appearing while preserving genuine Salesforce states after real navigation selections; the authenticated display name is replaced in source frames by the fictional label `Demo User`.
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
