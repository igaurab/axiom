# Benchmark Analytics Dashboard — UI/UX Skill Document

Reference implementation: `generate_dashboard.py` → `dashboard.html`

---

## Architecture

- **Self-contained HTML**: Python generates a single `.html` file with all CSS, JS, and data embedded. No external dependencies.
- **Data injection**: Python computes two JSON blobs — `allQueries` (per-query array) and `S` (summary stats) — serialized into `<script>` via placeholder replacement (`__DATA_JSON__`, `__SUMMARY_JSON__`). Escape `</script>` as `<\/script>` in the JSON.
- **Rendering**: All sections are JS-rendered on page load via `el.innerHTML = h` string building. No framework.

---

## Page Layout (top to bottom)

### 1. Header
- Dark gradient background: `linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)`
- Title + subtitle centered, white text
- Run label pills below subtitle in a flex row, each with translucent colored background:
  - Run 0: gray `rgba(108,117,125,0.3)` border `rgba(108,117,125,0.5)`
  - Run 1: blue `rgba(0,123,255,0.3)` border `rgba(0,123,255,0.5)`
  - Run 2: orange `rgba(255,152,0,0.3)` border `rgba(255,152,0,0.5)`

### 2. Summary Bar (sticky)
- White bar, `position:sticky; top:0; z-index:99`, horizontal flex with dividers
- Groups: one per run (tinted bg matching run color) + a "Mean" group (green bg `#e8f5e9`)
- Each group shows: label, weighted score %, breakdown `28C 1P 1W`
- Mean group shows: score% and `+/- std%`

### 3. Content Sections (inside `.container`, max-width 1400px)
Each section is a white card with `border-radius:12px`, `box-shadow:0 2px 8px rgba(0,0,0,0.07)`, `padding:1.5rem 2rem`.

#### 3a. Accuracy Overview
- Table: Run | Correct | Partial | Wrong | Accuracy% | Weighted Score%
- Correct green `#28a745`, Partial orange `#f57c00`, Wrong red `#dc3545`
- Weighted score formula: `(correct + 0.5*partial) / total * 100`
- Below table: Mean Accuracy, Std Dev, Median, Mean Score inline

#### 3b. Consistency Heatmap
- Flex-wrap grid of 38x38px rounded squares, one per query
- Colors: all_correct `#28a745`, all_wrong `#dc3545`, all_partial `#ffc107`, inconsistent `#fd7e14`
- Hover: `scale(1.15)` + shadow. Click: scroll-to-card + auto-open
- Legend row below

#### 3c. Accuracy by Query Type
- Table: Type (as badge) | Count | Run 0 | Run 1 | Run 2 | Mean
- Type badge: `background:#e7f1ff; color:#004085; border-radius:12px; font-size:0.78rem`

#### 3d. Wrong / Partial Queries by Run
- 3-column grid (`1fr 1fr 1fr`), one column per run
- Column header: run label pill + count of wrong/partial queries
- Each column lists queries that were wrong or partial in that run
- Each row shows `Q{id}` + grade badge (Wrong/Partial)
- Click any row → scrolls to that query's detail card
- If a run has no wrong/partial queries: shows "All correct" in italic gray
- Makes it easy to visually compare which queries failed in which runs side by side

#### 3e. Performance Stats
- Table with metric rows: Exec Time, Total Tokens, Reasoning Tokens, Tool Calls
- Columns: per-run "Mean +/- Std" and "Median"
- Stats computed in Python using population std dev

#### 3f. Tool Usage Across Runs
- Horizontal bar chart, pure CSS
- Each tool name on the left (180px right-aligned), bar segments per run side-by-side
- Run colors: Run 0 `#6c757d`, Run 1 `#007bff`, Run 2 `#ff9800`
- Bar width scaled proportionally: `max(20px, count/maxTotal * 300px)`
- Total count on the right
- Color legend row at top

### 4. Filter Bar
- Horizontal flex of buttons with counts: "All (30)", "Wrong / Partial (3)", "Inconsistent (2)", plus one per query_type
- Active button: `background:#0066cc; color:white`
- Filters re-render detail cards. Sort order: all_wrong first, then inconsistent, then all_partial, then all_correct; within group by ID

