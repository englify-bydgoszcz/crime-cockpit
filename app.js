(() => {
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const FRONTEND_VERSION = '6.3.5';
  let data = null;
  let activeView = 'overview';
  let revealObserver = null;
  let achievementStatusFilter = 'all';
  let achievementCategoryFilter = '';
  let characterCaseTab = 'files';
  let characterCaseBookId = '';
  let casePlaybackIndex = -1;

  const state = {
    apiUrl: localStorage.getItem('crimeCockpitApiUrl') || '',
    token: localStorage.getItem('crimeCockpitToken') || '',
    mode: localStorage.getItem('crimeCockpitViewMode') || 'owner'
  };

  const fallbackModules = [
    {id:'overview',label:'Kokpit',enabled:true,owner:true,expert:true,order:10,icon:'◉'},
    {id:'queue',label:'Kolejka',enabled:true,owner:true,expert:true,order:20,icon:'→'},
    {id:'director',label:'Reżyser',enabled:true,owner:true,expert:true,order:25,icon:'✦'},
    {id:'library',label:'Biblioteka',enabled:true,owner:true,expert:true,order:30,icon:'▦'},
    {id:'characters',label:'Postacie',enabled:true,owner:true,expert:true,order:32,icon:'♟'},
    {id:'achievements',label:'Trofea',enabled:true,owner:true,expert:true,order:35,icon:'★'},
    {id:'coverage',label:'Mapa wiedzy',enabled:true,owner:false,expert:true,order:40,icon:'◎'},
    {id:'frontier',label:'Granice wiedzy',enabled:true,owner:false,expert:true,order:42,icon:'◇'},
    {id:'enrichment-engine',label:'ROI researchu',enabled:true,owner:false,expert:true,order:43,icon:'↯'},
    {id:'health',label:'Stan systemu',enabled:true,owner:false,expert:true,order:45,icon:'✓'},
    {id:'reading-room',label:'Klub lekturowy',enabled:true,owner:true,expert:true,order:50,icon:'✎'},
    {id:'simulator',label:'Symulator',enabled:true,owner:false,expert:true,order:55,icon:'⇄'},
    {id:'missions',label:'Misje',enabled:true,owner:false,expert:true,order:58,icon:'◆'},
    {id:'model',label:'Jak myśli system?',enabled:true,owner:false,expert:true,order:60,icon:'∿'},
    {id:'arena',label:'Arena modeli',enabled:true,owner:false,expert:true,order:63,icon:'⚔'},
    {id:'lab',label:'Laboratorium',enabled:true,owner:false,expert:true,order:70,icon:'⚗'}
  ];

  function n(v, digits=1) {
    if (v === null || v === undefined || v === '') return '—';
    const x = Number(String(v).replace(',', '.'));
    return Number.isFinite(x) ? x.toLocaleString('pl-PL', {maximumFractionDigits:digits}) : String(v);
  }
  function clamp(v,min=0,max=100){ return Math.max(min,Math.min(max,Number(v)||0)); }
  function esc(v='') { return String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])); }
  function safeArray(v){ return Array.isArray(v) ? v : []; }
  function hashHue(s=''){ let h=0; for(const ch of String(s)) h=(h*31+ch.charCodeAt(0))%360; return h; }
  function confidenceText(v){ const x=Number(v)||0; if(x<25)return 'jeszcze niska'; if(x<50)return 'umiarkowana'; if(x<75)return 'dobra'; return 'wysoka'; }
  function humanMode(mode){ return ({'AUTO':'Bez dodatkowego filtra','COMFORT':'Mam ochotę na bezpieczny strzał','EXPLORER':'Chcę odkryć coś nowego','POLSKA':'Mam ochotę na polski kryminał','LOW FRICTION':'Chcę zacząć bez tarcia','FRESH RADAR':'Coś świeżego','SERIES CONTINUE':'Wracamy do dobrej serii'})[mode] || mode || 'Bez dodatkowego filtra'; }
  function humanDecisionMode(mode){ return ({'WARM-UP / EXPLORE':'Jeszcze poznajemy Twój gust','BALANCED / LEARNING':'Już wiemy coraz więcej','WILDCARD':'Czas na kontrolowany eksperyment'})[mode] || mode || 'Model wybiera następną lekturę'; }
  function moduleData(key){ return data?.modules?.[key] || {meta:[],headers:[],rows:[],status:'UNAVAILABLE'}; }
  function moduleRows(key){ return safeArray(moduleData(key).rows); }
  function cell(row, ...names){ for(const name of names){ if(row && row[name] !== undefined && row[name] !== '') return row[name]; } return ''; }
  function numv(v){ if(v===null||v===undefined||v==='') return null; const x=Number(String(v).replace(/\s/g,'').replace(',','.')); return Number.isFinite(x)?x:null; }
  function boolv(v){ return v===true || String(v).toUpperCase()==='TRUE'; }
  function moduleAvailable(key){ return moduleRows(key).length>0 || moduleData(key).status==='OK'; }
  function vaultMissing(book){ return book && book.vaultEpub === false && String(book.vaultSignal||'').toUpperCase()==='MISSING'; }
  function vaultSignalHtml(book){ return vaultMissing(book) ? `<span class="vault-missing" title="EPUB nie ma jeszcze w Google Drive / Ebook Vault" aria-label="Brak EPUB-u w Vault">◌</span>` : ''; }

  function extraField(book,key){ return book?.extra && book.extra[key] != null ? String(book.extra[key]) : ''; }
  function originalLanguage(book){ return String(book?.originalLanguage || extraField(book,'Original Language') || '').toUpperCase(); }
  function translationStudioState(book){ return String(book?.translationStudioState || extraField(book,'Translation Studio State') || '').toUpperCase(); }
  function privatePlEditionId(book){ return String(book?.privatePlEditionId || extraField(book,'Private PL Edition ID') || ''); }
  function languageUi(book){
    const explicit=String(book?.languageUi || extraField(book,'Language UI') || '').trim();
    if(explicit) return explicit;
    const status=String(book?.language||'').toUpperCase();
    const orig=originalLanguage(book);
    if(status==='PL OFFICIAL') return orig && orig!=='PL' ? `Oryginał: ${languageName(orig)} · oficjalne wydanie polskie` : 'Wydanie polskie';
    if(status==='ORIGINAL EN') return 'Oryginał: angielski';
    if(status==='ORIGINAL FR') return 'Oryginał: francuski';
    if(status==='EN TRANSLATION') return orig ? `Oryginał: ${languageName(orig)} · tłumaczenie angielskie` : 'Tłumaczenie angielskie';
    if(status==='PRIVATE PL TRANSLATION') return 'Tłumaczenie własne PL';
    if(status==='EN FALLBACK') return 'Wydanie angielskie';
    return book?.vaultLanguage ? `Wydanie w Vault: ${languageName(book.vaultLanguage)}` : (book?.language||'—');
  }
  function languageName(code){
    const m={PL:'polski',EN:'angielski',FR:'francuski',FI:'fiński',DE:'niemiecki',ES:'hiszpański',IT:'włoski',JA:'japoński',KO:'koreański',NO:'norweski',SV:'szwedzki',DA:'duński',NL:'niderlandzki'};
    return m[String(code||'').toUpperCase()] || String(code||'').toUpperCase();
  }
  function languageShort(book){
    const status=String(book?.language||'').toUpperCase();
    const orig=originalLanguage(book);
    if(status==='PL OFFICIAL') return 'po polsku';
    if(status==='ORIGINAL EN') return 'oryginał EN';
    if(status==='ORIGINAL FR') return 'oryginał FR';
    if(status==='EN TRANSLATION') return orig ? `EN ← ${orig}` : 'tłumaczenie EN';
    if(status==='PRIVATE PL TRANSLATION') return 'własne PL';
    if(status==='EN FALLBACK') return 'wydanie EN';
    return book?.vaultLanguage ? `Vault: ${book.vaultLanguage}` : (book?.language||'');
  }
  function translationChipHtml(book){
    const st=translationStudioState(book);
    if(!st || st==='NONE') return '';
    if(st.includes('ACTIVE')) return '<span class="chip green">tłumaczenie własne · w toku</span>';
    if(st.includes('COMPLETE') || st.includes('DONE')) return '<span class="chip green">tłumaczenie własne · gotowe</span>';
    if(st.includes('QUEUED')) return '<span class="chip brass">tłumaczenie własne · kolejka</span>';
    return `<span class="chip">${esc('tłumaczenie własne · '+st.toLowerCase())}</span>`;
  }
  function rawLanguageStatusLabel(status){
    const s=String(status||'').toUpperCase();
    if(s==='PL OFFICIAL') return 'wydanie polskie';
    if(s==='ORIGINAL EN') return 'oryginał angielski';
    if(s==='ORIGINAL FR') return 'oryginał francuski';
    if(s==='EN TRANSLATION') return 'tłumaczenie angielskie';
    if(s==='PRIVATE PL TRANSLATION') return 'tłumaczenie własne PL';
    if(s==='EN FALLBACK') return 'wydanie angielskie';
    return status||'—';
  }
  function rowByBook(moduleKey,bookId){ return moduleRows(moduleKey).find(r=>String(cell(r,'Book ID')||'')===String(bookId||'')) || null; }
  function moduleTitle(key,fallback=''){ return moduleData(key).title || moduleData(key).sheet || fallback || key; }


  function term(key, fallback) {
    const entry = data?.ui?.terminology?.[key];
    if (!entry) return fallback || key;
    return state.mode === 'expert' ? (entry.expert || fallback || key) : (entry.owner || fallback || key);
  }
  function statusLabel(status){
    const fallback = ({'PROMOTE':'W czołówce','WATCH':'Na radarze','BENCH':'Poczekalnia','LOCKED':'Zablokowana','CURRENT NEXT':'Bieżąca lektura','READ':'Przeczytana','RETIRE':'Wycofana','HOLD':'Do sprawdzenia'})[status] || status || '—';
    return term(status, fallback);
  }
  function statusClass(status){ return ({'PROMOTE':'promote','WATCH':'watch','LOCKED':'locked','CURRENT NEXT':'current','READ':'read','BENCH':'bench','RETIRE':'retire','HOLD':'watch'})[status] || 'bench'; }
  function statusBadge(status){ return `<span class="status-badge ${statusClass(status)}">${esc(statusLabel(status))}</span>`; }

  function setSourceBadge(label, cls='good') {
    const badge=$('#sourceBadge');
    if(!badge)return;
    badge.textContent=label;
    badge.className=`status-pill ${cls}`;
  }

  function jsonp(url, token, params={}, timeoutMs=15000) {
    return new Promise((resolve, reject) => {
      const cb = `__crimeCockpit_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const script = document.createElement('script');
      const sep = url.includes('?') ? '&' : '?';
      const timer = setTimeout(() => cleanup(new Error(`TIMEOUT_${timeoutMs}`)), timeoutMs);
      function cleanup(err, payload) { clearTimeout(timer); delete window[cb]; script.remove(); err ? reject(err) : resolve(payload); }
      window[cb] = payload => cleanup(null, payload);
      script.onerror = () => cleanup(new Error('ENDPOINT_LOAD_ERROR'));
      const query = new URLSearchParams({prefix:cb, token, _:String(Date.now())});
      Object.entries(params||{}).forEach(([k,v])=>{ if(v!==undefined && v!==null && v!=='') query.set(k,String(v)); });
      script.src = `${url}${sep}${query.toString()}`;
      document.head.appendChild(script);
    });
  }

  function requireOk(payload) {
    if (!payload || !payload.ok) throw new Error(payload?.error || 'BACKEND_ERROR');
    return payload;
  }

  function mergeLivePatch(patch) {
    if (!patch || typeof patch !== 'object') return;
    if (patch.modules) data.modules = Object.assign({}, data.modules||{}, patch.modules);
    Object.entries(patch).forEach(([k,v])=>{
      if (['ok','schemaVersion','frontendMinVersion','generatedAt','source','modules'].includes(k)) return;
      data[k]=v;
    });
    if (patch.schemaVersion) data.schemaVersion=patch.schemaVersion;
    if (patch.frontendMinVersion) data.frontendMinVersion=patch.frontendMinVersion;
    if (patch.generatedAt) data.generatedAt=patch.generatedAt;
  }

  async function diagnoseLiveFailure(originalError) {
    const message=String(originalError?.message||originalError||'UNKNOWN');
    try {
      const ping=await jsonp(state.apiUrl,state.token,{scope:'ping'},6000);
      if(ping?.ok) return {label:'API OK · CORE ERROR · DEMO',detail:message};
      const err=String(ping?.error||'BACKEND_ERROR');
      if(err==='UNAUTHORIZED') return {label:'TOKEN · DEMO',detail:'Token nie pasuje do CRIME_COCKPIT_TOKEN.'};
      if(err.includes('BACKEND_NOT_CONFIGURED')) return {label:'API CONFIG · DEMO',detail:err};
      return {label:'API ERROR · DEMO',detail:err};
    } catch (pingErr) {
      const p=String(pingErr?.message||pingErr||'');
      if(p.startsWith('TIMEOUT_')) return {label:'API TIMEOUT · DEMO',detail:message};
      return {label:'ENDPOINT · DEMO',detail:message};
    }
  }

  async function loadDeferredLiveData(showToast=true) {
    let partial=false;
    try {
      const extras=requireOk(await jsonp(state.apiUrl,state.token,{scope:'extras'},22000));
      mergeLivePatch(extras);
      data=normalizeData(data);
      renderAll();
    } catch (err) {
      partial=true;
      console.warn('Crime Cockpit extras load failed',err);
    }

    const groups=[
      ['undercoverGems','paretoShelf','seriesMap','memoryHalfLife','criticCrowdMe'],
      ['explanationDiff','predictionMarket','uncertaintyBudget','semanticQuarantine','sourceCalibration'],
      ['reviewIntelligence','tasteFrontier','enrichmentEngine','modelArena','antiRut'],
      ['robustnessLab','afterglow','bookNeighborhoods','opportunityAging','motifPreferenceGraph'],
      ['crimeDirector','decisionPhysics','selectorTrust','policyArena','preloadRadar'],
      ['contentSpectrum','contentEvidence','contentPreference','debriefDirector','provocationLab','readingJourney'],
      ['transitionEngine','characterBond','endingPayoff','experiencePalette','translationSensitivity','readyShelf','acquisitionQueue'],
      ['characterRegistry','bookCast','characterRelations','characterEvidence','characterCoverage','castLoad','characterRecallEngine','identityCollisionLab','recurringCharacterRadar','characterProgressSync'],
      ['characterEncounterTrace','locationRegistry','bookLocations','suspicionTimeline','caseLoadMonitor','caseFileAssets','caseFileDossiers','characterAppearanceEvidence','checkpointSnapshots','reentryPackBuilder','caseDelta','characterVisualStates','visualCollisionBoard','relationGraphFeed','characterUnlocks','characterTheoryPins','suspectWall','characterRecallFeedback','characterMemoryState','caseboardPlayback','caseSceneState','dossierAura']
    ];
    for (const keys of groups) {
      try {
        const payload=requireOk(await jsonp(state.apiUrl,state.token,{scope:'modules',keys:keys.join(',')},22000));
        mergeLivePatch(payload);
      } catch (err) {
        partial=true;
        console.warn('Crime Cockpit module group load failed',keys,err);
      }
    }
    data=normalizeData(data);
    renderAll();
    setSourceBadge(partial?'LIVE · CZĘŚĆ MODUŁÓW':'LIVE',partial?'warning':'good');
    if(showToast) toast(partial?'Rdzeń LIVE działa; część modułów eksperckich nie została doczytana':'Dane LIVE i moduły gotowe');
  }

  async function loadData(showToast=true) {
    $('#refreshBtn').textContent = '…';
    try {
      if (state.apiUrl && state.token) {
        const payload=requireOk(await jsonp(state.apiUrl,state.token,{scope:'core'},22000));
        data = normalizeData(payload);
        setSourceBadge('LIVE · CORE','good');
        renderAll();
        if(showToast) toast('Rdzeń LIVE gotowy · doczytuję moduły');
        loadDeferredLiveData(false);
      } else {
        data = normalizeData(window.CRIME_COCKPIT_DEMO || {});
        setSourceBadge('DEMO','muted');
        renderAll();
        if(showToast) toast('Snapshot demonstracyjny gotowy');
      }
    } catch (err) {
      console.error(err);
      const diagnosis = state.apiUrl && state.token ? await diagnoseLiveFailure(err) : {label:'DEMO',detail:''};
      data = normalizeData(window.CRIME_COCKPIT_DEMO || {});
      setSourceBadge(diagnosis.label,'warning');
      renderAll();
      if(showToast) toast(`LIVE niedostępne · ${diagnosis.detail||'pokazuję demo'}`);
    } finally {
      $('#refreshBtn').textContent = '↻';
    }
  }

  function normalizeData(raw) {
    const x = raw && typeof raw === 'object' ? raw : {};
    x.ui = x.ui || {modules:fallbackModules,metrics:[],terminology:{},features:{}};
    // Server UI Manifest may lag behind the frontend. Merge it with the built-in
    // route registry instead of letting an older non-empty manifest hide newer
    // views (e.g. Reżyser / Postacie / Trofea). Explicit server overrides for
    // a known module still win; omissions no longer delete frontend routes.
    const serverModules = safeArray(x.ui.modules);
    const mergedModules = new Map(fallbackModules.map(m => [m.id, {...m}]));
    serverModules.forEach(m => {
      if (!m || !m.id) return;
      mergedModules.set(m.id, {...(mergedModules.get(m.id) || {}), ...m});
    });
    x.ui.modules = [...mergedModules.values()].sort((a,b)=>(a.order||999)-(b.order||999));
    x.ui.metrics = safeArray(x.ui.metrics);
    x.ui.terminology = x.ui.terminology || {};
    x.ui.features = x.ui.features || {};
    x.system = x.system || {};
    x.lifecycle = x.lifecycle || {};
    x.current = x.current || {};
    x.decision = x.decision || {};
    x.session = x.session || {};
    x.candidates = safeArray(x.candidates);
    x.library = safeArray(x.library);
    x.readingRoom = safeArray(x.readingRoom);
    x.coverage = x.coverage || {metadata:[],blindSpots:[],enrichment:[]};
    x.coverage.metadata = safeArray(x.coverage.metadata);
    x.coverage.blindSpots = safeArray(x.coverage.blindSpots);
    x.coverage.enrichment = safeArray(x.coverage.enrichment);
    x.calibration = x.calibration || {tests:0,history:[]};
    x.calibration.history = safeArray(x.calibration.history);
    x.health = x.health || {overall:'UNKNOWN',pass:0,warn:0,fail:0,checks:[]};
    x.health.checks = safeArray(x.health.checks);
    x.simulator = x.simulator || {rows:[]};
    x.simulator.rows = safeArray(x.simulator.rows);
    x.learning = x.learning || {events:0,activeHypotheses:0,held:0,phase:'—',trainingN:0,items:[]};
    x.learning.items = safeArray(x.learning.items);
    x.achievements = safeArray(x.achievements);
    x.missions = safeArray(x.missions);
    x.interactions = safeArray(x.interactions);
    x.postmortem = x.postmortem || {closed:0,waiting:0,bigMisses:0,items:[]};
    x.postmortem.items = safeArray(x.postmortem.items);
    x.modules = x.modules && typeof x.modules === 'object' ? x.modules : {};
    x.schema = x.schema || {libraryFields:[],knownFields:[],extraFields:[]};
    return x;
  }

  function renderAll() {
    applyMode();
    buildNav();
    renderOverview();
    renderQueue();
    renderDirector();
    renderLibrary();
    renderCharacters();
    renderAchievements();
    renderCoverage();
    renderHealth();
    renderReadingRoom();
    renderSimulator();
    renderMissions();
    renderModel();
    renderFrontier();
    renderEnrichmentEngine();
    renderArena();
    renderLab();
    hydrateCovers();
    observeReveals();
    const when = data.generatedAt ? new Date(data.generatedAt) : null;
    $('#lastUpdated').textContent = when && !Number.isNaN(when.getTime()) ? `Dane: ${when.toLocaleString('pl-PL')}` : 'Dane: —';
    const versionEl=$('#frontendVersion'); if(versionEl) versionEl.textContent=`Crime Cockpit · local frontend v${FRONTEND_VERSION}`;
    checkSchemaCompatibility();
  }

  function applyMode(){
    document.body.classList.toggle('mode-expert', state.mode === 'expert');
    $('#ownerModeBtn').classList.toggle('active', state.mode === 'owner');
    $('#expertModeBtn').classList.toggle('active', state.mode === 'expert');
  }

  function buildNav(){
    const mods = safeArray(data.ui.modules).filter(m => m.enabled !== false && (state.mode === 'expert' ? m.expert !== false : m.owner !== false)).sort((a,b)=>(a.order||999)-(b.order||999));
    const nav = $('#mainNav');
    nav.innerHTML = '';
    mods.forEach(m => {
      ensureUnknownView(m);
      const btn = document.createElement('button');
      btn.className = `tab${activeView===m.id?' active':''}`;
      btn.type='button'; btn.dataset.view=m.id;
      btn.innerHTML = `<span class="tab-icon">${esc(m.icon||'')}</span>${esc(m.label||m.id)}`;
      btn.addEventListener('click',()=>setView(m.id));
      nav.appendChild(btn);
    });
    if(!mods.some(m=>m.id===activeView)) activeView = mods[0]?.id || 'overview';
    setView(activeView, false);
  }

  function ensureUnknownView(m){
    if(document.getElementById(m.id)) return;
    const section=document.createElement('section'); section.id=m.id; section.className='view'; section.dataset.view=m.id;
    section.innerHTML=`<div class="section-heading"><div><div class="section-kicker">NOWY MODUŁ</div><h1>${esc(m.label||m.id)}</h1></div><p>${esc(m.description||'Moduł został dodany w UI Manifest. Frontend nie ma jeszcze dedykowanego renderera, ale nadal działa bez błędu.')}</p></div><div class="panel compact-panel"><p class="small-note">To celowe zachowanie schema-tolerant: nowy moduł nie wysadza całej aplikacji.</p></div>`;
    $('.shell').appendChild(section);
  }

  function setView(id, scroll=true){
    activeView=id;
    $$('.view').forEach(v=>v.classList.toggle('active',v.id===id));
    $$('.tab').forEach(t=>t.classList.toggle('active',t.dataset.view===id));
    if(scroll) window.scrollTo({top:0,behavior:'smooth'});
    requestAnimationFrame(observeReveals);
  }

  function renderOverview(){
    const c=data.current;
    $('#currentBookId').textContent=c.id||'—';
    $('#currentTitle').textContent=c.title||'—';
    $('#currentAuthor').textContent=c.author||'—';
    $('#currentCover').innerHTML=coverHtml(c,'large');
    $('#currentPreflight').textContent = c.preflight || c.preflightVerdict || '—';
    $('#currentPrediction').textContent = c.prediction!=null ? `${n(c.prediction,2)} / 5` : '—';
    $('#currentConfidenceHuman').textContent = c.confidence!=null ? `${confidenceText(c.confidence)} · ${n(c.confidence,0)}/100` : '—';
    $('#currentRisk').textContent=c.risk||'—';
    $('#currentChips').innerHTML=[c.series?`${c.series}${c.volume?` #${c.volume}`:''}`:'',c.language==='PL OFFICIAL'?'polskie wydanie':'',c.seriesSafety==='ENTRY POINT'?'bezpieczny start serii':''].filter(Boolean).map((x,i)=>`<span class="chip ${i===2?'green':i===0?'brass':''}">${esc(x)}</span>`).join('');
    $('#currentNarrative').textContent = c.continuity || 'Bieżąca lektura jest zamrożona do debriefu. Model nie przestawia jej w połowie czytania.';

    $('#decisionHeadline').textContent=humanDecisionMode(data.decision.mode);
    $('#decisionWhy').textContent=data.decision.why||'—';
    $('#decisionPolicy').textContent=data.decision.policy||'—';
    $('#sessionModeHuman').textContent=humanMode(data.session.mode);
    $('#sessionEffect').textContent=data.session.effect||'—';

    renderMetrics();
    renderCandidateShelf();
    renderLifecycle();
    renderLatestNotes();
  }

  function renderMetrics(){
    let metrics=safeArray(data.ui.metrics).filter(m=> state.mode==='expert' ? m.expert!==false : m.owner!==false).sort((a,b)=>(a.order||999)-(b.order||999));
    if(!metrics.length){
      metrics=[
        {label:'Książki w systemie',value:data.system.books,description:'Cała monitorowana pula'},
        {label:'Przeczytane',value:data.system.read,description:'Obserwacje modelu'},
        {label:'W czołówce',value:data.lifecycle.promote,description:'Najmocniejsi kandydaci'},
        {label:'Na radarze',value:data.lifecycle.watch,description:'Książki obserwowane'}
      ];
    }
    $('#metricGrid').innerHTML=metrics.map(m=>`<div class="metric-card"><strong data-count="${Number(m.value)||0}" data-format="${esc(m.format||'number')}">0</strong><span>${esc(m.label)}</span><small>${esc(m.description||'')}</small></div>`).join('');
    animateCounts($('#metricGrid'));
  }

  function renderCandidateShelf(){
    const list=data.candidates.slice(0,6);
    $('#candidateShelf').innerHTML=list.map((b,i)=>`<article class="shelf-book" data-book-id="${esc(b.id||'')}">${coverHtml(b,'medium')}<div><span class="section-kicker">#${b.decisionRank||i+1}</span><h3>${esc(b.title)}</h3><p>${esc(b.author)} · ${esc(b.country||'')}</p></div><div class="shelf-score"><div><span>${esc(term('Decision Score','Czy warto teraz'))}</span><div class="microbar"><i data-width="${clamp(b.decision)}"></i></div></div><strong>${n(b.decision)}</strong></div><div class="expert-only small-note">${esc(b.decisionWhy||'')}</div></article>`).join('') || `<div class="empty">Brak kandydatów.</div>`;
    $('#candidateShelf').querySelectorAll('.shelf-book').forEach(el=>el.addEventListener('click',()=>openDossier(bookById(el.dataset.bookId))));
    requestAnimationFrame(()=>$$('.microbar i',$('#candidateShelf')).forEach(el=>el.style.width=`${el.dataset.width}%`));
  }

  function renderLifecycle(){
    const life=data.lifecycle;
    const rows=[['PROMOTE',life.promote],['WATCH',life.watch],['BENCH',life.bench],['LOCKED',life.locked],['RETIRE',life.retire]].filter(r=>r[1]!=null);
    const max=Math.max(1,...rows.map(r=>Number(r[1])||0));
    $('#lifecycleBars').innerHTML=rows.map(([status,val])=>`<div class="status-row"><strong>${esc(statusLabel(status))}</strong><div class="status-track"><div class="status-fill" data-width="${Math.max(1,(Number(val)||0)/max*100)}"></div></div><span>${n(val,0)}</span></div>`).join('');
    requestAnimationFrame(()=>$$('.status-fill',$('#lifecycleBars')).forEach(el=>el.style.width=`${el.dataset.width}%`));
  }

  function renderLatestNotes(){
    const notes=data.readingRoom.filter(x=>!data.current.title||x.title===data.current.title).slice(-3).reverse();
    $('#latestRoomNotes').innerHTML=notes.map(x=>`<div class="mini-note"><div class="note-type">${esc(humanNoteType(x.type))} · ${esc(x.progress||'')}</div>${esc(x.note||'')}</div>`).join('')||`<div class="empty">Jeszcze cisza. Pierwsza myśl z lektury może wylądować właśnie tutaj.</div>`;
  }

  function renderQueue(){
    $('#queueCards').innerHTML=data.candidates.map((b,i)=>`<article class="queue-card" data-book-id="${esc(b.id||'')}">${coverHtml(b,'small')}<div class="queue-main"><div class="queue-title"><h3>${esc(b.title)}${vaultSignalHtml(b)}</h3>${statusBadge(b.lifecycle)}</div><p>${esc(b.author)} · ${esc(b.country||'')}${languageShort(b)?` · ${esc(languageShort(b))}`:''}</p><p class="queue-reason">${esc(queueNarrative(b))}</p></div><div class="queue-score"><span>${esc(term('Decision Score','Czy warto teraz'))}</span><strong>${n(b.decision)}</strong></div></article>`).join('')||`<div class="empty">Brak kandydatów.</div>`;
    $('#queueCards').querySelectorAll('.queue-card').forEach(el=>el.addEventListener('click',()=>openDossier(bookById(el.dataset.bookId))));
    $('#queueBody').innerHTML=data.candidates.map((b,i)=>`<tr><td>${b.decisionRank||i+1}</td><td><strong>${esc(b.title)}</strong></td><td>${esc(b.author)}</td><td>${n(b.decision)}</td><td>${n(b.bookFit)}</td><td>${n(b.readNext)}</td><td>${n(b.discoverySignal)}</td><td>${n(b.infoGain)}</td><td>${n(b.sessionBoost)}</td><td>${statusBadge(b.lifecycle)}</td><td>${esc(languageUi(b))}</td><td>${esc(b.risk||'')}</td></tr>`).join('');
    renderUndercoverGems();
    renderParetoShelf();
  }

  function queueNarrative(b){
    if(b.decisionWhy && state.mode==='expert') return b.decisionWhy;
    const bits=[];
    if((b.bookFit||0)>=70) bits.push('bardzo dobre dopasowanie'); else if((b.bookFit||0)>=65) bits.push('dobre dopasowanie');
    if((b.infoGain||0)>=85) bits.push('dużo nauczy model');
    if((b.discoverySignal||0)>=80) bits.push('mocny sygnał odkrycia');
    if(b.language==='PL OFFICIAL') bits.push('dostępna po polsku');
    const ts=translationStudioState(b);
    if(ts.includes('ACTIVE')) bits.push('własne tłumaczenie w toku');
    else if(ts.includes('QUEUED')) bits.push('własne tłumaczenie w kolejce');
    return bits.length ? bits.join(' · ') : 'ciekawy kandydat do dalszego sprawdzenia';
  }

  function renderDirector(){
    const summary=$('#directorSummary'), councilRoot=$('#directorCouncil'), expRoot=$('#directorExperience'), preloadRoot=$('#preloadRadar');
    if(!summary||!councilRoot||!expRoot||!preloadRoot) return;
    const rows=moduleRows('crimeDirector').filter(r=>/^DIR-\d+$/i.test(String(cell(r,'Method ID')||'')));
    const live=rows.filter(r=>boolv(cell(r,'Eligible now?'))).sort((a,b)=>(numv(cell(b,'Urgency'))||0)-(numv(cell(a,'Urgency'))||0));
    const leader=live[0]||null;
    summary.innerHTML=`<article class="panel director-focus"><div><div class="section-kicker">PROVISIONAL · SOMERSET WCIĄŻ OTWARTE</div><h2>${esc(leader?cell(leader,'Method')||'—':'—')}</h2><p>${esc(leader?cell(leader,'Owner-facing explanation')||cell(leader,'When it should win'):'Director czeka na zamknięcie bieżącej sprawy i debrief.')}</p></div><div class="director-pick"><span>Dzisiejsza nominacja</span><strong>${esc(leader?cell(leader,'Nomination')||'—':'—')}</strong><small>urgency ${leader?n(numv(cell(leader,'Urgency')),0):'—'} · final pick dopiero po debriefie</small></div></article>`;
    councilRoot.innerHTML=rows.slice().sort((a,b)=>(numv(cell(b,'Urgency'))||0)-(numv(cell(a,'Urgency'))||0)).map(r=>`<div class="director-vote ${boolv(cell(r,'Eligible now?'))?'eligible':'dormant'}"><div><strong>${esc(cell(r,'Shadow selector'))}</strong><span>${esc(cell(r,'Method'))}</span></div><div class="director-vote-book">${esc(cell(r,'Nomination')||'—')}</div><b>${n(numv(cell(r,'Urgency')),0)}</b></div>`).join('')||`<div class="empty">Crime Director nie został jeszcze doczytany.</div>`;
    const palette=moduleRows('experiencePalette').filter(r=>String(cell(r,'Status')).includes('ELIGIBLE')).sort((a,b)=>(numv(cell(b,'Fun Potential'))||0)-(numv(cell(a,'Fun Potential'))||0)).slice(0,5);
    expRoot.innerHTML=palette.map(r=>`<div class="feature-item"><span><strong>${esc(cell(r,'Title'))}</strong><small>${esc(cell(r,'Palette Class'))}</small></span><span>fun ${n(numv(cell(r,'Fun Potential')),0)} · depth ${n(numv(cell(r,'Depth Potential')),0)}</span></div>`).join('')||`<div class="empty">Paleta doświadczeń nie została doczytana.</div>`;
    const preload=moduleRows('preloadRadar').filter(r=>String(cell(r,'Preload State')).toUpperCase()==='PRELOAD SOON').sort((a,b)=>(numv(cell(b,'Preload Pressure'))||0)-(numv(cell(a,'Preload Pressure'))||0));
    preloadRoot.innerHTML=preload.map(r=>`<article class="preload-card" data-book-id="${esc(cell(r,'Book ID'))}"><div><span class="vault-missing" aria-hidden="true">◌</span><strong>${esc(cell(r,'Title'))}</strong><small>${esc(cell(r,'Author'))}</small></div><div class="preload-score"><b>${n(numv(cell(r,'Preload Pressure')),0)}</b><span>${esc(rawLanguageStatusLabel(cell(r,'Language Status')))}</span></div><p>${esc(cell(r,'Why'))}</p></article>`).join('')||`<div class="empty">Nic nie wymaga wcześniejszego przygotowania.</div>`;
    preloadRoot.querySelectorAll('[data-book-id]').forEach(el=>el.addEventListener('click',()=>openDossier(bookById(el.dataset.bookId))));
  }

  function renderLibrary(){
    const q=($('#librarySearch').value||'').trim().toLocaleLowerCase('pl');
    const filter=$('#lifecycleFilter').value;
    let rows=data.library.filter(b=>!filter||b.lifecycle===filter).filter(b=>!q||[b.title,b.author,b.country,b.series,b.layer,b.subgenre].some(v=>String(v||'').toLocaleLowerCase('pl').includes(q)));
    $('#libraryGrid').innerHTML=rows.map(b=>`<article class="library-card" data-book-id="${esc(b.id||'')}">${coverHtml(b,'medium')}<h3>${esc(b.title)}${vaultSignalHtml(b)}</h3><p>${esc(b.author)}${b.country?` · ${esc(b.country)}`:''}</p><div class="library-meta"><div>${statusBadge(b.lifecycle)}</div><div>${b.decision!=null?`<strong>${n(b.decision)}</strong><span> ${esc(term('Decision Score','teraz'))}</span>`:''}</div></div><div class="expert-only small-note">${b.metadataDebt!=null?`${esc(term('Metadata Debt','Braki danych'))}: ${n(b.metadataDebt,0)}`:''}</div></article>`).join('')||`<div class="empty">Brak wyników.</div>`;
    $('#libraryGrid').querySelectorAll('.library-card').forEach(el=>el.addEventListener('click',()=>openDossier(bookById(el.dataset.bookId))));
    hydrateCovers($('#libraryGrid'));
    renderSeriesMap();
  }

  function characterRegistryById(id){ return moduleRows('characterRegistry').find(r=>String(cell(r,'Character ID'))===String(id||'')) || null; }
  function safeCastRows(){ return moduleRows('bookCast').filter(r=>boolv(cell(r,'Safe Now?'))); }
  function characterSearchText(r){
    const reg=characterRegistryById(cell(r,'Character ID'))||{};
    return [cell(r,'Display Name'),cell(r,'Book Role'),cell(r,'Who is this?'),cell(r,'Title'),cell(reg,'Known Aliases'),cell(reg,'Canonical Name')].join(' ').toLocaleLowerCase('pl');
  }
  function rowsForBook(key, bookId){ return moduleRows(key).filter(r=>String(cell(r,'Book ID'))===String(bookId||'')); }
  function rowForCharacter(key, characterId, bookId=''){
    return moduleRows(key).find(r=>String(cell(r,'Character ID'))===String(characterId||'')&&(!bookId||String(cell(r,'Book ID'))===String(bookId))) || null;
  }
  function characterInitials(name=''){ const parts=String(name).trim().split(/\s+/).filter(Boolean); return (parts.length>1?parts[0][0]+parts[parts.length-1][0]:String(name).slice(0,2)).toUpperCase(); }
  function drivePortraitUrl_(asset){
    if(!asset) return '';
    const runtime=String(cell(asset,'Portrait URL')||'').trim();
    if(/^https?:\/\//i.test(runtime)) return runtime;
    let id=String(cell(asset,'Drive File ID')||'').trim();
    if(!id){
      const driveUrl=String(cell(asset,'Drive URL')||'').trim();
      const m=driveUrl.match(/\/d\/([A-Za-z0-9_-]+)/)||driveUrl.match(/[?&]id=([A-Za-z0-9_-]+)/);
      if(m) id=m[1];
    }
    return id?('https://drive.google.com/uc?export=view&id='+encodeURIComponent(id)):'';
  }
  function portraitUrlFor(characterId, bookId=''){
    const a=rowForCharacter('caseFileAssets',characterId,bookId)||rowForCharacter('caseFileAssets',characterId);
    return drivePortraitUrl_(a);
  }
  function humanGate(v=''){
    const x=String(v||'').toUpperCase();
    return ({'CURRENT PROGRESS':'ZNANE DO TEGO MIEJSCA','POST-READ SAFE':'BEZPIECZNE PO LEKTURZE','PUBLIC SAFE':'BEZPIECZNE PUBLICZNIE','CATALOG SAFE':'BEZPIECZNE KATALOGOWO'})[x] || v || 'BEZPIECZNE';
  }
  function humanPortraitState(v=''){
    const x=String(v||'').toUpperCase();
    if(x.includes('BUNDLE READY')||x.includes('GENERATED IN CHAT')||x.includes('AVAILABLE')) return 'Portret dostępny';
    if(x.includes('READY FOR GENERATION')) return 'Można wygenerować portret';
    return 'Monogram / placeholder';
  }
  function humanRisk(v=''){
    const x=String(v||'').toUpperCase();
    return ({'HIGH':'WYSOKIE','MEDIUM':'ŚREDNIE','LOW':'NISKIE','PIN':'PRIORYTET'})[x] || v || '—';
  }
  function humanRecall(v=''){
    const x=String(v||'').toUpperCase();
    return ({'PIN':'PRIORYTET','HIGH':'WYSOKIE','MEDIUM':'ŚREDNIE','LOW':'NISKIE'})[x] || v || '—';
  }
  function humanRelation(v=''){
    const x=String(v||'').toLowerCase();
    return ({'father of':'ojciec','mother of':'matka','married to':'małżeństwo z','engaged to':'zaręczony/a z','twin brother of':'brat bliźniak','worked for':'pracowała dla'})[x] || v || 'relacja';
  }
  function humanRole(v=''){
    const x=String(v||'').toUpperCase();
    const map={
      'FRAME / RELATIONSHIP':'RAMA / RELACJA','META AUTHOR':'AUTOR WEWNĘTRZNEJ POWIEŚCI','META DETECTIVE':'DETEKTYW W POWIEŚCI',
      'CASE CENTER / HOUSEKEEPER':'CENTRUM SPRAWY / GOSPODYNI','FUNERAL / VILLAGE':'ZAKŁAD POGRZEBOWY / WIEŚ','VILLAGE / FUNERAL':'WIEŚ / POGRZEB',
      'CLERGY':'DUCHOWIEŃSTWO','CLERGY FAMILY':'RODZINA PASTORA','MEDICAL':'MEDYCYNA','MEDICAL FAMILY / ARTIST':'RODZINA LEKARKI / ARTYSTA',
      'FAMILY':'RODZINA','VILLAGE / PATIENT':'WIEŚ / PACJENT','VILLAGE BUSINESS':'LOKALNY BIZNES','PYE HALL / STAFF':'PYE HALL / PERSONEL',
      'PYE FAMILY':'RODZINA PYE','BLAKISTON FAMILY':'RODZINA BLAKISTON','MEDICAL / RELATIONSHIP':'MEDYCYNA / RELACJA',
      'PYE FAMILY / ESTATE':'RODZINA PYE / POSIADŁOŚĆ','PYE NETWORK':'OTOCZENIE PYE','CLERGY HISTORY':'HISTORIA PARAFII'
    };
    return map[x] || v || 'POSTAĆ';
  }
  function characterPortrait(characterId,name,cls='',bookId=''){
    const url=portraitUrlFor(characterId,bookId||data.current.id||'');
    if(url) return `<div class="case-portrait ${esc(cls)} has-image"><img src="${esc(url)}" alt="Syntetyczna wizualizacja postaci: ${esc(name)}" loading="lazy"/><span>WIZUALIZACJA<br/>NIEKANONICZNA</span></div>`;
    return `<div class="case-portrait ${esc(cls)}"><b>${esc(characterInitials(name))}</b><span>PORTRET<br/>NIEDOSTĘPNY</span></div>`;
  }
  function suspicionBadge(stance){
    const s=String(stance||''); if(!s)return '';
    const cls=s.startsWith('DOWNWEIGHTED')?'down':s.startsWith('SUSPECTED')?'suspect':'neutral';
    return `<span class="case-badge ${cls}">${esc(s.replace('SUSPECTED / ','').replace('SUSPECTED','PODEJRZENIE').replace('DOWNWEIGHTED / ','ODRZUCONE · '))}</span>`;
  }
  function renderCharacterCaseHub(){
    const hero=$('#characterCaseHero'), stage=$('#characterCaseStage'); if(!hero||!stage)return;
    const dossierBooks=[...new Set(moduleRows('caseFileDossiers').map(r=>String(cell(r,'Book ID'))).filter(Boolean))];
    const bookId=characterCaseBookId&&dossierBooks.includes(characterCaseBookId)?characterCaseBookId:String(data.current.id||dossierBooks[0]||'');
    characterCaseBookId=bookId;
    const book=bookById(bookId)||{};
    const sync=rowsForBook('characterProgressSync',bookId)[0]||null;
    const load=rowsForBook('caseLoadMonitor',bookId)[0]||null;
    const dossiers=rowsForBook('caseFileDossiers',bookId);
    const cast=safeCastRows().filter(r=>String(cell(r,'Book ID'))===bookId);
    const safeN=dossiers.length||cast.length;
    const portraitN=rowsForBook('caseFileAssets',bookId).filter(r=>portraitUrlFor(cell(r,'Character ID'),bookId)).length;
    const locations=rowsForBook('bookLocations',bookId).filter(r=>boolv(cell(r,'Safe Now?')));
    const pins=rowsForBook('characterTheoryPins',bookId);
    const snap=rowsForBook('checkpointSnapshots',bookId)[0]||{};
    const progress=cell(sync,'Applied Progress','Latest RR Progress')||cell(snap,'Progress')||'—';
    const loadVal=cell(load,'Memory Support Load'); const loadClass=cell(load,'Load Class')||'—';
    const archive=bookId!==String(data.current.id||'');
    const opts=dossierBooks.map(id=>{const b=bookById(id)||{};return `<option value="${esc(id)}" ${id===bookId?'selected':''}>${esc(b.title||id)}</option>`}).join('');
    hero.innerHTML=`<div class="casefile-hero-copy"><div class="section-kicker">${archive?'ARCHIWALNE AKTA':'AKTA BIEŻĄCEJ SPRAWY'} · ${esc(bookId||'—')}</div><div class="case-book-switch"><h2>${esc(book.title||data.current.title||'Książka')}</h2><select id="caseBookSelect">${opts}</select></div><p>${archive?'Pełny widok po lekturze. Możemy korzystać z całego tekstu i wszystkich bezpiecznych danych post-read.':'Widok operacyjny zna tylko stan do potwierdzonego checkpointu. Każda karta, relacja, lokalizacja i teoria dziedziczy Spoiler Firewall.'}</p><div class="casefile-hero-chips"><span class="chip brass">postęp: ${esc(progress)}</span><span class="chip green">${archive?'PO LEKTURZE':'BEZPIECZNE DO TEGO MIEJSCA'}</span><span class="chip">${esc(safeN)} postaci</span><span class="chip">${esc(locations.length)} miejsc</span><span class="chip">${esc(pins.length)} przypięte teorie</span></div></div><div class="casefile-hero-metrics"><div><span>Wsparcie pamięci</span><strong>${esc(loadVal|| (archive?'ARCHIWUM':'—'))}</strong><small>${esc(loadClass)}</small></div><div><span>Portrety</span><strong>${esc(portraitN)}</strong><small>dostępnych teraz</small></div><div><span>Granica wiedzy</span><strong>${esc(archive?'pełna książka':cell(sync,'Safe Through')||'—')}</strong><small>${archive?'READ COMPLETE':`stop przed ${esc(cell(sync,'Stop Before')||'—')}`}</small></div></div>`;
    const sel=$('#caseBookSelect'); if(sel) sel.onchange=()=>{characterCaseBookId=sel.value;casePlaybackIndex=-1;renderCharacters();};
    $$('.casefile-tab',$('#characterCaseTabs')).forEach(b=>b.classList.toggle('active',b.dataset.characterCaseTab===characterCaseTab));
    renderCharacterCaseStage(stage,bookId,dossiers,cast);
  }
  function renderCharacterCaseStage(stage,bookId,dossiers,cast){
    const rel=rowsForBook('relationGraphFeed',bookId).length?rowsForBook('relationGraphFeed',bookId):rowsForBook('characterRelations',bookId).filter(r=>boolv(cell(r,'Safe Now?')));
    const collisions=rowsForBook('visualCollisionBoard',bookId);
    const locations=rowsForBook('bookLocations',bookId).filter(r=>boolv(cell(r,'Safe Now?')));
    const walls=rowsForBook('suspectWall',bookId);
    const pack=rowsForBook('reentryPackBuilder',bookId).filter(r=>String(cell(r,'Status')).toUpperCase()!=='RETIRED');
    const snaps=rowsForBook('checkpointSnapshots',bookId), deltas=rowsForBook('caseDelta',bookId), playback=rowsForBook('caseboardPlayback',bookId);
    const memory=rowsForBook('characterMemoryState',bookId), unlocks=rowsForBook('characterUnlocks',bookId), scene=rowsForBook('caseSceneState',bookId)[0]||null;
    const portrait=(id,name)=>{const url=portraitUrlFor(id,bookId);return url?`<div class="mini-face has-image"><img src="${esc(url)}" alt=""/></div>`:`<div class="mini-face">${esc(characterInitials(name))}</div>`;};
    if(characterCaseTab==='relations'){
      stage.innerHTML=`<div class="case-stage-heading"><div><div class="section-kicker">TABLICA POWIĄZAŃ</div><h3>${rel.length} bezpiecznych krawędzi</h3></div><span class="status-pill good">TYLKO JAWNE RELACJE</span></div><div class="relation-board">${rel.map(r=>{const a=cell(r,'From'),b=cell(r,'To'),aid=cell(r,'From Character ID'),bid=cell(r,'To Character ID');return `<div class="relation-board-edge"><button data-character-id="${esc(aid)}">${portrait(aid,a)}<strong>${esc(a)}</strong></button><div class="relation-thread"><span>${esc(humanRelation(cell(r,'Relation')))}</span></div><button data-character-id="${esc(bid)}">${portrait(bid,b)}<strong>${esc(b)}</strong></button></div>`}).join('')||'<div class="empty">Brak jawnych relacji.</div>'}</div>`;
    } else if(characterCaseTab==='collisions'){
      stage.innerHTML=`<div class="case-stage-heading"><div><div class="section-kicker">NIE POMYL ICH</div><h3>${collisions.length} par do rozróżnienia</h3></div><span class="status-pill muted">POMOC PAMIĘCIOWA</span></div><div class="visual-collision-grid">${collisions.map(r=>`<article class="visual-collision-card"><div class="visual-pair"><button data-character-id="${esc(cell(r,'Character A ID'))}">${portrait(cell(r,'Character A ID'),cell(r,'Character A'))}<strong>${esc(cell(r,'Character A'))}</strong></button><span>≠</span><button data-character-id="${esc(cell(r,'Character B ID'))}">${portrait(cell(r,'Character B ID'),cell(r,'Character B'))}<strong>${esc(cell(r,'Character B'))}</strong></button></div><p>${esc(cell(r,'Safe Disambiguator'))}</p><small>ryzyko pomyłki ${esc(cell(r,'Score'))}/100</small></article>`).join('')||'<div class="empty">Brak par do rozróżnienia.</div>'}</div>`;
    } else if(characterCaseTab==='locations'){
      stage.innerHTML=`<div class="case-stage-heading"><div><div class="section-kicker">MAPA SPRAWY</div><h3>${locations.length} miejsc</h3></div></div><div class="case-location-grid">${locations.map(r=>`<article class="case-location-card"><div class="case-location-pin">⌖</div><div><span>${esc(cell(r,'Location Role'))}</span><h4>${esc(cell(r,'Display Name'))}</h4><p>${esc(cell(r,'Who/what is this?'))}</p></div></article>`).join('')||'<div class="empty">Brak miejsc.</div>'}</div>`;
    } else if(characterCaseTab==='suspicions'){
      stage.innerHTML=`<div class="case-stage-heading"><div><div class="section-kicker">ŚCIANA PODEJRZEŃ</div><h3>Twoje hipotezy, nie werdykt systemu</h3></div><span class="status-pill warning">ASYSTENT NIE OCENIA WINY</span></div><div class="suspect-wall-ui">${walls.map(r=>`<article class="suspect-wall-card ${esc(String(cell(r,'Visual State')).toLowerCase())}">${portrait(cell(r,'Character ID'),cell(r,'Character'))}<div><span>${esc(cell(r,'Progress'))}</span><h4>${esc(cell(r,'Character'))}</h4><strong>${esc(cell(r,'Pin Type'))}</strong><p>${esc(cell(r,'Text'))}</p></div></article>`).join('')||'<div class="empty">Brak przypiętych hipotez.</div>'}</div>`;
    } else if(characterCaseTab==='memory'){
      stage.innerHTML=`<div class="case-stage-heading"><div><div class="section-kicker">MGŁA PAMIĘCI</div><h3>Kogo warto sobie przypomnieć?</h3></div><span class="status-pill muted">NIE WPŁYWA NA OCENĘ KSIĄŻKI</span></div><div class="memory-fog-grid">${memory.sort((a,b)=>(numv(cell(b,'Memory Score'))||0)-(numv(cell(a,'Memory Score'))||0)).slice(0,24).map(r=>`<button class="memory-fog-card" data-character-id="${esc(cell(r,'Character ID'))}" style="--fog:${Math.max(20,100-(numv(cell(r,'UI Opacity %'))||100))}%"><strong>${esc(cell(r,'Character'))}</strong><span>${esc(cell(r,'Memory State'))}</span><small>${n(cell(r,'Memory Score'),0)}/100</small></button>`).join('')||'<div class="empty">Brak modelu pamięci.</div>'}</div>`;
    } else if(characterCaseTab==='unlocks'){
      stage.innerHTML=`<div class="case-stage-heading"><div><div class="section-kicker">ODKRYCIA POSTACI</div><h3>Dossier rośnie razem z lekturą</h3></div></div><div class="unlock-grid">${unlocks.map(r=>`<button class="unlock-card" data-character-id="${esc(cell(r,'Character ID'))}"><div><strong>${esc(cell(r,'Character'))}</strong><span>${esc(cell(r,'Unlock Level'))}</span></div><div class="progress-track"><i style="width:${clamp(cell(r,'Progress %'))}%"></i></div><small>${esc(cell(r,'Progress %'))}% bezpiecznej kartoteki</small></button>`).join('')||'<div class="empty">Brak unlocków.</div>'}</div>`;
    } else if(characterCaseTab==='reentry'){
      const chars=pack.filter(r=>String(cell(r,'Item Type'))==='CHARACTER'), locs=pack.filter(r=>String(cell(r,'Item Type'))==='LOCATION'), theories=pack.filter(r=>String(cell(r,'Item Type'))==='SUSPICION');
      const group=(title,rows)=>`<article class="panel reentry-group"><div class="section-kicker">${esc(title)}</div>${rows.map(r=>`<div class="reentry-item"><div><strong>${esc(cell(r,'Label'))}</strong><span>${esc(cell(r,'Memory Cue'))}</span></div><p>${esc(cell(r,'Safe Fact'))}</p><b>${esc(cell(r,'Priority'))}</b></div>`).join('')||'<div class="empty">Brak elementów.</div>'}</article>`;
      const sceneCard=scene?`<article class="panel reentry-group"><div class="section-kicker">GDZIE JESTEM W HISTORII?</div><h3>${esc(cell(scene,'Headline')||'Bieżący stan sprawy')}</h3><div class="feature-list"><div class="feature-item"><span>Postacie do przypomnienia</span><strong>${esc(cell(scene,'Character Focus')||'—')}</strong></div><div class="feature-item"><span>Miejsca</span><strong>${esc(cell(scene,'Location Focus')||'—')}</strong></div><div class="feature-item"><span>Otwarte pytania</span><strong>${esc(cell(scene,'Theory Focus')||'—')}</strong></div><div class="feature-item"><span>Najlepsza pomoc</span><strong>${esc(cell(scene,'Recommended Aid')||'—')}</strong></div></div><p class="small-note">Rekonstrukcja korzysta wyłącznie z danych bezpiecznych dla bieżącej granicy wiedzy.</p></article>`:'';
      stage.innerHTML=`<div class="case-stage-heading"><div><div class="section-kicker">WRACAM DO KSIĄŻKI</div><h3>30–60 sekund i wracasz do sprawy</h3></div></div>${sceneCard}<div class="reentry-grid">${group('POSTACIE',chars)}${group('MIEJSCA',locs)}${group('TWOJE TEORIE',theories)}</div>`;
    } else if(characterCaseTab==='time'){
      const activeIndex=playback.length?Math.max(0,Math.min(casePlaybackIndex<0?playback.length-1:casePlaybackIndex,playback.length-1)):-1;
      casePlaybackIndex=activeIndex;
      const active=activeIndex>=0?playback[activeIndex]:null;
      const activeSnapshot=active?snaps.find(r=>String(cell(r,'Snapshot ID'))===String(cell(active,'Snapshot ID'))):null;
      const activeDelta=active?deltas.find(r=>String(cell(r,'To Snapshot'))===String(cell(active,'Snapshot ID'))):null;
      const selector=playback.length?`<div class="casefile-tabs">${playback.map((r,i)=>`<button type="button" class="casefile-tab ${i===activeIndex?'active':''}" data-playback-index="${i}" aria-pressed="${i===activeIndex?'true':'false'}">#${i+1} · ${esc(cell(r,'Progress')||cell(r,'Frame ID'))}</button>`).join('')}</div>`:'';
      const focus=active?`<article class="panel reentry-group"><div class="section-kicker">WYBRANY STAN · ${esc(cell(active,'Frame ID')||`#${activeIndex+1}`)}</div><h3>${esc(cell(active,'Progress')||'Checkpoint')}</h3><p>${esc(cell(active,'Playback Caption')||'Zamrożony stan sprawy.')}</p><div class="feature-list"><div class="feature-item"><span>Postacie</span><strong>${esc(cell(active,'Safe Cast N')||'0')}</strong></div><div class="feature-item"><span>Relacje</span><strong>${esc(cell(active,'Relations N')||cell(activeSnapshot,'Relations N')||'0')}</strong></div><div class="feature-item"><span>Miejsca</span><strong>${esc(cell(active,'Locations N')||'0')}</strong></div><div class="feature-item"><span>Portrety</span><strong>${esc(cell(active,'Portrait N')||cell(activeSnapshot,'Portrait-ready N')||'0')}</strong></div><div class="feature-item"><span>Twoje wpisy podejrzeń</span><strong>${esc(cell(active,'Suspicion N')||cell(activeSnapshot,'Suspicion Entries N')||'0')}</strong></div><div class="feature-item"><span>Wsparcie pamięci</span><strong>${esc(cell(active,'Case Load')||cell(activeSnapshot,'Case Load')||'—')}</strong></div></div><p class="small-note">Kadr jest niemutowalny: późniejsza wiedza nie jest dopisywana wstecz.</p></article>`:'<div class="empty">Brak zapisanych checkpointów dla tej książki.</div>';
      const snapCard=activeSnapshot?`<div class="snapshot-grid"><article class="snapshot-card"><div><span>${esc(cell(activeSnapshot,'Snapshot ID'))}</span><strong>${esc(cell(activeSnapshot,'Progress'))}</strong></div><p>${esc(cell(activeSnapshot,'Safe Cast N'))} postaci · ${esc(cell(activeSnapshot,'Relations N'))} relacji · ${esc(cell(activeSnapshot,'Locations N'))} miejsc</p></article></div>`:'';
      const deltaCard=activeDelta?`<div class="case-delta-list"><div class="case-delta-row"><strong>${esc(cell(activeDelta,'Delta Type'))}</strong><span>postacie ${esc(cell(activeDelta,'Cast Δ'))} · relacje ${esc(cell(activeDelta,'Relations Δ'))} · miejsca ${esc(cell(activeDelta,'Locations Δ'))} · portrety ${esc(cell(activeDelta,'Portrait-ready Δ'))}</span></div></div>`:'';
      stage.innerHTML=`<div class="case-stage-heading"><div><div class="section-kicker">ODTWARZANIE SPRAWY · TIME MACHINE</div><h3>Co Cockpit wiedział wtedy?</h3></div><span class="status-pill muted">BEZ BACKFILLU</span></div>${selector}${focus}${snapCard}${deltaCard}`;
      stage.innerHTML=`<div class="case-stage-heading"><div><div class="section-kicker">ODTWARZANIE SPRAWY</div><h3>Co Cockpit wiedział wtedy?</h3></div></div><div class="playback-strip">${playback.map((r,i)=>`<article class="playback-frame"><b>${i+1}</b><div><span>${esc(cell(r,'Progress'))}</span><p>${esc(cell(r,'Playback Caption'))}</p><small>${esc(cell(r,'Safe Cast N'))} postaci · ${esc(cell(r,'Locations N'))} miejsc · ${esc(cell(r,'Portrait N'))} portretów</small></div></article>`).join('')}</div><div class="snapshot-grid">${snaps.map(r=>`<article class="snapshot-card"><div><span>${esc(cell(r,'Snapshot ID'))}</span><strong>${esc(cell(r,'Progress'))}</strong></div><p>${esc(cell(r,'Safe Cast N'))} postaci · ${esc(cell(r,'Relations N'))} relacji · ${esc(cell(r,'Locations N'))} miejsc</p></article>`).join('')}</div><div class="case-delta-list">${deltas.map(r=>`<div class="case-delta-row"><strong>${esc(cell(r,'Delta Type'))}</strong><span>postacie ${esc(cell(r,'Cast Δ'))} · relacje ${esc(cell(r,'Relations Δ'))} · miejsca ${esc(cell(r,'Locations Δ'))}</span></div>`).join('')}</div>`;
    } else {
      const rows=dossiers.length?dossiers:cast.map(r=>({'Book ID':cell(r,'Book ID'),'Character ID':cell(r,'Character ID'),'Character':cell(r,'Display Name'),'Role':cell(r,'Book Role'),'Safe Fact':cell(r,'Who is this?'),'Gate':cell(r,'Visibility Gate')}));
      stage.innerHTML=`<div class="case-stage-heading"><div><div class="section-kicker">AKTA SPRAWY</div><h3>${rows.length} kart postaci</h3></div></div><div class="case-file-grid">${rows.map(r=>{const id=cell(r,'Character ID'), name=cell(r,'Character','Display Name'), mem=rowForCharacter('characterMemoryState',id,bookId)||{}, unlock=rowForCharacter('characterUnlocks',id,bookId)||{}, hasPortrait=!!portraitUrlFor(id,bookId);return `<button type="button" class="case-file-card" data-character-id="${esc(id)}">${characterPortrait(id,name,'card',bookId)}<div class="case-file-card-copy"><div class="case-card-top"><span>${esc(humanRole(cell(r,'Role')||'POSTAĆ'))}</span><em>${esc(cell(mem,'Memory State')||cell(r,'Recall Class')||'')}</em></div><h4>${esc(name)}</h4><p>${esc(cell(r,'Safe Fact')||'Bezpieczna kartoteka postaci.')}</p><div class="case-card-flags">${hasPortrait?'<span class="case-badge portrait">PORTRET</span>':''}<span class="case-badge neutral">${esc(cell(unlock,'Unlock Level')||'POZNANA')}</span></div><div class="progress-track"><i style="width:${clamp(cell(unlock,'Progress %')||17)}%"></i></div></div></button>`}).join('')||'<div class="empty">Brak akt.</div>'}</div>`;
    }
    $('[data-playback-index]',stage).forEach(el=>el.addEventListener('click',()=>{casePlaybackIndex=Number(el.dataset.playbackIndex);renderCharacterCaseStage(stage,bookId,dossiers,cast);}));
    $('[data-character-id]',stage).forEach(el=>el.addEventListener('click',()=>openCharacterDossier(el.dataset.characterId)));
  }
  function renderCharacters(){
    const summary=$('#characterSummary'), groupsRoot=$('#characterGroups'), recall=$('#currentCharacterRecall'), search=$('#characterSearch'), bookFilter=$('#characterBookFilter');
    if(!summary||!groupsRoot||!recall||!search||!bookFilter) return;
    renderCharacterCaseHub();
    const registry=moduleRows('characterRegistry');
    const cast=safeCastRows();
    const coverage=moduleRows('characterCoverage');
    const q=String(search.value||'').trim().toLocaleLowerCase('pl');
    const books=[...new Map(cast.map(r=>[String(cell(r,'Book ID')),String(cell(r,'Title'))])).entries()].sort((a,b)=>a[1].localeCompare(b[1],'pl'));
    const prev=bookFilter.value||'all';
    bookFilter.innerHTML=`<option value="all">Wszystkie książki (${books.length})</option>`+books.map(([id,title])=>`<option value="${esc(id)}">${esc(title)}</option>`).join('');
    bookFilter.value=books.some(([id])=>id===prev)?prev:'all';
    const filter=bookFilter.value;
    const shown=cast.filter(r=>(filter==='all'||String(cell(r,'Book ID'))===filter)&&(!q||characterSearchText(r).includes(q)));
    const represented=new Set(cast.map(r=>String(cell(r,'Book ID'))).filter(Boolean)).size;
    const full=coverage.filter(r=>String(cell(r,'Coverage State'))==='FULL POST-READ').length;
    summary.innerHTML=[['Postacie',registry.length,'Globalne tożsamości'],['Powiązania',cast.length,'Bezpieczne teraz'],['Książki',represented,'Z obsadą'],['Pełny atlas',full,'Po ukończeniu']].map(([l,v,d])=>`<div class="metric-card"><strong>${esc(v)}</strong><span>${esc(l)}</span><small>${esc(d)}</small></div>`).join('');

    const currentRows=cast.filter(r=>String(cell(r,'Book ID'))===String(data.current.id||''));
    const recallRows=rowsForBook('characterRecallEngine',data.current.id||'');
    const prioritized=recallRows.length?recallRows.filter(r=>['PIN','HIGH'].includes(String(cell(r,'Recall Class')))).slice(0,12):currentRows.slice(0,12);
    recall.innerHTML=currentRows.length
      ? `<div class="character-recall-head"><span>♟</span><div><div class="section-kicker">WHO WAS THAT AGAIN?</div><h3>${esc(data.current.title||'Bieżąca książka')}</h3></div></div><p class="small-note">Najpierw postacie o najwyższym ryzyku zapomnienia. Tylko progress-safe dane.</p><div class="character-mini-list">${prioritized.map(r=>{const id=cell(r,'Character ID');const castRow=currentRows.find(x=>String(cell(x,'Character ID'))===String(id))||r;return `<button type="button" class="character-mini" data-character-id="${esc(id)}"><strong>${esc(cell(castRow,'Display Name', 'Character'))}</strong><span>${esc(cell(r,'Answer')||cell(castRow,'Who is this?')||cell(castRow,'Book Role')||'')}</span></button>`}).join('')}</div>`
      : `<div class="character-recall-head"><span>♟</span><div><div class="section-kicker">WHO WAS THAT AGAIN?</div><h3>${esc(data.current.title||'Bieżąca książka')}</h3></div></div><p>Na obecnym checkpointcie nie mam jeszcze żadnej <strong>nazwanej</strong> postaci, którą wolno bezpiecznie pokazać.</p>`;

    const grouped=new Map(); shown.forEach(r=>{const id=String(cell(r,'Book ID')); if(!grouped.has(id)) grouped.set(id,{title:String(cell(r,'Title')),rows:[]}); grouped.get(id).rows.push(r);});
    groupsRoot.innerHTML=[...grouped.entries()].sort((a,b)=>a[1].title.localeCompare(b[1].title,'pl')).map(([bookId,g])=>`<section class="character-book-group"><div class="character-book-head"><div><span class="section-kicker">${g.rows.length} ${g.rows.length===1?'POSTAĆ':'POSTACI'}</span><h3>${esc(g.title)}</h3></div><button class="text-button" type="button" data-character-book="${esc(bookId)}">Dossier książki →</button></div><div class="character-grid">${g.rows.map(r=>{const reg=characterRegistryById(cell(r,'Character ID'))||{};const aliases=cell(reg,'Known Aliases');return `<button type="button" class="character-card" data-character-id="${esc(cell(r,'Character ID'))}"><div class="character-card-top"><span class="character-glyph">♟</span><span class="status-pill muted">${esc(cell(r,'Book Role')||'postać')}</span></div><h4>${esc(cell(r,'Display Name'))}</h4><p>${esc(cell(r,'Who is this?')||'Bezpieczny anchor postaci.')}</p>${aliases?`<small>Alias: ${esc(aliases)}</small>`:''}<div class="character-card-foot"><span>${esc(humanGate(cell(r,'Visibility Gate')||'SAFE'))}</span><b>${esc(cell(r,'Source Confidence')||'—')}%</b></div></button>`}).join('')}</div></section>`).join('')||`<div class="empty">Nie znaleziono postaci dla tego filtra.</div>`;
    $$('[data-character-id]', $('#characters')).forEach(el=>el.addEventListener('click',()=>openCharacterDossier(el.dataset.characterId)));
    $$('[data-character-book]', $('#characters')).forEach(el=>el.addEventListener('click',()=>openDossier(bookById(el.dataset.characterBook))));

    const cov=$('#characterCoverageExpert'); if(cov){ const states={}; coverage.forEach(r=>{const s=String(cell(r,'Coverage State')||'UNKNOWN');states[s]=(states[s]||0)+1;}); cov.innerHTML=Object.entries(states).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<div class="feature-item"><span>${esc(k)}</span><span>${esc(v)}</span></div>`).join(''); }
  }

  function openCharacterDossier(characterId){
    const reg=characterRegistryById(characterId); if(!reg)return;
    const cast=safeCastRows().filter(r=>String(cell(r,'Character ID'))===String(characterId)); const dialog=$('#characterDialog');
    const aliases=cell(reg,'Known Aliases'); const books=[...cast].sort((a,b)=>String(cell(a,'Title')).localeCompare(String(cell(b,'Title')),'pl'));
    const currentCast=cast.find(r=>String(cell(r,'Book ID'))===String(characterCaseBookId||data.current.id||''))||cast.find(r=>String(cell(r,'Lifecycle'))==='READ')||cast[0]||{};
    const bookId=cell(currentCast,'Book ID')||data.current.id||'';
    const dossier=rowForCharacter('caseFileDossiers',characterId,bookId)||{}, appearance=rowForCharacter('characterAppearanceEvidence',characterId,bookId)||{}, asset=rowForCharacter('caseFileAssets',characterId,bookId)||{};
    const memory=rowForCharacter('characterMemoryState',characterId,bookId)||{}, unlock=rowForCharacter('characterUnlocks',characterId,bookId)||{}, recurring=rowForCharacter('recurringCharacterRadar',characterId)||{}, aura=rowForCharacter('dossierAura',characterId,bookId)||{};
    const pins=rowsForBook('characterTheoryPins',bookId).filter(r=>String(cell(r,'Character ID'))===String(characterId)); const states=rowsForBook('characterVisualStates',bookId).filter(r=>String(cell(r,'Character ID'))===String(characterId));
    const rel=moduleRows('characterRelations').filter(r=>boolv(cell(r,'Safe Now?'))&&(String(cell(r,'From Character ID'))===String(characterId)||String(cell(r,'To Character ID'))===String(characterId)));
    const collisions=rowsForBook('visualCollisionBoard',bookId).filter(r=>String(cell(r,'Character A ID'))===String(characterId)||String(cell(r,'Character B ID'))===String(characterId));
    const name=cell(reg,'Canonical Name')||cell(currentCast,'Display Name')||cell(dossier,'Character'), role=humanRole(cell(dossier,'Role')||cell(currentCast,'Book Role')||cell(reg,'Default Role')||'POSTAĆ');
    const safeFact=cell(dossier,'Safe Fact')||cell(currentCast,'Who is this?')||cell(reg,'Safe Identity')||'Bezpieczna kartoteka postaci.'; const appearanceBrief=cell(appearance,'Normalized Visual Brief');
    $('#characterDialogContent').innerHTML=`<div class="casefile-dossier"><aside class="casefile-dossier-visual">${characterPortrait(characterId,name,'large',bookId)}<div class="casefile-visual-meta"><span>${esc(role)}</span><strong>${esc(humanPortraitState(cell(asset,'Portrait Status')||cell(appearance,'Portrait State')||'PENDING'))}</strong><small>Syntetyczna wizualizacja jest pomocą pamięciową, nie kanonicznym wyglądem.</small></div></aside><article class="casefile-paper"><div class="casefile-paper-head"><div><div class="section-kicker">AKTA POSTACI · ${esc(humanGate(cell(currentCast,'Visibility Gate')||cell(dossier,'Gate')||'SAFE'))}</div><h2>${esc(name)}</h2><p>${esc(safeFact)}</p></div></div>${aliases?`<div class="casefile-alias">ALIASY · ${esc(aliases)}</div>`:''}<div class="casefile-facts"><div><span>Mgła pamięci</span><strong>${esc(cell(memory,'Memory State')||'—')}</strong></div><div><span>Kompletność akt</span><strong>${esc(cell(unlock,'Progress %')||'—')}%</strong></div><div><span>Powroty</span><strong>${esc(cell(recurring,'Safe Appearances')||'—')}</strong></div><div><span>Klimat karty</span><strong>${esc(cell(aura,'Aura')||'—')}</strong></div></div>${appearanceBrief?`<section class="casefile-paper-section"><div class="section-kicker">ZNANY WYGLĄD</div><p>${esc(appearanceBrief)}</p><small>Evidence: ${esc(cell(appearance,'Evidence Page')||'pełna lektura')} · wizualizacja niekanoniczna</small></section>`:''}${states.length?`<section class="casefile-paper-section"><div class="section-kicker">WARIANTY W CZASIE</div><div class="visual-state-list">${states.map(r=>`<div><strong>${esc(cell(r,'State Label'))}</strong><span>${esc(cell(r,'Timeline'))}</span><p>${esc(cell(r,'Visual Brief'))}</p></div>`).join('')}</div></section>`:''}${pins.length?`<section class="casefile-paper-section suspicion-paper"><div class="section-kicker">PRZYPIĘTE TEORIE / PYTANIA</div>${pins.map(r=>`<div class="theory-pin"><strong>${esc(cell(r,'Pin Type'))}</strong><p>${esc(cell(r,'Text'))}</p><small>${esc(cell(r,'Progress'))} · asystent neutralny</small></div>`).join('')}</section>`:''}<section class="casefile-paper-section"><div class="section-kicker">POWIĄZANIA</div>${rel.map(r=>{const outgoing=String(cell(r,'From Character ID'))===String(characterId);return `<div class="character-relation"><strong>${esc(outgoing?humanRelation(cell(r,'Relation')):'← '+humanRelation(cell(r,'Relation')))}</strong><span>${esc(outgoing?cell(r,'To'):cell(r,'From'))}</span></div>`}).join('')||'<div class="empty">Brak jawnych relacji.</div>'}</section>${collisions.length?`<section class="casefile-paper-section"><div class="section-kicker">NIE POMYL Z…</div>${collisions.map(r=>{const a=String(cell(r,'Character A ID'))===String(characterId);return `<div class="casefile-confuse"><strong>${esc(a?cell(r,'Character B'):cell(r,'Character A'))}</strong><p>${esc(cell(r,'Safe Disambiguator'))}</p></div>`}).join('')}</section>`:''}<section class="casefile-paper-section"><div class="section-kicker">WYSTĄPIENIA</div>${books.map(r=>`<button type="button" class="character-appearance" data-character-appearance-book="${esc(cell(r,'Book ID'))}"><span><strong>${esc(cell(r,'Title'))}</strong><small>${esc(humanGate(cell(r,'Visibility Gate')||''))}</small></span><span>→</span></button>`).join('')}</section></article></div>`;
    $$('[data-character-appearance-book]',dialog).forEach(el=>el.addEventListener('click',()=>{dialog.close();characterCaseBookId=el.dataset.characterAppearanceBook;setView('characters');renderCharacters();})); dialog.showModal();
  }
  function renderCoverage(){
    $('#metadataCoverage').innerHTML=data.coverage.metadata.map(x=>{const pct=clamp(x.coveragePct??((Number(x.coverage)||0)*100));return `<div class="coverage-row"><strong>${esc(x.field)}</strong><div class="coverage-track"><div class="coverage-fill" data-width="${pct}"></div></div><span>${n(pct,0)}%</span></div>`}).join('')||`<div class="empty">Brak danych.</div>`;
    requestAnimationFrame(()=>$$('.coverage-fill',$('#metadataCoverage')).forEach(el=>el.style.width=`${el.dataset.width}%`));
    const blind=[...data.coverage.blindSpots].sort((a,b)=>(Number(b.priority)||0)-(Number(a.priority)||0)).slice(0,10);
    $('#blindSpotList').innerHTML=blind.map(x=>`<div class="blind-item"><div><strong>${esc(x.country)}</strong><small>${n(x.pool,0)} w puli · ${n(x.read,0)} przeczytane · ${n(x.active,0)} aktywne</small></div><div class="blind-priority">${n(x.priority,0)}</div></div>`).join('')||`<div class="empty">Brak danych.</div>`;
    $('#enrichmentBody').innerHTML=data.coverage.enrichment.map((x,i)=>`<tr><td>${i+1}</td><td><strong>${esc(x.title)}</strong></td><td>${esc(x.author)}</td><td>${statusBadge(x.lifecycle)}</td><td>${n(x.decision)}</td><td class="${Number(x.metadataDebt)>=80?'debt-high':Number(x.metadataDebt)>=40?'debt-mid':'debt-low'}">${n(x.metadataDebt,0)}</td><td>${esc(x.missing||'')}</td></tr>`).join('')||`<tr><td colspan="7">Brak kolejki.</td></tr>`;
    renderEnrichmentFieldRoi();
  }

  function renderReadingRoom(){
    const filterEl=$('#readingRoomBookFilter');
    const allNotes=[...data.readingRoom].reverse();
    const bookKeys=new Map();
    data.readingRoom.forEach(note=>{
      const key=note.bookId||note.title||'unknown';
      if(!bookKeys.has(key)) bookKeys.set(key,{id:note.bookId||'',title:note.title||'Nieznana książka'});
    });
    const previous=filterEl?.value||'all';
    if(filterEl){
      const options=[{value:'all',label:`Wszystkie książki (${data.readingRoom.length})`}];
      [...bookKeys.values()].forEach(b=>{
        const count=data.readingRoom.filter(n=>(n.bookId&&n.bookId===b.id)||(!n.bookId&&n.title===b.title)).length;
        options.push({value:b.id||`title:${b.title}`,label:`${b.title} (${count})`});
      });
      filterEl.innerHTML=options.map(o=>`<option value="${esc(o.value)}">${esc(o.label)}</option>`).join('');
      filterEl.value=options.some(o=>o.value===previous)?previous:'all';
    }
    const filter=filterEl?.value||'all';
    const notes=allNotes.filter(x=>filter==='all'||x.bookId===filter||(!x.bookId&&`title:${x.title}`===filter));
    const groups=[];
    const byBook=new Map();
    notes.forEach(note=>{
      const key=note.bookId||`title:${note.title||'unknown'}`;
      if(!byBook.has(key)){const g={key,bookId:note.bookId||'',title:note.title||'Nieznana książka',notes:[]};byBook.set(key,g);groups.push(g);}
      byBook.get(key).notes.push(note);
    });
    $('#readingRoomList').innerHTML=groups.map(group=>{
      const book=bookById(group.bookId)||{id:group.bookId,title:group.title,author:'',coverUrl:'',coverSource:''};
      return `<section class="reading-book-group" data-book-id="${esc(group.bookId)}"><button type="button" class="reading-book-head" data-room-book="${esc(group.bookId)}">${coverHtml(book,'small')}<span><span class="section-kicker">AKTA LEKTURY · ${group.notes.length} ${group.notes.length===1?'NOTATKA':'NOTATEK'}</span><strong>${esc(group.title)}</strong><small>${esc(book.author||'')}</small></span><i>Otwórz dossier →</i></button><div class="timeline">${group.notes.map(x=>`<article class="note-card"><div class="note-meta"><span>${esc(x.timestamp||'')}</span><span>${esc(x.progress||'')}</span><span>${esc(humanNoteType(x.type))}</span><span class="note-book-tag">${esc(x.title||group.title)}</span></div><blockquote>${esc(x.note||'')}</blockquote>${x.context?`<div class="assistant-context">${esc(x.context)}</div>`:''}<p class="expert-only small-note">Model: ${esc(x.modelUse||'HOLD UNTIL DEBRIEF')} · ${esc(x.status||'')}</p></article>`).join('')}</div></section>`;
    }).join('')||`<div class="empty">Brak notatek w Klubie lekturowym.</div>`;
    $$('[data-room-book]',$('#readingRoomList')).forEach(el=>el.addEventListener('click',()=>{const b=bookById(el.dataset.roomBook);if(b)openDossier(b)}));
    hydrateCovers($('#readingRoomList'));
  }
  function humanNoteType(t){ return ({HYPOTHESIS:'teoria',CHARACTER:'postać',ATMOSPHERE:'atmosfera',PACE:'tempo',CONSTRUCTION:'konstrukcja',QUESTION:'pytanie',EMOTION:'reakcja',CLUE:'trop',OTHER:'notatka'})[t]||t||'notatka'; }

  function healthPill(status){
    const s=String(status||'UNKNOWN').toUpperCase();
    const cls=s==='PASS'?'good':s==='WARN'?'warning':s==='FAIL'?'bad':'muted';
    return `<span class="status-pill ${cls}">${esc(s)}</span>`;
  }

  function renderHealth(){
    const h=data.health||{};
    const summary=[['Stan',h.overall||'UNKNOWN','Cały system'],['PASS',h.pass||0,'Invarianty spełnione'],['WARN',h.warn||0,'Dług / obserwacja'],['FAIL',h.fail||0,'Błędy blokujące']];
    const root=$('#healthSummary'); if(!root)return;
    root.innerHTML=summary.map(([l,v,d])=>`<div class="metric-card"><strong>${esc(v)}</strong><span>${esc(l)}</span><small>${esc(d)}</small></div>`).join('');
    const pill=$('#healthOverall'); if(pill){const s=String(h.overall||'UNKNOWN').toUpperCase();pill.textContent=s;pill.className=`status-pill ${s==='PASS'?'good':s==='WARN'?'warning':s==='FAIL'?'bad':'muted'}`;}
    const checks=safeArray(h.checks);
    $('#healthBody').innerHTML=checks.map(x=>`<tr class="health-row ${String(x.status||'').toLowerCase()}"><td>${esc(x.id)}</td><td>${esc(x.category)}</td><td><strong>${esc(x.invariant)}</strong></td><td>${healthPill(x.status)}</td><td>${esc(x.observed??'—')}</td><td>${esc(x.expected??'—')}</td><td>${esc(x.severity||'—')}</td><td>${esc(x.action||'')}</td></tr>`).join('')||`<tr><td colspan="8" class="empty">Brak danych System Health.</td></tr>`;
  }

  function renderSimulator(){
    const s=data.simulator||{}; const rows=safeArray(s.rows);
    const root=$('#simulatorSummary'); if(!root)return;
    const summary=[['Polityka',s.policy||'—','Bieżące wagi'],['Kandydaci',s.candidates||0,'Bez CURRENT NEXT'],['Zmiany ≥10',s.rankShifts||0,'AUTO → EXPLORER'],['Spór top #1',s.disagreement||'—','AUTO / Explorer / Wildcard']];
    root.innerHTML=summary.map(([l,v,d])=>`<div class="metric-card"><strong>${esc(v)}</strong><span>${esc(l)}</span><small>${esc(d)}</small></div>`).join('');
    const modes=[['AUTO',s.autoTop,'autoRank','auto'],['EXPLORER',s.explorerTop,'explorerRank','explorer'],['WILDCARD',s.wildcardTop,'wildcardRank','wildcard']];
    $('#scenarioCards').innerHTML=modes.map(([mode,title,rankKey,scoreKey])=>{const b=rows.find(x=>x[rankKey]===1)||rows.find(x=>x.title===title)||{};return `<article class="queue-card"><div class="queue-rank">${esc(mode==='AUTO'?'A':mode==='EXPLORER'?'E':'W')}</div><div><div class="queue-topline"><span class="section-kicker">${esc(mode)}</span></div><h3>${esc(b.title||title||'—')}</h3><p>${esc(b.country||'')} ${languageShort(b)?`· ${esc(languageShort(b))}`:''}</p><p class="small-note">${esc(mode==='AUTO'?'Bieżąca polityka bez Session Boost':mode==='EXPLORER'?'Premia za Information Gain':'Wymuszone wagi wildcard')}</p></div><div class="queue-score"><strong>${n(b[scoreKey])}</strong><span>${esc(term('Decision Score','Czy warto teraz'))}</span></div></article>`}).join('');
    $('#simulatorBody').innerHTML=rows.slice(0,30).map(b=>`<tr><td>#${n(b.autoRank,0)}</td><td><strong>${esc(b.title)}</strong><br><small>${esc(b.country||'')}</small></td><td>${n(b.auto)}</td><td>${n(b.comfort)}</td><td>${n(b.explorer)}</td><td>${n(b.polska)}</td><td>${n(b.lowFriction)}</td><td>${n(b.freshRadar)}</td><td>${n(b.seriesContinue)}</td><td>${n(b.wildcard)}</td><td>${b.autoRank!=null&&b.explorerRank!=null?`${b.explorerRank-b.autoRank>0?'+':''}${b.explorerRank-b.autoRank}`:'—'}</td></tr>`).join('')||`<tr><td colspan="11" class="empty">Brak danych symulatora.</td></tr>`;
  }


  function rarityLabel(r){ return ({COMMON:'Pospolite',UNCOMMON:'Niepospolite',RARE:'Rzadkie',EPIC:'Epickie',LEGENDARY:'Legendarne'})[String(r||'').toUpperCase()] || r || '—'; }
  function isUnlockedAchievement(a){ return String(a?.status||'').toUpperCase()==='ODBLOKOWANE'; }
  function achievementDisplayName(a){ return a?.secret && !isUnlockedAchievement(a) ? 'TAJNE OSIĄGNIĘCIE' : (a?.name||'—'); }
  function achievementArt(a){
    const unlocked=isUnlockedAchievement(a); const secret=a?.secret&&!unlocked; const hue=hashHue(a?.id||a?.name||'achievement');
    const image=a?.imageUrl||''; const icon=secret?'?':(a?.icon||'★');
    return `<div class="achievement-art rarity-${esc(String(a?.rarity||'common').toLowerCase())} ${unlocked?'is-unlocked':''}" style="--badge-hue:${hue}">${image&&!secret?`<img src="${esc(image)}" alt="" loading="lazy" referrerpolicy="no-referrer"/>`:`<span>${esc(icon)}</span>`}</div>`;
  }
  function renderAchievements(){
    const root=$('#achievementGallery'); if(!root)return;
    const all=safeArray(data.achievements).slice().sort((a,b)=>(a.order||9999)-(b.order||9999));
    const unlocked=all.filter(isUnlockedAchievement); const xp=unlocked.reduce((sum,a)=>sum+(Number(a.xp)||0),0);
    const legendary=unlocked.filter(a=>String(a.rarity).toUpperCase()==='LEGENDARY').length;
    const closest=all.filter(a=>!isUnlockedAchievement(a)&&!a.secret).sort((a,b)=>(Number(b.progressPct)||0)-(Number(a.progressPct)||0))[0];
    $('#achievementSummary').innerHTML=[['Odblokowane',`${unlocked.length}/${all.length}`,'Trofea'],['XP',xp,'Z odblokowanych'],['Legendarne',legendary,'Najrzadszy tier'],['Najbliżej',closest?`${Math.round((Number(closest.progressPct)||0)*100)}%`:'—',closest?.name||'Brak']].map(([l,v,d])=>`<div class="metric-card"><strong>${esc(v)}</strong><span>${esc(l)}</span><small>${esc(d)}</small></div>`).join('');
    const cats=[...new Set(all.map(a=>a.category).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'pl'));
    const select=$('#achievementCategoryFilter');
    if(select){ const cur=achievementCategoryFilter; select.innerHTML=`<option value="">Wszystkie kategorie</option>`+cats.map(c=>`<option value="${esc(c)}" ${c===cur?'selected':''}>${esc(c)}</option>`).join(''); select.onchange=()=>{achievementCategoryFilter=select.value;renderAchievements();}; }
    const filters=[['all','Wszystkie'],['unlocked','Odblokowane'],['locked','W toku'],['secret','Sekretne']];
    $('#achievementStatusFilters').innerHTML=filters.map(([id,label])=>`<button type="button" class="filter-chip ${achievementStatusFilter===id?'active':''}" data-ach-filter="${id}">${label}</button>`).join('');
    $$('[data-ach-filter]').forEach(btn=>btn.onclick=()=>{achievementStatusFilter=btn.dataset.achFilter;renderAchievements();});
    const items=all.filter(a=>{
      if(achievementCategoryFilter && a.category!==achievementCategoryFilter)return false;
      if(achievementStatusFilter==='unlocked'&&!isUnlockedAchievement(a))return false;
      if(achievementStatusFilter==='locked'&&isUnlockedAchievement(a))return false;
      if(achievementStatusFilter==='secret'&&!a.secret)return false;
      return true;
    });
    root.innerHTML=items.map(a=>{const unlocked=isUnlockedAchievement(a);const secret=a.secret&&!unlocked;const pct=Math.round(clamp((Number(a.progressPct)||0)*100));return `<article class="achievement-card ${unlocked?'unlocked':''} ${secret?'secret':''}">${achievementArt(a)}<div class="achievement-card-body"><div class="achievement-card-top"><span class="rarity-pill ${esc(String(a.rarity||'').toLowerCase())}">${esc(rarityLabel(a.rarity))}</span><span class="achievement-xp">+${n(a.xp,0)} XP</span></div><h3>${esc(achievementDisplayName(a))}</h3><p>${esc(secret?'Warunek pozostaje tajny.':(a.description||a.condition||''))}</p><div class="achievement-progress"><div><span>${esc(secret?'???':(a.progress||`${n(a.progressValue,0)}/${n(a.target,0)}`))}</span><strong>${pct}%</strong></div><div class="progress-track"><i style="width:${pct}%"></i></div></div>${unlocked?`<div class="achievement-unlocked">ODBLOKOWANE${a.unlockedAt?` · ${esc(a.unlockedAt)}`:''}</div>`:`<div class="achievement-category">${esc(a.category||'')}</div>`}</div></article>`}).join('')||`<div class="empty">Brak achievementów dla tego filtra.</div>`;
    const ready=safeArray(data.missions).filter(m=>m.status==='READY').slice(0,3); const mp=$('#achievementMissionPreview'); if(mp) mp.innerHTML=ready.length?ready.map(m=>`<div class="mission-mini"><span>◆</span><div><strong>${esc(m.name)}</strong><p>${esc(m.question||'')}</p></div><small>Info ${n(m.infoGain,0)}</small></div>`).join(''):`<div class="empty">Na razie żadna misja nie jest gotowa.</div>`;
  }

  function renderMissions(){
    const root=$('#missionCards'); if(!root)return;
    const items=safeArray(data.missions); const ready=items.filter(x=>x.status==='READY').length, done=items.filter(x=>x.status==='DONE').length, hold=items.length-ready-done;
    $('#missionSummary').innerHTML=[['Gotowe',ready,'Możliwe eksperymenty'],['Czekają',hold,'Na dane / debrief'],['Ukończone',done,'Zamknięte testy'],['Wpływ','0','Bez opt-inu']].map(([l,v,d])=>`<div class="metric-card"><strong>${esc(v)}</strong><span>${esc(l)}</span><small>${esc(d)}</small></div>`).join('');
    root.innerHTML=items.map(m=>`<article class="mission-card ${m.status==='READY'?'ready':''}"><div class="mission-card-head"><span class="status-pill ${m.status==='READY'?'good':m.status==='DONE'?'muted':'warning'}">${esc(m.status||'—')}</span><span class="mission-id">${esc(m.id||'')}</span></div><h3>${esc(m.name)}</h3><p class="mission-question">${esc(m.question||'')}</p><div class="mission-meta"><span>Info Gain <strong>${n(m.infoGain,0)}</strong></span><span>Priority <strong>${n(m.priority,0)}</strong></span></div><p class="small-note">${esc(m.candidateRule||'')}</p><div class="mission-target">Cel: ${esc(m.target||'—')}</div></article>`).join('')||`<div class="empty">Brak misji.</div>`;
  }

  function renderModel(){
    const cal=data.calibration; const tests=Number(cal.tests)||0;
    $('#calibrationCount').textContent=tests; $('#calibrationState').textContent=cal.state||'—'; $('#calibrationMae').textContent=n(cal.mae,2); $('#calibrationRmse').textContent=n(cal.rmse,2);
    const deg=Math.min(360,tests/10*360); $('#calibrationRing').style.background=`conic-gradient(var(--brass) ${deg}deg,#242a32 ${deg}deg)`;
    const near=safeArray(data.achievements).filter(a=>!isUnlockedAchievement(a)&&!a.secret).sort((a,b)=>(Number(b.progressPct)||0)-(Number(a.progressPct)||0)).slice(0,5); $('#achievementList').innerHTML=near.map(a=>`<div class="achievement"><strong>${esc(a.name)}</strong><p>${Math.round((Number(a.progressPct)||0)*100)}% · ${esc(a.description||a.condition||'')}</p></div>`).join('')||`<div class="empty">Wszystko odblokowane albo brak danych.</div>`;
    $('#calibrationHistory').innerHTML=cal.history.length?cal.history.map(h=>`<div class="achievement"><strong>${esc(h.title)}</strong><p>Predykcja ${n(h.prediction,2)} → ocena ${n(h.actual,2)} · błąd ${n(h.error,2)}</p></div>`).join(''):`<div class="empty">Pierwszy prawdziwy test modelu pojawi się po ukończeniu „${esc(data.current.title||'bieżącej książki')}”.</div>`;
    const learn=data.learning||{}; const phase=$('#learningPhase'); if(phase){phase.textContent=`${learn.phase||'—'} · n=${learn.trainingN||0}`;phase.className='status-pill muted';}
    const items=safeArray(learn.items);
    const learning=$('#learningTimeline'); if(learning) learning.innerHTML=items.slice(0,20).map(x=>`<article class="note-card"><div class="note-meta"><span>${esc(x.date||'')}</span><span>${esc(x.type||'')}</span><span>${esc(x.id||'')}</span></div><blockquote>${esc(x.signal||x.title||'')}</blockquote><div class="assistant-context">${esc(x.evidence||'')}</div><p class="small-note">${esc(x.before||'—')} → ${esc(x.after||'—')} · confidence ${n(x.confidence,0)} · effect ${esc(x.effect||'NONE')}</p></article>`).join('')||`<div class="empty">Learning Ledger jest pusty.</div>`;
    const interactions=$('#interactionList'); if(interactions) interactions.innerHTML=safeArray(data.interactions).map(x=>`<div class="interaction-item"><div><strong>${esc(x.featureA)} ${esc(x.relation)} ${esc(x.featureB)}</strong><p>${esc(x.hypothesis||'')}</p></div><span class="status-pill ${x.status==='ACTIVE'?'good':x.status==='HOLD'?'warning':'muted'}">${esc(x.status||'—')}</span><small>N ${n(x.supportN,0)}/${n(x.activationN,0)} · conf ${n(x.confidence,0)}</small></div>`).join('')||`<div class="empty">Brak interakcji.</div>`;
    const pm=data.postmortem||{}; const pstate=$('#postmortemState'); if(pstate){pstate.textContent=`${pm.closed||0} CLOSED · ${pm.waiting||0} WAIT`;pstate.className='status-pill muted';}
    const pml=$('#postmortemList'); if(pml) pml.innerHTML=safeArray(pm.items).slice(0,8).map(x=>`<div class="postmortem-item"><div><strong>${esc(x.title||'')}</strong><p>Pred ${n(x.prediction,2)} → ${x.actual==null?'czeka':n(x.actual,2)} ${x.surprise?`· ${esc(x.surprise)}`:''}</p></div><span class="status-pill ${x.status==='CLOSED'?'good':'muted'}">${esc(x.status||'—')}</span></div>`).join('')||`<div class="empty">Pierwszy post-mortem zamknie się po Somerset.</div>`;
    renderMemoryHalfLife();
    renderCriticCrowdMe();
    renderExplanationDiff();
    renderPredictionMarket();
    renderUncertaintyBudget();
  }

  function renderLab(){
    const extras=safeArray(data.schema.extraFields); const feats=data.ui.features||{};
    const items=[['Frontend',FRONTEND_VERSION],['Schema API',data.schemaVersion||'—'],['Pola biblioteki',safeArray(data.schema.libraryFields).length],['Nowe / nieznane pola',extras.length]];
    $('#labMetrics').innerHTML=items.map(([label,value])=>`<div class="metric-card"><strong>${esc(value)}</strong><span>${esc(label)}</span></div>`).join('');
    $('#extraFieldsList').innerHTML=extras.length?extras.map(x=>`<span class="token">${esc(x)}</span>`).join(''):`<span class="token">Brak nieznanych pól — schema zsynchronizowana</span>`;
    $('#featureList').innerHTML=Object.entries(feats).map(([k,v])=>`<div class="feature-item"><span>${esc(k)}</span><span>${esc(String(v))}</span></div>`).join('')||`<div class="empty">Brak flag.</div>`;
    renderSemanticQuarantine();
    renderSourceCalibration();
    renderReviewIntelligence();
    renderBackendAtlas();
  }

  function renderBackendAtlas(){
    const root=$('#backendAtlas'); if(!root)return;
    const keys=['crimeDirector','decisionPhysics','selectorTrust','policyArena','preloadRadar','contentSpectrum','contentPreference','debriefDirector','provocationLab','readingJourney','transitionEngine','characterBond','endingPayoff','experiencePalette','translationSensitivity','characterRegistry','bookCast','characterRelations','characterCoverage','castLoad','characterRecallEngine','identityCollisionLab','recurringCharacterRadar','characterProgressSync','characterEncounterTrace','locationRegistry','bookLocations','suspicionTimeline','caseLoadMonitor','caseFileAssets','caseFileDossiers','characterAppearanceEvidence','checkpointSnapshots','reentryPackBuilder','caseDelta','characterVisualStates','visualCollisionBoard','relationGraphFeed','characterUnlocks','characterTheoryPins','suspectWall','characterRecallFeedback','characterMemoryState','caseboardPlayback','caseSceneState','dossierAura'];
    root.innerHTML=keys.map(key=>{const m=moduleData(key), rows=safeArray(m.rows), status=m.status||'UNAVAILABLE'; return `<article class="atlas-card"><div><span class="atlas-dot ${status==='OK'?'ok':''}"></span><strong>${esc(moduleTitle(key,key))}</strong></div><p>${rows.length} rekordów · ${esc(status)}</p></article>`}).join('');
  }

  function renderUndercoverGems(){
    const root=$('#undercoverGems'); if(!root)return;
    const rows=moduleRows('undercoverGems').filter(r=>['PROMOTE GEM','WATCH GEM'].includes(String(cell(r,'Status')).toUpperCase())).slice(0,6);
    root.innerHTML=rows.map((r,i)=>{
      const id=cell(r,'Book ID'); const book=bookById(id)||{id,title:cell(r,'Tytuł'),author:'',country:'',coverUrl:''};
      const status=cell(r,'Status'); const marker=cell(r,'External quality marker'); const score=numv(cell(r,'Gem Score'));
      return `<article class="shelf-book" data-book-id="${esc(id)}">${coverHtml(book,'medium')}<div><span class="section-kicker">${esc(status)}</span><h3>${esc(cell(r,'Tytuł'))}</h3><p>${esc(marker||'Niezależny sygnał jakości')}</p><p class="small-note">${esc(cell(r,'Guardrail'))}</p></div><div class="shelf-score"><div><span>Gem Score</span><div class="microbar"><i data-width="${clamp(score)}"></i></div></div><strong>${score==null?'—':n(score)}</strong></div></article>`;
    }).join('')||`<div class="empty">Na razie brak perełek z wystarczającym evidence gate.</div>`;
    root.querySelectorAll('.shelf-book').forEach(el=>el.addEventListener('click',()=>openDossier(bookById(el.dataset.bookId))));
    requestAnimationFrame(()=>$$('.microbar i',root).forEach(el=>el.style.width=`${el.dataset.width}%`));
  }

  function renderParetoShelf(){
    const root=$('#paretoShelf'); if(!root)return;
    let rows=moduleRows('paretoShelf').filter(r=>String(cell(r,'Frontier')).toUpperCase()==='PARETO' || String(cell(r,'Role')).trim());
    if(!rows.length) rows=moduleRows('paretoShelf').filter(r=>cell(r,'Lifecycle')&&cell(r,'Decision')).slice(0,4);
    root.innerHTML=rows.slice(0,6).map(r=>{
      const id=cell(r,'Book ID'); const book=bookById(id)||{};
      return `<article class="queue-card" data-book-id="${esc(id)}">${book.title?coverHtml(book,'small'):''}<div class="queue-main"><div class="queue-title"><h3>${esc(cell(r,'Tytuł'))}</h3><span class="status-pill muted">${esc(cell(r,'Role')||cell(r,'Frontier')||'TRADE-OFF')}</span></div><p>${esc(cell(r,'Tradeoff')||cell(r,'Dlaczego')||'Niedominowany kompromis między kilkoma celami.')}</p></div><div class="queue-score"><span>Decision</span><strong>${n(numv(cell(r,'Decision')))}</strong></div></article>`;
    }).join('')||`<div class="empty">Brak aktywnego Pareto Shelf.</div>`;
    root.querySelectorAll('[data-book-id]').forEach(el=>el.addEventListener('click',()=>openDossier(bookById(el.dataset.bookId))));
  }

  function renderSeriesMap(){
    const root=$('#seriesMapList'); if(!root)return;
    const rows=moduleRows('seriesMap'); const locked=rows.filter(r=>String(cell(r,'Edge status')).toUpperCase()==='LOCKED');
    const pill=$('#seriesMapStatus'); if(pill){pill.textContent=`${locked.length} aktywnych blokad`;pill.className=`status-pill ${locked.length?'warning':'good'}`;}
    root.innerHTML=rows.slice(0,16).map(r=>`<div class="feature-item"><span><strong>${esc(cell(r,'Tytuł'))}</strong><small>${esc(cell(r,'Seria'))}${cell(r,'Tom')?` · tom ${esc(cell(r,'Tom'))}`:''}</small></span><span>${esc(cell(r,'Frontend relation')||cell(r,'Edge status'))}</span></div>`).join('')||`<div class="empty">Brak zależności serii.</div>`;
  }

  function enrichmentRows(){ return moduleRows('enrichmentEngine').filter(r=>cell(r,'Pole')); }
  function renderEnrichmentFieldRoi(){
    const root=$('#enrichmentFieldRoi'); if(!root)return;
    const rows=enrichmentRows().slice().sort((a,b)=>(numv(cell(b,'ROI'))||0)-(numv(cell(a,'ROI'))||0)).slice(0,8);
    root.innerHTML=rows.map(r=>{const roi=numv(cell(r,'ROI'))||0;return `<div class="coverage-row"><strong>${esc(cell(r,'Pole'))}</strong><div class="coverage-track"><div class="coverage-fill" data-width="${clamp(roi)}"></div></div><span>${n(roi,0)} · ${esc(cell(r,'Priority'))}</span></div>`}).join('')||`<div class="empty">Brak danych Enrichment Engine.</div>`;
    requestAnimationFrame(()=>$$('.coverage-fill',root).forEach(el=>el.style.width=`${el.dataset.width}%`));
  }

  function renderMemoryHalfLife(){
    const root=$('#memoryHalfLife'); if(!root)return;
    const rows=moduleRows('memoryHalfLife'); const complete=rows.filter(r=>String(cell(r,'Status')).toUpperCase().includes('COMPLETE')).length;
    const pill=$('#memoryState'); if(pill){pill.textContent=complete?`${complete} COMPLETE`:'OBSERVE ONLY';pill.className='status-pill muted';}
    root.innerHTML=rows.slice(0,6).map(r=>`<div class="feature-item"><span><strong>${esc(cell(r,'Tytuł'))}</strong><small>D+7 ${esc(cell(r,'D+7 due')||'—')} · D+30 ${esc(cell(r,'D+30 due')||'—')}</small></span><span>${esc(cell(r,'Status')||'WAITING')}</span></div>`).join('')||`<div class="empty">Brak krzywych pamięci.</div>`;
  }

  function renderCriticCrowdMe(){
    const root=$('#criticCrowdMe'); if(!root)return;
    const rows=moduleRows('criticCrowdMe').slice().sort((a,b)=>(String(cell(a,'Phase'))==='POST-READ'?-1:1));
    root.innerHTML=rows.slice(0,6).map(r=>`<div class="feature-item"><span><strong>${esc(cell(r,'Tytuł'))}</strong><small>Critic ${esc(cell(r,'Critic consensus')||'—')} · Crowd ${esc(cell(r,'Crowd /5')||'—')}${cell(r,'Me app /5')?` · Me ${esc(cell(r,'Me app /5'))}`:''}</small></span><span>${esc(cell(r,'Phase')||'—')}</span></div>`).join('')||`<div class="empty">Brak danych Critic/Crowd/Me.</div>`;
  }

  function renderExplanationDiff(){
    const root=$('#explanationDiff'); if(!root)return;
    const rows=moduleRows('explanationDiff');
    root.innerHTML=rows.slice(0,8).map(r=>`<article class="note-card"><div class="note-meta"><span>${esc(cell(r,'Snapshot A'))}</span><span>→</span><span>${esc(cell(r,'Snapshot B'))}</span></div><blockquote>${esc(cell(r,'Tytuł'))}</blockquote><div class="assistant-context">${esc(cell(r,'Evidence added')||'Brak nowych danych.')}</div><p class="small-note">${esc(cell(r,'Reasons added')||'')} · ${esc(cell(r,'Status')||'')}</p></article>`).join('')||`<div class="empty">Brak diffów rekomendacji.</div>`;
  }

  function renderPredictionMarket(){
    const root=$('#predictionMarket'); if(!root)return;
    const rows=moduleRows('predictionMarket');
    root.innerHTML=rows.slice(0,4).map(r=>`<div class="feature-item"><span><strong>${esc(cell(r,'Tytuł'))}</strong><small>Pred ${esc(cell(r,'Prediction'))} · conf ${esc(cell(r,'Confidence'))} · σ ${esc(cell(r,'Sigma'))}</small></span><span>P≥4.5 ${esc(cell(r,'P≥4.5')||'—')}</span></div>`).join('')||`<div class="empty">Brak otwartych rynków predykcji.</div>`;
  }

  function renderUncertaintyBudget(){
    const root=$('#uncertaintyBudget'); if(!root)return;
    const rows=moduleRows('uncertaintyBudget');
    root.innerHTML=rows.slice(0,6).map(r=>`<div class="feature-item"><span><strong>#${esc(cell(r,'Rank'))} ${esc(cell(r,'Tytuł'))}</strong><small>${esc(cell(r,'Najlepsza akcja')||'')}</small></span><span>${esc(cell(r,'Dominant')||'—')}</span></div>`).join('')||`<div class="empty">Brak budżetu niepewności.</div>`;
  }

  function renderSemanticQuarantine(){
    const root=$('#semanticQuarantine'); if(!root)return;
    const rows=moduleRows('semanticQuarantine'); const current=rows.find(r=>String(cell(r,'Lifecycle')).includes('CURRENT'));
    const pill=$('#quarantineState'); if(pill){pill.textContent=current?cell(current,'Status')||'ACTIVE':'ACTIVE';pill.className='status-pill good';}
    root.innerHTML=rows.slice(0,7).map(r=>`<div class="feature-item"><span><strong>${esc(cell(r,'Lifecycle'))}</strong><small>${esc(cell(r,'Execution boundary')||'')}</small></span><span>${esc(cell(r,'Human-readable semantic labels')||cell(r,'Status')||'—')}</span></div>`).join('')||`<div class="empty">Brak polityki kwarantanny.</div>`;
  }

  function renderSourceCalibration(){
    const root=$('#sourceCalibration'); if(!root)return;
    const rows=moduleRows('sourceCalibration');
    root.innerHTML=rows.slice(0,7).map(r=>`<div class="feature-item"><span><strong>${esc(cell(r,'Source / type'))}</strong><small>${esc(cell(r,'Dimension'))} · ${esc(cell(r,'Error / relation')||'')}</small></span><span>${esc(cell(r,'Status')||'—')}</span></div>`).join('')||`<div class="empty">Brak obserwacji kalibracyjnych.</div>`;
  }

  function renderReviewIntelligence(){
    const root=$('#reviewIntelligence'); if(!root)return;
    const rows=moduleRows('reviewIntelligence');
    root.innerHTML=rows.slice(0,8).map(r=>`<div class="feature-item"><span><strong>${esc(cell(r,'Tytuł'))}</strong><small>Pace ${esc(cell(r,'Pace')||'—')} · Characters ${esc(cell(r,'Characters')||'—')} · Atmosphere ${esc(cell(r,'Atmosphere')||'—')} · Psych ${esc(cell(r,'Psychology')||'—')}</small></span><span>${esc(cell(r,'Consensus')||'—')} · ${esc(cell(r,'Review confidence')||'—')}</span></div>`).join('')||`<div class="empty">Brak Review Intelligence.</div>`;
  }

  function renderFrontier(){
    const summary=$('#frontierSummary'), root=$('#frontierCards'); if(!summary||!root)return;
    const rows=moduleRows('tasteFrontier'); const ready=rows.filter(r=>String(cell(r,'Probe status')).toUpperCase()==='READY').length; const held=rows.filter(r=>String(cell(r,'Status')).toUpperCase()==='HOLD').length;
    const top=[...rows].sort((a,b)=>(numv(cell(b,'Value next obs.'))||0)-(numv(cell(a,'Value next obs.'))||0))[0];
    summary.innerHTML=[['Otwarte',rows.filter(r=>String(cell(r,'Status')).toUpperCase()==='OPEN').length,'Pytania o gust'],['Gotowe testy',ready,'Można świadomie eksplorować'],['Wstrzymane',held,'Czekają na debrief'],['Najwyższa wartość',top?cell(top,'Value next obs.'):'—',top?cell(top,'Sygnał'):'—']].map(([l,v,d])=>`<div class="metric-card"><strong>${esc(v)}</strong><span>${esc(l)}</span><small>${esc(d)}</small></div>`).join('');
    root.innerHTML=rows.slice().sort((a,b)=>(numv(cell(b,'Value next obs.'))||0)-(numv(cell(a,'Value next obs.'))||0)).slice(0,12).map(r=>`<article class="mission-card ${String(cell(r,'Probe status')).toUpperCase()==='READY'?'ready':''}"><div class="mission-card-head"><span class="status-pill ${String(cell(r,'Status')).toUpperCase()==='HOLD'?'warning':'muted'}">${esc(cell(r,'Status')||'OPEN')}</span><span class="mission-id">${esc(cell(r,'Frontier ID'))}</span></div><h3>${esc(cell(r,'Sygnał'))}</h3><p class="mission-question">${esc(cell(r,'Next best probe')||'')}</p><div class="mission-meta"><span>Uncertainty <strong>${esc(cell(r,'Uncertainty')||'—')}</strong></span><span>Value <strong>${esc(cell(r,'Value next obs.')||'—')}</strong></span></div><p class="small-note">${esc(cell(r,'Notes')||'')}</p></article>`).join('')||`<div class="empty">Taste Frontier czeka na dane.</div>`;
  }

  function renderEnrichmentEngine(){
    const summary=$('#enrichmentEngineSummary'), fields=$('#enrichmentEngineFields'), body=$('#enrichmentHotlistBody'); if(!summary||!fields||!body)return;
    const rows=enrichmentRows().slice().sort((a,b)=>(numv(cell(b,'ROI'))||0)-(numv(cell(a,'ROI'))||0)); const p0=rows.filter(r=>String(cell(r,'Priority')).toUpperCase()==='P0').length; const top=rows[0];
    summary.innerHTML=[['Pola',rows.length,'Monitorowane cechy'],['P0',p0,'Najwyższy priorytet'],['Top ROI',top?cell(top,'ROI'):'—',top?cell(top,'Pole'):'—'],['Hotlista',safeArray(data.coverage.enrichment).length,'Książki do researchu']].map(([l,v,d])=>`<div class="metric-card"><strong>${esc(v)}</strong><span>${esc(l)}</span><small>${esc(d)}</small></div>`).join('');
    fields.innerHTML=rows.slice(0,10).map(r=>{const roi=numv(cell(r,'ROI'))||0;return `<div class="coverage-row"><strong>${esc(cell(r,'Pole'))}</strong><div class="coverage-track"><div class="coverage-fill" data-width="${clamp(roi)}"></div></div><span>${n(roi,0)} · ${esc(cell(r,'Priority'))}</span></div>`}).join('')||`<div class="empty">Brak danych.</div>`;
    requestAnimationFrame(()=>$$('.coverage-fill',fields).forEach(el=>el.style.width=`${el.dataset.width}%`));
    body.innerHTML=safeArray(data.coverage.enrichment).slice(0,12).map((x,i)=>`<tr><td>${i+1}</td><td><strong>${esc(x.title)}</strong></td><td>${n(x.decision)}</td><td>${n(x.metadataDebt,0)}</td><td>${esc(x.missing||'')}</td></tr>`).join('')||`<tr><td colspan="5">Brak hotlisty.</td></tr>`;
  }

  function renderArena(){
    const summary=$('#arenaSummary'), root=$('#arenaCards'); if(!summary||!root)return;
    const rows=moduleRows('modelArena'); const live=rows.filter(r=>String(cell(r,'Status')).toUpperCase()==='LIVE').length, shadow=rows.filter(r=>String(cell(r,'Status')).toUpperCase()==='SHADOW').length, locked=rows.filter(r=>String(cell(r,'Status')).toUpperCase()==='LOCKED').length;
    const champion=rows.find(r=>String(cell(r,'Role')).toUpperCase()==='CHAMPION');
    summary.innerHTML=[['Champion',champion?cell(champion,'Model ID'):'—','Jedyny LIVE'],['LIVE',live,'Powinno być 1'],['Shadow',shadow,'Challengery obserwowane'],['Locked',locked,'Czekają na dane']].map(([l,v,d])=>`<div class="metric-card"><strong>${esc(v)}</strong><span>${esc(l)}</span><small>${esc(d)}</small></div>`).join('');
    root.innerHTML=rows.map(r=>`<article class="queue-card"><div class="queue-rank">${esc(cell(r,'Role')==='CHAMPION'?'C':'S')}</div><div class="queue-main"><div class="queue-title"><h3>${esc(cell(r,'Model ID'))}</h3><span class="status-pill ${String(cell(r,'Status')).toUpperCase()==='LIVE'?'good':String(cell(r,'Status')).toUpperCase()==='SHADOW'?'muted':'warning'}">${esc(cell(r,'Status'))}</span></div><p>${esc(cell(r,'Core idea')||'')}</p><p class="small-note">${esc(cell(r,'Promotion gate')||cell(r,'Notes')||'')}</p></div><div class="queue-score"><span>Paired tests</span><strong>${esc(cell(r,'Paired tests')||'0')}</strong></div></article>`).join('')||`<div class="empty">Arena nie ma modeli.</div>`;
  }

  function coverHtml(book,size='medium'){
    const title=book?.title||'Nieznana sprawa'; const author=book?.author||'Crime Cockpit'; const hue=hashHue(title);
    const url=book?.coverUrl||''; const source=book?.coverSource||'';
    return `<div class="book-cover ${esc(size)}" style="--cover-a:hsl(${hue} 22% 24%);--cover-b:hsl(${(hue+42)%360} 22% 9%)"><div class="cover-fallback"><span>${esc(author)}</span><strong>${esc(title)}</strong></div>${url?`<img data-cover-img src="${esc(url)}" alt="Okładka: ${esc(title)}" loading="lazy" referrerpolicy="no-referrer"/>`:''}${source?`<small class="cover-source">${esc(source)}</small>`:''}</div>`;
  }
  function hydrateCovers(root=document){
    $$('img[data-cover-img]',root).forEach(img=>{if(img.dataset.bound)return;img.dataset.bound='1';img.addEventListener('error',()=>img.remove());img.addEventListener('load',()=>img.classList.add('loaded'));});
  }
  function bookById(id){ return data.library.find(b=>b.id===id)||data.candidates.find(b=>b.id===id)||(data.current.id===id?data.current:null); }

  function characterBookSection(book){
    if(!book?.id)return '';
    const rows=safeCastRows().filter(r=>String(cell(r,'Book ID'))===String(book.id));
    if(!rows.length)return '';
    return `<section class="dossier-room"><div class="dossier-room-head"><div><div class="section-kicker">POSTACIE</div><h3>${rows.length===1?'1 bezpieczna postać':`${rows.length} bezpiecznych postaci`}</h3></div><button type="button" class="text-button" data-go-characters="${esc(book.id)}">Otwórz atlas →</button></div><div class="dossier-cast-chips">${rows.slice(0,10).map(r=>`<button class="chip character-chip" type="button" data-character-id="${esc(cell(r,'Character ID'))}">${esc(cell(r,'Display Name'))}</button>`).join('')}${rows.length>10?`<span class="chip">+${rows.length-10}</span>`:''}</div></section>`;
  }

  function openDossier(book){
    if(!book) return;
    const dialog=$('#bookDialog');
    const simpleReason=queueNarrative(book);
    const extraEntries=Object.entries(book.extra||{});
    const roomNotes=data.readingRoom.filter(x=>(book.id&&x.bookId===book.id)||(!book.id&&x.title===book.title)).slice().reverse();
    const roomSection=roomNotes.length?`<section class="dossier-room"><div class="dossier-room-head"><div><div class="section-kicker">KLUB LEKTUROWY</div><h3>${roomNotes.length===1?'1 notatka z tej książki':`${roomNotes.length} notatek z tej książki`}</h3></div><button type="button" class="text-button" data-open-room="${esc(book.id||'')}">Pokaż w archiwum →</button></div>${roomNotes.slice(0,3).map(x=>`<div class="dossier-note"><span>${esc(x.progress||'')} · ${esc(humanNoteType(x.type))}</span><p>${esc(x.note||'')}</p></div>`).join('')}</section>`:'';
    const journey=rowByBook('readingJourney',book.id), palette=rowByBook('experiencePalette',book.id), bond=rowByBook('characterBond',book.id), ending=rowByBook('endingPayoff',book.id), trans=rowByBook('translationSensitivity',book.id), content=rowByBook('contentSpectrum',book.id);
    const intelligence=[
      journey&&cell(journey,'Journey Class')&&!String(cell(journey,'Journey Class')).includes('INSUFFICIENT') ? ['Przebieg',cell(journey,'Journey Class')] : null,
      palette&&cell(palette,'Palette Class')&&!String(cell(palette,'Palette Class')).includes('INSUFFICIENT') ? ['Doświadczenie',cell(palette,'Palette Class')] : null,
      bond&&cell(bond,'Bond Prior') ? ['Postacie',`bond prior ${cell(bond,'Bond Prior')}`] : null,
      content&&cell(content,'Status') ? ['Content',cell(content,'Status')] : null,
      trans&&cell(trans,'Style Sensitivity Proxy') ? ['Warstwa językowa',`sensitivity ${cell(trans,'Style Sensitivity Proxy')}`] : null,
      book.lifecycle==='READ'&&ending&&cell(ending,'Status') ? ['Finał',cell(ending,'Status')] : null
    ].filter(Boolean);
    const intelligenceSection=intelligence.length?`<section class="dossier-intelligence"><div class="section-kicker">INTELLIGENCE PROFILE</div><div class="intelligence-grid">${intelligence.map(([k,v])=>`<div><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`).join('')}</div></section>`:'';
    const vaultSection=vaultMissing(book)?`<div class="vault-note"><span class="vault-missing">◌</span><div><strong>EPUB-u nie ma jeszcze w Vault</strong><small>${esc(book.preloadState==='PRELOAD SOON'?'Preload Radar sugeruje przygotowanie go zawczasu.':'To tylko informacja logistyczna — bez wpływu na ocenę książki.')}</small></div></div>`:'';
    const tsState=translationStudioState(book);
    const translationSection=tsState&&tsState!=='NONE'?`<div class="vault-note"><span class="status-pill muted">PL</span><div><strong>${esc(tsState.includes('ACTIVE')?'Tłumaczenie własne jest w toku':tsState.includes('QUEUED')?'Tłumaczenie własne czeka w kolejce':'Tłumaczenie własne')}</strong><small>${esc(privatePlEditionId(book)?'Planowana edycja: '+privatePlEditionId(book):'Translation Studio · prywatna ścieżka właściciela')}</small></div></div>`:'';
    $('#bookDialogContent').innerHTML=`<div class="dossier"><div>${coverHtml(book,'large')}</div><div><div class="section-kicker">DOSSIER KSIĄŻKI</div><h2>${esc(book.title)}${vaultSignalHtml(book)}</h2><p class="subtitle">${esc(book.author)}${book.country?` · ${esc(book.country)}`:''}</p><div class="chip-row">${statusBadge(book.lifecycle)}${book.series?`<span class="chip brass">${esc(book.series)}${book.volume?` #${esc(book.volume)}`:''}</span>`:''}${book.language?`<span class="chip">${esc(languageShort(book)||languageUi(book))}</span>`:''}${translationChipHtml(book)}</div><div class="dossier-grid"><div class="dossier-stat"><span>${esc(term('Core Book Fit','Dopasowanie do Ciebie'))}</span><strong>${n(book.bookFit)}</strong></div><div class="dossier-stat"><span>${esc(term('Decision Score','Czy warto teraz'))}</span><strong>${n(book.decision)}</strong></div><div class="dossier-stat"><span>${esc(term('Information Gain','Ile się nauczymy'))}</span><strong>${n(book.infoGain)}</strong></div></div><div class="dossier-reason">${esc(simpleReason)}</div><div class="dossier-grid"><div class="dossier-stat"><span>Seria / ciągłość</span><strong>${esc(book.seriesSafety||book.seriesMode||'—')}</strong></div><div class="dossier-stat"><span>Język / wydanie</span><strong>${esc(languageUi(book))}</strong></div><div class="dossier-stat expert-only"><span>${esc(term('Metadata Debt','Braki danych'))}</span><strong>${n(book.metadataDebt,0)}</strong></div></div>${vaultSection}${translationSection}${intelligenceSection}${characterBookSection(book)}${roomSection}${book.preflightSource?`<p class="small-note">Ostatnia kontrola: ${esc(book.preflightSource)}</p>`:''}${extraEntries.length?`<details class="expert-only tech-details"><summary>Nowe / dodatkowe pola z arkusza</summary><div class="extra-grid">${extraEntries.map(([k,v])=>`<div class="extra-item"><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`).join('')}</div></details>`:''}</div></div>`;
    hydrateCovers(dialog);
    const roomBtn=$('[data-open-room]',dialog);
    if(roomBtn) roomBtn.addEventListener('click',()=>{dialog.close();setView('reading-room');const filter=$('#readingRoomBookFilter');if(filter){filter.value=roomBtn.dataset.openRoom||'all';renderReadingRoom();}});
    $$('[data-character-id]',dialog).forEach(el=>el.addEventListener('click',()=>{dialog.close();openCharacterDossier(el.dataset.characterId)}));
    const charGo=$('[data-go-characters]',dialog); if(charGo) charGo.addEventListener('click',()=>{const bid=charGo.dataset.goCharacters;dialog.close();setView('characters');const f=$('#characterBookFilter');if(f){f.value=bid;renderCharacters();}});
    dialog.showModal();
  }

  function openCommand(){
    $('#commandInput').value=''; renderCommandResults(''); $('#commandDialog').showModal(); setTimeout(()=>$('#commandInput').focus(),50);
  }
  function renderCommandResults(q){
    q=String(q||'').toLocaleLowerCase('pl').trim();
    const modules=safeArray(data.ui.modules).filter(m=>m.enabled!==false&&(state.mode==='expert'?m.expert!==false:m.owner!==false));
    const moduleResults=modules.filter(m=>!q||`${m.label} ${m.description}`.toLocaleLowerCase('pl').includes(q)).slice(0,6).map(m=>({type:'module',id:m.id,title:m.label,meta:m.description||'Sekcja'}));
    const bookResults=data.library.filter(b=>!q||`${b.title} ${b.author} ${b.country} ${b.series}`.toLocaleLowerCase('pl').includes(q)).slice(0,8).map(b=>({type:'book',id:b.id,title:b.title,meta:`${b.author}${b.lifecycle?` · ${statusLabel(b.lifecycle)}`:''}`}));
    const charResults=safeCastRows().filter(r=>!q||characterSearchText(r).includes(q)).filter((r,i,a)=>a.findIndex(x=>cell(x,'Character ID')===cell(r,'Character ID'))===i).slice(0,6).map(r=>({type:'character',id:cell(r,'Character ID'),title:cell(r,'Display Name'),meta:`Postać · ${cell(r,'Title')}`}));
    $('#commandResults').innerHTML=[...moduleResults,...bookResults,...charResults].map(r=>`<button class="command-result" type="button" data-type="${r.type}" data-id="${esc(r.id||'')}"><span><strong>${esc(r.title)}</strong><small>${esc(r.meta||'')}</small></span><span>${r.type==='module'?'↗':'→'}</span></button>`).join('')||`<div class="empty">Nic nie znaleziono.</div>`;
    $$('.command-result',$('#commandResults')).forEach(el=>el.addEventListener('click',()=>{ $('#commandDialog').close(); if(el.dataset.type==='module')setView(el.dataset.id); else if(el.dataset.type==='character')openCharacterDossier(el.dataset.id); else openDossier(bookById(el.dataset.id)); }));
  }

  function animateCounts(root){
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){$$('[data-count]',root).forEach(el=>el.textContent=formatCount(el.dataset.count,el.dataset.format));return;}
    $$('[data-count]',root).forEach(el=>{const target=Number(el.dataset.count)||0;const start=performance.now(),dur=650;function tick(now){const p=Math.min(1,(now-start)/dur),e=1-Math.pow(1-p,3);el.textContent=formatCount(target*e,el.dataset.format);if(p<1)requestAnimationFrame(tick)}requestAnimationFrame(tick)});
  }
  function formatCount(v,format){return format==='percent'?`${n(v*100,0)}%`:n(v,0)}

  function observeReveals(){
    if(revealObserver) revealObserver.disconnect();
    revealObserver=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add('in-view')}),{threshold:.05});
    $$('.view.active .reveal').forEach(el=>revealObserver.observe(el));
  }

  function checkSchemaCompatibility(){
    const major=Number(String(data.schemaVersion||'0').split('.')[0]);
    if(major>5) toast(`Nowe API v${data.schemaVersion}. Frontend działa tolerancyjnie, ale warto go zaktualizować.`);
  }
  let toastTimer; function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2600)}

  function bindEvents(){
    $('#ownerModeBtn').addEventListener('click',()=>setMode('owner')); $('#expertModeBtn').addEventListener('click',()=>setMode('expert'));
    $('#refreshBtn').addEventListener('click',()=>loadData()); $('#settingsBtn').addEventListener('click',openSettings); $('#commandBtn').addEventListener('click',openCommand);
    $('#currentDossierBtn').addEventListener('click',()=>openDossier(data.current));
    $('#librarySearch').addEventListener('input',renderLibrary); $('#lifecycleFilter').addEventListener('change',renderLibrary);
    $('#characterSearch').addEventListener('input',renderCharacters); $('#characterBookFilter').addEventListener('change',renderCharacters);
    $('[data-character-case-tab]').forEach(el=>el.addEventListener('click',()=>{const next=el.dataset.characterCaseTab||'files';if(next==='time'&&characterCaseTab!=='time')casePlaybackIndex=-1;characterCaseTab=next;renderCharacters();}));
    $('#readingRoomBookFilter').addEventListener('change',renderReadingRoom);
    $$('[data-go]').forEach(el=>el.addEventListener('click',()=>setView(el.dataset.go)));
    $$('[data-close-dialog]').forEach(el=>el.addEventListener('click',()=>document.getElementById(el.dataset.closeDialog).close()));
    $('#commandInput').addEventListener('input',e=>renderCommandResults(e.target.value));
    document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openCommand()} if(e.key==='Escape'&&$('#commandDialog').open)$('#commandDialog').close()});
    $('#settingsForm').addEventListener('submit',e=>{ if(e.submitter?.value!=='save')return; e.preventDefault(); state.apiUrl=$('#apiUrlInput').value.trim(); state.token=$('#tokenInput').value.trim(); localStorage.setItem('crimeCockpitApiUrl',state.apiUrl); localStorage.setItem('crimeCockpitToken',state.token); $('#settingsDialog').close(); loadData(); });
    $('#clearConfigBtn').addEventListener('click',()=>{state.apiUrl='';state.token='';localStorage.removeItem('crimeCockpitApiUrl');localStorage.removeItem('crimeCockpitToken');$('#apiUrlInput').value='';$('#tokenInput').value='';toast('Połączenie LIVE wyczyszczone');});
    document.addEventListener('pointermove',e=>{document.documentElement.style.setProperty('--mx',`${e.clientX}px`);document.documentElement.style.setProperty('--my',`${e.clientY}px`)});
  }
  function setMode(mode){state.mode=mode;localStorage.setItem('crimeCockpitViewMode',mode);renderAll();toast(mode==='expert'?'Tryb ekspercki włączony':'Tryb prosty włączony')}
  function openSettings(){ $('#apiUrlInput').value=state.apiUrl; $('#tokenInput').value=state.token; $('#settingsDialog').showModal(); }

  document.addEventListener('DOMContentLoaded',()=>{bindEvents();loadData(false)});
})();