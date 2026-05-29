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
    screen-home.html        # Home screen (recent rounds list + Analysis button)
    screen-courses.html     # Course select + JSON import
    screen-hole.html        # Hole entry (nav, tally bar, shot list)
    screen-summary.html     # Round summary + CSV export
    screen-scorecard.html   # Scorecard view (reached via "Show Scorecard" button on summary)
    screen-trends.html      # Cross-round trends: filter + category avg SG + bucket drill-down
    sheet-shot.html         # Bottom sheet: shot entry form
    sheet-course-edit.html  # Bottom sheet: course name/tees editor
    sheet-yardage.html      # Bottom sheet: yardage override
    sheet-round-edit.html   # Bottom sheet: round date/name/conditions/notes editor
    sheet-settings.html     # Bottom sheet: settings menu (backup, restore)
css/
  v2.css                    # All styles
js/
  sg_tables.js              # SG lookup tables (lie × distance → expected strokes)
  state.js                  # Quality bands, DIFFICULTY_CONDITIONS, CLUBS, shared constants/helpers, state object, showToast, formatDate
  storage.js                # localStorage helpers: getRounds, getCourses, currentRound, updateRound, etc.
  sg-engine.js              # interpolate, getExpected, calcSG, getQuality, autoCategory, getSuggestion
  hole.js                   # Hole screen: renderHole, renderShotList, holeOut, tally, yardage override, round edit, recalcRoundShots, toggleCondition
  shot-entry.js             # Shot sheet: all form interactions, selectLie/Category/ResultLie, saveShot
  courses.js                # Courses screen: renderCourses, openCourseEdit, saveCourseJSON, startRound
  summary.js                # Summary screen: renderSummary, stats, CSV export, clipboard; toggleShotExclusion, clearAllExclusions
  trends.js                 # Trends screen: renderTrends, setTrendsFilter, setTrendsExclude, toggleTrendsCat
  home.js                   # Home screen + init IIFE (loads last — calls renderHome on startup); settings sheet (backup/restore)
images/
  SG_logo.png               # App icon used on home screen header
```

**Load order matters:** `hole.js` and `shot-entry.js` before `courses.js`/`summary.js` (which use `countStrokes`, `catLabel`); `trends.js` before `home.js`; `home.js` last (contains the init IIFE).

## Data Models

### Round Data Model

Each round stored in `sg_rounds` (localStorage) includes:
```js
{
  id: 'round_' + Date.now(),
  date: String,              // ISO date string
  courseName: String,
  courseId: String,
  conditions: [],            // array of DIFFICULTY_CONDITIONS ids (e.g. ['cold', 'wind'])
  notes: '',                 // free-text round notes (empty string default)
  excludedShots: [],         // array of {hole, shotIndex} for shots excluded from SG totals
  holes: [{ hole, par, yards, yardsOverride, shots }]
}
```
`conditions` defaults to `[]` on new rounds (`startRound`). Older rounds without this field are treated as having no conditions wherever `round.conditions || []` is used.

`notes` defaults to `''`. Older rounds without the field are treated as having no note wherever `round.notes || ''` is used.

`excludedShots` defaults to `[]`. Older rounds without the field are treated as having no exclusions wherever `getExcludedSet(round)` is used.

### Shot Data Model

Each shot stored in `round.holes[n].shots[]`:

```js
{
  lie: 'tee'|'fairway'|'rough'|'sand'|'recovery'|'green',
  distFrom: Number,                    // yards (feet if lie=green)
  resultLie: 'fairway'|'rough'|'sand'|'recovery'|'green'|'holed'|'penalty',
  resultDist: Number|null,             // yards (feet if resultLie=green); null if holed
  category: 'drive'|'approach'|'shortgame'|'putt',
  sg: Number|null,                     // strokes gained, rounded to 4 decimal places on save
  missDepth: 'short'|'even'|'long'|null,   // 'even' = pin high / on-line; null in older data (treated as 'even')
  missSide: 'left'|'middle'|'right'|null,  // OR 'low'|'center'|'high' for putts
  missType: 'read'|'pace'|'push'|'pull'|null,  // putt miss type; null if non-putt, holed, or not recorded
  club: String|null,                           // club used (CLUBS id); null if not recorded or putt
}
```

## Key JS Patterns

### State
Single `state` object — never persisted, resets on page load:
```js
let state = { currentRoundId, currentHole, editingShotIndex, editingCourseId, excludedCategories, shotLie, shotResultLie, shotCategory, shotMissDepth, shotMissSide, shotMissType, shotClub, targetsExpanded, trendsFilter, trendsExclude }
```

### Shared Constants and Helpers (`state.js`)
```js
CAT_LABELS  // {drive:'Drive', approach:'Approach', shortgame:'Short Game', putt:'Putt'}
LIE_ABBR    // {tee:'Tee', fairway:'Fwy', rough:'Rgh', sand:'Sand', recovery:'Rcv', green:'Grn', holed:'Holed', penalty:'Pen'}

