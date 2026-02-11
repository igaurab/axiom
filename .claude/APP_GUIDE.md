# Axiom — Application Guide

## Overview

FastAPI + Next.js application for running, grading, and comparing LLM agent benchmarks. PostgreSQL-backed. Background execution with SSE live progress. Cost preview before runs. Trace logging for every API call. Tags for team separation (no auth). Shareable HTML/CSV/JSON export. In-app notifications.

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Backend | FastAPI |
| Frontend | Next.js 14 (App Router, TypeScript, TanStack Query) |
| Legacy Templates | Jinja2 (server-rendered, still mounted) |
| ORM | SQLAlchemy 2.0 async (asyncpg driver) |
| Migrations | Alembic (psycopg2 sync driver) |
| DB | PostgreSQL 16+ |
| SSE | sse-starlette |
| Agent SDK | openai-agents (`agents` package) |
| Package manager | uv (backend), npm (frontend) |
| Styling | Tailwind CSS v4, CSS variables, glass morphism |
| Fonts | Plus Jakarta Sans, Inter, JetBrains Mono, Roboto Condensed (prompt view) |

---

## Project Structure

```
axiom/
  .claude/
    APP_GUIDE.md             # This file
    DASHBOARD_SKILL.md       # Dashboard UI/UX reference

  main.py                    # FastAPI app factory, lifespan, CORS, router mounting
  config.py                  # Pydantic Settings (DATABASE_URL, OPENAI_API_KEY, OUTPUT_BASE_DIR)
  database.py                # Async engine + session factory + DeclarativeBase
  pyproject.toml             # uv project config + dependencies
  uv.lock                    # Lock file
  Dockerfile                 # Python 3.13-slim, uv sync, port 8000
  docker-compose.yml         # App + PostgreSQL services
  alembic.ini                # Alembic config
  seed.py                    # Seeds sample suite + agent config
  start.sh                   # Startup script (alembic upgrade + uvicorn)

  models/                    # SQLAlchemy ORM models
    __init__.py              # Re-exports all models
    suite.py                 # BenchmarkSuite
    query.py                 # Query
    agent.py                 # AgentConfig (+ source_code field)
    run.py                   # Run (run_group, run_number for repeats)
    result.py                # Result (+ trace_log_id FK)
    grade.py                 # Grade
    comparison.py            # Comparison + comparison_runs junction table
    trace_log.py             # TraceLog (API call tracing)
    run_cost_preview.py      # RunCostPreview (pre-run cost estimation)
    app_notification.py      # AppNotification

  schemas/
    schemas.py               # All Pydantic request/response models

  api/                       # REST API routers
    suites.py                # CRUD + CSV import for suites/queries
    agents.py                # CRUD + parse-code endpoint for agent configs
    runs.py                  # Create (with repeat), list, get, cancel, delete, group, cost preview
    results.py               # List/get results by run
    grades.py                # Upsert grade (correct/partial/wrong)
    analytics.py             # Single-run and cross-run analytics
    export.py                # HTML, CSV, JSON export endpoints
    sse.py                   # SSE stream endpoint for live progress
    browse.py                # Filesystem browser for output_dir selection
    comparisons.py           # Saved comparison CRUD
    traces.py                # Trace log listing + cost summaries
    notifications.py         # Notification list, mark read, delete all

  executors/                 # Pluggable agent execution backends
    base.py                  # ABC: AgentExecutor + ExecutionResult dataclass
    openai_agents.py         # OpenAI Agents SDK executor
    registry.py              # Register/get executor by type string

  workers/                   # Background job execution
    runner.py                # execute_run() — batch processing, SSE events, JSON output
    sse_bus.py               # In-process pub/sub with asyncio.Queue per subscriber

  services/                  # Business logic
    analytics.py             # compute_run_analytics(), compute_compare_analytics()
    html_export.py           # generate_export_html() — self-contained shareable HTML
    openai_pricing.py        # Model pricing data + calculate_cost() for token/tool usage

  pages/
    views.py                 # Legacy Jinja2 page routes (still mounted)

  templates/                 # Jinja2 HTML templates (legacy)
  static/                    # Legacy CSS/JS

  frontend/                  # Next.js application
    src/
      app/                   # App Router pages
        page.tsx             # Home — runs list (dashboard)
        layout.tsx           # Root layout (fonts, providers, navbar)
        globals.css          # CSS variables, theme, animations, prompt-markdown styles
        datasets/
          page.tsx           # Dataset (suite) list
          [id]/page.tsx      # Dataset detail — queries table, CSV import
        agents/
          page.tsx           # Agent list
          [id]/page.tsx      # Agent detail — tabbed view (general/prompt/tools/settings/paste)
          new/page.tsx       # New agent form (paste code or manual)
        runs/
          [id]/page.tsx      # Run detail — live progress, grading, dashboard tabs
          new/page.tsx       # New run form — cost preview integration
        compare/
          page.tsx           # Ad-hoc comparison picker
          [id]/page.tsx      # Saved comparison detail
        cost-previews/
          page.tsx           # Cost preview list + detail modal
        traces/
          page.tsx           # Trace log viewer with cost breakdown
        notifications/
          page.tsx           # Notification center
      components/
        layout/
          navbar.tsx         # Top navigation bar + tag filter + theme toggle
          page-header.tsx    # Reusable page header with back link + actions
        dashboard/
          dashboard-view.tsx # Single-run dashboard
          compare-dashboard.tsx # Multi-run comparison dashboard
          accuracy-overview.tsx
          accuracy-by-type.tsx
          performance-stats.tsx
          tool-usage-chart.tsx
        grading/
          grading-view.tsx   # Single-run grading interface
          grading-card.tsx   # Per-query card with grade buttons
          compare-card.tsx   # Multi-run query card
          grade-button.tsx
          grade-summary.tsx
          query-nav.tsx
          reasoning-display.tsx
        tool-calls/
          tool-pills.tsx     # Clickable tool call badges
          tool-modal.tsx     # Full-screen tool call detail modal
          tool-sidebar.tsx   # Tool call sidebar panel
          tool-content.tsx   # JSON input/output display
        json/
          json-tree.tsx      # Interactive JSON tree viewer
          json-section.tsx   # Collapsible JSON section wrapper
          fullscreen-viewer.tsx
        datasets/
          csv-import-modal.tsx
        runs/
          config-view.tsx    # Run config display (agent, model, prompt)
        markdown/
          markdown-renderer.tsx # ReactMarkdown + remarkGfm with normalization
        ui/
          tag-badge.tsx
          status-badge.tsx
          checkbox.tsx
      lib/
        api/                 # Typed API client modules
          client.ts          # Shared fetch wrapper
          agents.ts, analytics.ts, browse.ts, comparisons.ts,
          export.ts, grades.ts, notifications.ts, results.ts,
          runs.ts, suites.ts, traces.ts
        types.ts             # TypeScript type definitions
        utils.ts             # formatDate, cn() helper
        markdown-table.ts    # Copy markdown table to clipboard
      providers/
        query-provider.tsx   # TanStack Query provider
        tag-filter-provider.tsx # Global tag filter context

  alembic/
    env.py                   # Uses DATABASE_URL_SYNC from Settings
    versions/
      001_initial.py         # 6 core tables
      002_add_output_dir.py
      003_add_run_group.py
      004_add_comparisons.py
      005_rename_query_type_to_tag.py
      006_add_trace_logs.py
      007_add_run_cost_previews.py
      008_add_cost_preview_status_and_notifications.py
      009_add_agent_source_code.py
```

