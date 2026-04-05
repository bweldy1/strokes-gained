// ═══════════════════════════════════════════════════════════════
// SG LOOKUP TABLES (PLACEHOLDERS)
// Green table = FEET; all others = YARDS
// ═══════════════════════════════════════════════════════════════
const SG_TABLES = {
  tee: [[100,2.80],[150,2.95],[200,3.10],[250,3.25],[300,3.45],[350,3.62],[400,3.75],[450,3.88],[500,4.00],[550,4.10],[600,4.20]],
  fairway: [[10,1.30],[20,1.45],[30,1.60],[40,1.72],[50,1.82],[75,2.10],[100,2.30],[125,2.48],[150,2.62],[175,2.75],[200,2.87],[225,2.96],[250,3.06],[275,3.15],[300,3.24]],
  rough: [[10,1.40],[20,1.55],[30,1.68],[40,1.80],[50,1.92],[75,2.20],[100,2.40],[125,2.58],[150,2.72],[175,2.85],[200,2.97],[225,3.08],[250,3.18],[275,3.27],[300,3.36]],
  sand: [[5,1.60],[10,1.72],[15,1.82],[20,1.90],[30,2.05],[40,2.18],[50,2.30],[75,2.55],[100,2.75],[125,2.92],[150,3.08],[175,3.22],[200,3.35]],
  recovery: [[10,1.80],[20,1.95],[30,2.08],[50,2.28],[75,2.50],[100,2.70],[125,2.88],[150,3.05],[200,3.30]],
  green: [[1,1.01],[2,1.03],[3,1.08],[4,1.14],[5,1.20],[6,1.28],[7,1.35],[8,1.40],[9,1.46],[10,1.51],[12,1.59],[15,1.68],[20,1.78],[25,1.86],[30,1.92],[40,2.01],[50,2.09],[60,2.16]]
};

// ═══════════════════════════════════════════════════════════════
// QUALITY BANDS (PLACEHOLDERS)
// ═══════════════════════════════════════════════════════════════
const QUALITY_BANDS = {
  drive:     [{label:'Great',min:0.6,color:'#52b788'},{label:'Good',min:0.2,color:'#74c69d'},{label:'Average',min:-0.2,color:'#f4a261'},{label:'Poor',min:-0.6,color:'#e76f51'},{label:'Terrible',min:-999,color:'#e94560'}],
  approach:  [{label:'Great',min:0.5,color:'#52b788'},{label:'Good',min:0.1,color:'#74c69d'},{label:'Average',min:-0.2,color:'#f4a261'},{label:'Poor',min:-0.5,color:'#e76f51'},{label:'Terrible',min:-999,color:'#e94560'}],
  shortgame: [{label:'Great',min:0.4,color:'#52b788'},{label:'Good',min:0.1,color:'#74c69d'},{label:'Average',min:-0.1,color:'#f4a261'},{label:'Poor',min:-0.4,color:'#e76f51'},{label:'Terrible',min:-999,color:'#e94560'}],
  putt:      [{label:'Great',min:0.3,color:'#52b788'},{label:'Good',min:0.05,color:'#74c69d'},{label:'Average',min:-0.1,color:'#f4a261'},{label:'Poor',min:-0.3,color:'#e76f51'},{label:'Terrible',min:-999,color:'#e94560'}]
};

// ═══════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════
let state = { currentRoundId:null, currentHole:1, editingShotIndex:null, excludedCategories:new Set(), shotLie:null, shotResultLie:null, shotCategory:null };

// ═══════════════════════════════════════════════════════════════
// STORAGE
// ═══════════════════════════════════════════════════════════════
function getRounds()  { try { return JSON.parse(localStorage.getItem('sg_rounds') || '[]'); } catch(e) { return []; } }
function saveRounds(r){ localStorage.setItem('sg_rounds', JSON.stringify(r)); }
function getCourses() { try { return JSON.parse(localStorage.getItem('sg_courses') || '[]'); } catch(e) { return []; } }
function saveCourses(c){ localStorage.setItem('sg_courses', JSON.stringify(c)); }
function getRound(id) { return getRounds().find(r => r.id === id); }
function updateRound(round) { const rs = getRounds(); const i = rs.findIndex(r => r.id === round.id); if(i>=0) rs[i]=round; else rs.unshift(round); saveRounds(rs); }
function currentRound()    { return getRound(state.currentRoundId); }
function currentHoleData() { const r=currentRound(); return r ? r.holes[state.currentHole-1] : null; }

