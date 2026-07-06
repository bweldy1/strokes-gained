// ═══════════════════════════════════════════════════════════════
// HOLE SCREEN
// ═══════════════════════════════════════════════════════════════

function getGreenImageFolder(course) {
  if(!course) return null;
  return course.greenImageFolder || (course.name === 'Wild Wood Golf Club' ? 'wildwood' : null);
}

function renderHoleScreen() {
  const round = currentRound(); if(!round) return;
  document.getElementById('hole-course-name').textContent = round.courseName;
  document.getElementById('hole-round-date').textContent = formatDate(round.date) + ' ✎';
  const course = getCourses().find(c => c.id === round.courseId);
  document.getElementById('green-img-btn').classList.toggle('hidden', !getGreenImageFolder(course));
  document.getElementById('yardages-btn').classList.toggle('hidden', getYardages().length === 0);
  renderHole();
  updateTally();
}

function openGreenImage() {
  const round = currentRound(); if(!round) return;
  const course = getCourses().find(c => c.id === round.courseId);
  const folder = getGreenImageFolder(course);
  if(!folder) return;
  const img = document.getElementById('green-img');
  const err = document.getElementById('green-img-error');
  img.classList.remove('hidden');
  err.classList.add('hidden');
  img.onerror = () => { img.classList.add('hidden'); err.classList.remove('hidden'); };
  img.src = `images/greens/${folder}/hole-${state.currentHole}.png`;
  document.getElementById('green-img-overlay').classList.remove('hidden');
}

function closeGreenImage() {
  document.getElementById('green-img-overlay').classList.add('hidden');
}

function renderHole() {
  const round = currentRound(), h = state.currentHole, hd = round.holes[h - 1];
  document.getElementById('hole-num-display').textContent = h;
  document.getElementById('hole-par-display').textContent = 'Par ' + hd.par;
  document.getElementById('hole-yards-display').textContent = (hd.yardsOverride || hd.yards) + ' yds';
  renderShotList(hd);
}

