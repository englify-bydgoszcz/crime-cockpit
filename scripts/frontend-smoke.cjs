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
  "const FRONTEND_VERSION = '6.4.0'",
  "demo-data.js?v=6.4.0",
  "app.js?v=6.4.0"
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
if (!app.includes('relationConstellationHtml_') || !app.includes('wireRelationConstellation_') || !css.includes('.relation-constellation{')) {
  throw new Error('Relation Constellation caseboard is missing.');
}
if (app.includes('ODTWARZANIE SPRAWY</div><h3>Co Cockpit wiedział wtedy?</h3></div></div><div class="playback-strip">')) {
  throw new Error('Regression: legacy Time Machine renderer still overwrites checkpoint selector.');
}
if (!app.includes('ODTWARZANIE SPRAWY · TIME MACHINE') || !app.includes('data-playback-index')) {
  throw new Error('Time Machine checkpoint selector is missing.');
}
console.log('Crime Cockpit frontend smoke: PASS');