// ═══════════════════════════════════════════════════════════════
// SG ENGINE
// ═══════════════════════════════════════════════════════
function interpolate(table, dist) {
  if(!table||table.length===0) return null;
  if(dist<=table[0][0]) return table[0][1];
  if(dist>=table[table.length-1][0]) return table[table.length-1][1];
  for(let i=0;i<table.length-1;i++){
    const [d1,v1]=table[i],[d2,v2]=table[i+1];
    if(dist>=d1&&dist<=d2) return v1+((dist-d1)/(d2-d1))*(v2-v1);
  }
  return null;
}
function getExpected(lie, dist) { return interpolate(SG_TABLES[lie], dist); }
function calcSG(startLie, startDist, resultLie, resultDist) {
  if(resultLie==='holed'){ const s=getExpected(startLie,startDist); return s!==null ? s-1 : null; }
  const s=getExpected(startLie,startDist), e=getExpected(resultLie,resultDist);
  return (s===null||e===null) ? null : s-e-1;
}
function getQuality(sg, category) {
  const bands=QUALITY_BANDS[category]||QUALITY_BANDS.approach;
  for(const b of bands){ if(sg>=b.min) return b; }
  return bands[bands.length-1];
}

// ═══════════════════════════════════════════════════════════════
// CATEGORY AUTO-ASSIGN
// ═══════════════════════════════════════════════════════════════
function autoCategory(lie, distYards, shotIndex, holePar) {
  if(lie==='green') return 'putt';
  if(shotIndex===0&&(holePar===4||holePar===5)) return 'drive';
  if(distYards>=30) return 'approach';
  return 'shortgame';
}

// ═══════════════════════════════════════════════════════════════
// PRE-FILL: suggest lie+dist for next shot from prev shot result
// ═══════════════════════════════════════════════════════════════
function getSuggestion(holeData) {
  const shots = holeData.shots || [];
  if(shots.length===0) {
    const yards = holeData.yardsOverride || holeData.yards;
    return { lie:'tee', dist:yards, hint:'Scorecard: '+yards+' yds from tee' };
  }
  const prev = shots[shots.length-1];
  if(!prev.resultLie || prev.resultLie==='holed') return null;
  const lie = prev.resultLie;
  const dist = prev.resultDist;
  const distLabel = lie==='green' ? (dist!=null?dist+' ft':'') : (dist!=null?dist+' yds':'');
  return { lie, dist: dist||'', hint:'From shot '+shots.length+': '+lie+(distLabel?' · '+distLabel:'') };
}

// ═══════════════════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════════════════
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById('screen-'+name).classList.add('active');
  window.scrollTo(0,0);
  if(name==='home') renderHome();
  if(name==='courses') renderCourses();
  if(name==='hole') renderHoleScreen();
  if(name==='summary') renderSummary();
}

// ═══════════════════════════════════════════════════════════════
// HOME
// ═══════════════════════════════════════════════════════════════
function renderHome() {
  const rounds = getRounds();
  const el = document.getElementById('rounds-list');
  if(rounds.length===0){ el.innerHTML=`<div class="empty-state"><div class="empty-state-icon">⛳</div><div class="empty-state-text">No rounds yet.<br>Start a new round to begin tracking.</div></div>`; return; }
  el.innerHTML = rounds.map(r => {
    const sg=roundTotalSG(r,null);
    const sgStr=sg!==null?(sg>=0?'+':'')+sg.toFixed(1):'—';
    const sgColor=sg===null?'var(--text-muted)':sg>=0?'var(--q-great)':'var(--q-poor)';
    const shots=r.holes.reduce((s,h)=>s+(h.shots||[]).length,0);
    return `<div class="round-card" onclick="resumeRound('${r.id}')">
      <div class="round-card-info"><div class="round-card-name">${r.courseName}</div><div class="round-card-meta">${formatDate(r.date)} · ${shots} shot${shots!==1?'s':''}</div></div>
      <div class="round-card-sg"><div class="round-card-sg-val" style="color:${sgColor}">${sgStr}</div><div class="round-card-sg-lbl">Total SG</div></div>
      <div class="round-del-btn" onclick="event.stopPropagation();deleteRound('${r.id}')">×</div>
    </div>`;
  }).join('');
}
function goToNewRound(){ showScreen('courses'); }
function resumeRound(id){
  state.currentRoundId=id; const r=getRound(id);
  let last=1; for(let i=0;i<r.holes.length;i++) if((r.holes[i].shots||[]).length>0) last=i+1;
  state.currentHole=last; state.excludedCategories=new Set(); showScreen('hole');
}
function deleteRound(id){ if(!confirm('Delete this round?')) return; saveRounds(getRounds().filter(r=>r.id!==id)); renderHome(); }
function formatDate(iso){ if(!iso) return ''; const d=new Date(iso); return d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}); }

