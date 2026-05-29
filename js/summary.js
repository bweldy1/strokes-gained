// ═══════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════

function roundTotalSG(round, exc) {
  let t = 0, c = 0;
  for(const hole of round.holes) for(const s of (hole.shots || [])) {
    if(s.sg == null) continue;
    if(exc && exc.has(s.category)) continue;
    t += s.sg; c++;
  }
  return c > 0 ? t : null;
}

function toggleSummaryCat(cat) {
  const el = document.getElementById('ssum-' + cat), icon = document.getElementById('ssum-icon-' + cat);
  if(!el) return;
  const open = el.classList.contains('hidden');
  el.classList.toggle('hidden');
  if(icon) icon.style.transform = open ? 'rotate(90deg)' : '';
}

function toggleHolesSection() {
  const wrap = document.getElementById('summary-holes-wrap'), icon = document.getElementById('holes-section-chevron');
  if(!wrap) return;
  const open = wrap.classList.contains('hidden');
  wrap.classList.toggle('hidden');
  if(icon) icon.style.transform = open ? 'rotate(90deg)' : '';
}

function toggleStatGroup(group) {
  const el = document.getElementById('sstat-' + group), icon = document.getElementById('sstat-icon-' + group);
  if(!el) return;
  const open = el.classList.contains('hidden');
  el.classList.toggle('hidden');
  if(icon) icon.style.transform = open ? 'rotate(90deg)' : '';
}

function toggleSummaryHole(holeNum) {
  const el = document.getElementById('ssum-hole-' + holeNum), icon = document.getElementById('ssum-hole-icon-' + holeNum);
  if(!el) return;
  const open = el.classList.contains('hidden');
  el.classList.toggle('hidden');
  if(icon) icon.style.transform = open ? 'rotate(90deg)' : '';
}

function buildBucketRows(shots, cat, showTotal = true) {
  const buckets = SG_BUCKETS[cat]; if(!buckets) return '';
  const fmtSG = v => (v >= 0 ? '+' : '') + v.toFixed(2);
  const lieBucketLies = buckets.filter(b => b.lie).map(b => b.lie);
  const rows = buckets.map(b => {
    const bs = b.lie
      ? shots.filter(s => s.lie === b.lie)
      : shots.filter(s => s.distFrom != null && s.distFrom >= b.min && s.distFrom <= b.max && !lieBucketLies.includes(s.lie));
    if(bs.length === 0) return '';
    const bTot = bs.reduce((sum, s) => sum + (s.sg || 0), 0);
    const bAvg = bTot / bs.length;
    const cls = (v) => v >= 0 ? 'sg-pos' : 'sg-neg';
    return `<div class="ssum-bucket">
      <span class="ssum-bucket-label">${b.label}</span>
      <span class="ssum-bucket-count">${bs.length} shot${bs.length !== 1 ? 's' : ''}</span>
      <span class="ssum-bucket-avg ${cls(bAvg)}">${fmtSG(bAvg)}</span>
      ${showTotal ? `<span class="ssum-bucket-total ${cls(bTot)}">${fmtSG(bTot)}</span>` : ''}
    </div>`;
  }).filter(Boolean).join('');
  return rows || '<div class="ssum-empty">No shots recorded</div>';
}

