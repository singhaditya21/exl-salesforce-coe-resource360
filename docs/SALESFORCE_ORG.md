# Resource 360 Salesforce environment

## Environment contract

- **Permanent org:** Resource 360
- **Salesforce edition:** Developer Edition
- **Role:** Repository development org and Dev Hub
- **Local CLI alias:** `Resource360Hub`
- **Source of truth:** This GitHub repository
- **Salesforce metadata root:** `force-app/main/default`
- **API version:** 67.0

The permanent org is the shared target for integration and demo validation. Disposable scratch orgs may be created from `config/project-scratch-def.json` for isolated feature work; they do not replace the permanent org.

## Local setup or recovery

From the repository root:

```bash
sf org login web --alias Resource360Hub --instance-url https://login.salesforce.com
sf config set target-org=Resource360Hub target-dev-hub=Resource360Hub
sf org display --target-org Resource360Hub
```

The alias and defaults are machine-local. The committed Salesforce DX files make the intended relationship portable, while Salesforce CLI authentication stays outside Git.

## Change discipline

1. Build and review Salesforce metadata in `force-app/main/default`.
2. Validate in a scratch org or the Resource 360 Developer Edition as appropriate.
3. Commit metadata and configuration changes through a pull request.
4. Never commit access tokens, passwords, auth URLs, private keys, usernames, org IDs, or files from `.sf/` and `.sfdx/`.

GitHub Pages continues to host the sanitized React demonstration. Salesforce is the system of record and native platform for the production-oriented implementation; browser storage remains demo-only.
