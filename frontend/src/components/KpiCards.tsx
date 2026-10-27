import React from 'react';
import { Package, Zap, Gauge, Layers, GaugeCircle, CheckCircle2 } from 'lucide-react';
import { KPIStats } from '../types';

interface KpiCardsProps {
  stats: KPIStats | null;
  loading: boolean;
}

export const KpiCards: React.FC<KpiCardsProps> = ({ stats, loading }) => {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 animate-pulse">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-24 bg-white rounded-lg border border-slate-200 p-4"></div>
        ))}
      </div>
    );
  }

  const yieldRate = stats.total_units > 0 
    ? ((stats.good_units / stats.total_units) * 100).toFixed(1)
    : '100.0';

  const cards = [
    {
      title: 'Total Production',
      value: stats.total_units.toLocaleString(),
      unit: 'units',
      sub: `${stats.good_units.toLocaleString()} good units`,
      icon: Package,
      accent: 'border-l-sky-500 text-sky-600',
    },
    {
      title: 'Total Energy',
      value: Math.round(stats.total_energy_kwh).toLocaleString(),
      unit: 'kWh',
      sub: 'Grid Consumption',
      icon: Zap,
      accent: 'border-l-amber-500 text-amber-600',
    },
    {
      title: 'Energy / Unit',
      value: Number(stats.energy_per_unit_kwh).toFixed(3),
      unit: 'kWh/unit',
      sub: 'Specific Energy Draw',
      icon: Gauge,
      accent: 'border-l-cyan-500 text-cyan-600',
    },
    {
      title: 'Avg Line Speed',
      value: stats.avg_line_speed ? Number(stats.avg_line_speed).toFixed(1) : '0.0',
      unit: 'u/hr',
      sub: 'Mean Velocity',
      icon: GaugeCircle,
      accent: 'border-l-indigo-500 text-indigo-600',
    },
    {
      title: 'First-Pass Yield',
      value: `${yieldRate}%`,
      unit: 'yield',
      sub: `${stats.defect_units.toLocaleString()} defect units`,
      icon: CheckCircle2,
      accent: 'border-l-emerald-500 text-emerald-600',
    },
    {
      title: 'Shifts Audited',
      value: stats.total_records.toLocaleString(),
      unit: 'shifts',
      sub: 'PostgreSQL Relational',
      icon: Layers,
      accent: 'border-l-purple-500 text-purple-600',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <div
            key={i}
            className={`bg-white p-3.5 rounded-lg border border-slate-200 border-l-4 ${c.accent} shadow-sm transition-all hover:shadow-md`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                {c.title}
              </span>
              <Icon className="w-4 h-4 opacity-75" />
            </div>
            <div className="flex items-baseline space-x-1">
              <span className="text-xl font-bold text-slate-900 tracking-tight font-mono">
                {c.value}
              </span>
              <span className="text-xs text-slate-500 font-medium">{c.unit}</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500 truncate">{c.sub}</p>
          </div>
        );
      })}
    </div>
  );
};
