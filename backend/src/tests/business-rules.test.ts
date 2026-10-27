import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';

describe('Production Records & Business Rules API', () => {
  const testDate = '2026-11-01'; // Future date for clean test isolation

  it('1. Successfully creates a valid production record', async () => {
    // Line 1 is mapped to Product 1, Shift 1
    const res = await request(app)
      .post('/api/production-records')
      .send({
        line_id: 1,
        production_date: testDate,
        shift_id: 1,
        product_id: 1,
        units_produced: 500,
        defect_units: 15,
        energy_consumption_kwh: 280.5,
        operator_name: 'Test Operator Alpha',
        notes: 'Initial test run',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.good_units).toBe(485);
    expect(res.body.line_code).toBe('L1');
    expect(res.body.product_sku).toBe('PROD-01');
    expect(res.body.scrap_rate_pct).toBe('3.00');
  });

  it('2. Enforces one record per line/date/shift (duplicate shift rejected with 409)', async () => {
    // Attempt to insert another record for Line 1, testDate, Shift 1
    const res = await request(app)
      .post('/api/production-records')
      .send({
        line_id: 1,
        production_date: testDate,
        shift_id: 1,
        product_id: 1,
        units_produced: 400,
        defect_units: 10,
        energy_consumption_kwh: 220.0,
        operator_name: 'Test Operator Duplicate',
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/Record Already Exists|already exists/i);
  });

  it('3. Enforces one product per line per day (different product on same line/day rejected with 409)', async () => {
    // Line 1 is already assigned to Product 1 on testDate in Shift 1.
    // Line 1 is also mapped to Product 2, but attempting to produce Product 2 in Shift 2 on the SAME day must fail!
    const res = await request(app)
      .post('/api/production-records')
      .send({
        line_id: 1,
        production_date: testDate,
        shift_id: 2,
        product_id: 2, // Different product on same day
        units_produced: 450,
        defect_units: 12,
        energy_consumption_kwh: 260.0,
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/Business Rule Violation|Daily Product Allocation Mismatch/i);
  });

  it('4. Allows same product on same line on different shift of the same day', async () => {
    // Line 1 with Product 1 on Shift 2 of testDate should succeed
    const res = await request(app)
      .post('/api/production-records')
      .send({
        line_id: 1,
        production_date: testDate,
        shift_id: 2,
        product_id: 1, // Same product!
        units_produced: 480,
        defect_units: 8,
        energy_consumption_kwh: 275.0,
        operator_name: 'Test Operator Beta',
      });

    expect(res.status).toBe(201);
    expect(res.body.shift_number).toBe(2);
  });

  it('5. Rejects product not permitted on the line (invalid mapping rejected with 400)', async () => {
    // Line 1 is NOT mapped to Product 3 (Product 3 is only on Line 2, 3, 4)
    const res = await request(app)
      .post('/api/production-records')
      .send({
        line_id: 1,
        production_date: '2026-11-02',
        shift_id: 1,
        product_id: 3, // Incompatible product
        units_produced: 300,
        defect_units: 5,
        energy_consumption_kwh: 200.0,
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/not permitted|not configured/i);
  });

  it('6. Rejects defect units greater than total units produced with 400', async () => {
    const res = await request(app)
      .post('/api/production-records')
      .send({
        line_id: 2,
        production_date: '2026-11-03',
        shift_id: 1,
        product_id: 2,
        units_produced: 100,
        defect_units: 150, // Invalid: defects > units
        energy_consumption_kwh: 180.0,
      });

    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toMatch(/Defect units cannot exceed total units produced/i);
  });

  it('7. Rejects negative values with 400', async () => {
    const res = await request(app)
      .post('/api/production-records')
      .send({
        line_id: 2,
        production_date: '2026-11-03',
        shift_id: 1,
        product_id: 2,
        units_produced: -50,
        defect_units: 0,
        energy_consumption_kwh: -10,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Validation Error/i);
  });

  it('8. Handles concurrent requests safely without creating race conditions', async () => {
    const concurrentDate = '2026-11-05';
    // Two requests concurrently trying to record Shift 1 on Line 3
    const req1 = request(app)
      .post('/api/production-records')
      .send({
        line_id: 3,
        production_date: concurrentDate,
        shift_id: 1,
        product_id: 1,
        units_produced: 350,
        defect_units: 10,
        energy_consumption_kwh: 230.0,
      });

    const req2 = request(app)
      .post('/api/production-records')
      .send({
        line_id: 3,
        production_date: concurrentDate,
        shift_id: 1,
        product_id: 1,
        units_produced: 360,
        defect_units: 12,
        energy_consumption_kwh: 235.0,
      });

    const [res1, res2] = await Promise.all([req1, req2]);
    const statuses = [res1.status, res2.status].sort();

    // Exactly one should succeed with 201 and the other should be rejected with 409
    expect(statuses).toEqual([201, 409]);
  });
});