formatDist(dist, lie)      // → "385 yds" or "12 ft" (full units; used on hole screen)
sgClass(sg)                // → 'sg-pos' | 'sg-neg' | 'sg-null' (CSS class for SG value color)
getExcludedSet(round)      // → Set<"hole-shotIndex"> for O(1) exclusion lookup
```

`buildShotRow` in `summary.js` uses compact distance abbreviations (`y`/`ft`) directly — does **not** use `formatDist` since those are summary-view abbreviations, not full units.

### Storage
All data in `localStorage` as JSON. Keys: `sg_rounds`, `sg_courses`, `sg_colorScheme`, `sg_holeOutDist`, `sg_activeClubs`, `sg_clubAutoExpand`, `sg_missAutoExpand`.

### Show/Hide Pattern
All conditional visibility uses the `.hidden` CSS utility class (`display: none !important`). Never set `element.style.display` directly.
- Hide: `el.classList.add('hidden')`
- Show: `el.classList.remove('hidden')`
- Toggle: `el.classList.toggle('hidden')` or `el.classList.toggle('hidden', !condition)`
- Check: `el.classList.contains('hidden')`

Elements that start hidden in HTML use `class="hidden"` (not `style="display:none"`).

### SG Value Colors
Two tiers of coloring:

**Individual shot SG values** (shot list, summary drill-downs): use `getQuality(sg, category).color` as inline style — full 7-band color from `quality_band_global`. The SG number color always matches the quality band. Null SG uses `var(--text-muted)`.

**Aggregate SG values** (category totals, hole totals, round total on home screen): use `sgClass(sg)` / `sgCls(v, c)` which return CSS classes:
- `.sg-pos` → `var(--q-great)`
- `.sg-neg` → `var(--q-poor)`
- `.sg-null` → `var(--text-muted)`

Quality bands and CSS variables are aligned — each band color has a matching CSS var (`--q-exceptional`, `--q-great`, `--q-good`, `--q-average`, `--q-below-avg`, `--q-poor`, `--q-terrible`). The quality dot has been removed from the shot list — the SG number color alone conveys quality.

**Color scheme:** The user can switch schemes in Settings. `quality_band_global` colors are `var(--q-*)` references (not hardcoded hex), so all inline-styled shot colors and CSS-class-based aggregate colors respond automatically when the scheme changes. Schemes are defined as CSS attribute selectors and applied by setting `data-scheme` on `<html>`:
- `classic` (default): green → amber → red
- `dusk`: gold → gray → purple (avoids red)

Color scheme is a registered setting (see [Settings Registry](#settings-registry)). The `onApply` callback sets `data-scheme` on `<html>`; pill highlighting is handled automatically. `applyAllSettings()` is called once in the init IIFE.

### Shot Setup summary group (Category, Starting Lie, Distance)
Category, Starting Lie, and Distance are grouped under a single collapsible summary row (`#shot-meta-group`) to reduce form height when values are pre-filled.

**Collapsed state** — a single line: `SHOT SETUP  [cat badge] · [lie chip] · dist  expand ›`
- `renderShotMetaSummary()` rebuilds this line; called from `selectCategory`, `selectLie`, `onDistInput`, and `openShotSheet` (after pre-fill)
- `toggleShotMetaExpand()` toggles `#shot-meta-expand`, updates `#shot-meta-chevron-hint` (`expand ›` / `∨`), and hides/shows `#shot-meta-label`; also closes any open sub-expands when collapsing

**Expanded state** — reveals the three chip rows (Category, Starting Lie, Distance) in their existing individual chip pattern:
- A chip (`#category-chip`, `#lie-chip`, `#dist-chip`) shows the current value
- Pills/input expand inline on tap via `toggleCategoryOverride()` / `toggleLieOverride()` / `toggleDistOverride()`
- Selecting a pill updates the chip and auto-collapses via `silent=false` path in `selectCategory()` / `selectLie()`
- Distance chip updates on input via `onDistInput()` and on unit change via `updateDistFromUnit()`
- `renderCategoryChip(cat)`, `renderLieChip(lie)`, `renderDistChip(val, unit)` handle chip DOM updates
- Nested chip rows use `.form-group-inner` / `.form-group-inner-last` for tighter spacing inside the expand

**Auto-expand on open** — after `prefillShotSheet` runs, `openShotSheet` checks if any of lie, category, or distance is missing; if so, `#shot-meta-expand` opens automatically and individual sub-rows for the missing fields also open (via `classList.remove('hidden')` on their pill-expand divs). If all values are pre-filled, the section stays collapsed.

