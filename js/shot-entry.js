// ═══════════════════════════════════════════════════════════════
// SHOT SHEET
// ═══════════════════════════════════════════════════════════════

function openShotSheet(editIndex) {
  state.editingShotIndex = editIndex !== undefined ? editIndex : null;
  state.shotLie = null; state.shotResultLie = null; state.shotCategory = null; state.shotMissDepth = null; state.shotMissSide = null;
  document.getElementById('shot-sheet-title').textContent = editIndex !== undefined ? 'Edit Shot' : 'Add Shot';
  document.getElementById('shot-dist-from').value = '';
  document.getElementById('shot-dist-result').value = '';
  document.getElementById('result-dist-group').classList.add('hidden');
  document.getElementById('miss-dir-group').classList.add('hidden');
  document.getElementById('category-pills-expand').classList.add('hidden');
  document.getElementById('lie-pills-expand').classList.add('hidden');
  document.getElementById('dist-from-expand').classList.add('hidden');
  renderCategoryChip(null);
  renderLieChip(null);
  renderDistChip('', 'yds');
  document.querySelectorAll('#lie-pills .pill,#lie-pills-secondary .pill,#result-lie-pills .pill,#result-lie-pills-secondary .pill,#category-pills .pill').forEach(p => p.classList.remove('selected'));

  const hd = currentHoleData();
  if(editIndex !== undefined) {
    const s = hd.shots[editIndex];
    selectLie(s.lie, true);
    document.getElementById('shot-dist-from').value = s.distFrom;
    selectResultLie(s.resultLie, true);
    if(s.resultDist != null) document.getElementById('shot-dist-result').value = s.resultDist;
    selectCategory(s.category, true);
    if(s.missDepth) state.shotMissDepth = s.missDepth;
    if(s.missSide) state.shotMissSide = s.missSide;
  } else {
    const sug = getSuggestion(hd);
    if(sug) {
      if(sug.lie) selectLie(sug.lie, true);
      if(sug.dist !== '') document.getElementById('shot-dist-from').value = sug.dist;
      const idx = hd.shots.length;
      if(sug.lie) selectCategory(autoCategory(sug.lie, sug.dist || 0, idx, hd.par), true);
    }
  }
  updateDistFromUnit(); updateResultDistVisibility(); updateSGPreview();
  document.getElementById('shot-sheet').classList.add('open');
}

function editShot(i) { openShotSheet(i); }
function closeShotSheet() { document.getElementById('shot-sheet').classList.remove('open'); }
function handleSheetOverlayClick(e) { if(e.target === document.getElementById('shot-sheet')) closeShotSheet(); }

function selectLie(lie, silent) {
  state.shotLie = lie;
  document.querySelectorAll('#lie-pills .pill,#lie-pills-secondary .pill').forEach(p => p.classList.toggle('selected', p.textContent.trim().toLowerCase() === lie));
  renderLieChip(lie);
  updateDistFromUnit();
  if(lie === 'green' && !state.shotResultLie) selectResultLie('green', true);
  if(!silent) {
    const exp = document.getElementById('lie-pills-expand'); if(exp) exp.classList.add('hidden');
    autoSetCategory(); updateSGPreview();
  }
}

function renderLieChip(lie) {
  const el = document.getElementById('lie-chip'); if(!el) return;
  const labels = {tee:'Tee', fairway:'Fairway', rough:'Rough', green:'Green', sand:'Sand', recovery:'Recovery'};
  el.textContent = labels[lie] || '—';
  el.className = lie ? 'lie-chip' : '';
}

function toggleLieOverride() {
  const exp = document.getElementById('lie-pills-expand'); if(!exp) return;
  exp.classList.toggle('hidden');
}

function updateDistFromUnit() {
  const green = state.shotLie === 'green';
  const unit = green ? 'ft' : 'yds';
  document.getElementById('dist-from-unit').textContent = unit;
  document.getElementById('dist-from-unit-label').textContent = green ? '(feet)' : '(yards)';
  const val = document.getElementById('shot-dist-from').value;
  renderDistChip(val, unit);
}

