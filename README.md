# Manufacturing Production Monitoring System

An industrial-grade Manufacturing Execution System (MES) designed to monitor plant-wide production output, enforce strict shop-floor business rules, track energy consumption efficiency, and provide real-time analytical insights across production lines, shifts, and products.

Built as a technical hiring assignment adhering to ACID relational principles with PostgreSQL 18, Node.js, Express, TypeScript, React, Tailwind CSS, and Recharts.

---

## 🏗️ System Architecture & Monorepo Structure

The project is structured as a clean npm workspaces monorepo:

```text
project/
├── backend/                      # Node.js + Express + TypeScript Backend
│   ├── src/
│   │   ├── config/               # Zod-validated environment configurations
│   │   ├── controllers/          # Request handling (metadata, production, analytics)
│   │   ├── db/
│   │   │   ├── pool.ts           # PostgreSQL connection pool with transaction helpers
│   │   │   ├── schema.sql        # PostgreSQL 18 DDL (constraints, triggers, indexes)
│   │   │   ├── migrate.ts        # Automated DDL migration runner
│   │   │   └── seed.ts           # Verified plant seed generator (4 lines, 5 products, 3 shifts)
│   │   ├── middleware/           # Zod schema validation & centralized error handler
│   │   ├── routes/               # REST API endpoints
│   │   ├── services/             # Core business rules, concurrency locks & SQL analytics
│   │   ├── tests/                # Automated Vitest + Supertest test suites
│   │   ├── validators/           # Zod input & query validation schemas
│   │   ├── app.ts                # Express application setup
│   │   └── server.ts             # Server entrypoint
│   ├── tsconfig.json
│   └── vitest.config.ts
├── frontend/                     # React 18 + TypeScript + Vite + Tailwind CSS
│   ├── src/
│   │   ├── api/                  # Typed async backend client
│   │   ├── components/           # UI components (Navbar, KpiCards, Charts, Table, Form)
│   │   ├── types/                # Domain TypeScript models
│   │   ├── App.tsx               # Primary control-room dashboard layout
│   │   └── main.tsx
│   ├── tailwind.config.js
│   ├── vite.config.ts            # Vite config with API reverse proxy
│   └── tsconfig.json
├── docker-compose.yml            # PostgreSQL 18 container orchestration
├── package.json                  # Root monorepo workspace configuration
└── README.md                     # Complete system documentation
```

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Database** | PostgreSQL 18.6 (ACID-compliant relational constraints, composite foreign keys, PL/pgSQL triggers) |
| **Backend** | Node.js (v22), Express.js, TypeScript, `pg` pool, Zod validation |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Recharts, Lucide Icons |
| **Testing** | Vitest, Supertest (Integration tests, business rules, concurrency, SQL aggregations) |
| **Containerization** | Docker Compose (`postgres:18-alpine`) |

---

## 🏭 Domain Configuration & Seed Specifications

The system is pre-configured and seeded with verified manufacturing infrastructure:

### 1. Four Production Lines
- **Line 1 (`L1`)**: Line 1 (CNC Precision Machining)
- **Line 2 (`L2`)**: Line 2 (Automated Assembly Alpha)
- **Line 3 (`L3`)**: Line 3 (Surface Treatment & Paint)
- **Line 4 (`L4`)**: Line 4 (High-Speed Packaging & QC)

### 2. Five Products
- **`PROD-01`**: Titanium Impeller Shaft *(Aerospace Components)*
- **`PROD-02`**: Hydraulic Control Valve *(Automotive Powertrain)*
- **`PROD-03`**: Electronic Sensor Housing *(Industrial Electronics)*
- **`PROD-04`**: Alloy Turbine Blade *(Aerospace Components)*
- **`PROD-05`**: Pneumatic Cylinder Assembly *(Industrial Automation)*

### 3. Three Operating Shifts
- **Shift 1**: Morning Shift (06:00:00 – 14:00:00, 8.0 hrs)
- **Shift 2**: Afternoon Shift (14:00:00 – 22:00:00, 8.0 hrs)
- **Shift 3**: Night Shift (22:00:00 – 06:00:00, 8.0 hrs)

### 4. Line-Product Tooling Mappings
In real manufacturing, machines have tooling constraints:
- **Line 1**: Compatible with `PROD-01`, `PROD-02`, `PROD-04`
- **Line 2**: Compatible with `PROD-02`, `PROD-03`, `PROD-05`
- **Line 3**: Compatible with `PROD-01`, `PROD-03`, `PROD-04`
- **Line 4**: High-Speed Packaging & QC can process all 5 products (`PROD-01` through `PROD-05`)

---

## 🔒 Business Rules & Concurrency Handling

The system strictly enforces industrial shop-floor constraints at **both the application and database schema levels**:

### Rule 1: One Product per Production Line per Day
* **Requirement**: A production line cannot switch products mid-day across different shifts. Once a line begins producing a product on a calendar date, all subsequent shifts on that date must produce that same product.
* **Database Enforcement**:
  - Maintained in `line_daily_allocations` table with primary key `(line_id, production_date)`.
  - A composite foreign key on `production_records(line_id, production_date, product_id)` references `line_daily_allocations(line_id, production_date, product_id)`.
  - An atomic `BEFORE INSERT OR UPDATE` PL/pgSQL trigger (`trg_enforce_daily_product_allocation`) detects any attempt to introduce a different product on that date and raises error `23514` (`Business Rule Violation`).