---

## Database Schema

### benchmark_suites
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | |
| name | VARCHAR(255) | |
| description | TEXT | nullable |
| tags | TEXT[] | PostgreSQL array, overlap filter |
| created_at | TIMESTAMPTZ | auto |
| updated_at | TIMESTAMPTZ | auto |

### queries
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | |
| suite_id | FK -> benchmark_suites | CASCADE delete |
| ordinal | INT | display order |
| tag | VARCHAR(100) | e.g. "archive_driven" (renamed from query_type) |
| query_text | TEXT | the benchmark question |
| expected_answer | TEXT | ground truth |
| comments | TEXT | nullable |
| metadata | JSONB | nullable, extra data |

### agent_configs
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | |
| name | VARCHAR(255) | |
| executor_type | VARCHAR(100) | default "openai_agents" |
| model | VARCHAR(255) | e.g. "gpt-5.2" |
| system_prompt | TEXT | agent instructions |
| tools_config | JSONB | MCP server URL + allowed tools |
| model_settings | JSONB | store, reasoning effort/summary |
| source_code | TEXT | nullable, original Python source |
| tags | TEXT[] | |
| created_at | TIMESTAMPTZ | auto |

### runs
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | |
| suite_id | FK -> benchmark_suites | |
| agent_config_id | FK -> agent_configs | |
| label | VARCHAR(255) | user-chosen name |
| run_group | VARCHAR(64) | nullable, links repeated runs |
| run_number | INT | 1-based, position in group |
| status | VARCHAR(50) | pending/running/completed/cancelled/failed |
| progress_current | INT | queries completed so far |
| progress_total | INT | total queries |
| batch_size | INT | queries per concurrent batch |
| error_message | TEXT | nullable |
| output_dir | TEXT | filesystem path for JSON output |
| tags | TEXT[] | |
| started_at | TIMESTAMPTZ | nullable |
| completed_at | TIMESTAMPTZ | nullable |
| created_at | TIMESTAMPTZ | auto |

