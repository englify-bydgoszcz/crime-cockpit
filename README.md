# Crime Cockpit

Living frontend source for the Crime Cockpit project.

## Reading Club — auto-sync contract

Every substantive owner reading update should trigger a spoiler-bounded checkpoint transaction: conversation and note capture, verified exact-edition page boundary, characters and relationships, recall/dossiers, portrait readiness or generation, versioned Google Drive assets, and verification of written data. The owner should not have to operate a manual tagging workflow.

- [Full Reading Club Auto-Sync Contract](docs/reading-club-autosync.md)
- [Repository agent instructions](AGENTS.md)
- [Existing Apps Script character/edition module integration](apps-script/character-modules-hotfix.md)

**Current implementation boundary:** GitHub Pages Lite is still read-only; on-site ChatGPT-style conversations and automatic Google Sheets/Drive writeback require an authenticated backend. A queue entry marked READY FOR GENERATION is **not a finished image**.

## Asset policy

Google Drive remains the **canonical master store** for character portraits and other generated reading assets. Asset identity, progress gate, provenance, version and SHA256 live in the operational Google Sheet.

### Portrait delivery

Direct Google Drive thumbnail URLs are not reliable enough as the only browser delivery path across desktop/mobile/in-app browsers. Production therefore uses a two-tier presentation route:

`Google Drive master → lightweight derived web cache → frontend`

- The Drive PNG is the canonical source of truth.
- The frontend may embed a small compressed JPEG derivative keyed only by `Character ID` for robust display.
- The derivative is presentation-only and may always be regenerated from the canonical Drive master.
- If no web-cache derivative exists, the frontend falls back to the Drive File ID/URL delivered by the API.
- Generated visual filler never becomes evidence and never changes character facts, scoring, suspicion, or spoiler state.

This keeps browser rendering stable without turning the repository copy into a second canonical asset registry.

## Location assets

Location imagery follows a stricter rule: no image is created or attached merely from a place name. The live `Location Assets` registry stores future provenance/rights/gate metadata. Fictional or ambiguous locations remain schematic STORY-SPACE unless independently grounded.