### 5. Detail Cards (one per query)
- Auto-open if `consistency !== 'all_correct'`
- **Card header**: click to toggle body open/closed. Shows `Q{id}`, type badge, consistency badge, per-run grade badges
- **Card body**:
  - **Query section**: query text in blue-left-bordered box, expected answer below, optional yellow comment/note boxes
  - **3-column run grid**: `grid-template-columns: 1fr 1fr 1fr`. On mobile (<900px): single column
    - Run label pill (colored by run), grade badge
    - Response box: colored border+bg by grade (green/yellow/red), rendered as markdown, max-height 300px scrollable
    - Meta row: Time, Tokens, Reasoning, Tools count
    - Tool call pills: clickable blue badges showing tool sequence

### 6. Export Buttons
- Fixed bottom-right, two buttons stacked: "Export CSV" (green `#28a745`), "Export JSON" (blue `#0066cc`)
- Hover: `translateY(-2px)` lift effect

---

## Grade System

Four grades: `correct`, `partial`, `wrong`, `not_graded`

Badge CSS pattern:
```
.grade { display:inline-block; padding:0.15rem 0.6rem; border-radius:12px; font-size:0.82rem; font-weight:600; }
.grade-correct { background:#d4edda; color:#155724; }
.grade-partial { background:#fff3cd; color:#856404; }
.grade-wrong   { background:#f8d7da; color:#721c24; }
.grade-not_graded { background:#e9ecef; color:#6c757d; }
```

Consistency classification (across all runs):
- `all_correct` / `all_wrong` / `all_partial`: unanimous
- `inconsistent`: mixed grades

---

## Markdown Rendering (client-side JS)

Custom renderer, no library. Input is `escapeHtml(text)` first, then parsed line-by-line:

1. **Fenced code blocks**: ` ``` ` delimiters → `<pre><code>...</code></pre>`
2. **Horizontal rules**: `---` / `***` etc → `<hr>`
3. **Tables**: detect `|` row followed by `|---|` separator → `<table>` with thead/tbody
4. **Headings**: `#` through `####` → `<h2>` through `<h5>`
5. **Unordered lists**: `- ` or `* ` prefix → `<ul><li>`
6. **Ordered lists**: `1. ` or `1) ` prefix → `<ol><li>`
7. **Blank lines**: `<br>`
8. **Everything else**: `<p>` with inline markdown

Inline markdown applied to all text nodes:
- `**bold**` / `__bold__` → `<strong>`
- `*italic*` → `<em>` (word-boundary aware to avoid false positives)
- `` `code` `` → `<code>`
- `[text](url)` → `<a target="_blank">`

Markdown content container class: `.markdown-content` with styles for tables, code, headings, lists, links.

---

## Tool Call Visualization

### In detail cards — pill badges
- Each tool call rendered as a clickable blue pill badge in sequence order
- CSS: `background:#e7f1ff; color:#004085; border-radius:4px; font-size:0.78rem; font-weight:600`
- Hover: inverts to `background:#004085; color:white` with slight lift and shadow
- Container: `.dc-tools` with `background:#f1f3f5; border-radius:6px; padding:0.4rem 0.6rem`
- `renderToolNames(names, qId, rk)` generates pills with `onclick="showToolModal(qId, rk, index)"`

### Tool call detail modal
Triggered by clicking a tool name pill. Shows input (arguments) and output (response) as syntax-highlighted, indented JSON.

**Modal structure:**
```
.modal-overlay (fixed fullscreen, semi-transparent black bg, z-index:1000)
  .modal (white card, max-width 900px, max-height 85vh, flex column)
    .modal-header
      h3: tool name pill + "Step X of Y . Q{id} . {RunLabel}"
      .modal-nav: Prev/Next buttons + close X
    .modal-body (scrollable)
      .modal-section: "INPUT (ARGUMENTS)" header + .modal-json pre block
      .modal-section: "OUTPUT (RESPONSE)" header + .modal-json pre block
```

**JSON formatting:**
- `prettyJson(raw)`: tries `JSON.parse` then `JSON.stringify(obj, null, 2)`. Falls back to raw string.
- `syntaxHighlightJson(escaped)`: regex-based coloring after `escapeHtml`:
  - Keys (purple `#881391`): `/"key":/` pattern
  - Strings (green `#1a6b3c`): values after `:` or in arrays
  - Numbers (blue `#1750eb`)
  - Booleans (pink `#d63384`)
  - Null (gray `#6c757d`)
- `.modal-json`: monospace font, `white-space:pre-wrap; word-break:break-word; max-height:40vh; overflow-y:auto`

**Navigation:**
- Prev/Next buttons step through tool calls within the same query+run
- Keyboard: Escape closes, ArrowLeft/ArrowRight navigates
- Click overlay background closes modal
- Fade-in via `opacity 0→1` CSS transition (0.15s)

