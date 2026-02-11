# Benchmark Analytics Dashboard — UI/UX Skill Document

## Architecture

The dashboard is implemented as **React components** in the Next.js frontend, not as a standalone HTML generator. Two main entry points:

- **`DashboardView`** (`components/dashboard/dashboard-view.tsx`) — single-run analytics
- **`CompareDashboard`** (`components/dashboard/compare-dashboard.tsx`) — multi-run comparison

Both fetch data from the backend analytics API via TanStack Query and render card-based sections.

Legacy: A standalone `generate_dashboard.py` → `dashboard.html` approach existed previously. The self-contained HTML export (`/api/export/html`) still generates a single-file HTML with embedded data for sharing.

---

## Data Flow

1. Components call `analyticsApi.run(runId)` or `analyticsApi.compare(runIds)`
2. Backend computes grade counts, accuracy, performance stats, tool usage, cost breakdown
3. Response types: `RunAnalyticsOut` (single) or `CompareAnalyticsOut` (multi)
4. Components render sections from the response data

---

## Single-Run Dashboard (`DashboardView`)

Sections rendered in order:

### 1. Accuracy Overview (`accuracy-overview.tsx`)
- Card with grade counts: Correct (green), Partial (yellow), Wrong (red)
- Accuracy % and Weighted Score %
- Weighted score formula: `(correct + 0.5 * partial) / total * 100`

### 2. Accuracy by Type (`accuracy-by-type.tsx`)
- Table: Tag | Count | Correct | Partial | Wrong | Accuracy%
- Tag rendered as badge: `bg-[var(--tag-blue-bg)] text-[var(--tag-blue-text)]`

### 3. Performance Stats (`performance-stats.tsx`)
- Table with metric rows: Exec Time (s), Total Tokens, Reasoning Tokens, Tool Calls
- Columns: Mean ± Std, Median, Min, Max
- Stats computed server-side using population std dev

