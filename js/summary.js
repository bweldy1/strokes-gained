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

function buildShotRow(s, label, labelClass = 'ssum-hole') {
  const fromDist = s.lie === 'green' ? s.distFrom + 'ft' : s.distFrom + 'y';
  const toLabel = LIE_ABBR[s.resultLie] || s.resultLie;
  const toDist = s.resultLie === 'holed' ? '' : s.resultLie === 'green' ? (s.resultDist != null ? s.resultDist + 'ft' : '') : (s.resultDist != null ? s.resultDist + 'y' : '');
  const missParts = [s.missDepth, s.missSide].filter(Boolean).map(v => v.charAt(0).toUpperCase() + v.slice(1));
  const missStr = missParts.length ? missParts.join('-') : '';
  const sgStr = s.sg != null ? (s.sg >= 0 ? '+' : '') + s.sg.toFixed(2) : '—';
  const driveDist = (s.category === 'drive' && s.distFrom != null && s.resultDist != null) ? Math.round(s.distFrom - s.resultDist) : null;
  const fromBlock = driveDist != null
    ? `${LIE_ABBR[s.lie] || s.lie} ${fromDist} <span class="ssum-drive">${driveDist}y drive</span>`
    : `${LIE_ABBR[s.lie] || s.lie} ${fromDist}`;
  return `<div class="ssum-shot">
    <span class="${labelClass}">${label}</span>
    <span class="ssum-from">${fromBlock}</span>
    <span class="ssum-arrow">›</span>
    <span class="ssum-to">${toLabel}${toDist ? ' ' + toDist : ''}${missStr ? `<span class="ssum-miss"> ${missStr}</span>` : ''}</span>
    <span class="ssum-sg" style="color:${s.sg != null ? getQuality(s.sg, s.category).color : 'var(--text-muted)'}">${sgStr}</span>
  </div>`;
}

