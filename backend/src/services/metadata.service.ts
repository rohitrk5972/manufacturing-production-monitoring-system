import { query } from '../db/pool.js';

export class MetadataService {
  async getLines() {
    const result = await query(
      'SELECT id, code, name, description, created_at FROM production_lines ORDER BY id ASC'
    );
    return result.rows;
  }

  async getProducts() {
    const result = await query(
      'SELECT id, sku, name, category, unit_of_measure, target_hourly_rate, created_at FROM products ORDER BY id ASC'
    );
    return result.rows;
  }

  async getShifts() {
    const result = await query(
      'SELECT id, code, shift_number, name, start_time, end_time, duration_hours FROM shifts ORDER BY shift_number ASC'
    );
    return result.rows;
  }

  async getLineProducts(lineId?: number) {
    let sql = `
      SELECT 
        lp.line_id,
        pl.code AS line_code,
        pl.name AS line_name,
        lp.product_id,
        p.sku AS product_sku,
        p.name AS product_name,
        p.category AS product_category,
        p.target_hourly_rate
      FROM line_products lp
      JOIN production_lines pl ON lp.line_id = pl.id
      JOIN products p ON lp.product_id = p.id
    `;
    const params: any[] = [];
    if (lineId) {
      sql += ' WHERE lp.line_id = $1';
      params.push(lineId);
    }
    sql += ' ORDER BY lp.line_id ASC, lp.product_id ASC';
    const result = await query(sql, params);
    return result.rows;
  }

  async getActiveProductForLineAndDate(lineId: number, date: string) {
    const result = await query(
      `SELECT 
        lda.line_id,
        lda.production_date::text,
        lda.product_id,
        p.sku AS product_sku,
        p.name AS product_name,
        p.category AS product_category
      FROM line_daily_allocations lda
      JOIN products p ON lda.product_id = p.id
      WHERE lda.line_id = $1 AND lda.production_date = $2`,
      [lineId, date]
    );
    return result.rows[0] || null;
  }

  async getRecordedShiftsForLineAndDate(lineId: number, date: string) {
    const result = await query(
      `SELECT shift_id, id AS record_id
      FROM production_records
      WHERE line_id = $1 AND production_date = $2`,
      [lineId, date]
    );
    return result.rows;
  }
}

export const metadataService = new MetadataService();
