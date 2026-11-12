# Crime Cockpit — repository agent instructions

This file applies to all work in this repository. Refer to [Reading Club Auto-Sync Contract](docs/reading-club-autosync.md) for the authoritative event-level operating protocol.

## Primary goal

**The owner chats ONLY in ChatGPT (in this project). The Crime Cockpit website must NOT have an embedded chat.** The website is exclusively a reader-friendly, read-only presentation layer; "Klub czytelniczy" is a notebook/history view, not a chat window. ChatGPT executes eligible checkpoint updates via connected tools while responding to messages. No in-app chat or model/backend built solely to handle website messages.

A reader chats naturally about crime novels. The backend, **not the reader**, handles checkpoint identification, safe EPUB prefix verification, normalized note capture, character/relationship/location updates, image evidence, portrait generation and publication, integrity audit, and evidence-informed recommendation learning. Keep the UI minimal and the decision system advanced.

A substantive note from the owner triggers a **checkpoint sync transaction**. Do not wait for explicit instructions like "add characters", "save this note", "make portraits", "write to Sheet", or "sync the source". Ask only a small clarification if needed to avoid spoiler leakage or source mismatch. Do not assert a write, generated image, or deployed update until verified by tools.

## Canonical sources

1. Operational Google Sheet: [Ranking kryminałów](https://docs.google.com/spreadsheets/d/1_9kUvs64NwUfF03hmq9bjlq94eIgnaXOnjiiFgLRCrU).
2. Canonical documentation and conversation log: [Crime Cockpit — Dokumentacja projektu i rejestr rozmów](https://docs.google.com/document/d/18VElRdU8ty-1UarlTZzxOTzJGOgGrJolvlPb34z2VC4).
3. Owner's current EPUB / asset masters in Google Drive and their verified edition/asset records.

Re-read the live sources before meaningful modifications. **After each owner message about this project, append the corresponding decision/progress to canonical documentation** unless the owner explicitly opts out.

## Spoiler Firewall (non-negotiable)

- The last owner-confirmed **finished** page of the **exact edition** is the only permissible narrative analysis boundary for an unfinished book. Never inspect later pages or infer future identities, events, motives or visual traits.
- Historical checkpoints and evidence must remain immutable/reconstructible.
- Character records and portraits are individually gated: PUBLIC SAFE; CURRENT PROGRESS with an explicit first-safe page; POST-READ SAFE; SEALED.
- Distinguish evidence-supported physical appearance from artistic, noncanonical filler. A portrait never proves what a character canonically looks like.
- If mapping or evidence is uncertain, fail closed. Preserve anonymity where a character has no safe name.

## Portrait Autopilot

Every new safe character/appearance update must produce an asset state in the operational Sheet. If visual evidence is sufficient, queue/generate a **synthetic, fictional, spoiler-safe** portrait and upload its canonical master to Drive with ID, provenance, checkpoint gate, version and hash. Mark **DRIVE READY / API** only after successful upload+readback. Otherwise use a monogram and **PENDING — SAFE APPEARANCE** with a reason. Do not insert static owner portraits or book text into public source control. No invented faces or screenshots of actors.

## Limitations to state truthfully

The current GitHub Pages Lite is deliberately READ-ONLY and does not require a live conversational model. The interaction is ChatGPT → authenticated Sheets/Drive tool actions → read-only Apps Script feed → presentation in Crime Cockpit. Only perform and claim tool actions available in the current ChatGPT turn. A queued/generated portrait does not become a Drive-ready asset before an actual verified upload. Do not suggest building an embedded chatbot or site message write-back.

## Implementation quality

Use stable Book/Edition/Character/Event IDs, deduplicated writes, provenance, confidence, verification timestamps and stage-based success/failure outcomes. Keep model fit separate from access friction and image availability. Do not change HARD SERIES/SPOILER CONTINUITY constraints. Do not promote provisional in-reading taste signals into stable training until post-read debrief. Monitor actual provider availability, not guessed endpoints.

See [the full operating contract](docs/reading-club-autosync.md) and [existing Apps Script module notes](apps-script/character-modules-hotfix.md).
