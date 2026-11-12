# Crime Cockpit — Reading Room API hotfix (12.11.2026)

Status: **frontend prepared in Lite 9.3; live Apps Script edit + redeploy is still required.**

## Confirmed diagnosis

- `Reading Room` tab has real records RR-0001…RR-0046, including
  `BK00002` Morderstwa w Somerset and `BK00114` Gołoborze p9.
- The current Web App returns books, covers, scores, and completed history,
  but does not return `readingRoom`.
- `scope=full` is too heavy and consistently times out; do not use it.
- Historical `buildCrimeCockpitModulesPayload_` falls back to **all modules**
  when all requested keys are unrecognized. Lite 9.3 always includes
  `tasteFrontier`, an existing small key, to prevent that timeout.

## One-line patch — do not replace the production Code.gs

Open the **existing Apps Script project attached to**
`Ranking kryminałów` (Google Sheet → Extensions → Apps Script).
Find `function moduleSpecs_()` in the current live source.
In the object it returns, add this one entry (with a comma):

```javascript
readingRoom: ['Reading Room', 4, false],
```

Example, showing only the beginning of the existing object:

```javascript
function moduleSpecs_() {
  return {
    tasteFrontier: ['Taste Frontier', 5, false],
    readingRoom: ['Reading Room', 4, false],
    // All the other existing modules must remain unchanged.
  };
}
```

**Do not copy this abbreviated example as a full replacement function.**
Add only the one-line entry to the existing list.
The original implementation of `readModuleSheet_` will now expose
the Reading Room headers and rows through the existing authenticated,
read-only API, `scope=modules&keys=readingRoom,tasteFrontier`.
No change to `doGet`, token, original sheet, or other modules is necessary.

Then **Save → Deploy → Manage deployments → Edit (pencil) → Version:
New version → Deploy**. Keep the original Web App /exec URL, existing
Script Property `CRIME_COCKPIT_TOKEN`, and current execute-as/access
configuration. **Do not create a new deployment** unless explicitly
necessary; creating one may change the URL saved in the reader.

Refresh the published reader with Ctrl+Shift+R and use its regular
Reload icon. Verify:

1. "Klub czytelniczy" shows archived notes for Somerset (no plot
   material beyond a checkpoint for unfinished books).
2. "Czytam teraz" recognizes Gołoborze as active based on recorded
   `RR-0045` page 2 and `RR-0046` page 9, rather than leaving it
   as an unstarted recommendation.
3. No persistent `LIVE · brak historii` badge remains.
4. Existing book data, source translations and ratings remain unchanged.

## Privacy and rollback

Reading Room is private user-generated content. Do not add note text,
API tokens or a raw reading archive to public GitHub Pages.
The endpoint remains token-gated by the existing `authorize_`
check. For stronger future security, replace the JSONP/shared-token
interface with an OAuth-backed authenticated API.

If needed, roll back the deployment to its previous version via
Manage deployments; the one-line source change can also be removed.
