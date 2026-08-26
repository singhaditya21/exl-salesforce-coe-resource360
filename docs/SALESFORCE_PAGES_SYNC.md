# Salesforce-to-Pages synchronization

## Operating contract

Salesforce is the transactional and analytical system of record. GitHub Pages is a read-only public demonstration companion. Synchronization is one-way and eventual: the Pages workflow runs on every `main` release, on trusted manual dispatch and hourly at minute 17.

```text
Resource 360 Developer Org
  -> authenticated GitHub Actions runner
  -> demo-account and KPI-policy allowlist
  -> identity/credential/record-ID rejection scan
  -> static data/salesforce-snapshot.json
  -> GitHub Pages
```

The browser never authenticates to Salesforce and has no write path. Interactive approvals and commands on Pages are local fictional simulations; real governed transactions run only in Lightning/Apex.

## Published population

The export fails unless it finds exactly 10 `R360_Demo__c` Accounts, 20 related Projects, 60 current demo Resources, 13 forecast weeks, 214 `R360-KPI-1.0` observations and 12 approved demo unavailability events. Related aggregate and detail queries are constrained through those flagged Accounts. Native analytics counts are constrained to the Resource 360 demo folders.

The public JSON may contain fictional Account/Project/Portfolio names, aggregate operational measures and deterministic practitioner aliases. It cannot contain Salesforce IDs, usernames, email addresses, org URLs, access/refresh tokens or SFDX authentication material. The exporter fails closed when a count or forbidden-pattern assertion fails.

## Release and recovery

The repository secret `RESOURCE360_SFDX_AUTH_URL` is available only to trusted workflows. Authentication material is written to an ephemeral runner file, used by Salesforce CLI, deleted immediately and never uploaded with the site artifact. The generated snapshot is then subjected to lint, unit/contract tests, TypeScript build, routed desktop/mobile tests and accessibility assurance before Pages deployment.

Use **Actions → Deploy Resource360 to GitHub Pages → Run workflow** for an immediate refresh. If a scheduled refresh fails, the last successful static site remains available; diagnose the failed allowlist/count, org authentication or test gate, correct Salesforce/repository state, then dispatch the workflow again. Do not weaken the allowlist or privacy scan to restore publication.

Local verification:

```bash
pnpm sf:export-pages
pnpm test
pnpm test:e2e
```

The snapshot displays its Salesforce cutoff and publication freshness on the site. Any value older than the expected hourly window is visibly stale and should not be represented as live transactional state.
