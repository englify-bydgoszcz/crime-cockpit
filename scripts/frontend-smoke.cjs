const fs=require('fs');

const app=fs.readFileSync('app.js','utf8');
const demo=fs.readFileSync('demo-data.js','utf8');
const index=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('styles.css','utf8');

new Function(app);
new Function(demo);

const badSingleSelectorForEach=/(?<!\$)\$\([^)]*\)\s*\.forEach\s*\(/g;
if (badSingleSelectorForEach.test(app)) {
  throw new Error('Regression: $() used with .forEach(); use $$() or querySelectorAll().');
}
for (const marker of ["const storage = {","storage.get(","storage.set(","storage.remove("]) {
  if (!app.includes(marker)) throw new Error('Missing fail-safe storage marker: '+marker);
}
for (const marker of [
  "const FRONTEND_VERSION = '7.3.5'",
  "styles.css?v=7.3.5",
  "demo-data.js?v=7.3.5",
  "app.js?v=7.3.5"
]) {
  const haystack=marker.includes('FRONTEND_VERSION')?app:index;
  if (!haystack.includes(marker)) throw new Error('Missing release marker: '+marker);
}
if (!app.includes("https://drive.google.com/thumbnail?id=")) {
  throw new Error('Drive portrait resolver must use thumbnail endpoint.');
}
if (!app.includes('const PORTRAIT_WEB_CACHE = {') || !app.includes("'CHR-0085':'data:image/jpeg;base64,") || !app.includes("'CHR-0083':'data:image/jpeg;base64,")) {
  throw new Error('Embedded portrait web cache is missing required known-good portraits.');
}
if (!app.includes("if (PORTRAIT_WEB_CACHE[id]) return PORTRAIT_WEB_CACHE[id];")) {
  throw new Error('Portrait resolver must prefer embedded web cache before Drive fallback.');
}
if (app.includes("this.remove();this.parentElement")) {
  throw new Error('Regression: portrait onerror must not dereference parentElement after removing the image.');
}
if (!app.includes("const p=this.parentElement;if(p){p.classList.remove('has-image');p.innerHTML=")) {
  throw new Error('Portrait fallback guard is missing.');
}
if (!app.includes("portrety live") || !app.includes("czeka na bezpieczny asset")) {
  throw new Error('Case Pulse must distinguish live portrait assets from portrait-ready identities.');
}
if (!app.includes('data-cockpit-time-index=') || !app.includes("characterCaseTab='time';renderCharacters();")) {
  throw new Error('Case Cockpit Time Machine nodes must deep-link to the selected immutable checkpoint.');
}
if (!app.includes("'par Nie pomyl','Collisions Δ'") || !app.includes("'teorie','Theory Δ'") || !app.includes("'portrait-ready','Portrait-ready Δ'") || !css.includes('.cockpit-delta-chips{')) {
  throw new Error('Case Pulse must expose the full safe checkpoint delta, not only cast/relations/locations.');
}
if (app.includes("drive.google.com/uc?export=view")) {
  throw new Error('Legacy Drive uc portrait endpoint must not be used.');
}
if (!css.includes('.case-portrait img{') || !css.includes('object-fit:contain') || !css.includes('object-position:center center')) {
  throw new Error('Portrait cards must use universal contain + centered framing.');
}
if (css.includes('.case-portrait img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}')) {
  throw new Error('Regression: portrait cards must never return to object-fit:cover.');
}
if (!app.includes('relationComponents_') || !app.includes('relationIslandHtml_') || !app.includes('wireRelationConstellation_') || !css.includes('.relation-islands{')) {
  throw new Error('Relation Constellation caseboard is missing.');
}
if (app.includes('ODTWARZANIE SPRAWY</div><h3>Co Cockpit wiedział wtedy?</h3></div></div><div class="playback-strip">')) {
  throw new Error('Regression: legacy Time Machine renderer still overwrites checkpoint selector.');
}
if (!app.includes('ODTWARZANIE SPRAWY · TIME MACHINE') || !app.includes('data-playback-index')) {
  throw new Error('Time Machine checkpoint selector is missing.');
}
if (app.includes("const nodes=$('.relation-constellation-node'") || app.includes("edges=$('.relation-constellation-edge'")) {
  throw new Error('Regression: relation constellation must use $() for node/edge collections.');
}
if (!app.includes('data-relation-island') || !app.includes('data-relation-focus') || !app.includes("opacity:.035")) {
  // opacity marker lives in CSS, checked below.
}
if (!css.includes('.relation-constellation-edge{opacity:.035') || !css.includes('.relation-island{')) {
  throw new Error('Focus-first relation islands CSS is missing.');
}
if (!app.includes("'friend of':'przyjaciel'") || !app.includes("'daughter of':'córka'") || !app.includes("'governess / teacher of':'guwernantka / nauczycielka'")) {
  throw new Error('Polish relation label map is incomplete.');
}
if (!app.includes('characterTrailHtml_') || !app.includes("rowForCharacter('characterEncounterTrace'") || !css.includes('.character-trail-axis{')) {
  throw new Error('Character Trail dossier surface is missing.');
}
if (!app.includes('Gęstość kropek nie oznacza ważności, podejrzenia ani winy.')) {
  throw new Error('Character Trail non-inference disclaimer is missing.');
}
if (!app.includes('Nie rekonstruuję go po fakcie z późniejszej wiedzy.')) {
  throw new Error('Character Trail must not reconstruct missing historical traces from later knowledge.');
}
if (!app.includes('CASE PULSE') || !app.includes("rowsForBook('caseDelta'") || !css.includes('.case-pulse{')) {
  throw new Error('Case Pulse current-checkpoint delta surface is missing.');
}
if (!app.includes("characterCaseTab = 'cockpit'") || !index.includes('data-character-case-tab="cockpit"')) {
  throw new Error('Case Cockpit must be the default current-book surface on the prototype branch.');
}
if (!app.includes('CASE COCKPIT · BIEŻĄCA SPRAWA') || !app.includes('data-case-go=') || !css.includes('.case-cockpit-grid{')) {
  throw new Error('Case Cockpit composition or drill-down wiring is missing.');
}
if (!index.includes('leaflet@1.9.4') || !app.includes('const LOCATION_GEO_CACHE = {') || !app.includes("L.tileLayer('https://{s}.tile.openstreetmap.org/") || !css.includes('.case-real-map{')) {
  throw new Error('Hybrid verified geography map is missing.');
}
for (const label of ['Zweryfikowane miejsce','Przybliżona lokalizacja','Znamy tylko region','Przestrzeń fabularna']) {
  if (!app.includes(label)) throw new Error('Location Intelligence label missing: '+label);
}
if (!app.includes("status:'STORY-INFERRED APPROX'") || !app.includes("status:'REGION ONLY'") || !app.includes("L.circle(ll") || !app.includes("dashArray:'7 6'")) {
  throw new Error('Approximate/region Location Intelligence rendering is missing.');
}
if (!app.includes('Mapa pokazuje pewność, nie udaje precyzji') || app.includes('REAL MAP · tylko niezależnie zweryfikowane współrzędne')) {
  throw new Error('Map truthfulness contract is missing or legacy raw label returned.');
}
if (app.includes("'LOC-0003':{status:'REAL VERIFIED'") || app.includes("'LOC-0004':{status:'REAL VERIFIED'") || app.includes("'LOC-0005':{status:'REAL VERIFIED'")) {
  throw new Error('Regression: fictional / ambiguous Somerset story locations must not receive real-map coordinates.');
}
if (!app.includes('najczęstsza pułapka pamięci') || !app.includes('Safe Disambiguator') || app.includes('reader confusion memory')) {
  throw new Error('Owner-facing confusion panel must use human-readable microcopy.');
}
if (!app.includes('Tylko suche przyrosty bezpiecznych danych. Zero interpretacji fabuły.')) {
  throw new Error('Case Pulse spoiler-safe non-interpretation contract is missing.');
}
if (!index.includes('data-character-case-tab="lineup"') || !app.includes("characterCaseTab==='lineup'") || !css.includes('.witness-options{')) {
  throw new Error('Witness Line-Up surface is missing.');
}
if (!app.includes("const source=(cast&&cast.length)?cast:(dossiers||[]);") || !app.includes("rowsForBook('visualCollisionBoard',bookId)")) {
  throw new Error('Witness Line-Up must build from the safe cast / safe collision surfaces only.');
}
if (!app.includes('zero wpływu na model gustu, podejrzenia i rekomendacje') || !app.includes('Nie trafia do Taste Fit, Suspect Wall, Character Memory ani Read Next Score.')) {
  throw new Error('Witness Line-Up no-model-effect contract is missing.');
}
if (app.includes("storage.set('witnessLineup") || app.includes('storage.set("witnessLineup')) {
  throw new Error('Witness Line-Up must remain ephemeral and must not persist session scores.');
}
if (!app.includes("if(!witnessLineupState.misses.includes(round.target.id))") || !app.includes('DO SZYBKIEGO PRZYPOMNIENIA')) {
  throw new Error('Witness Line-Up review loop is missing.');
}
if (!app.includes('POSTĘP LEKTURY') || !app.includes('caseTotalPages_') || !app.includes('miękki cel, nie obowiązek') || !css.includes('.reading-progress-track{')) {
  throw new Error('Reading Progress / soft milestone surface is missing.');
}
if (!app.includes('TIMELINE LEKTURY') || !app.includes('reading-dot-line') || !app.includes('data-cockpit-time-index=') || !css.includes('.reading-checkpoint.current>i{')) {
  throw new Error('Immersive dotted reading timeline or checkpoint deep-links are missing.');
}
const framesDecl=app.indexOf("const frames=playback.filter(r=>String(cell(r,'Book ID'))===String(bookId));");
const checkpointUse=app.indexOf("const checkpointMarkers=frames.map");
if (framesDecl < 0 || checkpointUse < 0 || framesDecl > checkpointUse) {
  throw new Error('Runtime regression: reading timeline uses frames before initialization.');
}
if (!app.includes("let phase='bootstrap';") || !app.includes("phase='core-request';") || !app.includes("phase='live-render';") || !app.includes("API OK · UI ERROR · DEMO")) {
  throw new Error('Live loading must distinguish API core failures from frontend render failures.');
}
if (!app.includes("API OK · CORE REQUEST ERROR · DEMO") || app.includes("API OK · CORE ERROR · DEMO")) {
  throw new Error('Misleading generic CORE ERROR diagnosis must not return.');
}
if (!app.includes('OSTATNIE AKTUALIZACJE') || !app.includes('recentUpdatesHtml') || !css.includes('.case-update-strip{')) {
  throw new Error('Recent character/location updates rail is missing.');
}
if (!app.includes('smartCollisionRows_') || !app.includes('safeSexHint_') || !app.includes('RELACJA ≠ POMYŁKA') || !app.includes('Samo pokrewieństwo lub małżeństwo nie wystarcza.')) {
  throw new Error('Smart Nie pomyl eligibility filter is missing.');
}
if (!app.includes('lineupCandidateScore_') || !app.includes('smartWitnessRound_') || !app.includes("if(tg!=='U'&&cg!=='U'&&tg!==cg)return -1000")) {
  throw new Error('Witness Line-Up semantic distractor matching is missing.');
}
if (!app.includes('Najczęściej wspominane') || !app.includes("rowsForBook('characterEncounterTrace',bookId)") || !app.includes('data-character-sort') || !app.includes('liczba bezpiecznych wzmianek do aktualnej strony')) {
  throw new Error('Character mention-count ordering / sort controls are missing.');
}
if (!app.includes("'physician of':'lekarz'") || !app.includes("'assistant to':'asystent'") || !app.includes("'prospective client of':'ma umówione spotkanie z'")) {
  throw new Error('New p54 relation labels are not localized.');
}

if (!app.includes('humanCheckpoint_') || !app.includes('geoStatusClass_') || !app.includes("status:'STORY SPACE'")) {
  throw new Error('Owner-tech cleanup or geo safety vocabulary is missing.');
}
if (!app.includes('locationVisualHtml_') || !css.includes('.case-location-visual{') || !app.includes("status:'PLACEHOLDER'")) {
  throw new Error('Place visual graceful-degradation pipeline is missing.');
}
if (!app.includes("String(geo.status)==='REAL VERIFIED'") || !app.includes("String(x.geo?.status)==='STORY-INFERRED APPROX'")) {
  throw new Error('Exact pin and approximate rendering paths are not semantically separated.');
}

if (!app.includes("chunk_(keys,6)") || !app.includes("moduleBatches") || !app.includes("runJobs_(initialJobs,'DOCZYTUJĘ',4)") || !app.includes("retryJobs") || !app.includes("ODZYSKUJĘ") || !app.includes("12000")) {
  throw new Error('Bounded chunked deferred hydration with single-module recovery is missing.');
}
if (app.includes("for (const keys of groups)") || app.includes("['characterEncounterTrace','locationRegistry','bookLocations','suspicionTimeline','caseLoadMonitor','caseFileAssets','caseFileDossiers','characterAppearanceEvidence','checkpointSnapshots','reentryPackBuilder','caseDelta','characterVisualStates','visualCollisionBoard','relationGraphFeed','characterUnlocks','characterTheoryPins','suspectWall','characterRecallFeedback','characterMemoryState','caseboardPlayback','caseSceneState','dossierAura'].map")) {
  throw new Error('Oversized legacy module batching returned.');
}
if (!app.includes("LIVE · UI:") || !app.includes("LIVE · CORE · HYDRATION ERROR") || !app.includes("LIVE · BRAK")) {
  throw new Error('Deferred hydration failure must expose an explicit owner-facing state.');
}

if (!app.includes("window.__crimeCockpitRenderErrors") || !app.includes("LIVE · UI:") || !app.includes("const renderErrors=renderAll()")) {
  throw new Error('Renderer isolation diagnostics are missing.');
}
if (!app.includes("run('POSTACIE',renderCharacters)") || !app.includes("run('KOKPIT',renderOverview)") || !app.includes("run('LABORATORIUM',renderLab)")) {
  throw new Error('Named renderer isolation coverage is incomplete.');
}

if (!app.includes("window.__crimeCockpitMapError") || !app.includes("SCHEMATIC_RUNTIME_FALLBACK") || !app.includes("renderCaseSchematicMap_") || !app.includes("caseMapVisible_")) {
  throw new Error('Case map graceful-degradation guard is missing.');
}
if (!app.includes("POSTACIE / CASE COCKPIT") || !app.includes("let caseHubError=null") || !app.includes("tagged.cockpitSurface")) {
  throw new Error('Character Case Cockpit subrenderer isolation is missing.');
}
if (!app.includes("const surface=String(error?.cockpitSurface||label)")) {
  throw new Error('Nested renderer surface propagation is missing.');
}

if (!app.includes("DEFERRED_HIDDEN") || !app.includes("refreshCaseMapIfVisible_") || !app.includes("renderCaseSchematicMap_") || !app.includes("LIVE · MAPA UPROSZCZONA")) {
  throw new Error('Visible-only map lifecycle and truthful fallback are missing.');
}
if (!app.includes("case-location-highlights") || !app.includes("locationHighlightHtml")) {
  throw new Error('Location Intelligence must be visibly surfaced in the main Case Cockpit.');
}
if (!app.includes("#(?:kps_)?page_\\d+") || !app.includes("spoiler firewall aktywny")) {
  throw new Error('Owner-facing checkpoint cleanup is incomplete.');
}
if (!styles.includes(".case-schematic-map") || !styles.includes(".case-location-highlights") || !styles.includes(".case-map-approx-marker")) {
  throw new Error('Location runtime CSS contract is incomplete.');
}

console.log('Crime Cockpit frontend smoke: PASS');
