// ═══════════════════════════════════════════════════════════════
// HOLE SCREEN
// ═══════════════════════════════════════════════════════════════

function renderHoleScreen() {
  const round = currentRound(); if(!round) return;
  document.getElementById('hole-course-name').textContent = round.courseName;
  document.getElementById('hole-round-date').textContent = formatDate(round.date) + ' ✎';
  renderHole();
  updateTally();
}

function renderHole() {
  const round = currentRound(), h = state.currentHole, hd = round.holes[h - 1];
  document.getElementById('hole-num-display').textContent = h;
  document.getElementById('hole-par-display').textContent = 'Par ' + hd.par;
  document.getElementById('hole-yards-display').textContent = (hd.yardsOverride || hd.yards) + ' yds';
  document.getElementById('hole-prev-btn').classList.toggle('disabled', h <= 1);
  document.getElementById('hole-next-btn').classList.toggle('disabled', h >= round.holes.length);
  renderShotList(hd);
}

function renderShotList(hd) {
  const shots = hd.shots || [], el = document.getElementById('shot-list');
  if(shots.length === 0) {
    el.innerHTML = `<div class="list-empty">No shots yet — tap Add Shot below</div>`;
    return;
  }
  el.innerHTML = shots.map((s, i) => {
    const sg = s.sg, sgStr = sg != null ? (sg >= 0 ? '+' : '') + sg.toFixed(2) : '—';
    const quality = sg != null ? getQuality(sg, s.category) : null;
    const distStr = formatDist(s.distFrom, s.lie);
    const isPenalty = s.resultLie === 'penalty';
    const resLabel = s.resultLie === 'holed' ? 'Holed ⛳' : s.resultLie.charAt(0).toUpperCase() + s.resultLie.slice(1);
    const resDist = s.resultLie === 'holed' ? '' : formatDist(s.resultDist, s.resultLie);
    const missParts = [s.missDepth, s.missSide].filter(Boolean).map(v => v.charAt(0).toUpperCase() + v.slice(1));
    const missStr = missParts.length ? ` · ${missParts.join('-')}` : '';
    const driveDist = (s.category === 'drive' && s.distFrom != null && s.resultDist != null) ? Math.round(s.distFrom - s.resultDist) : null;
    const driveStr = driveDist != null ? ` · <span class="shot-drive-dist">${driveDist} yds drive</span>` : '';
    const mainResult = resDist ? `${resDist} <span class="shot-res-lie"> · ${resLabel}</span>` : `<span class="shot-res-lie">${resLabel}</span>`;
    return `<div class="shot-row" onclick="editShot(${i})">
      <div class="shot-num">${i + 1}</div>
      <div class="shot-info">
        <div class="shot-info-main"><span class="category-badge cat-${s.category}">${catLabel(s.category)}</span>  ${mainResult}${isPenalty ? ' <span class="penalty-badge">+1 stroke</span>' : ''}</div>
        <div class="shot-info-sub">${s.lie.charAt(0).toUpperCase() + s.lie.slice(1)} · ${distStr}${driveStr}${missStr}</div>
      </div>
      <div class="shot-sg"><div class="shot-sg-val" style="color:${quality ? quality.color : 'var(--text-muted)'}">${sgStr}</div>${quality ? `<div class="shot-quality-dot" style="background:${quality.color}"></div>` : ''}</div>
      <div class="shot-del" onclick="event.stopPropagation();deleteShot(${i})">×</div>
    </div>`;
  }).join('');
}

function catLabel(cat) { return CAT_LABELS[cat] || cat; }
function countStrokes(shots) { return shots.length + shots.filter(s => s.resultLie === 'penalty').length; }
function prevHole() { if(state.currentHole > 1) { state.currentHole--; renderHole(); updateTally(); } }
function nextHole() { const r = currentRound(); if(state.currentHole < r.holes.length) { state.currentHole++; renderHole(); updateTally(); } }

// ═══════════════════════════════════════════════════════════════
// TALLY
// ═══════════════════════════════════════════════════════════════