* **Concurrency Safety**:
  - `INSERT INTO line_daily_allocations ... ON CONFLICT (line_id, production_date) DO UPDATE ... RETURNING product_id` inside an isolated transaction guarantees that concurrent requests race safely and cannot create conflicting product assignments.

### Rule 2: One Record per Line, Date, and Shift
* **Requirement**: Only one production entry is permitted per line for any given shift on a specific date.
* **Database Enforcement**:
  - Enforced via unique constraint `uq_line_date_shift UNIQUE (line_id, production_date, shift_id)`.
  - Concurrent submissions for the same shift trigger a unique constraint violation (`23505`), which the backend gracefully returns as `409 Conflict`.

### Rule 3: Line-Product Compatibility
* **Requirement**: Operators cannot record production of a product on a line that lacks compatible tooling.
* **Database Enforcement**:
  - Enforced by foreign key `fk_line_product FOREIGN KEY (line_id, product_id) REFERENCES line_products(line_id, product_id)`.

### Rule 4: Data Integrity & Defect Constraints
* `units_produced >= 0`
* `defect_units >= 0 AND defect_units <= units_produced`
* `good_units` is generated deterministically: `good_units INT GENERATED ALWAYS AS (units_produced - defect_units) STORED`
* `energy_consumption_kwh >= 0`

---

## 📊 Real PostgreSQL Analytics Engine

The dashboard displays zero hardcoded metrics. All figures and charts are computed using pure PostgreSQL aggregations:

1. **Overall KPIs**:
   ```sql
   SELECT 
     SUM(units_produced)::int AS total_units,
     SUM(good_units)::int AS good_units,
     SUM(defect_units)::int AS defect_units,
     ROUND(SUM(defect_units)::numeric / NULLIF(SUM(units_produced), 0)::numeric * 100, 2) AS scrap_rate_pct,
     ROUND(SUM(energy_consumption_kwh)::numeric, 2) AS total_energy_kwh,
     ROUND(SUM(energy_consumption_kwh)::numeric / NULLIF(SUM(units_produced), 0)::numeric, 4) AS energy_per_unit_kwh
   FROM production_records;
   ```
2. **Daily Production & Quality Trends**:
   - Time-series aggregated by `production_date`.
3. **Monthly Production**:
   - Aggregated by `TO_CHAR(production_date, 'YYYY-MM')`.
4. **Shift Comparisons**:
   - Grouped by `s.id, s.shift_number, s.name` comparing production volume, scrap rate %, and energy per unit across Morning, Afternoon, and Night shifts.
5. **Product Comparisons**:
   - Grouped by product SKU comparing volume produced and energy intensity.
6. **Specific Energy Intensity (kWh/unit)**:
   - Evaluates energy efficiency: `SUM(energy_consumption_kwh) / NULLIF(SUM(units_produced), 0)`.

---

## 🚀 Setup & Installation Guide

### Prerequisites
- **Node.js**: v20 or v22 (detected: `v22.19.0`)
- **npm**: v10 (detected: `10.9.3`)
- **PostgreSQL**: PostgreSQL 18 (e.g. Postgres.app on macOS or Docker)

### 1. Environment Configuration

Create or verify `backend/.env`:

```env
PORT=5001
NODE_ENV=development
DATABASE_URL=postgresql://rohitkumar@localhost:5432/manufacturing_db
TEST_DATABASE_URL=postgresql://rohitkumar@localhost:5432/manufacturing_test_db
```

### 2. Database Creation & Migration

If using Postgres.app on macOS:
```bash
# Export PostgreSQL 18 tools to PATH if not already in global PATH:
export PATH="/Applications/Postgres.app/Contents/Versions/18/bin:$PATH"

# Create application and test databases:
createdb -h localhost -p 5432 -U rohitkumar manufacturing_db
createdb -h localhost -p 5432 -U rohitkumar manufacturing_test_db
```

*(Alternatively, if running via Docker: `docker compose up -d`)*

Run migrations and seed the database with historical shift records:
```bash
npm run db:migrate
npm run db:seed
```

### 3. Running the Application

Run both backend and frontend concurrently in development mode:
```bash
npm run dev
```
- **Backend API**: `http://localhost:5001`
- **Frontend Dashboard**: `http://localhost:3000`

---

## 🧪 Automated Testing

The backend includes a comprehensive Vitest + Supertest suite testing business rules, validation constraints, concurrency, and real SQL aggregations.

Run the test suite:
```bash
npm test
```

### Test Coverage Highlights:
- **`business-rules.test.ts`**:
  1. Successful creation of valid shift record with generated good units and scrap rate.
  2. One record per line/date/shift constraint (409 Conflict on duplicate).
  3. One product per line per day constraint (409 Conflict on different product on same line and date).
  4. Permitting same product on same line across different shifts of the same day.
  5. Rejecting product not mapped to line tooling (400 Bad Request).
  6. Rejecting defect units greater than total units produced (400 Bad Request).
  7. Rejecting negative units or energy values (400 Bad Request).
  8. Concurrent insertion handling (Promise.all race condition test).
- **`analytics.test.ts`**:
  1. KPI aggregation calculation accuracy (good + defect = total).
  2. Daily production time series queries.
  3. 3-shift comparison aggregations.
  4. 5-product comparison aggregations.
  5. 4-line performance breakdown.
  6. Query filter application (date range, line filter).

---

## 🚢 Production Build & Deployment

To build all packages for production:
```bash
npm run build
```

- Backend builds cleanly via `tsc` to `backend/dist/`.
- Frontend builds an optimized production bundle via `vite build` to `frontend/dist/`.

To start the production backend:
```bash
npm run start --workspace=backend
```
