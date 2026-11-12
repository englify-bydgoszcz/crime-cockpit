/* Crime Cockpit Lite — source and model smoke tests, no network needed. */
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');

const html=fs.readFileSync('index.html','utf8');
const js=fs.readFileSync('lite.js','utf8');
const css=fs.readFileSync('lite.css','utf8');

new Function(js); // Syntax validation
assert.match(html,/lite\.js\?v=9\.3\.0/);
assert.match(html,/lite\.css\?v=9\.3\.0/);
assert.doesNotMatch(html,/<script[^>]*src="(?:app|demo-data)\.js/);
const nav=[...html.matchAll(/data-nav="([^"]+)"/g)].map(m=>m[1]);
assert.deepEqual(nav,['now','club','people','library','translations','next']);
for(const selector of ['#connectionStatus','#syncNotice','#nowContent','#clubNotes','#peopleCards','#libraryCards','#translationCards','#translationSuggestion','#translationFilter','#nextCards']) {
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
const {readBookState,allowedNote,state,noteFromRow,mergeReaderNotes,translationInventory,liveReadingEvidence}=win.__crimeLiteTest;
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


/* Reproduce legacy published payload: finishedAt is supplied by older Apps Script,
   Reading Room is the canonical archive, not restricted to the current book. */
const somerset={id:'BK00002',title:'Morderstwa w Somerset',author:'Anthony Horowitz',read:true,lifecycle:'READ',rating:4.5,finishedAt:'2026-11-11T22:10:00+01:00'};
state.payload={library:[{id:'BK00001',title:'Pięć małych świnek',read:true,lifecycle:'READ',finishedAt:'2026-09-19T10:00:00+02:00'},somerset,baseLibrary[1]],readingRoom:[],current:baseLibrary[1],readerState:{}};
mergeReaderNotes([
  {'Note ID':'RR-0043','Book ID':'BK00002','Tytuł':'Morderstwa w Somerset','Timestamp':'2026-11-11 14:29','Postęp':'466 stron','Typ':'QUESTION','Notatka użytkownika':'Proszę przypomnieć mechanizm listu.'},
  {'Note ID':'RR-0044','Book ID':'BK00002','Tytuł':'Morderstwa w Somerset','Timestamp':'2026-11-11 22:10','Postęp':'ukończona','Typ':'EMOTION','Notatka użytkownika':'Książka ukończona; ocena 4,5/5.'}
]);
readBookState(state.payload);
assert.equal(state.lastRead.id,'BK00002','Somerset must outrank previously completed books');
assert.equal(state.payload.readingRoom.length,2,'Reading Room notes were dropped');
assert.equal(allowedNote(state.payload.readingRoom[0],somerset),true,'Completed-book note hidden');
assert.equal(noteFromRow({bookId:'BK00002',note:'test'}).bookId,'BK00002');
mergeReaderNotes([{bookId:'BK00002',note:'Książka ukończona',id:'RR-0044',timestamp:'2026-11-11 22:10'}]);
assert.equal(state.payload.readingRoom.length,2,'Duplicate archive hydration');

state.modules={
  translationStateReconciler:{rows:[
    {'Book ID':'BK00117',Title:'The Winter Job','Canonical state':'IN PROGRESS — TX-004 / 41/41 DRAFT','Repair / action':'Source: https://drive.google.com/drive/folders/17XsLC8u5udbNZpQp5v8zz6jqVoMCrrrT'},
    {'Book ID':'BK00113',Title:'The Death of Us','Canonical state':'QUEUED'}
  ]},
  polishEditionPipeline:{rows:[
    {'Book ID':'BK00117',Title:'The Winter Job',Author:'Antti Tuomainen','Preferred route':'TS→PL','Canonical TX state':'IN PROGRESS','Gate':'AUTO PASS','Source owned':'YES','Action':'CONTINUE TX QA'},
    {'Book ID':'BK00113',Title:'The Death of Us',Author:'Abigail Dean','Preferred route':'TS→PL','Canonical TX state':'QUEUED','Decision Rank':'5','Gate':'AUTO PASS','Source owned':'YES','Action':'TRANSLATE','Production Priority':'100'},
    {'Book ID':'BK00116',Title:'Dead Money',Author:'Jakob Kerr','Preferred route':'PRIVATE PL','Canonical TX state':'FINAL ACCEPTED'}
  ]},
  editionRegistry:{rows:[
    {'Book ID':'BK00116','Edition ID':'ED-PL-0116P',Language:'PL',Status:'FINAL ACCEPTED'}
  ]},
  ebookVault:{rows:[
    {'Book ID':'BK00116',Format:'EPUB',Language:'PL','Inventory status':'MATCHED','Drive File ID':'1HMpU6Gcss5trGJw6iQqQ5_Knk8WmzDyK'}
  ]}
};
const trans=translationInventory();
assert.equal(trans.find(x=>x.id==='BK00117').kind,'active','41/41 draft must not be marked complete');
assert.equal(trans.find(x=>x.id==='BK00116').kind,'private','Accepted verified private EPUB missing');
assert.equal(trans.find(x=>x.id==='BK00113').kind,'queued','Next translation queue missing');
assert.equal(trans.find(x=>x.id==='BK00117').link,'','Active draft must not get final EPUB link');
assert.equal(win.__crimeLiteTest.version,'9.3.0-lite');


const confirmedNotes=[
  {id:'RR-0045',bookId:'BK00114',title:'Gołoborze',progress:'strona 2',note:'Zaczynam',timestamp:'2026-11-12 08:21'},
  {id:'RR-0046',bookId:'BK00114',title:'Gołoborze',progress:'9 strona',note:'Przeskoki po epokach',timestamp:'2026-11-12 08:41'}
];
state.payload={library:baseLibrary,readingRoom:confirmedNotes,current:baseLibrary[1],readerState:{}};
readBookState(state.payload);
assert.equal(state.active?.id,'BK00114','confirmed notebook evidence must mark a book as being read');
assert.equal(state.next,null,'a started book must no longer be suggested as the next to start');
assert.equal(state.inferredProgress?.page,9,'latest Gołoborze page checkpoint must show');
assert.equal(allowedNote({progress:'9 strona'},baseLibrary[1]),true,'checkpoint 9 note must be safe');
assert.equal(allowedNote({progress:'10 strona'},baseLibrary[1]),false,'future note must remain hidden');
assert.equal(liveReadingEvidence(baseLibrary[2],confirmedNotes),null,'do not mark unread books as started from unrelated notes');
state.payload={library:baseLibrary,readingRoom:[],readerState:{}};
readBookState(state.payload);
assert.equal(state.active,null,'committed next alone must not imply a started book');
assert.equal(state.next?.id,'BK00114','committed next should return when there is no progress evidence');
assert.ok(js.includes("scope:'modules',keys:'readingRoom,tasteFrontier'"),'narrow Reading Room API not requested');
assert.ok(!js.includes("scope:'full'"),'heavy full payload would time out the reader');
assert.ok(js.includes('checkpointSnapshots,caseFileAssets,tasteFrontier'),'old API module batch must use a known safe key');
const modulePayload={modules:{readingRoom:{sheet:'Reading Room',status:'OK',rows:[
  {'Note ID':'RR-0045','Book ID':'BK00114',Tytuł:'Gołoborze',Postęp:'strona 2',Typ:'FIRST IMPRESSION','Notatka użytkownika':'Test rozdziału 2'},
  {'Note ID':'RR-0046','Book ID':'BK00114',Tytuł:'Gołoborze',Postęp:'strona 9',Typ:'CONSTRUCTION','Notatka użytkownika':'Test aktualnej strony 9'}
]}}};
state.payload={library:baseLibrary,readingRoom:[],readerState:{}};
mergeReaderNotes(modulePayload.modules.readingRoom);
readBookState(state.payload);
assert.equal(state.active?.id,'BK00114','readingRoom module must establish active book');
assert.equal(state.inferredProgress?.page,9,'readingRoom module must establish checkpoint');
console.log('Crime Cockpit Lite smoke: PASS (6 views, last completed, archived notes, TX status, independent EPUB evidence, spoiler gates)');
