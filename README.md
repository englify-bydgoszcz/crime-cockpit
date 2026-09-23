# Crime Cockpit

Living frontend source for the Crime Cockpit project.

## Asset policy

This repository stores code only. Character portraits and other generated reading assets are stored on Google Drive, registered in the operational Google Sheet, exposed through the Apps Script API, and rendered by the frontend at runtime.

Canonical portrait delivery:

`Google Drive → Case File Assets → Apps Script API → frontend`

Do not commit portrait/image binaries, bundled portrait copies, or repository-relative portrait paths. `Case File Assets → Frontend Asset Path` must remain blank.
