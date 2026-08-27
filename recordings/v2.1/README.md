# Resource 360 live-interaction masters v2.1

This recording baseline replaces the still-frame v2.0 Masters 01 and 02 with continuous footage captured from the authenticated Salesforce Developer Org. Every governed screen contains a visible interaction and outcome: filters, record selection, drill-downs, validation actions, acknowledgement or version comparison.

## Build

```bash
node recordings/v2.1/build-live-master.mjs recordings/v2.1/master-01.config.mjs
node recordings/v2.1/build-live-master.mjs recordings/v2.1/master-02.config.mjs
```

The build creates narrated 1080p H.264/AAC masters, embedded English captions, WebVTT sidecars, posters, timelines, contact sheets and machine-readable QA reports. Raw browser captures and intermediate audio/video are intentionally ignored; the authored configuration, narration, title slides and published media remain reproducible.

## Capture contract

- Authenticated Salesforce Lightning is the recorded product surface.
- `Demo User` masks the authenticated administrator identity in recording mode.
- Browser chrome, credentials and unrelated tabs are excluded.
- The data is fictional and sanitized.
- Salesforce remains the transactional system of record; GitHub Pages presents the synchronized read-only recording library.
