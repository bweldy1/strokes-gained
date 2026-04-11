# SG Tracker — Claude Context

Mobile-first strokes gained tracker for golf, deployed as a single self-contained `index.html`. Built for iOS Safari (home screen web app).

## Build

```
python build.py
```

Reads `html/app.html`, resolves `<!-- INCLUDE: fragments/foo.html -->` directives, inlines all CSS and JS, stamps `<!-- BUILD_DATE -->`, writes `index.html` to the repo root.

**Never edit `index.html` directly** — it is a build artifact. All source edits go in the files below.

## File Structure

```
html/
  app.html                  # Template: head + INCLUDE directives + script tags
  fragments/
    screen-home.html        # Home screen (recent rounds list)
    screen-courses.html     # Course select + JSON import
    screen-hole.html        # Hole entry (nav, tally bar, shot list)
    screen-summary.html     # Round summary + CSV export
    sheet-shot.html         # Bottom sheet: shot entry form
    sheet-course-edit.html  # Bottom sheet: course name/tees editor
    sheet-yardage.html      # Bottom sheet: yardage override
    sheet-round-edit.html   # Bottom sheet: round date/name editor
css/
  v2.css                    # All styles
js/
  sg_tables.js              # SG lookup tables (lie × distance → expected strokes)
  state.js                  # Quality bands, shared constants/helpers, state object, showToast, formatDate
  storage.js                # localStorage helpers: getRounds, getCourses, currentRound, updateRound, etc.
  sg-engine.js              # interpolate, getExpected, calcSG, getQuality, autoCategory, getSuggestion
  hole.js                   # Hole screen: renderHole, renderShotList, tally, yardage override, round edit
  shot-entry.js             # Shot sheet: all form interactions, selectLie/Category/ResultLie, saveShot
  courses.js                # Courses screen: renderCourses, openCourseEdit, saveCourseJSON, startRound
  summary.js                # Summary screen: renderSummary, stats, CSV export, clipboard
  home.js                   # Home screen + init IIFE (loads last — calls renderHome on startup)
images/
  SG_logo.png               # App icon used on home screen header
```

**Load order matters:** `hole.js` and `shot-entry.js` before `courses.js`/`summary.js` (which use `countStrokes`, `catLabel`); `home.js` last (contains the init IIFE).

## Shot Data Model

Each shot stored in `round.holes[n].shots[]`:

```js
{
  lie: 'tee'|'fairway'|'rough'|'sand'|'recovery'|'green',
  distFrom: Number,                    // yards (feet if lie=green)
  resultLie: 'fairway'|'rough'|'sand'|'recovery'|'green'|'holed'|'penalty',
  resultDist: Number|null,             // yards (feet if resultLie=green); null if holed
  category: 'drive'|'approach'|'shortgame'|'putt',
  sg: Number|null,                     // strokes gained, rounded to 4 decimal places on save
  missDepth: 'short'|'long'|null,
  missSide: 'left'|'middle'|'right'|null,  // OR 'low'|'center'|'high' for putts
}
```

## Key JS Patterns

### State
Single `state` object — never persisted, resets on page load:
```js
let state = { currentRoundId, currentHole, editingShotIndex, editingCourseId, excludedCategories, shotLie, shotResultLie, shotCategory, shotMissDepth, shotMissSide }
```

### Shared Constants and Helpers (`state.js`)
```js
CAT_LABELS  // {drive:'Drive', approach:'Approach', shortgame:'Short Game', putt:'Putt'}
LIE_ABBR    // {tee:'Tee', fairway:'Fwy', rough:'Rgh', sand:'Sand', recovery:'Rcv', green:'Grn', holed:'Holed', penalty:'Pen'}

formatDist(dist, lie)  // → "385 yds" or "12 ft" (full units; used on hole screen)
sgClass(sg)            // → 'sg-pos' | 'sg-neg' | 'sg-null' (CSS class for SG value color)
```

`buildShotRow` in `summary.js` uses compact distance abbreviations (`y`/`ft`) directly — does **not** use `formatDist` since those are summary-view abbreviations, not full units.

### Storage
All data in `localStorage` as JSON. Keys: `sg_rounds`, `sg_courses`.

### Show/Hide Pattern
All conditional visibility uses the `.hidden` CSS utility class (`display: none !important`). Never set `element.style.display` directly.
- Hide: `el.classList.add('hidden')`
- Show: `el.classList.remove('hidden')`
- Toggle: `el.classList.toggle('hidden')` or `el.classList.toggle('hidden', !condition)`
- Check: `el.classList.contains('hidden')`

Elements that start hidden in HTML use `class="hidden"` (not `style="display:none"`).

