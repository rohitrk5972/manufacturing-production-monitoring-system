import { pool, query } from '../db/pool.js';
import { AppError } from '../middleware/errorHandler.js';

export interface CreateRecordInput {
  line_id: number;
  production_date: string;
  shift_id: number;
  product_id: number;
  line_speed?: number;
  units_produced: number;
  defect_units?: number;
  energy_consumption_kwh: number;
  operator_name?: string | null;
  notes?: string | null;
}

export interface UpdateRecordInput {
  line_id?: number;
  production_date?: string;
  shift_id?: number;
  product_id?: number;
  line_speed?: number;
  units_produced?: number;
  defect_units?: number;
  energy_consumption_kwh?: number;
  operator_name?: string | null;
  notes?: string | null;
}

export interface ProductionFilter {
  line_id?: number;
  shift_id?: number;
  product_id?: number;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class ProductionService {
  async listRecords(filter: ProductionFilter) {
    const page = filter.page || 1;
    const limit = filter.limit || 15;
    const offset = (page - 1) * limit;
    const sortBy = filter.sortBy || 'production_date';
    const sortOrder = filter.sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filter.line_id) {
      conditions.push(`pr.line_id = $${paramIndex++}`);
      params.push(filter.line_id);
    }
    if (filter.shift_id) {
      conditions.push(`pr.shift_id = $${paramIndex++}`);
      params.push(filter.shift_id);
    }
    if (filter.product_id) {
      conditions.push(`pr.product_id = $${paramIndex++}`);
      params.push(filter.product_id);
    }
    if (filter.startDate) {
      conditions.push(`pr.production_date >= $${paramIndex++}`);
      params.push(filter.startDate);
    }
    if (filter.endDate) {
      conditions.push(`pr.production_date <= $${paramIndex++}`);
      params.push(filter.endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Total Count query
    const countSql = `SELECT COUNT(*) AS total FROM production_records pr ${whereClause}`;
    const countResult = await query(countSql, params);
    const totalRecords = parseInt(countResult.rows[0].total, 10);

    // Records query
    const recordsSql = `
      SELECT 
        pr.id,
        pr.line_id,
        pl.code AS line_code,
        pl.name AS line_name,
        pr.production_date::text,
        pr.shift_id,
        s.code AS shift_code,
        s.shift_number,
        s.name AS shift_name,
        pr.product_id,
        p.sku AS product_sku,
        p.name AS product_name,
        p.category AS product_category,
        pr.line_speed::float AS line_speed,
        pr.units_produced,
        pr.defect_units,
        pr.good_units,
        pr.energy_consumption_kwh::float AS energy_consumption_kwh,
        ROUND((pr.defect_units::numeric / NULLIF(pr.units_produced, 0)::numeric) * 100, 2)::float AS scrap_rate_pct,
        ROUND((pr.energy_consumption_kwh::numeric / NULLIF(pr.units_produced, 0)::numeric), 4)::float AS energy_per_unit_kwh,
        pr.operator_name,
        pr.notes,
        pr.created_at,
        pr.updated_at
      FROM production_records pr
      JOIN production_lines pl ON pr.line_id = pl.id
      JOIN shifts s ON pr.shift_id = s.id
      JOIN products p ON pr.product_id = p.id
      ${whereClause}
      ORDER BY pr.${sortBy} ${sortOrder}, pr.id DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    params.push(limit, offset);
    const recordsResult = await query(recordsSql, params);

    return {
      data: recordsResult.rows,
      pagination: {
        total: totalRecords,
        page,
        limit,
        totalPages: Math.ceil(totalRecords / limit),
      },
    };
  }

  async getRecordById(id: number) {
    const sql = `
      SELECT 
        pr.id,
        pr.line_id,
        pl.code AS line_code,
        pl.name AS line_name,
        pr.production_date::text,
        pr.shift_id,
        s.code AS shift_code,
        s.shift_number,
        s.name AS shift_name,
        pr.product_id,
        p.sku AS product_sku,
        p.name AS product_name,
        p.category AS product_category,
        pr.line_speed::float AS line_speed,
        pr.units_produced,
        pr.defect_units,
        pr.good_units,
        pr.energy_consumption_kwh::float AS energy_consumption_kwh,
        ROUND((pr.defect_units::numeric / NULLIF(pr.units_produced, 0)::numeric) * 100, 2)::float AS scrap_rate_pct,
        ROUND((pr.energy_consumption_kwh::numeric / NULLIF(pr.units_produced, 0)::numeric), 4)::float AS energy_per_unit_kwh,
        pr.operator_name,
        pr.notes,
        pr.created_at,
        pr.updated_at
      FROM production_records pr
      JOIN production_lines pl ON pr.line_id = pl.id
      JOIN shifts s ON pr.shift_id = s.id
      JOIN products p ON pr.product_id = p.id
      WHERE pr.id = $1
    `;
    const result = await query(sql, [id]);
    if (result.rows.length === 0) {
      throw new AppError('Production record not found', 404);
    }
    return result.rows[0];
  }

  async createRecord(input: CreateRecordInput) {
    const defectUnits = input.defect_units ?? 0;
    if (defectUnits > input.units_produced) {
      throw new AppError('Defect units cannot exceed total units produced', 400);
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Verify Line-Product Mapping
      const mappingCheck = await client.query(
        'SELECT 1 FROM line_products WHERE line_id = $1 AND product_id = $2',
        [input.line_id, input.product_id]
      );
      if (mappingCheck.rows.length === 0) {
        throw new AppError('Selected product is not permitted for this production line.', 400, null, 'INCOMPATIBLE_LINE_PRODUCT');
      }

      // 2. Concurrency-safe Daily Product Allocation Handling
      const allocResult = await client.query(`
        INSERT INTO line_daily_allocations (line_id, production_date, product_id)
        VALUES ($1, $2, $3)
        ON CONFLICT (line_id, production_date) DO UPDATE
        SET product_id = line_daily_allocations.product_id
        RETURNING product_id;
      `, [input.line_id, input.production_date, input.product_id]);

      const allocatedProductId = allocResult.rows[0].product_id;
      if (allocatedProductId !== input.product_id) {
        const prodDetails = await client.query(
          'SELECT name FROM products WHERE id = $1',
          [allocatedProductId]
        );
        const assignedName = prodDetails.rows[0]?.name || `Product ID ${allocatedProductId}`;
        throw new AppError(
          `Business Rule Violation: This line is already assigned to "${assignedName}" on ${input.production_date}. Only one product per production line per day is permitted.`,
          409,
          null,
          'BUSINESS_RULE_VIOLATION'
        );
      }

      // 3. Check for existing record for line, date, shift
      const existingRecordCheck = await client.query(
        'SELECT id FROM production_records WHERE line_id = $1 AND production_date = $2 AND shift_id = $3',
        [input.line_id, input.production_date, input.shift_id]
      );
      if (existingRecordCheck.rows.length > 0) {
        throw new AppError(
          `A production record already exists for this line, date, and shift. Only one record per line/date/shift is permitted.`,
          409,
          null,
          'DUPLICATE_SHIFT_RECORD'
        );
      }

      // 4. Insert Production Record
      const lineSpeed = input.line_speed ?? 0;
      const insertResult = await client.query(`
        INSERT INTO production_records (
          line_id, production_date, shift_id, product_id,
          line_speed, units_produced, defect_units, energy_consumption_kwh,
          operator_name, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id;
      `, [
        input.line_id,
        input.production_date,
        input.shift_id,
        input.product_id,
        lineSpeed,
        input.units_produced,
        defectUnits,
        input.energy_consumption_kwh,
        input.operator_name || null,
        input.notes || null,
      ]);

      await client.query('COMMIT');

      const createdId = insertResult.rows[0].id;
      return await this.getRecordById(createdId);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async updateRecord(id: number, input: UpdateRecordInput) {
    const existing = await this.getRecordById(id);
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const lineId = input.line_id ?? existing.line_id;
      const prodDate = input.production_date ?? existing.production_date;
      const shiftId = input.shift_id ?? existing.shift_id;
      const productId = input.product_id ?? existing.product_id;
      const lineSpeed = input.line_speed ?? existing.line_speed;
      const units = input.units_produced ?? existing.units_produced;
      const defects = input.defect_units ?? existing.defect_units;
      const energy = input.energy_consumption_kwh ?? existing.energy_consumption_kwh;
      const operatorName = input.operator_name !== undefined ? input.operator_name : existing.operator_name;
      const notes = input.notes !== undefined ? input.notes : existing.notes;

      if (defects > units) {
        throw new AppError('Defect units cannot exceed total units produced', 400);
      }

      // Check mapping
      const mappingCheck = await client.query(
        'SELECT 1 FROM line_products WHERE line_id = $1 AND product_id = $2',
        [lineId, productId]
      );
      if (mappingCheck.rows.length === 0) {
        throw new AppError('Selected product is not permitted for this production line.', 400, null, 'INCOMPATIBLE_LINE_PRODUCT');
      }

      // Check daily allocation
      const otherRecordsOnDay = await client.query(
        'SELECT DISTINCT product_id FROM production_records WHERE line_id = $1 AND production_date = $2 AND id <> $3',
        [lineId, prodDate, id]
      );

      if (otherRecordsOnDay.rows.length > 0 && otherRecordsOnDay.rows[0].product_id !== productId) {
        throw new AppError(
          'Business Rule Violation: Other records on this date for this line are running a different product. Only one product per production line per day is permitted.',
          409,
          null,
          'BUSINESS_RULE_VIOLATION'
        );
      }

      // Check shift uniqueness
      const duplicateShift = await client.query(
        'SELECT 1 FROM production_records WHERE line_id = $1 AND production_date = $2 AND shift_id = $3 AND id <> $4',
        [lineId, prodDate, shiftId, id]
      );
      if (duplicateShift.rows.length > 0) {
        throw new AppError(
          'A production record already exists for this line, date, and shift.',
          409,
          null,
          'DUPLICATE_SHIFT_RECORD'
        );
      }

      // Update allocation if needed
      await client.query(`
        INSERT INTO line_daily_allocations (line_id, production_date, product_id)
        VALUES ($1, $2, $3)
        ON CONFLICT (line_id, production_date) DO UPDATE
        SET product_id = EXCLUDED.product_id;
      `, [lineId, prodDate, productId]);

      // Update record
      await client.query(`
        UPDATE production_records
        SET line_id = $1,
            production_date = $2,
            shift_id = $3,
            product_id = $4,
            line_speed = $5,
            units_produced = $6,
            defect_units = $7,
            energy_consumption_kwh = $8,
            operator_name = $9,
            notes = $10,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $11;
      `, [
        lineId, prodDate, shiftId, productId,
        lineSpeed, units, defects, energy, operatorName, notes, id
      ]);

      await client.query('COMMIT');
      return await this.getRecordById(id);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async deleteRecord(id: number) {
    const existing = await this.getRecordById(id);
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      await client.query('DELETE FROM production_records WHERE id = $1', [id]);

      const remaining = await client.query(
        'SELECT 1 FROM production_records WHERE line_id = $1 AND production_date = $2',
        [existing.line_id, existing.production_date]
      );

      if (remaining.rows.length === 0) {
        await client.query(
          'DELETE FROM line_daily_allocations WHERE line_id = $1 AND production_date = $2',
          [existing.line_id, existing.production_date]
        );
      }

      await client.query('COMMIT');
      return { success: true, message: 'Production record deleted successfully' };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async exportRecordsCsv(filter: ProductionFilter): Promise<string> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filter.line_id) {
      conditions.push(`pr.line_id = $${paramIndex++}`);
      params.push(filter.line_id);
    }
    if (filter.shift_id) {
      conditions.push(`pr.shift_id = $${paramIndex++}`);
      params.push(filter.shift_id);
    }
    if (filter.product_id) {
      conditions.push(`pr.product_id = $${paramIndex++}`);
      params.push(filter.product_id);
    }
    if (filter.startDate) {
      conditions.push(`pr.production_date >= $${paramIndex++}`);
      params.push(filter.startDate);
    }
    if (filter.endDate) {
      conditions.push(`pr.production_date <= $${paramIndex++}`);
      params.push(filter.endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sortBy = filter.sortBy || 'production_date';
    const sortOrder = filter.sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const recordsSql = `
      SELECT 
        pr.id,
        pr.production_date::text,
        pl.code AS line_code,
        pl.name AS line_name,
        s.code AS shift_code,
        s.name AS shift_name,
        p.sku AS product_sku,
        p.name AS product_name,
        pr.line_speed::float AS line_speed,
        pr.units_produced,
        pr.defect_units,
        pr.good_units,
        pr.energy_consumption_kwh::float AS energy_consumption_kwh,
        ROUND((pr.energy_consumption_kwh::numeric / NULLIF(pr.units_produced, 0)::numeric), 4)::float AS energy_per_unit_kwh,
        ROUND((pr.defect_units::numeric / NULLIF(pr.units_produced, 0)::numeric) * 100, 2)::float AS scrap_rate_pct,
        pr.operator_name,
        pr.notes,
        pr.created_at::text AS created_at
      FROM production_records pr
      JOIN production_lines pl ON pr.line_id = pl.id
      JOIN shifts s ON pr.shift_id = s.id
      JOIN products p ON pr.product_id = p.id
      ${whereClause}
      ORDER BY pr.${sortBy} ${sortOrder}, pr.id DESC
      LIMIT 10000
    `;

    const result = await query(recordsSql, params);

    const escapeCsvCell = (value: any): string => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headers = [
      'Record ID',
      'Production Date',
      'Line Code',
      'Line Name',
      'Shift Code',
      'Shift Name',
      'Product SKU',
      'Product Name',
      'Line Speed (u/h)',
      'Units Produced',
      'Defect Units',
      'Good Units',
      'Energy Consumption (kWh)',
      'Energy per Unit (kWh/u)',
      'Scrap Rate (%)',
      'Operator Name',
      'Notes',
      'Logged At',
    ];

    const lines = [headers.join(',')];

    for (const r of result.rows) {
      const row = [
        escapeCsvCell(r.id),
        escapeCsvCell(r.production_date),
        escapeCsvCell(r.line_code),
        escapeCsvCell(r.line_name),
        escapeCsvCell(r.shift_code),
        escapeCsvCell(r.shift_name),
        escapeCsvCell(r.product_sku),
        escapeCsvCell(r.product_name),
        escapeCsvCell(r.line_speed !== null ? Number(r.line_speed).toFixed(1) : '0.0'),
        escapeCsvCell(r.units_produced),
        escapeCsvCell(r.defect_units),
        escapeCsvCell(r.good_units),
        escapeCsvCell(r.energy_consumption_kwh !== null ? Number(r.energy_consumption_kwh).toFixed(2) : '0.00'),
        escapeCsvCell(r.energy_per_unit_kwh !== null ? Number(r.energy_per_unit_kwh).toFixed(4) : '0.0000'),
        escapeCsvCell(r.scrap_rate_pct !== null ? Number(r.scrap_rate_pct).toFixed(2) : '0.00'),
        escapeCsvCell(r.operator_name),
        escapeCsvCell(r.notes),
        escapeCsvCell(r.created_at),
      ];
      lines.push(row.join(','));
    }

    return lines.join('\r\n');
  }
}

export const productionService = new ProductionService();