// ═══════════════════════════════════════════════════════════════
// COURSES
// ═══════════════════════════════════════════════════════════════
function renderCourses() {
  const courses=getCourses(), el=document.getElementById('courses-list');
  if(courses.length===0){ el.innerHTML=`<div class="empty-state" style="padding:24px 0"><div class="empty-state-icon">🏌️</div><div class="empty-state-text">No courses saved yet.<br>Add one below.</div></div>`; return; }
  el.innerHTML=courses.map(c=>`<div class="course-card" onclick="startRound('${c.id}')"><div class="course-icon">⛳</div><div class="course-info"><div class="course-name">${c.name}</div><div class="course-meta">${c.tees?c.tees+' tees · ':''}${c.holes.length} holes</div></div><div style="color:var(--text-dim);font-size:20px">›</div></div>`).join('');
}
function saveCourseJSON() {
  const raw=document.getElementById('course-json-input').value.trim();
  const errEl=document.getElementById('json-error'); errEl.style.display='none';
  if(!raw){ errEl.textContent='Please paste course JSON.'; errEl.style.display='block'; return; }
  let parsed; try{ parsed=JSON.parse(raw); }catch(e){ errEl.textContent='Invalid JSON: '+e.message; errEl.style.display='block'; return; }
  const arr=Array.isArray(parsed)?parsed:[parsed];
  const courses=getCourses(); let added=0;
  for(const c of arr){
    if(!c.name||!Array.isArray(c.holes)){ errEl.textContent='Each course needs "name" and "holes".'; errEl.style.display='block'; return; }
    for(const h of c.holes){ if(!h.hole||!h.par||!h.yards){ errEl.textContent='Each hole needs "hole", "par", "yards".'; errEl.style.display='block'; return; } }
    c.id=c.id||('course_'+Date.now()+'_'+added); courses.push(c); added++;
  }
  saveCourses(courses); document.getElementById('course-json-input').value=''; renderCourses(); showToast('Course saved!');
}
function showSampleJSON() {
  document.getElementById('course-json-input').value=JSON.stringify([{"name":"Wild Wood Golf Club","tees":"Blue","holes":[{"hole":1,"par":4,"yards":354},{"hole":2,"par":4,"yards":417},{"hole":3,"par":5,"yards":471},{"hole":4,"par":4,"yards":353},{"hole":5,"par":3,"yards":154},{"hole":6,"par":5,"yards":514},{"hole":7,"par":4,"yards":342},{"hole":8,"par":3,"yards":197},{"hole":9,"par":4,"yards":397},{"hole":10,"par":4,"yards":383},{"hole":11,"par":4,"yards":377},{"hole":12,"par":4,"yards":371},{"hole":13,"par":3,"yards":135},{"hole":14,"par":4,"yards":346},{"hole":15,"par":4,"yards":342},{"hole":16,"par":4,"yards":326},{"hole":17,"par":3,"yards":201},{"hole":18,"par":5,"yards":465}]}],null,2);
}
function startRound(courseId) {
  const course=getCourses().find(c=>c.id===courseId); if(!course) return;
  const round={ id:'round_'+Date.now(), date:new Date().toISOString(), courseName:course.name, courseId:course.id,
    holes:course.holes.map(h=>({hole:h.hole,par:h.par,yards:h.yards,yardsOverride:null,shots:[]})) };
  updateRound(round); state.currentRoundId=round.id; state.currentHole=1; state.excludedCategories=new Set(); showScreen('hole');
}

