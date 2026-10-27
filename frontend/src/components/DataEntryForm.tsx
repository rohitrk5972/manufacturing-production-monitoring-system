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
  GaugeCircle,
  Send,
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
  const [lineSpeed, setLineSpeed] = useState<string>('65.0');
  const [unitsProduced, setUnitsProduced] = useState<string>('500');
  const [defectUnits, setDefectUnits] = useState<string>('10');
  const [energyKwh, setEnergyKwh] = useState<string>('260.00');
  const [operatorName, setOperatorName] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Constraint state
  const [activeAllocation, setActiveAllocation] = useState<ActiveDailyAllocation | null>(null);
  const [recordedShifts, setRecordedShifts] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filter products permitted for selected line via strict compatibility matrix
  const permittedProductIds = lineMappings
    .filter((m) => m.line_id === lineId)
    .map((m) => m.product_id);

  const availableProducts = products.filter((p) => permittedProductIds.includes(p.id));

  // Check daily allocation & already-recorded shifts whenever line or date changes
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
          // If line already ran a product on this date, lock to it (enforce 1 product/line/day)
          setProductId(allocation.product_id);
        } else {
          // Default to first permitted product for this line
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

  // Derived calculations for immediate operator feedback
  const parsedUnits = parseInt(unitsProduced, 10) || 0;
  const parsedDefects = parseInt(defectUnits, 10) || 0;
  const parsedEnergy = parseFloat(energyKwh) || 0;
  const parsedSpeed = parseFloat(lineSpeed) || 0;

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
        message: 'Defect units cannot exceed total production quantity.',
      });
      return;
    }

    if (parsedUnits <= 0) {
      setFeedback({
        type: 'error',
        message: 'Production quantity must be a positive whole number.',
      });
      return;
    }

    if (parsedSpeed < 0) {
      setFeedback({
        type: 'error',
        message: 'Line speed cannot be negative.',
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
        line_speed: parsedSpeed,
        units_produced: parsedUnits,
        defect_units: parsedDefects,
        energy_consumption_kwh: parsedEnergy,
        operator_name: operatorName.trim() || null,
        notes: notes.trim() || null,
      });

      setFeedback({
        type: 'success',
        message: 'Production shift record successfully validated and committed to PostgreSQL!',
      });

      setNotes('');
      // Refresh recorded shifts
      const updatedRecorded = await api.getRecordedShifts(lineId, productionDate);
      setRecordedShifts(updatedRecorded.map((r) => r.shift_id));

      if (onSuccess) {
        setTimeout(() => onSuccess(), 900);
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
    <div className={`bg-white rounded-lg border border-slate-200 shadow-sm ${isModal ? 'p-6' : 'p-6 max-w-4xl mx-auto'}`}>
      
      {/* Form Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 mb-5 border-b border-slate-200 gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <Layers className="w-5 h-5 text-sky-600" />
            <span>Operator Shift Production Entry</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Record actual output, line speed, and energy consumption for audited shifts
          </p>
        </div>

        {activeAllocation && (
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded bg-sky-50 border border-sky-200 text-sky-800 text-xs font-medium">
            <Lock className="w-3.5 h-3.5 text-sky-600" />
            <span>Line Locked: <strong>{activeAllocation.product_sku}</strong> (1 product/day rule)</span>
          </div>
        )}
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`mb-5 p-3.5 rounded border flex items-start space-x-2.5 text-xs ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : 'bg-rose-50 border-rose-300 text-rose-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
          )}
          <div>
            <p className="font-semibold">{feedback.type === 'success' ? 'Record Saved' : 'Validation Error'}</p>
            <p className="mt-0.5">{feedback.message}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        
        {/* Row 1: Line & Date */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Production Line (1 of 4)
            </label>
            <select
              value={lineId}
              onChange={(e) => setLineId(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
            >
              {lines.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.code} — {l.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Production Date
            </label>
            <div className="relative">
              <input
                type="date"
                required
                value={productionDate}
                onChange={(e) => setProductionDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
              />
              <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Row 2: Shift (Shift A, Shift B, Shift C) & Product Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Shift Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Shift (Shift A, Shift B, Shift C)
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
                    className={`p-2.5 rounded border text-left flex flex-col justify-between transition-all ${
                      isRecorded
                        ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                        : isSelected
                        ? 'bg-sky-50 border-sky-500 text-sky-900 font-semibold ring-1 ring-sky-500'
                        : 'bg-white border-slate-300 text-slate-700 hover:border-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs">{s.name}</span>
                      {isRecorded && (
                        <span className="text-[10px] text-amber-600 font-semibold">Done</span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 mt-0.5">
                      {s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}
                    </span>
                  </button>
                );
              })}
            </div>
            {recordedShifts.length === 3 && (
              <p className="text-[11px] text-amber-600 mt-1.5 flex items-center space-x-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>All 3 shifts already logged for this line on {productionDate}.</span>
              </p>
            )}
          </div>

          {/* Product Selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Product Manufactured
              </label>
              {activeAllocation && (
                <span className="text-[11px] text-sky-700 font-medium">1 product/line/day locked</span>
              )}
            </div>

            <select
              value={productId}
              onChange={(e) => setProductId(Number(e.target.value))}
              disabled={!!activeAllocation}
              className={`w-full bg-slate-50 border rounded px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                activeAllocation ? 'border-sky-300 bg-sky-50/50 cursor-not-allowed text-sky-900' : 'border-slate-300 focus:bg-white'
              }`}
            >
              {availableProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} — {p.name}
                </option>
              ))}
            </select>

            <p className="text-[11px] text-slate-500 mt-1">
              {activeAllocation
                ? `Locked to ${activeAllocation.product_sku} (${activeAllocation.product_name}) for entire date.`
                : `${availableProducts.length} permitted product(s) for this line per assignment compatibility.`}
            </p>
          </div>
        </div>

        {/* Row 3: Line Speed, Production Quantity, Energy Consumption */}
        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
            Shift Production & Energy Metrics
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Line Speed */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Line Speed (units/hr)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  required
                  value={lineSpeed}
                  onChange={(e) => setLineSpeed(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 font-mono focus:ring-2 focus:ring-sky-500"
                />
                <GaugeCircle className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2 pointer-events-none" />
              </div>
            </div>

            {/* Total Production Quantity */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Production Quantity (units)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={unitsProduced}
                  onChange={(e) => setUnitsProduced(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 font-mono font-bold focus:ring-2 focus:ring-sky-500"
                />
                <Package className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2 pointer-events-none" />
              </div>
            </div>

            {/* Energy Consumed */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Energy Consumed (kWh)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={energyKwh}
                  onChange={(e) => setEnergyKwh(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 font-mono focus:ring-2 focus:ring-sky-500"
                />
                <Zap className="w-3.5 h-3.5 text-amber-500 absolute right-2.5 top-2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Secondary Quality Field & Calculated KPI Indicators */}
          <div className="pt-2 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
            <div>
              <label className="block text-[11px] text-slate-500 mb-0.5">Defect Units (Scrap)</label>
              <input
                type="number"
                min="0"
                step="1"
                value={defectUnits}
                onChange={(e) => setDefectUnits(e.target.value)}
                className={`w-full bg-white border rounded px-2 py-1 text-xs font-mono ${
                  isDefectInvalid ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-300'
                }`}
              />
            </div>

            <div className="bg-white p-2 rounded border border-slate-200 text-center">
              <span className="text-[10px] text-slate-500 block">First-Pass Good Units</span>
              <span className="font-bold text-emerald-600 font-mono">{goodUnits.toLocaleString()}</span>
            </div>

            <div className="bg-white p-2 rounded border border-slate-200 text-center">
              <span className="text-[10px] text-slate-500 block">Scrap Rate</span>
              <span className="font-bold text-slate-800 font-mono">{scrapRate}%</span>
            </div>

            <div className="bg-white p-2 rounded border border-slate-200 text-center">
              <span className="text-[10px] text-slate-500 block">Energy per Unit</span>
              <span className="font-bold text-sky-700 font-mono">{energyPerUnit} kWh/u</span>
            </div>
          </div>
        </div>

        {/* Row 4: Operator Name & Notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Operator Name / ID
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="e.g. John Martinez (EMP-401)"
                value={operatorName}
                onChange={(e) => setOperatorName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
              />
              <User className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Shift Operational Notes
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="e.g. Standard line speed maintained, thermal stability nominal"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
              />
              <FileText className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting || isDefectInvalid || recordedShifts.length === 3}
            className={`w-full py-2.5 px-4 rounded text-xs font-semibold flex items-center justify-center space-x-2 transition-all ${
              submitting || isDefectInvalid || recordedShifts.length === 3
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-sky-600 hover:bg-sky-500 text-white shadow-sm'
            }`}
          >
            {submitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span>Committing to PostgreSQL...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Commit Production Record</span>
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
};