### SG Value Colors
Three CSS classes cover all SG value coloring — never use inline `style="color:..."` for SG values:
- `.sg-pos` → `var(--q-great)` (green, positive SG)
- `.sg-neg` → `var(--q-poor)` (red, negative SG)
- `.sg-null` → `var(--text-muted)` (grey, no data)

Use `sgClass(sg)` helper to get the right class from a raw SG value (or null).

### Collapsed chip UI (Category, Starting Lie, Distance)
Category, Starting Lie, and Distance from Pin all use a chip-based collapsed pattern:
- A chip (`#category-chip`, `#lie-chip`, `#dist-chip`) shows the current value
- Pills/input expand inline on tap via `toggleCategoryOverride()` / `toggleLieOverride()` / `toggleDistOverride()`
- Selecting a pill updates the chip and auto-collapses via `silent=false` path in `selectCategory()` / `selectLie()`
- Distance chip updates on input via `onDistInput()` and on unit change via `updateDistFromUnit()`
- `renderCategoryChip(cat)`, `renderLieChip(lie)`, `renderDistChip(val, unit)` handle chip DOM updates
- Distance field no longer auto-focuses on sheet open — user taps chip to expand and focus

### Shot Pre-fill (getSuggestion)
`getSuggestion(holeData)` returns `{ lie, dist, hint }` for new shots:
- First shot on a hole → `lie:'tee'`, dist from scorecard
- Subsequent shots → previous shot's `resultLie` and `resultDist`
- The pre-filled distance is shown in the collapsed chip — no separate hint text

When `lie='green'`, `selectLie` also auto-sets `resultLie='green'` if no result lie is set yet.

### Miss Direction
- `selectMissDepth(val)` / `selectMissSide(val)` — toggle behavior (tap selected → deselects)
- Side options swap based on category: putts use Low/Center/High, all others use Left/Middle/Right
- `updateMissSidePills(cat)` rebuilds the side pills and is called from `selectCategory`
- Miss direction group is hidden when result is 'Holed', shown for all other results (including Penalty)

### Penalty Shots
`resultLie: 'penalty'` is a secondary result pill (alongside Sand and Recovery). Behavior:
- Result distance and miss direction are required/shown (same as any non-holed result)
- SG = `getExpected(startLie, startDist) - getExpected('rough', resultDist) - 2` — uses `rough` table as proxy for drop position, subtracts an extra stroke for the penalty
- Shows a red `+1 stroke` badge (`.penalty-badge`) in the shot list row
- `countStrokes(shots)` — helper that returns `shots.length + penalty count`; used everywhere strokes are displayed (home card, summary header, hole rows)
- No auto-fill for the next shot's lie (drop location varies), but result distance carries forward as the distance pre-fill
- `getSuggestion` returns `{ lie: null, dist }` after a penalty; `openShotSheet` guards `selectLie`/`selectCategory` with `if(sug.lie)`

### SG Calculation
`calcSG(startLie, startDist, resultLie, resultDist)` uses `sg_tables.js` lookup tables with linear interpolation. Result is rounded to 4 decimal places before being stored on the shot object.

## CSS Conventions

Dark theme throughout. Key variables: `--sky` (bg), `--card`, `--sheet-bg`, `--fairway` (green accent), `--accent` (red), `--text`, `--text-muted`, `--text-dim`.

Pill variants:
- `.pill` — standard size, full color when `.selected`
- `.pill-sm` — smaller/dimmer for secondary lies (Sand, Recovery) and miss direction

Category badge colors: `.cat-drive` (gold), `.cat-approach` (green), `.cat-shortgame` (light green), `.cat-putt` (blue).

## Lie Hierarchy (UI)

Sand, Recovery, and Penalty are infrequent. In lie pill rows, they appear as secondary pills (`.pill-sm`, `.pill-group-secondary`) below the primary row:
- **Primary result lies**: Fairway · Rough · Green · Holed
- **Secondary result lies**: Sand · Recovery · Penalty
- **Primary starting lies**: Tee · Fairway · Rough · Green
- **Secondary starting lies**: Sand · Recovery

## Round Summary

`renderSummary()` builds two cards: `#summary-totals` and `#summary-stats`. Layout order: SG card → Statistics card → Export.

**summary-totals card** contains three sections:
1. Header row: Total SG + stroke count
2. Category rows (Drive, Approach, Short Game, Putt) — tappable to expand via `toggleSummaryCat(cat)` → `#ssum-{cat}` / `#ssum-icon-{cat}`
   - Expanded rows show: `H1  Tee 385y · 235y drive › Fwy 150y Short-Left  +0.32`
   - Lie abbreviations from `LIE_ABBR`: Tee, Fwy, Rgh, Sand, Rcv, Grn, Holed, Pen
   - Miss in `.ssum-miss` (10px, `--text-dim`); drive distance in `.ssum-drive` (10px, `--text-dim`)
