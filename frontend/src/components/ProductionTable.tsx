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
  AlertTriangle,
  Download,
} from 'lucide-react';
import { api } from '../api/client';

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
  const [recordToDelete, setRecordToDelete] = useState<ProductionRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);

  const displayedRecords = records.filter((r) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.line_code.toLowerCase().includes(term) ||
      r.line_name.toLowerCase().includes(term) ||
      r.product_sku.toLowerCase().includes(term) ||
      r.product_name.toLowerCase().includes(term) ||
      (r.operator_name && r.operator_name.toLowerCase().includes(term)) ||
      r.production_date.includes(term)
    );
  });

  const handleConfirmDelete = async () => {
    if (!recordToDelete) return;
    setIsDeleting(true);
    try {
      await onDeleteRecord(recordToDelete.id);
      setRecordToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      await api.downloadRecordsCsv({
        ...filters,
      });
    } catch (err) {
      console.error('Failed to export CSV:', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      
      {/* Controls Bar */}
      <div className="p-4 border-b border-slate-200 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <span>Production Shift Records Audit Table</span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                {totalRecords} Shifts Logged
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Audited production volume, line velocity, and energy consumption per shift
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {/* Quick Search */}
            <div className="relative w-full sm:w-60">
              <input
                type="text"
                placeholder="Filter by SKU, operator, line..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2 pointer-events-none" />
            </div>

            {/* Export CSV Button */}
            <button
              onClick={handleExportCsv}
              disabled={exporting}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-white hover:bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-700 shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 disabled:opacity-50 whitespace-nowrap"
              title="Export filtered production records to CSV"
            >
              <Download className={`w-3.5 h-3.5 ${exporting ? 'animate-bounce text-sky-600' : 'text-slate-500'}`} />
              <span>{exporting ? 'Exporting...' : 'Export CSV'}</span>
            </button>
          </div>
        </div>

        {/* Filter Dropdowns */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Production Line</label>
            <select
              value={filters.line_id || ''}
              onChange={(e) => onFilterChange({ ...filters, line_id: e.target.value ? Number(e.target.value) : undefined })}
              className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:ring-1 focus:ring-sky-500"
            >
              <option value="">All Lines (4)</option>
              {lines.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Shift</label>
            <select
              value={filters.shift_id || ''}
              onChange={(e) => onFilterChange({ ...filters, shift_id: e.target.value ? Number(e.target.value) : undefined })}
              className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:ring-1 focus:ring-sky-500"
            >
              <option value="">All Shifts (3)</option>
              {shifts.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Product</label>
            <select
              value={filters.product_id || ''}
              onChange={(e) => onFilterChange({ ...filters, product_id: e.target.value ? Number(e.target.value) : undefined })}
              className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:ring-1 focus:ring-sky-500"
            >
              <option value="">All Products (5)</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} — {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">From Date</label>
            <input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => onFilterChange({ ...filters, startDate: e.target.value || undefined })}
              className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">To Date</label>
            <input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => onFilterChange({ ...filters, endDate: e.target.value || undefined })}
              className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:ring-1 focus:ring-sky-500"
            />
          </div>
        </div>
      </div>

      {/* Table Body */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-50 text-[11px] text-slate-500 uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-3">Date</th>
              <th className="py-2.5 px-3">Line</th>
              <th className="py-2.5 px-3">Shift</th>
              <th className="py-2.5 px-3">Product</th>
              <th className="py-2.5 px-3 text-right">Line Speed</th>
              <th className="py-2.5 px-3 text-right">Production Quantity</th>
              <th className="py-2.5 px-3 text-right">Energy (kWh)</th>
              <th className="py-2.5 px-3 text-right">kWh / Unit</th>
              <th className="py-2.5 px-3 text-right">Good Units</th>
              <th className="py-2.5 px-3">Operator</th>
              <th className="py-2.5 px-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              [...Array(6)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={11} className="py-3 px-3 bg-slate-50/50"></td>
                </tr>
              ))
            ) : displayedRecords.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-10 text-center text-slate-400">
                  <Info className="w-5 h-5 mx-auto mb-1.5 text-slate-400" />
                  <span>No production records found matching filters.</span>
                </td>
              </tr>
            ) : (
              displayedRecords.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">{r.production_date}</td>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">{r.line_name}</td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                      {r.shift_name}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-sky-800">{r.product_sku}</div>
                    <div className="text-[10px] text-slate-500 truncate max-w-[140px]">{r.product_name}</div>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-indigo-700 font-medium">
                    {Number(r.line_speed).toFixed(1)} u/h
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                    {r.units_produced.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-amber-700 font-medium">
                    {Math.round(Number(r.energy_consumption_kwh)).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-cyan-700 font-medium">
                    {Number(r.energy_per_unit_kwh).toFixed(3)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-emerald-700">
                    {r.good_units.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 truncate max-w-[110px]">
                    {r.operator_name || '—'}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <button
                      onClick={() => setRecordToDelete(r)}
                      className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                      title="Delete shift record"
                      aria-label={`Delete record for ${r.line_code} on ${r.production_date}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
        <div>
          Page <span className="font-semibold text-slate-800">{currentPage}</span> of{' '}
          <span className="font-semibold text-slate-800">{totalPages || 1}</span>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1 || loading}
            className="p-1 rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages || loading}
            className="p-1 rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            aria-label="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Enterprise Delete Confirmation Modal */}
      {recordToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
        >
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start space-x-3">
              <div className="p-2 rounded-full bg-rose-50 text-rose-600 border border-rose-200">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 id="delete-dialog-title" className="text-sm font-bold text-slate-900">
                  Confirm Shift Record Deletion
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Are you sure you want to permanently delete this production record? This will immediately recalculate all plant KPIs, yield metrics, and energy analytics in PostgreSQL.
                </p>
              </div>
            </div>

            {/* Record Summary Box */}
            <div className="bg-slate-50 rounded border border-slate-200 p-3 text-xs space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Date:</span>
                <span className="font-semibold text-slate-800">{recordToDelete.production_date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Line & Shift:</span>
                <span className="font-semibold text-slate-800">{recordToDelete.line_name} ({recordToDelete.shift_name})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Product:</span>
                <span className="font-semibold text-slate-800">{recordToDelete.product_sku} — {recordToDelete.product_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Volume / Energy:</span>
                <span className="font-semibold text-slate-800">{recordToDelete.units_produced.toLocaleString()} units / {Math.round(recordToDelete.energy_consumption_kwh)} kWh</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-2 pt-1">
              <button
                type="button"
                onClick={() => setRecordToDelete(null)}
                disabled={isDeleting}
                className="px-3 py-1.5 rounded border border-slate-300 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-3.5 py-1.5 rounded bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 flex items-center space-x-1.5 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Record</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
