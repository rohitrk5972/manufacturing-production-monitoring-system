import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';

describe('Analytics & PostgreSQL Aggregations Test Suite', () => {
  it('1. GET /api/analytics/kpis returns aggregated volume, energy, line speed and efficiency', async () => {
    const res = await request(app).get('/api/analytics/kpis');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('total_units');
    expect(res.body).toHaveProperty('good_units');
    expect(res.body).toHaveProperty('defect_units');
    expect(res.body).toHaveProperty('total_energy_kwh');
    expect(res.body).toHaveProperty('energy_per_unit_kwh');
    expect(res.body).toHaveProperty('avg_line_speed');

    expect(res.body.total_units).toBeGreaterThan(0);
    expect(res.body.total_energy_kwh).toBeGreaterThan(0);
    expect(res.body.avg_line_speed).toBeGreaterThan(0);
    expect(res.body.good_units + res.body.defect_units).toBe(res.body.total_units);
  });

  it('2. GET /api/analytics/daily-production returns daily time-series with line speed and energy', async () => {
    const res = await request(app).get('/api/analytics/daily-production');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);

    const point = res.body[0];
    expect(point).toHaveProperty('production_date');
    expect(point).toHaveProperty('total_units');
    expect(point).toHaveProperty('total_energy_kwh');
    expect(point).toHaveProperty('avg_line_speed');
  });

  it('3. GET /api/analytics/daily-by-line-product groups production and energy by line and product', async () => {
    const res = await request(app).get('/api/analytics/daily-by-line-product');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);

    const item = res.body[0];
    expect(item).toHaveProperty('line_code');
    expect(item).toHaveProperty('product_sku');
    expect(item).toHaveProperty('total_units');
    expect(item).toHaveProperty('total_energy_kwh');
    expect(item).toHaveProperty('energy_per_unit_kwh');
  });

  it('4. GET /api/analytics/monthly-production supports calendar month filtering', async () => {
    const res = await request(app).get('/api/analytics/monthly-production?month=2026-10');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      expect(res.body[0].month).toBe('2026-10');
      expect(res.body[0].total_units).toBeGreaterThan(0);
      expect(res.body[0].total_energy_kwh).toBeGreaterThan(0);
    }
  });

  it('5. GET /api/analytics/shift-comparison returns Shift A, Shift B, and Shift C', async () => {
    const res = await request(app).get('/api/analytics/shift-comparison');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(3);

    const shiftCodes = res.body.map((s: any) => s.shift_code);
    expect(shiftCodes).toContain('A');
    expect(shiftCodes).toContain('B');
    expect(shiftCodes).toContain('C');

    res.body.forEach((s: any) => {
      expect(s.total_units).toBeGreaterThan(0);
      expect(s.total_energy_kwh).toBeGreaterThan(0);
      expect(s.avg_line_speed).toBeGreaterThan(0);
      expect(s.energy_per_unit_kwh).toBeGreaterThan(0);
    });
  });

  it('6. GET /api/analytics/line-speed-trends returns line speed trends across shifts', async () => {
    const res = await request(app).get('/api/analytics/line-speed-trends');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);

    const point = res.body[0];
    expect(point).toHaveProperty('production_date');
    expect(point).toHaveProperty('shift_code');
    expect(point).toHaveProperty('avg_line_speed');
  });

  it('7. Handles zero-production calculations safely without divide-by-zero errors', async () => {
    // Query with filter that matches no records (e.g. year 2099)
    const res = await request(app).get('/api/analytics/kpis?startDate=2099-01-01&endDate=2099-01-02');

    expect(res.status).toBe(200);
    expect(res.body.total_units).toBe(0);
    expect(res.body.total_energy_kwh).toBe(0);
    expect(res.body.energy_per_unit_kwh).toBe(0);
    expect(res.body.scrap_rate_pct).toBe(0);
  });
});
