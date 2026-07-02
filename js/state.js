// ═══════════════════════════════════════════════════════════════
// CLUBS
// cats: which categories this club appears in on the shot entry form.
// ═══════════════════════════════════════════════════════════════

const CLUBS = [
  { id: 'driver', label: 'Drv',    cats: ['drive'] },
  { id: '3w',     label: '3 W',    cats: ['drive', 'approach'] },
  { id: '5w',     label: '5-W',    cats: ['drive', 'approach'] }, 
  { id: '7w',     label: '7-W',    cats: ['drive', 'approach'] },
  { id: '3h',     label: '3-H',    cats: ['drive', 'approach'] },
  { id: '4h',     label: '4-H',    cats: ['drive', 'approach'] },
  { id: '5h',     label: '5-H',    cats: ['drive', 'approach'] },
  { id: '3i',     label: '3-I',    cats: ['approach'] },
  { id: '4i',     label: '4-I',    cats: ['approach'] },
  { id: '5i',     label: '5-I',    cats: ['approach'] },
  { id: '6i',     label: '6-I',    cats: ['approach'] },
  { id: '7i',     label: '7-I',    cats: ['approach', 'shortgame'] },
  { id: '8i',     label: '8-I',    cats: ['approach', 'shortgame'] },
  { id: '9i',     label: '9-I',    cats: ['approach', 'shortgame'] },
  { id: 'pw',     label: 'PW',     cats: ['approach', 'shortgame'] },
  { id: 'gw',     label: 'GW',     cats: ['approach', 'shortgame'] },
  { id: 'sw',     label: 'SW',     cats: ['approach', 'shortgame'] },
  { id: 'lw',     label: 'LW',     cats: ['approach', 'shortgame'] },
  { id: '50',     label: '50',     cats: ['approach', 'shortgame'] },
  { id: '52',     label: '52',     cats: ['approach', 'shortgame'] },
  { id: '54',     label: '54',     cats: ['approach', 'shortgame'] },
  { id: '56',     label: '56',     cats: ['approach', 'shortgame'] },
  { id: '58',     label: '58',     cats: ['approach', 'shortgame'] },
  { id: '60',     label: '60',     cats: ['approach', 'shortgame'] }
];

// ═══════════════════════════════════════════════════════════════
// DIFFICULTY CONDITIONS
// Per-category percentage impact (whole numbers: 5 = 5%).
// drive/approach/shortgame/putt = 0 means no effect on that category.
// ═══════════════════════════════════════════════════════════════

const DIFFICULTY_CONDITIONS = [
  { id: 'cold',       label: 'Cold (below 50°F)', drive: 1, approach: 1, shortgame: 1, putt: 1 },
  { id: 'rain',       label: 'Rain',              drive: 2, approach: 2, shortgame: 2, putt: 2 },
  { id: 'wet',        label: 'Wet course',        drive: 1, approach: 0, shortgame: 1, putt: 0 },
  { id: 'wind',       label: 'Strong wind',       drive: 2, approach: 2, shortgame: 1, putt: 0 },
  { id: 'bumpy',      label: 'Bumpy greens',      drive: 0, approach: 0, shortgame: 0, putt: 3 },
  { id: 'rough',      label: 'Thick rough',       drive: 0, approach: 2, shortgame: 2, putt: 0 },
  { id: 'firmgreens', label: 'Extra firm greens', drive: 0, approach: 2, shortgame: 1, putt: 0 },
];

// ═══════════════════════════════════════════════════════════════
// QUALITY BANDS
// ═══════════════════════════════════════════════════════════════