// ═══════════════════════════════════════════════════════════════
// HOLE SCREEN
// ═══════════════════════════════════════════════════════════════
function renderHoleScreen() {
  const round=currentRound(); if(!round) return;
  document.getElementById('hole-course-name').textContent=round.courseName;
  document.getElementById('hole-round-date').textContent=formatDate(round.date)+' ✎';
  renderHole(); updateTally();
}
function renderHole() {
  const round=currentRound(), h=state.currentHole, hd=round.holes[h-1];
  document.getElementById('hole-num-display').textContent=h;
  document.getElementById('hole-par-display').textContent='Par '+hd.par;
  document.getElementById('hole-yards-display').textContent=(hd.yardsOverride||hd.yards)+' yds';
  document.getElementById('hole-prev-btn').classList.toggle('disabled',h<=1);
  document.getElementById('hole-next-btn').classList.toggle('disabled',h>=round.holes.length);
  renderShotList(hd);
}
function renderShotList(hd) {
  const shots=hd.shots||[], el=document.getElementById('shot-list');
  if(shots.length===0){ el.innerHTML=`<div style="text-align:center;padding:24px;color:var(--text-dim);font-size:14px">No shots yet — tap Add Shot below</div>`; return; }
  el.innerHTML=shots.map((s,i)=>{
    const sg=s.sg, sgStr=sg!=null?(sg>=0?'+':'')+sg.toFixed(2):'—';
    const sgColor=sg==null?'var(--text-muted)':sg>=0?'var(--q-good)':'var(--q-poor)';
    const quality=sg!=null?getQuality(sg,s.category):null;
    const distStr=s.lie==='green'?s.distFrom+' ft':s.distFrom+' yds';
    const resLabel=s.resultLie==='holed'?'Holed ⛳':s.resultLie.charAt(0).toUpperCase()+s.resultLie.slice(1);
    const resDist=s.resultLie==='holed'?'':(s.resultLie==='green'?(s.resultDist!=null?s.resultDist+' ft':''):(s.resultDist!=null?s.resultDist+' yds':''));
    return `<div class="shot-row" onclick="editShot(${i})">
      <div class="shot-num">${i+1}</div>
      <div class="shot-info">
        <div class="shot-info-main">${s.lie.charAt(0).toUpperCase()+s.lie.slice(1)} · ${distStr} <span class="category-badge cat-${s.category}">${catLabel(s.category)}</span></div>
        <div class="shot-info-sub">→ ${resLabel}${resDist?' · '+resDist:''}</div>
      </div>
      <div class="shot-sg"><div class="shot-sg-val" style="color:${sgColor}">${sgStr}</div>${quality?`<div class="shot-quality-dot" style="background:${quality.color}"></div>`:''}</div>
      <div class="shot-del" onclick="event.stopPropagation();deleteShot(${i})">×</div>
    </div>`;
  }).join('');
}
function catLabel(cat){ return {drive:'Drive',approach:'Approach',shortgame:'Short Game',putt:'Putt'}[cat]||cat; }
function prevHole(){ if(state.currentHole>1){ state.currentHole--; renderHole(); updateTally(); } }
function nextHole(){ const r=currentRound(); if(state.currentHole<r.holes.length){ state.currentHole++; renderHole(); updateTally(); } }

// ═══════════════════════════════════════════════════════════════
// TALLY
// ═══════════════════════════════════════════════════════════════
function updateTally() {
  const round=currentRound(); if(!round) return;
  const cats=['drive','approach','shortgame','putt'];
  const totals={drive:0,approach:0,shortgame:0,putt:0}, counts={drive:0,approach:0,shortgame:0,putt:0};
  for(const hole of round.holes) for(const s of (hole.shots||[])){
    if(s.sg==null) continue;
    if(totals[s.category]!==undefined){ totals[s.category]+=s.sg; counts[s.category]++; }
  }
  let total=0;
  cats.forEach(c=>{ if(!state.excludedCategories.has(c)) total+=totals[c]; });
  const tc=cats.filter(c=>!state.excludedCategories.has(c)).reduce((s,c)=>s+counts[c],0);
  const tvt=document.getElementById('tv-total');
  tvt.textContent=tc===0?'—':(total>=0?'+':'')+total.toFixed(1);
  tvt.className='tally-chip-val'+(tc>0&&total>0?' pos':tc>0&&total<0?' neg':'');
  cats.forEach(cat=>{
    const v=totals[cat],c=counts[cat],ve=document.getElementById('tv-'+cat);
    ve.textContent=c===0?'—':(v>=0?'+':'')+v.toFixed(1);
    ve.className='tally-chip-val'+(c>0&&v>0?' pos':c>0&&v<0?' neg':'');
    document.getElementById('tally-'+cat).classList.toggle('excluded',state.excludedCategories.has(cat));
  });
}
function toggleTally(cat){ if(cat==='total') return; if(state.excludedCategories.has(cat)) state.excludedCategories.delete(cat); else state.excludedCategories.add(cat); updateTally(); }

