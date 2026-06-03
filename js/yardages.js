// ═══════════════════════════════════════════════════════════════
// YARDAGES SCREEN
// ═══════════════════════════════════════════════════════════════

let _editingYrdId = null;

function renderYardagesScreen() {
  renderYardagesList();
  renderYrdFormClubPills();
  cancelYardageEdit();
}

function renderYardagesList() {
  const yardages = getYardages();
  const el = document.getElementById('yardages-list');
  if(!el) return;
  if(yardages.length === 0) {
    el.innerHTML = `<div class="list-empty">No yardages yet — add one below</div>`;
    return;
  }
  const sorted = [...yardages].sort((a, b) => (a.total ?? a.carry ?? 0) - (b.total ?? b.carry ?? 0));
  el.innerHTML = sorted.map(y => {
    const club = CLUBS.find(c => c.id === y.clubId);
    const clubBadge = club ? `<span class="yrd-club-badge">${club.label}</span>` : '';
    const parts = [];
    if(y.carry != null) parts.push(`${y.carry} carry`);
    if(y.total != null) parts.push(`${y.total} total`);
    return `<div class="yrd-row" onclick="openYardageEdit('${y.id}')">
      <div class="yrd-row-left">
        ${clubBadge}
        <span class="yrd-row-label">${y.label || '—'}</span>
      </div>
      <div class="yrd-row-dist">${parts.join(' · ')}</div>
    </div>`;
  }).join('');
}

function renderYrdFormClubPills() {
  const active = getActiveClubs();
  const pills = document.getElementById('yrd-club-pills');
  if(!pills) return;
  pills.innerHTML = CLUBS.filter(c => active.has(c.id)).map(c =>
    `<button class="pill pill-sm yrd-club-pill" data-club="${c.id}" onclick="selectYrdFormClub('${c.id}')">${c.label}</button>`
  ).join('');
}

function selectYrdFormClub(id) {
  const pills = document.querySelectorAll('#yrd-club-pills .yrd-club-pill');
  const isSelected = [...pills].some(p => p.dataset.club === id && p.classList.contains('selected'));
  pills.forEach(p => p.classList.toggle('selected', !isSelected && p.dataset.club === id));
}

