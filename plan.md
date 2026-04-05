I'll create a detailed plan for this strokes gained golf tracking web app. Let me think through all the components carefully.Here's a comprehensive plan for your strokes gained golf tracker:Here's the full build plan, organized into phases:

---

## Phase 1 — Data model + SG engine

**Round & shot schema (stored as JSON in localStorage):**

Each round has: `id`, `date`, `courseName`, `holes[]`. Each hole has a `shots[]` array. Each shot stores: `lie` (tee/fairway/rough/sand/recovery/green), `distanceFrom` (yards), `resultLie`, `resultDistance`, `distanceUnit` (yards/feet), `sgValue` (computed), `category` (drive/approach/chip/putt).

**SG interpolation logic:** Store the lookup table as an object keyed by lie type, with arrays of `[yardage, expectedStrokes]` pairs. For any distance between two entries, linearly interpolate: `sg = startExpected - endExpected - 1`. The shot's `category` gets auto-assigned based on lie and distance (e.g. tee shot → drive, fairway 100+ yards → approach, green → putt) but should be overridable.

**Quality thresholds:** Define bands like: great (SG > +0.5), good (0 to +0.5), average (−0.25 to 0), poor (< −0.25) — these can be adjusted during build.

---

## Phase 2 — Home screen + round management

- List of saved rounds with date/course, most recent first
- "Start new round" button → prompts for course name (optional)
- Tap any existing round → resumes at the last hole entered
- Delete swipe or button per round

---

## Phase 3 — Hole entry screen (core UI)

**Layout top-to-bottom on iPhone:**

1. Header: `← Hole 7 →` with hole number large and centered, subtle "jump to hole" tap on the number
2. Shot list for the current hole — each shot shows lie icon + distance + SG value + quality color chip
3. "Add shot" button that opens the shot entry form (slides up from bottom as a modal sheet)
4. SG tally bar: tabs for Drive / App / Chip / Putt / Total, each toggleable. Tapping a category shows that running total for the round.

**Shot entry form fields (in order of entry):**
- Lie selector (large pill buttons: Tee, Fairway, Rough, Sand, Recovery, Green)
- Distance from (numeric input, auto-focused, yards implied)
- Result lie (same pill buttons)
- Result distance (numeric input + yards/feet toggle — only visible when result lie is Green or chip distance)
- SG auto-calculates and shows quality indicator immediately

---

## Phase 4 — SG tables (you'll provide these)

The file will have a placeholder JS object you replace with your actual values. Separate arrays per lie type: `TEE`, `FAIRWAY`, `ROUGH`, `SAND`, `RECOVERY`, `PUTTING`. The interpolation function handles any gaps between entries.

---

## Phase 5 — Round summary + CSV export

- Full round SG breakdown by category
- Per-hole SG table
- "Copy CSV" button that formats: `Hole, Shot, Lie, Distance, ResultLie, ResultDistance, SG` — pastes directly into Google Sheets
- Option to also copy just the summary totals row

---

## Key decisions to confirm before building

1. **SG table values** — do you want placeholder values in the build, and you'll swap them in later? Or do you have them ready to provide now?
2. **Shot category auto-assign rules** — should tee shots always be "drive"? Or only if it's hole yardage (par 4/5)? Should par 3 tee shots count as "approach"?
3. **Result distance for non-green shots** — do you want to track where the ball ends up when it's NOT on the green (e.g. fairway from tee, rough from fairway)? Or only track result distance when the result is on the green?
4. **Yards/feet toggle** — should this be a global setting (saved in localStorage), or a per-shot toggle?
5. **SG quality bands** — what thresholds feel right for great/good/average/poor? These can be set per shot category if needed.

Once you confirm those, the build is one focused coding session — the structure is well-defined enough to write the whole file in one pass.


Got it. Here are the updated decisions captured:

---

## Updated Plan — Shot Category & Quality Rules

**Shot category assignment (auto, overridable):**
- **Drive** — first shot of the hole, only on par 4 or par 5. The hole entry form will include a par selector (3/4/5) per hole so this rule can fire correctly.
- **Approach** — any shot from 30+ yards that is not a Drive
- **Short Game** — any shot under 30 yards that is not a putt (replaces "Chip")
- **Putt** — any shot where the starting lie is Green

**Result distance tracking:**
- Tracked on every shot, not just green approaches
- Yards/feet toggle applies to Approach and Short Game result distances
- For Drive and other non-green results, distance is always in yards
- When result lie is Green, the toggle is available (feet makes more sense close in)

**Yards/feet toggle:**
- Global setting saved in localStorage — one toggle affects all relevant shots
- Still visible per-shot so user can see the current setting while entering data

