import React from 'react';
import { Package, CheckCircle2, Zap, Gauge, GaugeCircle, Percent, Layers } from 'lucide-react';
import { KPIStats } from '../types';

interface KpiCardsProps {
  stats: KPIStats | null;
  loading: boolean;
}

export const KpiCards: React.FC<KpiCardsProps> = ({ stats, loading }) => {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 animate-pulse">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="h-24 bg-white rounded-lg border border-slate-200 p-3.5"></div>
        ))}
      </div>
    );
  }

  const firstPassYield = stats.total_units > 0
    ? ((stats.good_units / stats.total_units) * 100).toFixed(1)
    : '100.0';

  const cards = [
    {
      title: 'Total Production',
      value: stats.total_units.toLocaleString(),
      unit: 'units',
      subtext: `${stats.good_units.toLocaleString()} good units`,
      icon: Package,
      borderAccent: 'border-t-sky-600 text-sky-700',
    },
    {
      title: 'Good Units',
      value: stats.good_units.toLocaleString(),
      unit: 'units',
      subtext: `${stats.defect_units.toLocaleString()} scrap units`,
      icon: CheckCircle2,
      borderAccent: 'border-t-emerald-600 text-emerald-700',
    },
    {
      title: 'Total Energy',
      value: Math.round(stats.total_energy_kwh).toLocaleString(),
      unit: 'kWh',
      subtext: 'Cumulative grid draw',
      icon: Zap,
      borderAccent: 'border-t-amber-600 text-amber-700',
    },
    {
      title: 'Specific Energy',
      value: Number(stats.energy_per_unit_kwh).toFixed(3),
      unit: 'kWh/unit',
      subtext: 'Consumption per output',
      icon: Gauge,
      borderAccent: 'border-t-cyan-600 text-cyan-700',
    },
    {
      title: 'Avg Line Speed',
      value: stats.avg_line_speed ? Number(stats.avg_line_speed).toFixed(1) : '0.0',
      unit: 'units/hr',
      subtext: 'Mean operational rate',
      icon: GaugeCircle,
      borderAccent: 'border-t-indigo-600 text-indigo-700',
    },
    {
      title: 'First-Pass Yield',
      value: `${firstPassYield}%`,
      unit: 'yield',
      subtext: `${stats.scrap_rate_pct}% scrap rate`,
      icon: Percent,
      borderAccent: 'border-t-teal-600 text-teal-700',
    },
    {
      title: 'Recorded Shifts',
      value: stats.total_records.toLocaleString(),
      unit: 'shifts',
      subtext: 'Verified shift logs',
      icon: Layers,
      borderAccent: 'border-t-slate-600 text-slate-700',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <div
            key={i}
            className={`bg-white p-3 rounded-lg border border-slate-200 border-t-2 ${c.borderAccent} shadow-sm flex flex-col justify-between`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-slate-600">
                {c.title}
              </span>
              <Icon className="w-3.5 h-3.5 opacity-60 flex-shrink-0" />
            </div>

            <div className="my-1">
              <div className="flex items-baseline space-x-1">
                <span className="text-lg font-bold text-slate-900 tracking-tight font-mono tabular-nums">
                  {c.value}
                </span>
                <span className="text-[10px] text-slate-500 font-medium">{c.unit}</span>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 truncate">{c.subtext}</p>
          </div>
        );
      })}
    </div>
  );
};