const quality_band_global = [
  {label:'Exceptional',   min:1,    color:'var(--q-exceptional)'},
  {label:'Excellent',     min:0.5,  color:'var(--q-great)'},
  {label:'Above Average', min:0.2,  color:'var(--q-good)'},
  {label:'Neutral',       min:-0.2, color:'var(--q-average)'},
  {label:'Below Average', min:-0.5, color:'var(--q-below-avg)'},
  {label:'Poor',          min:-1,   color:'var(--q-poor)'},
  {label:'Very Poor',     min:-999, color:'var(--q-terrible)'}
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
const LIE_ABBR   = {tee:'Tee', fairway:'Fwy', rough:'Rgh', sand:'Sand', recovery:'Rcv', green:'Grn', holed:'Holed', penalty:'Pen', ob:'OB'};

// Distance buckets for category drill-down analysis.
// distFrom unit: feet for putt, yards for all others.
// Drive buckets use hole yardage (distFrom on a drive = distance to pin from tee).
// Short Game upper bound matches autoCategory threshold (< 30 yds).
const SG_BUCKETS = {
  putt: [
    {label:'0–3 ft',   min:0,   max:3},
    {label:'4–8 ft',   min:4,   max:8},
    {label:'9–15 ft',  min:9,   max:15},
    {label:'16–25 ft', min:16,  max:25},
    {label:'26+ ft',   min:26,  max:Infinity},
  ],
  shortgame: [
    {label:'0–15 yds', min:0,   max:15},
    {label:'16–30 yds',min:16,  max:Infinity},
  ],
  approach: [
    {label:'< 75 yds',   min:0,   max:75},
    {label:'76–100 yds', min:76,  max:100},
    {label:'101–125 yds',min:101, max:125},
    {label:'126–150 yds',min:126, max:150},
    {label:'151–175 yds',min:151, max:175},
    {label:'176+ yds',   min:176, max:Infinity},
    {label:'Recovery',   lie:'recovery'},
  ],
  drive: [
    {label:'< 350 yds',   min:0,   max:350},
    {label:'351–400 yds', min:351, max:400},
    {label:'401+ yds',    min:401, max:Infinity},
  ],
};

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
  shotMissSide: null,
  shotMissType: null,
  shotClub: null,
  targetsExpanded: false,
  trendsFilter: 10,
  trendsExclude: false,
  trendsChartCat: 'total'
};

// ═══════════════════════════════════════════════════════════════
// SHARED UTILITIES
// ═══════════════════════════════════════════════════════════════

// Full-unit distance string: "385 yds" or "12 ft"
function formatDist(dist, lie) {
  if(dist == null) return '';
  return lie === 'green' ? dist + ' ft' : dist + ' yds';
}

function getRoundDifficultyPct(conditions, category) {
  if(!conditions || conditions.length === 0) return 0;
  return conditions.reduce((total, id) => {
    const c = DIFFICULTY_CONDITIONS.find(d => d.id === id);
    return total + (c ? (c[category] || 0) : 0);
  }, 0);
}

function getExcludedSet(round) {
  return new Set((round.excludedShots || []).map(e => `${e.hole}-${e.shotIndex}`));
}

function getHoleOutDist() {
  return parseInt(localStorage.getItem('sg_holeOutDist')) || 2;
}

function getActiveClubs() {
  const stored = localStorage.getItem('sg_activeClubs');
  if(!stored) return new Set(CLUBS.map(c => c.id));
  try { return new Set(JSON.parse(stored)); } catch { return new Set(CLUBS.map(c => c.id)); }
}

// ═══════════════════════════════════════════════════════════════
// SETTINGS REGISTRY
// ═══════════════════════════════════════════════════════════════

const SETTINGS = {};

// Register a pill-based setting. selector/dataAttr identify the toggle pills;
// onApply handles any side effects beyond pill highlighting.
function registerSetting(key, defaultVal, selector, dataAttr, onApply) {
  SETTINGS[key] = {
    get() {
      const stored = localStorage.getItem(key);
      if(stored === null) return defaultVal;
      return typeof defaultVal === 'boolean' ? stored === 'true' : stored;
    },
    apply() {
      const val = this.get();
      if(selector) document.querySelectorAll(selector).forEach(p =>
        p.classList.toggle('selected', p.dataset[dataAttr] === String(val))
      );
      if(onApply) onApply(val);
    },
    set(val) {
      localStorage.setItem(key, String(val));
      this.apply();
    }
  };
}

function getSetting(key) {
  return SETTINGS[key] ? SETTINGS[key].get() : null;
}

function setSetting(key, val) {
  if(SETTINGS[key]) SETTINGS[key].set(val);
}

function applyAllSettings() {
  Object.values(SETTINGS).forEach(s => s.apply());
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