function openYardageEdit(id) {
  _editingYrdId = id;
  document.querySelectorAll('#yrd-club-pills .yrd-club-pill').forEach(p => p.classList.remove('selected'));
  document.getElementById('yrd-label-input').value = '';
  document.getElementById('yrd-carry-input').value = '';
  document.getElementById('yrd-total-input').value = '';

  const title = document.getElementById('yardages-form-title');
  const delBtn = document.getElementById('yrd-delete-btn');
  if(!id) {
    title.textContent = 'Add Yardage';
    delBtn.classList.add('hidden');
  } else {
    const y = getYardages().find(y => y.id === id);
    if(!y) return;
    title.textContent = 'Edit Yardage';
    delBtn.classList.remove('hidden');
    if(y.clubId) {
      const pill = document.querySelector(`#yrd-club-pills .yrd-club-pill[data-club="${y.clubId}"]`);
      if(pill) pill.classList.add('selected');
    }
    document.getElementById('yrd-label-input').value = y.label || '';
    document.getElementById('yrd-carry-input').value = y.carry != null ? y.carry : '';
    document.getElementById('yrd-total-input').value = y.total != null ? y.total : '';
  }
  document.getElementById('yardages-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function cancelYardageEdit() {
  _editingYrdId = null;
  document.querySelectorAll('#yrd-club-pills .yrd-club-pill').forEach(p => p.classList.remove('selected'));
  const li = document.getElementById('yrd-label-input'); if(li) li.value = '';
  const ci = document.getElementById('yrd-carry-input'); if(ci) ci.value = '';
  const ti = document.getElementById('yrd-total-input'); if(ti) ti.value = '';
  const t = document.getElementById('yardages-form-title'); if(t) t.textContent = 'Add Yardage';
  const d = document.getElementById('yrd-delete-btn'); if(d) d.classList.add('hidden');
}

function saveYardageEntry() {
  const carry = parseInt(document.getElementById('yrd-carry-input').value) || null;
  const total = parseInt(document.getElementById('yrd-total-input').value) || null;
  if(carry == null && total == null) { showToast('Enter carry or total distance'); return; }
  const label = document.getElementById('yrd-label-input').value.trim();
  const clubPill = document.querySelector('#yrd-club-pills .yrd-club-pill.selected');
  const clubId = clubPill ? clubPill.dataset.club : null;
  const isNew = !_editingYrdId;
  const editId = _editingYrdId;

  const yardages = getYardages();
  if(!isNew) {
    const idx = yardages.findIndex(y => y.id === editId);
    if(idx >= 0) yardages[idx] = { ...yardages[idx], clubId, label, carry, total };
  } else {
    yardages.push({ id: 'yrd_' + Date.now(), clubId, label, carry, total });
  }
  saveYardages(yardages);
  cancelYardageEdit();
  renderYardagesList();
  showToast(isNew ? 'Yardage saved' : 'Yardage updated');
}

function deleteYardage() {
  if(!_editingYrdId) return;
  if(!confirm('Delete this yardage?')) return;
  const id = _editingYrdId;
  saveYardages(getYardages().filter(y => y.id !== id));
  cancelYardageEdit();
  renderYardagesList();
  showToast('Deleted');
}

// ═══════════════════════════════════════════════════════════════
// YARDAGES OVERLAY (hole screen)
// ═══════════════════════════════════════════════════════════════

let _yrdOverlayFilterMode = null; // 'range' | 'club' | null
let _yrdOverlayFilterClub = null;

function openYardagesOverlay() {
  const yardages = getYardages();
  if(yardages.length === 0) return;

  // Determine remaining yardage for pre-fill
  let remainDist = null;
  const round = currentRound();
  if(round) {
    const hd = round.holes[state.currentHole - 1];
    const shots = hd.shots || [];
    if(shots.length === 0) {
      remainDist = hd.yardsOverride || hd.yards;
    } else {
      const last = shots[shots.length - 1];
      if(last && last.resultLie !== 'green' && last.resultLie !== 'holed' && last.resultDist != null) {
        remainDist = last.resultDist;
      }
      // on green or holed: skip pre-filter
    }
  }

  if(remainDist != null) {
    _yrdOverlayFilterMode = 'range';
    _yrdOverlayFilterClub = null;
    document.getElementById('yrd-low-input').value = Math.max(0, remainDist - 10);
    document.getElementById('yrd-high-input').value = remainDist + 10;
  } else {
    _yrdOverlayFilterMode = null;
    _yrdOverlayFilterClub = null;
    document.getElementById('yrd-low-input').value = '';
    document.getElementById('yrd-high-input').value = '';
  }

  renderYrdOverlayClubPills(yardages);
  renderYrdOverlayList();
  document.getElementById('yardages-overlay').classList.add('open');
}

function closeYardagesOverlay() {
  document.getElementById('yardages-overlay').classList.remove('open');
}

function handleYardagesOverlayClick(e) {
  if(e.target === document.getElementById('yardages-overlay')) closeYardagesOverlay();
}

function renderYrdOverlayClubPills(yardages) {
  const usedIds = new Set((yardages || getYardages()).filter(y => y.clubId).map(y => y.clubId));
  const clubs = CLUBS.filter(c => usedIds.has(c.id));
  const container = document.getElementById('yrd-club-filter-pills');
  if(!container) return;
  container.innerHTML = clubs.map(c =>
    `<button class="pill pill-sm yrd-overlay-club-pill${_yrdOverlayFilterClub === c.id ? ' selected' : ''}" data-club="${c.id}" onclick="selectYrdOverlayClub('${c.id}')">${c.label}</button>`
  ).join('');
  container.classList.toggle('hidden', clubs.length === 0);
}

function selectYrdOverlayClub(id) {
  if(_yrdOverlayFilterClub === id) {
    _yrdOverlayFilterClub = null;
    _yrdOverlayFilterMode = null;
  } else {
    _yrdOverlayFilterClub = id;
    _yrdOverlayFilterMode = 'club';
    document.getElementById('yrd-low-input').value = '';
    document.getElementById('yrd-high-input').value = '';
  }
  document.querySelectorAll('.yrd-overlay-club-pill').forEach(p =>
    p.classList.toggle('selected', p.dataset.club === _yrdOverlayFilterClub)
  );
  renderYrdOverlayList();
}

function onYrdRangeInput() {
  _yrdOverlayFilterMode = 'range';
  _yrdOverlayFilterClub = null;
  document.querySelectorAll('.yrd-overlay-club-pill').forEach(p => p.classList.remove('selected'));
  renderYrdOverlayList();
}

function renderYrdOverlayList() {
  let yardages = getYardages();

  if(_yrdOverlayFilterMode === 'range') {
    const low = parseFloat(document.getElementById('yrd-low-input').value);
    const high = parseFloat(document.getElementById('yrd-high-input').value);
    const hasLow = !isNaN(low), hasHigh = !isNaN(high);
    if(hasLow || hasHigh) {
      yardages = yardages.filter(y => {
        const lo = hasLow ? low : 0, hi = hasHigh ? high : Infinity;
        if(y.carry != null && y.carry >= lo && y.carry <= hi) return true;
        if(y.total != null && y.total >= lo && y.total <= hi) return true;
        return false;
      });
    }
  } else if(_yrdOverlayFilterMode === 'club' && _yrdOverlayFilterClub) {
    yardages = yardages.filter(y => y.clubId === _yrdOverlayFilterClub);
  }

  yardages.sort((a, b) => (a.total ?? a.carry ?? 0) - (b.total ?? b.carry ?? 0));

  const el = document.getElementById('yrd-overlay-list');
  if(!el) return;
  if(yardages.length === 0) {
    el.innerHTML = `<div class="list-empty" style="padding:16px 0">No matching yardages</div>`;
    return;
  }
  el.innerHTML = yardages.map(y => {
    const club = CLUBS.find(c => c.id === y.clubId);
    const clubBadge = club ? `<span class="yrd-club-badge">${club.label}</span>` : '';
    const parts = [];
    if(y.carry != null) parts.push(`<span class="yrd-overlay-carry">${y.carry}</span><span class="yrd-overlay-unit"> carry</span>`);
    if(y.total != null) parts.push(`<span class="yrd-overlay-total">${y.total}</span><span class="yrd-overlay-unit"> total</span>`);
    const distStr = parts.join('<span class="yrd-overlay-sep"> · </span>');
    return `<div class="yrd-overlay-row">
      <div class="yrd-row-left">
        ${clubBadge}
        <span class="yrd-row-label">${y.label || ''}</span>
      </div>
      <div class="yrd-overlay-dist">${distStr}</div>
    </div>`;
  }).join('');
}