function buildMissGrid(shots, cat) {
  const depths = ['long', 'even', 'short'];
  const depthLabels = {long: 'Long', even: 'Even', short: 'Short'};
  const sides = cat === 'putt' ? ['low', 'center', 'high'] : ['left', 'middle', 'right'];
  const sideLabels = cat === 'putt'
    ? {low: 'Low', center: 'Center', high: 'High'}
    : {left: 'Left', middle: 'Middle', right: 'Right'};

  const withMiss = shots.filter(s => s.missSide != null).map(s => ({...s, missDepth: s.missDepth ?? 'even'}));
  if(withMiss.length === 0) return '';

  const total = withMiss.length;
  const allCount = shots.length;
  const metaStr = total < allCount ? `${total} of ${allCount} shots` : `${total} shot${total !== 1 ? 's' : ''}`;

  // Count each depth×side combo
  const counts = {};
  for(const s of withMiss) {
    const key = s.missDepth + '|' + s.missSide;
    counts[key] = (counts[key] || 0) + 1;
  }

  // Side totals for column headers
  const sideTotals = sides.map(side => withMiss.filter(s => s.missSide === side).length);

  const colHeaders = sides.map((side, i) => {
    const pct = Math.round(sideTotals[i] / total * 100);
    return `<div class="miss-pct-col-hdr">${sideLabels[side]}<span class="miss-pct-col-pct">${pct}%</span></div>`;
  }).join('');

  const rows = depths.map(depth => {
    const cells = sides.map(side => {
      const n = counts[depth + '|' + side] || 0;
      const pct = Math.round(n / total * 100);
      const prominent = pct >= 20;
      return n > 0
        ? `<div class="miss-pct-cell${prominent ? ' miss-pct-cell-hi' : ''}"><span class="miss-pct-pct">${pct}%</span><span class="miss-pct-n">${n}</span></div>`
        : `<div class="miss-pct-cell miss-pct-cell-empty">—</div>`;
    }).join('');
    return `<div class="miss-pct-row"><div class="miss-pct-depth-lbl">${depthLabels[depth]}</div>${cells}</div>`;
  }).join('');

  return `<div class="miss-pct-section">
    <div class="miss-pct-header">Miss Direction <span class="miss-pct-meta">${metaStr}</span></div>
    <div class="miss-pct-grid">
      <div class="miss-pct-row miss-pct-col-row"><div class="miss-pct-depth-lbl"></div>${colHeaders}</div>
      ${rows}
    </div>
  </div>`;
}

function buildMissType(shots) {
  const missed = shots.filter(s => s.resultLie !== 'holed');
  const withType = missed.filter(s => s.missType != null);
  if(withType.length === 0) return '';
  const total = withType.length;
  const metaStr = total < missed.length ? `${total} of ${missed.length} putts` : `${total} putt${total !== 1 ? 's' : ''}`;
  const types = ['read', 'pace', 'push', 'pull'];
  const labels = {read: 'Read', pace: 'Pace', push: 'Push', pull: 'Pull'};
  const cells = types.map(t => {
    const n = withType.filter(s => s.missType === t).length;
    const pct = Math.round(n / total * 100);
    return `<div class="miss-type-item">
      <span class="miss-type-label">${labels[t]}</span>
      <span class="miss-type-pct">${n > 0 ? pct + '%' : '—'}</span>
      <span class="miss-type-n">${n > 0 ? n : ''}</span>
    </div>`;
  }).join('');
  return `<div class="miss-type-section">
    <div class="miss-type-header">Miss Type <span class="miss-type-meta">${metaStr}</span></div>
    <div class="miss-type-row">${cells}</div>
  </div>`;
}

function buildClubRows(shots) {
  const withClub = shots.filter(s => s.club);
  if(withClub.length === 0) return '';
  const totals = {};
  for(const s of withClub) {
    if(!totals[s.club]) totals[s.club] = { sg: 0, count: 0 };
    totals[s.club].sg += (s.sg || 0);
    totals[s.club].count++;
  }
  const fmtSG = v => (v >= 0 ? '+' : '') + v.toFixed(2);
  const rows = CLUBS.filter(c => totals[c.id]).map(c => {
    const { sg, count } = totals[c.id];
    const avg = sg / count;
    return `<div class="ssum-bucket">
      <span class="ssum-bucket-label">${c.label}</span>
      <span class="ssum-bucket-count">${count} shot${count !== 1 ? 's' : ''}</span>
      <span class="ssum-bucket-avg ${avg >= 0 ? 'sg-pos' : 'sg-neg'}">${fmtSG(avg)}</span>
      <span class="ssum-bucket-total ${sg >= 0 ? 'sg-pos' : 'sg-neg'}">${fmtSG(sg)}</span>
    </div>`;
  }).join('');
  const meta = withClub.length < shots.length ? `${withClub.length} of ${shots.length} shots` : `${withClub.length} shot${withClub.length !== 1 ? 's' : ''}`;
  return `<div class="miss-pct-section"><div class="miss-pct-header">By Club <span class="miss-pct-meta">${meta}</span></div>${rows}</div>`;
}

