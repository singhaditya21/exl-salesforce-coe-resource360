# Resource 360 Salesforce environment

## Environment contract

- **Permanent org:** Resource 360
- **Salesforce edition:** Developer Edition
- **Role:** Repository development org and Dev Hub
- **Local CLI alias:** `Resource360Hub`
- **Source of truth:** This GitHub repository
- **Salesforce metadata root:** `force-app/main/default`
- **API version:** 67.0

The permanent org is the shared target for integration and demo validation. Its Lightning application developer name is `Resource360`, and the native workspace tab is `Resource360_Workspace`. Disposable scratch orgs may be created from `config/project-scratch-def.json` for isolated feature work; they do not replace the permanent org.

## Local setup or recovery

From the repository root:

```bash
sf org login web --alias Resource360Hub --instance-url https://login.salesforce.com
sf config set target-org=Resource360Hub target-dev-hub=Resource360Hub
sf org display --target-org Resource360Hub
sf project deploy start --source-dir force-app --target-org Resource360Hub --test-level RunSpecifiedTests --tests Resource360ServiceTest --wait 30
sf org assign permset --name Resource360_Administrator --target-org Resource360Hub
sf apex run --target-org Resource360Hub --file scripts/apex/seedResource360.apex
sf org open --target-org Resource360Hub --path /lightning/app/c__Resource360
```

The alias and defaults are machine-local. The committed Salesforce DX files make the intended relationship portable, while Salesforce CLI authentication stays outside Git.

## Change discipline

1. Build and review Salesforce metadata in `force-app/main/default`.
2. Validate in a scratch org or the Resource 360 Developer Edition as appropriate.
3. Commit metadata and configuration changes through a pull request.
4. Never commit access tokens, passwords, auth URLs, private keys, usernames, org IDs, or files from `.sf/` and `.sfdx/`.

GitHub Pages continues to host the sanitized React companion. Salesforce is the system of record and native application platform; browser storage remains demo-only.

## Validation contract

Before merging Salesforce metadata, run:

```bash
pnpm sf:validate
pnpm sf:test
```

The deployment validation must succeed with `Resource360ServiceTest`, all business formulas must reconcile against their documented examples, the screen catalogue must contain 103 unique IDs, and no org authentication artifact may appear in Git.
