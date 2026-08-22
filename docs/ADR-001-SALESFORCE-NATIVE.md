# ADR-001: Salesforce-native Resource 360

- **Status:** Accepted
- **Date:** 22 August 2026
- **Decision owner:** EXL Salesforce COE product direction

## Context

The source archive and PRD preserved Azure/FastAPI/PostgreSQL implementation evidence because it explained the legacy RMG behavior. Product direction subsequently required Resource 360 to be genuinely Salesforce based and permanently aligned with the Resource 360 Developer Edition/Dev Hub.

## Decision

Salesforce is the application and transactional system of record for Resource 360. The primary user experience is Lightning Experience, implemented with Lightning Web Components. Governed transactions run in Apex against Salesforce objects, validation rules and permission sets. GitHub remains the version-controlled source of truth, CI/CD origin and host of the sanitized static design companion.

This decision supersedes the earlier target-runtime choice in PRD section 17.3. It does not invalidate functional requirements, source-system contracts, operating rules, screen specifications, non-functional requirements or evidence provenance elsewhere in the PRD.

## Consequences

- Domain data is represented as Salesforce metadata and records, not browser state or a standalone PostgreSQL schema.
- Server-side rules, locking, audit and segregation controls live in Salesforce.
- EXL identity and upstream/downstream systems integrate through approved Salesforce interfaces and middleware patterns.
- GitHub Pages is demonstrational only and cannot handle production employee, commercial or credential data.
- Production activation requires EXL tenant connectivity, licenses, role mapping, integrations, monitoring, data migration and formal security/UAT approval; a Developer Edition proves the product implementation but is not the production tenant.