function buildRankedBuckets(catShots) {
  const fmtSG = v => (v >= 0 ? '+' : '') + v.toFixed(2);
  const cats = ['drive', 'approach', 'shortgame', 'putt'];
  const entries = [];
  for(const cat of cats) {
    const shots = catShots[cat] || [];
    const buckets = SG_BUCKETS[cat]; if(!buckets) continue;
    const lieBucketLies = buckets.filter(b => b.lie).map(b => b.lie);
    for(const b of buckets) {
      const bs = b.lie
        ? shots.filter(s => s.lie === b.lie)
        : shots.filter(s => s.distFrom != null && s.distFrom >= b.min && s.distFrom <= b.max && !lieBucketLies.includes(s.lie));
      if(bs.length === 0) continue;
      const tot = bs.reduce((sum, s) => sum + (s.sg || 0), 0);
      const avg = tot / bs.length;
      entries.push({cat, label: b.label, count: bs.length, avg});
    }
  }
  if(entries.length === 0) return '<div class="ssum-empty">No shots recorded</div>';
  entries.sort((a, b) => b.avg - a.avg);
  return entries.map(e => `<div class="bucket-rank-row">
    <span class="category-badge cat-${e.cat} bucket-rank-cat">${CAT_LABELS[e.cat]}</span>
    <span class="bucket-rank-label">${e.label}</span>
    <span class="bucket-rank-count">${e.count}</span>
    <span class="bucket-rank-avg ${e.avg >= 0 ? 'sg-pos' : 'sg-neg'}">${fmtSG(e.avg)}</span>
  </div>`).join('');
}

function toggleRankingsSection() {
  const wrap = document.getElementById('rankings-wrap'), icon = document.getElementById('rankings-chevron');
  if(!wrap) return;
  const open = wrap.classList.contains('hidden');
  wrap.classList.toggle('hidden');
  if(icon) icon.style.transform = open ? 'rotate(90deg)' : '';
}

function buildShotRow(s, label, labelClass = 'ssum-hole', holeNum = null, shotIdx = null, excluded = false) {
  const fromDist = s.lie === 'green' ? s.distFrom + 'ft' : s.distFrom + 'y';
  const toLabel = LIE_ABBR[s.resultLie] || s.resultLie;
  const toDist = s.resultLie === 'holed' ? '' : s.resultLie === 'green' ? (s.resultDist != null ? s.resultDist + 'ft' : '') : (s.resultDist != null ? s.resultDist + 'y' : '');
  const missParts = [s.missDepth === 'even' ? null : s.missDepth, s.missSide].filter(Boolean).map(v => v.charAt(0).toUpperCase() + v.slice(1));
  const missStr = missParts.length ? missParts.join('-') : '';
  const sgStr = s.sg != null ? (s.sg >= 0 ? '+' : '') + s.sg.toFixed(2) : '—';
  const driveDist = (s.category === 'drive' && s.distFrom != null && s.resultDist != null) ? Math.round(s.distFrom - s.resultDist) : null;
  const fromBlock = driveDist != null
    ? `${LIE_ABBR[s.lie] || s.lie} ${fromDist} <span class="ssum-drive">${driveDist}y drive</span>`
    : `${LIE_ABBR[s.lie] || s.lie} ${fromDist}`;
  const exclBtn = holeNum != null && shotIdx != null
    ? `<button class="sshot-excl-btn${excluded ? ' excl-active' : ''}" onclick="event.stopPropagation();toggleShotExclusion(${holeNum},${shotIdx})" title="${excluded ? 'Include shot' : 'Exclude shot'}">⊘</button>`
    : '';
  return `<div class="ssum-shot${excluded ? ' excluded' : ''}">
    <span class="${labelClass}">${label}</span>
    <span class="ssum-from">${fromBlock}</span>
    <span class="ssum-arrow">›</span>
    <span class="ssum-to">${toLabel}${toDist ? ' ' + toDist : ''}${missStr ? `<span class="ssum-miss"> ${missStr}</span>` : ''}</span>
    <span class="ssum-sg" style="color:${s.sg != null ? getQuality(s.sg, s.category).color : 'var(--text-muted)'}">${sgStr}</span>
    ${exclBtn}
  </div>`;
}

