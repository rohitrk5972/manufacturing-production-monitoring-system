import React from 'react';
import { X } from 'lucide-react';
import { DataEntryForm } from './DataEntryForm';
import { ProductionLine, Product, Shift, LineProductMapping } from '../types';

interface DataEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  lines: ProductionLine[];
  products: Product[];
  shifts: Shift[];
  lineMappings: LineProductMapping[];
  onSuccess: () => void;
}

export const DataEntryModal: React.FC<DataEntryModalProps> = ({
  isOpen,
  onClose,
  lines,
  products,
  shifts,
  lineMappings,
  onSuccess,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 p-2 text-slate-400 hover:text-white rounded-lg bg-slate-800/60 hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <DataEntryForm
          lines={lines}
          products={products}
          shifts={shifts}
          lineMappings={lineMappings}
          isModal={true}
          onSuccess={() => {
            onSuccess();
            onClose();
          }}
        />
      </div>
    </div>
  );
};
