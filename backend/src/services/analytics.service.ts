import { query } from '../db/pool.js';

export interface AnalyticsFilter {
  line_id?: number;
  shift_id?: number;
  product_id?: number;
  startDate?: string;
  endDate?: string;
  month?: string; // Format: 'YYYY-MM'
}

export class AnalyticsService {
  private buildFilterClauses(filter: AnalyticsFilter, prefix = 'pr') {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filter.line_id) {
      conditions.push(`${prefix}.line_id = $${paramIndex++}`);
      params.push(filter.line_id);
    }
    if (filter.shift_id) {
      conditions.push(`${prefix}.shift_id = $${paramIndex++}`);
      params.push(filter.shift_id);
    }
    if (filter.product_id) {
      conditions.push(`${prefix}.product_id = $${paramIndex++}`);
      params.push(filter.product_id);
    }
    if (filter.month) {
      conditions.push(`TO_CHAR(${prefix}.production_date, 'YYYY-MM') = $${paramIndex++}`);
      params.push(filter.month);
    } else {
      if (filter.startDate) {
        conditions.push(`${prefix}.production_date >= $${paramIndex++}`);
        params.push(filter.startDate);
      }
      if (filter.endDate) {
        conditions.push(`${prefix}.production_date <= $${paramIndex++}`);
        params.push(filter.endDate);
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return { whereClause, params, paramIndex };
  }

  async getKPIs(filter: AnalyticsFilter) {
    const { whereClause, params } = this.buildFilterClauses(filter);
    const sql = `
      SELECT 
        COALESCE(SUM(units_produced), 0)::int AS total_units,
        COALESCE(SUM(good_units), 0)::int AS good_units,
        COALESCE(SUM(defect_units), 0)::int AS defect_units,
        ROUND(COALESCE(SUM(defect_units)::numeric / NULLIF(SUM(units_produced), 0)::numeric * 100, 0), 2)::float AS scrap_rate_pct,
        ROUND(COALESCE(SUM(energy_consumption_kwh), 0)::numeric, 2)::float AS total_energy_kwh,
        ROUND(COALESCE(SUM(energy_consumption_kwh)::numeric / NULLIF(SUM(units_produced), 0)::numeric, 0), 4)::float AS energy_per_unit_kwh,
        ROUND(COALESCE(AVG(line_speed), 0)::numeric, 2)::float AS avg_line_speed,
        COUNT(*)::int AS total_records
      FROM production_records pr
      ${whereClause}
    `;
    const result = await query(sql, params);
    return result.rows[0];
  }

  async getDailyProduction(filter: AnalyticsFilter) {
    const { whereClause, params } = this.buildFilterClauses(filter);
    const sql = `
      SELECT 
        pr.production_date::text AS production_date,
        SUM(pr.units_produced)::int AS total_units,
        SUM(pr.good_units)::int AS good_units,
        SUM(pr.defect_units)::int AS defect_units,
        ROUND(SUM(pr.energy_consumption_kwh)::numeric, 2)::float AS total_energy_kwh,
        ROUND((SUM(pr.energy_consumption_kwh)::numeric / NULLIF(SUM(pr.units_produced), 0)::numeric), 4)::float AS energy_per_unit_kwh,
        ROUND(AVG(pr.line_speed)::numeric, 2)::float AS avg_line_speed,
        ROUND((SUM(pr.defect_units)::numeric / NULLIF(SUM(pr.units_produced), 0)::numeric) * 100, 2)::float AS scrap_rate_pct,
        COUNT(*)::int AS shifts_recorded
      FROM production_records pr
      ${whereClause}
      GROUP BY pr.production_date
      ORDER BY pr.production_date ASC
    `;
    const result = await query(sql, params);
    return result.rows;
  }

  async getDailyByLineAndProduct(filter: AnalyticsFilter) {
    const { whereClause, params } = this.buildFilterClauses(filter);
    const sql = `
      SELECT 
        pr.production_date::text AS production_date,
        pl.code AS line_code,
        pl.name AS line_name,
        p.sku AS product_sku,
        p.name AS product_name,
        SUM(pr.units_produced)::int AS total_units,
        ROUND(SUM(pr.energy_consumption_kwh)::numeric, 2)::float AS total_energy_kwh,
        ROUND((SUM(pr.energy_consumption_kwh)::numeric / NULLIF(SUM(pr.units_produced), 0)::numeric), 4)::float AS energy_per_unit_kwh,
        ROUND(AVG(pr.line_speed)::numeric, 2)::float AS avg_line_speed,
        COUNT(*)::int AS shifts_count
      FROM production_records pr
      JOIN production_lines pl ON pr.line_id = pl.id
      JOIN products p ON pr.product_id = p.id
      ${whereClause}
      GROUP BY pr.production_date, pl.code, pl.name, p.sku, p.name
      ORDER BY pr.production_date DESC, pl.code ASC
      LIMIT 100
    `;
    const result = await query(sql, params);
    return result.rows;
  }

  async getMonthlyProduction(filter: AnalyticsFilter) {
    const { whereClause, params } = this.buildFilterClauses(filter);
    const sql = `
      SELECT 
        TO_CHAR(pr.production_date, 'YYYY-MM') AS month,
        SUM(pr.units_produced)::int AS total_units,
        SUM(pr.good_units)::int AS good_units,
        SUM(pr.defect_units)::int AS defect_units,
        ROUND(SUM(pr.energy_consumption_kwh)::numeric, 2)::float AS total_energy_kwh,
        ROUND((SUM(pr.energy_consumption_kwh)::numeric / NULLIF(SUM(pr.units_produced), 0)::numeric), 4)::float AS energy_per_unit_kwh,
        ROUND(AVG(pr.line_speed)::numeric, 2)::float AS avg_line_speed,
        COUNT(*)::int AS total_records
      FROM production_records pr
      ${whereClause}
      GROUP BY TO_CHAR(pr.production_date, 'YYYY-MM')
      ORDER BY month ASC
    `;
    const result = await query(sql, params);
    return result.rows;
  }

  async getShiftComparison(filter: AnalyticsFilter) {
    const { whereClause, params } = this.buildFilterClauses(filter);
    const sql = `
      SELECT 
        s.id AS shift_id,
        s.code AS shift_code,
        s.shift_number,
        s.name AS shift_name,
        COALESCE(SUM(pr.units_produced), 0)::int AS total_units,
        COALESCE(SUM(pr.good_units), 0)::int AS good_units,
        COALESCE(SUM(pr.defect_units), 0)::int AS defect_units,
        ROUND(COALESCE(SUM(pr.defect_units)::numeric / NULLIF(SUM(pr.units_produced), 0)::numeric * 100, 0), 2)::float AS scrap_rate_pct,
        ROUND(COALESCE(SUM(pr.energy_consumption_kwh), 0)::numeric, 2)::float AS total_energy_kwh,
        ROUND(COALESCE(SUM(pr.energy_consumption_kwh)::numeric / NULLIF(SUM(pr.units_produced), 0)::numeric, 0), 4)::float AS energy_per_unit_kwh,
        ROUND(COALESCE(AVG(pr.line_speed), 0)::numeric, 2)::float AS avg_line_speed,
        COUNT(pr.id)::int AS records_count
      FROM shifts s
      LEFT JOIN production_records pr ON s.id = pr.shift_id
        ${filter.line_id || filter.product_id || filter.startDate || filter.endDate || filter.month ? 
          `AND (${whereClause.replace(/^WHERE /, '')})` : ''}
      GROUP BY s.id, s.code, s.shift_number, s.name
      ORDER BY s.shift_number ASC
    `;
    const result = await query(sql, params);
    return result.rows;
  }

  async getProductComparison(filter: AnalyticsFilter) {
    const { whereClause, params } = this.buildFilterClauses(filter);
    const sql = `
      SELECT 
        p.id AS product_id,
        p.sku,
        p.name AS product_name,
        p.category,
        COALESCE(SUM(pr.units_produced), 0)::int AS total_units,
        COALESCE(SUM(pr.good_units), 0)::int AS good_units,
        COALESCE(SUM(pr.defect_units), 0)::int AS defect_units,
        ROUND(COALESCE(SUM(pr.energy_consumption_kwh), 0)::numeric, 2)::float AS total_energy_kwh,
        ROUND(COALESCE(SUM(pr.energy_consumption_kwh)::numeric / NULLIF(SUM(pr.units_produced), 0)::numeric, 0), 4)::float AS energy_per_unit_kwh,
        ROUND(COALESCE(AVG(pr.line_speed), 0)::numeric, 2)::float AS avg_line_speed,
        COUNT(pr.id)::int AS records_count
      FROM products p
      LEFT JOIN production_records pr ON p.id = pr.product_id
        ${filter.line_id || filter.shift_id || filter.startDate || filter.endDate || filter.month ? 
          `AND (${whereClause.replace(/^WHERE /, '')})` : ''}
      GROUP BY p.id, p.sku, p.name, p.category
      ORDER BY total_units DESC
    `;
    const result = await query(sql, params);
    return result.rows;
  }

  async getLineComparison(filter: AnalyticsFilter) {
    const { whereClause, params } = this.buildFilterClauses(filter);
    const sql = `
      SELECT 
        pl.id AS line_id,
        pl.code AS line_code,
        pl.name AS line_name,
        COALESCE(SUM(pr.units_produced), 0)::int AS total_units,
        COALESCE(SUM(pr.good_units), 0)::int AS good_units,
        COALESCE(SUM(pr.defect_units), 0)::int AS defect_units,
        ROUND(COALESCE(SUM(pr.energy_consumption_kwh), 0)::numeric, 2)::float AS total_energy_kwh,
        ROUND(COALESCE(SUM(pr.energy_consumption_kwh)::numeric / NULLIF(SUM(pr.units_produced), 0)::numeric, 0), 4)::float AS energy_per_unit_kwh,
        ROUND(COALESCE(AVG(pr.line_speed), 0)::numeric, 2)::float AS avg_line_speed,
        COUNT(pr.id)::int AS records_count
      FROM production_lines pl
      LEFT JOIN production_records pr ON pl.id = pr.line_id
        ${filter.shift_id || filter.product_id || filter.startDate || filter.endDate || filter.month ? 
          `AND (${whereClause.replace(/^WHERE /, '')})` : ''}
      GROUP BY pl.id, pl.code, pl.name
      ORDER BY pl.id ASC
    `;
    const result = await query(sql, params);
    return result.rows;
  }

  async getLineSpeedTrends(filter: AnalyticsFilter) {
    const { whereClause, params } = this.buildFilterClauses(filter);
    const sql = `
      SELECT 
        pr.production_date::text AS production_date,
        s.code AS shift_code,
        s.name AS shift_name,
        ROUND(AVG(pr.line_speed)::numeric, 2)::float AS avg_line_speed,
        SUM(pr.units_produced)::int AS total_units
      FROM production_records pr
      JOIN shifts s ON pr.shift_id = s.id
      ${whereClause}
      GROUP BY pr.production_date, s.code, s.name, s.shift_number
      ORDER BY pr.production_date ASC, s.shift_number ASC
    `;
    const result = await query(sql, params);
    return result.rows;
  }
}

export const analyticsService = new AnalyticsService();