function renderScorecardScreen() {
  const round = currentRound(); if(!round) return;
  document.getElementById('scorecard-content').innerHTML = renderScorecard(round);
}

function renderScorecard(round) {
  const holes = round.holes || [];
  if(holes.length === 0) return '';

  const hd = holes.map(h => {
    const shots = h.shots || [];
    const strokes = countStrokes(shots);
    return { num: h.hole, par: h.par, yds: h.yardsOverride || h.yards || null, strokes, rel: strokes - h.par };
  });

  const hasYds = hd.some(h => h.yds);

  function symStr(strokes, rel) {
    if(rel <= -2) return `<span class="sc-sym sc-sym-eagle">${strokes}</span>`;
    if(rel === -1) return `<span class="sc-sym sc-sym-birdie">${strokes}</span>`;
    if(rel === 1)  return `<span class="sc-sym sc-sym-bogey">${strokes}</span>`;
    if(rel >= 2)   return `<span class="sc-sym sc-sym-double">${strokes}</span>`;
    return `${strokes}`;
  }
  function relStr(rel) { return rel === 0 ? 'E' : (rel > 0 ? '+' : '') + rel; }

  function section(data, label) {
    const tPar = data.reduce((s, h) => s + h.par, 0);
    const tScr = data.reduce((s, h) => s + h.strokes, 0);
    const tRel = data.reduce((s, h) => s + h.rel, 0);
    const tYds = hasYds ? data.reduce((s, h) => s + (h.yds || 0), 0) : null;
    return `
      <tr class="sc-hole-row">
        <td class="sc-lbl"></td>
        ${data.map(h => `<td class="sc-hole-cell">${h.num}</td>`).join('')}
        <td class="sc-sec-lbl">${label}</td>
      </tr>
      <tr class="sc-par-row">
        <td class="sc-lbl">Par</td>
        ${data.map(h => `<td>${h.par}</td>`).join('')}
        <td class="sc-tot-cell">${tPar}</td>
      </tr>
      ${hasYds ? `<tr class="sc-yds-row">
        <td class="sc-lbl">Yds</td>
        ${data.map(h => `<td>${h.yds || '—'}</td>`).join('')}
        <td class="sc-tot-cell">${tYds || '—'}</td>
      </tr>` : ''}
      <tr class="sc-scr-row">
        <td class="sc-lbl">Scr</td>
        ${data.map(h => `<td>${h.strokes === 0 ? '' : symStr(h.strokes, h.rel)}</td>`).join('')}
        <td class="sc-tot-cell">${tScr}</td>
      </tr>
      `;
  }

  let tableRows;
  if(hd.length <= 9) {
    tableRows = section(hd, 'TOT');
  } else {
    const front = hd.slice(0, 9), back = hd.slice(9);
    tableRows = section(front, 'OUT')
      + `<tr class="sc-divider"><td colspan="${front.length + 2}"></td></tr>`
      + section(back, 'IN');
  }

  let totalBar = '';
  if(hd.length > 9) {
    const tPar = hd.reduce((s, h) => s + h.par, 0);
    const tScr = hd.reduce((s, h) => s + h.strokes, 0);
    const tRel = hd.reduce((s, h) => s + h.rel, 0);
    totalBar = `<div class="sc-total-bar">
      <span class="sc-total-bar-lbl">Total</span>
      <span class="sc-total-bar-val">${tScr}</span>
    </div>`;
  }

  return `<div class="sc-wrap"><table class="sc-table"><tbody>${tableRows}</tbody></table></div>${totalBar}`;
}

