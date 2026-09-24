const fs=require('fs');

const app=fs.readFileSync('app.js','utf8');
const demo=fs.readFileSync('demo-data.js','utf8');
const index=fs.readFileSync('index.html','utf8');

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
  "const FRONTEND_VERSION = '7.0.3'",
  "demo-data.js?v=7.0.3",
  "app.js?v=7.0.3"
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
const css=fs.readFileSync('styles.css','utf8');
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
if (!app.includes('story-space · bez fałszywej geolokalizacji') || !app.includes('Schemat pamięciowy, nie mapa odległości.') || !css.includes('.story-map-canvas{')) {
  throw new Error('Story Map must remain explicitly schematic and non-geocoded.');
}
if (!app.includes('reader confusion memory') || !app.includes('Safe Disambiguator')) {
  throw new Error('Reader Confusion Memory panel is missing from Case Cockpit.');
}
if (!app.includes('Tylko suche przyrosty bezpiecznych danych. Zero interpretacji fabuły.')) {
  throw new Error('Case Pulse spoiler-safe non-interpretation contract is missing.');
}
if (!app.includes("'physician of':'lekarz'") || !app.includes("'assistant to':'asystent'") || !app.includes("'prospective client of':'ma umówione spotkanie z'")) {
  throw new Error('New p54 relation labels are not localized.');
}
console.log('Crime Cockpit frontend smoke: PASS');
