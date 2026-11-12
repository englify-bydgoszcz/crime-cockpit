# Backend Compaction + Serendipity — 2026-11-12 audit

**Status: implemented as a reversible operational cleanup and a research-only discovery expansion.** This is not a declaration that every formula and subsystem is unused or that the entire workbook is healthy.

## Canonical resources

- [Live operating Google Sheet](https://docs.google.com/spreadsheets/d/1_9kUvs64NwUfF03hmq9bjlq94eIgnaXOnjiiFgLRCrU/edit) (user's single source of truth)
- [CONTROL — Backend](https://docs.google.com/spreadsheets/d/1_9kUvs64NwUfF03hmq9bjlq94eIgnaXOnjiiFgLRCrU/edit#gid=445262425)
- [Discovery Radar + Scout](https://docs.google.com/spreadsheets/d/1_9kUvs64NwUfF03hmq9bjlq94eIgnaXOnjiiFgLRCrU/edit#gid=1366591837)
- [Discovery Balance](https://docs.google.com/spreadsheets/d/1_9kUvs64NwUfF03hmq9bjlq94eIgnaXOnjiiFgLRCrU/edit#gid=1900000107)
- [Full backup taken BEFORE edits, 2026-11-12](https://docs.google.com/spreadsheets/d/1WWaw5pap42GvHpN-S-a-1I7A4NuxuOWuNt5bl94ulZU/edit)

## Audit findings

Original: **225 existing sheets, all with data in first 25 rows; 165 had formulas** in the sampled A1:Z25 block. Being formula-based does not prove usage; being nonempty or not obviously part of website UX does not prove a tab can be deleted. Before any irreversible deletion, inspect **all** formula cross-references, sheet data beyond row 25, saved snapshots, live Apps Script moduleSpecs/core/extras, GitHub code references, owners' notes and metadata provenance. Do not delete a sheet solely because a particular frontend does not render it.

After: **226 total tabs** (one new CONTROL index), **26 visible** and **200 hidden backend modules**. Hidden sheets remain functional and formula/address/API-compatible. The new CONTROL index catalogs all names, layers, IDs, open links and deletion certification state. **0 tabs certified for physical deletion**. Approximately 25 low-importance/experimental screens are labelled REVIEW / NO DELETE for a future proven dependency audit; do not archive or eliminate user history accidentally.

**Important:** hiding changes navigation only, not Google Sheets formula execution cost, allocated cells or script traversal. Current allocated grid from metadata: **2,662,339 cells** across 226 tabs. The legacy System Scale Budget had false literal figures 104 tabs and 1,525,386 cells. It now reports **226 / 2,662,339** and **OVER INTERNAL TAB BUDGET** (architecture soft limit 120, internal stop 150). That limit is project policy, **not a Google Sheets technical tab cap**. Physical compaction needs a separate analysis of formula dependencies and Apps Script consumers before consolidation; creation of another single-purpose tab is the wrong default.

## Operational tab policy

The 26 visible sheets span operator flow, lifecycle/history, recommendation/research, spoiler/continuity, current reading, character evidence, edition/Vault/Translation Studio and integrity:
CONTROL — Backend; START — Czytaj teraz; Oceny; Profil gustu; Debrief; Baza książek; Discovery Radar; Discovery Watch; Discovery Balance; Crime Director; Lifecycle; Reading Room; Book Cast; Character Registry; Character Progress Sync; Case File Assets; Ebook Vault; Edition Registry; Translation Gateway; Polish Edition Pipeline; Reguły ciągłości; System Health; Research Refresh Queue; Source Refresh Ledger; Quality Evidence Ledger; Log rekomendacji.

Other 200 tabs stay hidden but must remain addressable for formulas and Apps Script. Never say "removed unused modules" when only hidden, and never claim this has sped up backend calculation.

## Exploration philosophy — serendipity, not randomness

Discovery should outgrow the original 109 BASE and current 268-book master without degenerating into a generic English bestseller ranking. Original inventory: **215/268 anglosphere** and **0 South Korean books** before new scout research. Country counts inform where to research, **not book quality, diversity quotas, demographic labels, or direct taste scores**.

In every research cycle, investigate at least these **orthogonal discovery paths**:
1. **Puzzle craft** / fair-play and novel clue delivery: new formal tools, illustrated evidence, case-file narratives, hard detective puzzles.
2. **Structural risk**: reverse chronology, multiple unreliable accounts, novelistic dossier, fractured time, anti-puzzle, radical genre form.
3. **Under-covered literary traditions**: Korea, Japan, Hong Kong, Polish, Francophone, Germanophone, Nordics, Hispanic, Italy and additional African/other markets; rotate when useful, not quotas.
4. **Quiet quality**: independently supported gems beneath popularity thresholds; prizes are **one signal only**, low review count is uncertainty not proof of brilliance.
5. **Constructive contradiction**: books likely to disprove one current taste hypothesis, contrast with the last reads, or illuminate a blind spot, *without reducing the probability of enjoyment to zero*.

Constrain each scout with the same series/spoiler restrictions, independently verified bibliographic/award evidence, market and language route, provenance, dated confidence, author/title duplicates including translation variants, and **why it could fail for this reader**. No automatic score boost for geographical origin, scarcity, formal oddity or an award. No crowd-score dictatorship.

### New discovery candidates (not recommended or scored for reading yet)

Existing Discovery Radar rows 35–44, J:Z new audited research fields:

| Scout | Author and book | Unusual test | Route / hard caveat |
|---|---|---|---|
| SC-001 | Uketsu — Dziwne obrazki | visual diagrams / image-borne mystery | PL 2025 confirmed, recheck ebook image legibility |
| SC-002 | Chan Ho-Kei — The Borrowed | six Hong Kong cases narrated in reverse | EN published; PL uncertain |
| SC-003 | Riku Onda — The Aosawa Murders | fractured testimony / memory | EN published; PL uncertain |
| SC-004 | Oyinkan Braithwaite — Moja siostra morduje seryjnie | black-comedy crime / tonal stretch | PL edition published |
| SC-005 | Kwei Quartey — The Missing American | Ghanaian cyber/procedural case | Emma Djan #1, recheck continuity & EN ebook |
| SC-006 | Graeme Macrae Burnet — Jego krwawe zamiary | historical trial/dossier puzzle | PL ebook and Booker shortlist |
| SC-007 | You-Jeong Jeong — The Good Son | Korean unreliable memory | EN 2018 translated, PL uncertain |
| SC-008 | Cristina Rivera Garza — The Taiga Syndrome | fairy-tale / experimental noir | separate GENRE BRIDGE, not traditional crime |
| SC-009 | Stanisław Lem — Śledztwo | anti-puzzle / epistemological crime | original PL |
| SC-010 | Olga Tokarczuk — Prowadź swój pług przez kości umarłych | morality-led crime / literary bridge | original PL; separate GENRE BRIDGE |

Data checked 2026-11-12 against public publisher/award/library sources; sources/URLs in Discovery Radar W35:W44 and **Source Refresh Ledger SR-0014…SR-0023** with class, timestamp, confidence, uncertainties and next checks.

Each scout has **independent Scout Priority for investigation**, implemented as a formula in R35:R44:
`ROUND((30×Novelty + 30×InfoGain + 20×Independent Quality Evidence + 20×Taste Stretch)/5 - 3×Data Uncertainty,0)`
These 0–5 component estimates are initial **heuristics**, not observed user-fit truth. Do not pretend a numeric value e.g. 93/100 is a predicted rating/Book Fit; it ranks *which lead warrants research*, nothing else. There is **no Book ID or read-next eligibility** until entry preflight and safe baseline evidence. The current owner reading of **Gołoborze p9** remains unchanged; do not nominate a new CURRENT. Cross-genre items remain a distinct lane.

Discovery Balance now computes new research scout count in column N, independent from Baza canonical geography. The new 10 leads include 1 Korean, 2 Japanese and 3 from Hong Kong/Ghana/Nigeria. The original canonical Baza still has zero Korean books until promotion.

Discovery Watch B3:B4 codifies source diversity, independent quality, duplicate/series lock, translation route and no forced exploration. This does NOT in itself change an existing scheduled automation's prompt or cadence. A scheduled discovery scan should read and honor these policies before future runs.

## Integrity changes made

**Seven** true FAIL conditions resolved without hiding the failed health checks:
- H-423: five newly added Book Cast entries had literal "TRUE", not native boolean, so Safe Now comparisons miscounted; fixed.
- H-426: five Character Registry Model Effect strings were inconsistent with canonical NONE policy, causing unwanted direct recommender effect alarm; normalized.
- H-464 / H-479 / H-480 / H-483 / H-529: five pending and **not-yet-created** Gołoborze portraits had empty-string Drive/asset fields but not truly blank values. Corrected those fields to actual blank; does **not** create a portrait or modify existing legitimate Drive assets.
- H-657: top-10 Polish edition production-state partition missed "PL IN PRODUCTION — NO FINAL EPUB" for The Winter Job. Added explicit T2 in production count, preserved no finished PL claim.
- H-115: n<3 warm-up invariant incorrectly flagged n=3 EARLY SIGNAL state. Its expected gate now correctly distinguishes N/A vs WARM-UP.

Actually this bullet grouping totals **9?**: H-423 (1), H-426 (1), H-464/479/480/483/529 (5), H-657 (1), H-115 (1) = **9 checks**. Original System Health 25 FAIL → **18** (7 net), because other checks may be affected by edits/recalculation; avoid claiming exact number of distinct FAILs directly fixed. Stable verified readback: **745 PASS, 3 WARN, 18 FAIL**, Overall **FAIL**. All live failures are displayed in CONTROL beneath its inventory; many involve legacy Somerset CURRENT assumptions, incomplete OPEN CASE/Read Next and spoiler/visual surface assumptions. Do not bypass them by simply relabeling red checks as PASS. Hard continuity, no spoiler leakage, and auditability take precedence over novelty.

## What NOT to do

- No deletions of live/historical tables until fully proven absent from formulas, script and owner data.
- No extra per-concept sheets or ornamental dashboards; use existing registries or a scoped new section.
- No website AI chat; ChatGPT is the only conversation interface.
- No completed-portrait claim for READY FOR GENERATION without a verified Google Drive master.
- No release of true raw owner EPUB or notes to public code; only safe metadata and source links.
- No automatic read-next promotion, Book Fit modification or series lock override from Scout Priority.
- No false "all backend verified" claim while System Health has FAIL or most base metadata requires refresh.

## Next dependency-driven compaction tranche

Audit physical references for 25 optional/low-value tabs marked REVIEW / NO DELETE in CONTROL. For each candidate, scan the **full populated grid**, formula references (including IMPORTRANGE/INDIRECT/named ranges), active Apps Script `moduleSpecs_`/readers, GitHub frontend/source/API, owner notes and historical log relevance. Decide **KEEP CORE / KEEP HIDDEN / MERGE INTO HOST / ARCHIVE THEN DELETE** with documented impact, backup, field-level migration and an end-to-end integrity smoke. A sheet with just a few cells may still be a critical policy source; do not optimize by appearances. No deletion before certified safe.

Prefer a small number of high-quality discoveries with accountable source evidence over 100 noisy unvetted suggestions. Expand genres/regions while protecting series and the reader's taste calibration.