function renderSummary() {
  const round = currentRound(); if(!round) return;
  const excSet = getExcludedSet(round);
  const hasExcluded = (round.excludedShots || []).length > 0;

  const cats = ['drive', 'approach', 'shortgame', 'putt'];
  const tot = {drive:0, approach:0, shortgame:0, putt:0}, cnt = {drive:0, approach:0, shortgame:0, putt:0};
  const catShots = {drive:[], approach:[], shortgame:[], putt:[]};
  let gTotal = 0, gCount = 0, gStrokes = 0;

  for(const hole of round.holes) {
    const hShots = hole.shots || [];
    gStrokes += countStrokes(hShots);
    for(let i = 0; i < hShots.length; i++) {
      const s = hShots[i];
      const isExcluded = excSet.has(`${hole.hole}-${i}`);
      if(!isExcluded && catShots[s.category]) catShots[s.category].push({...s, holeNum:hole.hole});
      if(isExcluded || s.sg == null) continue;
      tot[s.category] += s.sg; cnt[s.category]++; gTotal += s.sg; gCount++;
    }
  }

  const fmt = (v, c) => c === 0 ? '—' : (v >= 0 ? '+' : '') + v.toFixed(2);
  const sgCls = (v, c) => c === 0 ? 'sg-null' : v >= 0 ? 'sg-pos' : 'sg-neg';

  // Statistics — computed here so headline stats are available for category rows
  const allShots = round.holes.flatMap(h => (h.shots || []).map((s, i) => ({...s, holeNum:h.hole, shotIdx:i})))
    .filter(s => !excSet.has(`${s.holeNum}-${s.shotIdx}`));
  const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
  const fmtFt = v => v != null ? Math.round(v) + ' ft' : '—';
  const fmtYd = v => v != null ? Math.round(v) + ' yds' : '—';
  const statRow = (label, val) => `<div class="sstat-row"><span class="sstat-label">${label}</span><span class="sstat-val">${val}</span></div>`;

  const drives = allShots.filter(s => s.category === 'drive' && s.distFrom != null && s.resultDist != null);
  const driveDists = drives.map(s => s.distFrom - s.resultDist);
  const fairwaysHit = drives.filter(s => s.resultLie === 'fairway').length;
  const fairwayTotal = drives.length;
  const fairwayStr = fairwayTotal ? `${fairwaysHit}/${fairwayTotal} (${Math.round(fairwaysHit / fairwayTotal * 100)}%)` : '—';
  const driveStats = statRow('Avg distance', fmtYd(avg(driveDists)))
    + statRow('Longest', fmtYd(driveDists.length ? Math.max(...driveDists) : null))
    + statRow('Fairways hit', fairwayStr);

  const approaches = allShots.filter(s => s.category === 'approach' && s.distFrom != null);
  const holesPlayed = round.holes.filter(h => (h.shots || []).length > 0);
  const girHoles = holesPlayed.filter(h => {
    const regIdx = h.par - 3;
    return (h.shots || []).slice(0, regIdx + 1).some(s => s.resultLie === 'green' || s.resultLie === 'holed');
  });
  const girStr = holesPlayed.length ? `${girHoles.length}/${holesPlayed.length} (${Math.round(girHoles.length / holesPlayed.length * 100)}%)` : '—';
  const approachStats = statRow('Avg distance', fmtYd(avg(approaches.map(s => s.distFrom))))
    + statRow('GIR', girStr);

  const shortgame = allShots.filter(s => s.category === 'shortgame' && s.distFrom != null);
  const sgProximity = shortgame.filter(s => s.resultLie === 'green' && s.resultDist != null);
  const proximityStr = sgProximity.length ? fmtFt(avg(sgProximity.map(s => s.resultDist))) : '—';
  const shortgameStats = statRow('Avg distance to hole', fmtYd(avg(shortgame.map(s => s.distFrom))))
    + statRow('Avg proximity (on green)', proximityStr);

  const putts = allShots.filter(s => s.category === 'putt');
  const firstPutts = round.holes.map(h => (h.shots || []).find(s => s.category === 'putt')).filter(Boolean);
  const holedPutts = putts.filter(s => s.resultLie === 'holed');
  const puttStats = statRow('Avg first putt', fmtFt(avg(firstPutts.map(s => s.distFrom))))
    + statRow('Avg holed', fmtFt(avg(holedPutts.map(s => s.distFrom))))
    + statRow('Longest holed', fmtFt(holedPutts.length ? Math.max(...holedPutts.map(s => s.distFrom)) : null));

  const headlines = {
    drive:     fairwayTotal    ? `${fairwaysHit}/${fairwayTotal} fwy` : '—',
    approach:  holesPlayed.length ? `${girHoles.length}/${holesPlayed.length} GIR` : '—',
    shortgame: sgProximity.length ? `${Math.round(avg(sgProximity.map(s => s.resultDist)))} ft prox` : '—',
    putt:      firstPutts.length  ? `${Math.round(avg(firstPutts.map(s => s.distFrom)))} ft avg 1st` : '—'
  };
  const catStatRows = { drive: driveStats, approach: approachStats, shortgame: shortgameStats, putt: puttStats };

  const catHTML = cats.map(c => {
    const rows = buildBucketRows(catShots[c], c) + buildMissGrid(catShots[c], c) + (c === 'putt' ? buildMissType(catShots[c]) : '') + (c !== 'putt' ? buildClubRows(catShots[c]) : '');
    const statsSection = `<div class="ssum-stats-section"><div class="ssum-stats-header">Statistics</div>${catStatRows[c]}</div>`;
    return `<div class="summary-stat summary-cat-row" onclick="toggleSummaryCat('${c}')">
        <div class="ssum-cat-left">
          <span class="ssum-cat-name">${CAT_LABELS[c]} <span class="ssum-cat-meta">(${cnt[c]} shots)</span></span>
          <span class="ssum-cat-headline">${headlines[c]}</span>
        </div>
        <span class="ssum-cat-right">
          <span class="ssum-cat-total ${sgCls(tot[c],cnt[c])}">${fmt(tot[c],cnt[c])}</span>
          <span class="ssum-chevron" id="ssum-icon-${c}">›</span>
        </span>
      </div>
      <div class="ssum-expand hidden" id="ssum-${c}">${rows}${statsSection}</div>`;
  }).join('');

  const holesHTML = round.holes.map(h => {
    const shots = h.shots || []; if(shots.length === 0) return '';
    const hsg = shots.reduce((sum, s, i) => excSet.has(`${h.hole}-${i}`) ? sum : sum + (s.sg || 0), 0);
    const hStrokes = countStrokes(shots);
    const rows = shots.map((s, i) => buildShotRow(s, CAT_LABELS[s.category] || s.category, 'ssum-hole-cat', h.hole, i, excSet.has(`${h.hole}-${i}`))).join('');
    return `<div class="hole-summary-row summary-cat-row" onclick="toggleSummaryHole(${h.hole})">
      <div class="hsrow-hole">${h.hole}</div>
      <div class="hsrow-par">P${h.par}</div>
      <div class="hsrow-shots">${hStrokes} stroke${hStrokes !== 1 ? 's' : ''}</div>
      <div class="hsrow-right">
        <div class="hsrow-sg ${sgClass(hsg)}">${(hsg >= 0 ? '+' : '') + hsg.toFixed(2)}</div>
        <span class="ssum-chevron" id="ssum-hole-icon-${h.hole}">›</span>
      </div>
    </div>
    <div class="ssum-expand hidden" id="ssum-hole-${h.hole}">${rows}</div>`;
  }).filter(Boolean).join('') || '<div class="list-empty">No shots recorded yet</div>';

  const rankingsSection = `
    <div class="summary-stat summary-cat-row summary-by-hole-row" onclick="toggleRankingsSection()">
      <span class="summary-by-hole-label">Rankings</span>
      <span class="ssum-chevron" id="rankings-chevron">›</span>
    </div>
    <div id="rankings-wrap" class="hidden">${buildRankedBuckets(catShots)}</div>`;

  const byHoleSection = `
    <div class="summary-stat summary-cat-row summary-by-hole-row" onclick="toggleHolesSection()">
      <span class="summary-by-hole-label">SG by Hole</span>
      <span class="ssum-chevron" id="holes-section-chevron">›</span>
    </div>
    <div id="summary-holes-wrap" class="hidden">${holesHTML}</div>`;

  const conditions = round.conditions || [];
  let conditionsHTML = '';
  if(conditions.length > 0) {
    const catImpacts = cats.map(cat => {
      const pct = getRoundDifficultyPct(conditions, cat);
      if(pct === 0) return null;
      const adj = catShots[cat].reduce((sum, s) => {
        const exp = getExpected(s.lie, s.distFrom);
        return sum + (exp !== null ? exp * pct / 100 : 0);
      }, 0);
      return { cat, adj };
    }).filter(Boolean);
    const tags = conditions.map(id => {
      const c = DIFFICULTY_CONDITIONS.find(d => d.id === id);
      return c ? `<span class="conditions-tag">${c.label}</span>` : '';
    }).join('');
    const impacts = catImpacts.map(({cat, adj}) =>
      `<span class="conditions-impact-item"><span class="conditions-impact-cat">${CAT_LABELS[cat]}</span><span class="conditions-impact-val">${adj > 0 ? '+' : ''}${adj.toFixed(2)}</span></span>`
    ).join('');
    conditionsHTML = `<div class="conditions-summary">
      <div class="conditions-summary-top"><span class="conditions-summary-lbl">Conditions</span>${tags}</div>
      ${impacts ? `<div class="conditions-impact-row">${impacts}</div>` : ''}
    </div>`;
  }

  const exclNote = hasExcluded
    ? `<div class="excl-badge"><span>${(round.excludedShots||[]).length} shot${(round.excludedShots||[]).length!==1?'s':''} excluded</span> · <span class="excl-clear" onclick="clearAllExclusions()">Clear</span></div>`
    : '';

  document.getElementById('summary-totals').innerHTML = `
    <div class="summary-stat"><span class="summary-total-label">Total SG <span class="summary-total-sub">(${gStrokes} stroke${gStrokes !== 1 ? 's' : ''})</span></span><span class="summary-total-val ${sgCls(gTotal,gCount)}">${fmt(gTotal,gCount)}</span></div>
    ${exclNote}${conditionsHTML}${catHTML}`;
  document.getElementById('summary-breakdown').innerHTML = rankingsSection + byHoleSection;

}