3. **SG by Hole** — collapsible section at the bottom of the card, collapsed by default
   - Toggle row styled as a section divider; `toggleHolesSection()` shows/hides `#summary-holes-wrap` and rotates `#holes-section-chevron`
   - Each hole row shows number, par, stroke count, total SG — tappable to expand via `toggleSummaryHole(holeNum)` → `#ssum-hole-{holeNum}`
   - Expanded hole rows use category name as label (`.ssum-hole-cat`, 62px wide)

**summary-stats card:** four expandable groups — `toggleStatGroup(group)` toggles `#sstat-{group}` / `#sstat-icon-{group}`.
- `statGroup(id, title, rows, headerVal='')` — helper that renders each group; `headerVal` appears inline in the collapsed header (dimmed, 12px) so key stats are visible without expanding
- **Driving** (`group='drive'`): header shows Fairways hit (`n/total (pct%)`); expands to Avg distance, Longest, Fairways hit
  - Fairways hit = drive shots where `resultLie==='fairway'`
- **Approach** (`group='approach'`): header shows GIR (`n/total (pct%)`); expands to Avg distance, GIR
  - GIR = any shot at or before the regulation index (`par-3`) with `resultLie==='green'` or `'holed'`; handles eagle/albatross correctly
- **Short Game** (`group='shortgame'`): header shows Avg proximity (feet); expands to Avg distance to hole (yards), Avg proximity (on green, feet)
  - Avg proximity = avg `resultDist` of shortgame shots where `resultLie==='green'` and `resultDist != null`; excludes missed greens and holed shots; shows `—` if none
- **Putting** (`group='putt'`): Avg first putt distance (first putt per hole), Avg holed distance, Longest holed (all in feet)
- Stat rows use `.sstat-row`, `.sstat-label`, `.sstat-val`

`buildShotRow(s, label, labelClass)` — shared helper used by both drill-downs to render a single shot row.

### Shot List Layout (hole screen)
`renderShotList` renders each shot with result as primary and starting position as secondary:
- **Main line:** `[Category badge]  150 yds · Fairway` — result distance + result lie (lie is muted via `.shot-res-lie`, separated by ` · `); penalty badge appended if applicable
- **Sub line:** `Tee · 385 yds · 235 yds drive · Short-Left` — start lie, start dist, drive distance (Drive shots only, `.shot-drive-dist`), miss direction
- Holed example: `[Drive]  Holed ⛳` / `Tee · 385 yds · 235 yds drive`
- Drive distance calculated as `distFrom - resultDist`, shown in `.shot-drive-dist` (12px, `--text-dim`)

Both use `countStrokes(shots)` for stroke totals (adds +1 per penalty shot).

## Screen Navigation

`showScreen(name)` — shows `#screen-{name}`, hides all others, calls the matching render function. Screens: `home`, `courses`, `hole`, `summary`.

The hole screen topbar uses a `⌂` home icon (`.btn-icon`) to navigate back to the home screen — intentionally distinct from the `‹ ›` hole navigation arrows.

## CSV Export

`exportCSV()` — full shot-level CSV with columns: Hole, Par, Yardage, Shot#, Lie, Dist From, Dist Unit, Result Lie, Result Dist, Result Unit, Category, SG, Miss Depth, Miss Side.

`exportSummaryCSV()` — one row per round with SG totals by category.

Both use a clipboard fallback modal for iOS Safari compatibility.

## Course Management

Courses screen shows each course as a card. Each card has two action buttons (rendered via `renderCourses`):
- **✎ edit** — calls `openCourseEdit(id)`, opens `#course-edit-sheet` with name + tees inputs
- **× delete** — calls `deleteCourse(id)`, shows `confirm()` dialog before deleting

Buttons use `event.stopPropagation()` to prevent triggering `startRound`.

### Course Edit Sheet (`sheet-course-edit.html`)
- Fields: Name, Tees
- Save: `saveCourseEdit()` — updates course in-place by id, closes sheet
- "Edit holes in JSON ›": `loadCourseHolesJSON()` — pre-fills the JSON import textarea with current course data and closes sheet; user edits and re-saves via existing JSON flow
- Overlay click to dismiss: `handleCourseEditOverlayClick(e)`
- Active course being edited stored in `state.editingCourseId`

### JSON import (`saveCourseJSON`)
Updated to replace existing course if `c.id` matches an existing entry, rather than always pushing a new one. This supports the "edit holes in JSON" workflow.

### Data safety
Rounds store `courseName` at creation time — deleting a course does **not** affect existing round data.
