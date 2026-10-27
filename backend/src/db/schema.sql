-- Manufacturing Production Monitoring System Schema
-- PostgreSQL 18 Compatible DDL

-- 1. Production Lines (4 Lines)
CREATE TABLE IF NOT EXISTS production_lines (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Products (5 Products)
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    unit_of_measure VARCHAR(20) DEFAULT 'units',
    target_hourly_rate NUMERIC(10, 2) DEFAULT 100.00,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Shifts (3 Shifts)
CREATE TABLE IF NOT EXISTS shifts (
    id SERIAL PRIMARY KEY,
    shift_number INT UNIQUE NOT NULL CHECK (shift_number IN (1, 2, 3)),
    name VARCHAR(50) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_hours NUMERIC(4, 2) DEFAULT 8.00
);

-- 4. Line-Product Mappings (Specified compatibility between lines and products)
CREATE TABLE IF NOT EXISTS line_products (
    line_id INT NOT NULL REFERENCES production_lines(id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    PRIMARY KEY (line_id, product_id)
);

-- 5. Daily Line-Product Allocation (Enforces one product per line per day at DB level)
CREATE TABLE IF NOT EXISTS line_daily_allocations (
    line_id INT NOT NULL REFERENCES production_lines(id) ON DELETE CASCADE,
    production_date DATE NOT NULL,
    product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (line_id, production_date),
    UNIQUE (line_id, production_date, product_id)
);

-- 6. Production Records
CREATE TABLE IF NOT EXISTS production_records (
    id SERIAL PRIMARY KEY,
    line_id INT NOT NULL REFERENCES production_lines(id) ON DELETE RESTRICT,
    production_date DATE NOT NULL,
    shift_id INT NOT NULL REFERENCES shifts(id) ON DELETE RESTRICT,
    product_id INT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    units_produced INT NOT NULL CHECK (units_produced >= 0),
    defect_units INT NOT NULL CHECK (defect_units >= 0 AND defect_units <= units_produced),
    good_units INT GENERATED ALWAYS AS (units_produced - defect_units) STORED,
    energy_consumption_kwh NUMERIC(10, 2) NOT NULL CHECK (energy_consumption_kwh >= 0),
    operator_name VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraint: One record per line, date, and shift
    CONSTRAINT uq_line_date_shift UNIQUE (line_id, production_date, shift_id),
    
    -- Constraint: Must match allowed line-product mapping
    CONSTRAINT fk_line_product FOREIGN KEY (line_id, product_id) 
        REFERENCES line_products(line_id, product_id),

    -- Constraint: Must match line daily product allocation
    CONSTRAINT fk_line_daily_product FOREIGN KEY (line_id, production_date, product_id) 
        REFERENCES line_daily_allocations(line_id, production_date, product_id) ON DELETE CASCADE
);

-- Indexes for high performance analytical aggregations & filters
CREATE INDEX IF NOT EXISTS idx_prod_records_date ON production_records(production_date);
CREATE INDEX IF NOT EXISTS idx_prod_records_line ON production_records(line_id);
CREATE INDEX IF NOT EXISTS idx_prod_records_shift ON production_records(shift_id);
CREATE INDEX IF NOT EXISTS idx_prod_records_product ON production_records(product_id);
CREATE INDEX IF NOT EXISTS idx_prod_records_composite ON production_records(production_date, line_id, shift_id);

-- Trigger Function: Automatically allocate line product for the day or validate match
CREATE OR REPLACE FUNCTION trg_enforce_daily_product_allocation()
RETURNS TRIGGER AS $$
DECLARE
    existing_product_id INT;
    existing_product_name TEXT;
    new_product_name TEXT;
    line_name TEXT;
BEGIN
    -- Check if allocation already exists for this line and date
    SELECT product_id INTO existing_product_id
    FROM line_daily_allocations
    WHERE line_id = NEW.line_id AND production_date = NEW.production_date;

    IF existing_product_id IS NULL THEN
        -- Safely insert the allocation for today
        INSERT INTO line_daily_allocations (line_id, production_date, product_id)
        VALUES (NEW.line_id, NEW.production_date, NEW.product_id)
        ON CONFLICT (line_id, production_date) DO UPDATE
        SET product_id = line_daily_allocations.product_id; -- no-op in conflict
    ELSIF existing_product_id <> NEW.product_id THEN
        SELECT name INTO line_name FROM production_lines WHERE id = NEW.line_id;
        SELECT name INTO existing_product_name FROM products WHERE id = existing_product_id;
        SELECT name INTO new_product_name FROM products WHERE id = NEW.product_id;
        
        RAISE EXCEPTION 'Business Rule Violation: % is already assigned to produce "%" on %. Cannot record production for "%" on the same line on the same day.',
            line_name, existing_product_name, NEW.production_date, new_product_name
            USING ERRCODE = '23514'; -- check_violation
    END IF;

    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_production_records_daily_product ON production_records;
CREATE TRIGGER trg_production_records_daily_product
    BEFORE INSERT OR UPDATE ON production_records
    FOR EACH ROW
    EXECUTE FUNCTION trg_enforce_daily_product_allocation();
