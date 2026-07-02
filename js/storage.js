// ═══════════════════════════════════════════════════════════════
// STORAGE
// Reads are cached: localStorage JSON is parsed once, then the same
// array is returned on every get until the matching save replaces it.
// Callers must treat returned arrays/objects as shared — never mutate
// without calling the matching save (or updateRound) afterwards.
// ═══════════════════════════════════════════════════════════════

let _roundsCache = null, _coursesCache = null, _yardagesCache = null;

function getRounds() {
  if(_roundsCache === null) {
    try { _roundsCache = JSON.parse(localStorage.getItem('sg_rounds') || '[]'); } catch(e) { _roundsCache = []; }
  }
  return _roundsCache;
}
function saveRounds(r) {
  _roundsCache = r;
  localStorage.setItem('sg_rounds', JSON.stringify(r));
}
function getCourses() {
  if(_coursesCache === null) {
    try { _coursesCache = JSON.parse(localStorage.getItem('sg_courses') || '[]'); } catch(e) { _coursesCache = []; }
  }
  return _coursesCache;
}
function saveCourses(c) {
  _coursesCache = c;
  localStorage.setItem('sg_courses', JSON.stringify(c));
}
function getRound(id) { return getRounds().find(r => r.id === id); }
function updateRound(round) {
  const rs = getRounds();
  const i = rs.findIndex(r => r.id === round.id);
  if(i >= 0) rs[i] = round; else rs.unshift(round);
  saveRounds(rs);
}
function currentRound()    { return getRound(state.currentRoundId); }
function currentHoleData() { const r = currentRound(); return r ? r.holes[state.currentHole - 1] : null; }
function getYardages() {
  if(_yardagesCache === null) {
    try { _yardagesCache = JSON.parse(localStorage.getItem('sg_yardages') || '[]'); } catch(e) { _yardagesCache = []; }
  }
  return _yardagesCache;
}
function saveYardages(y) {
  _yardagesCache = y;
  localStorage.setItem('sg_yardages', JSON.stringify(y));
}
