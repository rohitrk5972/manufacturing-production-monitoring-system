import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  LineChart,
  Bar,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import {
  DailyProductionPoint,
  ShiftComparisonPoint,
  ProductComparisonPoint,
  LineComparisonPoint,
  LineSpeedTrendPoint,
} from '../types';
import { TrendingUp, Zap, Clock, Package, Activity, GaugeCircle } from 'lucide-react';

interface DashboardChartsProps {
  dailyData: DailyProductionPoint[];
  shiftData: ShiftComparisonPoint[];
  productData: ProductComparisonPoint[];
  lineData: LineComparisonPoint[];
  lineSpeedTrendData: LineSpeedTrendPoint[];
  loading: boolean;
}

export const DashboardCharts: React.FC<DashboardChartsProps> = ({
  dailyData,
  shiftData,
  productData,
  lineData,
  lineSpeedTrendData,
  loading,
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 animate-pulse">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-72 bg-white rounded-lg border border-slate-200 p-5"></div>
        ))}
      </div>
    );
  }

  const formattedDaily = dailyData.map((d) => ({
    ...d,
    dateLabel: d.production_date.slice(5),
  }));

  // Aggregate line speed by date for trend
  const speedTrendByDate: Record<string, { dateLabel: string; avgSpeed: number; count: number }> = {};
  lineSpeedTrendData.forEach((item) => {
    const key = item.production_date.slice(5);
    if (!speedTrendByDate[key]) {
      speedTrendByDate[key] = { dateLabel: key, avgSpeed: 0, count: 0 };
    }
    speedTrendByDate[key].avgSpeed += item.avg_line_speed;
    speedTrendByDate[key].count += 1;
  });

  const formattedSpeedTrend = Object.values(speedTrendByDate).map((entry) => ({
    dateLabel: entry.dateLabel,
    avgSpeed: parseFloat((entry.avgSpeed / entry.count).toFixed(1)),
  }));

  const tooltipStyle = {
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
    borderRadius: '0.5rem',
    fontSize: '12px',
    color: '#0f172a',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  };

  return (
    <div className="space-y-5">
      
      {/* Row 1: Daily Production & Daily Energy Consumption */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* 1. Daily Production Trend */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
                <TrendingUp className="w-4 h-4 text-sky-600" />
                <span>Daily Production Trend</span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Total production quantity & first-pass good units over time
              </p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={formattedDaily} margin={{ top: 8, right: 8, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="dateLabel" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                <Area type="monotone" dataKey="total_units" name="Total Units" fill="#e0f2fe" stroke="#0284c7" strokeWidth={2} />
                <Bar dataKey="good_units" name="Good Units" fill="#10b981" radius={[3, 3, 0, 0]} opacity={0.85} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Daily Energy Consumption & Specific Energy Intensity */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
                <Zap className="w-4 h-4 text-amber-600" />
                <span>Daily Energy Consumption & Efficiency</span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Grid energy draw (kWh) vs specific consumption (kWh/unit)
              </p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={formattedDaily} margin={{ top: 8, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="dateLabel" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" stroke="#0891b2" tick={{ fontSize: 11 }} unit=" kWh/u" />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                <Bar yAxisId="left" dataKey="total_energy_kwh" name="Energy (kWh)" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="energy_per_unit_kwh" name="Energy / Unit" stroke="#0891b2" strokeWidth={2} dot={{ r: 2.5 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Row 2: Shift Comparison & Product Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* 3. Shift-wise Production Comparison (Shift A, Shift B, Shift C) */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
                <Clock className="w-4 h-4 text-purple-600" />
                <span>Shift Comparison (Shift A, Shift B, Shift C)</span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Output volume & energy consumption across the three operating shifts
              </p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={shiftData} margin={{ top: 8, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" tick={{ fontSize: 11 }} unit=" kWh" />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                <Bar yAxisId="left" dataKey="total_units" name="Production Quantity" fill="#6366f1" radius={[3, 3, 0, 0]} />
                <Bar yAxisId="right" dataKey="total_energy_kwh" name="Energy (kWh)" fill="#f59e0b" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 4. Product-wise Production Comparison (5 Products) */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
                <Package className="w-4 h-4 text-teal-600" />
                <span>Product Comparison (5 Products)</span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Total production quantity & specific energy intensity per product SKU
              </p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={productData} margin={{ top: 8, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="sku" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" stroke="#0d9488" tick={{ fontSize: 11 }} unit=" kWh/u" />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                <Bar yAxisId="left" dataKey="total_units" name="Total Units" fill="#0d9488" radius={[3, 3, 0, 0]} />
                <Bar yAxisId="right" dataKey="energy_per_unit_kwh" name="Energy / Unit" fill="#14b8a6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Row 3: Line Comparison & Line-Speed Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* 5. Production Line Comparison (Line 1 to 4) */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
                <Activity className="w-4 h-4 text-sky-600" />
                <span>Production Line Comparison (4 Lines)</span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Throughput and energy distribution across Line 1, Line 2, Line 3, and Line 4
              </p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={lineData} margin={{ top: 8, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="line_name" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" stroke="#d97706" tick={{ fontSize: 11 }} unit=" kWh" />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                <Bar yAxisId="left" dataKey="total_units" name="Total Units" fill="#0284c7" radius={[3, 3, 0, 0]} />
                <Bar yAxisId="right" dataKey="total_energy_kwh" name="Energy (kWh)" fill="#d97706" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 6. Line-Speed Trends Across Operating Shifts */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
                <GaugeCircle className="w-4 h-4 text-indigo-600" />
                <span>Line-Speed Trends Across Shifts</span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Average line velocity (units/hour) progression across operating shifts
              </p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={formattedSpeedTrend} margin={{ top: 8, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="dateLabel" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} unit=" u/h" />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                <Line type="monotone" dataKey="avgSpeed" name="Avg Line Speed (u/hr)" stroke="#4f46e5" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </div>
  );
};
