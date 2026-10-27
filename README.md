# Manufacturing Operations — Production & Energy Monitoring

An enterprise Manufacturing Execution System (MES) and production monitoring platform built to track plant-wide output, velocity, and energy consumption while strictly enforcing assignment business rules and relational constraints.

Engineered with **PostgreSQL 18.6**, **Node.js/Express (TypeScript)**, **React 18 (TypeScript)**, **Tailwind CSS**, and **Recharts**.

> **Author Attribution:** Designed & Developed by Rohit Kumar

---

## 📋 Technical Hiring Assignment Compliance Matrix

| Requirement | Implementation & Technical Evidence | Verification Status |
| :--- | :--- | :--- |
| **4 Production Lines** | `production_lines` (Line 1 `L1`, Line 2 `L2`, Line 3 `L3`, Line 4 `L4`) | ✅ Verified |
| **5 Products** | `products` (Product 1 through Product 5) | ✅ Verified |
| **3 Shifts** | `shifts` (**Shift A**, **Shift B**, **Shift C**) | ✅ Verified |
| **Exact Compatibility Matrix** | • **Line 1**: Product 1, Product 2, Product 3, Product 4<br>• **Line 2**: Product 2, Product 4<br>• **Line 3**: Product 1 only<br>• **Line 4**: Product 1, Product 3, Product 5<br>Enforced by `line_products` table and foreign key constraint `fk_line_product` | ✅ Verified in DB & 8 automated matrix tests |
| **1 Product per Line per Day** | Enforced across all shifts via composite table `line_daily_allocations` `UNIQUE (line_id, production_date)` and atomic trigger `trg_enforce_daily_product_allocation` | ✅ Verified in DB & automated tests |
| **1 Record per Line/Date/Shift** | Enforced via unique constraint `uq_line_date_shift UNIQUE (line_id, production_date, shift_id)` returning `409 Conflict` | ✅ Verified in DB & automated tests |
| **Line Speed Metric** | `line_speed NUMERIC(10, 2) NOT NULL CHECK (line_speed >= 0)` in `production_records` | ✅ Verified in DB, forms, tables & trend chart |
| **Operator Data Entry** | Operator form validating date, line, shift, compatible products, line speed, whole number quantity, energy consumption, and daily product lock | ✅ Verified in UI & API |
| **Real PostgreSQL Analytics** | Zero hardcoded metrics. Direct SQL aggregations for:<br>• Total production for each shift (Shift A, B, C)<br>• Total daily production by line and product<br>• Total monthly production (using selected calendar month)<br>• Total energy consumed per shift<br>• Total daily energy consumption by line and product<br>• Total monthly energy consumption<br>• Line-speed trends across shifts<br>• Energy per unit (zero-division safe) | ✅ Verified in SQL queries & Recharts dashboard |
| **Enterprise UI/UX** | Clean white/light workspace, deep navy navigation shell, restrained accents, readable tabular figures, and author footer credit | ✅ Verified |
| **Automated Testing** | Vitest + Supertest test suites covering 21 comprehensive tests | ✅ 21 / 21 Passed |

---

## 🏗️ Architecture & Monorepo Structure

```text
project/
├── backend/                      # Node.js + Express + TypeScript Backend
│   ├── src/
│   │   ├── config/               # Zod-validated environment config
│   │   ├── controllers/          # Express route controllers
│   │   ├── db/
│   │   │   ├── pool.ts           # PostgreSQL connection pool
│   │   │   ├── schema.sql        # PostgreSQL 18 DDL (constraints, triggers, indexes)
│   │   │   ├── migrate.ts        # Database migration runner
│   │   │   └── seed.ts           # 14-day historical production seed generator
│   │   ├── middleware/           # Zod validator & PostgreSQL error code mapper
│   │   ├── routes/               # API endpoint definitions
│   │   ├── services/             # Transactional services & pure SQL analytics
│   │   ├── tests/                # Automated Vitest + Supertest suites
│   │   ├── validators/           # Zod schemas (whole number quantities, non-negative speeds)
│   │   ├── app.ts                # Express app setup
│   │   └── server.ts             # Server entrypoint
│   ├── tsconfig.json
│   └── vitest.config.ts
├── frontend/                     # React 18 + TypeScript + Vite + Tailwind CSS
│   ├── src/
│   │   ├── api/                  # Typed async API client
│   │   ├── components/           # Navbar, KpiCards, DashboardCharts, Form, Table
│   │   ├── types/                # Domain TypeScript models
│   │   ├── App.tsx               # Primary corporate dashboard shell
│   │   └── main.tsx
│   ├── tailwind.config.js
│   ├── vite.config.ts            # Vite proxy configuration
│   └── tsconfig.json
├── docs/
│   └── assignment-compliance.md  # Detailed audit report and compliance matrix
├── docker-compose.yml            # PostgreSQL 18 container service
├── package.json                  # Root npm workspaces configuration
└── README.md
```

---

## 🔒 Relational Constraints & Concurrency Safeguards

1. **One Product per Production Line per Day**:
   - `line_daily_allocations` table with primary key `(line_id, production_date)`.
   - Referenced by composite foreign key `(line_id, production_date, product_id)`.
   - An atomic PL/pgSQL trigger `trg_enforce_daily_product_allocation` raises exception `23514` on conflicting mid-day product switches.
   - Race conditions are safely handled in database transactions using `INSERT INTO line_daily_allocations ... ON CONFLICT (line_id, production_date) DO UPDATE`.