**Shot sheet function structure (`shot-entry.js`):**
- `resetShotSheet()` — clears all state fields and resets every DOM element to blank/hidden
- `prefillShotSheet(editIndex)` — populates from an existing shot (edit path) or `getSuggestion` (new shot path)
- `openShotSheet(editIndex)` — thin orchestrator: sets `editingShotIndex` + title, calls reset → prefill → finalize (update units/visibility/preview/meta summary/auto-expand) → opens sheet

### Shot Pre-fill (getSuggestion)
`getSuggestion(holeData)` returns `{ lie, dist, hint }` for new shots:
- First shot on a hole → `lie:'tee'`, dist from scorecard
- Subsequent shots → previous shot's `resultLie` and `resultDist`
- The pre-filled distance is shown in the collapsed chip — no separate hint text

When `lie='green'`, `selectLie` also auto-sets `resultLie='green'` if no result lie is set yet.

### Hole-Out Prompt
A one-tap shortcut that appears on the hole screen when the last recorded shot has `resultLie === 'green'` and `resultDist <= getHoleOutDist()`. Rendered as a `<button#hole-out-prompt>` using the same `.add-shot-btn` class, sitting side-by-side with the Add Shot button inside `#hole-actions` (a flex row). `renderShotList` shows/hides it and populates `#hole-out-dist` with the distance in feet.

Tapping calls `holeOut()` (`hole.js`), which auto-saves a shot with no confirmation:
- `lie: 'green'`, `distFrom: <prev resultDist>`, `resultLie: 'holed'`, `resultDist: null`
- `category: 'putt'`, SG calculated via `calcSG`, no miss data (`missDepth/missSide/missType: null`)

After saving: `renderHole()`, `updateTally()`, and a "Holed out ⛳" toast. The prompt disappears because the new last shot is `resultLie: 'holed'`, which fails the trigger condition. If the user ignores the prompt and taps Add Shot instead, the normal shot sheet opens pre-filled to green at the remaining distance.

**Threshold setting:** `getHoleOutDist()` (`state.js`) reads `sg_holeOutDist` from `localStorage`, defaulting to `2`. Configurable via a 1–10 ft slider in Settings → Appearance. `setHoleOutDist(n)` persists the value and calls `applyHoleOutDist(n)` to sync the slider position and label. Both `renderShotList` and `holeOut()` call `getHoleOutDist()` so the display and save guard stay in sync.

### Short Game definition
Short Game = any non-putt, non-drive shot from **under 30 yards** (`autoCategory` returns `'shortgame'` when `distYards < 30`). Chips, pitches, and bunker shots within 30 yards. Users can manually override category on any shot.

### Miss Direction
- Rendered as a 3×3 grid: rows are Long / (unlabeled) / Short, columns are Left/Middle/Right (or Low/Center/High for putts)
- The middle row has no depth label and stores `missDepth: 'even'`; it represents pin-high / on-line direction only
- `selectMissCombo(depth, side)` — selects both depth and side in one tap; tap the selected cell again to deselect
- `selectMissDepth(val)` / `selectMissSide(val)` — still available for programmatic use (e.g. pre-filling on edit)
- `updateMissGrid(cat)` rebuilds the grid and is called from `selectCategory`; handles putt vs non-putt column labels
- Grid cells are fixed `40px` tall via `grid-auto-rows`; flexbox centers content within each cell
- Miss direction group is hidden when result is 'Holed', shown for all other results (including Penalty)

### Putt Miss Type
- Optional classification of *why* a putt missed; appears as 4 pills below the miss direction grid
- Only shown when category = Putt and result ≠ Holed; hidden and cleared otherwise
- Values: `'read'` (wrong line/break), `'pace'` (wrong speed), `'push'` (struck right of intended), `'pull'` (struck left of intended)
- `selectMissType(val)` — tap to select, tap again to deselect; stored in `state.shotMissType`
- `updateMissTypeVisibility()` — called from `selectResultLie` and `selectCategory` to show/hide and clear
- `buildMissType(shots)` in `summary.js` renders a 4-tile breakdown (%, count per type) below `buildMissGrid` in putt drill-downs in both summary and trends screens; only appears when at least one shot has `missType` set

### Club Tracking

An optional field on the shot entry form for recording which club was used. Appears between Distance and Result Lie; hidden entirely for putts.

- **`CLUBS` constant (`state.js`)** — ordered array of `{ id, label, cats }` where `cats` is the list of categories the club appears in:
  - **Drive only**: Drv
  - **Drive + Approach**: 3 W, 5-W, 7-W, 3-H, 4-H, 5-H
  - **Approach only**: 3-I–6-I
  - **Approach + Short Game**: 7-I–9-I, PW, GW, SW, LW, 50°–60° (even degrees)