// ═══════════════════════════════════════════════════════════════
// SHOT SHEET
// ═══════════════════════════════════════════════════════════════
function openShotSheet(editIndex) {
  state.editingShotIndex = editIndex!==undefined ? editIndex : null;
  state.shotLie=null; state.shotResultLie=null; state.shotCategory=null;
  document.getElementById('shot-sheet-title').textContent = editIndex!==undefined?'Edit Shot':'Add Shot';
  document.getElementById('shot-dist-from').value='';
  document.getElementById('shot-dist-result').value='';
  document.getElementById('result-dist-group').style.display='none';
  document.getElementById('prefill-hint').style.display='none';
  document.querySelectorAll('#lie-pills .pill,#result-lie-pills .pill,#category-pills .pill').forEach(p=>p.classList.remove('selected'));

  const hd=currentHoleData();
  if(editIndex!==undefined){
    const s=hd.shots[editIndex];
    selectLie(s.lie,true);
    document.getElementById('shot-dist-from').value=s.distFrom;
    selectResultLie(s.resultLie,true);
    if(s.resultDist!=null) document.getElementById('shot-dist-result').value=s.resultDist;
    selectCategory(s.category,true);
  } else {
    const sug=getSuggestion(hd);
    if(sug){
      selectLie(sug.lie,true);
      if(sug.dist!=='') document.getElementById('shot-dist-from').value=sug.dist;
      const hint=document.getElementById('prefill-hint');
      hint.textContent='↑ Pre-filled: '+sug.hint+' (override freely)';
      hint.style.display='block';
      const idx=hd.shots.length;
      selectCategory(autoCategory(sug.lie,sug.dist||0,idx,hd.par),true);
    }
  }
  updateDistFromUnit(); updateResultDistVisibility(); updateSGPreview();
  document.getElementById('shot-sheet').classList.add('open');
  setTimeout(()=>document.getElementById('shot-dist-from').focus(),350);
}
function editShot(i){ openShotSheet(i); }
function closeShotSheet(){ document.getElementById('shot-sheet').classList.remove('open'); }
function handleSheetOverlayClick(e){ if(e.target===document.getElementById('shot-sheet')) closeShotSheet(); }