### results
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | |
| run_id | FK -> runs | CASCADE delete |
| query_id | FK -> queries | |
| trace_log_id | FK -> trace_logs | nullable, links to API trace |
| agent_response | TEXT | nullable (null on error) |
| tool_calls | JSONB | [{name, arguments, response}] |
| reasoning | JSONB | [{summary: [...], content: [...]}] |
| usage | JSONB | {requests, input_tokens, output_tokens, ...} |
| execution_time_seconds | FLOAT | |
| error | TEXT | nullable |
| created_at | TIMESTAMPTZ | auto |

### grades
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | |
| result_id | FK -> results UNIQUE | one grade per result |
| grade | VARCHAR(50) | correct / partial / wrong |
| notes | TEXT | nullable |
| created_at | TIMESTAMPTZ | auto |
| updated_at | TIMESTAMPTZ | auto |

### comparisons
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | |
| name | VARCHAR(255) | nullable |
| suite_id | FK -> benchmark_suites | |
| created_at | TIMESTAMPTZ | auto |
| updated_at | TIMESTAMPTZ | auto |

### comparison_runs (junction)
| Column | Type | Notes |
|--------|------|-------|
| comparison_id | FK -> comparisons PK | CASCADE |
| run_id | FK -> runs PK | CASCADE |

### trace_logs
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | |
| run_id | FK -> runs | nullable, CASCADE, indexed |
| query_id | FK -> queries | nullable, indexed |
| provider | VARCHAR(50) | default "openai" |
| endpoint | VARCHAR(120) | e.g. "agents.runner.run" |
| model | VARCHAR(255) | nullable, indexed |
| status | VARCHAR(20) | started/completed/failed, indexed |
| request_payload | JSONB | nullable |
| response_payload | JSONB | nullable |
| usage | JSONB | nullable |
| error | TEXT | nullable |
| latency_ms | INT | nullable |
| started_at | TIMESTAMPTZ | |
| completed_at | TIMESTAMPTZ | nullable |
| created_at | TIMESTAMPTZ | auto, indexed |

### run_cost_previews
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | |
| suite_id | FK -> benchmark_suites | indexed |
| agent_config_id | FK -> agent_configs | indexed |
| label | VARCHAR(255) | |
| tags | TEXT[] | |
| batch_size | INT | default 10 |
| repeat | INT | default 1 |
| output_dir | TEXT | nullable |
| query_ids | INT[] | all selected query IDs |
| sample_query_ids | INT[] | sampled subset IDs |
| total_query_count | INT | |
| sample_usage | JSONB | usage_totals, cost_breakdown, per_query_costs |
| sample_cost_usd | FLOAT | total cost of sample queries |
| estimated_total_cost_usd | FLOAT | (sample_cost / sample_size) * total_queries |
| pricing_version | VARCHAR(64) | |
| currency | VARCHAR(8) | default "USD" |
| status | VARCHAR(20) | pending/completed/failed, indexed |
| error_message | TEXT | nullable |
| started_at | TIMESTAMPTZ | nullable |
| completed_at | TIMESTAMPTZ | nullable |
| approved_at | TIMESTAMPTZ | nullable |
| consumed_at | TIMESTAMPTZ | nullable |
| created_at | TIMESTAMPTZ | auto, indexed |

### app_notifications
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | |
| notif_type | VARCHAR(50) | indexed, e.g. "run_completed", "cost_preview" |
| title | VARCHAR(255) | |
| message | TEXT | |
| related_id | INT | nullable, indexed (links to run/preview) |
| is_read | BOOLEAN | default false, indexed |
| created_at | TIMESTAMPTZ | auto, indexed |

---

## API Endpoints

### Suites
| Method | Path | Purpose |
|--------|------|---------|
| GET | /api/suites | List suites (optional ?tag= filter) |
| POST | /api/suites | Create suite |
| GET | /api/suites/{id} | Suite detail with queries |
| PUT | /api/suites/{id} | Update suite |
| POST | /api/suites/{id}/import-csv | Import queries from CSV |
| POST | /api/suites/{id}/queries | Add single query |

