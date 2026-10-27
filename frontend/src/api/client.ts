import {
  ProductionLine,
  Product,
  Shift,
  LineProductMapping,
  ProductionRecord,
  KPIStats,
  DailyProductionPoint,
  DailyByLineProductPoint,
  MonthlyProductionPoint,
  ShiftComparisonPoint,
  ProductComparisonPoint,
  LineComparisonPoint,
  LineSpeedTrendPoint,
  ActiveDailyAllocation,
  PaginatedRecords,
} from '../types';

const BASE_URL = '/api';

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorMsg =
      data.error?.message ||
      data.message ||
      (typeof data.error === 'string' ? data.error : null) ||
      `HTTP ${res.status}: Failed to fetch`;
    const err = new Error(errorMsg);
    (err as any).status = res.status;
    (err as any).code = data.error?.code;
    (err as any).fields = data.error?.fields || data.details;
    throw err;
  }

  return data as T;
}

export const api = {
  // System Health
  getHealth: () => request<{ status: string; service: string }>('/health'),

  // Metadata
  getLines: () => request<ProductionLine[]>('/metadata/lines'),
  getProducts: () => request<Product[]>('/metadata/products'),
  getShifts: () => request<Shift[]>('/metadata/shifts'),
  getLineProducts: (lineId?: number) =>
    request<LineProductMapping[]>(`/metadata/line-products${lineId ? `?line_id=${lineId}` : ''}`),
  getActiveProductForLineAndDate: (lineId: number, date: string) =>
    request<ActiveDailyAllocation | null>(`/metadata/lines/${lineId}/active-product?date=${date}`),
  getRecordedShifts: (lineId: number, date: string) =>
    request<{ shift_id: number; record_id: number }[]>(`/metadata/lines/${lineId}/recorded-shifts?date=${date}`),

  // Production Records
  getRecords: (params?: Record<string, any>) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          searchParams.append(key, String(val));
        }
      });
    }
    const query = searchParams.toString();
    return request<PaginatedRecords>(`/production-records${query ? `?${query}` : ''}`);
  },

  createRecord: (payload: any) =>
    request<ProductionRecord>('/production-records', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateRecord: (id: number, payload: any) =>
    request<ProductionRecord>(`/production-records/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteRecord: (id: number) =>
    request<{ success: boolean; message: string }>(`/production-records/${id}`, {
      method: 'DELETE',
    }),

  downloadRecordsCsv: async (params?: Record<string, any>) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          searchParams.append(key, String(val));
        }
      });
    }
    const query = searchParams.toString();
    const res = await fetch(`/api/production-records/export/csv${query ? `?${query}` : ''}`);
    if (!res.ok) {
      throw new Error('Failed to export records as CSV');
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `production_records_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  // Analytics
  getKPIs: (params?: Record<string, any>) => {
    const qs = new URLSearchParams(params).toString();
    return request<KPIStats>(`/analytics/kpis${qs ? `?${qs}` : ''}`);
  },

  getDailyProduction: (params?: Record<string, any>) => {
    const qs = new URLSearchParams(params).toString();
    return request<DailyProductionPoint[]>(`/analytics/daily-production${qs ? `?${qs}` : ''}`);
  },

  getDailyByLineAndProduct: (params?: Record<string, any>) => {
    const qs = new URLSearchParams(params).toString();
    return request<DailyByLineProductPoint[]>(`/analytics/daily-by-line-product${qs ? `?${qs}` : ''}`);
  },

  getMonthlyProduction: (params?: Record<string, any>) => {
    const qs = new URLSearchParams(params).toString();
    return request<MonthlyProductionPoint[]>(`/analytics/monthly-production${qs ? `?${qs}` : ''}`);
  },

  getShiftComparison: (params?: Record<string, any>) => {
    const qs = new URLSearchParams(params).toString();
    return request<ShiftComparisonPoint[]>(`/analytics/shift-comparison${qs ? `?${qs}` : ''}`);
  },

  getProductComparison: (params?: Record<string, any>) => {
    const qs = new URLSearchParams(params).toString();
    return request<ProductComparisonPoint[]>(`/analytics/product-comparison${qs ? `?${qs}` : ''}`);
  },

  getLineComparison: (params?: Record<string, any>) => {
    const qs = new URLSearchParams(params).toString();
    return request<LineComparisonPoint[]>(`/analytics/line-comparison${qs ? `?${qs}` : ''}`);
  },

  getLineSpeedTrends: (params?: Record<string, any>) => {
    const qs = new URLSearchParams(params).toString();
    return request<LineSpeedTrendPoint[]>(`/analytics/line-speed-trends${qs ? `?${qs}` : ''}`);
  },
};