function selectLie(lie,silent){
  state.shotLie=lie;
  document.querySelectorAll('#lie-pills .pill').forEach(p=>p.classList.toggle('selected',p.textContent.trim().toLowerCase()===lie));
  updateDistFromUnit();
  if(!silent){ autoSetCategory(); updateSGPreview(); }
}
function updateDistFromUnit(){
  const green=state.shotLie==='green';
  document.getElementById('dist-from-unit').textContent=green?'ft':'yds';
  document.getElementById('dist-from-unit-label').textContent=green?'(feet)':'(yards)';
}
function selectResultLie(lie,silent){
  state.shotResultLie=lie;
  document.querySelectorAll('#result-lie-pills .pill').forEach(p=>{
    const t=p.textContent.toLowerCase().replace(/[^a-z]/g,'');
    p.classList.toggle('selected',t===lie||(lie==='holed'&&t==='holed'));
  });
  updateResultDistVisibility();
  if(!silent){ autoSetCategory(); updateSGPreview(); }
}
function updateResultDistVisibility(){
  const show=state.shotResultLie&&state.shotResultLie!=='holed';
  document.getElementById('result-dist-group').style.display=show?'block':'none';
  if(show){
    const green=state.shotResultLie==='green';
    document.getElementById('dist-result-unit').textContent=green?'ft':'yds';
    document.getElementById('result-dist-unit-label').textContent=green?'(feet)':'(yards)';
  }
}
function selectCategory(cat,silent){
  state.shotCategory=cat;
  const map={'Drive':'drive','Approach':'approach','Short Game':'shortgame','Putt':'putt'};
  document.querySelectorAll('#category-pills .pill').forEach(p=>p.classList.toggle('selected',map[p.textContent.trim()]===cat));
}
function autoSetCategory(){
  if(!state.shotLie) return;
  const dist=parseFloat(document.getElementById('shot-dist-from').value)||0;
  const hd=currentHoleData(), idx=state.editingShotIndex!==null?state.editingShotIndex:(hd.shots||[]).length;
  selectCategory(autoCategory(state.shotLie,dist,idx,hd.par),true);
}
function onShotFormChange(){ autoSetCategory(); updateSGPreview(); }
function updateSGPreview(){
  const lie=state.shotLie, rLie=state.shotResultLie;
  const dFrom=parseFloat(document.getElementById('shot-dist-from').value);
  const dRes=parseFloat(document.getElementById('shot-dist-result').value);
  const pv=document.getElementById('sg-preview-val'), pl=document.getElementById('sg-preview-label'), mk=document.getElementById('sg-quality-marker');
  if(!lie||!rLie||isNaN(dFrom)){ pv.textContent='—'; pv.style.color='var(--text-muted)'; pl.textContent='Enter shot details for SG'; mk.style.left='50%'; return; }
  const sg=calcSG(lie,dFrom,rLie,isNaN(dRes)?0:dRes);
  if(sg===null){ pv.textContent='—'; pv.style.color='var(--text-muted)'; pl.textContent='Distance out of range'; mk.style.left='50%'; return; }
  const q=getQuality(sg,state.shotCategory||'approach');
  pv.textContent=(sg>=0?'+':'')+sg.toFixed(2); pv.style.color=q.color; pl.textContent=q.label;
  mk.style.left=Math.max(0,Math.min(100,((sg+1.5)/3.0)*100))+'%';
}
function saveShot(){
  const lie=state.shotLie, rLie=state.shotResultLie;
  const dFrom=parseFloat(document.getElementById('shot-dist-from').value);
  const dRes=parseFloat(document.getElementById('shot-dist-result').value);
  if(!lie){ showToast('Select a starting lie'); return; }
  if(isNaN(dFrom)||dFrom<=0){ showToast('Enter distance from pin'); return; }
  if(!rLie){ showToast('Select result location'); return; }
  if(rLie!=='holed'&&(isNaN(dRes)||dRes<=0)){ showToast('Enter result distance'); return; }
  const sg=calcSG(lie,dFrom,rLie,isNaN(dRes)?0:dRes);
  const hd=currentHoleData(), idx=state.editingShotIndex!==null?state.editingShotIndex:hd.shots.length;
  const cat=state.shotCategory||autoCategory(lie,dFrom,idx,hd.par);
  const shot={ lie, distFrom:dFrom, resultLie:rLie, resultDist:(rLie!=='holed'&&!isNaN(dRes))?dRes:null, category:cat, sg };
  const round=currentRound();
  if(state.editingShotIndex!==null) round.holes[state.currentHole-1].shots[state.editingShotIndex]=shot;
  else round.holes[state.currentHole-1].shots.push(shot);
  updateRound(round); closeShotSheet(); renderHole(); updateTally();
  showToast(state.editingShotIndex!==null?'Shot updated':'Shot saved');
}
function deleteShot(i){
  if(!confirm('Delete this shot?')) return;
  const round=currentRound(); round.holes[state.currentHole-1].shots.splice(i,1);
  updateRound(round); renderHole(); updateTally();
}

// ═══════════════════════════════════════════════════════════════
// YARDAGE OVERRIDE
// ═══════════════════════════════════════════════════════════════
function editYardage(){ const h=currentHoleData(); document.getElementById('yardage-override-input').value=h.yardsOverride||h.yards; document.getElementById('yardage-sheet').classList.add('open'); }
function saveYardageOverride(){
  const val=parseInt(document.getElementById('yardage-override-input').value);
  if(isNaN(val)||val<=0){ showToast('Enter valid yardage'); return; }
  const round=currentRound(); round.holes[state.currentHole-1].yardsOverride=val;
  updateRound(round); document.getElementById('yardage-sheet').classList.remove('open'); renderHole(); showToast('Yardage updated');
}
function handleYardageOverlayClick(e){ if(e.target===document.getElementById('yardage-sheet')) document.getElementById('yardage-sheet').classList.remove('open'); }

