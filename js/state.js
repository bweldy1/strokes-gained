// ═══════════════════════════════════════════════════════════════
// QUALITY BANDS
// ═══════════════════════════════════════════════════════════════

const quality_band_global = [
  {label:'Exceptional',   min:1,    color:'#00e676'},  // --q-exceptional
  {label:'Excellent',     min:0.5,  color:'#69f0ae'},  // --q-great
  {label:'Above Average', min:0.2,  color:'#a5d6a7'},  // --q-good
  {label:'Neutral',       min:-0.2, color:'#ffca28'},  // --q-average
  {label:'Below Average', min:-0.5, color:'#ffa726'},  // --q-below-avg
  {label:'Poor',          min:-1,   color:'#ef5350'},  // --q-poor
  {label:'Very Poor',     min:-999, color:'#c62828'}   // --q-terrible
];


const QUALITY_BANDS = {
  drive:     quality_band_global,
  approach:  quality_band_global,
  shortgame: quality_band_global,
  putt:      quality_band_global
};

// ═══════════════════════════════════════════════════════════════
// SHARED CONSTANTS
// ═══════════════════════════════════════════════════════════════

const CAT_LABELS = {drive:'Drive', approach:'Approach', shortgame:'Short Game', putt:'Putt'};
const LIE_ABBR   = {tee:'Tee', fairway:'Fwy', rough:'Rgh', sand:'Sand', recovery:'Rcv', green:'Grn', holed:'Holed', penalty:'Pen'};

// ═══════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════

let state = {
  currentRoundId: null,
  currentHole: 1,
  editingShotIndex: null,
  editingCourseId: null,
  excludedCategories: new Set(),
  shotLie: null,
  shotResultLie: null,
  shotCategory: null,
  shotMissDepth: null,
  shotMissSide: null
};

// ═══════════════════════════════════════════════════════════════
// SHARED UTILITIES
// ═══════════════════════════════════════════════════════════════

// Full-unit distance string: "385 yds" or "12 ft"
function formatDist(dist, lie) {
  if(dist == null) return '';
  return lie === 'green' ? dist + ' ft' : dist + ' yds';
}

// CSS class for SG value coloring
function sgClass(sg) {
  return sg == null ? 'sg-null' : sg >= 0 ? 'sg-pos' : 'sg-neg';
}

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