function updateTally() {
  const round = currentRound(); if(!round) return;
  const cats = ['drive', 'approach', 'shortgame', 'putt'];
  const totals = {drive:0, approach:0, shortgame:0, putt:0}, counts = {drive:0, approach:0, shortgame:0, putt:0};
  for(const hole of round.holes) for(const s of (hole.shots || [])) {
    if(s.sg == null) continue;
    if(totals[s.category] !== undefined) { totals[s.category] += s.sg; counts[s.category]++; }
  }
  let total = 0;
  cats.forEach(c => { if(!state.excludedCategories.has(c)) total += totals[c]; });
  const tc = cats.filter(c => !state.excludedCategories.has(c)).reduce((s, c) => s + counts[c], 0);
  const tvt = document.getElementById('tv-total');
  tvt.textContent = tc === 0 ? '—' : (total >= 0 ? '+' : '') + total.toFixed(1);
  tvt.className = 'tally-chip-val' + (tc > 0 && total > 0 ? ' pos' : tc > 0 && total < 0 ? ' neg' : '');
  cats.forEach(cat => {
    const v = totals[cat], c = counts[cat], ve = document.getElementById('tv-' + cat);
    ve.textContent = c === 0 ? '—' : (v >= 0 ? '+' : '') + v.toFixed(1);
    ve.className = 'tally-chip-val' + (c > 0 && v > 0 ? ' pos' : c > 0 && v < 0 ? ' neg' : '');
    document.getElementById('tally-' + cat).classList.toggle('excluded', state.excludedCategories.has(cat));
  });
}

function toggleTally(cat) {
  if(cat === 'total') return;
  if(state.excludedCategories.has(cat)) state.excludedCategories.delete(cat);
  else state.excludedCategories.add(cat);
  updateTally();
}

// ═══════════════════════════════════════════════════════════════
// YARDAGE OVERRIDE
// ═══════════════════════════════════════════════════════════════

function editYardage() {
  const h = currentHoleData();
  document.getElementById('yardage-override-input').value = h.yardsOverride || h.yards;
  document.getElementById('yardage-sheet').classList.add('open');
}

function saveYardageOverride() {
  const val = parseInt(document.getElementById('yardage-override-input').value);
  if(isNaN(val) || val <= 0) { showToast('Enter valid yardage'); return; }
  const round = currentRound();
  round.holes[state.currentHole - 1].yardsOverride = val;
  updateRound(round);
  document.getElementById('yardage-sheet').classList.remove('open');
  renderHole();
  showToast('Yardage updated');
}

function handleYardageOverlayClick(e) {
  if(e.target === document.getElementById('yardage-sheet')) document.getElementById('yardage-sheet').classList.remove('open');
}

// ═══════════════════════════════════════════════════════════════
// ROUND EDIT
// ═══════════════════════════════════════════════════════════════

function openRoundEdit() {
  const round = currentRound(); if(!round) return;
  document.getElementById('round-edit-name').value = round.courseName;
  const d = new Date(round.date);
  const yyyy = d.getFullYear(), mm = String(d.getMonth() + 1).padStart(2, '0'), dd = String(d.getDate()).padStart(2, '0');
  document.getElementById('round-edit-date').value = `${yyyy}-${mm}-${dd}`;
  document.getElementById('round-edit-sheet').classList.add('open');
}

function saveRoundEdit() {
  const name = document.getElementById('round-edit-name').value.trim();
  const date = document.getElementById('round-edit-date').value;
  if(!name) { showToast('Enter a course name'); return; }
  if(!date) { showToast('Select a date'); return; }
  const round = currentRound();
  round.courseName = name;
  round.date = date + 'T12:00:00.000Z';
  updateRound(round);
  document.getElementById('round-edit-sheet').classList.remove('open');
  document.getElementById('hole-course-name').textContent = name;
  document.getElementById('hole-round-date').textContent = formatDate(round.date) + ' ✎';
  showToast('Round updated');
}

function handleRoundEditOverlayClick(e) {
  if(e.target === document.getElementById('round-edit-sheet')) document.getElementById('round-edit-sheet').classList.remove('open');
}
