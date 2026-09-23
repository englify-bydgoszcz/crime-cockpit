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
  "const FRONTEND_VERSION = '6.4.1'",
  "demo-data.js?v=6.4.1",
  "app.js?v=6.4.1"
]) {
  const haystack=marker.includes('FRONTEND_VERSION')?app:index;
  if (!haystack.includes(marker)) throw new Error('Missing release marker: '+marker);
}
if (!app.includes("https://drive.google.com/thumbnail?id=")) {
  throw new Error('Drive portrait resolver must use thumbnail endpoint.');
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
console.log('Crime Cockpit frontend smoke: PASS');
