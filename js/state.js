// ═══════════════════════════════════════════════════════════════
// QUALITY BANDS
// ═══════════════════════════════════════════════════════════════

const quality_band_global = [
  {label:'Exceptional',   min:1,    color:'#37ec98'},
  {label:'Excellent',     min:0.5,  color:'#52b788'},
  {label:'Above Average', min:0.2,  color:'#74c69d'},
  {label:'Neutral',       min:-0.2, color:'#f5b17a'},
  {label:'Below Average', min:-0.5, color:'#bb7b6b'},
  {label:'Poor',          min:-1,   color:'#e76f51'},
  {label:'Very Poor',     min:-999, color:'#f32548'}
];

const QUALITY_BANDS = {
  drive:     quality_band_global,
  approach:  quality_band_global,
  shortgame: quality_band_global,
  putt:      quality_band_global
};

// ═══════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════

let state = {
  currentRoundId: null,
  currentHole: 1,
  editingShotIndex: null,
  excludedCategories: new Set(),
  shotLie: null,
  shotResultLie: null,
  shotCategory: null,
  shotMissDepth: null,
  shotMissSide: null
};

let editingCourseId = null;

// ═══════════════════════════════════════════════════════════════
// SHARED UTILITIES
// ═══════════════════════════════════════════════════════════════

function formatDate(iso) {
  if(!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'});
}

let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
}
