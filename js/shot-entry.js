// ═══════════════════════════════════════════════════════════════
// SHOT SHEET
// ═══════════════════════════════════════════════════════════════

function openShotSheet(editIndex) {
  state.editingShotIndex = editIndex !== undefined ? editIndex : null;
  state.shotLie = null; state.shotResultLie = null; state.shotCategory = null; state.shotMissDepth = null; state.shotMissSide = null; state.shotMissType = null; state.shotClub = null; state.targetsExpanded = false;
  document.getElementById('sg-targets-toggle').classList.add('hidden');
  document.getElementById('sg-targets-toggle').textContent = 'What If? ›';
  document.getElementById('sg-targets-expand').classList.add('hidden');
  document.getElementById('shot-sheet-title').textContent = editIndex !== undefined ? 'Edit Shot' : 'Add Shot';
  document.getElementById('shot-dist-from').value = '';
  document.getElementById('shot-dist-result').value = '';
  document.getElementById('result-dist-group').classList.add('hidden');
  document.getElementById('miss-dir-group').classList.add('hidden');
  document.getElementById('shot-meta-expand').classList.add('hidden');
  document.getElementById('shot-meta-chevron-hint').textContent = 'expand ›';
  document.getElementById('category-pills-expand').classList.add('hidden');
  document.getElementById('club-pills-expand').classList.add('hidden');
  document.getElementById('club-group').classList.add('hidden');
  document.getElementById('lie-pills-expand').classList.add('hidden');
  document.getElementById('dist-from-expand').classList.add('hidden');
  renderClubChip(null);
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
    if(s.missDepth) state.shotMissDepth = s.missDepth;
    if(s.missSide) state.shotMissSide = s.missSide;
    if(s.missType) state.shotMissType = s.missType;
    selectCategory(s.category, true);
    if(s.club) selectClub(s.club, true);
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
  renderShotMetaSummary();
  const anyMissing = !state.shotLie || !state.shotCategory || !document.getElementById('shot-dist-from').value;
  document.getElementById('shot-meta-expand').classList.toggle('hidden', !anyMissing);
  document.getElementById('shot-meta-chevron-hint').textContent = anyMissing ? '∨' : 'expand ›';
  document.getElementById('shot-meta-label').classList.toggle('hidden', anyMissing);
  if(anyMissing) {
    if(!state.shotCategory) document.getElementById('category-pills-expand').classList.remove('hidden');
    if(!state.shotLie) document.getElementById('lie-pills-expand').classList.remove('hidden');
    if(!document.getElementById('shot-dist-from').value) document.getElementById('dist-from-expand').classList.remove('hidden');
  }
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
  renderShotMetaSummary();
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
    const expanded = getMissAutoExpand();
    document.getElementById('miss-dir-expand').classList.toggle('hidden', !expanded);
    document.getElementById('miss-dir-hint').textContent = expanded ? '∨' : 'expand ›';
  }
  updateMissTypeVisibility();
  if(!silent) { autoSetCategory(); updateSGPreview(); }
  if(!silent && lie !== 'holed') {
    setTimeout(() => document.getElementById('shot-dist-result').focus(), 150);
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
  renderShotMetaSummary();
  updateMissGrid(cat);
  updateMissTypeVisibility();
  updateClubGroup(cat);
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
  renderShotMetaSummary();
  onShotFormChange();
}

