import { pool, query } from '../db/pool.js';
import { AppError } from '../middleware/errorHandler.js';

export interface CreateRecordInput {
  line_id: number;
  production_date: string;
  shift_id: number;
  product_id: number;
  units_produced: number;
  defect_units: number;
  energy_consumption_kwh: number;
  operator_name?: string | null;
  notes?: string | null;
}

export interface UpdateRecordInput {
  line_id?: number;
  production_date?: string;
  shift_id?: number;
  product_id?: number;
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
    const limit = filter.limit || 20;
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
        s.shift_number,
        s.name AS shift_name,
        pr.product_id,
        p.sku AS product_sku,
        p.name AS product_name,
        p.category AS product_category,
        pr.units_produced,
        pr.defect_units,
        pr.good_units,
        pr.energy_consumption_kwh,
        ROUND((pr.defect_units::numeric / NULLIF(pr.units_produced, 0)::numeric) * 100, 2) AS scrap_rate_pct,
        ROUND((pr.energy_consumption_kwh::numeric / NULLIF(pr.units_produced, 0)::numeric), 4) AS energy_per_unit_kwh,
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
        s.shift_number,
        s.name AS shift_name,
        pr.product_id,
        p.sku AS product_sku,
        p.name AS product_name,
        p.category AS product_category,
        pr.units_produced,
        pr.defect_units,
        pr.good_units,
        pr.energy_consumption_kwh,
        ROUND((pr.defect_units::numeric / NULLIF(pr.units_produced, 0)::numeric) * 100, 2) AS scrap_rate_pct,
        ROUND((pr.energy_consumption_kwh::numeric / NULLIF(pr.units_produced, 0)::numeric), 4) AS energy_per_unit_kwh,
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
    if (input.defect_units > input.units_produced) {
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
        throw new AppError('Selected product is not permitted for this production line.', 400);
      }

      // 2. Concurrency-safe Daily Product Allocation Handling
      // Atomically insert the allocation or retrieve the active allocation
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
          409
        );
      }

      // 3. Check for existing record for line, date, shift (prevent duplicate)
      const existingRecordCheck = await client.query(
        'SELECT id FROM production_records WHERE line_id = $1 AND production_date = $2 AND shift_id = $3',
        [input.line_id, input.production_date, input.shift_id]
      );
      if (existingRecordCheck.rows.length > 0) {
        throw new AppError(
          `A production record already exists for this line, date, and shift. Only one record per line/date/shift is permitted.`,
          409
        );
      }

      // 4. Insert Production Record
      const insertResult = await client.query(`
        INSERT INTO production_records (
          line_id, production_date, shift_id, product_id,
          units_produced, defect_units, energy_consumption_kwh,
          operator_name, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id;
      `, [
        input.line_id,
        input.production_date,
        input.shift_id,
        input.product_id,
        input.units_produced,
        input.defect_units,
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
        throw new AppError('Selected product is not permitted for this production line.', 400);
      }

      // Check daily allocation if product changed or date/line changed
      const otherRecordsOnDay = await client.query(
        'SELECT DISTINCT product_id FROM production_records WHERE line_id = $1 AND production_date = $2 AND id <> $3',
        [lineId, prodDate, id]
      );

      if (otherRecordsOnDay.rows.length > 0 && otherRecordsOnDay.rows[0].product_id !== productId) {
        throw new AppError(
          'Business Rule Violation: Other records on this date for this line are running a different product. Only one product per production line per day is permitted.',
          409
        );
      }

      // Check shift uniqueness if date, line, or shift changed
      const duplicateShift = await client.query(
        'SELECT 1 FROM production_records WHERE line_id = $1 AND production_date = $2 AND shift_id = $3 AND id <> $4',
        [lineId, prodDate, shiftId, id]
      );
      if (duplicateShift.rows.length > 0) {
        throw new AppError(
          'A production record already exists for this line, date, and shift.',
          409
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
            units_produced = $5,
            defect_units = $6,
            energy_consumption_kwh = $7,
            operator_name = $8,
            notes = $9,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $10;
      `, [
        lineId, prodDate, shiftId, productId,
        units, defects, energy, operatorName, notes, id
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

      // Check if any records remain for that line and date; if none, free up daily allocation
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
}

export const productionService = new ProductionService();
