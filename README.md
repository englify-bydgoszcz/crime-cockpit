# Crime Cockpit

Living frontend source for the Crime Cockpit project.

## Reading Club — auto-sync contract

**All conversations are held in ChatGPT, not in the Crime Cockpit website. The website is a read-only viewer. An embedded chatbot is explicitly out of scope.**

Every substantive owner reading update should trigger a spoiler-bounded checkpoint transaction: conversation and note capture, verified exact-edition page boundary, characters and relationships, recall/dossiers, portrait readiness or generation, versioned Google Drive assets, and verification of written data. The owner should not have to operate a manual tagging workflow.

- [Full Reading Club Auto-Sync Contract](docs/reading-club-autosync.md)
- [Repository agent instructions](AGENTS.md)
- [Existing Apps Script character/edition module integration](apps-script/character-modules-hotfix.md)

**Workflow:** conversation in ChatGPT → available connectors write and verify Google Sheets/Drive → the website displays the resulting notes, cast, portraits and recommendations. This workflow is invoked in the current ChatGPT turn, not a background agent. GitHub Pages Lite remains read-only **by design**. A queue entry marked READY FOR GENERATION is **not a finished image**.

## Recommender architecture v2

**Priority: a spectacularly capable recommendation engine, not games or UI complexity.** Multiobjective, evidence-aware selectors, an uncertainty-first early learning policy, a dedicated off-pool discovery lane, and grounded external source research live in Google Sheets and ChatGPT. The site remains a small read-only viewer.

- [Counterfactual Council v2 — implemented formulas, live selector linkages, serendipity research lane](docs/recommender-council-v2-2026-11-12.md)
- [Backend compaction and world-literature discovery audit](docs/backend-compaction-and-serendipity-2026-11-12.md)

The current book and spoiler/series gates are never overridden by novelty or a shadow score. The system must verify independent positive and counter-signals before a new pick; at low owner rating N, scenarios are heuristics rather than calibrated probabilities.

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
