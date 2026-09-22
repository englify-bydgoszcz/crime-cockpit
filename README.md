# Crime Cockpit

Private source repository for the Crime Cockpit frontend.

## Current web release
- Frontend: v6.3.0
- API schema: 5.3.0
- Runtime artifact: `site.zip`
- Pages bundle SHA256: `b37152d41e33bf715f2f08246f8ef351d58e391b6db20d4655e9c1e135b8af5b`

The Pages workflow unpacks `site.zip` and publishes it as a static site.

## LIVE data
No private reading data or API token is committed here. The browser stores the Apps Script URL and token in localStorage, then the frontend loads the real Crime Cockpit data from the read-only Apps Script API via JSONP.

Without API configuration, the site uses the sanitized synthetic demo snapshot.

## Portraits
Full-resolution synthetic portrait masters remain canonical on Google Drive. The Pages bundle contains optimized runtime copies under `assets/portraits/`.

## Apps Script
Backend source is included inside the published bundle at `apps-script/Code.gs`; production deployment remains manual.
