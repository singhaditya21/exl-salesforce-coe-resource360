# Resource 360 demo activation runbook

## Purpose

This runbook turns every environment-owned production dependency into a safe, visible demo simulation. It provides full demonstration coverage without contacting an EXL system, collecting credentials, asserting an EXL approval or using production data.

The shared decision is `R360-MOCK-ACTIVATION-2026-08-24`. The machine-readable definition is `contracts/resource360-governance-register.json` under `demoActivationPillars`.

## Five-pillar rehearsal

| Pillar | What the demo executes | Passing evidence | Safety boundary |
|---|---|---|---|
| Identity and SSO | Fictional Entra assertion, MFA claim, lifecycle state, group-to-permission mapping and active scope | 18 governed persona mappings and least-privilege route tests | No password, token, device ID, tenant call or real identity |
| EXL integrations | Contract/version/schema, idempotency, collision, completeness, freshness, retry and reconciliation checks | 13 `R360-MOCK-1.2` source contracts and sanitized run counts | No EXL endpoint, credential or raw payload |
| Production-like data | Seeded cross-domain population and representative volume/reconciliation profile | Fictional people, engagement, commercial, skills, budget, staffing and time records using `.invalid` identities | No employee, customer, project or commercial production record |
| Legal and business approvals | Privacy, security, accessibility, retention/legal-hold, 25-scenario UAT and cutover/recovery evidence decisions | Six explicit mock decisions, eight legal-hold-eligible rules, fictional owners and audit evidence | No claim of EXL Legal, Privacy, Security or business acceptance; deletion disabled |
| Operational controls | Scheduler, source monitoring, alert closure, retry/dead-letter, backup, restore and disaster-recovery rehearsal | Attributable dry-run record, correlation ID, 5/5 result and audit event | No external message, restore, failover or destructive action |

## Run in GitHub Pages

1. Open `ADMUI-01 — Administration landing` as Administrator or Operations.
2. Review the five activation cards and their safety boundary.
3. Select **Run complete demo activation**.
4. Confirm `5/5 passed`, a new `ACT-*` run ID, zero external calls and zero destructive actions.
5. Open the evidence routes for persona mapping, source/retention assurance, batches and operations.
6. Open `CMD-09` to confirm `DEMO_ACTIVATION_PASSED` in the browser-local audit ledger.

The browser state is local to the device and can be restored with **Reset demo**.

## Run in Salesforce

1. Open the Resource 360 Lightning app and select `ADMUI-01`.
2. Review the five rows returned by `Resource360AssuranceService.mockAssuranceSnapshot`.
3. Select **Run complete demo activation** while holding the Operations permission set.
4. Confirm a successful `R360_Integration_Run__c` with entity `DemoActivation`, commit mode `Dry Run`, processed/success counts `5/5`, zero failures and 100% completeness.
5. Confirm the correlated immutable audit event uses action `DEMO_ACTIVATION_PASSED`.

The same rehearsal can be started from the command line:

```bash
sf apex run --target-org Resource360Hub --file scripts/apex/runDemoActivation.apex
```

The Apex command writes evidence only. It makes no callout and performs no data disposition.

## Acceptance criteria

- Exactly five activation pillars are present and independently understandable.
- One action moves all five from `Ready` to `Passed` and records attributable evidence.
- Source fixtures finish fresh, complete and collision-free.
- The SSO surface visibly states that authentication is simulated and collects no secret.
- Legal/retention execution remains non-destructive and legal-hold eligible.
- Six fictional legal, risk and business decisions expose owner, reference, date and explicit mock status.
- Operational evidence reports zero external calls and zero destructive actions.
- Reset restores the signed browser baseline.
- Apex, unit, contract, browser and accessibility tests cover the activation center.

## Production boundary

A passing rehearsal means the product behavior and evidence contract can be demonstrated. It does not approve or connect an EXL production org, tenant, identity, endpoint, dataset, legal decision, monitoring service, backup system or release. Those are separate environment-owned go-live inputs.
