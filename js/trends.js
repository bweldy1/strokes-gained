// ═══════════════════════════════════════════════════════════════
// TRENDS SCREEN
// ═══════════════════════════════════════════════════════════════

function renderTrends() {
  const allRounds = getRounds();
  const n = state.trendsFilter;
  const rounds = n === 0 ? allRounds : allRounds.slice(0, n);

  [5, 10, 0].forEach(k => {
    document.getElementById('tf-' + k).classList.toggle('selected', state.trendsFilter === k);
  });

  const el = document.getElementById('trends-cats');
  if(rounds.length === 0) {
    el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⛳</div><div class="empty-state-text">No rounds yet.<br>Start a new round to begin tracking.</div></div>`;
    return;
  }

  const catShots = {drive:[], approach:[], shortgame:[], putt:[]};
  for(const r of rounds) {
    for(const h of r.holes) {
      for(const s of (h.shots || [])) {
        if(catShots[s.category]) catShots[s.category].push(s);
      }
    }
  }

  const cats = ['drive', 'approach', 'shortgame', 'putt'];
  const roundLabel = `${rounds.length} round${rounds.length !== 1 ? 's' : ''}`;

  el.innerHTML = cats.map(cat => {
    const shots = catShots[cat];
    const valid = shots.filter(s => s.sg != null);
    const cnt = valid.length;
    const tot = valid.reduce((sum, s) => sum + s.sg, 0);
    const avg = cnt > 0 ? tot / cnt : null;
    const avgStr = avg !== null ? (avg >= 0 ? '+' : '') + avg.toFixed(2) : '—';
    const bucketRows = buildBucketRows(shots, cat, false);

    return `<div class="card trends-cat-card">
      <div class="trends-cat-header" onclick="toggleTrendsCat('${cat}')">
        <div class="trends-cat-name">${CAT_LABELS[cat]}</div>
        <div class="trends-cat-meta">${cnt} shots · ${roundLabel}</div>
        <div class="trends-cat-avg ${sgClass(avg)}">${avgStr}</div>
        <span class="ssum-chevron" id="tcat-icon-${cat}">›</span>
      </div>
      <div class="ssum-expand hidden" id="tcat-${cat}">${bucketRows}</div>
    </div>`;
  }).join('');
}

function setTrendsFilter(n) {
  state.trendsFilter = n;
  renderTrends();
}

function toggleTrendsCat(cat) {
  const el = document.getElementById('tcat-' + cat);
  const icon = document.getElementById('tcat-icon-' + cat);
  const open = el.classList.contains('hidden');
  el.classList.toggle('hidden');
  if(icon) icon.style.transform = open ? 'rotate(90deg)' : '';
}