// ═══════════════════════════════════════════════════════════════
// SHOT EXCLUSION
// ═══════════════════════════════════════════════════════════════

function saveExpandState() {
  return new Set(
    [...document.querySelectorAll('.ssum-expand, #summary-holes-wrap, #rankings-wrap')]
      .filter(el => !el.classList.contains('hidden'))
      .map(el => el.id)
  );
}

function restoreExpandState(open) {
  open.forEach(id => {
    const el = document.getElementById(id); if(!el) return;
    el.classList.remove('hidden');
    const chevron =
      id === 'summary-holes-wrap'     ? document.getElementById('holes-section-chevron') :
      id === 'rankings-wrap'          ? document.getElementById('rankings-chevron') :
      id.startsWith('ssum-hole-')     ? document.getElementById('ssum-hole-icon-' + id.slice('ssum-hole-'.length)) :
      id.startsWith('ssum-')         ? document.getElementById('ssum-icon-' + id.slice('ssum-'.length)) :
      id.startsWith('sstat-')        ? document.getElementById('sstat-icon-' + id.slice('sstat-'.length)) :
      null;
    if(chevron) chevron.style.transform = 'rotate(90deg)';
  });
}

function toggleShotExclusion(holeNum, shotIdx) {
  const round = currentRound(); if(!round) return;
  const open = saveExpandState();
  const excl = round.excludedShots || [];
  const key = `${holeNum}-${shotIdx}`;
  const idx = excl.findIndex(e => `${e.hole}-${e.shotIndex}` === key);
  if(idx >= 0) excl.splice(idx, 1);
  else excl.push({hole: holeNum, shotIndex: shotIdx});
  round.excludedShots = excl;
  updateRound(round);
  renderSummary();
  restoreExpandState(open);
}

