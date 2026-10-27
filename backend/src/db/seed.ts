import pg from 'pg';
import { env } from '../config/env.js';

const { Pool } = pg;

export async function runSeed(customUrl?: string) {
  const targetUrl = customUrl || (env.NODE_ENV === 'test' ? env.TEST_DATABASE_URL : env.DATABASE_URL);
  const pool = new Pool({ connectionString: targetUrl });
  const client = await pool.connect();

  try {
    console.log(`🌱 Seeding database at ${targetUrl.replace(/:[^:]*@/, ':***@')}...`);
    await client.query('BEGIN');

    // Clean existing tables in reverse dependency order
    await client.query('TRUNCATE TABLE production_records, line_daily_allocations, line_products, products, shifts, production_lines RESTART IDENTITY CASCADE;');

    // 1. Insert 4 Production Lines
    console.log('Inserting 4 production lines...');
    const linesResult = await client.query(`
      INSERT INTO production_lines (code, name, description) VALUES
      ('L1', 'Line 1', 'Primary CNC precision machining center'),
      ('L2', 'Line 2', 'Automated assembly and robotic fastening station'),
      ('L3', 'Line 3', 'Surface treatment and finishing facility'),
      ('L4', 'Line 4', 'Packaging, quality inspection, and dispatch line')
      RETURNING id, code, name;
    `);
    const lines = linesResult.rows;

    // 2. Insert 5 Products
    console.log('Inserting 5 products...');
    const productsResult = await client.query(`
      INSERT INTO products (sku, name, category, unit_of_measure, target_hourly_rate) VALUES
      ('PROD-01', 'Product 1', 'Aerospace Components', 'units', 45.00),
      ('PROD-02', 'Product 2', 'Automotive Powertrain', 'units', 80.00),
      ('PROD-03', 'Product 3', 'Industrial Electronics', 'units', 140.00),
      ('PROD-04', 'Product 4', 'Aerospace Components', 'units', 65.00),
      ('PROD-05', 'Product 5', 'Industrial Automation', 'units', 110.00)
      RETURNING id, sku, name;
    `);
    const products = productsResult.rows;

    // 3. Insert 3 Shifts: Shift A, Shift B, Shift C
    console.log('Inserting 3 shifts: Shift A, Shift B, Shift C...');
    const shiftsResult = await client.query(`
      INSERT INTO shifts (code, shift_number, name, start_time, end_time, duration_hours) VALUES
      ('A', 1, 'Shift A', '06:00:00', '14:00:00', 8.00),
      ('B', 2, 'Shift B', '14:00:00', '22:00:00', 8.00),
      ('C', 3, 'Shift C', '22:00:00', '06:00:00', 8.00)
      RETURNING id, code, shift_number, name;
    `);
    const shifts = shiftsResult.rows;

    // 4. Configure Exact Line-Product Mappings per Assignment Specifications:
    // Line 1: Product 1, Product 2, Product 3, Product 4
    // Line 2: Product 2, Product 4
    // Line 3: Product 1 only
    // Line 4: Product 1, Product 3, Product 5
    console.log('Configuring exact assignment line-product mappings...');
    const l1 = lines.find((l) => l.code === 'L1')!.id;
    const l2 = lines.find((l) => l.code === 'L2')!.id;
    const l3 = lines.find((l) => l.code === 'L3')!.id;
    const l4 = lines.find((l) => l.code === 'L4')!.id;

    const p1 = products.find((p) => p.sku === 'PROD-01')!.id;
    const p2 = products.find((p) => p.sku === 'PROD-02')!.id;
    const p3 = products.find((p) => p.sku === 'PROD-03')!.id;
    const p4 = products.find((p) => p.sku === 'PROD-04')!.id;
    const p5 = products.find((p) => p.sku === 'PROD-05')!.id;

    const exactLineProductPairs = [
      // Line 1: Product 1, 2, 3, 4
      [l1, p1], [l1, p2], [l1, p3], [l1, p4],
      // Line 2: Product 2, 4
      [l2, p2], [l2, p4],
      // Line 3: Product 1 only
      [l3, p1],
      // Line 4: Product 1, 3, 5
      [l4, p1], [l4, p3], [l4, p5],
    ];

    for (const [lineId, prodId] of exactLineProductPairs) {
      await client.query(
        'INSERT INTO line_products (line_id, product_id) VALUES ($1, $2)',
        [lineId, prodId]
      );
    }

    // 5. Generate Realistic Historical Production Records for Past 14 Days
    console.log('Generating realistic production history complying with strict daily allocation and mappings...');
    const operators = [
      'John Martinez', 'Sarah Chen', 'Marcus Vance', 'Elena Rostova', 'David Kim',
      'Rachel Adams', 'Carlos Gomez', 'Priya Patel', 'Alex Nowak', 'Lisa Mueller'
    ];

    const notesList = [
      'Standard cycle speed maintained. Nominal line parameters.',
      'Slight tooling recalibration at mid-shift; optimal tolerance achieved.',
      'Batch completed without interruption. High yield rate.',
      'Routine lubrication and sensor inspection verified.',
      'Clean production cycle with zero quality alarms.',
      'Thermal stabilization maintained across operating cycle.',
      'Optimal feed rate verified against quality benchmarks.'
    ];

    // Allowed mapping lookup
    const lineAllowedProducts: Record<number, number[]> = {
      [l1]: [p1, p2, p3, p4],
      [l2]: [p2, p4],
      [l3]: [p1],
      [l4]: [p1, p3, p5],
    };

    const baseProductionRates: Record<number, { units: number; speed: number; baseKwh: number }> = {
      [p1]: { units: 360, speed: 45.0, baseKwh: 320 }, // Product 1
      [p2]: { units: 640, speed: 80.0, baseKwh: 270 }, // Product 2
      [p3]: { units: 1050, speed: 135.0, baseKwh: 210 }, // Product 3
      [p4]: { units: 520, speed: 65.0, baseKwh: 360 }, // Product 4
      [p5]: { units: 880, speed: 110.0, baseKwh: 250 }, // Product 5
    };

    const today = new Date();
    // 14 days of data: from 14 days ago up to today
    for (let d = 14; d >= 0; d--) {
      const dateObj = new Date(today);
      dateObj.setDate(today.getDate() - d);
      const dateStr = dateObj.toISOString().split('T')[0];

      // For each line on this date, assign ONE product from allowed products
      for (const line of lines) {
        const allowed = lineAllowedProducts[line.id];
        // Deterministic product selection based on date and line id
        const prodIndex = (d + line.id) % allowed.length;
        const assignedProduct = allowed[prodIndex];
        const rateInfo = baseProductionRates[assignedProduct];

        // For today (d === 0), seed Shift A and Shift B; leave Shift C open for operator entry demo
        const shiftsToRecord = d === 0 ? shifts.slice(0, 2) : shifts;

        for (const shift of shiftsToRecord) {
          const randomFactor = 0.92 + Math.random() * 0.16; // 0.92 to 1.08
          const unitsProduced = Math.round(rateInfo.units * randomFactor);
          const lineSpeed = parseFloat((rateInfo.speed * randomFactor).toFixed(2));
          const defectRate = 0.015 + Math.random() * 0.03;
          const defectUnits = Math.round(unitsProduced * defectRate);
          const shiftFactor = shift.code === 'C' ? 0.96 : 1.0;
          const energyKwh = parseFloat((rateInfo.baseKwh * randomFactor * shiftFactor).toFixed(2));
          const op = operators[(d * 3 + shift.shift_number + line.id) % operators.length];
          const note = notesList[(d + line.id + shift.shift_number) % notesList.length];

          await client.query(`
            INSERT INTO production_records (
              line_id, production_date, shift_id, product_id,
              line_speed, units_produced, defect_units, energy_consumption_kwh,
              operator_name, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);
          `, [
            line.id, dateStr, shift.id, assignedProduct,
            lineSpeed, unitsProduced, defectUnits, energyKwh,
            op, note
          ]);
        }
      }
    }

    await client.query('COMMIT');
    console.log('✅ Database seeded successfully with strict assignment compatibility matrix, Shift A/B/C, and line speeds.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run directly if called as a script
import { fileURLToPath } from 'url';
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runSeed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