**Shot quality bands:**
- Defined per category (Drive, Approach, Short Game, Putt each get their own thresholds)
- You'll supply the actual values later — the data structure will be a JS object like:
```js
const QUALITY_BANDS = {
  drive:     [{ label: 'Great', min: 0.5 }, { label: 'Good', min: 0 }, ...],
  approach:  [...],
  shortGame: [...],
  putt:      [...]
};
```
- Quality indicator shows as a color chip next to each shot and on the shot entry form in real time

**Tally bar categories:** Drive / Approach / Short Game / Putt / Total — each toggleable to include/exclude from the visible aggregate.

**One remaining open question:** For par, does the user set it once per hole when they start the round (e.g. a setup screen after "new round"), or should par be enterable inline on the hole screen? Inline is more flexible if they forget or play different tees — but a setup screen is cleaner. Which do you prefer?

Good call — this makes hole setup effortless for regular courses while keeping flexibility for different tee positions.

---

## Updated Plan — Course Management

**Course data structure (JSON):**
```js
{
  "id": "uuid-or-slug",
  "name": "Willowbrook GC",
  "tees": "Blue",
  "holes": [
    { "hole": 1, "par": 4, "yards": 385 },
    { "hole": 2, "par": 3, "yards": 162 },
    ...
  ]
}
```

Multiple courses can be stored. The JSON array of courses lives in localStorage under a key like `sg_courses`. On first load, if no courses exist, the app shows a prompt to paste in course JSON.

**Course setup flow (New Round):**
1. User taps "Start New Round"
2. Screen shows list of saved courses — tap to select
3. If no courses yet, or tapping "Add Course" — shows a textarea to paste JSON, with a simple validate + save button
4. After selecting a course, the round is created and drops straight into Hole 1

**During hole entry — distance override:**
- Each hole loads its default yardage from the course data
- The yardage shown in the shot entry form for the first shot is pre-filled from course data
- A small edit icon or tap on the yardage lets the user override it for that round only
- The override is saved on the round's hole record (not mutating the course template)
- Par is also shown per hole but does not need to be overridable (can add later)

**Course data persistence:**
- Courses saved under `sg_courses` in localStorage
- Rounds reference a course by `id` — the full hole data is copied into the round at creation time so round data is self-contained even if the course is later edited
- Future expansion: in-app course editor, handicap index per hole, multiple tee sets per course

**Revised new round flow summary:**

```
Home → [Select Course] → [Course list or paste JSON] 
     → Round created w/ 18 holes pre-filled 
     → Hole 1 entry (yardage pre-filled, overridable)
```

**One more open question before building:** For the first shot on each hole, the distance-from is pre-filled from course yardage. But for subsequent shots, the user enters the distance manually. Should the app attempt to track a running "distance remaining" based on the prior shot's result distance — i.e. auto-fill the next shot's "distance from" based on what was entered as the result of the previous shot? Or keep every shot's distance-from as a fully manual entry?

Perfect — keeps the logic clean and avoids cascading errors from a mis-entered result distance. Manual entry for all "distance from" fields it is.

---

## Final Plan Summary — Ready to Build

All decisions are now locked. Here's the complete spec in one place:

**Single `index.html` file**, no dependencies, iPhone-optimized, localStorage only.

**Screens:**
1. **Home** — saved rounds list (resume/delete) + Start New Round button
2. **Course select** — list of saved courses, Add Course via JSON paste
3. **Hole entry** — core screen, hole nav, shot list, SG tally bar
4. **Shot entry** — modal sheet, all fields, live SG + quality feedback
5. **Round summary** — per-category totals, per-hole breakdown, CSV export

**Data in localStorage:**
- `sg_courses` — array of course JSON objects
- `sg_rounds` — array of round objects (self-contained, course data copied in at creation)
- `sg_settings` — global preferences (yards/feet toggle)

**Shot category rules:** Drive (first shot, par 4/5 only) · Approach (≥30 yds, not drive) · Short Game (<30 yds, not putt) · Putt (lie = green)

**SG engine:** Linear interpolation between table entries · Shot SG = startExpected − endExpected − 1 · Tables keyed by lie type, provided later as placeholder

**Quality bands:** Per category · Supplied later · Structure ready as `QUALITY_BANDS` object

**Distance:** All shot result distances tracked · Yards/feet toggle (global, localStorage) · Applies to Approach and Short Game result display · Drive results always yards · First shot yardage pre-filled from course data, overridable per round

**Export:** CSV copy to clipboard, Google Sheets compatible, one row per shot plus summary row

---

Ready to build whenever you are — just say the word and provide the SG lookup table values and quality band thresholds when you have them, and we can either stub them with placeholders or wait until you have the real values. Which do you prefer?