- **Labels are short-form** (e.g. `Drv`, `3 W`, `3-H`, `3-I`) to fit pill UI; full names are not used
- **My Clubs pills are generated dynamically** — `applyActiveClubs()` populates `#club-toggle-pills` from `CLUBS` on first call; no hardcoded buttons in HTML. Adding or renaming a club in `CLUBS` automatically appears in settings.
- `state.shotClub` — the selected club id, or `null`
- `updateClubGroup(cat)` — shows/hides `#club-group` and rebuilds `#club-pills` filtered to the current category; called from `selectCategory()`. Hidden when `cat` is `null` or `'putt'`, clears `state.shotClub` in those cases.
- `selectClub(id, silent)` — tap to select, tap again to deselect; updates `state.shotClub`, toggles `.selected` on pills via `data-club` attribute, updates chip; collapses expand on non-silent select
- `renderClubChip(club)` — updates `#club-chip` with the club label or `—`
- `toggleClubOverride()` — expands/collapses `#club-pills-expand`
- Saved as `club: state.shotClub || null` on the shot object; older shots without the field are treated as `null`
- Pre-filled on edit via `if(s.club) selectClub(s.club, true)` after `selectCategory` (which builds the pill list first)

`buildClubRows(shots)` (`summary.js`) — renders a "By Club" breakdown below miss direction in each non-putt category's expand section (summary + analysis). Uses `CLUBS` ordering. Shows avg SG and total SG per club alongside shot count. Only appears when at least one shot has a club recorded; shows metadata of how many shots have club data vs total.

### What If? Targets
An on-demand shot expectation tool in the SG preview area of the shot entry sheet. Lets the golfer see what result distance corresponds to neutral SG (0.00) and a good result (+0.25) before — or after — recording a shot.

- **Trigger:** "What If? ›" link appears in the SG preview area as soon as `shotLie` and `distFrom` are set; stays visible even after a result is entered
- **Toggle:** `toggleTargets()` expands/collapses `#sg-targets-expand`; chevron changes › / ∨; state tracked in `state.targetsExpanded`
- **Compute:** `updateTargets()` calls `getExpected(shotLie, dist)` for the starting expected strokes, then inverts the table via `findResultDist(targetExpected, resultLie)` — a 40-iteration binary search returning the distance where `getExpected(resultLie, x) ≈ targetExpected`
- **Result lie selection:**
  - Compute neutral target on green first
  - If that distance > 50 ft or out of range → shot is not realistically going for the green → use `'fairway'`, display as "≤ X yds remaining"
  - Otherwise → use `'green'`, display as "≤ X ft on green"
  - This single rule handles tee shots, long par-5 approaches, and short-range shots consistently
- **Null result:** if the target requires holing out (green) or is out of table range (fairway), shows "Hole out" or "—" respectively
- `findResultDist` bounds: green = 1–120 ft, fairway = 10–400 yds
- Called from `updateSGPreview` whenever targets are expanded and start data changes

### Penalty Shots
`resultLie: 'penalty'` is a secondary result pill (alongside Sand and Recovery). Behavior:
- Result distance and miss direction are required/shown (same as any non-holed result)
- SG = `getExpected(startLie, startDist) - getExpected('rough', resultDist) - 2` — uses `rough` table as proxy for drop position, subtracts an extra stroke for the penalty
- Shows a red `+1 stroke` badge (`.penalty-badge`) in the shot list row
- `countStrokes(shots)` — helper that returns `shots.length + penalty count`; used everywhere strokes are displayed (home card, summary header, hole rows)
- No auto-fill for the next shot's lie (drop location varies), but result distance carries forward as the distance pre-fill
- `getSuggestion` returns `{ lie: null, dist }` after a penalty; `prefillShotSheet` guards `selectLie`/`selectCategory` with `if(sug.lie)`

### SG Calculation
`calcSG(startLie, startDist, resultLie, resultDist, diffPct)` uses `sg_tables.js` lookup tables with linear interpolation. Result is rounded to 4 decimal places before being stored on the shot object.

`diffPct` is the optional playing conditions adjustment (a whole-number percentage). The adjustment is `adj = E(startLie, startDist) * diffPct / 100`, added to the raw SG — so harder conditions (more expected strokes) yield a larger absolute bonus for the same relative difficulty. When `diffPct` is `0` or omitted, behavior is unchanged.

### Playing Conditions

Rounds can have playing conditions set in Round Details (tap the course name or date on the hole screen). Conditions affect SG by adding a per-category percentage of `E(start)` to each shot's SG value. This means a 30 ft putt gets a larger absolute adjustment than a 3 ft putt, scaling naturally with shot difficulty.