### Agents
| Method | Path | Purpose |
|--------|------|---------|
| GET | /api/agents | List agents (optional ?tag=) |
| POST | /api/agents | Create agent config |
| GET | /api/agents/{id} | Get agent detail |
| PUT | /api/agents/{id} | Update agent config |
| DELETE | /api/agents/{id} | Delete agent |
| POST | /api/agents/parse-code | Parse Python code → extract agent config |

### Runs
| Method | Path | Purpose |
|--------|------|---------|
| GET | /api/runs | List all runs (optional ?tag=) |
| POST | /api/runs | Create run(s). Returns array. Set `repeat` > 1 for multiple |
| GET | /api/runs/group/{run_group} | List all runs in a group |
| GET | /api/runs/{id} | Get single run detail |
| POST | /api/runs/{id}/cancel | Cancel a running run |
| DELETE | /api/runs/{id} | Delete a run |
| POST | /api/runs/preview-cost | Run cost preview (samples up to 3 queries) |
| GET | /api/runs/preview-costs | List stored cost preview records |
| POST | /api/runs/preview-costs/{id}/retry | Retry a failed cost preview |

### Results & Grades
| Method | Path | Purpose |
|--------|------|---------|
| GET | /api/results?run_id= | List results for a run (with query + grade) |
| GET | /api/results/{id} | Single result detail |
| PUT | /api/grades/results/{result_id}/grade | Upsert grade (body: {grade, notes?}) |

### Analytics
| Method | Path | Purpose |
|--------|------|---------|
| GET | /api/analytics/runs/{run_id} | Single-run analytics |
| GET | /api/analytics/compare?run_ids=1,2,3 | Cross-run comparison analytics |

### Export
| Method | Path | Purpose |
|--------|------|---------|
| GET | /api/export/html?run_ids= | Self-contained shareable HTML |
| GET | /api/export/csv?run_ids= | CSV export |
| GET | /api/export/json?run_ids= | JSON export |

### SSE
| Method | Path | Purpose |
|--------|------|---------|
| GET | /api/runs/{run_id}/stream | EventSource for live progress |

### Comparisons
| Method | Path | Purpose |
|--------|------|---------|
| POST | /api/comparisons | Create saved comparison |
| GET | /api/comparisons | List comparisons |
| GET | /api/comparisons/{id} | Get comparison detail |
| DELETE | /api/comparisons/{id} | Delete comparison |

### Traces
| Method | Path | Purpose |
|--------|------|---------|
| GET | /api/traces | List trace logs (filters: run_id, model, status) |
| GET | /api/traces/summary | Aggregated trace cost summary |
| GET | /api/traces/{id} | Single trace detail |

### Notifications
| Method | Path | Purpose |
|--------|------|---------|
| GET | /api/notifications | List notifications (?unread_only, ?limit) |
| POST | /api/notifications/{id}/read | Mark notification as read |
| POST | /api/notifications/read-all | Mark all as read |
| DELETE | /api/notifications | Delete all notifications |

### Browse
| Method | Path | Purpose |
|--------|------|---------|
| GET | /api/browse | List dirs/files at path (for output_dir picker) |

---

## Key Features & Logic

### Tags (replaces auth)
- All entities have `tags TEXT[]`
- Global tag filter dropdown in navbar
- Filter uses PostgreSQL array overlap: `WHERE tags && ARRAY['tag']`
- Tags are free-form, comma-separated on input

### Run Execution Flow
1. `POST /api/runs` creates Run(s) with status=pending
2. `asyncio.create_task()` launches background `execute_run()` for each
3. Global semaphore limits to **max 3 concurrent runs**
4. Runner processes queries in batches (batch_size concurrent per batch)
5. Each result saved to DB + JSON file in output_dir
6. TraceLog created for each API call with usage/cost data
7. SSE events published via in-process `SSEBus` for live UI updates
8. On completion, status set to "completed", notification created

### Cost Preview Flow
1. User configures run in New Run form, clicks "Preview Cost"
2. `POST /api/runs/preview-cost` samples up to 3 queries from dataset
3. Each sample query executed against the agent
4. Per-query cost calculated using `services/openai_pricing.py`
5. Estimated total = `(sample_cost / sample_size) * total_queries_in_dataset`
6. Result stored in `run_cost_previews` table
7. User reviews cost breakdown, approves, then creates actual run
8. Notification sent on completion/failure