2. **One Record per Line, Date, and Shift**:
   - Unique constraint `uq_line_date_shift UNIQUE (line_id, production_date, shift_id)`.
   - Concurrent submissions trigger `23505` which the backend maps to `409 Conflict`.
3. **Line-Product Compatibility Matrix**:
   - Enforced by `fk_line_product FOREIGN KEY (line_id, product_id) REFERENCES line_products(line_id, product_id)`.
4. **Data Integrity & Non-Negative Validation**:
   - `line_speed NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (line_speed >= 0)`.
   - `units_produced INT NOT NULL CHECK (units_produced >= 0)`.
   - `good_units` generated column: `good_units INT GENERATED ALWAYS AS (units_produced - defect_units) STORED`.
   - Specific energy consumption calculates `SUM(energy) / NULLIF(SUM(units), 0)` to guarantee zero-division safety.

---

## 📊 Real PostgreSQL Analytics Engine

The application performs all calculations inside PostgreSQL:

- **Plant KPIs**: Total Production, Total Energy, Avg Line Speed, Specific Energy per Unit, and Yield Rate.
- **Daily Production & Quality Trend**: Good units vs scrap units over time.
- **Daily Energy & Intensity Trend**: Grid energy draw (kWh) vs energy per unit (kWh/u).
- **Shift Comparisons**: Production quantity, energy, and line speed across **Shift A**, **Shift B**, and **Shift C**.
- **Product Comparisons**: Volume and specific energy intensity across **Product 1** through **Product 5**.
- **Line Comparisons**: Throughput and energy across **Line 1** through **Line 4**.
- **Line-Speed Trends**: Average velocity (units/hour) progression across operating shifts.
- **Daily Line & Product Breakdown Table**: Relational grouping of daily volume and energy by line and product.

---

## 🚀 Setup & Execution Guide

### Prerequisites
- **Node.js**: v20 or v22 (Active LTS)
- **npm**: v10+
- **PostgreSQL 18**: Running on `localhost:5432` (via Postgres.app on macOS or Docker)

### 1. Environment Configuration

Verify [`backend/.env`](file:///Users/rohitkumar/Desktop/project/backend/.env):

```env
PORT=5001
NODE_ENV=development
DATABASE_URL=postgresql://rohitkumar@localhost:5432/manufacturing_db
TEST_DATABASE_URL=postgresql://rohitkumar@localhost:5432/manufacturing_test_db
```

### 2. Database Migration & Seeding

```bash
# If using Postgres.app on macOS, ensure psql tools are in PATH:
export PATH="/Applications/Postgres.app/Contents/Versions/18/bin:$PATH"

# Run migrations:
npm run db:migrate

# Seed 4 lines, 5 products, 3 shifts, exact mappings, and 14 days of shift records:
npm run db:seed
```

*(Alternatively, to spin up PostgreSQL via Docker: `docker compose up -d`)*

### 3. Running the Application

```bash
# Start backend API (port 5001) and frontend dashboard (port 3000) concurrently:
npm run dev
```

- **Frontend Application**: `http://localhost:3000`
- **Backend API**: `http://localhost:5001/api/health`

---

## 🧪 Automated Testing

Run the full automated test suite:

```bash
npm test
```

### Verified Test Cases (21 / 21 Passed):
- **Compatibility Matrix Suite (`business-rules.test.ts`)**:
  1. Line 1 accepts Products 1, 2, 3, 4
  2. Line 1 rejects Product 5 with 400
  3. Line 2 accepts Products 2, 4
  4. Line 2 rejects Products 1, 3, 5 with 400
  5. Line 3 accepts Product 1 only
  6. Line 3 rejects Products 2, 3, 4, 5 with 400
  7. Line 4 accepts Products 1, 3, 5
  8. Line 4 rejects Products 2, 4 with 400
  9. Enforces 1 product per line per day across shifts (rejects switch with 409)
  10. Allows same product on same line in subsequent shifts of the same day
  11. Enforces 1 record per line/date/shift (rejects duplicate with 409)
  12. Rejects negative line speed with 400
  13. Rejects fractional or negative production quantity with 400
  14. Safely handles concurrent race conditions on shift entry
- **Analytics & SQL Aggregation Suite (`analytics.test.ts`)**:
  1. GET `/api/analytics/kpis` returns aggregated volume, energy, line speed, and efficiency
  2. GET `/api/analytics/daily-production` returns daily time series
  3. GET `/api/analytics/daily-by-line-product` groups daily output by line and product
  4. GET `/api/analytics/monthly-production` supports calendar month filtering (`YYYY-MM`)
  5. GET `/api/analytics/shift-comparison` returns Shift A, Shift B, and Shift C
  6. GET `/api/analytics/line-speed-trends` returns velocity progression
  7. Handles zero-production safely without divide-by-zero errors

---

## 📦 Production Build

```bash
npm run build
```

- Backend compiles via `tsc` to [`backend/dist/`](file:///Users/rohitkumar/Desktop/project/backend/dist).
- Frontend bundles an optimized production build via Vite to [`frontend/dist/`](file:///Users/rohitkumar/Desktop/project/frontend/dist).
