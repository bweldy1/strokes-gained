// ═══════════════════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════════════════

function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + name).classList.add('active');
  window.scrollTo(0, 0);
  if(name === 'home')    renderHome();
  if(name === 'courses') renderCourses();
  if(name === 'hole')    renderHoleScreen();
  if(name === 'summary') renderSummary();
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
    return `<div class="round-card" onclick="resumeRound('${r.id}')">
      <div class="round-card-info"><div class="round-card-name">${r.courseName}</div><div class="round-card-meta">${formatDate(r.date)} · ${strokes} stroke${strokes !== 1 ? 's' : ''}</div></div>
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
// INIT
// ═══════════════════════════════════════════════════════════════

(function() { renderHome(); })();