**Condition definitions (`DIFFICULTY_CONDITIONS` in `state.js`):**
```js
{ id, label, drive, approach, shortgame, putt }
// each category field is a whole-number % (0 = no effect on that category)
```

Current conditions and their per-category percentages:

| Condition       | Drive | Approach | Short Game | Putt |
|-----------------|-------|----------|------------|------|
| Cold (<50°F)    | 1%    | 1%       | 1%         | 1%   |
| Rain            | 2%    | 2%       | 2%         | 2%   |
| Wet course      | 1%    | 0%       | 1%         | 0%   |
| Strong wind     | 2%    | 2%       | 1%         | 0%   |
| Bumpy greens    | 0%    | 0%       | 0%         | 3%   |
| Thick rough     | 0%    | 2%       | 2%         | 0%   |
| Extra firm greens | 0%  | 2%       | 1%         | 0%   |

`getRoundDifficultyPct(conditions, category)` — sums percentages for all active condition IDs for the given category.

**UI — Round Details sheet (`sheet-round-edit.html`):**
- "Playing Conditions" section with 7 `.pill-sm` toggle pills rendered dynamically by `openRoundEdit()` into `#round-conditions-pills`
- Previously selected conditions are pre-highlighted when the sheet opens
- `toggleCondition(id)` — toggles `.selected` on the pill with matching `data-id`
- "Notes" textarea (`#round-edit-notes`, `.notes-input`) below conditions — pre-filled with `round.notes` on open
- `saveRoundEdit()` reads all `.selected` pills' `data-id` values, saves as `round.conditions`, reads the textarea and saves as `round.notes`, then calls `recalcRoundShots(round)` if conditions changed

**Auto-recalc (`recalcRoundShots(round)` in `hole.js`):**
- Called automatically when conditions change on save
- Iterates all shots in all holes, re-runs `calcSG` with the updated `pct`, overwrites `s.sg`
- New shots bake in conditions at save time via `saveShot()` and `holeOut()` — both call `getRoundDifficultyPct(round.conditions, cat)` before `calcSG`

**Summary display (`renderSummary` in `summary.js`):**
- When `round.conditions` is non-empty, a "Conditions" section appears between the Total SG row and the category rows
- Shows condition tags and per-category SG adjustment totals (`.conditions-summary`, `.conditions-tag`, `.conditions-impact-row`)
- Per-category adjustment = `Σ(getExpected(s.lie, s.distFrom) * pct/100)` across all shots in that category
- Analysis screen uses adjusted SG values automatically since they are baked into `shot.sg`

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

`renderSummary()` builds two cards separated by a "Breakdown" section label. Layout order: SG card → Breakdown card → Done.

