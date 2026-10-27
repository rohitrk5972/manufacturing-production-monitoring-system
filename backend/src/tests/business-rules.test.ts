import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';

describe('Assignment Compatibility Matrix & Business Rules', () => {
  describe('Strict Line-Product Compatibility Matrix Enforcement', () => {
    // Line 1: Products 1, 2, 3, 4 allowed; Product 5 disallowed
    it('Line 1 accepts Products 1, 2, 3, 4', async () => {
      for (const prodId of [1, 2, 3, 4]) {
        const testDate = `2026-11-0${prodId}`;
        const res = await request(app).post('/api/production-records').send({
          line_id: 1,
          production_date: testDate,
          shift_id: 1,
          product_id: prodId,
          line_speed: 60.0,
          units_produced: 400,
          defect_units: 5,
          energy_consumption_kwh: 250.0,
        });
        expect(res.status).toBe(201);
        expect(res.body.product_id).toBe(prodId);
      }
    });

    it('Line 1 rejects Product 5 with 400', async () => {
      const res = await request(app).post('/api/production-records').send({
        line_id: 1,
        production_date: '2026-11-05',
        shift_id: 1,
        product_id: 5,
        line_speed: 60.0,
        units_produced: 400,
        defect_units: 5,
        energy_consumption_kwh: 250.0,
      });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/not permitted/i);
    });

    // Line 2: Products 2, 4 allowed; Products 1, 3, 5 disallowed
    it('Line 2 accepts Products 2 and 4', async () => {
      for (const prodId of [2, 4]) {
        const testDate = `2026-11-0${prodId + 5}`;
        const res = await request(app).post('/api/production-records').send({
          line_id: 2,
          production_date: testDate,
          shift_id: 1,
          product_id: prodId,
          line_speed: 80.0,
          units_produced: 500,
          defect_units: 10,
          energy_consumption_kwh: 280.0,
        });
        expect(res.status).toBe(201);
      }
    });

    it('Line 2 rejects Products 1, 3, 5 with 400', async () => {
      for (const prodId of [1, 3, 5]) {
        const res = await request(app).post('/api/production-records').send({
          line_id: 2,
          production_date: `2026-11-1${prodId}`,
          shift_id: 1,
          product_id: prodId,
          line_speed: 75.0,
          units_produced: 350,
          defect_units: 5,
          energy_consumption_kwh: 200.0,
        });
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/not permitted/i);
      }
    });

    // Line 3: Product 1 only; Products 2, 3, 4, 5 disallowed
    it('Line 3 accepts Product 1 only', async () => {
      const res = await request(app).post('/api/production-records').send({
        line_id: 3,
        production_date: '2026-11-18',
        shift_id: 1,
        product_id: 1,
        line_speed: 45.0,
        units_produced: 300,
        defect_units: 4,
        energy_consumption_kwh: 220.0,
      });
      expect(res.status).toBe(201);
      expect(res.body.product_id).toBe(1);
    });

    it('Line 3 rejects Products 2, 3, 4, 5 with 400', async () => {
      for (const prodId of [2, 3, 4, 5]) {
        const res = await request(app).post('/api/production-records').send({
          line_id: 3,
          production_date: `2026-11-2${prodId}`,
          shift_id: 1,
          product_id: prodId,
          line_speed: 50.0,
          units_produced: 300,
          defect_units: 4,
          energy_consumption_kwh: 220.0,
        });
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/not permitted/i);
      }
    });

    // Line 4: Products 1, 3, 5 allowed; Products 2, 4 disallowed
    it('Line 4 accepts Products 1, 3, and 5', async () => {
      for (const prodId of [1, 3, 5]) {
        const testDate = `2026-11-2${prodId + 2}`;
        const res = await request(app).post('/api/production-records').send({
          line_id: 4,
          production_date: testDate,
          shift_id: 1,
          product_id: prodId,
          line_speed: 90.0,
          units_produced: 600,
          defect_units: 12,
          energy_consumption_kwh: 260.0,
        });
        expect(res.status).toBe(201);
      }
    });

    it('Line 4 rejects Products 2 and 4 with 400', async () => {
      for (const prodId of [2, 4]) {
        const res = await request(app).post('/api/production-records').send({
          line_id: 4,
          production_date: `2026-11-2${prodId + 5}`,
          shift_id: 1,
          product_id: prodId,
          line_speed: 85.0,
          units_produced: 400,
          defect_units: 8,
          energy_consumption_kwh: 240.0,
        });
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/not permitted/i);
      }
    });
  });

  describe('Shop Floor Integrity & Concurrency Rules', () => {
    const singleDayDate = '2026-12-01';

    it('Enforces 1 product per line per day across shifts (rejects product switch with 409)', async () => {
      // 1. Record Shift A on Line 1 with Product 1
      const res1 = await request(app).post('/api/production-records').send({
        line_id: 1,
        production_date: singleDayDate,
        shift_id: 1, // Shift A
        product_id: 1,
        line_speed: 50.0,
        units_produced: 350,
        defect_units: 5,
        energy_consumption_kwh: 230.0,
      });
      expect(res1.status).toBe(201);

      // 2. Attempt to record Shift B on Line 1 with Product 2 on the SAME day -> must fail!
      const res2 = await request(app).post('/api/production-records').send({
        line_id: 1,
        production_date: singleDayDate,
        shift_id: 2, // Shift B
        product_id: 2, // Different product!
        line_speed: 55.0,
        units_produced: 360,
        defect_units: 6,
        energy_consumption_kwh: 240.0,
      });
      expect(res2.status).toBe(409);
      expect(res2.body.error).toMatch(/Business Rule Violation|Daily Product Allocation Mismatch/i);
    });

    it('Allows same product on same line in subsequent shifts of the same day', async () => {
      // Shift B on Line 1 with Product 1 should succeed
      const res = await request(app).post('/api/production-records').send({
        line_id: 1,
        production_date: singleDayDate,
        shift_id: 2, // Shift B
        product_id: 1, // Same product
        line_speed: 52.0,
        units_produced: 380,
        defect_units: 7,
        energy_consumption_kwh: 235.0,
      });
      expect(res.status).toBe(201);
      expect(res.body.shift_code).toBe('B');
    });

    it('Enforces 1 record per line/date/shift (duplicate shift rejected with 409)', async () => {
      // Attempt to record Shift A on Line 1 on singleDayDate again -> must fail!
      const res = await request(app).post('/api/production-records').send({
        line_id: 1,
        production_date: singleDayDate,
        shift_id: 1, // Shift A duplicate
        product_id: 1,
        line_speed: 50.0,
        units_produced: 350,
        defect_units: 5,
        energy_consumption_kwh: 230.0,
      });
      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/Record Already Exists|already exists/i);
    });

    it('Rejects negative line speed with 400', async () => {
      const res = await request(app).post('/api/production-records').send({
        line_id: 1,
        production_date: '2026-12-05',
        shift_id: 1,
        product_id: 1,
        line_speed: -15.0, // Invalid negative speed
        units_produced: 300,
        defect_units: 5,
        energy_consumption_kwh: 200.0,
      });
      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body)).toMatch(/Line speed cannot be negative/i);
    });

    it('Rejects negative quantity or fractional quantity where integer is required', async () => {
      const res = await request(app).post('/api/production-records').send({
        line_id: 1,
        production_date: '2026-12-05',
        shift_id: 1,
        product_id: 1,
        line_speed: 50.0,
        units_produced: 100.5, // Non-integer
        defect_units: 0,
        energy_consumption_kwh: 200.0,
      });
      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body)).toMatch(/whole number/i);
    });

    it('Safely handles concurrent race conditions on shift entry', async () => {
      const raceDate = '2026-12-08';
      const req1 = request(app).post('/api/production-records').send({
        line_id: 4,
        production_date: raceDate,
        shift_id: 1,
        product_id: 3,
        line_speed: 100.0,
        units_produced: 700,
        defect_units: 10,
        energy_consumption_kwh: 220.0,
      });

      const req2 = request(app).post('/api/production-records').send({
        line_id: 4,
        production_date: raceDate,
        shift_id: 1,
        product_id: 3,
        line_speed: 105.0,
        units_produced: 710,
        defect_units: 12,
        energy_consumption_kwh: 225.0,
      });

      const [res1, res2] = await Promise.all([req1, req2]);
      const statuses = [res1.status, res2.status].sort();
      expect(statuses).toEqual([201, 409]);
    });
  });
});