function toggleMissDirExpand() {
  const exp = document.getElementById('miss-dir-expand');
  const hint = document.getElementById('miss-dir-hint');
  const closing = !exp.classList.contains('hidden');
  exp.classList.toggle('hidden');
  hint.textContent = closing ? 'expand ›' : '∨';
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

function updateMissTypeVisibility() {
  const show = state.shotCategory === 'putt' && state.shotResultLie && state.shotResultLie !== 'holed';
  const group = document.getElementById('miss-type-group'); if(!group) return;
  group.classList.toggle('hidden', !show);
  if(!show) {
    state.shotMissType = null;
    document.querySelectorAll('#miss-type-pills .pill').forEach(p => p.classList.remove('selected'));
  } else {
    document.querySelectorAll('#miss-type-pills .pill').forEach(p =>
      p.classList.toggle('selected', p.dataset.missType === state.shotMissType)
    );
  }
}

function updateClubGroup(cat) {
  const group = document.getElementById('club-group'); if(!group) return;
  if(!cat || cat === 'putt') {
    group.classList.add('hidden');
    state.shotClub = null;
    renderClubChip(null);
    return;
  }
  group.classList.remove('hidden');
  const active = getActiveClubs();
  const filtered = CLUBS.filter(c => c.cats.includes(cat) && active.has(c.id));
  document.getElementById('club-pills').innerHTML = filtered.map(c =>
    `<div class="pill pill-sm${state.shotClub === c.id ? ' selected' : ''}" data-club="${c.id}" onclick="selectClub('${c.id}')">${c.label}</div>`
  ).join('');
  if(getClubAutoExpand()) document.getElementById('club-pills-expand').classList.remove('hidden');
}

function selectClub(id, silent) {
  state.shotClub = state.shotClub === id ? null : id;
  document.querySelectorAll('#club-pills .pill').forEach(p =>
    p.classList.toggle('selected', p.dataset.club === state.shotClub)
  );
  renderClubChip(state.shotClub);
  if(!silent) document.getElementById('club-pills-expand').classList.add('hidden');
}

function renderClubChip(club) {
  const el = document.getElementById('club-chip'); if(!el) return;
  const c = CLUBS.find(x => x.id === club);
  el.textContent = c ? c.label : '—';
  el.className = club ? 'lie-chip' : '';
}

function toggleClubOverride() {
  const exp = document.getElementById('club-pills-expand'); if(!exp) return;
  exp.classList.toggle('hidden');
}

function selectMissType(val) {
  state.shotMissType = state.shotMissType === val ? null : val;
  document.querySelectorAll('#miss-type-pills .pill').forEach(p =>
    p.classList.toggle('selected', p.dataset.missType === state.shotMissType)
  );
}

function renderShotMetaSummary() {
  const el = document.getElementById('shot-meta-text'); if(!el) return;
  const catHtml = state.shotCategory
    ? `<span class="category-badge cat-${state.shotCategory}">${CAT_LABELS[state.shotCategory]}</span>`
    : '<span style="color:var(--text-dim)">—</span>';
  const lieNames = {tee:'Tee', fairway:'Fairway', rough:'Rough', green:'Green', sand:'Sand', recovery:'Recovery'};
  const lieHtml = state.shotLie
    ? `<span class="lie-chip">${lieNames[state.shotLie] || state.shotLie}</span>`
    : '<span style="color:var(--text-dim)">—</span>';
  const distVal = document.getElementById('shot-dist-from').value;
  const unit = state.shotLie === 'green' ? 'ft' : 'yds';
  const distLabel = distVal ? `${distVal} ${unit}` : '—';
  const sep = `<span class="shot-meta-sep"> · </span>`;
  el.innerHTML = `${catHtml}${sep}${lieHtml}${sep}${distLabel}`;
}

function toggleShotMetaExpand() {
  const exp = document.getElementById('shot-meta-expand');
  const ch = document.getElementById('shot-meta-chevron-hint');
  const closing = !exp.classList.contains('hidden');
  exp.classList.toggle('hidden');
  ch.textContent = closing ? 'expand ›' : '∨';
  document.getElementById('shot-meta-label').classList.toggle('hidden', !closing);
  if(closing) {
    document.getElementById('category-pills-expand').classList.add('hidden');
    document.getElementById('lie-pills-expand').classList.add('hidden');
    document.getElementById('dist-from-expand').classList.add('hidden');
  }
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
  const toggle = document.getElementById('sg-targets-toggle'), expand = document.getElementById('sg-targets-expand');

  const hasStart = lie && !isNaN(dFrom) && dFrom > 0;
  toggle.classList.toggle('hidden', !hasStart);
  if(state.targetsExpanded) updateTargets();

  if(!lie || !rLie || isNaN(dFrom)) { pv.textContent = '—'; pv.style.color = 'var(--text-muted)'; pl.textContent = 'Enter shot details for SG'; mk.style.left = '50%'; return; }
  const sg = calcSG(lie, dFrom, rLie, isNaN(dRes) ? 0 : dRes);
  if(sg === null) { pv.textContent = '—'; pv.style.color = 'var(--text-muted)'; pl.textContent = 'Distance out of range'; mk.style.left = '50%'; return; }
  const q = getQuality(sg, state.shotCategory || 'approach');
  pv.textContent = (sg >= 0 ? '+' : '') + sg.toFixed(2); pv.style.color = q.color; pl.textContent = q.label;
  mk.style.left = Math.max(0, Math.min(100, ((sg + 1.5) / 3.0) * 100)) + '%';
}

function findResultDist(targetExpected, resultLie) {
  const lo0 = resultLie === 'fairway' ? 10 : 1;
  const hi0 = resultLie === 'fairway' ? 400 : 120;
  if(targetExpected === null || targetExpected <= getExpected(resultLie, lo0)) return null;
  let lo = lo0, hi = hi0;
  for(let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if(getExpected(resultLie, mid) < targetExpected) lo = mid; else hi = mid;
  }
  return Math.round((lo + hi) / 2);
}

function toggleTargets() {
  state.targetsExpanded = !state.targetsExpanded;
  const expand = document.getElementById('sg-targets-expand');
  const toggle = document.getElementById('sg-targets-toggle');
  expand.classList.toggle('hidden', !state.targetsExpanded);
  toggle.textContent = state.targetsExpanded ? 'What If? ∨' : 'What If? ›';
  if(state.targetsExpanded) updateTargets();
}

function updateTargets() {
  const neutralEl = document.getElementById('sg-target-neutral');
  const goodEl = document.getElementById('sg-target-good');
  if(!neutralEl || !goodEl) return;
  const lie = state.shotLie;
  const dist = parseFloat(document.getElementById('shot-dist-from').value);
  if(!lie || isNaN(dist) || dist <= 0) { neutralEl.textContent = '—'; goodEl.textContent = '—'; return; }
  const startExpected = getExpected(lie, dist);
  if(startExpected === null) { neutralEl.textContent = '—'; goodEl.textContent = '—'; return; }
  // If neutral target on green > 50 ft or out of range, the shot isn't realistically going for the green
  const neutralGreen = findResultDist(startExpected - 1, 'green');
  const useFairway = neutralGreen === null || neutralGreen > 50;
  const resultLie = useFairway ? 'fairway' : 'green';
  const fmt = d => {
    if(d === null) return useFairway ? '—' : 'Hole out';
    return useFairway ? `≤ ${d} yds remaining` : `≤ ${d} ft on green`;
  };
  neutralEl.textContent = fmt(useFairway ? findResultDist(startExpected - 1, 'fairway') : neutralGreen);
  goodEl.textContent    = fmt(findResultDist(startExpected - 1.25, resultLie));
}

function saveShot() {
  const lie = state.shotLie, rLie = state.shotResultLie;
  const dFrom = parseFloat(document.getElementById('shot-dist-from').value);
  const dRes = parseFloat(document.getElementById('shot-dist-result').value);
  if(!lie) { showToast('Select a starting lie'); return; }
  if(isNaN(dFrom) || dFrom <= 0) { showToast('Enter distance from pin'); return; }
  if(!rLie) { showToast('Select result location'); return; }
  if(rLie !== 'holed' && (isNaN(dRes) || dRes <= 0)) { showToast('Enter result distance'); return; }
  const hd = currentHoleData(), idx = state.editingShotIndex !== null ? state.editingShotIndex : hd.shots.length;
  const cat = state.shotCategory || autoCategory(lie, dFrom, idx, hd.par);
  const round = currentRound();
  const pct = getRoundDifficultyPct(round.conditions, cat);
  const sgRaw = calcSG(lie, dFrom, rLie, isNaN(dRes) ? 0 : dRes, pct);
  const sg = sgRaw !== null ? Math.round(sgRaw * 10000) / 10000 : null;
  const missType = (cat === 'putt' && rLie !== 'holed') ? (state.shotMissType || null) : null;
  const shot = { lie, distFrom:dFrom, resultLie:rLie, resultDist:(rLie !== 'holed' && !isNaN(dRes)) ? dRes : null, category:cat, sg, club:state.shotClub || null, missDepth:state.shotMissDepth || null, missSide:state.shotMissSide || null, missType };
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
