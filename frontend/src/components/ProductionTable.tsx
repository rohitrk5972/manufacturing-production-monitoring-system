import React, { useState } from 'react';
import {
  ProductionRecord,
  ProductionLine,
  Product,
  Shift,
} from '../types';
import {
  Search,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Info,
} from 'lucide-react';

interface ProductionTableProps {
  records: ProductionRecord[];
  totalRecords: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  lines: ProductionLine[];
  products: Product[];
  shifts: Shift[];
  filters: {
    line_id?: number;
    shift_id?: number;
    product_id?: number;
    startDate?: string;
    endDate?: string;
  };
  onFilterChange: (newFilters: any) => void;
  onDeleteRecord: (id: number) => Promise<void>;
  loading: boolean;
}

export const ProductionTable: React.FC<ProductionTableProps> = ({
  records,
  totalRecords,
  currentPage,
  totalPages,
  onPageChange,
  lines,
  products,
  shifts,
  filters,
  onFilterChange,
  onDeleteRecord,
  loading,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Client-side quick search filtering on currently loaded page
  const displayedRecords = records.filter((r) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.line_code.toLowerCase().includes(term) ||
      r.product_sku.toLowerCase().includes(term) ||
      r.product_name.toLowerCase().includes(term) ||
      (r.operator_name && r.operator_name.toLowerCase().includes(term)) ||
      r.production_date.includes(term)
    );
  });

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this production record? If this was the only record for this line today, the daily allocation will also be released.')) {
      setDeletingId(id);
      try {
        await onDeleteRecord(id);
      } finally {
        setDeletingId(null);
      }
    }
  };

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
      
      {/* Table Header & Controls Bar */}
      <div className="p-4 sm:p-6 border-b border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <span>Production Records Audit Log</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-sky-400 border border-slate-700">
                {totalRecords} Total Entries
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Verified historical shift entries with relational constraints and exact specific energy metrics
            </p>
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search SKU, line, operator..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
          </div>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
          {/* Line Filter */}
          <div>
            <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">Line</label>
            <select
              value={filters.line_id || ''}
              onChange={(e) => onFilterChange({ ...filters, line_id: e.target.value ? Number(e.target.value) : undefined })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="">All Lines (4)</option>
              {lines.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.code}
                </option>
              ))}
            </select>
          </div>

          {/* Shift Filter */}
          <div>
            <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">Shift</label>
            <select
              value={filters.shift_id || ''}
              onChange={(e) => onFilterChange({ ...filters, shift_id: e.target.value ? Number(e.target.value) : undefined })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="">All Shifts (3)</option>
              {shifts.map((s) => (
                <option key={s.id} value={s.id}>
                  Shift {s.shift_number}
                </option>
              ))}
            </select>
          </div>

          {/* Product Filter */}
          <div>
            <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">Product</label>
            <select
              value={filters.product_id || ''}
              onChange={(e) => onFilterChange({ ...filters, product_id: e.target.value ? Number(e.target.value) : undefined })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="">All Products (5)</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">From Date</label>
            <input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => onFilterChange({ ...filters, startDate: e.target.value || undefined })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">To Date</label>
            <input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => onFilterChange({ ...filters, endDate: e.target.value || undefined })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
        </div>
      </div>

      {/* Table Body */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950/80 text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-800">
            <tr>
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4">Line</th>
              <th className="py-3 px-4">Shift</th>
              <th className="py-3 px-4">Product SKU & Name</th>
              <th className="py-3 px-4 text-right">Total Units</th>
              <th className="py-3 px-4 text-right">Good Units</th>
              <th className="py-3 px-4 text-right">Scrap Rate</th>
              <th className="py-3 px-4 text-right">Energy (kWh)</th>
              <th className="py-3 px-4 text-right">kWh / Unit</th>
              <th className="py-3 px-4">Operator</th>
              <th className="py-3 px-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {loading ? (
              [...Array(6)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={11} className="py-4 px-4 bg-slate-900/30"></td>
                </tr>
              ))
            ) : displayedRecords.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-12 text-center text-slate-500">
                  <Info className="w-6 h-6 mx-auto mb-2 text-slate-600" />
                  <span>No production records found matching the active filters.</span>
                </td>
              </tr>
            ) : (
              displayedRecords.map((r) => {
                const scrapFloat = parseFloat(r.scrap_rate_pct);
                const isScrapHigh = scrapFloat > 3.5;
                return (
                  <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                    {/* Date */}
                    <td className="py-3 px-4 font-mono font-medium text-slate-200 whitespace-nowrap">
                      {r.production_date}
                    </td>

                    {/* Line */}
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                        {r.line_code}
                      </span>
                    </td>

                    {/* Shift */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="text-slate-300 font-medium">Shift {r.shift_number}</span>
                    </td>

                    {/* Product */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{r.product_sku}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[150px]">{r.product_name}</div>
                    </td>

                    {/* Total Units */}
                    <td className="py-3 px-4 text-right font-mono font-bold text-white">
                      {r.units_produced.toLocaleString()}
                    </td>

                    {/* Good Units */}
                    <td className="py-3 px-4 text-right font-mono text-emerald-400 font-medium">
                      {r.good_units.toLocaleString()}
                    </td>

                    {/* Defect Units & Scrap Rate */}
                    <td className="py-3 px-4 text-right">
                      <span
                        className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-mono font-semibold ${
                          isScrapHigh
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        <span>{r.defect_units}</span>
                        <span className="text-[10px] opacity-75">({r.scrap_rate_pct}%)</span>
                      </span>
                    </td>

                    {/* Energy (kWh) */}
                    <td className="py-3 px-4 text-right font-mono text-amber-300 font-medium">
                      {Math.round(Number(r.energy_consumption_kwh)).toLocaleString()}
                    </td>

                    {/* Energy per Unit */}
                    <td className="py-3 px-4 text-right font-mono text-cyan-400 font-medium">
                      {Number(r.energy_per_unit_kwh).toFixed(3)}
                    </td>

                    {/* Operator */}
                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                      {r.operator_name || '—'}
                    </td>

                    {/* Delete action */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleDelete(r.id)}
                        disabled={deletingId === r.id}
                        className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Delete record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <div>
          Showing page <span className="font-semibold text-white">{currentPage}</span> of{' '}
          <span className="font-semibold text-white">{totalPages || 1}</span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1 || loading}
            className="p-1.5 rounded-lg border border-slate-700 bg-slate-950 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages || loading}
            className="p-1.5 rounded-lg border border-slate-700 bg-slate-950 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

    </div>
  );
};
