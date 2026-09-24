# Crime Cockpit

Living frontend source for the Crime Cockpit project.

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