function clearAllExclusions() {
  const round = currentRound(); if(!round) return;
  const open = saveExpandState();
  round.excludedShots = [];
  updateRound(round);
  renderSummary();
  restoreExpandState(open);
}

// ═══════════════════════════════════════════════════════════════
// CLIPBOARD — robust iOS Safari support with fallback modal
// ═══════════════════════════════════════════════════════════════

function copyToClipboard(text, msg) {
  if(navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    navigator.clipboard.writeText(text).then(() => showToast(msg)).catch(() => fallbackCopy(text, msg));
  } else { fallbackCopy(text, msg); }
}

function fallbackCopy(text, msg) {
  const ta = document.createElement('textarea');
  ta.value = text; ta.setAttribute('readonly', '');
  ta.style.cssText = 'position:fixed;top:0;left:0;width:2px;height:2px;padding:0;border:none;outline:none;background:transparent;opacity:0;';
  document.body.appendChild(ta); ta.focus(); ta.select();
  if(/ipad|iphone/i.test(navigator.userAgent)) {
    const range = document.createRange(); range.selectNodeContents(ta);
    const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range); ta.setSelectionRange(0, 999999);
  }
  let ok = false; try { ok = document.execCommand('copy'); } catch(e) {}
  document.body.removeChild(ta);
  if(ok) showToast(msg); else showExportModal(text);
}

