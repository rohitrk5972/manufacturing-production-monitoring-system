import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';

describe('Analytics & Real PostgreSQL Aggregations API', () => {
  it('1. GET /api/analytics/kpis returns valid aggregate values', async () => {
    const res = await request(app).get('/api/analytics/kpis');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('total_units');
    expect(res.body).toHaveProperty('good_units');
    expect(res.body).toHaveProperty('defect_units');
    expect(res.body).toHaveProperty('scrap_rate_pct');
    expect(res.body).toHaveProperty('total_energy_kwh');
    expect(res.body).toHaveProperty('energy_per_unit_kwh');

    expect(res.body.total_units).toBeGreaterThan(0);
    expect(res.body.good_units).toBeGreaterThan(0);
    expect(res.body.total_energy_kwh).toBeGreaterThan(0);
    expect(res.body.energy_per_unit_kwh).toBeGreaterThan(0);
    expect(res.body.good_units + res.body.defect_units).toBe(res.body.total_units);
  });

  it('2. GET /api/analytics/daily-production returns time series rows', async () => {
    const res = await request(app).get('/api/analytics/daily-production');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);

    const first = res.body[0];
    expect(first).toHaveProperty('production_date');
    expect(first).toHaveProperty('total_units');
    expect(first).toHaveProperty('total_energy_kwh');
    expect(first).toHaveProperty('energy_per_unit_kwh');
  });

  it('3. GET /api/analytics/shift-comparison returns all 3 shifts with scrap and energy metrics', async () => {
    const res = await request(app).get('/api/analytics/shift-comparison');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(3); // 3 shifts

    res.body.forEach((shift: any) => {
      expect(shift).toHaveProperty('shift_number');
      expect([1, 2, 3]).toContain(shift.shift_number);
      expect(shift).toHaveProperty('total_units');
      expect(shift).toHaveProperty('scrap_rate_pct');
      expect(shift).toHaveProperty('total_energy_kwh');
      expect(shift).toHaveProperty('energy_per_unit_kwh');
    });
  });

  it('4. GET /api/analytics/product-comparison returns breakdown for products', async () => {
    const res = await request(app).get('/api/analytics/product-comparison');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(5); // 5 products

    res.body.forEach((prod: any) => {
      expect(prod).toHaveProperty('sku');
      expect(prod).toHaveProperty('product_name');
      expect(prod).toHaveProperty('total_units');
      expect(prod).toHaveProperty('scrap_rate_pct');
      expect(prod).toHaveProperty('energy_per_unit_kwh');
    });
  });

  it('5. GET /api/analytics/line-comparison returns breakdown for 4 lines', async () => {
    const res = await request(app).get('/api/analytics/line-comparison');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(4); // 4 production lines

    res.body.forEach((line: any) => {
      expect(line).toHaveProperty('line_code');
      expect(line).toHaveProperty('line_name');
      expect(line).toHaveProperty('total_units');
      expect(line).toHaveProperty('total_energy_kwh');
    });
  });

  it('6. Filters analytics by production line correctly', async () => {
    const res = await request(app).get('/api/analytics/kpis?line_id=1');

    expect(res.status).toBe(200);
    expect(res.body.total_records).toBeGreaterThan(0);
    // Line 1 total records should be less than overall total records
    const allRes = await request(app).get('/api/analytics/kpis');
    expect(res.body.total_records).toBeLessThan(allRes.body.total_records);
  });
});
