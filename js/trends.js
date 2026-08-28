// ═══════════════════════════════════════════════════════════════
// TRENDS SCREEN
// ═══════════════════════════════════════════════════════════════

// Per-round SG series for the trend chart. Points are ordered oldest → newest.
let _trendPts = [];

function buildTrendData(rounds) {
  const pts = [];
  // rounds are stored newest-first; iterate backwards for chronological order
  for(let ri = rounds.length - 1; ri >= 0; ri--) {
    const r = rounds[ri];
    const excSet = state.trendsExclude ? getExcludedSet(r) : null;
    const sums = {total: 0, drive: 0, approach: 0, shortgame: 0, putt: 0};
    const counts = {total: 0, drive: 0, approach: 0, shortgame: 0, putt: 0};
    for(const h of r.holes) {
      const shots = h.shots || [];
      for(let i = 0; i < shots.length; i++) {
        const s = shots[i];
        if(s.sg == null) continue;
        if(excSet && excSet.has(`${h.hole}-${i}`)) continue;
        sums.total += s.sg; counts.total++;
        if(sums[s.category] !== undefined) { sums[s.category] += s.sg; counts[s.category]++; }
      }
    }
    pts.push({date: r.date, courseName: r.courseName, sums, counts});
  }
  return pts;
}

function buildTrendChart(allPts) {
  const cat = state.trendsChartCat;
  const pts = allPts.filter(p => p.counts[cat] > 0)
    .map(p => ({
      date: p.date, 
      courseName: p.courseName, 
      sg: p.sums[cat] / p.counts[cat] // Updated to average per shot
    }));
  _trendPts = pts;

  const catPills = [['total','Total'],['drive','Drive'],['approach','Appr'],['shortgame','Short'],['putt','Putt']]
    .map(([id, lbl]) => `<button class="pill pill-sm trend-cat-pill ${cat === id ? 'selected' : ''}" onclick="setTrendsChartCat('${id}')">${lbl}</button>`)
    .join('');

  let body;
  if(pts.length === 0) {
    body = `<div class="trend-empty">No shots recorded for this category.</div>`;
  } else {
    body = buildTrendSVG(pts) + `<div class="trend-caption" id="trend-caption"></div>`;
  }

  return `<div class="card trend-chart-card">
    <div class="trends-cat-header" style="cursor:default">
      <div class="trends-cat-name">Avg SG per Shot</div>
      <div class="trends-cat-meta">oldest → newest</div>
    </div>
    <div class="trend-pills-row">${catPills}</div>
    ${body}
  </div>`;
}