// ═══════════════════════════════════════════════════════════════
// DATE EDIT
// ═══════════════════════════════════════════════════════════════
function openDateEdit(){
  const round=currentRound(); if(!round) return;
  const d=new Date(round.date);
  const yyyy=d.getFullYear(), mm=String(d.getMonth()+1).padStart(2,'0'), dd=String(d.getDate()).padStart(2,'0');
  document.getElementById('round-date-input').value=`${yyyy}-${mm}-${dd}`;
  document.getElementById('date-sheet').classList.add('open');
}
function saveRoundDate(){
  const val=document.getElementById('round-date-input').value;
  if(!val){ showToast('Select a date'); return; }
  const round=currentRound();
  round.date=val+'T12:00:00.000Z';
  updateRound(round);
  document.getElementById('date-sheet').classList.remove('open');
  document.getElementById('hole-round-date').textContent=formatDate(round.date)+' ✎';
  showToast('Date updated');
}
function handleDateOverlayClick(e){ if(e.target===document.getElementById('date-sheet')) document.getElementById('date-sheet').classList.remove('open'); }

// ═══════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════
function roundTotalSG(round,exc){
  let t=0,c=0;
  for(const hole of round.holes) for(const s of (hole.shots||[])){
    if(s.sg==null) continue; if(exc&&exc.has(s.category)) continue; t+=s.sg; c++;
  }
  return c>0?t:null;
}
function renderSummary(){
  const round=currentRound(); if(!round) return;
  const cats=['drive','approach','shortgame','putt'];
  const cNames={drive:'Drive',approach:'Approach',shortgame:'Short Game',putt:'Putt'};
  const tot={drive:0,approach:0,shortgame:0,putt:0}, cnt={drive:0,approach:0,shortgame:0,putt:0};
  let gTotal=0,gCount=0;
  for(const hole of round.holes) for(const s of (hole.shots||[])){
    if(s.sg==null) continue; tot[s.category]+=s.sg; cnt[s.category]++; gTotal+=s.sg; gCount++;
  }
  const fmt=(v,c)=>c===0?'—':(v>=0?'+':'')+v.toFixed(2);
  const col=(v,c)=>c===0?'var(--text-muted)':v>=0?'var(--q-great)':'var(--q-poor)';
  document.getElementById('summary-totals').innerHTML=`
    <div class="summary-stat"><span class="summary-stat-label" style="font-size:17px;font-weight:600;color:var(--text)">Total SG</span><span class="summary-stat-val" style="font-size:28px;color:${col(gTotal,gCount)}">${fmt(gTotal,gCount)}</span></div>
    ${cats.map(c=>`<div class="summary-stat"><span class="summary-stat-label">${cNames[c]} <span style="font-size:12px;color:var(--text-dim)">(${cnt[c]} shots)</span></span><span class="summary-stat-val" style="color:${col(tot[c],cnt[c])}">${fmt(tot[c],cnt[c])}</span></div>`).join('')}`;
  document.getElementById('summary-holes').innerHTML=round.holes.map(h=>{
    const shots=h.shots||[]; if(shots.length===0) return '';
    const hsg=shots.reduce((s,sh)=>s+(sh.sg||0),0);
    return `<div class="hole-summary-row"><div class="hsrow-hole">${h.hole}</div><div class="hsrow-par" style="font-size:12px">P${h.par}</div><div class="hsrow-shots">${shots.length} shot${shots.length!==1?'s':''}</div><div class="hsrow-sg" style="color:${hsg>=0?'var(--q-great)':'var(--q-poor)'}">${(hsg>=0?'+':'')+hsg.toFixed(2)}</div></div>`;
  }).filter(Boolean).join('')||'<div style="color:var(--text-dim);text-align:center;padding:16px;font-size:14px">No shots recorded yet</div>';
}

