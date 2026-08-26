# Resource360 final demo recording storyboard

## Recording baseline

- Release tag: `resource360-demo-v2.0-recording`
- Primary runtime: Salesforce Lightning app `Resource360`
- Public companion: `https://singhaditya21.github.io/exl-salesforce-coe-resource360/`
- Data boundary: fictional EXL Salesforce COE demo data only
- Salesforce identities: eight controlled composite demo users representing eighteen governed business personas
- Public snapshot: allowlisted, build-time, read-only and free of Salesforce IDs, usernames, email addresses and credentials
- Capture standard: 1920×1080, 30 fps, 100% browser zoom, visible cursor, narration plus edited English captions

The release tag is the immutable recording source. Do not record from an uncommitted tree or from a branch ahead of that tag.

## Preflight and reset

1. Confirm the tagged commit has green quality, CodeQL and Pages deployment checks.
2. Run `pnpm sf:prepare-demo` against `Resource360Hub`.
3. Run `pnpm sf:test:personas` and retain the machine-readable eight-user result.
4. Run `pnpm sf:test:ui` and retain the 103-route/57-workbench result.
5. Export a fresh snapshot with `pnpm sf:export-pages`; confirm 10 accounts, 20 projects, 60 resources, 214 KPI observations, 13 forecast weeks and zero guardrail breaches.
6. Confirm the live Pages freshness badge and `CMD-08` cutoff match the deployed snapshot.
7. Use Salesforce Administrator **Login As** for controlled persona traversal. Do not disclose passwords, setup URLs, session URLs, record IDs or real identities.
8. Disable desktop notifications, hide bookmarks and unrelated tabs, use the fictional demo browser profile and clear browser-local Resource360 state before each transactional take.

## Recording order

Record read-only executive and synchronization paths first, then transactional paths. Run the reset again before a retake that changes staffing, budget, timesheet, configuration or project state.

### 01 — Executive product overview · 90 seconds

**Persona:** Executive Viewer  
**Surface:** Salesforce Lightning, then Pages landing screen  
**Story:** One governed Salesforce platform connects accounts, projects, commercial obligations, skills, staffing, capacity, actual effort and delivery outcomes.

Shot list:

1. Open the Salesforce Resource360 app and role-aware home.
2. Show the nine-module navigation and state that authorization reduces it by persona.
3. Open Command Center and show certified KPI cutoff, 10 accounts, 20 projects and 60 resources.
4. Show the Pages companion and its Salesforce freshness badge.
5. State the boundary: Salesforce is transactional; Pages is a sanitized synchronized public companion.

### 02 — Access, personas and negative authorization · 4 minutes

**Personas:** Administrator, Project Manager, COE Staffer, Executive Viewer  
**Surface:** Salesforce Lightning

Shot list:

1. Use controlled Login As for Project Manager and open the permitted project workbench.
2. Attempt one Administration deep link and show governed denial.
3. Use COE Staffer and show staffing/talent access.
4. Use Executive Viewer and show read-only Command Center access plus Administration denial.
5. Return to Administrator and show the 18-persona mapping and 8 controlled demo identities.

Evidence callouts: permission-set groups, portfolio/sub-portfolio scope, positive route, negative route and user-mode record visibility.

### 03 — Account-to-project delivery 360 · 6 minutes

**Persona:** Project Manager  
**Surfaces:** Salesforce Lightning first; Pages synchronized replay second

Shot list:

1. Open an account containing two projects.
2. Open one rich project 360 and show status, lifecycle, dates, project manager and portfolio lineage.
3. Show its contracts, payment milestones, project modules, work units, dependencies and risks.
4. Open the PM Gantt, move through module/work-unit progress and show completion/EVM impact.
5. Show staffing requests and accepted allocations linked to that project.
6. On Pages, select the same sanitized account/project and show synchronized commercial, delivery, skill-readiness and related-record counts.

Do not use a project with zero allocations. Use the prepared golden project or another record with contracts, payments, WBS, allocations and risks.