function buildTrendSVG(pts) {
  const W = 340, H = 170, padL = 34, padR = 12, padT = 10, padB = 20;
  const plotW = W - padL - padR, plotH = H - padT - padB;

  const vals = pts.map(p => p.sg);
  let lo = Math.min(0, ...vals), hi = Math.max(0, ...vals);
  if(hi - lo < 0.5) { lo -= 0.5; hi += 0.5; }
  const steps = [0.25, 0.5, 1, 2, 2.5, 5, 10, 20, 50];
  const step = steps.find(s => (hi - lo) / s <= 5) || 100;
  lo = Math.floor(lo / step) * step;
  hi = Math.ceil(hi / step) * step;
  const ticks = [];
  for(let v = lo; v <= hi + 1e-9; v += step) ticks.push(+v.toFixed(2));

  const x = i => pts.length === 1 ? padL + plotW / 2 : padL + (i / (pts.length - 1)) * plotW;
  const y = v => padT + (1 - (v - lo) / (hi - lo)) * plotH;
  const fmtTick = v => step < 1 ? v.toFixed(1) : String(v);
  const fmtMD = iso => { const d = new Date(iso); return (d.getMonth() + 1) + '/' + d.getDate(); };

  // gridlines + y tick labels; zero line drawn stronger
  const grid = ticks.map(v => {
    const yy = y(v).toFixed(1);
    const zero = v === 0;
    return `<line x1="${padL}" y1="${yy}" x2="${W - padR}" y2="${yy}" stroke="${zero ? 'var(--border2)' : 'var(--border)'}" stroke-width="1"/>` +
      `<text x="${padL - 6}" y="${yy}" text-anchor="end" dominant-baseline="middle" class="trend-tick">${fmtTick(v)}</text>`;
  }).join('');

  // x labels: first and last round dates
  const xLabels = `<text x="${x(0)}" y="${H - 6}" text-anchor="${pts.length === 1 ? 'middle' : 'start'}" class="trend-tick">${fmtMD(pts[0].date)}</text>` +
    (pts.length > 1 ? `<text x="${x(pts.length - 1)}" y="${H - 6}" text-anchor="end" class="trend-tick">${fmtMD(pts[pts.length - 1].date)}</text>` : '');

  const line = pts.length > 1
    ? `<polyline points="${pts.map((p, i) => x(i).toFixed(1) + ',' + y(p.sg).toFixed(1)).join(' ')}" fill="none" stroke="var(--text-dim)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`
    : '';

  // dots: sign-colored (matches app-wide sgClass convention) with surface ring;
  // oversized transparent hit circle for touch
  const dots = pts.map((p, i) => {
    const cx = x(i).toFixed(1), cy = y(p.sg).toFixed(1);
    const fill = p.sg >= 0 ? 'var(--q-great)' : 'var(--q-poor)';
    return `<circle id="trend-dot-${i}" class="trend-dot" cx="${cx}" cy="${cy}" r="4.5" fill="${fill}" stroke="var(--card)" stroke-width="2"/>` +
      `<circle cx="${cx}" cy="${cy}" r="13" fill="transparent" onclick="selectTrendPoint(${i})"/>`;
  }).join('');

  return `<svg class="trend-chart-svg" viewBox="0 0 ${W} ${H}">${grid}${xLabels}${line}${dots}</svg>`;
}

function setTrendsChartCat(cat) {
  state.trendsChartCat = cat;
  renderTrends();
}

function selectTrendPoint(i) {
  const p = _trendPts[i];
  const cap = document.getElementById('trend-caption');
  if(!p || !cap) return;
  document.querySelectorAll('.trend-dot').forEach(d => d.setAttribute('r', 4.5));
  const dot = document.getElementById('trend-dot-' + i);
  if(dot) dot.setAttribute('r', 6.5);
  const sgStr = (p.sg >= 0 ? '+' : '') + p.sg.toFixed(2); // Precision updated to 2 decimal places
  cap.innerHTML = `<span>${formatDate(p.date)} · ${p.courseName}</span><span class="trend-caption-val ${sgClass(p.sg)}">${sgStr}</span>`;
}