function renderShotList(hd) {
  const shots = hd.shots || [], el = document.getElementById('shot-list');
  const last = shots[shots.length - 1];
  const isHoled = !!(last && last.resultLie === 'holed');
  const showPrompt = !isHoled && last && last.resultLie === 'green' && last.resultDist != null && last.resultDist <= getHoleOutDist();
  const prompt = document.getElementById('hole-out-prompt');
  prompt.classList.toggle('hidden', !showPrompt);
  if(showPrompt) document.getElementById('hole-out-dist').textContent = last.resultDist;
  document.getElementById('add-shot-btn').classList.toggle('hidden', isHoled);
  document.getElementById('next-hole-btn').classList.toggle('hidden', !isHoled);
  if(shots.length === 0) {
    el.innerHTML = `<div class="list-empty">No shots yet — tap Add Shot below</div>`;
    return;
  }
  el.innerHTML = shots.map((s, i) => {
    if(s.untrackedCount != null) {
      return `<div class="shot-row" onclick="editShot(${i})">
        <div class="shot-num">${i + 1}</div>
        <div class="shot-info">
          <div class="shot-info-main">+${s.untrackedCount} stroke${s.untrackedCount !== 1 ? 's' : ''} <span class="shot-res-lie">· untracked</span></div>
        </div>
        <div class="shot-sg"><div class="shot-sg-val" style="color:var(--text-muted)">—</div></div>
        <div class="shot-del" onclick="event.stopPropagation();deleteShot(${i})">×</div>
      </div>`;
    }
    const sg = s.sg, sgStr = sg != null ? (sg >= 0 ? '+' : '') + sg.toFixed(2) : '—';
    const sgColor = sg != null ? getQuality(sg, s.category).color : 'var(--text-muted)';
    const distStr = formatDist(s.distFrom, s.lie);
    const isPenalty = s.resultLie === 'penalty' || s.resultLie === 'ob';
    const resLabel = s.resultLie === 'holed' ? 'Holed ⛳' : s.resultLie === 'ob' ? 'OB' : s.resultLie.charAt(0).toUpperCase() + s.resultLie.slice(1);
    const resDist = (s.resultLie === 'holed' || s.resultLie === 'ob') ? '' : formatDist(s.resultDist, s.resultLie);
    const missParts = [s.missDepth === 'even' ? null : s.missDepth, s.missSide].filter(Boolean).map(v => v.charAt(0).toUpperCase() + v.slice(1));
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
      <div class="shot-sg"><div class="shot-sg-val" style="color:${sgColor}">${sgStr}</div></div>
      <div class="shot-del" onclick="event.stopPropagation();deleteShot(${i})">×</div>
    </div>`;
  }).join('');
}

function holeOut() {
  const round = currentRound();
  const hd = round.holes[state.currentHole - 1];
  const last = hd.shots[hd.shots.length - 1];
  if(!last || last.resultLie !== 'green' || last.resultDist > getHoleOutDist()) return;
  const dist = last.resultDist;
  const pct = getRoundDifficultyPct(round.conditions, 'putt');
  const rawSg = calcSG('green', dist, 'holed', null, pct);
  hd.shots.push({
    lie: 'green', distFrom: dist, resultLie: 'holed', resultDist: null,
    category: 'putt', sg: rawSg != null ? Math.round(rawSg * 10000) / 10000 : null,
    missDepth: null, missSide: null, missType: null
  });
  updateRound(round);
  renderHole();
  updateTally();
  showToast('Holed out ⛳');
}

function catLabel(cat) { return CAT_LABELS[cat] || cat; }
function countStrokes(shots) { return shots.reduce((sum, s) => sum + (s.untrackedCount || 1) + (s.resultLie === 'penalty' || s.resultLie === 'ob' ? 1 : 0), 0); }
function prevHole() { const r = currentRound(); state.currentHole = state.currentHole > 1 ? state.currentHole - 1 : r.holes.length; closeHolePicker(); renderHole(); updateTally(); }
function nextHole() { const r = currentRound(); state.currentHole = state.currentHole < r.holes.length ? state.currentHole + 1 : 1; closeHolePicker(); renderHole(); updateTally(); }

function toggleHolePicker() {
  const picker = document.getElementById('hole-picker');
  if(picker.classList.contains('hidden')) openHolePicker(); else closeHolePicker();
}
function openHolePicker() {
  const round = currentRound(); if(!round) return;
  const picker = document.getElementById('hole-picker');
  picker.innerHTML = round.holes.map(h =>
    `<div class="hole-pick-btn${h.hole === state.currentHole ? ' selected' : ''}" onclick="goToHole(${h.hole})">${h.hole}</div>`
  ).join('');
  picker.classList.remove('hidden');
}
function closeHolePicker() { document.getElementById('hole-picker').classList.add('hidden'); }
function goToHole(n) { state.currentHole = n; closeHolePicker(); renderHole(); updateTally(); }

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
  const selected = new Set(round.conditions || []);
  document.getElementById('round-conditions-pills').innerHTML = DIFFICULTY_CONDITIONS.map(c =>
    `<button class="pill pill-sm${selected.has(c.id) ? ' selected' : ''}" data-id="${c.id}" onclick="toggleCondition('${c.id}')">${c.label}</button>`
  ).join('');
  document.getElementById('round-edit-notes').value = round.notes || '';
  document.getElementById('round-edit-sheet').classList.add('open');
}

function saveRoundEdit() {
  const name = document.getElementById('round-edit-name').value.trim();
  const date = document.getElementById('round-edit-date').value;
  if(!name) { showToast('Enter a course name'); return; }
  if(!date) { showToast('Select a date'); return; }
  const round = currentRound();
  const newConditions = [...document.querySelectorAll('#round-conditions-pills .pill.selected')].map(p => p.dataset.id);
  const conditionsChanged = JSON.stringify(round.conditions || []) !== JSON.stringify(newConditions);
  round.courseName = name;
  round.date = date + 'T12:00:00.000Z';
  round.conditions = newConditions;
  round.notes = document.getElementById('round-edit-notes').value.trim();
  if(conditionsChanged) recalcRoundShots(round);
  updateRound(round);
  document.getElementById('round-edit-sheet').classList.remove('open');
  document.getElementById('hole-course-name').textContent = name;
  document.getElementById('hole-round-date').textContent = formatDate(round.date) + ' ✎';
  showToast('Round updated');
}

function handleRoundEditOverlayClick(e) {
  if(e.target === document.getElementById('round-edit-sheet')) document.getElementById('round-edit-sheet').classList.remove('open');
}

function toggleCondition(id) {
  const pill = document.querySelector(`#round-conditions-pills [data-id="${id}"]`);
  if(pill) pill.classList.toggle('selected');
}

function recalcRoundShots(round) {
  for(const hole of round.holes) {
    for(const s of (hole.shots || [])) {
      if(!s.lie || !s.resultLie) continue;
      const pct = getRoundDifficultyPct(round.conditions, s.category);
      const raw = calcSG(s.lie, s.distFrom, s.resultLie, s.resultDist, pct);
      s.sg = raw !== null ? Math.round(raw * 10000) / 10000 : null;
    }
  }
}
