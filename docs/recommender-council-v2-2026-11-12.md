# Crime Director / Counterfactual Council v2 — operating contract (2026-11-12)

## Scope / non-goals

**User instruction:** an exceptionally sophisticated, unpredictable but *intelligently surprising* crime-fiction recommender; **no gamification, reading challenges, achievements, vanity metrics, excessive dashboard screens, or embedded chatbot**. ChatGPT in this project is the only conversation/orchestration surface. Google Sheets/Drive is the operational model; existing read-only Apps Script and small GitHub Pages Lite website display verified results. Preserve model traceability and exact-edition Spoiler Firewall.

This file documents **real edits to the operational Sheet**, not an independent prediction engine hosted on GitHub. Canonical Sheet: https://docs.google.com/spreadsheets/d/1_9kUvs64NwUfF03hmq9bjlq94eIgnaXOnjiiFgLRCrU/edit . Full backup taken immediately before the v2 work: https://docs.google.com/spreadsheets/d/1agd0aLwkg90j7HqFLGiV7-Lip_N36Kl1Qmuu1PA4-8Q/edit

## Findings that explain why v2 is needed

- Prior to v2, `Decision Physics` already had **66 columns A:BN** for LCB/UCB proxies, uncertainty, confidence, robustness, vote distributions, content, experience, character bond, afterglow and translation. Rebuilding it elsewhere would duplicate fragile formulas.
- Too many candidates shared essentially the same **Information Gain (95.2)** and **Diversity (100)**. A huge row count is not the same as information.
- In the 25-candidate Council, **12 titles were Freida McFadden** (and 3 Harlan Coben), compressing author variety and crowding out other experiments.
- The user has finished only **three books** in the recorded lifecycle, with a small number of own ratings and low initial decision confidence (16/100 for many titles). **Do not assert calibrated posterior probabilities, Thompson sampling or trustworthy learned weights**.
- Some old fields (e.g. `Silnik rekomendacji v1` and `Crime Director` "NOT STARTED") held stale history. Keep legacy as an auditable archive, not a sovereign recommendation. The live controller is `Crime Director`, with immutable/current choices frozen until post-read debrief and a fresh preflight.

## Implemented v2: existing `Decision Physics` (gid 1900000053)

- Added **18 columns BO:CF**, rows **7–31**, **450 live formulas**. No new tabs.
- BO: number of read books by this candidate's author.
- BP: how many books by the same author occupy the present top-25 Council.
- BQ: independently sourced, positive quality-evidence count by exact Book ID or matched title+author (Quality Evidence Ledger). **Absence of reviews is evidence debt, not proof of low quality**.
- BR: mixed/negative counter-signal count (must remain visible).
- BS: bounded distinction/novelty heuristic for **research**, not intrinsic quality; detects unread authors, sparse author coverage, untested book country, and prior novelty.
- BT: de-saturated information value using multiple dimensions rather than the old saturated Info Gain alone. This is a *proxy for useful exploration*, not a measured mutual information estimate.
- BU: **BEST BET** utility (primarily Core Fit / reader accessibility).
- BV: **LEARNING PROBE** utility (Core Fit + BT + novelty; shrink/cap repetitive shortlist authors).
- BW: **CONTRAST** utility (Core Fit + distinction + novelty; anti-monoculture).
- BX: **EVIDENCE FIRST** utility (Core Fit + verified community + data/rating confidence; missing independent evidence gets a *research blocker*, not a book-quality score downgrade).
- BY: multi-scenario disagreement range.
- BZ: scenario-robust shadow utility = median(BU:BX) minus 10% disagreement.
- CA: shadow rank after gate check.
- CB: dated **fresh WWW preflight due** / freshness status from `Research Refresh Queue`.
- CC: actionable evidence blockers: no independent source; negative counter-signals; crowded author; severe scenario disagreement; fit exception.
- CD: `SHADOW ONLY — NO AUTOMATIC PICK` even for structurally safe candidates; `INELIGIBLE` for reading/series lock.
- CE: winning lens per candidate.
- CF: `EARLY SIGNAL / NOT A PROBABILITY` while <5 completed reads, other uncertainty states afterward.
- BO2:CF2 live, 25-candidate summary. BP crowding deliberately affects **exploration**, not Taste Fit, Community Quality or Book Fit.

### Verification

Readback after setup confirmed no broken new formula values; initial scenario leaders:
BEST BET = **Surface**; LEARNING PROBE = **Surface**; CONTRAST = **Dead Money**; EVIDENCE FIRST = **Surface**; ROBUST = **Surface**. Different selector objectives may converge when evidence supports similar choices: unpredictability is not randomness or mandatory different winners.

In `Crime Director` (gid 1900000052), the nominal live voter choices are now formula-driven:
- `E8` / DIR-01 BEST BET: best BU.
- `E9` / DIR-02 LEARNING PROBE: best BV.
- `E12` / DIR-05 CONTRAST / ANTI-RUT: best BW.
- Existing F8/F9/F12 XLOOKUP Book IDs and votes update when title changes.
- `H5` now reflects the **actual** live LEARNING PROBE nomination, `L5` explains it is a post-debrief *hypothesis*.
- `J2` is formula-driven using the latest actual `Reading Room` checkpoint: **CURRENT PICK FROZEN — Gołoborze / READING strona 9**. This is not a recommendation to start again.

