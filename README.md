# GridFlow

A visual, node-based data transformation engine for Excel and CSV files. Upload spreadsheets, build a pipeline by connecting transformation blocks on a canvas, preview results at every step, and export clean, formatted output — without writing code.

![GridFlow UI](https://placeholder.com/banner)

---

## What it does

Excel users often maintain complex chains of formulas, VLOOKUP sheets, and manual cleanup steps spread across dozens of tabs. GridFlow turns that process into a **dataflow graph**: each step is an explicit, named node with visible inputs and outputs. You can branch, join multiple files, validate data, and export formatted results — all in a single auditable workflow.

The closest analogies are Power Query (for the Excel-native feel) and DaVinci Resolve Fusion (for the node-canvas model). Unlike generic ETL tools, GridFlow is built around the specific operations Excel users actually do: VLOOKUP replacements, deduplication, filtering, pivot-style aggregation, and formula columns.

---

## Features

- **Visual node canvas** — drag nodes from a library, connect them with edges, configure inline
- **29 built-in transformation nodes** across 7 categories
- **Multi-sheet support** — drag any sheet from any uploaded file directly to the canvas as a pre-configured input node
- **Live data preview** — click any node after running to see its output table, schema, row count stats, and errors
- **Content-hash caching** — unchanged upstream nodes are not re-executed; only modified nodes and their descendants re-run
- **DuckDB execution engine** — every node compiles to SQL; no `eval()`, no raw Python execution of user input
- **Workflow save/load** — graphs are stored as JSON and persist in a database
- **Export** — download output as `.xlsx` or `.csv`
- **Light, Office-style UI** — white/gray theme with Excel-green accents, compact node cards

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, React Flow (`@xyflow/react`), TanStack Table, Zustand, Tailwind CSS v4 |
| Backend | Python 3.12, FastAPI, Pydantic v2 |
| Data engine | Polars (file I/O), DuckDB (all transformations) |
| File parsing | OpenPyXL (Excel), Polars CSV reader |
| File storage | Parquet (cached node inputs), local disk |
| Database | SQLite (default) / PostgreSQL (Docker) |
| Containerisation | Docker Compose |

---

## Getting started

### Prerequisites

- Python 3.12+
- Node.js 20+
- Git

### 1 — Clone and install

```bash
git clone <repo-url>
cd gridflow
```

**Backend**

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\pip install -r requirements.txt

# macOS / Linux
.venv/bin/pip install -r requirements.txt
```

**Frontend**

```bash
cd frontend
npm install
```

### 2 — Environment variables

Copy the example file and edit as needed:

```bash
cp .env.example backend/.env
```

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./gridflow.db` | SQLAlchemy connection string |
| `FILE_STORAGE_PATH` | `./storage/files` | Where uploaded files and Parquet cache are written |
| `CORS_ORIGINS` | `["http://localhost:5173"]` | Allowed frontend origins (JSON array string) |
| `MAX_UPLOAD_SIZE_MB` | `100` | Maximum upload size in megabytes |
| `PREVIEW_ROW_LIMIT` | `200` | Number of rows returned in node previews |

### 3 — Run locally

Open two terminals:

```bash
# Terminal 1 — backend (port 8000)
cd backend
start.bat          # Windows
# or: .venv/Scripts/uvicorn app.main:app --port 8000 --reload

# Terminal 2 — frontend (port 5173)
cd frontend
npm run dev
```

Open `http://localhost:5173`.

---

## Docker (recommended for production)

```bash
docker-compose up --build
```

This starts:
- **backend** on port `8000` (FastAPI, hot-reload enabled via volume mount)
- **postgres** on port `5432`

The frontend is not included in Docker Compose by default — run it locally with `npm run dev` pointing at `localhost:8000`.

To use PostgreSQL locally without Docker, set:

```
DATABASE_URL=postgresql://gridflow:gridflow@localhost:5432/gridflow
```

---

## Project structure

```
gridflow/
│
├── backend/
│   ├── app/
│   │   ├── main.py               # FastAPI app, CORS, lifespan
│   │   ├── config.py             # Settings (pydantic-settings)
│   │   ├── database.py           # SQLAlchemy engine, Base, init_db
│   │   │
│   │   ├── models/
│   │   │   ├── file.py           # UploadedFile ORM model
│   │   │   └── workflow.py       # Workflow ORM model
│   │   │
│   │   ├── routes/
│   │   │   ├── health.py         # GET /health
│   │   │   ├── upload.py         # POST /files/upload, GET /files, preview
│   │   │   ├── workflow.py       # CRUD /workflows
│   │   │   ├── execute.py        # POST /workflows/{id}/run
│   │   │   ├── exports.py        # GET /files/exports/{filename}
│   │   │   └── nodes.py          # GET /nodes (registered node types)
│   │   │
│   │   ├── engine/
│   │   │   ├── models.py         # Pydantic: GraphNode, GraphEdge, NodeResult
│   │   │   ├── node_registry.py  # @register decorator, _load_all()
│   │   │   ├── graph_executor.py # Topological sort, DuckDB execution loop
│   │   │   ├── cache.py          # In-process result cache (content hash)
│   │   │   └── nodes/
│   │   │       ├── input_nodes.py      # excel_input, csv_input, passthrough
│   │   │       ├── cleaning_nodes.py   # filter, sort, rename, trim, fill…
│   │   │       ├── formula_nodes.py    # add_column, split, merge, date_extract…
│   │   │       ├── join_nodes.py       # join, append, group_by, lookup
│   │   │       ├── output_nodes.py     # excel_output, csv_output
│   │   │       └── validation_nodes.py # find_duplicates, find_missing, validate_regex
│   │   │
│   │   └── storage/
│   │       └── file_store.py     # Upload → Parquet conversion, sheet metadata
│   │
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── start.bat / start.sh
│   └── pyrightconfig.json
│
├── frontend/
│   └── src/
│       ├── api/
│       │   ├── client.ts         # Axios instance (baseURL: /api)
│       │   └── files.ts          # uploadFile, listFiles, getFilePreview
│       │
│       ├── components/
│       │   ├── App.tsx           # Root layout: toolbar + 3-panel + bottom
│       │   ├── NodeSidebar.tsx   # Files tab + Nodes tab (collapsible categories)
│       │   ├── FilePanel.tsx     # Upload zone, file list, draggable sheets
│       │   ├── NodeCanvas.tsx    # React Flow canvas, drop handler
│       │   ├── ConfigPanel.tsx   # Per-node config form (context-sensitive)
│       │   ├── PreviewPanel.tsx  # Preview / Schema / Stats / Errors tabs
│       │   ├── canvas/
│       │   │   └── GridFlowNode.tsx   # Custom node card (compact, status stripe)
│       │   └── config/
│       │       ├── InputNodeConfig.tsx   # File + sheet picker with column preview
│       │       ├── FilterRowsConfig.tsx  # Condition builder (AND/OR)
│       │       ├── GroupByConfig.tsx     # Group columns + metrics builder
│       │       ├── JoinConfig.tsx        # Key fields + join type selector
│       │       └── GenericConfig.tsx     # Fallback field-based form + raw JSON
│       │
│       ├── store/
│       │   └── workflowStore.ts  # Zustand: nodes, edges, results, run, save
│       │
│       └── types/
│           └── index.ts          # Shared TypeScript types
│
├── docker-compose.yml
├── .env.example
└── .gitignore
```

---

## How to build a workflow

### Basic example: clean and summarise sales data

1. **Upload** your Excel file in the **Files** tab (left sidebar).
2. **Drag a sheet** from the file tree onto the canvas — this creates a pre-configured **Excel Input** node.
3. From the **Nodes** tab, drag a **Filter Rows** node onto the canvas. Connect the Excel Input output (right handle) to the Filter Rows input (left handle).
4. Click the Filter Rows node to open its config. Add a condition: `status` → `equals` → `Active`.
5. Add a **Remove Duplicates** node, connect it, leave config blank (deduplicates on all columns).
6. Add an **Add Column** node. Set column name `profit`, expression `[revenue] - [cost]`.
7. Add a **Group By** node. Group by `region`. Add a metric: column `profit`, function `sum`, output name `total_profit`.
8. Add an **Excel Output** node. Set filename `summary.xlsx`.
9. Click **▶ Run** in the toolbar.
10. Click any node to preview its output in the bottom panel. Click the Output node, then download the file from the Stats tab.

### Working with multiple sheets

Each sheet from an uploaded file can become its own input node:

1. Upload a workbook with multiple sheets (e.g. `customers.xlsx` with sheets `Orders` and `Customers`).
2. In the Files tab, expand the file. Two sheet rows appear.
3. Drag `Orders` to the canvas → creates `Excel Input` pre-set to that sheet.
4. Drag `Customers` to the canvas → creates a second `Excel Input` for that sheet.
5. Add a **Join Tables** node. Connect `Orders` to the **left** handle and `Customers` to the **right** handle.
6. Configure: left key `customer_id`, right key `id`, join type `Left join`.
7. Continue building downstream nodes from the join output.

---

## Node reference

### Input / Output

| Node | Type key | Description |
|---|---|---|
| Excel Input | `excel_input` | Load a sheet from an uploaded `.xlsx` / `.xls` file |
| CSV Input | `csv_input` | Load an uploaded `.csv` file |
| Excel Output | `excel_output` | Write output to a formatted `.xlsx` file for download |
| CSV Output | `csv_output` | Write output to a `.csv` file for download |

**Excel Input config**

| Field | Description |
|---|---|
| `file_id` | ID of an uploaded file (selected via dropdown) |
| `sheet` | Sheet name (selected via radio card; auto-populated from file) |

---

### Column operations

| Node | Type key | Description |
|---|---|---|
| Select Columns | `select_columns` | Keep only the specified columns |
| Rename Columns | `rename_columns` | Rename one or more column headers |
| Drop Columns | `drop_columns` | Remove specified columns |
| Change Data Type | `change_data_type` | Cast a column to string / number / integer / date / boolean |

**Select Columns config**: `columns` — comma-separated list of column names to keep.

**Rename Columns config**: `renames` — list of `{from, to}` pairs (one per line in the UI: `old_name:new_name`).

**Change Data Type config**: `column` — column name; `to_type` — target type (`string`, `number`, `integer`, `date`, `boolean`).

---

### Row operations

| Node | Type key | Description |
|---|---|---|
| Filter Rows | `filter_rows` | Keep rows matching one or more conditions |
| Sort Rows | `sort_rows` | Sort by one or more columns |
| Remove Duplicates | `remove_duplicates` | Drop duplicate rows (optionally on a subset of columns) |
| Top N Rows | `top_n_rows` | Keep the first N rows, optionally ordered |

**Filter Rows config**

| Field | Description |
|---|---|
| `conditions` | Array of `{column, operator, value}` |
| `logic` | `AND` or `OR` — how conditions are combined |

Supported operators: `equals`, `not_equals`, `greater_than`, `less_than`, `greater_than_or_equal`, `less_than_or_equal`, `contains`, `starts_with`, `ends_with`, `is_empty`, `is_not_empty`.

**Sort Rows config**: `columns` — array of `{name, direction}` where direction is `asc` or `desc`.

---

### Cleaning

| Node | Type key | Description |
|---|---|---|
| Trim Text | `trim_text` | Remove leading/trailing whitespace from string columns |
| Fill Missing | `fill_missing` | Replace NULL values with a fixed value, mean, or median |
| Replace Values | `replace_values` | Find-and-replace within a column (exact string match) |
| Standardize Case | `standardize_case` | Convert to `upper`, `lower`, or `title` case |

---

### Formula

| Node | Type key | Description |
|---|---|---|
| Add Column | `add_column` | Add a new column from a SQL expression |
| Split Column | `split_column` | Split one column into multiple by a delimiter |
| Merge Columns | `merge_columns` | Concatenate multiple columns with a separator |
| Date Extract | `date_extract` | Extract year / month / day / weekday / quarter from a date column |
| Conditional Column | `conditional_column` | Add a column using CASE WHEN logic |

**Add Column config**

| Field | Example | Description |
|---|---|---|
| `column_name` | `profit` | Name of the new column |
| `expression` | `[revenue] - [cost]` | DuckDB SQL expression; wrap column names in `[brackets]` |

Column reference syntax: `[Column Name]` is automatically translated to `"Column Name"` in DuckDB SQL. You can use any DuckDB scalar function: `ROUND([amount], 2)`, `UPPER([name])`, `YEAR([order_date])`, etc.

**Conditional Column config**

| Field | Example | Description |
|---|---|---|
| `column_name` | `priority` | Name of the new column |
| `conditions` | `[revenue] > 10000 : High` | Array of `{when, then}` pairs |
| `else_value` | `Normal` | Value when no condition matches |

---

### Tables

| Node | Type key | Inputs | Description |
|---|---|---|---|
| Join Tables | `join_tables` | left, right | SQL-style join on a key column |
| Append Tables | `append_tables` | top, bottom | Stack two tables vertically |
| Group By | `group_by` | input | Aggregate with sum / avg / count / min / max |
| Lookup | `lookup` | main, lookup | VLOOKUP replacement — left join returning specific columns |

**Join Tables config**

| Field | Description |
|---|---|
| `left_key` | Column name in the left table |
| `right_key` | Column name in the right table |
| `join_type` | `left`, `inner`, `right`, or `full` |

**Group By config**

| Field | Description |
|---|---|
| `group_columns` | Columns to group by (array) |
| `aggregations` | Array of `{column, function, output_name}` |

Supported functions: `sum`, `avg`, `count`, `count_distinct`, `min`, `max`.

**Lookup config**

| Field | Description |
|---|---|
| `main_key` | Key column in the main table |
| `lookup_key` | Key column in the lookup table |
| `return_columns` | Columns to bring back from the lookup table (blank = all) |

---

### Validation

| Node | Type key | Description |
|---|---|---|
| Find Duplicates | `find_duplicates` | Adds a `_is_duplicate` boolean column |
| Find Missing | `find_missing` | Adds `_has_missing` and `_missing_columns` columns |
| Validate Regex | `validate_regex` | Adds a `_valid` boolean column based on a regex pattern |

**Validate Regex config**

| Field | Description |
|---|---|
| `column` | Column to validate |
| `preset` | `phone`, `email`, `zip`, `integer`, or `number` — uses a built-in pattern |
| `pattern` | Custom regex (used when no preset is set) |

---

## Execution model

When you click **Run**, the backend:

1. Loads the workflow graph from the database
2. Topologically sorts the nodes (Kahn's algorithm)
3. Executes each node in order using a single shared DuckDB in-memory connection
4. Each node receives a dict of `{port_name: view_name}` for its inputs, runs its SQL, and registers a new named view as output
5. Results (preview rows, schema, stats) are cached by `hash(node_config + input_view_names)`
6. If a node's config changes, its cache entry is invalidated; upstream nodes retain their cached results

**Adding custom nodes**

Every node follows this interface:

```python
from app.engine.node_registry import register
import duckdb

@register("my_node_type")
def my_node(
    con: duckdb.DuckDBPyConnection,
    inputs: dict[str, str],      # port name → DuckDB view name
    config: dict,                 # node configuration from the UI
) -> str:                         # return the name of the output view
    src = inputs["input"]
    view = "my_output_view"
    con.execute(f'CREATE OR REPLACE VIEW {view} AS SELECT * FROM "{src}"')
    return view
```

Place the file anywhere under `backend/app/engine/nodes/` and import it in `node_registry._load_all()`. The `@register` decorator adds it to the registry automatically — no other changes needed.

---

## API reference

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/files/upload` | Upload an Excel or CSV file (multipart) |
| `GET` | `/files` | List all uploaded files |
| `GET` | `/files/{id}` | Get file metadata |
| `GET` | `/files/{id}/sheets/{sheet}/preview` | Preview rows + schema for a sheet |
| `DELETE` | `/files/{id}` | Delete a file |
| `GET` | `/files/exports/{filename}` | Download an exported file |
| `GET` | `/nodes` | List all registered node type keys |
| `POST` | `/workflows` | Create a new workflow |
| `GET` | `/workflows` | List all workflows |
| `GET` | `/workflows/{id}` | Get a workflow |
| `PUT` | `/workflows/{id}` | Update workflow name or graph |
| `DELETE` | `/workflows/{id}` | Delete a workflow |
| `POST` | `/workflows/{id}/run` | Execute the full graph |
| `POST` | `/workflows/{id}/run/{node_id}` | Execute from a specific node forward |
| `DELETE` | `/workflows/{id}/cache` | Clear the node result cache |

Interactive API docs are available at `http://localhost:8000/docs` (Swagger UI) and `http://localhost:8000/redoc`.

---

## Workflow graph format

Workflows are stored and transmitted as plain JSON. You can export, version-control, and share them.

```json
{
  "name": "Clean and Summarise Sales",
  "graph": {
    "nodes": [
      {
        "id": "n1",
        "type": "excel_input",
        "position": { "x": 50, "y": 100 },
        "config": { "file_id": "abc-123", "sheet": "Orders" }
      },
      {
        "id": "n2",
        "type": "filter_rows",
        "position": { "x": 280, "y": 100 },
        "config": {
          "conditions": [{ "column": "status", "operator": "equals", "value": "Active" }],
          "logic": "AND"
        }
      },
      {
        "id": "n3",
        "type": "group_by",
        "position": { "x": 510, "y": 100 },
        "config": {
          "group_columns": ["region"],
          "aggregations": [
            { "column": "revenue", "function": "sum", "output_name": "total_revenue" }
          ]
        }
      }
    ],
    "edges": [
      { "id": "e1", "source": "n1", "source_port": "output", "target": "n2", "target_port": "input" },
      { "id": "e2", "source": "n2", "source_port": "output", "target": "n3", "target_port": "input" }
    ]
  }
}
```

---

## Roadmap

### V2 — Multi-file matching and validation
- Fuzzy matching node (approximate name matching)
- Reconciliation node (compare two tables with tolerance)
- Row count assertion node
- Multi-output ports (e.g. Validate splits into Valid / Invalid branches)

### V3 — Formula and template engine
- Saved reusable workflow templates
- Parameterised workflows (pass variables at run time)
- Scheduled / triggered runs

### V4 — Document intelligence
- PDF table extraction node
- Phone / vendor / provider matching node
- RFP requirement extraction

### V5 — AI agent nodes
- Classify rows with an LLM
- Extract entities (names, dates, vendor IDs)
- Natural language → auto-generated workflow graph
- Explain errors in plain English

---

## License

MIT
