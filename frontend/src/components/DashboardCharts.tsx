import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
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
} from '../types';
import { TrendingUp, Zap, Clock, Package, Activity } from 'lucide-react';

interface DashboardChartsProps {
  dailyData: DailyProductionPoint[];
  shiftData: ShiftComparisonPoint[];
  productData: ProductComparisonPoint[];
  lineData: LineComparisonPoint[];
  loading: boolean;
}

export const DashboardCharts: React.FC<DashboardChartsProps> = ({
  dailyData,
  shiftData,
  productData,
  lineData,
  loading,
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-80 bg-slate-900/60 rounded-2xl border border-slate-800 p-6"></div>
        ))}
      </div>
    );
  }

  // Format date labels for chart
  const formattedDaily = dailyData.map((d) => ({
    ...d,
    dateLabel: d.production_date.slice(5), // 'MM-DD'
  }));

  return (
    <div className="space-y-6">
      
      {/* Chart Row 1: Daily Production & Energy Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Daily Production & Defect Units */}
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-sky-400" />
                <span>Daily Production & First-Pass Quality</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Good units vs scrap units with line scrap rate %
              </p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={formattedDaily} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="dateLabel" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" stroke="#f43f5e" tick={{ fontSize: 11 }} unit="%" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Area yAxisId="left" type="monotone" dataKey="good_units" name="Good Units" fill="#0284c7" stroke="#38bdf8" fillOpacity={0.25} />
                <Bar yAxisId="left" dataKey="defect_units" name="Defect Units" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="scrap_rate_pct" name="Scrap Rate (%)" stroke="#fb7185" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Daily Energy Consumption & Intensity */}
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Daily Energy Consumption & Efficiency</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Total grid draw (kWh) vs specific energy per unit (kWh/unit)
              </p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={formattedDaily} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="dateLabel" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" stroke="#64748b" tick={{ fontSize: 11 }} unit=" kWh" />
                <YAxis yAxisId="right" orientation="right" stroke="#06b6d4" tick={{ fontSize: 11 }} unit=" kWh/u" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar yAxisId="left" dataKey="total_energy_kwh" name="Energy Draw (kWh)" fill="#d97706" radius={[4, 4, 0, 0]} opacity={0.85} />
                <Line yAxisId="right" type="monotone" dataKey="energy_per_unit_kwh" name="Energy / Unit (kWh/u)" stroke="#22d3ee" strokeWidth={2.5} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Chart Row 2: Shift Comparison & Product Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Shift Comparison (Morning vs Afternoon vs Night) */}
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Clock className="w-4 h-4 text-purple-400" />
                <span>Shift Comparison (3 Shifts)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Output volume & scrap rate comparison across operating shifts
              </p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={shiftData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="shift_name" stroke="#64748b" tick={{ fontSize: 10 }} tickFormatter={(name) => name.split(' ')[0] + ' ' + name.split(' ')[1]} />
                <YAxis yAxisId="left" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" stroke="#f43f5e" tick={{ fontSize: 11 }} unit="%" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar yAxisId="left" dataKey="total_units" name="Units Produced" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="scrap_rate_pct" name="Scrap Rate (%)" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Product Comparison (5 Products) */}
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Package className="w-4 h-4 text-teal-400" />
                <span>Product Comparison (5 Products)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Total units produced and specific energy intensity per SKU
              </p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={productData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="sku" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" stroke="#06b6d4" tick={{ fontSize: 11 }} unit=" kWh/u" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar yAxisId="left" dataKey="total_units" name="Total Units" fill="#0d9488" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="energy_per_unit_kwh" name="Energy / Unit (kWh/u)" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Chart Row 3: Production Line Performance Comparison */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Activity className="w-4 h-4 text-sky-400" />
              <span>Production Line Throughput & Energy Performance (4 Lines)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Comparison across Line 1 (Machining), Line 2 (Assembly), Line 3 (Surface/Paint), Line 4 (Packaging)
            </p>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={lineData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="line_code" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" stroke="#eab308" tick={{ fontSize: 11 }} unit=" kWh" />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Bar yAxisId="left" dataKey="total_units" name="Total Units" fill="#0284c7" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="right" dataKey="total_energy_kwh" name="Total Energy (kWh)" fill="#eab308" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};