**Data shape per tool call detail:**
```json
{
  "name": "astroquery_execute",
  "arguments": "{\"module_name\":\"heasarc\",...}",
  "response": "{\"success\":true,...}"
}
```
Arguments and response are JSON strings that get parsed and re-indented by `prettyJson`.

---

## Data Schema

### Per-query object (`allQueries` array):
```json
{
  "id": "1",
  "query": "...",
  "expected_answer": "...",
  "query_type": "archive_driven",
  "comments": "either answer is correct",
  "function_status": "Y",
  "consistency": "all_correct",
  "run0": { <run_entry> },
  "run1": { <run_entry> },
  "run2": { <run_entry> }
}
```

### Run entry:
```json
{
  "grade": "correct",
  "response": "agent's text response",
  "time": 45.2,
  "total_tokens": 12345,
  "reasoning_tokens": 1024,
  "input_tokens": 8000,
  "output_tokens": 4000,
  "cached_tokens": 2000,
  "requests": 3,
  "tool_calls": 5,
  "tool_call_names": ["astroquery_list_modules", "astroquery_execute", ...],
  "tool_call_details": [
    {"name": "...", "arguments": "{...}", "response": "{...}"}
  ]
}
```

### Summary object (`S`):
```json
{
  "total_queries": 30,
  "runs": { "run0": { "correct":28, "partial":0, "wrong":2, "total":30, "accuracy":93.3, "score":93.3 }, ... },
  "accuracy_stats": { "mean":92.2, "median":93.3, "std":1.35, "min":90.0, "max":93.3, "n":3 },
  "score_stats": { ... },
  "by_type": { "archive_driven": { "count":10, "run0":95.0, "run1":100.0, "run2":90.0, "mean":95.0 }, ... },
  "performance": { "run0": { "time": {stats}, "tokens": {stats}, "reasoning": {stats}, "tools": {stats} }, ... },
  "tool_usage": { "run0": { "astroquery_execute": 85, ... }, ... },
  "all_tool_names": ["astroquery_execute", "astroquery_list_functions", ...],
  "consistency": { "all_correct":27, "all_wrong":1, "all_partial":0, "inconsistent":2 },
  "labels": { "run0":"Run 0", "run1":"Run 1", "run2":"Run 2" }
}
```

---

## Color Palette

| Purpose | Color | Hex |
|---------|-------|-----|
| Run 0 (bg) | Gray | `#6c757d` / `#e9ecef` |
| Run 1 (bg) | Blue | `#007bff` / `#e7f1ff` |
| Run 2 (bg) | Orange | `#ff9800` / `#fff3e0` |
| Correct | Green | `#28a745` / `#d4edda` |
| Partial | Yellow | `#ffc107` / `#fff3cd` |
| Wrong | Red | `#dc3545` / `#f8d7da` |
| Inconsistent | Orange | `#fd7e14` / `#ffe0b2` |
| Primary action | Blue | `#0066cc` |
| Body bg | Light gray | `#f0f2f5` |
| Card bg | White | `#ffffff` |
| Text primary | Dark | `#212529` |
| Text secondary | Gray | `#6c757d` |
| Border | Light | `#dee2e6` |
| JSON key | Purple | `#881391` |
| JSON string | Green | `#1a6b3c` |
| JSON number | Blue | `#1750eb` |
| JSON bool | Pink | `#d63384` |

---

## Key UX Patterns

1. **Sticky summary bar**: always visible at top showing scores at a glance
2. **Heatmap as navigation**: click any cell → scroll to + open that query's card
3. **Auto-open problem cards**: cards with non-all_correct consistency open by default
4. **Sort problems first**: filter view sorts worst results to top
5. **Response colored by grade**: the response box border+bg matches its grade color
6. **Tool pills are interactive**: hover inverts color, click opens modal with full I/O
7. **Modal keyboard nav**: Escape/ArrowLeft/ArrowRight for fast browsing of tool call chain
8. **Click-outside-to-close**: modal overlay click dismisses
9. **Responsive**: 3-column run panels collapse to single column on narrow screens
10. **No external dependencies**: works offline, single file, paste into any browser

---

## Generating the Dashboard

```bash
uv run python3 generate_dashboard.py
uv run python3 generate_dashboard.py -o custom.html --label-0 "Baseline" --label-1 "v2" --label-2 "v3"
```

Python script handles: loading CSVs + JSON dirs, computing stats, building the two JSON blobs, injecting them into the HTML template string, writing the output file.
