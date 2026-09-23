const fs=require('fs');

const app=fs.readFileSync('app.js','utf8');
const demo=fs.readFileSync('demo-data.js','utf8');
const index=fs.readFileSync('index.html','utf8');

new Function(app);
new Function(demo);

const badSingleSelectorForEach=/\$\([^\n;]*\)\.forEach\s*\(/g;
if (badSingleSelectorForEach.test(app)) {
  throw new Error('Regression: $() used with .forEach(); use $$() or querySelectorAll().');
}
if (/\blocalStorage\.(getItem|setItem|removeItem)\s*\(/.test(app)) {
  throw new Error('Regression: direct localStorage access; use fail-safe storage wrapper.');
}
for (const marker of [
  "const FRONTEND_VERSION = '6.3.6'",
  "demo-data.js?v=6.3.6",
  "app.js?v=6.3.6"
]) {
  const haystack=marker.includes('FRONTEND_VERSION')?app:index;
  if (!haystack.includes(marker)) throw new Error('Missing release marker: '+marker);
}
console.log('Crime Cockpit frontend smoke: PASS');