**summary-totals card** contains:
1. Header row: Total SG + stroke count
2. **Exclusion badge** (only when `round.excludedShots` is non-empty) — "N shots excluded · Clear". Tapping Clear calls `clearAllExclusions()`. Excluded shots are filtered from all SG totals, category rows, bucket drill-downs, miss grids, club rows, and rankings. Stroke count is always the actual strokes played (unaffected by exclusion).
3. **Conditions row** (only when `round.conditions` is non-empty) — condition tags + per-category SG adjustment. See [Playing Conditions](#playing-conditions).
4. Category rows (Drive, Approach, Short Game, Putt) — tappable to expand via `toggleSummaryCat(cat)` → `#ssum-{cat}` / `#ssum-icon-{cat}`
   - Each row is **two lines**: category name + shot count on line 1; **headline stat** always visible on line 2 (`.ssum-cat-headline`, `--text-dim`):
     - Drive: `n/total fwy` (fairways hit)
     - Approach: `n/total GIR`
     - Short Game: `n ft prox` (avg proximity on green; `—` if none)
     - Putt: `n ft avg 1st` (avg first putt distance)
   - Right side shows **total SG** only (`.ssum-cat-total`, 20px) + chevron
   - Expanded panel contains: SG bucket rows + miss direction grid + club rows (non-putt) or miss type (putt), then a **Statistics sub-section** (`.ssum-stats-section`) with a dimmed "STATISTICS" header (`.ssum-stats-header`) and stat rows (`.sstat-row`):
     - Drive: Avg distance, Longest, Fairways hit
     - Approach: Avg distance, GIR
     - Short Game: Avg distance to hole, Avg proximity (on green)
     - Putt: Avg first putt, Avg holed, Longest holed
   - Lie abbreviations from `LIE_ABBR`: Tee, Fwy, Rgh, Sand, Rcv, Grn, Holed, Pen
   - Miss in `.ssum-miss` (10px, `--text-dim`); drive distance in `.ssum-drive` (10px, `--text-dim`)
   - Stat rows use `.sstat-row`, `.sstat-label`, `.sstat-val`
   - Stats computed in `renderSummary()` before catHTML so headline values are available for the row headers:
     - Fairways hit = drive shots where `resultLie==='fairway'`
     - GIR = any shot at or before regulation index (`par-3`) with `resultLie==='green'` or `'holed'`; handles eagle/albatross correctly
     - Avg proximity = avg `resultDist` of shortgame shots where `resultLie==='green'` and `resultDist != null`

**summary-breakdown card** (`#summary-breakdown`) — rendered below the "Breakdown" section label:
- **Rankings** — collapsible, collapsed by default; `toggleRankingsSection()` shows/hides `#rankings-wrap`, rotates `#rankings-chevron`
- **SG by Hole** — collapsible, collapsed by default; `toggleHolesSection()` shows/hides `#summary-holes-wrap`, rotates `#holes-section-chevron`
  - Each hole row shows number, par, stroke count, total SG — tappable to expand via `toggleSummaryHole(holeNum)` → `#ssum-hole-{holeNum}`
  - Expanded hole rows use category name as label (`.ssum-hole-cat`, 62px wide)
  - Each expanded shot row has a `⊘` button (`.sshot-excl-btn`) at the far right; tap to exclude/include. Excluded rows render at 35% opacity (`.excluded`)

`buildBucketRows(shots, cat)` — renders the category drill-down as bucket rows (avg SG + total SG per bucket). Empty buckets are skipped. Defined in `state.js` as `SG_BUCKETS`:
- **Putt** (feet, `distFrom`): 0–3, 4–8, 9–15, 16–25, 26+
- **Short Game** (yards, `distFrom`): 0–15, 16–30 — upper bound matches `autoCategory` threshold
- **Approach** (yards, `distFrom`): <75, 76–100, 101–125, 126–150, 151–175, 176+, Recovery
- **Drive** (hole yardage, `distFrom`): <350, 351–400, 401+

Buckets filter by `distFrom >= b.min && distFrom <= b.max` (inclusive). Buckets with a `lie` property (e.g. Approach › Recovery) filter by `s.lie === b.lie` instead of distance, and those lies are automatically excluded from distance-based buckets in the same category.

`buildShotRow(s, label, labelClass, holeNum, shotIdx, excluded)` — used by the hole drill-down (`toggleSummaryHole`) only; category drill-down uses `buildBucketRows`. When `holeNum`/`shotIdx` are provided, renders a `⊘` exclusion button; `excluded=true` dims the row and highlights the button red.

`buildRankedBuckets(catShots)` — flattens all category buckets into a single list sorted best → worst by avg SG. Takes the same `catShots = {drive, approach, shortgame, putt}` shape used by `renderSummary` and `renderTrends`. Empty buckets are skipped. Each row shows category badge, bucket label, shot count, avg SG. Appears as a collapsible "Rankings" section in both summary (inside `#summary-breakdown`, toggled by `toggleRankingsSection()`) and trends (as a `.trends-rankings-card` at the bottom, toggled by `toggleTrendsRankings()`).

`buildMissGrid(shots, cat)` — renders a miss direction percentage grid appended after bucket rows in each category's expand section (summary + trends). Shows a 3×3 grid of depth (Long/Even/Short) × side (Left/Middle/Right, or Low/Center/High for putts). Each cell shows percentage and shot count; cells with ≥20% get a subtle green highlight (`.miss-pct-cell-hi`). Column headers show side totals. Only `missSide` is required for inclusion — if `missDepth` is null (older data), it defaults to `'even'`. A metadata line shows how many shots had miss data vs total. Returns `''` if no shots have `missSide` set.

### Shot List Layout (hole screen)
`renderShotList` renders each shot with result as primary and starting position as secondary:
- **Main line:** `[Category badge]  150 yds · Fairway` — result distance + result lie (lie is muted via `.shot-res-lie`, separated by ` · `); penalty badge appended if applicable
- **Sub line:** `Tee · 385 yds · 235 yds drive · Short-Left` — start lie, start dist, drive distance (Drive shots only, `.shot-drive-dist`), miss direction
- Holed example: `[Drive]  Holed ⛳` / `Tee · 385 yds · 235 yds drive`
- Drive distance calculated as `distFrom - resultDist`, shown in `.shot-drive-dist` (12px, `--text-dim`)
- SG value colored using `getQuality(sg, category).color` (7-band); no quality dot

Both use `countStrokes(shots)` for stroke totals (adds +1 per penalty shot).

## Shot Exclusion

Shots can be flagged to exclude them from SG calculations without deleting them. Useful for ignoring outlier holes while still seeing the full scorecard picture.

**Data model:** `round.excludedShots: [{hole, shotIndex}]` — stored on the round object alongside `conditions` and `notes`. `shotIndex` is the 0-based index within `hole.shots[]`. `getExcludedSet(round)` (`state.js`) returns `Set<"hole-shotIndex">` for O(1) lookup.

**UI entry point:** Expand "SG by Hole" on the summary screen, then tap a hole to drill down. Each shot row has a `⊘` button (`.sshot-excl-btn`) at the far right. Tap to exclude (button turns red, row dims to 35%); tap again to include. `toggleShotExclusion(holeNum, shotIdx)` in `summary.js` handles the toggle — updates `round.excludedShots`, calls `updateRound(round)`, then re-renders.

**Scope of exclusion (summary screen):** Excluded shots are filtered from category totals, total SG, bucket drill-downs, miss grids, club rows, rankings, and the Statistics sub-section inside each category expand. Stroke count is never affected — it always reflects actual strokes played.

**Exclusion badge:** When `round.excludedShots.length > 0`, a `.excl-badge` row appears below the Total SG header: "N shots excluded · Clear". Tapping Clear calls `clearAllExclusions()` which empties `round.excludedShots`, saves, and re-renders.

**Scope of exclusion (Analysis screen):** The "Excl. flagged" pill (`#tf-excl`) toggles `state.trendsExclude`. When active, `renderTrends()` calls `getExcludedSet(r)` per round and skips flagged shots during aggregation.

## Analysis Screen

`renderTrends()` builds the cross-round analysis view. Accessible via the "Analysis" button on the home screen. Internal identifiers (`screen-trends`, `renderTrends`, `trendsFilter`, etc.) all use `trends` — only the UI label changed.

**Filter:** Last 5 / Last 10 / All rounds toggle (`state.trendsFilter`, default `10`). Pills use `.selected` class. `setTrendsFilter(n)` updates state and re-renders; `n=0` means all rounds.

**Excl. flagged toggle** (`#tf-excl`): when active (`state.trendsExclude = true`), shots flagged as excluded in any round are filtered out before aggregation. `setTrendsExclude(val)` updates state and re-renders. The pill syncs its `.selected` class in `renderTrends()`.

**Category cards:** Four cards (Drive, Approach, Short Game, Putt), each showing:
- Category name, shot count, round count
- Avg SG across filtered rounds (colored via `sgClass`)
- Tappable to expand bucket drill-down — reuses `buildBucketRows(shots, cat)` + `buildMissGrid(shots, cat)` from `summary.js`

Shots are aggregated from `round.holes[n].shots[]` across all filtered rounds before being passed to `buildBucketRows` and `buildMissGrid`.

## Screen Navigation

`showScreen(name)` — shows `#screen-{name}`, hides all others, calls the matching render function. Screens: `home`, `courses`, `hole`, `summary`, `scorecard`, `trends`.

The hole screen topbar uses a `⌂` home icon (`.btn-icon`) to navigate back to the home screen — intentionally distinct from the `‹ ›` hole navigation arrows.

Hole navigation wraps around: `‹` on hole 1 goes to the last hole, `›` on the last hole goes to hole 1. Both arrows are always active (no `disabled` class or `pointer-events: none` at boundaries).

Tapping the hole number block opens an inline hole picker (`#hole-picker`) — a 9-column grid of all holes in the round, rendered dynamically by `openHolePicker()`. The current hole is highlighted (`.selected`). Tapping a hole calls `goToHole(n)`, which sets `state.currentHole`, closes the picker, and re-renders. The picker closes via `closeHolePicker()` in three cases: tapping the hole number again (toggle), pressing either nav arrow, or any `showScreen()` call (prevents stale picker state when switching rounds).

## Home Screen

`renderHome()` builds the recent rounds list (`#rounds-list`). Each round renders as a `.round-card` showing:
- Course name, date, stroke count (`.round-card-meta`)
- Note snippet (`.round-card-note`) — up to 55 characters, truncated with `…`; only shown when `r.notes` is non-empty
- Total SG value (colored via `sgClass`) and "Total SG" label
- Delete button (×)

Tapping a card calls `resumeRound(id)`, which sets `state.currentRoundId`, seeks to the last hole with shots, and navigates to the hole screen.

## Settings & Backup

Accessed via the ⚙ gear button (top-right of the home header). Opens `#settings-sheet`. Logic lives in `home.js`.

### Settings Registry

Pill-based settings use a shared registry (`SETTINGS` in `state.js`) instead of per-setting boilerplate:

```js
registerSetting(key, defaultVal, selector, dataAttr, onApply?)
getSetting(key)       // read current value (with default fallback)
setSetting(key, val)  // persist + apply
applyAllSettings()    // sync all pill UI from storage — called once in init
```

`registerSetting` stores a `{ get, apply, set }` object. `apply` toggles `.selected` on all elements matching `selector` where `data-{dataAttr}` matches the current value, then calls `onApply(val)` for side effects. HTML pills call `setSetting(key, val)` directly via `onclick`.

**Registered settings** (all in `home.js`):

| Key | Default | Selector | Notes |
|---|---|---|---|
| `sg_colorScheme` | `'classic'` | `.scheme-pill` | `onApply` sets `data-scheme` on `<html>` |
| `sg_clubAutoExpand` | `false` | `.club-expand-pill` | Controls club pills auto-open on shot form |
| `sg_missAutoExpand` | `true` | `.miss-expand-pill` | Controls miss direction auto-open on shot form |

**Adding a new pill setting:** one `registerSetting(...)` call in `home.js` + `onclick="setSetting(key,val)"` on the HTML pills. No named get/apply/set functions needed.

**Non-registry settings** (different patterns, not pill-based):
- **Hole-Out Distance** — range slider (`#holeout-dist-slider`, 1–10 ft); `applyHoleOutDist()` / `setHoleOutDist(n)` in `home.js`; backed by `sg_holeOutDist`
- **My Clubs** — `applyActiveClubs()` / `toggleActiveClub(id)` in `home.js`; backed by `sg_activeClubs` (JSON array); pills generated dynamically from `CLUBS`; `getActiveClubs()` in `state.js` returns a `Set<string>`

**Backup / Export** (`openBackupPanel()` → `confirmBackup()` → `backupData(recentCount)`):
- Tapping "Backup / Export" calls `openBackupPanel()`, which shows the count of stored rounds and reveals `#backup-panel` inline (same pattern as the restore preview)
- Panel offers two radio options:
  - **All rounds (N)** — default; N is populated live from `getRounds().length`
  - **Most recent [ N ] rounds** — number input (`.backup-count-input`); tapping the field auto-selects this radio
- `confirmBackup()` reads the selected radio and count, calls `cancelBackupPanel()` to collapse the panel, then calls `backupData(recentCount)`
- `backupData(recentCount = null)`: slices `getRounds()` to the first `recentCount` entries (newest-first order) if a count is given; serializes `{ version, exported, rounds, courses }` as JSON; triggers a Blob download. Filename: `sg-backup-YYYY-MM-DD.json` for all rounds, `sg-export-lastN-YYYY-MM-DD.json` for a subset. Falls back to `showExportModal(json)` if Blob download fails (e.g. restrictive browser).
- `version`: hardcoded `1` — reserved for future migration logic. Currently written but not read by `confirmRestore()`; restore only validates that `payload.rounds` is an array.

**Restore** (`triggerRestoreFilePicker()` → `onRestoreFileSelected()` → `confirmRestore()`):
- File picker (`<input type="file" accept=".json">`) reads the backup JSON
- Validates that `payload.rounds` is an array; shows a preview with round/course counts
- Two radio options (default: "Restore New Rounds Only"):
  - **New only** — skips duplicates (identified by `courseName + date + name`), appends new rounds
  - **All** — replaces any matching existing rounds with incoming versions, appends the rest
- Courses are always merged by `id` (never duplicated, never overwrite existing)
- After restore: rounds sorted newest-first, `renderHome()` called, toast shows count + skipped

Duplicate key: `roundDuplicateKey(r)` = `courseName|date(YYYY-MM-DD)|name` joined by `|`.

## Scorecard Screen

Accessed via the "Show Scorecard" button above "Done" on the round summary. Navigates to `screen-scorecard`, which renders `#scorecard-content` via `renderScorecardScreen()` (defined in `summary.js`).

`renderScorecard(round)` builds an HTML table split into front 9 / back 9 sections (or a single section for ≤9 holes). Rows: hole numbers, Par, Yds (omitted if no yardage data), Scr. No +/− row.

- **Scoring symbols** — each hole's score cell wraps the number in a `<span class="sc-sym sc-sym-{type}">`. Symbols are monochrome outlines using `var(--text-dim)`; double shapes (eagle, double bogey) use a `box-shadow` outer ring with `var(--card)` gap. Types: `sc-sym-eagle` (double circle, −2 or better), `sc-sym-birdie` (circle, −1), `sc-sym-bogey` (square, +1), `sc-sym-double` (double square, +2 or worse). Par = plain number, no span.
- **Unplayed holes** — score cells with 0 strokes render blank (the hole was not played).
- **Totals column** — OUT / IN / TOT labels; shows stroke count only, no +/− to par.
- For 18-hole rounds a "Total" bar below the table shows combined stroke count.

## CSV Export

`exportCSV()` and `exportSummaryCSV()` remain in `summary.js` but are **not currently exposed in the UI**. The export buttons and hint card were removed from `screen-summary.html`; the topbar export icon was also removed. Use Backup / Export (settings sheet) for data portability.

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