// ═══════════════════════════════════════════════════════════════
// CLIPBOARD — robust iOS Safari support with fallback modal
// ═══════════════════════════════════════════════════════════════
function copyToClipboard(text, msg) {
  if(navigator.clipboard&&typeof navigator.clipboard.writeText==='function'){
    navigator.clipboard.writeText(text).then(()=>showToast(msg)).catch(()=>fallbackCopy(text,msg));
  } else { fallbackCopy(text,msg); }
}
function fallbackCopy(text,msg){
  const ta=document.createElement('textarea');
  ta.value=text; ta.setAttribute('readonly','');
  ta.style.cssText='position:fixed;top:0;left:0;width:2px;height:2px;padding:0;border:none;outline:none;background:transparent;opacity:0;';
  document.body.appendChild(ta); ta.focus(); ta.select();
  if(/ipad|iphone/i.test(navigator.userAgent)){
    const range=document.createRange(); range.selectNodeContents(ta);
    const sel=window.getSelection(); sel.removeAllRanges(); sel.addRange(range); ta.setSelectionRange(0,999999);
  }
  let ok=false; try{ ok=document.execCommand('copy'); }catch(e){}
  document.body.removeChild(ta);
  if(ok) showToast(msg); else showExportModal(text);
}
function showExportModal(text){
  const ov=document.createElement('div');
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.9);z-index:300;display:flex;flex-direction:column;padding:24px;gap:12px;';
  const t=document.createElement('div'); t.style.cssText='color:#fff;font-size:16px;font-weight:600;'; t.textContent='Select all text below and copy:';
  const ta=document.createElement('textarea'); ta.value=text;
  ta.style.cssText='flex:1;background:#0d1b2a;color:#e8f4f8;border:1px solid rgba(255,255,255,.2);border-radius:8px;padding:12px;font-family:monospace;font-size:11px;resize:none;';
  const btn=document.createElement('button'); btn.textContent='Done';
  btn.style.cssText='background:#40916c;color:#fff;border:none;border-radius:12px;padding:14px;font-size:16px;font-weight:600;cursor:pointer;';
  btn.onclick=()=>document.body.removeChild(ov);
  ov.append(t,ta,btn); document.body.appendChild(ov); ta.focus(); ta.select();
}
function exportCSV(){
  const round=currentRound(); if(!round) return;
  const rows=[['Hole','Par','Yardage','Shot#','Lie','Dist From','Dist Unit','Result Lie','Result Dist','Result Unit','Category','SG']];
  for(const hole of round.holes) for(let i=0;i<(hole.shots||[]).length;i++){
    const s=hole.shots[i];
    const fu=s.lie==='green'?'ft':'yds', ru=s.resultLie==='green'?'ft':'yds';
    rows.push([hole.hole,hole.par,hole.yardsOverride||hole.yards,i+1,s.lie,s.distFrom,fu,s.resultLie,s.resultDist!=null?s.resultDist:'',s.resultLie!=='holed'?ru:'',s.category,s.sg!=null?s.sg.toFixed(4):'']);
  }
  const csv=rows.map(r=>r.map(c=>'"'+String(c).replace(/"/g,'""')+'"').join(',')).join('\r\n');
  copyToClipboard(csv,'CSV copied to clipboard!');
}
function exportSummaryCSV(){
  const round=currentRound(); if(!round) return;
  const tot={drive:0,approach:0,shortgame:0,putt:0},cnt={drive:0,approach:0,shortgame:0,putt:0}; let grand=0;
  for(const hole of round.holes) for(const s of (hole.shots||[])){
    if(s.sg==null) continue; tot[s.category]+=s.sg; cnt[s.category]++; grand+=s.sg;
  }
  const rows=[['Date','Course','Total SG','Drive SG','Drive Shots','Approach SG','Approach Shots','Short Game SG','Short Game Shots','Putt SG','Putt Shots'],
    [round.date.split('T')[0],round.courseName,grand.toFixed(4),tot.drive.toFixed(4),cnt.drive,tot.approach.toFixed(4),cnt.approach,tot.shortgame.toFixed(4),cnt.shortgame,tot.putt.toFixed(4),cnt.putt]];
  const csv=rows.map(r=>r.map(c=>'"'+String(c).replace(/"/g,'""')+'"').join(',')).join('\r\n');
  copyToClipboard(csv,'Summary CSV copied!');
}

// ═══════════════════════════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════════════════════════
let toastTimer;
function showToast(msg){ const t=document.getElementById('toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.classList.remove('show'),2400); }

// ═══════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════
(function(){ renderHome(); })();
