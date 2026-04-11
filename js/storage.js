// ═══════════════════════════════════════════════════════════════
// STORAGE
// ═══════════════════════════════════════════════════════════════

function getRounds()  { try { return JSON.parse(localStorage.getItem('sg_rounds') || '[]'); } catch(e) { return []; } }
function saveRounds(r){ localStorage.setItem('sg_rounds', JSON.stringify(r)); }
function getCourses() { try { return JSON.parse(localStorage.getItem('sg_courses') || '[]'); } catch(e) { return []; } }
function saveCourses(c){ localStorage.setItem('sg_courses', JSON.stringify(c)); }
function getRound(id) { return getRounds().find(r => r.id === id); }
function updateRound(round) {
  const rs = getRounds();
  const i = rs.findIndex(r => r.id === round.id);
  if(i >= 0) rs[i] = round; else rs.unshift(round);
  saveRounds(rs);
}
function currentRound()    { return getRound(state.currentRoundId); }
function currentHoleData() { const r = currentRound(); return r ? r.holes[state.currentHole - 1] : null; }
