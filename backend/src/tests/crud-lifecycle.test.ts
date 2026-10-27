import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';

describe('Production Records CRUD Lifecycle, Integrity & Export Test Suite', () => {
  const lifecycleDate = '2026-12-15';
  let recordAId: number;
  let recordBId: number;

  describe('1. Shift Deletion & Daily Product Allocation Retention', () => {
    it('Step 1: Successfully creates Shift A and Shift B for Line 1 on the same date with Product 1', async () => {
      // 1. Create Shift A
      const resA = await request(app).post('/api/production-records').send({
        line_id: 1,
        production_date: lifecycleDate,
        shift_id: 1, // Shift A
        product_id: 1, // Product 1
        line_speed: 60.0,
        units_produced: 450,
        defect_units: 5,
        energy_consumption_kwh: 210.0,
        operator_name: 'Operator 1',
        notes: 'Shift A nominal run',
      });

      expect(resA.status).toBe(201);
      expect(resA.body).toHaveProperty('id');
      recordAId = resA.body.id;

      // 2. Create Shift B with same Product 1
      const resB = await request(app).post('/api/production-records').send({
        line_id: 1,
        production_date: lifecycleDate,
        shift_id: 2, // Shift B
        product_id: 1, // Product 1
        line_speed: 62.0,
        units_produced: 460,
        defect_units: 6,
        energy_consumption_kwh: 215.0,
        operator_name: 'Operator 2',
        notes: 'Shift B nominal run',
      });

      expect(resB.status).toBe(201);
      expect(resB.body).toHaveProperty('id');
      recordBId = resB.body.id;

      // Verify active product allocation endpoint reports Product 1
      const allocRes = await request(app).get(`/api/metadata/lines/1/active-product?date=${lifecycleDate}`);
      expect(allocRes.status).toBe(200);
      expect(allocRes.body).not.toBeNull();
      expect(allocRes.body.product_id).toBe(1);
    });

    it('Step 2: Deletes Shift A and verifies daily product allocation remains locked because Shift B is active', async () => {
      // Delete Shift A
      const delA = await request(app).delete(`/api/production-records/${recordAId}`);
      expect(delA.status).toBe(200);
      expect(delA.body.success).toBe(true);

      // Verify Shift A record is gone
      const checkA = await request(app).get(`/api/production-records/${recordAId}`);
      expect(checkA.status).toBe(404);
      expect(checkA.body.error.code).toBe('NOT_FOUND');

      // Verify active product allocation on Line 1 for lifecycleDate REMAINS locked to Product 1
      const allocRes = await request(app).get(`/api/metadata/lines/1/active-product?date=${lifecycleDate}`);
      expect(allocRes.status).toBe(200);
      expect(allocRes.body).not.toBeNull();
      expect(allocRes.body.product_id).toBe(1);

      // Attempt to log Shift C with a DIFFERENT product (Product 2) -> MUST be rejected with 409
      const invalidShiftC = await request(app).post('/api/production-records').send({
        line_id: 1,
        production_date: lifecycleDate,
        shift_id: 3, // Shift C
        product_id: 2, // Product 2 (attempting product switch)
        line_speed: 55.0,
        units_produced: 400,
        defect_units: 4,
        energy_consumption_kwh: 200.0,
      });

      expect(invalidShiftC.status).toBe(409);
      expect(invalidShiftC.body.error.code).toMatch(/BUSINESS_RULE_VIOLATION|DAILY_ALLOCATION_MISMATCH/);
    });

    it('Step 3: Deletes Shift B (final remaining shift) and verifies daily allocation is released', async () => {
      // Delete Shift B
      const delB = await request(app).delete(`/api/production-records/${recordBId}`);
      expect(delB.status).toBe(200);
      expect(delB.body.success).toBe(true);

      // Verify active product allocation is now released (returns null)
      const allocRes = await request(app).get(`/api/metadata/lines/1/active-product?date=${lifecycleDate}`);
      expect(allocRes.status).toBe(200);
      expect(allocRes.body).toBeNull();

      // Now that line has zero records on lifecycleDate, recording Product 2 must succeed!
      const validShiftWithNewProduct = await request(app).post('/api/production-records').send({
        line_id: 1,
        production_date: lifecycleDate,
        shift_id: 1,
        product_id: 2, // Successfully allocated to Product 2
        line_speed: 65.0,
        units_produced: 500,
        defect_units: 8,
        energy_consumption_kwh: 230.0,
        operator_name: 'Operator 3',
        notes: 'Fresh allocation after full day delete',
      });

      expect(validShiftWithNewProduct.status).toBe(201);
      expect(validShiftWithNewProduct.body.product_id).toBe(2);

      // Cleanup test record
      await request(app).delete(`/api/production-records/${validShiftWithNewProduct.body.id}`);
    });
  });

  describe('2. Record Updates & Integrity Protection', () => {
    let updateRecordId: number;
    const updateDate = '2026-12-16';

    it('Sets up a test record for update validation', async () => {
      const res = await request(app).post('/api/production-records').send({
        line_id: 2,
        production_date: updateDate,
        shift_id: 1, // Shift A
        product_id: 2, // Product 2
        line_speed: 70.0,
        units_produced: 400,
        defect_units: 10,
        energy_consumption_kwh: 250.0,
      });
      expect(res.status).toBe(201);
      updateRecordId = res.body.id;
    });

    it('Rejects updates with defect_units exceeding units_produced (400 Bad Request)', async () => {
      const res = await request(app).put(`/api/production-records/${updateRecordId}`).send({
        units_produced: 100,
        defect_units: 150, // Exceeds produced
      });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.message).toMatch(/Defect units cannot exceed/i);
    });

    it('Rejects updates with negative line speed (400 Bad Request)', async () => {
      const res = await request(app).put(`/api/production-records/${updateRecordId}`).send({
        line_speed: -25.0,
      });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.message).toMatch(/Line speed cannot be negative/i);
    });

    it('Rejects updates with incompatible product for line (400 Bad Request)', async () => {
      // Line 2 only accepts Products 2 and 4. Product 1 is incompatible.
      const res = await request(app).put(`/api/production-records/${updateRecordId}`).send({
        product_id: 1,
      });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INCOMPATIBLE_LINE_PRODUCT');
    });

    it('Rejects update that duplicates an existing shift on the same line and date (409 Conflict)', async () => {
      // Create a second record on Line 2 for Shift B
      const resShiftB = await request(app).post('/api/production-records').send({
        line_id: 2,
        production_date: updateDate,
        shift_id: 2, // Shift B
        product_id: 2,
        line_speed: 72.0,
        units_produced: 410,
        defect_units: 8,
        energy_consumption_kwh: 255.0,
      });
      expect(resShiftB.status).toBe(201);
      const shiftBId = resShiftB.body.id;

      // Attempt to change Shift B to Shift 1 (which already exists for updateRecordId)
      const duplicateRes = await request(app).put(`/api/production-records/${shiftBId}`).send({
        shift_id: 1,
      });
      expect(duplicateRes.status).toBe(409);
      expect(duplicateRes.body.error.code).toMatch(/DUPLICATE_SHIFT_RECORD|CONFLICT_ERROR/);

      // Cleanup Shift B
      await request(app).delete(`/api/production-records/${shiftBId}`);
    });

    it('Successfully updates allowable fields on record (200 OK)', async () => {
      const res = await request(app).put(`/api/production-records/${updateRecordId}`).send({
        line_speed: 85.5,
        units_produced: 520,
        defect_units: 12,
        energy_consumption_kwh: 280.0,
        operator_name: 'Certified Senior Tech',
        notes: 'Velocity increased post-calibration',
      });

      expect(res.status).toBe(200);
      expect(res.body.line_speed).toBe(85.5);
      expect(res.body.units_produced).toBe(520);
      expect(res.body.good_units).toBe(508);
      expect(res.body.operator_name).toBe('Certified Senior Tech');

      // Cleanup
      await request(app).delete(`/api/production-records/${updateRecordId}`);
    });
  });

  describe('3. Standardized API Error Responses', () => {
    it('Returns standardized envelope { error: { code, message, fields } } on validation errors', async () => {
      const res = await request(app).post('/api/production-records').send({
        // Missing required fields
        line_id: -1,
      });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
      expect(res.body.error).toHaveProperty('message');
      expect(Array.isArray(res.body.error.fields)).toBe(true);
    });

    it('Returns standardized envelope on 404 Not Found', async () => {
      const res = await request(app).get('/api/production-records/99999999');
      expect(res.status).toBe(404);
      expect(res.body.error).toHaveProperty('code', 'NOT_FOUND');
      expect(res.body.error).toHaveProperty('message', 'Production record not found');
    });

    it('Returns standardized envelope on route not found', async () => {
      const res = await request(app).get('/api/non-existent-route-xyz');
      expect(res.status).toBe(404);
      expect(res.body.error).toHaveProperty('code', 'NOT_FOUND');
      expect(res.body.error.message).toBe('Endpoint not found');
    });
  });

  describe('4. Secure CSV Export', () => {
    it('GET /api/production-records/export/csv returns valid CSV format and correct HTTP headers', async () => {
      const res = await request(app).get('/api/production-records/export/csv');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/csv/);
      expect(res.headers['content-disposition']).toMatch(/attachment; filename="production_records_/);

      const lines = res.text.split('\r\n');
      expect(lines.length).toBeGreaterThan(1); // Header + data rows

      const headerLine = lines[0];
      expect(headerLine).toContain('Record ID');
      expect(headerLine).toContain('Production Date');
      expect(headerLine).toContain('Line Code');
      expect(headerLine).toContain('Shift Code');
      expect(headerLine).toContain('Product SKU');
      expect(headerLine).toContain('Line Speed (u/h)');
      expect(headerLine).toContain('Units Produced');
      expect(headerLine).toContain('Energy Consumption (kWh)');
    });

    it('GET /api/production-records/export/csv respects line and date filtering', async () => {
      const res = await request(app).get('/api/production-records/export/csv?line_id=1');
      expect(res.status).toBe(200);

      const lines = res.text.split('\r\n');
      expect(lines.length).toBeGreaterThan(1);

      // Verify data lines have Line 1 code ('L1')
      for (let i = 1; i < Math.min(lines.length, 5); i++) {
        if (lines[i].trim()) {
          expect(lines[i]).toContain('L1');
        }
      }
    });
  });
});
