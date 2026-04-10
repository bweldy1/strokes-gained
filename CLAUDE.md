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
    sheet-yardage.html      # Bottom sheet: yardage override
    sheet-date.html         # Bottom sheet: round date edit
css/
  v2.css                    # All styles
js/
  sg_tables.js              # SG lookup tables (lie × distance → expected strokes)
  v2.js                     # All app logic
images/
  SG_logo.png               # App icon used on home screen header
```

## Shot Data Model

Each shot stored in `round.holes[n].shots[]`:

```js
{
  lie: 'tee'|'fairway'|'rough'|'sand'|'recovery'|'green',
  distFrom: Number,                    // yards (feet if lie=green)
  resultLie: 'fairway'|'rough'|'sand'|'recovery'|'green'|'holed'|'penalty',
  resultDist: Number|null,             // yards (feet if resultLie=green); null if holed
  category: 'drive'|'approach'|'shortgame'|'putt',
  sg: Number|null,                     // strokes gained value
  missDepth: 'short'|'long'|null,
  missSide: 'left'|'middle'|'right'|null,  // OR 'low'|'center'|'high' for putts
}
```

## Key JS Patterns

### State
Single `state` object — never persisted, resets on page load:
```js
let state = { currentRoundId, currentHole, editingShotIndex, excludedCategories, shotLie, shotResultLie, shotCategory, shotMissDepth, shotMissSide }
```

### Storage
All data in `localStorage` as JSON. Keys: `sg_rounds`, `sg_courses`.

### Collapsed chip UI (Category + Starting Lie)
Both "Category" and "Starting Lie" in the shot entry form use a chip-based collapsed pattern:
- A chip (`#category-chip`, `#lie-chip`) shows the current value
- Pills expand inline on tap via `toggleCategoryOverride()` / `toggleLieOverride()`
- Selecting a pill updates the chip and auto-collapses via `silent=false` path in `selectCategory()` / `selectLie()`
- `renderCategoryChip(cat)` and `renderLieChip(lie)` handle chip DOM updates

### Shot Pre-fill (getSuggestion)
`getSuggestion(holeData)` returns `{ lie, dist, hint }` for new shots:
- First shot on a hole → `lie:'tee'`, dist from scorecard
- Subsequent shots → previous shot's `resultLie` and `resultDist`

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
- `getSuggestion` returns `{ lie: null, dist, hint }` after a penalty; `openShotSheet` guards `selectLie`/`selectCategory` with `if(sug.lie)`

### SG Calculation
`calcSG(startLie, startDist, resultLie, resultDist)` uses `sg_tables.js` lookup tables with linear interpolation. Result is added to each shot on save.

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

## Screen Navigation

`showScreen(name)` — shows `#screen-{name}`, hides all others, calls the matching render function. Screens: `home`, `courses`, `hole`, `summary`.

## CSV Export

`exportCSV()` — full shot-level CSV with columns: Hole, Par, Yardage, Shot#, Lie, Dist From, Dist Unit, Result Lie, Result Dist, Result Unit, Category, SG, Miss Depth, Miss Side.

`exportSummaryCSV()` — one row per round with SG totals by category.

Both use a clipboard fallback modal for iOS Safari compatibility.