### 04 — Skills-to-staffing-to-capacity · 6 minutes

**Personas:** COE Staffer, HOD  
**Surfaces:** Salesforce Lightning; Pages Resource 360 for synchronized evidence

Shot list:

1. Build a role, technical skill, functional skill, industry and credential requirement.
2. Show explainable candidate ranking and eligibility reasons.
3. Create soft demand, review budget coverage and submit the request.
4. Accept the request as Staffer and show the allocation/capacity transaction.
5. Show an 8-hour fully allocated practitioner and a controlled 10-hour overallocated practitioner.
6. Show reason, approver, expiry/review date and audit evidence; confirm the 12-hour ceiling.
7. Open Pages Resource 360 and switch between two of the 60 synchronized sanitized practitioners.

### 05 — Resource availability and actual time · 4 minutes

**Personas:** Practitioner, Reporting Manager  
**Surface:** Salesforce Lightning

Shot list:

1. Open Resource 360 with portfolio/sub-portfolio membership, role, capability and credential context.
2. Show approved leave/training reducing forecast supply.
3. Enter and submit a 40-hour week against eligible allocations/work units.
4. Demonstrate the 8-hour actual-time daily cap.
5. Approve the week as Reporting Manager and show reconciliation/audit evidence.

### 06 — Budget, EVM and contract-to-cash · 5 minutes

**Personas:** Finance/PMO, Budget Approver  
**Surface:** Salesforce Lightning

Shot list:

1. Open current project budget and trace revenue/cost assumptions to immutable version.
2. Recalculate, submit and approve using the configured margin route.
3. Show approved versus forecast revenue/cost/margin, ETC, EAC, CPI and SPI.
4. Show contract and payment schedules, invoiced/paid/outstanding values, DSO and collection effectiveness.
5. Open the margin and collections exception queues.

### 07 — Command Center, forecast and native analytics · 5 minutes

**Personas:** Portfolio Manager, Executive Viewer  
**Surface:** Salesforce Lightning, then Pages Command Center

Shot list:

1. Show the twenty-component Salesforce Command Center and twenty runnable reports.
2. Drill through utilization, capacity, staffing, skills, delivery, commercial and data-quality KPIs.
3. Show all thirteen forecast weeks, approved unavailability, expected roll-offs and demand gaps.
4. Show the 60-resource heatmap and controlled over-allocation queue.
5. Repeat the sanitized aggregate views on Pages and show the exact Salesforce cutoff.

### 08 — Configuration, synchronization and assurance · 4 minutes

**Personas:** Configuration Operator, Configuration Approver, Operations, Auditor, Administrator  
**Surfaces:** Salesforce Lightning and Pages `CMD-08`

Shot list:

1. Draft a configuration change, preview its impact and submit it.
2. Show independent approval/separation of duties.
3. Open source contracts, mock integration health and retention assurance.
4. Show scheduler health, exact seeded-record reconciliation and zero capacity guardrail breaches.
5. Open Pages synchronization operations: source org, cadence, cutoff, policy and population counts.
6. Close with the five demo-activation simulations and the explicit exclusions.

## Required closing disclosure

“This is a sanitized EXL Salesforce COE demonstration. Salesforce Lightning contains the genuine metadata, Apex transactions, sharing, audit, scheduling and analytics. GitHub Pages is a read-only synchronized design companion with browser-local simulations. Production EXL integrations, enterprise SSO, production identities and data, binding legal approvals and production operations are intentionally not represented.”

## Post-production acceptance

- Replace the five legacy recordings; do not mix them with the v2.0 final suite.
- Produce MP4/H.264 video, poster and WebVTT captions for each recording.
- Update `public/demo-videos/manifest.json` with tagged commit, Salesforce cutoff, duration, dimensions, audio, SHA-256 and validated outcome.
- Run `pnpm test:videos`, `pnpm test:all`, the Salesforce persona/UI gates and the live Pages spot check.
- Verify no session URL, Salesforce record ID, username, email, browser notification or unrelated customer information appears in any frame or audio track.