function renderTrends() {
  const allRounds = getRounds();
  const n = state.trendsFilter;
  const rounds = n === 0 ? allRounds : allRounds.slice(0, n);

  [5, 10, 0].forEach(k => {
    document.getElementById('tf-' + k).classList.toggle('selected', state.trendsFilter === k);
  });
  document.getElementById('tf-excl').classList.toggle('selected', state.trendsExclude);

  const el = document.getElementById('trends-cats');
  if(rounds.length === 0) {
    el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⛳</div><div class="empty-state-text">No rounds yet.<br>Start a new round to begin tracking.</div></div>`;
    return;
  }

  const catShots = {drive:[], approach:[], shortgame:[], putt:[]};
  for(const r of rounds) {
    const excSet = state.trendsExclude ? getExcludedSet(r) : null;
    for(const h of r.holes) {
      const shots = h.shots || [];
      for(let i = 0; i < shots.length; i++) {
        const s = shots[i];
        if(excSet && excSet.has(`${h.hole}-${i}`)) continue;
        if(catShots[s.category]) catShots[s.category].push(s);
      }
    }
  }

  const cats = ['drive', 'approach', 'shortgame', 'putt'];
  const roundLabel = `${rounds.length} round${rounds.length !== 1 ? 's' : ''}`;

  const holesPlayed = [], girHoles = [];
  for(const r of rounds) {
    for(const h of r.holes) {
      if((h.shots || []).length === 0) continue;
      holesPlayed.push(h);
      const regIdx = h.par - 3;
      if((h.shots || []).slice(0, regIdx + 1).some(s => s.resultLie === 'green' || s.resultLie === 'holed')) girHoles.push(h);
    }
  }
  const missedGirHoles = holesPlayed.filter(h => !girHoles.includes(h));
  const scrambleSuccess = missedGirHoles.filter(h => countStrokes(h.shots || []) <= h.par).length;
  const scrambleStr = missedGirHoles.length ? `${scrambleSuccess}/${missedGirHoles.length} (${Math.round(scrambleSuccess / missedGirHoles.length * 100)}%)` : '—';
  const scrambleStats = `<div class="ssum-stats-section"><div class="ssum-stats-header">Statistics</div><div class="sstat-row"><span class="sstat-label">Scrambling</span><span class="sstat-val">${scrambleStr}</span></div></div>`;

  const rankingsCard = `<div class="card trends-rankings-card">
    <div class="trends-cat-header" onclick="toggleTrendsRankings()">
      <div class="trends-cat-name">Rankings</div>
      <span class="ssum-chevron" id="trankings-icon">›</span>
    </div>
    <div class="ssum-expand hidden" id="trankings">${buildRankedBuckets(catShots)}</div>
  </div>`;

  const chartCard = buildTrendChart(buildTrendData(rounds));

  el.innerHTML = chartCard + cats.map(cat => {
    const shots = catShots[cat];
    const valid = shots.filter(s => s.sg != null);
    const cnt = valid.length;
    const tot = valid.reduce((sum, s) => sum + s.sg, 0);
    const avg = cnt > 0 ? tot / cnt : null;
    const avgStr = avg !== null ? (avg >= 0 ? '+' : '') + avg.toFixed(2) : '—';
    const bucketRows = buildBucketRows(shots, cat, false) + buildMissGrid(shots, cat) + (cat === 'putt' ? buildMissType(shots) : '') + (cat !== 'putt' ? buildClubRows(shots) : '') + (cat === 'shortgame' ? scrambleStats : '');

    return `<div class="card trends-cat-card">
      <div class="trends-cat-header" onclick="toggleTrendsCat('${cat}')">
        <div class="trends-cat-name">${CAT_LABELS[cat]}</div>
        <div class="trends-cat-meta">${cnt} shots · ${roundLabel}</div>
        <div class="trends-cat-avg ${sgClass(avg)}">${avgStr}</div>
        <span class="ssum-chevron" id="tcat-icon-${cat}">›</span>
      </div>
      <div class="ssum-expand hidden" id="tcat-${cat}">${bucketRows}</div>
    </div>`;
  }).join('') + rankingsCard;

  if(_trendPts.length > 0) selectTrendPoint(_trendPts.length - 1);
}

function setTrendsFilter(n) {
  state.trendsFilter = n;
  renderTrends();
}

function setTrendsExclude(val) {
  state.trendsExclude = val;
  renderTrends();
}

function toggleTrendsRankings() {
  const el = document.getElementById('trankings'), icon = document.getElementById('trankings-icon');
  const open = el.classList.contains('hidden');
  el.classList.toggle('hidden');
  if(icon) icon.style.transform = open ? 'rotate(90deg)' : '';
}

function toggleTrendsCat(cat) {
  const el = document.getElementById('tcat-' + cat);
  const icon = document.getElementById('tcat-icon-' + cat);
  const open = el.classList.contains('hidden');
  el.classList.toggle('hidden');
  if(icon) icon.style.transform = open ? 'rotate(90deg)' : '';
}
