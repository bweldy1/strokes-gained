You are analyzing my personal golf shot data exported from a strokes gained tracking app.
I want you to help me understand where my game is strong and where I should focus practice.

## What is Strokes Gained?
Strokes gained (SG) measures each shot against a baseline of what a scratch golfer
would be expected to take from that position. Positive SG means I performed better
than baseline; negative means worse. It is calculated per shot and can be summed or
averaged across any grouping.

## Data Structure
The JSON has this shape:
{
  "version": 1,
  "exported": "<ISO timestamp>",
  "rounds": [ ...round objects... ],
  "courses": [ ...course objects... ]
}

Each round contains:
{
  "id": "unique string",
  "date": "ISO date",
  "courseName": "string",
  "name": "optional round label",
  "holes": [ ...hole objects... ]
}

Each hole contains:
{
  "hole": 1–18,
  "par": 3|4|5,
  "yards": number,
  "shots": [ ...shot objects... ]
}

Each shot contains:
{
  "lie": "tee"|"fairway"|"rough"|"sand"|"recovery"|"green",
  "distFrom": number,          // yards (feet if lie="green")
  "resultLie": "fairway"|"rough"|"sand"|"recovery"|"green"|"holed"|"penalty",
  "resultDist": number|null,   // yards (feet if resultLie="green"); null if holed
  "category": "drive"|"approach"|"shortgame"|"putt",
  "sg": number|null,           // strokes gained for this shot (null if uncalculated)
  "missDepth": "short"|"even"|"long"|null,  // null in older data = treat as "even"
  "missSide": "left"|"middle"|"right"|null  // putts: "low"|"center"|"high"
}

## Categories
- drive: tee shots
- approach: shots to the green from 30+ yards
- shortgame: chips, pitches, bunker shots under 30 yards
- putt: shots from the green

## Penalty shots
resultLie="penalty" means a penalty stroke was incurred. countStrokes for a hole =
shots.length + number of penalty shots (each penalty adds 1 extra stroke).

## Miss direction
A 3×3 grid: depth (long/even/short) × side (left/middle/right, or low/center/high
for putts). "even" = pin-high / on-line. Both fields null means miss was not recorded.

## Distance buckets used in the app
- Putt (feet): 0–3, 4–8, 9–15, 16–25, 26+
- Short game (yards): 0–15, 16–30
- Approach (yards): <75, 76–100, 101–125, 126–150, 151–175, 176+, and Recovery (lie=recovery)
- Drive (hole yardage): <350, 351–400, 401+

## Please analyze:
1. Overall SG trend across rounds — am I improving?
2. SG by category (drive, approach, shortgame, putt) — which is my biggest strength
   and biggest weakness?
3. SG by distance bucket within each category — where specifically am I losing strokes?
4. Miss pattern analysis — do I have a consistent miss direction by category?
5. Scoring stats: fairways hit %, greens in regulation %, average putts per hole
6. Top 3 areas to focus practice, ranked by potential strokes gained impact
7. Any other patterns or anomalies worth noting

Here is my data:
[PASTE JSON HERE]


 A few tips:
  - Claude, GPT-4o, and Gemini can all handle the full JSON if your dataset isn't huge. If you have many rounds, the
  file might be large — you can trim old rounds from the JSON first.
  - Ask follow-up questions like "break down my approach SG by round to see if it's trending" or "which holes do I
  consistently lose strokes on?" for deeper digs.
  - The sg: null shots (missing SG) should be ignored in averages — worth telling the LLM to skip those explicitly if it
   seems to be including them.