### Repeat Runs (Run Groups)
- New Run form has "Repeat" field (default 1)
- When repeat > 1:
  - All runs share a `run_group` UUID
  - Labels: "My Run (1/3)", "My Run (2/3)", "My Run (3/3)"
  - Output dirs: `<base>/run_1/`, `<base>/run_2/`, `<base>/run_3/`
  - Runs execute in parallel (up to 3 concurrent via semaphore)
- Viewing any run in a group auto-shows the tabbed compare view

### Output Directory
- Default: `~/axiom_data/<label>/`
- For grouped runs: `~/axiom_data/<label>/run_N/`
- Structure: `<output_dir>/json/<ordinal>.json`

### Executor Plugin System
- Abstract base: `AgentExecutor` with `execute(query, config) -> ExecutionResult`
- Registry pattern: `register()` / `get_executor(type_str)`
- Ships with `openai_agents` executor:
  - Builds `HostedMCPTool` from tools_config JSON
  - Creates `Agent` with model, instructions, ModelSettings
  - Runs via `Runner.run()` from agents SDK
  - Extracts tool calls, reasoning, usage stats

### Grading
- Three grades: correct, partial, wrong
- One grade per result (last writer wins)
- Weighted score: correct=1, partial=0.5, wrong=0

### Analytics
- Grade counts + accuracy + weighted score
- Breakdown by tag (renamed from query_type)
- Performance stats: mean, median, std, min, max for time/tokens/tools/reasoning
- Tool usage counters
- Cross-run consistency analysis (all_correct, all_wrong, inconsistent)

### Trace Logging
- Every agent SDK API call logged in `trace_logs` table
- Captures: provider, endpoint, model, request/response payloads, usage, latency
- Cost breakdown computed via `services/openai_pricing.py`
- Trace viewer page shows per-call costs and aggregated summaries
- Traces linked to results via `trace_log_id` FK

### Notifications
- In-app notification system for background events
- Types: run completion, cost preview completion/failure
- Custom confirm dialog (no browser alerts)
- Badge count in navbar, mark read/delete all

---

## Frontend (Next.js)

### Design System
- **Theme**: CSS variable-based light/dark toggle (data-theme attribute)
- **Glass morphism**: backdrop-filter blur on cards and surfaces
- **Colors**: Brand blue #2563eb, destructive red #ef4444, success green #22c55e
- **Cards**: Rounded-xl, border-border, subtle shadow
- **Fonts**: Plus Jakarta Sans (body), JetBrains Mono (code), Roboto Condensed (prompt view)
- **Grade colors**: Correct=green, Partial=yellow, Wrong=red (CSS variables)
- **Tag palette**: Blue, green, orange, purple, gray variants

### Pages
| Path | Purpose |
|------|---------|
| / | Runs list with status badges, progress bars, tag filter |
| /datasets | Dataset list with query counts |
| /datasets/[id] | Dataset detail — queries table, CSV import modal |
| /agents | Agent list cards with model, executor, tools |
| /agents/[id] | Agent detail — tabbed: General, System Prompt, Tools Config, Model Settings, Paste Code |
| /agents/new | New agent — paste code mode + manual entry |
| /runs/new | New run form — suite/agent picker, cost preview, query selection |
| /runs/[id] | Run detail — Live (SSE progress), Grading (per-query cards), Dashboard |
| /compare | Ad-hoc comparison picker |
| /compare/[id] | Saved comparison detail |
| /cost-previews | Cost preview list table + detail modal with cost/usage tables |
| /traces | Trace log viewer with filters and cost breakdown |
| /notifications | Notification center with custom confirm dialogs |

### Agent Detail Page Features
- Tabbed sidebar: General / System Prompt / Tools Config / Model Settings / Paste Code
- System prompt rendered with ReactMarkdown + remarkGfm in Roboto Condensed font
- Token count via js-tiktoken (debounced 5s in edit mode), char count
- Edit/View mode toggle with inline form editing
- Paste Code: syntax-highlighted Python editor with "Extract Config" parser
- Clone and Delete actions

---

## Configuration

### Environment Variables (.env)
```
DATABASE_URL=postgresql+asyncpg://user@localhost:5432/benchmark
DATABASE_URL_SYNC=postgresql://user@localhost:5432/benchmark
OPENAI_API_KEY=sk-...
OUTPUT_BASE_DIR=~/axiom_data
```

### Running Locally
```bash
# Database setup
createdb benchmark
uv run alembic upgrade head

# Seed data (optional)
uv run python3 -m seed

# Start backend (port 8000)
uv run uvicorn main:app --reload

# Start frontend (port 3000)
cd frontend && npm run dev
```

### Docker
```bash
docker compose up -d
```