### 4. Tool Usage Chart (`tool-usage-chart.tsx`)
- Horizontal bar chart, pure CSS
- Each tool name on the left, bar width proportional to count
- Bar width: `max(20px, count / maxCount * 250px)`
- Single color (#0066cc) for single-run view

### 5. Cost Summary (`RunCostSection` in dashboard-view.tsx)
- Total cost (USD), input/cached/output/reasoning token counts
- Pricing rates table: model key, per-million rates, web search rate, currency
- Collapsible per-query cost breakdown table
- Columns: Query, Total $, Input $, Cached $, Output $, Reasoning $, Web $

---

## Compare Dashboard (`CompareDashboard`)

Used when viewing grouped runs or ad-hoc comparisons. Sections:

### 1. Accuracy Overview
- Table: Run | Correct | Partial | Wrong | Accuracy% | Weighted Score%
- One row per run, color-coded grade counts
- Mean row at bottom when multiple runs

### 2. Consistency
- Legend with colored squares: all_correct (green), all_partial (yellow), inconsistent (orange), all_wrong (red)
- Counts for each category

### 3. Performance Stats
- Table: Metric | Run1 (Mean±Std, Median) | Run2 (Mean±Std, Median) | ...
- Metrics: Exec Time, Total Tokens, Tool Calls

### 4. Tool Usage Across Runs (`ToolUsageComparison`)
- Horizontal bar chart with run-colored segments side by side
- Color legend at top, one color per run
- Run colors: `["#0066cc", "#ff9800", "#28a745", "#9c27b0", "#dc3545"]`
- Each tool name on left (w-44), bar segments per run, count inside bars

---

## Card Styling (shared across all sections)

```
bg-card rounded-xl p-6 px-8 mb-6 shadow-sm
```

Section headings:
```
text-lg font-semibold mb-4 pb-2 border-b-2 border-border text-brand-dark
```

Table headers:
```
bg-[var(--surface)] font-semibold
```

Tabular numbers use `tabular-nums` class for alignment.

---

## Grade System

Three grades: `correct`, `partial`, `wrong`

CSS variable colors:
```
--grade-correct-bg / --grade-correct-text / --grade-correct-border  (green)
--grade-partial-bg / --grade-partial-text / --grade-partial-border  (yellow)
--grade-wrong-bg   / --grade-wrong-text   / --grade-wrong-border    (red)
```

Consistency classification (across runs):
- `all_correct` / `all_wrong` / `all_partial`: unanimous
- `inconsistent`: mixed grades

---

## Grading UI (`components/grading/`)

### Single-Run Grading (`grading-view.tsx`)
- Fetches results for a run, renders per-query cards
- Each card: query text, expected answer, agent response, grade buttons, tool calls
- Response box border+bg colored by grade

### Compare Grading (`compare-card.tsx`)
- Multi-column layout: one column per run
- Each column shows: run label, grade badge, response, meta (time, tokens, tools)
- Tool call pills clickable → opens tool modal

### Components
| Component | Purpose |
|-----------|---------|
| `grading-view.tsx` | Single-run grading with query list |
| `grading-card.tsx` | Per-query card with grade buttons |
| `compare-card.tsx` | Multi-run side-by-side query card |
| `grade-button.tsx` | Grade pill button (correct/partial/wrong) |
| `grade-summary.tsx` | Summary bar with counts |
| `query-nav.tsx` | Query navigation/filter sidebar |
| `reasoning-display.tsx` | Collapsible reasoning chain display |

---

## Tool Call Visualization (`components/tool-calls/`)

### Tool Pills (`tool-pills.tsx`)
- Clickable badges showing tool call sequence
- Style: `bg-[var(--tag-blue-bg)] text-[var(--tag-blue-text)] rounded text-xs font-semibold`
- Hover: inverts colors

### Tool Modal (`tool-modal.tsx`)
- Full-screen overlay with tool call detail
- Shows input (arguments) and output (response) as formatted JSON
- Navigation: Prev/Next through tool calls in sequence
- Keyboard: Escape closes, ArrowLeft/ArrowRight navigates

### Tool Sidebar (`tool-sidebar.tsx`)
- Alternative side panel view for tool calls
- Slide-in from right

### Tool Content (`tool-content.tsx`)
- JSON input/output display with syntax highlighting
- Uses `json-tree.tsx` for interactive tree view

---

## JSON Visualization (`components/json/`)

### JsonTree (`json-tree.tsx`)
- Interactive collapsible JSON tree
- Syntax-colored: keys (purple), strings (green), numbers (blue), booleans (pink), null (gray)
- Colors from CSS variables: `--json-key`, `--json-string`, `--json-number`, `--json-bool`, `--json-null`
- Supports search with highlighting (`jt-highlight`, `jt-highlight-active`)

### JsonSection (`json-section.tsx`)
- Wrapper with collapsible header + optional fullscreen button

### FullscreenViewer (`fullscreen-viewer.tsx`)
- Full-screen JSON viewer overlay

---

## Markdown Rendering (`components/markdown/markdown-renderer.tsx`)

Uses `react-markdown` + `remark-gfm`. Normalization pipeline:
1. Replace literal `\n` sequences with actual newlines
2. Insert blank line before list items (`- `, `* `, `1. `) so markdown parser creates `<ul>`/`<ol>`
3. Insert blank line before headings (`# `, `## `, etc.)

Accepts optional `className` prop to override default `prose` styles.

System prompt view uses Roboto Condensed font with custom `.prompt-markdown` CSS:
- Headings h1-h4 with distinct sizes and bold 700 weight
- Lists with proper `list-style-type` (disc/circle/square for nesting)
- Token count via `js-tiktoken` (debounced 5s in edit mode)

---

## Color Palette

| Purpose | Variable / Hex |
|---------|---------------|
| Brand | `--brand` (#2563eb light / #3b82f6 dark) |
| Card bg | `--card` (#ffffff / #141425) |
| Surface | `--surface` (translucent white / translucent dark) |
| Border | `--border` (#e5e7eb / rgba white 10%) |
| Muted text | `--muted` (#6b7280 / #9ca3af) |
| Grade correct | `--grade-correct-*` (green) |
| Grade partial | `--grade-partial-*` (yellow) |
| Grade wrong | `--grade-wrong-*` (red) |
| Tag blue | `--tag-blue-bg` / `--tag-blue-text` |
| Tag green | `--tag-green-bg` / `--tag-green-text` |
| Compare run colors | #0066cc, #ff9800, #28a745, #9c27b0, #dc3545 |

Light/dark theme toggled via `data-theme="dark"` attribute on `<html>`.

---

## Key UX Patterns

1. **Glass morphism cards**: `backdrop-filter: blur(16px) saturate(180%)` on surfaces
2. **Tabular numbers**: `tabular-nums` class for right-aligned numeric columns
3. **Collapsible sections**: ChevronDown/ChevronRight toggle for per-query cost breakdown
4. **Grade-colored responses**: response box border+bg matches its grade color
5. **Tool pills are interactive**: hover inverts, click opens modal with full I/O
6. **Modal keyboard nav**: Escape/ArrowLeft/ArrowRight
7. **TanStack Query caching**: analytics data cached and auto-refreshed
8. **Responsive**: grid layouts collapse on narrow screens
9. **Dark mode**: full CSS variable-based theme with automatic detection

---

## Self-Contained HTML Export

The `/api/export/html` endpoint still generates a single-file HTML with:
- All CSS, JS, and data embedded (no external dependencies)
- Two JSON blobs injected: `allQueries` (per-query array) and `S` (summary stats)
- Custom JS markdown renderer (no library)
- Works offline, sharable as a single file
