/* Crime Cockpit Lite — source and model smoke tests, no network needed. */
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');

const html=fs.readFileSync('index.html','utf8');
const js=fs.readFileSync('lite.js','utf8');
const css=fs.readFileSync('lite.css','utf8');

new Function(js); // Syntax validation
assert.match(html,/lite\.js\?v=9\.0\.0/);
assert.match(html,/lite\.css\?v=9\.0\.0/);
assert.doesNotMatch(html,/<script[^>]*src="(?:app|demo-data)\.js/);
const nav=[...html.matchAll(/data-nav="([^"]+)"/g)].map(m=>m[1]);
assert.deepEqual(nav,['now','club','people','library','next']);
for(const selector of ['#connectionStatus','#syncNotice','#nowContent','#clubNotes','#peopleCards','#libraryCards','#nextCards']) {
  assert.ok(html.includes('id="'+selector.slice(1)+'"'),selector);
}
assert.ok(css.includes('@media(max-width:610px)'),'mobile layout absent');
assert.ok(css.includes('prefers-reduced-motion'),'reduced motion absent');
assert.ok(js.includes('const committed=books.filter('),'Lifecycle arbitration absent');
assert.ok(js.includes('function allowedNote(note,book)'),'checkpoint guard absent');
assert.ok(js.includes('Nie wyświetlam nieaktualnego snapshotu jako aktualnego.'),'stale state failure absent');
assert.ok(!html.includes('mode-switch'),'legacy owner/expert switch is exposed');

const win={};
const document={addEventListener(){}};
vm.runInNewContext(js,{window:win,document,localStorage:{},console,URL,URLSearchParams,setTimeout,clearTimeout,Date,Number,String,Math,Promise});
const {readBookState,allowedNote,state}=win.__crimeLiteTest;
assert.ok(readBookState && allowedNote,'test hooks absent');

const baseLibrary=[
  {id:'BK00002',title:'Morderstwa w Somerset',author:'Anthony Horowitz',read:true,lifecycle:'READ',rating:4.5,dateCompleted:'2026-11-11'},
  {id:'BK00114',title:'Gołoborze',author:'Maciej Siembieda',lifecycle:'CURRENT NEXT',read:false},
  {id:'BK00116',title:'Dead Money',author:'Jakob Kerr',lifecycle:'PROMOTE'}
];
state.payload={library:baseLibrary,current:{id:'BK00116',title:'Dead Money'},readerState:{}};
readBookState(state.payload);
assert.equal(state.active,null,'Committed book must never be treated as started');
assert.equal(state.next.id,'BK00114','Operational Lifecycle must beat stale API current');
assert.equal(state.nextVerified,true,'Single committed Lifecycle book is a verified status');
assert.ok(state.issues.some(x=>x.includes('niespójne z Lifecycle')),'Conflict must be detected');
assert.equal(state.lastRead.id,'BK00002','Finished book must be read');

const started={id:'BK00077',title:'Test lektury',author:'Test',lifecycle:'READING',read:false};
state.payload={library:[...baseLibrary,started],current:{id:'BK00114'},readerState:{activeBookId:'BK00077',progress:{page:43,total:200}}};
readBookState(state.payload);
assert.equal(state.active.id,'BK00077');
assert.equal(state.next.id,'BK00114');
assert.equal(allowedNote({progress:'43 strony'},started),true);
assert.equal(allowedNote({progress:'44 strony'},started),false,'Future checkpoint leaked');
assert.equal(allowedNote({progress:'unknown'},started),false,'Unknown checkpoint leaked');
assert.equal(allowedNote({progress:'466 stron'},baseLibrary[0]),true,'Completed-book note blocked');
assert.equal(allowedNote({progress:'42 strony'},baseLibrary[2]),false,'Unstarted-book note leaked');
state.payload.readerState.progress={};
assert.equal(allowedNote({progress:'20 stron'},started),false,'Unknown reading page must fail closed');

const two=[...baseLibrary,{id:'BK00999',title:'Conflict',lifecycle:'CURRENT NEXT'}];
state.payload={library:two,current:null,readerState:{}};
readBookState(state.payload);
assert.ok(state.issues.some(x=>x.includes('więcej niż jedną')),'Duplicate next not detected');

console.log('Crime Cockpit Lite smoke: PASS (5 views, no demo, Lifecycle precedence, not-started, conflict, spoiler gates)');
