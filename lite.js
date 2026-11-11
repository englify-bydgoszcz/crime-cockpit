/* Crime Cockpit Lite — presentation-only shell.
 * The operational Sheet and Apps Script remain the sources of book state.
 * No demo data is ever presented as owner data and no read-only action pretends to write.
 */
(function () {
  'use strict';
  const VERSION = '9.0.0-lite';
  const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1_9kUvs64NwUfF03hmq9bjlq94eIgnaXOnjiiFgLRCrU';
  const $ = (s, root=document) => root.querySelector(s);
  const safeArray = value => Array.isArray(value) ? value : [];
  const text = value => String(value == null ? '' : value);
  const upper = value => text(value).trim().toUpperCase();
  const isTrue = value => value === true || upper(value) === 'TRUE';
  const number = value => {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(text(value).replace(/\s/g,'').replace(',','.'));
    return Number.isFinite(parsed) ? parsed : null;
  };
  const state = {
    payload: null, modules: {}, loadedAt: 0, selected: 'now', category: 'all',
    search: '', noteBook: '', castBook: '', active: null, next: null,
    lastRead: null, issues: [], notice: '', nextVerified: false, loading: false
  };
  const storage = {
    get(key) { try { return localStorage.getItem(key) || ''; } catch (_) { return ''; } },
    set(key,value) { try { localStorage.setItem(key,value); } catch (_) {} },
    remove(key) { try { localStorage.removeItem(key); } catch (_) {} }
  };
  function dom(tag, cls, value) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (value !== undefined) node.textContent = text(value);
    return node;
  }
  function add(parent, ...children) { children.filter(Boolean).forEach(child => parent.appendChild(child)); return parent; }
  function button(label, action, cls='soft-button') {
    const b=dom('button',cls,label); b.type='button'; b.addEventListener('click',action); return b;
  }
  function empty(parent, msg) { parent.replaceChildren(dom('p','empty-state',msg)); }
  function cardTitle(book) { return text(book?.title || book?.Title || 'Nieznany tytuł'); }
  function byId(id) { return safeArray(state.payload?.library).find(b=>text(b.id)===text(id)); }
  function resolvedBook(raw) {
    if (!raw) return null;
    return { ...(byId(raw.id)||{}), ...raw };
  }
  function bookCover(book, size='regular') {
    const wrap=dom('div','book-art '+size);
    const u=text(book?.coverUrl).trim();
    if (/^https:\/\/[^\s"'<>]+$/i.test(u)) {
      const img=dom('img');
      img.loading='lazy'; img.alt='Okładka: '+cardTitle(book);
      img.referrerPolicy='no-referrer'; img.src=u;
      img.addEventListener('error',()=>{wrap.replaceChildren(dom('span','book-art-placeholder','✦'));});
      add(wrap,img);
    } else add(wrap,dom('span','book-art-placeholder','✦'));
    return wrap;
  }
  function titleAndAuthor(book, titleTag='h3') {
    const body=dom('div','book-info');
    add(body,dom(titleTag,'book-title',cardTitle(book)),dom('p','book-author',book?.author||'Autor nieznany'));
    return body;
  }
  function config() {
    return {url:storage.get('crimeCockpitApiUrl'), token:storage.get('crimeCockpitToken')};
  }
  function setHealth(message,kind='neutral') {
    const badge=$('#connectionStatus');
    badge.textContent=message; badge.dataset.state=kind;
  }
  function showNotice(message,kind='warn') {
    const box=$('#syncNotice');
    box.textContent=message;
    box.hidden=!message;
    box.dataset.state=kind;
  }
  function jsonp(url, token, params={}, timeout=20000) {
    return new Promise((resolve,reject)=>{
      let done=false;
      const fn='__crimeLite_'+Date.now()+'_'+Math.random().toString(36).slice(2);
      const script=document.createElement('script');
      const timer=setTimeout(()=>finish(new Error('Upłynął czas oczekiwania na API')),timeout);
      function finish(err,result) {
        if (done) return;
        done=true; clearTimeout(timer); script.remove(); delete window[fn];
        if(err) reject(err); else resolve(result);
      }
      window[fn]=response=>finish(null,response);
      script.onerror=()=>finish(new Error('Nie udało się połączyć z API'));
      const q = new URLSearchParams({prefix:fn,token:token,_:String(Date.now()),...params});
      script.src=url+(url.includes('?')?'&':'?')+q.toString();
      document.head.appendChild(script);
    });
  }
  function validatedUrl(url) {
    try {
      const parsed=new URL(url);
      return parsed.protocol==='https:' && /^script\.google\.com$|^script\.googleusercontent\.com$/.test(parsed.hostname);
    } catch (_) { return false; }
  }
  function readBookState(payload) {
    const books=safeArray(payload.library);
    const explicit=payload.readerState && typeof payload.readerState==='object' ? payload.readerState : {};
    const started=books.filter(b=>['READING','CURRENTLY READING','IN PROGRESS','CZYTAM'].includes(upper(b.lifecycle)) || isTrue(b.reading));
    const activeId=explicit.activeBookId || explicit.currentlyReadingId || '';
    state.active=resolvedBook(books.find(b=>text(b.id)===text(activeId)) || started[0] || null);
    const explicitNext=explicit.committedNextId || explicit.nextBookId || '';
    const rawNext=books.find(b=>text(b.id)===text(explicitNext)) || payload.current || null;
    state.next=resolvedBook(rawNext);
    state.nextVerified=!!explicitNext;
    const completed=books.filter(b=>isTrue(b.read) || upper(b.lifecycle)==='READ');
    const completedSorted=completed.slice().sort((a,b)=>text(b.dateCompleted||b.completedAt).localeCompare(text(a.dateCompleted||a.completedAt)));
    const lastId=explicit.lastCompletedId || '';
    state.lastRead=resolvedBook(books.find(b=>text(b.id)===text(lastId)) || completedSorted[0] || null);
    const issues=[];
    if(started.length>1) issues.push('W API występuje więcej niż jedna rozpoczęta książka.');
    if(activeId && state.active?.id!==activeId) issues.push('Nie znaleziono aktywnej książki wskazanej przez Reader State.');
    if(state.active && state.next && text(state.active.id)===text(state.next.id)) issues.push('API traktuje tę samą książkę jednocześnie jako rozpoczętą i kolejną.');
    if(explicitNext && payload.current?.id && text(explicitNext)!==text(payload.current.id)) issues.push('Reader State i starsze pole current wskazują różne książki.');
    if(!explicitNext && state.next) issues.push('Pozycja „następna” pochodzi ze starszego pola API. Konieczna kontrola zgodności ze stanem arkusza przed rozpoczęciem.');
    if(!activeId && started.length===0) state.active=null; // Choosing the next book is not proof of starting it.
    if(!state.active && explicit.status==='READING') issues.push('Reader State deklaruje czytanie bez jednoznacznej książki.');
    if(explicit.conflicts?.length) issues.push('Backend zgłosił konflikt źródeł stanu.');
    state.issues=issues;
  }
  function normalize(payload) {
    if(!payload || payload.ok!==true) throw new Error(text(payload?.error||'Nieprawidłowa odpowiedź API'));
    if(!Array.isArray(payload.library) || !Array.isArray(payload.candidates)) throw new Error('Brakuje biblioteki lub kandydatów w API.');
    state.payload=payload;
    state.modules=payload.modules||{};
    readBookState(payload);
    state.loadedAt=Date.now();
  }
  function modulesRows(name) { return safeArray(state.modules?.[name]?.rows); }
  function rowField(row,...fields) {
    for(const f of fields) if(row && row[f]!==undefined && row[f]!==null && row[f]!=='') return row[f];
    return '';
  }
  function currentProgress() {
    const s=state.payload?.readerState||{};
    if(!state.active) return null;
    const progress=s.progress||state.active.progress||null;
    if(typeof progress==='object' && progress!==null) return progress;
    return progress ? {label:text(progress)} : null;
  }
  function allowedNote(note,book) {
    const closed=book && (isTrue(book.read) || upper(book.lifecycle)==='READ');
    if(closed) return true;
    if(!state.active || !book || text(book.id)!==text(state.active.id)) return false;
    const limit=number(currentProgress()?.page);
    const p=number((text(note.progress).match(/\d+/)||[])[0]);
    // Fail closed: an unknown checkpoint must not display plot-revealing notes.
    return limit!==null && p!==null && p<=limit;
  }
  function selectView(name) {
    if(!['now','club','people','library','next'].includes(name)) name='now';
    state.selected=name;
    document.querySelectorAll('[data-view]').forEach(node=>{
      const active=node.dataset.view===name;
      node.hidden=!active;
      node.classList.toggle('active',active);
    });
    document.querySelectorAll('[data-nav]').forEach(node=>{
      const active=node.dataset.nav===name;
      node.setAttribute('aria-current',active?'page':'false');
      node.classList.toggle('active',active);
    });
    if(name==='people') renderPeople();
    if(name==='club') renderClub();
    window.scrollTo({top:0,behavior:'instant'});
  }
  function bookCompact(book,badge,action) {
    const row=dom('article','book-row');
    add(row,bookCover(book,'small'),titleAndAuthor(book));
    if(badge) add(row,dom('span','muted-note',badge));
    if(action) add(row,button('Szczegóły',()=>openBook(book),'quiet-button'));
    return row;
  }
  function renderNow() {
    const root=$('#nowContent');
    root.replaceChildren();
    if(!state.payload) { empty(root,'Połącz aplikację z danymi LIVE, aby zobaczyć swoją lekturę.'); return; }
    if(state.active) {
      const wrap=dom('div','focus-book');
      add(wrap,bookCover(state.active,'hero'));
      const info=dom('div','focus-book-copy');
      add(info,dom('p','eyebrow','CZYTAM TERAZ'),dom('h2','focus-title',cardTitle(state.active)),dom('p','focus-author',state.active.author||''));
      const progress=currentProgress();
      const p=dom('p','reading-meta',progress?.label || (progress?.page ? 'Strona '+progress.page : 'Postęp nie został jeszcze zsynchronizowany.'));
      add(info,p);
      if(progress?.page && progress?.total && number(progress.total)>0) {
        const bar=dom('progress'); bar.max=number(progress.total);bar.value=Math.min(number(progress.page)||0,bar.max); add(info,bar);
      }
      const actions=dom('div','action-row');
      add(actions,button('Moje notatki',()=>{state.noteBook=text(state.active.id);selectView('club');},'gold-button'),
        button('Postacie',()=>{state.castBook=text(state.active.id);selectView('people');}),
        button('Zgłoś ukończenie',()=>finishBook()));
      add(info,actions); add(wrap,info); add(root,wrap);
    } else {
      const welcome=dom('div','welcome-empty');
      add(welcome,dom('p','eyebrow','CZYTAM TERAZ'),dom('h2','focus-title','Żadna książka nie jest potwierdzona jako rozpoczęta.'),dom('p','muted-note','Wybranie następnej lektury nie oznacza automatycznie jej rozpoczęcia.'));
      add(root,welcome);
    }
    if(state.next) {
      const next=dom('div','next-preview');
      add(next,dom('p','eyebrow',state.nextVerified?'WYBRANA NASTĘPNA':'NASTĘPNA WSKAZANA PRZEZ API — DO POTWIERDZENIA'));
      add(next,bookCompact(state.next,state.nextVerified?'Zatwierdzona decyzja — nie status czytania':'Stan ze starszego API — potwierdź w arkuszu',true));
      add(root,next);
    } else add(root,dom('p','muted-note','Brak potwierdzonego wyboru następnej lektury w odpowiedzi API.'));
    if(state.lastRead) {
      const box=dom('div','last-read');
      add(box,dom('p','eyebrow','OSTATNIO PRZECZYTANE'),bookCompact(state.lastRead,state.lastRead.rating?'Twoja ocena: '+state.lastRead.rating+'/5':'',true));
      add(root,box);
    }
  }
  function noteOptions() {
    const books=safeArray(state.payload?.library);
    const ids=new Set(safeArray(state.payload?.readingRoom).map(n=>text(n.bookId||n.idBook||'')).filter(Boolean));
    return books.filter(b=>ids.has(text(b.id)) || isTrue(b.read) || (state.active && text(b.id)===text(state.active.id)));
  }
  function renderBookSelect(select, books, selectedId, handler) {
    select.replaceChildren();
    const head=dom('option',null,'Wybierz książkę'); head.value=''; add(select,head);
    books.forEach(b=>{
      const opt=dom('option',null,cardTitle(b));opt.value=text(b.id);add(select,opt);
    });
    if(selectedId && books.some(b=>text(b.id)===text(selectedId))) select.value=selectedId;
    else if(books.length) select.value=text(books[0].id);
    else select.value='';
    handler(select.value);
  }
  function renderClub() {
    const root=$('#clubNotes'), select=$('#clubBookSelect');
    if(!state.payload) {empty(root,'Notatki są dostępne po połączeniu z API.');return;}
    const books=noteOptions();
    renderBookSelect(select,books,state.noteBook,id=>{state.noteBook=id;});
    const book=byId(state.noteBook);
    const list=safeArray(state.payload.readingRoom).filter(n=>
      text(n.bookId||n.idBook)===text(state.noteBook) || (!n.bookId && n.title===book?.title)
    ).filter(n=>allowedNote(n,book));
    root.replaceChildren();
    if(!book) { empty(root,'Brak książki z notatkami.'); return; }
    if(!isTrue(book.read) && upper(book.lifecycle)!=='READ' && !state.active) {
      empty(root,'Notatki z tej książki są ukryte do czasu potwierdzenia rozpoczęcia lektury.');
      return;
    }
    if(!list.length) { empty(root,'Brak notatek bezpiecznych dla potwierdzonego checkpointu.'); return; }
    list.slice().reverse().forEach(n=>{
      const item=dom('article','note-card');
      add(item,dom('p','eyebrow',([n.type,n.progress,n.date].filter(Boolean).join(' · '))),dom('p','note-body',n.note||''));
      add(root,item);
    });
  }
  function renderPeople() {
    const select=$('#peopleBookSelect'), root=$('#peopleCards'), rel=$('#peopleRelations');
    if(!state.payload) {empty(root,'Postacie są dostępne po połączeniu z API.');empty(rel,'');return;}
    const books=safeArray(state.payload.library).filter(b=>isTrue(b.read)||upper(b.lifecycle)==='READ'||(state.active && text(b.id)===text(state.active.id)));
    renderBookSelect(select,books,state.castBook,id=>{state.castBook=id;});
    const book=byId(state.castBook);
    const closed=isTrue(book?.read)||upper(book?.lifecycle)==='READ';
    const active=state.active && text(state.active.id)===text(state.castBook);
    const page=number(currentProgress()?.page);
    const gate=r=>{
      if(!closed&&!active) return false;
      if(!isTrue(rowField(r,'Safe Now?','Safe For Reader?'))) return false;
      if(active) {
        const match=text(rowField(r,'Visibility Gate','Safe Through')).match(/(?:p|strona\s*)\s*(\d+)/i);
        // Require explicit checkpoint for uncompleted books, never infer that all are safe.
        if(page===null || !match || Number(match[1])>page) return false;
      }
      return true;
    };
    const cast=modulesRows('bookCast').filter(r=>text(rowField(r,'Book ID'))===text(state.castBook) && gate(r));
    root.replaceChildren();rel.replaceChildren();
    if(!cast.length) {
      empty(root,active?'Nie ma jeszcze postaci zweryfikowanych do tego checkpointu.':'Nie ma zweryfikowanych postaci dla wybranej książki.');
    } else cast.forEach(r=>{
      const item=dom('article','person-card');
      const name=rowField(r,'Display Name','Character','Canonical Name')||'Postać';
      add(item,dom('div','person-initials',text(name).split(/\s+/).map(x=>x[0]).slice(0,2).join('')),dom('h3',null,name),
        dom('p','person-role',rowField(r,'Book Role','Role')||''),
        dom('p',null,rowField(r,'Who is this?','Safe Fact')||'Brak opisu potwierdzonego do checkpointu.'));
      add(root,item);
    });
    const relations=modulesRows('characterRelations').filter(r=>text(rowField(r,'Book ID'))===text(state.castBook) && gate(r));
    if(relations.length) {
      add(rel,dom('h3',null,'Relacje'));
      relations.forEach(r=>add(rel,dom('p','relation-line',[rowField(r,'From'),rowField(r,'Relation'),rowField(r,'To')].filter(Boolean).join(' · '))));
    }
  }
  function libraryFilter(book) {
    if(state.category==='read' && !isTrue(book.read) && upper(book.lifecycle)!=='READ') return false;
    if(state.category==='reading' && (!state.active||text(book.id)!==text(state.active.id))) return false;
    if(state.category==='next' && (!state.next||text(book.id)!==text(state.next.id))) return false;
    if(state.category==='other' && (isTrue(book.read)||upper(book.lifecycle)==='READ'||text(book.id)===text(state.active?.id)||text(book.id)===text(state.next?.id))) return false;
    return !state.search || [book.title,book.author,book.country,book.series].some(v=>text(v).toLocaleLowerCase('pl').includes(state.search));
  }
  function renderLibrary() {
    const root=$('#libraryCards');
    if(!state.payload){empty(root,'Biblioteka będzie dostępna po połączeniu z API.');return;}
    const books=safeArray(state.payload.library).filter(libraryFilter);
    root.replaceChildren();
    if(!books.length){empty(root,'Brak książek spełniających kryteria.');return;}
    books.forEach(book=>{
      const item=button('',()=>openBook(book),'library-item');
      item.setAttribute('aria-label','Szczegóły: '+cardTitle(book));
      add(item,bookCover(book,'regular'),titleAndAuthor(book));
      let status='Kandydat';
      if(isTrue(book.read)||upper(book.lifecycle)==='READ')status='Przeczytana'+(book.rating?' · '+book.rating+'/5':'');
      else if(state.active && text(book.id)===text(state.active.id))status='Czytam teraz';
      else if(state.next && text(book.id)===text(state.next.id))status='Wybrana następna';
      add(item,dom('span','book-status',status));add(root,item);
    });
  }
  function renderNext() {
    const root=$('#nextCards');
    if(!state.payload){empty(root,'Rekomendacje pojawią się po połączeniu z API.');return;}
    root.replaceChildren();
    if(state.next) {
      add(root,dom('p','eyebrow','JUŻ WYBRANA — NIE ZAMIENIAMY AUTOMATYCZNIE'));
      add(root,bookCompact(state.next,state.nextVerified?'Committed Next · z API':'Wybór z API — do uzgodnienia z arkuszem',true));
    }
    add(root,dom('h3','next-heading','Inne możliwości'));
    const candidates=safeArray(state.payload.candidates)
      .filter(b=>!['LOCKED','RETIRE','HOLD'].includes(upper(b.lifecycle)))
      .filter(b=>!isTrue(b.read) && text(b.id)!==text(state.active?.id) && text(b.id)!==text(state.next?.id))
      .slice().sort((a,b)=>(number(a.decisionRank)||999)-(number(b.decisionRank)||999)).slice(0,5);
    if(!candidates.length) add(root,dom('p','empty-state','Brak kandydatów w odpowiedzi silnika.'));
    if(upper(state.payload?.health?.overall)==='FAIL') add(root,dom('p','muted-note','Uwaga: zdrowie backendu = FAIL. Pokazuję jedynie robocze propozycje; nie podejmuję nowej decyzji, dopóki krytyczne reguły nie przejdą kontroli.'));
    candidates.forEach((b,i)=>{
      const item=dom('article','suggestion');
      add(item,bookCover(b,'small'));
      const info=titleAndAuthor(b);
      const explain=b.decisionWhy || (number(b.infoGain)>=85?'Ciekawy kierunek eksploracji gustu.':number(b.discoverySignal)>=80?'Wyróżniony przez sygnały odkryć.':'Warty uwagi według bieżącego modelu.');
      add(info,dom('p','suggestion-why',explain));
      add(item,info,button('Szczegóły',()=>openBook(resolvedBook(b)),'quiet-button'));add(root,item);
    });
    add(root,dom('p','fine-print','To propozycje, nie lista zobowiązań. Przed faktycznym wyborem kolejnego tytułu konieczna jest świeża kontrola serii, ciągłości i dostępności.'));
  }
  function openBook(book) {
    const dialog=$('#bookDialog'), content=$('#bookDetail');
    content.replaceChildren();
    const head=dom('div','book-dialog-head');
    add(head,bookCover(book,'regular'),titleAndAuthor(book,'h2'));add(content,head);
    if(book.series) add(content,dom('p','muted-note','Seria: '+book.series+(book.volume?' · tom '+book.volume:'')));
    if(isTrue(book.read)||upper(book.lifecycle)==='READ') add(content,dom('p','muted-note','Przeczytana'+(book.rating?' · Twoja ocena: '+book.rating+'/5':'')));
    add(content,dom('p','fine-print','Dossier pokazuje wyłącznie dane bibliograficzne. Informacje fabularne są dostępne w sekcji Postacie zgodnie z checkpointem.'));
    dialog.showModal();
  }
  function finishBook() {
    if(!state.active) return;
    const message='Ukończyłem/am „'+cardTitle(state.active)+'” — '+text(state.active.author)+'. Chcę przeprowadzić debrief i zapisać zakończenie w Crime Cockpit.';
    const dialog=$('#finishDialog');
    $('#finishMessage').value=message;
    dialog.showModal();
  }
  async function copyFinish() {
    const value=$('#finishMessage').value;
    try { await navigator.clipboard.writeText(value); $('#finishHint').textContent='Skopiowano. Wklej wiadomość do czatu, aby przeprowadzić debrief.'; }
    catch (_) { $('#finishMessage').focus();$('#finishMessage').select();$('#finishHint').textContent='Zaznaczony tekst można skopiować ręcznie.'; }
  }
  function renderAll() {
    renderNow();renderClub();renderPeople();renderLibrary();renderNext();
    $('#lastSync').textContent=state.loadedAt?'Odpowiedź API: '+new Date(state.loadedAt).toLocaleString('pl-PL'):'Brak danych LIVE';
    if(state.notice) showNotice(state.notice);
    else if(state.issues.length) showNotice('Uwaga: '+state.issues.join(' ')+' Nie traktuj nieuzgodnionego wyboru jako potwierdzonej bieżącej lektury.');
    else showNotice('');
    selectView(state.selected);
  }
  async function load() {
    if(state.loading)return;
    const c=config();
    if(!validatedUrl(c.url)||!c.token) {
      state.payload=null;state.issues=[];state.notice='Podłącz istniejące API Apps Script w ustawieniach. Publiczne dane demonstracyjne nie zastępują Twojej biblioteki.';setHealth('Brak połączenia','warn');
      renderAll();return;
    }
    state.loading=true;setHealth('Łączenie…','neutral');
    try {
      const payload=await jsonp(c.url,c.token,{scope:'core'});
      normalize(payload);
      state.notice='';
      setHealth('Odpowiedź LIVE','ok');renderAll();
      try {
        const extras=await jsonp(c.url,c.token,{scope:'modules',keys:'bookCast,characterRelations,checkpointSnapshots'},16000);
        if(!extras?.ok) throw new Error('Moduły niedostępne');
        state.modules={...state.modules,...(extras.modules||{})};
        renderPeople();
      } catch(moduleError) {
        setHealth('LIVE · część danych niedostępna','warn');
        state.notice='Główne dane są aktualne, ale część notatek lub postaci może być niedostępna. Odśwież połączenie.';
        renderAll();
      }
    } catch(error) {
      state.payload=null;state.modules={};state.active=null;state.next=null;
      setHealth('Dane niedostępne','warn');
      state.notice='Nie można potwierdzić bieżącego stanu. '+text(error?.message||error)+'. Nie wyświetlam nieaktualnego snapshotu jako aktualnego.';
      renderAll();
    } finally {state.loading=false;}
  }
  function init() {
    document.querySelectorAll('[data-nav]').forEach(b=>b.addEventListener('click',()=>selectView(b.dataset.nav)));
    $('#refreshBtn').addEventListener('click',()=>load());
    $('#settingsBtn').addEventListener('click',()=>{
      const c=config();$('#apiUrl').value=c.url;$('#apiToken').value=c.token;$('#settingsDialog').showModal();
    });
    $('#settingsForm').addEventListener('submit',event=>{
      event.preventDefault();
      storage.set('crimeCockpitApiUrl',$('#apiUrl').value.trim());
      storage.set('crimeCockpitToken',$('#apiToken').value.trim());
      $('#settingsDialog').close();load();
    });
    $('#forgetConfig').addEventListener('click',()=>{
      storage.remove('crimeCockpitApiUrl');storage.remove('crimeCockpitToken');
      $('#settingsDialog').close();load();
    });
    $('#clubBookSelect').addEventListener('change',event=>{state.noteBook=event.target.value;renderClub();});
    $('#peopleBookSelect').addEventListener('change',event=>{state.castBook=event.target.value;renderPeople();});
    $('#librarySearch').addEventListener('input',event=>{state.search=event.target.value.toLocaleLowerCase('pl').trim();renderLibrary();});
    $('#libraryFilter').addEventListener('change',event=>{state.category=event.target.value;renderLibrary();});
    $('#bookClose').addEventListener('click',()=>$('#bookDialog').close());
    $('#finishClose').addEventListener('click',()=>$('#finishDialog').close());
    $('#copyFinish').addEventListener('click',copyFinish);
    $('#sheetLink').href=SHEET_URL;
    window.addEventListener('focus',()=>{if(state.loadedAt && Date.now()-state.loadedAt>600000)load();});
    renderAll();load();
  }
  document.addEventListener('DOMContentLoaded',init);
  window.__crimeLiteTest={readBookState,allowedNote,version:VERSION,state};
})();
