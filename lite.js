/* Crime Cockpit Lite — presentation-only shell.
 * The operational Sheet and Apps Script remain the sources of book state.
 * No demo data is ever presented as owner data and no read-only action pretends to write.
 */
(function () {
  'use strict';
  const VERSION = '9.3.0-lite';
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
    lastRead: null, issues: [], notice: '', nextVerified: false, loading: false, notesLoaded: false, translationsLoaded: false, translationFilter: 'all', notesDiagnostic: ''
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

  function noteFromRow(raw) {
    if(!raw || typeof raw!=='object') return null;
    const v=(...keys)=>{for(const key of keys) if(raw[key]!==undefined && raw[key]!==null && raw[key]!=='') return raw[key];return '';};
    const item={
      id:text(v('id','noteId','Note ID')),
      bookId:text(v('bookId','idBook','Book ID','book_id')),
      title:text(v('title','Tytuł','Title')),
      timestamp:text(v('timestamp','date','Timestamp','Date','Data')),
      progress:text(v('progress','Postęp','Progress')),
      type:text(v('type','Typ','Type')),
      note:text(v('note','Notatka użytkownika','Notatka','User note','Note')),
      spoilerPolicy:text(v('spoilerPolicy','Spoiler policy'))
    };
    return item.bookId && item.note ? item : null;
  }
  function noteRowsFrom(source) {
    const values=Array.isArray(source)?source:Array.isArray(source?.rows)?source.rows:[];
    return values.map(noteFromRow).filter(Boolean);
  }
  function mergeReaderNotes(...sources) {
    const merged=new Map();
    for(const source of [state.payload?.readingRoom,...sources]) for(const note of noteRowsFrom(source)){
      const key=note.id || [note.bookId,note.timestamp,note.note].join('|');
      merged.set(key,{...(merged.get(key)||{}),...note});
    }
    const out=[...merged.values()].sort((a,b)=>text(a.timestamp).localeCompare(text(b.timestamp)));
    if(state.payload) state.payload.readingRoom=out;
    state.notesLoaded=out.length>0;
    return out;
  }
  function sortDate(v) {
    const t=text(v).trim();
    const match=t.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
    return match?match[3]+'-'+match[2]+'-'+match[1]+t.slice(10):t;
  }

  function liveReadingEvidence(book,notes) {
    if(!book || isTrue(book.read) || upper(book.lifecycle)==='READ') return null;
    const matches=notes.filter(n=>text(n.bookId)===text(book.id));
    // Evidence must come from the owner's actual in-book progress, not a preselected queue.
    const confirmed=matches.map(n=>{
      const match=text(n.progress).match(/(?:^|\b)(?:strona|strony|stron|p\.?|page)?\s*(\d+)\s*(?:strona|strony|stron|str\.|pages?|p\.)?/i);
      const value=match?Number(match[1]):null;
      if(value===null || !Number.isFinite(value) || value<1 || value>20000) return null;
      if(/ukończon|finished|przeczytan/i.test(text(n.progress))) return null;
      return {page:value,note:n};
    }).filter(Boolean);
    if(!confirmed.length)return null;
    return confirmed.sort((a,b)=>a.page-b.page).pop();
  }
  function latestCompleteSignal(bookId,notes) {
    return notes.filter(n=>text(n.bookId)===text(bookId) &&
      /(?:ukończon|zakończon|READ COMPLETE|FINISHED)/i.test(text(n.progress)+' '+text(n.note).slice(0,90)))
      .map(n=>sortDate(n.timestamp)).sort().pop()||'';
  }
  function readBookState(payload) {
    const books=safeArray(payload.library);
    const explicit=payload.readerState && typeof payload.readerState==='object' ? payload.readerState : {};
    const started=books.filter(b=>['READING','CURRENTLY READING','IN PROGRESS','CZYTAM'].includes(upper(b.lifecycle)) || isTrue(b.reading));
    const activeId=explicit.activeBookId || explicit.currentlyReadingId || '';
    const notes=noteRowsFrom(payload.readingRoom);
    const evidence=books.filter(b=>!isTrue(b.read)&&upper(b.lifecycle)!=='READ').map(b=>({book:b,signal:liveReadingEvidence(b,notes)})).filter(x=>x.signal);
    const selected=books.filter(b=>upper(b.lifecycle)==='CURRENT NEXT');
    const readingFromNotes=evidence.filter(x=>selected.some(c=>text(c.id)===text(x.book.id)));
    const inferred=readingFromNotes.length===1 ? readingFromNotes[0]:null;
    state.active=resolvedBook(books.find(b=>text(b.id)===text(activeId)) || started[0] || inferred?.book || null);
    state.inferredProgress=inferred?.signal ? {page:inferred.signal.page,label:'Strona '+inferred.signal.page+' · potwierdzona w Reading Room'}:null;
    const explicitNext=explicit.committedNextId || explicit.nextBookId || '';
    const committed=books.filter(b=>upper(b.lifecycle)==='CURRENT NEXT' && !isTrue(b.read));
    // The operational Lifecycle formula outranks the legacy preselected `current` UI field.
    const rawNext=books.find(b=>text(b.id)===text(explicitNext)) || (committed.length===1?committed[0]:null) || payload.current || null;
    state.next=resolvedBook(rawNext);
    state.nextVerified=Boolean(explicitNext || committed.length===1);
    // CURRENT NEXT remains a historical committed decision after the owner logs real reading progress.
    if(state.active && state.next && text(state.active.id)===text(state.next.id)) {state.next=null;state.nextVerified=false;}
    const completed=books.filter(b=>isTrue(b.read) || upper(b.lifecycle)==='READ');
    const completionDate=b=>sortDate(b.dateCompleted||b.completedAt||b.finishedAt||b.completionDate||b.dateFinished||b.readDate||b.extra?.['Data ukończenia']||latestCompleteSignal(b.id,notes));
    const completedSorted=completed.filter(b=>completionDate(b)).slice().sort((a,b)=>completionDate(b).localeCompare(completionDate(a)));
    // If the legacy API omitted completion dates, a confirmed post-read Room note is trustworthy timing evidence.
    const lastId=explicit.lastCompletedId || '';
    state.lastRead=resolvedBook(books.find(b=>text(b.id)===text(lastId)) || completedSorted[0] || null);
    const issues=[];
    if(committed.length>1) issues.push('Baza ma więcej niż jedną książkę CURRENT NEXT.');
    if(committed.length===0) issues.push('Nie ma jednoznacznego CURRENT NEXT w danych biblioteki.');
    if(committed.length===1 && payload.current?.id && text(payload.current.id)!==text(committed[0].id)) issues.push('Starsze pole current w API jest niespójne z Lifecycle — wyświetlam zatwierdzony status Lifecycle.');
    if(explicitNext && committed.length===1 && text(explicitNext)!==text(committed[0].id)) issues.push('Reader State i Lifecycle wskazują różne książki.');
    if(started.length>1) issues.push('W API występuje więcej niż jedna rozpoczęta książka.');
    if(activeId && state.active?.id!==activeId) issues.push('Nie znaleziono aktywnej książki wskazanej przez Reader State.');
    if(state.active && state.next && text(state.active.id)===text(state.next.id)) issues.push('API traktuje tę samą książkę jednocześnie jako rozpoczętą i kolejną.');
    if(explicitNext && payload.current?.id && text(explicitNext)!==text(payload.current.id)) issues.push('Reader State i starsze pole current wskazują różne książki.');
    if(!explicitNext && committed.length!==1 && state.next) issues.push('Pozycja „następna” pochodzi ze starszego pola API i wymaga sprawdzenia w arkuszu.');
    if(!activeId && started.length===0 && !inferred) state.active=null; // Selection alone is not evidence.
    if(!state.active && explicit.status==='READING') issues.push('Reader State deklaruje czytanie bez jednoznacznej książki.');
    if(explicit.conflicts?.length) issues.push('Backend zgłosił konflikt źródeł stanu.');
    state.issues=issues;
  }
  function normalize(payload) {
    if(!payload || payload.ok!==true) throw new Error(text(payload?.error||'Nieprawidłowa odpowiedź API'));
    if(!Array.isArray(payload.library) || !Array.isArray(payload.candidates)) throw new Error('Brakuje biblioteki lub kandydatów w API.');
    state.payload=payload;
    state.modules=payload.modules||{};
    mergeReaderNotes(payload.readingRoom,payload.notes,payload.modules?.readingRoom);
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
    const progress=s.progress||state.active.progress||state.inferredProgress||null;
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
    if(!['now','club','people','library','next','translations'].includes(name)) name='now';
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
    if(name==='translations') renderTranslations();
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
      if(!state.active && state.nextVerified) add(next,button('Zgłoś rozpoczęcie',requestStart,'gold-button'));
      add(root,next);
    } else add(root,dom('p','muted-note','Brak potwierdzonego wyboru następnej lektury w odpowiedzi API.'));
    if(state.lastRead) {
      const box=dom('div','last-read');
      add(box,dom('p','eyebrow','OSTATNIO PRZECZYTANE'),bookCompact(state.lastRead,state.lastRead.rating?'Twoja ocena: '+state.lastRead.rating+'/5':'',true));
      add(root,box);
    }
  }

  function noteOptions() {
    const notes=noteRowsFrom(state.payload?.readingRoom);
    const ids=new Set(notes.map(n=>n.bookId));
    const books=safeArray(state.payload?.library).filter(b=>
      ids.has(text(b.id)) || isTrue(b.read) || upper(b.lifecycle)==='READ' ||
      (state.active && text(b.id)===text(state.active.id))
    );
    // Legacy core can omit an archived book from its abbreviated library payload.
    for(const n of notes) if(!books.some(b=>text(b.id)===n.bookId)) {
      const published=safeArray(state.payload?.library).find(b=>text(b.title)===text(n.title));
      if(published) books.push(published);
    }
    return books.sort((a,b)=>{
      const newest=id=>notes.filter(n=>n.bookId===text(id)).map(n=>n.timestamp).sort().pop()||'';
      return newest(b.id).localeCompare(newest(a.id));
    });
  }
  function renderBookSelect(select, books, selectedId, handler) {
    select.replaceChildren();
    const head=dom('option',null,'Wybierz książkę');head.value='';add(select,head);
    books.forEach(b=>{const opt=dom('option',null,cardTitle(b));opt.value=text(b.id);add(select,opt);});
    if(selectedId && books.some(b=>text(b.id)===text(selectedId))) select.value=selectedId;
    else if(books.length) select.value=text(books[0].id);
    else select.value='';
    handler(select.value);
  }
  function renderClub() {
    const root=$('#clubNotes'), select=$('#clubBookSelect');
    if(!state.payload) {empty(root,'Notatki będą dostępne po połączeniu z danymi LIVE.');return;}
    const notes=noteRowsFrom(state.payload.readingRoom);
    const books=noteOptions();
    if(!state.noteBook && state.lastRead && books.some(b=>text(b.id)===text(state.lastRead.id)))state.noteBook=text(state.lastRead.id);
    renderBookSelect(select,books,state.noteBook,id=>{state.noteBook=id;});
    const book=byId(state.noteBook)||books.find(b=>text(b.id)===text(state.noteBook));
    const list=notes.filter(n=>n.bookId===text(state.noteBook)||(!n.bookId&&n.title===book?.title))
      .filter(n=>allowedNote(n,book));
    root.replaceChildren();
    if(!book) {empty(root,notes.length?'Nie udało się powiązać notatek z książką.':'Archiwum notatek nie zostało dostarczone przez API. Sprawdź odświeżenie lub zakres integracji Apps Script.');return;}
    if(!list.length){
      if(!notes.length) empty(root,'Archiwum Reading Room nie jest dostępne w odpowiedzi API. To problem synchronizacji, a nie brak zapisanych notatek.');
      else empty(root,'Brak notatek bezpiecznych dla tej książki i jej potwierdzonego checkpointu.');
      return;
    }
    const info=dom('p','muted-note',list.length+' notatek · '+cardTitle(book));add(root,info);
    list.slice().reverse().forEach(n=>{
      const item=dom('article','note-card');
      add(item,dom('p','eyebrow',([n.type,n.progress,n.timestamp].filter(Boolean).join(' · '))),dom('p','note-body',n.note));
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
      const initials=text(name).split(/\s+/).map(x=>x[0]).slice(0,2).join('');
      const portrait=dom('div','person-initials',initials);
      const asset=modulesRows('caseFileAssets').find(a=>text(rowField(a,'Character ID'))===text(rowField(r,'Character ID')) && text(rowField(a,'Book ID'))===text(state.castBook));
      const driveId=text(rowField(asset,'Drive File ID'));
      if(upper(rowField(asset,'Portrait Status')).includes('READY') && /^[A-Za-z0-9_-]{12,}$/.test(driveId)) {
        const img=dom('img','person-picture');img.alt='Wizualizacja postaci: '+name;
        img.loading='lazy';img.referrerPolicy='no-referrer';
        img.src='https://drive.google.com/thumbnail?id='+encodeURIComponent(driveId)+'&sz=w360';
        img.addEventListener('error',()=>img.remove());add(portrait,img);
      }
      add(item,portrait,dom('h3',null,name),
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
      .filter(b=>!['BLOCK','LOCK','HOLD','FAIL','DEPENDENCY LOCK'].includes(upper(b.eligibility||b.gate||b.recommendationGate||b.preflightVerdict)))
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
  function requestStart() {
    if(!state.next || !state.nextVerified) return;
    $('#finishDialog .eyebrow').textContent='ROZPOCZĘCIE LEKTURY';
    $('#finishDialog h2').textContent='Zgłoś rozpoczęcie';
    $('#finishDialog .dialog-body > p:nth-child(3)').textContent='Aplikacja odczytuje dane, ale nie zapisuje ich w arkuszu. Skopiuj wiadomość do czatu, aby potwierdzić rozpoczęcie książki.';
    $('#finishMessage').value='Rozpocząłem lekturę „'+cardTitle(state.next)+'” — '+text(state.next.author)+'. Zaktualizuj Crime Cockpit.';
    $('#finishHint').textContent='';
    $('#finishDialog').showModal();
  }
  function finishBook() {
    if(!state.active) return;
    $('#finishDialog .eyebrow').textContent='CASE CLOSED';
    $('#finishDialog h2').textContent='Zgłoś ukończenie';
    $('#finishDialog .dialog-body > p:nth-child(3)').textContent='Obecne API jest tylko do odczytu. Skopiuj wiadomość do rozmowy w ChatGPT, aby przeprowadzić debrief i zapisać zakończenie.';
    $('#finishHint').textContent='';
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

  function translationInventory() {
    const result=new Map();
    const books=safeArray(state.payload?.library);
    const tsr=modulesRows('translationStateReconciler');
    const pep=modulesRows('polishEditionPipeline');
    const editions=modulesRows('editionRegistry');
    const vault=modulesRows('ebookVault');
    const shelf=modulesRows('readyShelf');
    const byBook=rows=>new Map(rows.map(r=>[text(rowField(r,'Book ID','bookId')),r]).filter(([id])=>id));
    const stateById=byBook(tsr), pipelineById=byBook(pep), readyById=byBook(shelf);
    const matchedVault=vault.filter(r=>upper(rowField(r,'Format'))==='EPUB'&&
      upper(rowField(r,'Language'))==='PL'&&upper(rowField(r,'Inventory status'))==='MATCHED');
    const official=b=>upper(b?.language||b?.languageStatus||b?.extra?.['Language Status']).includes('PL OFFICIAL');
    const ids=new Set([
      ...books.map(b=>text(b.id)),
      ...tsr.map(r=>text(rowField(r,'Book ID'))),
      ...pep.map(r=>text(rowField(r,'Book ID')))
    ]);
    for(const id of ids) {
      if(!id)continue;
      const book=books.find(b=>text(b.id)===id)||{};
      const status=stateById.get(id)||{};
      const production=pipelineById.get(id)||{};
      const ready=readyById.get(id)||{};
      const rows=editions.filter(e=>text(rowField(e,'Book ID'))===id);
      const files=matchedVault.filter(e=>text(rowField(e,'Book ID'))===id);
      const finalEvidence=rows.some(e=>upper(rowField(e,'Language'))==='PL' && 
        /FINAL ACCEPTED/.test(upper(rowField(e,'Status'))));
      const finalByReconciler=/FINAL ACCEPTED/.test(upper(rowField(status,'Canonical state')));
      const physicalPl=files.length>0;
      const isFinal=physicalPl && (finalEvidence || finalByReconciler);
      const work=upper(rowField(status,'Canonical state','Baza TX state')||
        rowField(production,'Canonical TX state')||book.translationStudioState||book.extra?.['Translation Studio State']);
      const studioActive=/IN PROGRESS|ACTIVE|DRAFT COMPLETE|TRANSLAT|TX-05|CROSS-BOOK QA/.test(work)&&!/FINAL ACCEPTED/.test(work);
      const queued=!studioActive && (work.includes('QUEUED') || upper(rowField(production,'Action'))==='TRANSLATE');
      const isOfficial=official(book)||upper(rowField(production,'Preferred route'))==='OFFICIAL PL';
      let kind='other',label='';
      if(studioActive){kind='active';label='W trakcie Translation Studio';}
      else if(isFinal){kind='private';label='Prywatny przekład PL · gotowy';}
      else if(queued){kind='queued';label='Tłumaczenie zaplanowane';}
      else if(isOfficial){kind='official';label='Oficjalne wydanie PL';}
      if(kind==='other')continue;
      const name=book?.title||rowField(status,'Title')||rowField(production,'Title')||id;
      const author=book?.author||rowField(production,'Author')||'';
      const hints=[rowField(status,'Repair / action'),rowField(production,'Why now')].filter(Boolean);
      const folderInStatus=text(rowField(status,'Repair / action')).match(/https:\/\/drive\.google\.com\/drive\/folders\/[A-Za-z0-9_-]+/);
      const rawFile=rowField(files[0],'Drive File ID'), idValid=/^[A-Za-z0-9_-]{12,}$/.test(text(rawFile));
      const link=idValid?'https://drive.google.com/file/d/'+encodeURIComponent(text(rawFile))+'/view':'';
      result.set(id,{id,book:{...book,id,title:name,author},kind,label,
        owned:physicalPl || isTrue(book.vaultEpub)||upper(rowField(production,'Source owned'))==='YES',
        plOwned:physicalPl|| (isOfficial&&shelf.size && upper(rowField(ready,'Owned language')).includes('PL')),
        finishedPl:physicalPl,link,folderUrl:folderInStatus?.[0]||'',
        detail:kind==='active'?rowField(status,'Canonical state')||work:kind==='queued'?rowField(production,'Why now'):kind==='official'?(physicalPl?'Polski EPUB w Twoim Vault':'Oficjalne wydanie; własny plik niepotwierdzony'):rowField(status,'Edition Registry PL state')||'FINAL ACCEPTED',
        notes:hints.join(' · '),priority:number(rowField(production,'Production Priority'))||0,
        rank:number(rowField(production,'Decision Rank'))||999,
        gate:upper(rowField(production,'Gate')),
        sourceOwned:upper(rowField(production,'Source owned'))==='YES',
        action:upper(rowField(production,'Action')),
        investment:upper(rowField(production,'Investment gate')),
        hasFinalEvidence:finalEvidence||finalByReconciler
      });
    }
    return [...result.values()];
  }
  function renderTranslations() {
    const root=$('#translationCards'), summary=$('#translationSummary'), suggestion=$('#translationSuggestion');
    if(!root||!summary||!suggestion)return;
    if(!state.payload){empty(root,'Wydania pojawią się po połączeniu z API.');summary.replaceChildren();suggestion.replaceChildren();return;}
    const records=translationInventory();
    const totals={active:0,private:0,official:0,queued:0};
    records.forEach(r=>{if(r.kind in totals) totals[r.kind]++;});
    summary.replaceChildren();
    [['Gotowe prywatne PL',totals.private],['Oficjalne PL',totals.official],['W trakcie Studio',totals.active],['Planowane',totals.queued]]
      .forEach(([name,value])=>{const item=dom('div','translation-stat');add(item,dom('strong',null,value),dom('span',null,name));add(summary,item);});
    suggestion.replaceChildren();
    const next=records.filter(r=>r.kind==='queued' && r.action==='TRANSLATE' && r.gate==='AUTO PASS'&&r.sourceOwned)
      .sort((a,b)=>b.priority-a.priority||a.rank-b.rank)[0];
    if(next) {
      const card=dom('article','translation-suggestion-card');
      add(card,dom('p','eyebrow',totals.active?'PO ZAKOŃCZENIU BIEŻĄCEGO TX':'NASTĘPNA PROPOZYCJA DO TRANSLATION STUDIO'),
        dom('h3',null,cardTitle(next.book)),dom('p',null,next.book.author),
        dom('p',null,'Źródło zarejestrowane w Vault. Plan produkcyjny wskazuje ten tytuł jako kolejny do rozważenia. Przed otwarciem projektu sprawdzamy ponownie dostępność oficjalnego PL, inwestycyjną bramkę jakości i preflight.'));
      if(next.investment) add(card,dom('p','fine-print','Investment gate: '+next.investment));
      add(suggestion,card);
    }else add(suggestion,dom('p','muted-note','Brak potwierdzonego następnego projektu TX w danych silnika. Nie tworzymy sztucznej nominacji.'));
    const search=text($('#translationSearch')?.value).toLocaleLowerCase('pl').trim();
    const matches=records.filter(r=>(state.translationFilter==='all'||r.kind===state.translationFilter)&&
      (!search||[r.book.title,r.book.author].some(v=>text(v).toLocaleLowerCase('pl').includes(search))));
    const order={active:0,private:1,queued:2,official:3};
    matches.sort((a,b)=>order[a.kind]-order[b.kind]||a.rank-b.rank||cardTitle(a.book).localeCompare(cardTitle(b.book),'pl'));
    root.replaceChildren();
    if(!state.translationsLoaded){
      add(root,dom('p','muted-note','Statusy z Translation Studio i Ebook Vault nie zostały jeszcze pobrane. Pokazuję wyłącznie to, co wynika z danych podstawowych; brak pozycji nie oznacza braku pliku.'));
    }
    const visible=state.translationFilter==='all' && !search ? matches.slice(0,35):matches;
    if(!visible.length){add(root,dom('p','empty-state','Brak wydań z takim statusem w aktualnie dostępnej części rejestru.'));return;}
    visible.forEach(r=>{
      const item=dom('article','translation-entry');
      add(item,bookCover(r.book,'small'),titleAndAuthor(r.book));
      const status=dom('div','translation-entry-info');
      add(status,dom('span','translation-entry-status status-'+r.kind,r.label),
        dom('small',null,r.detail||''),
        dom('small',null,r.kind==='private'?'Polski plik EPUB w Vault':r.kind==='active'?'To jeszcze nie jest gotowe wydanie PL':r.kind==='official'?(r.plOwned?'Własna kopia w Vault':'Wydanie katalogowe — stan posiadania niepotwierdzony'):'Produkcja jeszcze się nie rozpoczęła'));
      add(item,status);
      const actions=dom('div','action-row');
      if(r.kind==='private' && r.link) add(actions,button('Otwórz EPUB',()=>window.open(r.link,'_blank','noopener,noreferrer'),'quiet-button'));
      if(r.kind==='active' && r.folderUrl) add(actions,button('Folder Studio',()=>window.open(r.folderUrl,'_blank','noopener,noreferrer'),'quiet-button'));
      if(r.book.id && byId(r.book.id)) add(actions,button('Książka',()=>openBook(r.book),'quiet-button'));
      add(item,actions);add(root,item);
    });
    if(visible.length<matches.length) add(root,dom('p','muted-note','Pokazuję pierwsze '+visible.length+' pozycji. Użyj filtra albo wyszukiwarki, aby przejrzeć pozostałe '+(matches.length-visible.length)+'.'));
  }

  function renderAll() {
    renderNow();renderClub();renderPeople();renderLibrary();renderNext();renderTranslations();
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


      // Reading Room is personal data. Do not embed its contents in public assets.
      // Full legacy payload is NOT a valid fallback: it times out on the large
      // Crime Cockpit workbook. A narrow, header-driven module is necessary.
      const jobs=[
        ...(state.notesLoaded?[]:[{key:'reader',request:{scope:'modules',keys:'readingRoom'}}]),
        {key:'characters',request:{scope:'modules',keys:'bookCast,characterRelations,checkpointSnapshots,caseFileAssets'}},
        {key:'editions',request:{scope:'modules',keys:'editionRegistry,ebookVault,polishEditionPipeline,translationStateReconciler,readyShelf,translationGateway'}}
      ];
      const responses=await Promise.all(jobs.map(async job=>{
        try{return {key:job.key,payload:await jsonp(c.url,c.token,job.request,15000)}}
        catch(error){return {key:job.key,error};}
      }));
      const failed=[],readerResult=responses.find(r=>r.key==='reader');
      for(const result of responses){
        if(!result.payload?.ok){
          failed.push(result.key);
          continue;
        }
        const part=result.payload;
        state.modules={...state.modules,...(part.modules||{})};
        mergeReaderNotes(part.readingRoom,part.notes,part.modules?.readingRoom);
      }
      if(!state.notesLoaded){
        const rr=readerResult?.payload?.modules?.readingRoom;
        state.notesDiagnostic=readerResult?.error?'Brak odpowiedzi z modułu Reading Room'
          :rr?.status==='UNAVAILABLE'?'Błąd odczytu karty Reading Room w Apps Script'
          :rr?.status==='MISSING'?'Brakuje karty Reading Room w podłączonym arkuszu'
          :rr && Array.isArray(rr.rows)?'Moduł Reading Room odpowiada, lecz zwraca 0 wpisów'
          :'Opublikowany Apps Script nie udostępnia modułu readingRoom';
      }else state.notesDiagnostic='';
      state.translationsLoaded=['editionRegistry','ebookVault','polishEditionPipeline','translationStateReconciler'].some(k=>modulesRows(k).length>0);
      readBookState(state.payload);
      if(failed.length){
        setHealth('LIVE · częściowo','warn');
        state.notice='Rdzeń danych LIVE działa, ale nie pobrano: '+failed.join(', ')+'. Część historii lub wydań może być niewidoczna.';
      }else if(!state.notesLoaded){
        setHealth('LIVE · brak historii','warn');
        state.notice='Notatki są zapisane w Google Sheets, ale '+state.notesDiagnostic+'. Wymagana jest aktualizacja istniejącego wdrożenia Apps Script; samo odświeżenie strony nie pomoże.';
      }
      renderAll();
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
    $('#translationFilter').addEventListener('change',event=>{state.translationFilter=event.target.value;renderTranslations();});
    $('#translationSearch').addEventListener('input',renderTranslations);
    $('#bookClose').addEventListener('click',()=>$('#bookDialog').close());
    $('#finishClose').addEventListener('click',()=>$('#finishDialog').close());
    $('#copyFinish').addEventListener('click',copyFinish);
    const sheetLink=$('#sheetLink'); if(sheetLink) sheetLink.href=SHEET_URL;
    window.addEventListener('focus',()=>{if(state.loadedAt && Date.now()-state.loadedAt>600000)load();});
    renderAll();load();
  }
  document.addEventListener('DOMContentLoaded',init);
  window.__crimeLiteTest={readBookState,allowedNote,noteFromRow,noteRowsFrom,mergeReaderNotes,latestCompleteSignal,liveReadingEvidence,translationInventory,version:VERSION,state};
})();