function showExportModal(text) {
  const ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.9);z-index:300;display:flex;flex-direction:column;padding:24px;gap:12px;';
  const t = document.createElement('div'); t.style.cssText = 'color:#fff;font-size:16px;font-weight:600;'; t.textContent = 'Select all text below and copy:';
  const ta = document.createElement('textarea'); ta.value = text;
  ta.style.cssText = 'flex:1;background:#0d1b2a;color:#e8f4f8;border:1px solid rgba(255,255,255,.2);border-radius:8px;padding:12px;font-family:monospace;font-size:11px;resize:none;';
  const btn = document.createElement('button'); btn.textContent = 'Done';
  btn.style.cssText = 'background:#40916c;color:#fff;border:none;border-radius:12px;padding:14px;font-size:16px;font-weight:600;cursor:pointer;';
  btn.onclick = () => document.body.removeChild(ov);
  ov.append(t, ta, btn); document.body.appendChild(ov); ta.focus(); ta.select();
}

function exportCSV() {
  const round = currentRound(); if(!round) return;
  const rows = [['Hole','Par','Yardage','Shot#','Lie','Dist From','Dist Unit','Result Lie','Result Dist','Result Unit','Category','SG','Miss Depth','Miss Side']];
  for(const hole of round.holes) for(let i = 0; i < (hole.shots || []).length; i++) {
    const s = hole.shots[i];
    const fu = s.lie === 'green' ? 'ft' : 'yds', ru = s.resultLie === 'green' ? 'ft' : 'yds';
    rows.push([hole.hole, hole.par, hole.yardsOverride || hole.yards, i + 1, s.lie, s.distFrom, fu, s.resultLie, s.resultDist != null ? s.resultDist : '', s.resultLie !== 'holed' ? ru : '', s.category, s.sg != null ? s.sg.toFixed(4) : '', s.missDepth || '', s.missSide || '']);
  }
  const csv = rows.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\r\n');
  copyToClipboard(csv, 'CSV copied to clipboard!');
}

function exportSummaryCSV() {
  const round = currentRound(); if(!round) return;
  const tot = {drive:0, approach:0, shortgame:0, putt:0}, cnt = {drive:0, approach:0, shortgame:0, putt:0}; let grand = 0;
  for(const hole of round.holes) for(const s of (hole.shots || [])) {
    if(s.sg == null) continue; tot[s.category] += s.sg; cnt[s.category]++; grand += s.sg;
  }
  const rows = [
    ['Date','Course','Total SG','Drive SG','Drive Shots','Approach SG','Approach Shots','Short Game SG','Short Game Shots','Putt SG','Putt Shots'],
    [round.date.split('T')[0], round.courseName, grand.toFixed(4), tot.drive.toFixed(4), cnt.drive, tot.approach.toFixed(4), cnt.approach, tot.shortgame.toFixed(4), cnt.shortgame, tot.putt.toFixed(4), cnt.putt]
  ];
  const csv = rows.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\r\n');
  copyToClipboard(csv, 'Summary CSV copied!');
}
