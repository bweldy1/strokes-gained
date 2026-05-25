// ═══════════════════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════════════════

function showScreen(name) {
  closeHolePicker();
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + name).classList.add('active');
  window.scrollTo(0, 0);
  if(name === 'home')    renderHome();
  if(name === 'courses') renderCourses();
  if(name === 'hole')    renderHoleScreen();
  if(name === 'summary')    renderSummary();
  if(name === 'scorecard')  renderScorecardScreen();
  if(name === 'trends')     renderTrends();
}

// ═══════════════════════════════════════════════════════════════
// HOME
// ═══════════════════════════════════════════════════════════════

function renderHome() {
  const rounds = getRounds();
  const el = document.getElementById('rounds-list');
  if(rounds.length === 0) {
    el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⛳</div><div class="empty-state-text">No rounds yet.<br>Start a new round to begin tracking.</div></div>`;
    return;
  }
  el.innerHTML = rounds.map(r => {
    const sg = roundTotalSG(r, null);
    const sgStr = sg !== null ? (sg >= 0 ? '+' : '') + sg.toFixed(1) : '—';
    const strokes = r.holes.reduce((s, h) => s + countStrokes(h.shots || []), 0);
    const noteSnippet = r.notes ? `<div class="round-card-note">${r.notes.length > 55 ? r.notes.slice(0, 55) + '…' : r.notes}</div>` : '';
    return `<div class="round-card" onclick="resumeRound('${r.id}')">
      <div class="round-card-info"><div class="round-card-name">${r.courseName}</div><div class="round-card-meta">${formatDate(r.date)} · ${strokes} stroke${strokes !== 1 ? 's' : ''}</div>${noteSnippet}</div>
      <div class="round-card-sg"><div class="round-card-sg-val ${sgClass(sg)}">${sgStr}</div><div class="round-card-sg-lbl">Total SG</div></div>
      <div class="round-del-btn" onclick="event.stopPropagation();deleteRound('${r.id}')">×</div>
    </div>`;
  }).join('');
}

function goToNewRound() { showScreen('courses'); }

function resumeRound(id) {
  state.currentRoundId = id;
  const r = getRound(id);
  let last = 1;
  for(let i = 0; i < r.holes.length; i++) if((r.holes[i].shots || []).length > 0) last = i + 1;
  state.currentHole = last;
  state.excludedCategories = new Set();
  showScreen('hole');
}

function deleteRound(id) {
  if(!confirm('Delete this round?')) return;
  saveRounds(getRounds().filter(r => r.id !== id));
  renderHome();
}

// ═══════════════════════════════════════════════════════════════
// SETTINGS SHEET
// ═══════════════════════════════════════════════════════════════

function openSettingsSheet() {
  cancelRestore();
  document.getElementById('settings-sheet').classList.add('open');
}

function closeSettingsSheet() {
  document.getElementById('settings-sheet').classList.remove('open');
}

function handleSettingsOverlayClick(e) {
  if(e.target === document.getElementById('settings-sheet')) closeSettingsSheet();
}

// ── Backup ──

function backupData() {
  const payload = { version: 1, exported: new Date().toISOString(), rounds: getRounds(), courses: getCourses() };
  const json = JSON.stringify(payload, null, 2);
  const date = new Date().toISOString().slice(0, 10);
  const filename = `sg-backup-${date}.json`;
  try {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('Backup downloaded');
  } catch(e) {
    // Fallback for environments where Blob/download fails
    showExportModal(json);
  }
}

// ── Restore ──

let _restorePayload = null;

function triggerRestoreFilePicker() {
  cancelRestore();
  document.getElementById('restore-file-input').value = '';
  document.getElementById('restore-file-input').click();
}

function onRestoreFileSelected(e) {
  const file = e.target.files[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = evt => {
    try {
      const payload = JSON.parse(evt.target.result);
      if(!Array.isArray(payload.rounds)) throw new Error('Invalid backup file');
      _restorePayload = payload;
      const rCount = payload.rounds.length;
      const cCount = Array.isArray(payload.courses) ? payload.courses.length : 0;
      document.getElementById('restore-preview-summary').textContent =
        `Found ${rCount} round${rCount !== 1 ? 's' : ''} and ${cCount} course${cCount !== 1 ? 's' : ''} in backup.`;
      document.getElementById('restore-preview').classList.remove('hidden');
    } catch(err) {
      showToast('Invalid backup file');
    }
  };
  reader.readAsText(file);
}

function cancelRestore() {
  _restorePayload = null;
  const preview = document.getElementById('restore-preview');
  if(preview) preview.classList.add('hidden');
  const input = document.getElementById('restore-file-input');
  if(input) input.value = '';
  const radios = document.querySelectorAll('input[name="restore-mode"]');
  radios.forEach(r => { r.checked = r.value === 'new'; });
}

function roundDuplicateKey(r) {
  return [r.courseName || '', (r.date || '').slice(0, 10), r.name || ''].join('|');
}

function confirmRestore() {
  if(!_restorePayload) return;
  const mode = document.querySelector('input[name="restore-mode"]:checked').value;
  const incoming = _restorePayload.rounds || [];
  const incomingCourses = _restorePayload.courses || [];

  const existingRounds = getRounds();
  const existingKeys = new Set(existingRounds.map(roundDuplicateKey));
  const existingIds = new Set(existingRounds.map(r => r.id));

  let merged, addedRounds;
  if(mode === 'all') {
    // Overwrite duplicates: replace matching existing rounds, append new ones
    const incomingKeys = new Set(incoming.map(roundDuplicateKey));
    const kept = existingRounds.filter(r => !incomingKeys.has(roundDuplicateKey(r)));
    merged = [...incoming, ...kept];
    addedRounds = incoming.length;
  } else {
    // New only: skip duplicates by key or by id
    const newRounds = incoming.filter(r => !existingKeys.has(roundDuplicateKey(r)) && !existingIds.has(r.id));
    merged = [...existingRounds, ...newRounds];
    addedRounds = newRounds.length;
  }

  // Sort rounds newest first (match existing order convention)
  merged.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  // Safety net: deduplicate by id (last occurrence wins) before saving
  const seenIds = new Set();
  merged = merged.filter(r => seenIds.has(r.id) ? false : seenIds.add(r.id));
  saveRounds(merged);

  // Courses: always merge by id, never duplicate
  if(incomingCourses.length > 0) {
    const existingCourses = getCourses();
    const existingCourseIds = new Set(existingCourses.map(c => c.id));
    const newCourses = incomingCourses.filter(c => !existingCourseIds.has(c.id));
    saveCourses([...existingCourses, ...newCourses]);
  }

  closeSettingsSheet();
  renderHome();
  const skipped = incoming.length - addedRounds;
  const msg = skipped > 0
    ? `Restored ${addedRounds} round${addedRounds !== 1 ? 's' : ''} (${skipped} skipped)`
    : `Restored ${addedRounds} round${addedRounds !== 1 ? 's' : ''}`;
  showToast(msg);
}

// ═══════════════════════════════════════════════════════════════
// APPEARANCE
// ═══════════════════════════════════════════════════════════════

function applyActiveClubs() {
  const active = getActiveClubs();
  document.querySelectorAll('.club-toggle-pill').forEach(p =>
    p.classList.toggle('selected', active.has(p.dataset.club))
  );
}

function toggleActiveClub(id) {
  const active = getActiveClubs();
  if(active.has(id)) active.delete(id); else active.add(id);
  localStorage.setItem('sg_activeClubs', JSON.stringify([...active]));
  applyActiveClubs();
}

function applyClubAutoExpand() {
  const val = getClubAutoExpand();
  document.querySelectorAll('.club-expand-pill').forEach(p =>
    p.classList.toggle('selected', p.dataset.expand === String(val))
  );
}

function setClubAutoExpand(val) {
  localStorage.setItem('sg_clubAutoExpand', val);
  applyClubAutoExpand();
}

function applyMissAutoExpand() {
  const val = getMissAutoExpand();
  document.querySelectorAll('.miss-expand-pill').forEach(p =>
    p.classList.toggle('selected', p.dataset.expand === String(val))
  );
}

function setMissAutoExpand(val) {
  localStorage.setItem('sg_missAutoExpand', val);
  applyMissAutoExpand();
}

function applyColorScheme(scheme) {
  scheme = scheme || 'classic';
  document.documentElement.setAttribute('data-scheme', scheme);
  document.querySelectorAll('.scheme-pill').forEach(p => {
    p.classList.toggle('selected', p.dataset.scheme === scheme);
  });
}

function setColorScheme(scheme) {
  localStorage.setItem('sg_colorScheme', scheme);
  applyColorScheme(scheme);
}

function applyHoleOutDist(dist) {
  dist = parseInt(dist) || getHoleOutDist();
  const slider = document.getElementById('holeout-dist-slider');
  const label = document.getElementById('holeout-dist-label');
  if(slider) slider.value = dist;
  if(label) label.textContent = dist + ' ft';
}

function setHoleOutDist(dist) {
  dist = parseInt(dist);
  localStorage.setItem('sg_holeOutDist', dist);
  applyHoleOutDist(dist);
}

// ═══════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════

(function() {
  applyColorScheme(localStorage.getItem('sg_colorScheme'));
  applyHoleOutDist();
  applyActiveClubs();
  applyClubAutoExpand();
  applyMissAutoExpand();
  renderHome();

  // Scroll focused inputs into view when iOS keyboard appears
  if(window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
      const el = document.activeElement;
      if(!el || (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA')) return;
      const sheetBody = el.closest('.sheet-body');
      if(!sheetBody) return;
      const elRect = el.getBoundingClientRect();
      const vpHeight = window.visualViewport.height;
      if(elRect.bottom > vpHeight - 16) {
        sheetBody.scrollTop += elRect.bottom - vpHeight + 60;
      }
    });
  }
})();