function selectResultLie(lie, silent) {
  state.shotResultLie = lie;
  document.querySelectorAll('#result-lie-pills .pill,#result-lie-pills-secondary .pill').forEach(p => {
    const t = p.textContent.toLowerCase().replace(/[^a-z]/g, '');
    p.classList.toggle('selected', t === lie || (lie === 'holed' && t === 'holed'));
  });
  updateResultDistVisibility();
  const missGroup = document.getElementById('miss-dir-group');
  if(lie === 'holed') {
    missGroup.classList.add('hidden');
    state.shotMissDepth = null; state.shotMissSide = null;
  } else {
    missGroup.classList.remove('hidden');
  }
  if(!silent) { autoSetCategory(); updateSGPreview(); }
  if(!silent && lie !== 'holed') {
    setTimeout(() => {
      const el = document.getElementById('shot-dist-result');
      el.focus();
      const btn_el = document.getElementById('save-shot-btn');
      btn_el.scrollIntoView({behavior:'smooth', block:'end', container:'all'});
    }, 200);
  }
}

function updateResultDistVisibility() {
  const show = state.shotResultLie && state.shotResultLie !== 'holed';
  document.getElementById('result-dist-group').classList.toggle('hidden', !show);
  if(show) {
    const green = state.shotResultLie === 'green';
    document.getElementById('dist-result-unit').textContent = green ? 'ft' : 'yds';
    document.getElementById('result-dist-unit-label').textContent = green ? '(feet)' : '(yards)';
  }
}

function selectCategory(cat, silent) {
  state.shotCategory = cat;
  const map = {'Drive':'drive', 'Approach':'approach', 'Short Game':'shortgame', 'Putt':'putt'};
  document.querySelectorAll('#category-pills .pill').forEach(p => p.classList.toggle('selected', map[p.textContent.trim()] === cat));
  renderCategoryChip(cat);
  updateMissGrid(cat);
  if(!silent) {
    const exp = document.getElementById('category-pills-expand'); if(exp) exp.classList.add('hidden');
  }
}

function renderCategoryChip(cat) {
  const el = document.getElementById('category-chip'); if(!el) return;
  el.textContent = CAT_LABELS[cat] || '—';
  el.className = cat ? `category-badge cat-${cat}` : '';
}

function toggleCategoryOverride() {
  const exp = document.getElementById('category-pills-expand'); if(!exp) return;
  exp.classList.toggle('hidden');
}

function renderDistChip(val, unit) {
  const el = document.getElementById('dist-chip'); if(!el) return;
  el.textContent = val ? `${val} ${unit}` : '—';
}

function toggleDistOverride() {
  const exp = document.getElementById('dist-from-expand'); if(!exp) return;
  const opening = exp.classList.contains('hidden');
  exp.classList.toggle('hidden');
  if(opening) setTimeout(() => document.getElementById('shot-dist-from').focus(), 50);
}

function onDistInput() {
  const val = document.getElementById('shot-dist-from').value;
  const unit = state.shotLie === 'green' ? 'ft' : 'yds';
  renderDistChip(val, unit);
  onShotFormChange();
}

function updateMissGrid(cat) {
  const sides = cat === 'putt'
    ? [['low','Low'], ['center','Center'], ['high','High']]
    : [['left','Left'], ['middle','Middle'], ['right','Right']];
  const container = document.getElementById('miss-grid'); if(!container) return;
  if(state.shotMissSide && !sides.some(([v]) => v === state.shotMissSide)) state.shotMissSide = null;
  const depthLabels = {long:'Long', even:'', short:'Short'};
  container.innerHTML = ['long','even','short'].map(dv =>
    sides.map(([sv, sl]) => {
      const sel = state.shotMissDepth === dv && state.shotMissSide === sv;
      return `<div class="miss-grid-cell${sel ? ' selected' : ''}" onclick="selectMissCombo('${dv}','${sv}')"><span class="miss-cell-depth">${depthLabels[dv]}</span>${sl}</div>`;
    }).join('')
  ).join('');
}

function selectMissCombo(depth, side) {
  if(state.shotMissDepth === depth && state.shotMissSide === side) {
    state.shotMissDepth = null; state.shotMissSide = null;
  } else {
    state.shotMissDepth = depth; state.shotMissSide = side;
  }
  updateMissGrid(state.shotCategory);
}

