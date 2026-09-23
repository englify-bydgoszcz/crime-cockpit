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
  "const FRONTEND_VERSION = '6.3.7'",
  "demo-data.js?v=6.3.7",
  "app.js?v=6.3.7"
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
console.log('Crime Cockpit frontend smoke: PASS');
