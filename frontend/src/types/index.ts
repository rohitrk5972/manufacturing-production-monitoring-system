export interface ProductionLine {
  id: number;
  code: string;
  name: string;
  description: string;
  created_at: string;
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  category: string;
  unit_of_measure: string;
  target_hourly_rate: string | number;
  created_at: string;
}

export interface Shift {
  id: number;
  code: string;
  shift_number: number;
  name: string;
  start_time: string;
  end_time: string;
  duration_hours: string | number;
}

export interface LineProductMapping {
  line_id: number;
  line_code: string;
  line_name: string;
  product_id: number;
  product_sku: string;
  product_name: string;
  product_category: string;
  target_hourly_rate: string | number;
}

export interface ProductionRecord {
  id: number;
  line_id: number;
  line_code: string;
  line_name: string;
  production_date: string;
  shift_id: number;
  shift_code: string;
  shift_number: number;
  shift_name: string;
  product_id: number;
  product_sku: string;
  product_name: string;
  product_category: string;
  line_speed: number;
  units_produced: number;
  defect_units: number;
  good_units: number;
  energy_consumption_kwh: number;
  scrap_rate_pct: string;
  energy_per_unit_kwh: string;
  operator_name: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface KPIStats {
  total_units: number;
  good_units: number;
  defect_units: number;
  scrap_rate_pct: number;
  total_energy_kwh: number;
  energy_per_unit_kwh: number;
  avg_line_speed: number;
  total_records: number;
}

export interface DailyProductionPoint {
  production_date: string;
  total_units: number;
  good_units: number;
  defect_units: number;
  total_energy_kwh: number;
  energy_per_unit_kwh: number;
  avg_line_speed: number;
  scrap_rate_pct: number;
  shifts_recorded: number;
}

export interface DailyByLineProductPoint {
  production_date: string;
  line_code: string;
  line_name: string;
  product_sku: string;
  product_name: string;
  total_units: number;
  total_energy_kwh: number;
  energy_per_unit_kwh: number;
  avg_line_speed: number;
  shifts_count: number;
}

export interface MonthlyProductionPoint {
  month: string;
  total_units: number;
  good_units: number;
  defect_units: number;
  scrap_rate_pct: number;
  total_energy_kwh: number;
  energy_per_unit_kwh: number;
  avg_line_speed: number;
  total_records: number;
}

export interface ShiftComparisonPoint {
  shift_id: number;
  shift_code: string;
  shift_number: number;
  shift_name: string;
  total_units: number;
  good_units: number;
  defect_units: number;
  scrap_rate_pct: number;
  total_energy_kwh: number;
  energy_per_unit_kwh: number;
  avg_line_speed: number;
  records_count: number;
}

export interface ProductComparisonPoint {
  product_id: number;
  sku: string;
  product_name: string;
  category: string;
  total_units: number;
  good_units: number;
  defect_units: number;
  total_energy_kwh: number;
  energy_per_unit_kwh: number;
  avg_line_speed: number;
  records_count: number;
}

export interface LineComparisonPoint {
  line_id: number;
  line_code: string;
  line_name: string;
  total_units: number;
  good_units: number;
  defect_units: number;
  total_energy_kwh: number;
  energy_per_unit_kwh: number;
  avg_line_speed: number;
  records_count: number;
}

export interface LineSpeedTrendPoint {
  production_date: string;
  shift_code: string;
  shift_name: string;
  avg_line_speed: number;
  total_units: number;
}

export interface ActiveDailyAllocation {
  line_id: number;
  production_date: string;
  product_id: number;
  product_sku: string;
  product_name: string;
  product_category: string;
}

export interface PaginatedRecords {
  data: ProductionRecord[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
