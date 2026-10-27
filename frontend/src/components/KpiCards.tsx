import React from 'react';
import { Package, CheckCircle2, AlertTriangle, Zap, Gauge, Layers } from 'lucide-react';
import { KPIStats } from '../types';

interface KpiCardsProps {
  stats: KPIStats | null;
  loading: boolean;
}

export const KpiCards: React.FC<KpiCardsProps> = ({ stats, loading }) => {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 animate-pulse">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-28 bg-slate-900/60 rounded-xl border border-slate-800 p-4"></div>
        ))}
      </div>
    );
  }

  const yieldRate = stats.total_units > 0 
    ? ((stats.good_units / stats.total_units) * 100).toFixed(2)
    : '100.00';

  const cards = [
    {
      title: 'Total Output',
      value: stats.total_units.toLocaleString(),
      unit: 'units',
      sub: `${stats.total_records} shift runs`,
      icon: Package,
      color: 'text-sky-400',
      bg: 'bg-sky-500/10 border-sky-500/20',
    },
    {
      title: 'Good Units',
      value: stats.good_units.toLocaleString(),
      unit: 'units',
      sub: `${yieldRate}% First-Pass Yield`,
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
    },
    {
      title: 'Defect Units',
      value: stats.defect_units.toLocaleString(),
      unit: 'units',
      sub: `${stats.scrap_rate_pct}% Scrap Rate`,
      icon: AlertTriangle,
      color: stats.scrap_rate_pct > 3.0 ? 'text-amber-400' : 'text-slate-400',
      bg: stats.scrap_rate_pct > 3.0 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-slate-800/40 border-slate-700/30',
    },
    {
      title: 'Energy Used',
      value: Math.round(stats.total_energy_kwh).toLocaleString(),
      unit: 'kWh',
      sub: 'Total Grid Draw',
      icon: Zap,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
    },
    {
      title: 'Energy / Unit',
      value: Number(stats.energy_per_unit_kwh).toFixed(3),
      unit: 'kWh/unit',
      sub: 'Specific Consumption',
      icon: Gauge,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10 border-cyan-500/20',
    },
    {
      title: 'Logged Shifts',
      value: stats.total_records.toLocaleString(),
      unit: 'records',
      sub: 'PostgreSQL Audited',
      icon: Layers,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10 border-purple-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <div
            key={i}
            className={`p-4 rounded-xl border backdrop-blur-sm transition-all hover:translate-y-[-2px] ${c.bg}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{c.title}</span>
              <Icon className={`w-4 h-4 ${c.color}`} />
            </div>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-xl sm:text-2xl font-bold text-white tracking-tight">{c.value}</span>
              <span className="text-xs text-slate-400">{c.unit}</span>
            </div>
            <p className="mt-1.5 text-xs text-slate-400 truncate">{c.sub}</p>
          </div>
        );
      })}
    </div>
  );
};
