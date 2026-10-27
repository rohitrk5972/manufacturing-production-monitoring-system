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

    // Clear existing data cleanly in reverse dependency order
    await client.query('TRUNCATE TABLE production_records, line_daily_allocations, line_products, products, shifts, production_lines RESTART IDENTITY CASCADE;');

    // 1. Insert 4 Production Lines
    console.log('Inserting 4 production lines...');
    const linesResult = await client.query(`
      INSERT INTO production_lines (code, name, description) VALUES
      ('L1', 'Line 1 (CNC Precision Machining)', 'High-tolerance 5-axis milling and turning center'),
      ('L2', 'Line 2 (Automated Assembly Alpha)', 'Robotic pick-and-place assembly with automated fastening'),
      ('L3', 'Line 3 (Surface Treatment & Paint)', 'Electrostatic powder coating and heat curing facility'),
      ('L4', 'Line 4 (High-Speed Packaging & QC)', 'Automated optical inspection, laser marking, and packaging')
      RETURNING id, code, name;
    `);
    const lines = linesResult.rows;

    // 2. Insert 5 Products
    console.log('Inserting 5 products...');
    const productsResult = await client.query(`
      INSERT INTO products (sku, name, category, unit_of_measure, target_hourly_rate) VALUES
      ('PROD-01', 'Titanium Impeller Shaft', 'Aerospace Components', 'units', 45.00),
      ('PROD-02', 'Hydraulic Control Valve', 'Automotive Powertrain', 'units', 80.00),
      ('PROD-03', 'Electronic Sensor Housing', 'Industrial Electronics', 'units', 150.00),
      ('PROD-04', 'Alloy Turbine Blade', 'Aerospace Components', 'units', 60.00),
      ('PROD-05', 'Pneumatic Cylinder Assembly', 'Industrial Automation', 'units', 110.00)
      RETURNING id, sku, name;
    `);
    const products = productsResult.rows;

    // 3. Insert 3 Shifts
    console.log('Inserting 3 shifts...');
    const shiftsResult = await client.query(`
      INSERT INTO shifts (shift_number, name, start_time, end_time, duration_hours) VALUES
      (1, 'Morning Shift (06:00 - 14:00)', '06:00:00', '14:00:00', 8.00),
      (2, 'Afternoon Shift (14:00 - 22:00)', '14:00:00', '22:00:00', 8.00),
      (3, 'Night Shift (22:00 - 06:00)', '22:00:00', '06:00:00', 8.00)
      RETURNING id, shift_number, name;
    `);
    const shifts = shiftsResult.rows;

    // 4. Line-Product Mappings
    // Line 1: PROD-01, PROD-02, PROD-04
    // Line 2: PROD-02, PROD-03, PROD-05
    // Line 3: PROD-01, PROD-03, PROD-04
    // Line 4: All products (PROD-01 through PROD-05)
    console.log('Configuring line-product mappings...');
    const l1 = lines.find((l) => l.code === 'L1')!.id;
    const l2 = lines.find((l) => l.code === 'L2')!.id;
    const l3 = lines.find((l) => l.code === 'L3')!.id;
    const l4 = lines.find((l) => l.code === 'L4')!.id;

    const p1 = products.find((p) => p.sku === 'PROD-01')!.id;
    const p2 = products.find((p) => p.sku === 'PROD-02')!.id;
    const p3 = products.find((p) => p.sku === 'PROD-03')!.id;
    const p4 = products.find((p) => p.sku === 'PROD-04')!.id;
    const p5 = products.find((p) => p.sku === 'PROD-05')!.id;

    const lineProductPairs = [
      // Line 1
      [l1, p1], [l1, p2], [l1, p4],
      // Line 2
      [l2, p2], [l2, p3], [l2, p5],
      // Line 3
      [l3, p1], [l3, p3], [l3, p4],
      // Line 4
      [l4, p1], [l4, p2], [l4, p3], [l4, p4], [l4, p5],
    ];

    for (const [lineId, prodId] of lineProductPairs) {
      await client.query(
        'INSERT INTO line_products (line_id, product_id) VALUES ($1, $2)',
        [lineId, prodId]
      );
    }

    // 5. Generate Realistic Historical Production Records for Past 14 Days
    console.log('Generating realistic production history...');
    const operators = [
      'John Martinez', 'Sarah Chen', 'Marcus Vance', 'Elena Rostova', 'David Kim',
      'Rachel Adams', 'Carlos Gomez', 'Priya Patel', 'Alex Nowak', 'Lisa Mueller'
    ];

    const notesList = [
      'Optimal operating temperature and pressure maintained.',
      'Slight tooling vibration observed early shift; calibrated.',
      'Batch completed without interruption. High yield.',
      'Standard cycle runtime. Routine lubrication performed.',
      'Sensor calibration check passed at mid-shift.',
      'Minor feed adjustment made to minimize edge burr.',
      'Clean run with zero safety alerts.'
    ];

    const lineAllowedProducts: Record<number, number[]> = {
      [l1]: [p1, p2, p4],
      [l2]: [p2, p3, p5],
      [l3]: [p1, p3, p4],
      [l4]: [p1, p2, p3, p4, p5],
    };

    const baseProductionRates: Record<number, { units: number; variance: number; baseKwh: number }> = {
      [p1]: { units: 320, variance: 40, baseKwh: 340 }, // Impeller shaft
      [p2]: { units: 580, variance: 60, baseKwh: 280 }, // Hydraulic valve
      [p3]: { units: 950, variance: 100, baseKwh: 210 }, // Sensor housing
      [p4]: { units: 420, variance: 50, baseKwh: 380 }, // Turbine blade
      [p5]: { units: 750, variance: 80, baseKwh: 260 }, // Cylinder assembly
    };

    const today = new Date();
    // 14 days of data: from 14 days ago up to today
    for (let d = 14; d >= 0; d--) {
      const dateObj = new Date(today);
      dateObj.setDate(today.getDate() - d);
      const dateStr = dateObj.toISOString().split('T')[0];

      // For each line on this date, assign ONE product
      for (const line of lines) {
        const allowed = lineAllowedProducts[line.id];
        // Deterministic product selection based on date and line id
        const prodIndex = (d + line.id) % allowed.length;
        const assignedProduct = allowed[prodIndex];
        const rateInfo = baseProductionRates[assignedProduct];

        // For today (d === 0), only seed shifts 1 & 2 (leave shift 3 open for operator entry!)
        const shiftsToRecord = d === 0 ? shifts.slice(0, 2) : shifts;

        for (const shift of shiftsToRecord) {
          // Calculate realistic numbers with mild randomness
          const randomFactor = 0.9 + Math.random() * 0.2; // 0.9 to 1.1
          const unitsProduced = Math.round(rateInfo.units * randomFactor);
          // Defect rate between 1.5% and 5%
          const defectRate = 0.015 + Math.random() * 0.035;
          const defectUnits = Math.round(unitsProduced * defectRate);
          // Energy consumption: baseKwh * randomFactor + slight shift variance (Night shift slightly different)
          const shiftEnergyFactor = shift.shift_number === 3 ? 0.95 : 1.0;
          const energyKwh = parseFloat(((rateInfo.baseKwh * randomFactor * shiftEnergyFactor)).toFixed(2));
          const op = operators[(d * 3 + shift.shift_number + line.id) % operators.length];
          const note = notesList[(d + line.id + shift.shift_number) % notesList.length];

          await client.query(`
            INSERT INTO production_records (
              line_id, production_date, shift_id, product_id,
              units_produced, defect_units, energy_consumption_kwh,
              operator_name, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);
          `, [
            line.id, dateStr, shift.id, assignedProduct,
            unitsProduced, defectUnits, energyKwh,
            op, note
          ]);
        }
      }
    }

    await client.query('COMMIT');
    console.log('✅ Database seeded successfully with verified lines, products, shifts, and 14 days of historical logs.');
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