**Nonnegotiable:** The committed and started current book Gołoborze (BK00114), p9, remains in progress. No shadow formula can rewrite the frozen/current reading pick, change a hard series or spoiler eligibility gate, or issue a final recommendation before the owner's finished-book debrief + a new source preflight.

### Outside top-25: genuinely novel research candidates

The top-25 alone risks filtering out unfamiliar gems even with more exploration features. Added a secondary **OFF-POOL SERENDIPITY** panel inside the existing `Decision Physics` at **A39:L53** (12 live rows). It scans `Decision Engine` ranks 26–150, keeps structurally AUTO PASS and otherwise unread candidates, applies a bounded Core/decision floor, and screens authors already highly represented in the top-25. It computes Book ID, author, score, Core Fit, exploration, discovery, country, an information-contrast proxy, independently verified quality evidence, research action and a research-only priority. This does NOT directly enter the final Director vote: no quality evidence or fresh series/preflight = research queue only.

Sample first results are **Nielubiana**, **Cień wiatru**, **Mężczyźni, którzy nienawidzą kobiet**, **Informacja zwrotna**, **Człowiek nietoperz**. These are **NOT** fresh reading recommendations and may fail a subsequent genre, series or content preflight. The point is a wider candidate search, not another forced reading plan.

## Evidence you must not flatten into a rating

Added **QE-078…QE-084** in existing `Quality Evidence Ledger` (7 dated/source-linked positive and mixed entries; no new tab) for three unpromoted global scout books:
- Uketsu **Dziwne obrazki**: visual evidence/puzzle, mixed independent Portal Kryminalny review; Lubimyczytać community rating is a time-dependent, low-confidence snapshot, not a quality verdict.
- Chan Ho-Kei **The Borrowed**: University of Leeds praises reverse-chronology formal detective invention; **Kirkus** critiques sprawling length and underdeveloped historical context. Keep both.
- Riku Onda **The Aosawa Murders**: independent Kirkus / Publishers Weekly narrative praise, Japan Society flags unusual/ambiguous solution expectations. Keep both.

All seven are evidence for **SCOUT** research, **Counts toward translation-investment gate=FALSE**, not BookFit increases or instant promotions. Series/continuity order, genre-fit, English/official Polish edition, verified title and language route still need checked before entering the main book master. Don't invent a Goodreads rating, a publisher date or a Polish edition.

## Backend consistency and data reconciliation

Current verified `System Health` is **745 PASS / 4 WARN / 17 FAIL — overall FAIL**. Do not silence it. Within this run:
- H-492 correctly excludes five Gołoborze character-memory rows from recommendation model effects (`Character Memory State!Q79:Q83`).
- H-657 accounts for new **PL FINAL — VAULT EV-0018** production status instead of literal `PL FINAL`; top-10 edition routes correctly total 10 (7 PL available/final, 1 translation queued, 2 source needed).
- H-079 no longer counts a formula-generated empty cell as an actual duplicate: 27 real non-empty Vault IDs all unique, no identity rewrite needed.
- **The Winter Job / Zimowa robota** is now physically **FINISHED private Polish EPUB** (BK00117 / ED-PL-0117P / EV-0018), confirmed in the live vault and Edition/Translation State registers. **Official EPUBCheck was NOT run**, so don't misdescribe as a full EPUBCheck PASS. This supersedes the older draft-only status in prior reports.

## Practical governance and future algorithm evolution

At each finished-book debrief, ChatGPT (only conversation interface) should:
1. Freeze owner observations and rating, compare with previous **frozen** prediction; recompute MAE, bias and calibration with honestly tiny sample size.
2. Refresh owner taste hypotheses with shrinkage, keep Taste/Community/Quality/Data confidence/Discovery/Information Gain/Diversity/Freshness/Language Friction distinctly auditable. Never turn novelty or language availability into intrinsic quality.
3. Re-evaluate top-25 scenario council and off-pool scouts; read independent positive AND counter-signals with provenance. Search outside language/popularity monoculture, but don't impose geographic quality quotas.
4. Maintain hard continuity, timestamped verified preflight, and no spoiler leakage.
5. Select **one** new book via `Crime Director` only when no unresolved critical integrity issue blocks the decision and the owner's present reading is complete. If evidence insufficient, research rather than fill with false precision.
6. Do **not** embed a new chatbot, challenges, gamification or an AI-model token in the static website. Keep existing 6-tab read-only frontend small, automatically refreshed from authenticated Apps Script when opened or revisited.
7. Never claim unscheduled background progress; perform available writes within the actual ChatGPT turn or via existing independently authorized scheduled automation.

**Serendipity is evidence-backed controlled exploration, not arbitrary randomness or a fixed cadence of "wildcard challenges".** Historical signals/canonical value may justify exceptions, while rating crowd averages alone cannot dictate literature's worth. Until multiple observed debriefs make uncertainty estimable, use scenario disagreement, source count and reviewer counter-signals as diagnostics, not calibrated probability scores.

## Rollback

- Full pre-edit backup: https://docs.google.com/spreadsheets/d/1agd0aLwkg90j7HqFLGiV7-Lip_N36Kl1Qmuu1PA4-8Q/edit
- New columns within existing Decision Physics BO:CF and new OFF-POOL panel A39:L53 are reversible. Three Crime Director nominee formulas E8, E9, E12 and H5/J2/L5 status formulas can be restored from backup if needed. Historical ratings and Read Next freeze were not modified.
