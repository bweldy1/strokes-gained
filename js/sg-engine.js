// ═══════════════════════════════════════════════════════════════
// SG ENGINE
// ═══════════════════════════════════════════════════════════════

function interpolate(table, dist) {
  if(!table || table.length === 0) return null;
  if(dist <= table[0][0]) return table[0][1];
  if(dist >= table[table.length - 1][0]) return table[table.length - 1][1];
  for(let i = 0; i < table.length - 1; i++) {
    const [d1, v1] = table[i], [d2, v2] = table[i + 1];
    if(dist >= d1 && dist <= d2) return v1 + ((dist - d1) / (d2 - d1)) * (v2 - v1);
  }
  return null;
}

function getExpected(lie, dist) { return interpolate(SG_TABLES[lie], dist); }

function calcSG(startLie, startDist, resultLie, resultDist) {
  if(resultLie === 'holed') {
    const s = getExpected(startLie, startDist);
    return s !== null ? s - 1 : null;
  }
  // Penalty: use 'rough' table for drop position, subtract extra stroke for the penalty
  const lookupLie = resultLie === 'penalty' ? 'rough' : resultLie;
  const s = getExpected(startLie, startDist), e = getExpected(lookupLie, resultDist);
  const penaltyStroke = resultLie === 'penalty' ? 1 : 0;
  return (s === null || e === null) ? null : s - e - 1 - penaltyStroke;
}

function getQuality(sg, category) {
  const bands = QUALITY_BANDS[category] || QUALITY_BANDS.approach;
  for(const b of bands) { if(sg >= b.min) return b; }
  return bands[bands.length - 1];
}

// ═══════════════════════════════════════════════════════════════
// CATEGORY AUTO-ASSIGN
// ═══════════════════════════════════════════════════════════════

function autoCategory(lie, distYards, shotIndex, holePar) {
  if(lie === 'green') return 'putt';
  if(shotIndex === 0 && (holePar === 4 || holePar === 5)) return 'drive';
  if(distYards >= 30) return 'approach';
  return 'shortgame';
}

// ═══════════════════════════════════════════════════════════════
// PRE-FILL: suggest lie+dist for next shot from prev shot result
// ═══════════════════════════════════════════════════════════════

function getSuggestion(holeData) {
  const shots = holeData.shots || [];
  if(shots.length === 0) {
    const yards = holeData.yardsOverride || holeData.yards;
    return { lie:'tee', dist:yards, hint:'Scorecard: ' + yards + ' yds from tee' };
  }
  const prev = shots[shots.length - 1];
  if(!prev.resultLie || prev.resultLie === 'holed') return null;
  if(prev.resultLie === 'penalty') {
    const dist = prev.resultDist;
    return dist != null ? { lie:null, dist, hint:'From shot ' + shots.length + ': penalty drop · ' + dist + ' yds' } : null;
  }
  const lie = prev.resultLie;
  const dist = prev.resultDist;
  const distLabel = lie === 'green' ? (dist != null ? dist + ' ft' : '') : (dist != null ? dist + ' yds' : '');
  return { lie, dist: dist || '', hint:'From shot ' + shots.length + ': ' + lie + (distLabel ? ' · ' + distLabel : '') };
}