function selectMissDepth(val, silent) {
  if(!silent && state.shotMissDepth === val) state.shotMissDepth = null;
  else state.shotMissDepth = val;
  updateMissGrid(state.shotCategory);
}

function selectMissSide(val, silent) {
  if(!silent && state.shotMissSide === val) state.shotMissSide = null;
  else state.shotMissSide = val;
  updateMissGrid(state.shotCategory);
}

function autoSetCategory() {
  if(!state.shotLie) return;
  const dist = parseFloat(document.getElementById('shot-dist-from').value) || 0;
  const hd = currentHoleData(), idx = state.editingShotIndex !== null ? state.editingShotIndex : (hd.shots || []).length;
  selectCategory(autoCategory(state.shotLie, dist, idx, hd.par), true);
}

function onShotFormChange() { autoSetCategory(); updateSGPreview(); }

function updateSGPreview() {
  const lie = state.shotLie, rLie = state.shotResultLie;
  const dFrom = parseFloat(document.getElementById('shot-dist-from').value);
  const dRes = parseFloat(document.getElementById('shot-dist-result').value);
  const pv = document.getElementById('sg-preview-val'), pl = document.getElementById('sg-preview-label'), mk = document.getElementById('sg-quality-marker');
  if(!lie || !rLie || isNaN(dFrom)) { pv.textContent = '—'; pv.style.color = 'var(--text-muted)'; pl.textContent = 'Enter shot details for SG'; mk.style.left = '50%'; return; }
  const sg = calcSG(lie, dFrom, rLie, isNaN(dRes) ? 0 : dRes);
  if(sg === null) { pv.textContent = '—'; pv.style.color = 'var(--text-muted)'; pl.textContent = 'Distance out of range'; mk.style.left = '50%'; return; }
  const q = getQuality(sg, state.shotCategory || 'approach');
  pv.textContent = (sg >= 0 ? '+' : '') + sg.toFixed(2); pv.style.color = q.color; pl.textContent = q.label;
  mk.style.left = Math.max(0, Math.min(100, ((sg + 1.5) / 3.0) * 100)) + '%';
}

function saveShot() {
  const lie = state.shotLie, rLie = state.shotResultLie;
  const dFrom = parseFloat(document.getElementById('shot-dist-from').value);
  const dRes = parseFloat(document.getElementById('shot-dist-result').value);
  if(!lie) { showToast('Select a starting lie'); return; }
  if(isNaN(dFrom) || dFrom <= 0) { showToast('Enter distance from pin'); return; }
  if(!rLie) { showToast('Select result location'); return; }
  if(rLie !== 'holed' && (isNaN(dRes) || dRes <= 0)) { showToast('Enter result distance'); return; }
  const sgRaw = calcSG(lie, dFrom, rLie, isNaN(dRes) ? 0 : dRes);
  const sg = sgRaw !== null ? Math.round(sgRaw * 10000) / 10000 : null;
  const hd = currentHoleData(), idx = state.editingShotIndex !== null ? state.editingShotIndex : hd.shots.length;
  const cat = state.shotCategory || autoCategory(lie, dFrom, idx, hd.par);
  const shot = { lie, distFrom:dFrom, resultLie:rLie, resultDist:(rLie !== 'holed' && !isNaN(dRes)) ? dRes : null, category:cat, sg, missDepth:state.shotMissDepth || null, missSide:state.shotMissSide || null };
  const round = currentRound();
  if(state.editingShotIndex !== null) round.holes[state.currentHole - 1].shots[state.editingShotIndex] = shot;
  else round.holes[state.currentHole - 1].shots.push(shot);
  updateRound(round); closeShotSheet(); renderHole(); updateTally();
  showToast(state.editingShotIndex !== null ? 'Shot updated' : 'Shot saved');
}

function deleteShot(i) {
  if(!confirm('Delete this shot?')) return;
  const round = currentRound();
  round.holes[state.currentHole - 1].shots.splice(i, 1);
  updateRound(round); renderHole(); updateTally();
}
