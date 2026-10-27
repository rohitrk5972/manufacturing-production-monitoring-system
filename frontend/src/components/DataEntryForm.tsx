import React, { useState, useEffect } from 'react';
import {
  ProductionLine,
  Product,
  Shift,
  LineProductMapping,
  ActiveDailyAllocation,
} from '../types';
import { api } from '../api/client';
import {
  CheckCircle,
  AlertCircle,
  Lock,
  Layers,
  Zap,
  Package,
  Calendar,
  User,
  FileText,
  Sparkles,
} from 'lucide-react';

interface DataEntryFormProps {
  lines: ProductionLine[];
  products: Product[];
  shifts: Shift[];
  lineMappings: LineProductMapping[];
  onSuccess?: () => void;
  isModal?: boolean;
}

export const DataEntryForm: React.FC<DataEntryFormProps> = ({
  lines,
  products,
  shifts,
  lineMappings,
  onSuccess,
  isModal = false,
}) => {
  // Form State
  const [lineId, setLineId] = useState<number>(lines[0]?.id || 1);
  const [productionDate, setProductionDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [shiftId, setShiftId] = useState<number>(shifts[0]?.id || 1);
  const [productId, setProductId] = useState<number>(products[0]?.id || 1);
  const [unitsProduced, setUnitsProduced] = useState<string>('450');
  const [defectUnits, setDefectUnits] = useState<string>('12');
  const [energyKwh, setEnergyKwh] = useState<string>('240.50');
  const [operatorName, setOperatorName] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Constraint / helper state
  const [activeAllocation, setActiveAllocation] = useState<ActiveDailyAllocation | null>(null);
  const [recordedShifts, setRecordedShifts] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filter products permitted for selected line
  const permittedProductIds = lineMappings
    .filter((m) => m.line_id === lineId)
    .map((m) => m.product_id);

  const availableProducts = products.filter((p) => permittedProductIds.includes(p.id));

  // Whenever line or date changes, check daily allocation and already-recorded shifts
  useEffect(() => {
    let isMounted = true;
    async function loadLineContext() {
      if (!lineId || !productionDate) return;
      try {
        const [allocation, recorded] = await Promise.all([
          api.getActiveProductForLineAndDate(lineId, productionDate),
          api.getRecordedShifts(lineId, productionDate),
        ]);

        if (!isMounted) return;

        setActiveAllocation(allocation);
        setRecordedShifts(recorded.map((r) => r.shift_id));

        if (allocation) {
          // If product is already locked for the day on this line, enforce it in form
          setProductId(allocation.product_id);
        } else {
          // If no allocation yet, default to first available product for this line
          const firstPermitted = availableProducts[0]?.id;
          if (firstPermitted && !permittedProductIds.includes(productId)) {
            setProductId(firstPermitted);
          }
        }

        // Auto-select first non-recorded shift
        const availableShift = shifts.find((s) => !recorded.some((r) => r.shift_id === s.id));
        if (availableShift) {
          setShiftId(availableShift.id);
        }
      } catch (err) {
        console.error('Error fetching line context:', err);
      }
    }

    loadLineContext();
    return () => {
      isMounted = false;
    };
  }, [lineId, productionDate]);

  // Derived calculations for instant operator feedback
  const parsedUnits = parseInt(unitsProduced, 10) || 0;
  const parsedDefects = parseInt(defectUnits, 10) || 0;
  const parsedEnergy = parseFloat(energyKwh) || 0;

  const goodUnits = Math.max(0, parsedUnits - parsedDefects);
  const scrapRate = parsedUnits > 0 ? ((parsedDefects / parsedUnits) * 100).toFixed(2) : '0.00';
  const energyPerUnit = parsedUnits > 0 ? (parsedEnergy / parsedUnits).toFixed(4) : '0.0000';
  const isDefectInvalid = parsedDefects > parsedUnits;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (isDefectInvalid) {
      setFeedback({
        type: 'error',
        message: 'Defect units cannot exceed total units produced.',
      });
      return;
    }

    if (parsedUnits <= 0) {
      setFeedback({
        type: 'error',
        message: 'Units produced must be greater than zero.',
      });
      return;
    }

    setSubmitting(true);
    try {
      await api.createRecord({
        line_id: lineId,
        production_date: productionDate,
        shift_id: shiftId,
        product_id: productId,
        units_produced: parsedUnits,
        defect_units: parsedDefects,
        energy_consumption_kwh: parsedEnergy,
        operator_name: operatorName.trim() || null,
        notes: notes.trim() || null,
      });

      setFeedback({
        type: 'success',
        message: `Shift record successfully committed to PostgreSQL database!`,
      });

      // Reset form units & refresh context
      setUnitsProduced('450');
      setDefectUnits('10');
      setNotes('');

      // Refresh recorded shifts
      const updatedRecorded = await api.getRecordedShifts(lineId, productionDate);
      setRecordedShifts(updatedRecorded.map((r) => r.shift_id));

      if (onSuccess) {
        setTimeout(() => onSuccess(), 1000);
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to submit production record.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`bg-slate-900/90 rounded-2xl border border-slate-800 ${isModal ? 'p-6' : 'p-6 sm:p-8 max-w-4xl mx-auto shadow-2xl'}`}>
      
      {/* Title & Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-6 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Layers className="w-5 h-5 text-sky-400" />
            <span>Operator Production Record Entry</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Enforces: One product per line per day • One record per shift • Allowed line-product compatibility
          </p>
        </div>

        {activeAllocation && (
          <div className="mt-3 sm:mt-0 flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-300 text-xs">
            <Lock className="w-3.5 h-3.5" />
            <span>Line Day-Lock: <strong>{activeAllocation.product_sku}</strong></span>
          </div>
        )}
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`mb-6 p-4 rounded-xl border flex items-start space-x-3 text-sm ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
          )}
          <div>
            <p className="font-semibold">{feedback.type === 'success' ? 'Record Saved' : 'Submission Rejected'}</p>
            <p className="text-xs opacity-90 mt-0.5">{feedback.message}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Row 1: Line & Date */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Production Line (1 of 4)
            </label>
            <div className="relative">
              <select
                value={lineId}
                onChange={(e) => setLineId(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                {lines.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.code} — {l.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Production Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={productionDate}
                onChange={(e) => setProductionDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Row 2: Shift & Product (with Business Rule indicators) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Shift Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Shift (1 of 3)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {shifts.map((s) => {
                const isRecorded = recordedShifts.includes(s.id);
                const isSelected = shiftId === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    disabled={isRecorded}
                    onClick={() => setShiftId(s.id)}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                      isRecorded
                        ? 'bg-slate-950/40 border-slate-800 text-slate-600 cursor-not-allowed opacity-60'
                        : isSelected
                        ? 'bg-sky-500/20 border-sky-500 text-sky-200 shadow-md shadow-sky-500/10'
                        : 'bg-slate-950 border-slate-700 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold">Shift {s.shift_number}</span>
                      {isRecorded && <span className="text-[10px] text-amber-500 font-semibold">Done</span>}
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1">{s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}</span>
                  </button>
                );
              })}
            </div>
            {recordedShifts.length === 3 && (
              <p className="text-xs text-amber-400 mt-2 flex items-center space-x-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>All 3 shifts already logged for this line on {productionDate}.</span>
              </p>
            )}
          </div>

          {/* Product Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Product
              </label>
              {activeAllocation && (
                <span className="text-[11px] text-sky-400 flex items-center space-x-1">
                  <Lock className="w-3 h-3" />
                  <span>Enforcing 1 product/day rule</span>
                </span>
              )}
            </div>

            <select
              value={productId}
              onChange={(e) => setProductId(Number(e.target.value))}
              disabled={!!activeAllocation}
              className={`w-full bg-slate-950 border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                activeAllocation ? 'border-sky-500/50 bg-sky-950/20 cursor-not-allowed' : 'border-slate-700'
              }`}
            >
              {availableProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} — {p.name} ({p.category})
                </option>
              ))}
            </select>

            <p className="text-[11px] text-slate-400 mt-1.5">
              {activeAllocation
                ? `Fixed to "${activeAllocation.product_name}" because production was already logged today.`
                : `${availableProducts.length} compatible product(s) configured for this line.`}
            </p>
          </div>
        </div>

        {/* Row 3: Metrics (Units Produced, Defect Units, Energy Consumption) */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-3">
            Production & Energy Metrics
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-300 mb-1">Total Units Produced</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={unitsProduced}
                  onChange={(e) => setUnitsProduced(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-sky-500"
                />
                <Package className="w-4 h-4 text-slate-500 absolute right-3 top-2.5 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1">Defect / Scrap Units</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={defectUnits}
                  onChange={(e) => setDefectUnits(e.target.value)}
                  className={`w-full bg-slate-900 border rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-sky-500 ${
                    isDefectInvalid ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-700'
                  }`}
                />
              </div>
              {isDefectInvalid && (
                <span className="text-[11px] text-rose-400 mt-1 block">Cannot exceed total units!</span>
              )}
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1">Energy Consumption (kWh)</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={energyKwh}
                  onChange={(e) => setEnergyKwh(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-sky-500"
                />
                <Zap className="w-4 h-4 text-amber-400 absolute right-3 top-2.5 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Live Calculated Stats Preview Bar */}
          <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Good Units Output</span>
              <span className="font-semibold text-emerald-400">{goodUnits.toLocaleString()} units</span>
            </div>
            <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Calculated Scrap Rate</span>
              <span className={`font-semibold ${Number(scrapRate) > 3.0 ? 'text-amber-400' : 'text-slate-200'}`}>
                {scrapRate}%
              </span>
            </div>
            <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Energy Intensity</span>
              <span className="font-semibold text-cyan-400">{energyPerUnit} kWh/unit</span>
            </div>
          </div>
        </div>

        {/* Row 4: Operator & Notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Operator Name / ID
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="e.g. John Martinez (EMP-401)"
                value={operatorName}
                onChange={(e) => setOperatorName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <User className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Shift Notes / Quality Audit
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="e.g. Minor calibration mid-shift, optimal line speed"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <FileText className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting || isDefectInvalid || recordedShifts.length === 3}
            className={`w-full py-3.5 px-6 rounded-xl font-semibold text-sm flex items-center justify-center space-x-2 transition-all ${
              submitting || isDefectInvalid || recordedShifts.length === 3
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-400 hover:to-teal-400 text-white shadow-lg shadow-sky-500/25 hover:scale-[1.01] active:scale-[0.99]'
            }`}
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span>Committing to PostgreSQL...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Commit Production Record</span>
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
};