function renderSummary() {
  const round = currentRound(); if(!round) return;
  const cats = ['drive', 'approach', 'shortgame', 'putt'];
  const tot = {drive:0, approach:0, shortgame:0, putt:0}, cnt = {drive:0, approach:0, shortgame:0, putt:0};
  const catShots = {drive:[], approach:[], shortgame:[], putt:[]};
  let gTotal = 0, gCount = 0, gStrokes = 0;

  for(const hole of round.holes) {
    const hShots = hole.shots || [];
    gStrokes += countStrokes(hShots);
    for(const s of hShots) {
      if(catShots[s.category]) catShots[s.category].push({...s, holeNum:hole.hole});
      if(s.sg == null) continue; tot[s.category] += s.sg; cnt[s.category]++; gTotal += s.sg; gCount++;
    }
  }

  const fmt = (v, c) => c === 0 ? '—' : (v >= 0 ? '+' : '') + v.toFixed(2);
  const sgCls = (v, c) => c === 0 ? 'sg-null' : v >= 0 ? 'sg-pos' : 'sg-neg';

  const catHTML = cats.map(c => {
    const rows = catShots[c].map(s => buildShotRow(s, `H${s.holeNum}`)).join('');
    const avg = fmt(cnt[c] > 0 ? tot[c] / cnt[c] : 0, cnt[c]);
    return `<div class="summary-stat summary-cat-row" onclick="toggleSummaryCat('${c}')">
        <span class="summary-stat-label">${CAT_LABELS[c]} <span class="ssum-cat-meta">(${cnt[c]} shots)</span></span>
        <span class="ssum-cat-right">
          <span class="ssum-cat-avg">
            <span class="ssum-cat-avg-lbl">avg</span>
            <span class="ssum-cat-avg-val ${sgCls(tot[c],cnt[c])}">${avg}</span>
          </span>
          <span class="summary-stat-val ${sgCls(tot[c],cnt[c])}">${fmt(tot[c],cnt[c])}</span>
          <span class="ssum-chevron" id="ssum-icon-${c}">›</span>
        </span>
      </div>
      <div class="ssum-expand hidden" id="ssum-${c}">${rows || '<div class="ssum-empty">No shots recorded</div>'}</div>`;
  }).join('');

  const holesHTML = round.holes.map(h => {
    const shots = h.shots || []; if(shots.length === 0) return '';
    const hsg = shots.reduce((s, sh) => s + (sh.sg || 0), 0);
    const hStrokes = countStrokes(shots);
    const rows = shots.map(s => buildShotRow(s, CAT_LABELS[s.category] || s.category, 'ssum-hole-cat')).join('');
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

  const byHoleSection = `
    <div class="summary-stat summary-cat-row summary-by-hole-row" onclick="toggleHolesSection()">
      <span class="summary-by-hole-label">SG by Hole</span>
      <span class="ssum-chevron" id="holes-section-chevron">›</span>
    </div>
    <div id="summary-holes-wrap" class="hidden">${holesHTML}</div>`;

  document.getElementById('summary-totals').innerHTML = `
    <div class="summary-stat"><span class="summary-total-label">Total SG <span class="summary-total-sub">(${gStrokes} stroke${gStrokes !== 1 ? 's' : ''})</span></span><span class="summary-total-val ${sgCls(gTotal,gCount)}">${fmt(gTotal,gCount)}</span></div>
    ${catHTML}${byHoleSection}`;

  // Statistics
  const allShots = round.holes.flatMap(h => (h.shots || []).map((s, i) => ({...s, holeNum:h.hole, shotIdx:i})));
  const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
  const fmtFt = v => v != null ? Math.round(v) + ' ft' : '—';
  const fmtYd = v => v != null ? Math.round(v) + ' yds' : '—';
  const statRow = (label, val) => `<div class="sstat-row"><span class="sstat-label">${label}</span><span class="sstat-val">${val}</span></div>`;
  const statGroup = (id, title, rows, headerVal = '') => `
    <div class="summary-stat summary-cat-row" onclick="toggleStatGroup('${id}')">
      <span class="summary-stat-label">${title}${headerVal ? ` <span class="sstat-header-val">${headerVal}</span>` : ''}</span>
      <span class="ssum-chevron" id="sstat-icon-${id}">›</span>
    </div>
    <div class="ssum-expand hidden" id="sstat-${id}">${rows}</div>`;

  // Driving
  const drives = allShots.filter(s => s.category === 'drive' && s.distFrom != null && s.resultDist != null);
  const driveDists = drives.map(s => s.distFrom - s.resultDist);
  const fairwaysHit = drives.filter(s => s.resultLie === 'fairway').length;
  const fairwayTotal = drives.length;
  const fairwayStr = fairwayTotal ? `${fairwaysHit}/${fairwayTotal} (${Math.round(fairwaysHit / fairwayTotal * 100)}%)` : '—';
  const driveStats = statRow('Avg distance', fmtYd(avg(driveDists)))
    + statRow('Longest', fmtYd(driveDists.length ? Math.max(...driveDists) : null))
    + statRow('Fairways hit', fairwayStr);

  // Approach
  const approaches = allShots.filter(s => s.category === 'approach' && s.distFrom != null);
  const holesPlayed = round.holes.filter(h => (h.shots || []).length > 0);
  const girHoles = holesPlayed.filter(h => {
    const regIdx = h.par - 3;
    return (h.shots || []).slice(0, regIdx + 1).some(s => s.resultLie === 'green' || s.resultLie === 'holed');
  });
  const girStr = holesPlayed.length ? `${girHoles.length}/${holesPlayed.length} (${Math.round(girHoles.length / holesPlayed.length * 100)}%)` : '—';
  const approachStats = statRow('Avg distance', fmtYd(avg(approaches.map(s => s.distFrom))))
    + statRow('GIR', girStr);

  // Short Game
  const shortgame = allShots.filter(s => s.category === 'shortgame' && s.distFrom != null);
  const sgProximity = shortgame.filter(s => s.resultLie === 'green' && s.resultDist != null);
  const proximityStr = sgProximity.length ? fmtFt(avg(sgProximity.map(s => s.resultDist))) : '—';
  const shortgameStats = statRow('Avg distance to hole', fmtYd(avg(shortgame.map(s => s.distFrom))))
    + statRow('Avg proximity (on green)', proximityStr);

  // Putting
  const putts = allShots.filter(s => s.category === 'putt');
  const firstPutts = round.holes.map(h => (h.shots || []).find(s => s.category === 'putt')).filter(Boolean);
  const holedPutts = putts.filter(s => s.resultLie === 'holed');
  const puttStats = statRow('Avg first putt', fmtFt(avg(firstPutts.map(s => s.distFrom))))
    + statRow('Avg holed', fmtFt(avg(holedPutts.map(s => s.distFrom))))
    + statRow('Longest holed', fmtFt(holedPutts.length ? Math.max(...holedPutts.map(s => s.distFrom)) : null));

  document.getElementById('summary-stats').innerHTML =
    statGroup('drive', 'Driving', driveStats, fairwayStr)
    + statGroup('approach', 'Approach', approachStats, girStr)
    + statGroup('shortgame', 'Short Game', shortgameStats, proximityStr)
    + statGroup('putt', 'Putting', puttStats);
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
