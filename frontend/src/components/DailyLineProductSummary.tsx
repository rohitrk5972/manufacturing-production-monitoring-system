import React from 'react';
import { DailyByLineProductPoint } from '../types';
import { Layers } from 'lucide-react';

interface DailyLineProductSummaryProps {
  data: DailyByLineProductPoint[];
  loading: boolean;
}

export const DailyLineProductSummary: React.FC<DailyLineProductSummaryProps> = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm animate-pulse">
        <div className="h-6 w-48 bg-slate-200 rounded mb-4"></div>
        <div className="h-40 bg-slate-100 rounded"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
            <Layers className="w-4 h-4 text-sky-600" />
            <span>Daily Production & Energy Breakdown by Line & Product</span>
          </h3>
          <p className="text-[11px] text-slate-500">
            PostgreSQL relational summary of daily output and energy consumption across active lines
          </p>
        </div>
        <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
          {data.length} Line-Date Configurations
        </span>
      </div>

      <div className="overflow-x-auto max-h-72">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-50 text-[11px] text-slate-500 uppercase tracking-wider sticky top-0 border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-3.5">Date</th>
              <th className="py-2.5 px-3.5">Line</th>
              <th className="py-2.5 px-3.5">Product SKU & Name</th>
              <th className="py-2.5 px-3.5 text-right">Daily Units</th>
              <th className="py-2.5 px-3.5 text-right">Daily Energy (kWh)</th>
              <th className="py-2.5 px-3.5 text-right">kWh / Unit</th>
              <th className="py-2.5 px-3.5 text-right">Avg Speed</th>
              <th className="py-2.5 px-3.5 text-center">Shifts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400">
                  No line-product records found for current filters.
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-3.5 font-mono text-slate-600">{row.production_date}</td>
                  <td className="py-2.5 px-3.5 font-semibold text-slate-900">{row.line_name}</td>
                  <td className="py-2.5 px-3.5">
                    <span className="font-semibold text-sky-700">{row.product_sku}</span>{' '}
                    <span className="text-slate-500">({row.product_name})</span>
                  </td>
                  <td className="py-2.5 px-3.5 text-right font-mono font-bold text-slate-900">
                    {row.total_units.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3.5 text-right font-mono text-amber-700 font-medium">
                    {Math.round(Number(row.total_energy_kwh)).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3.5 text-right font-mono text-cyan-700 font-medium">
                    {Number(row.energy_per_unit_kwh).toFixed(3)}
                  </td>
                  <td className="py-2.5 px-3.5 text-right font-mono text-slate-600">
                    {Number(row.avg_line_speed).toFixed(1)} u/h
                  </td>
                  <td className="py-2.5 px-3.5 text-center">
                    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                      {row.shifts_count} shifts
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
