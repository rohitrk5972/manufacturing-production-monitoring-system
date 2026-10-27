import React, { useState, useEffect } from 'react';
import {
  Factory,
  Clock,
  Database,
  PlusCircle,
  LayoutDashboard,
  Table,
  FilePenLine,
} from 'lucide-react';

interface NavbarProps {
  activeTab: 'dashboard' | 'table' | 'entry';
  setActiveTab: (tab: 'dashboard' | 'table' | 'entry') => void;
  onOpenNewRecordModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenNewRecordModal,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-slate-900 border-b border-slate-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Product Identity */}
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-400/20 text-sky-400">
              <Factory className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-base tracking-tight text-white">
                  Manufacturing Operations
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded bg-slate-800 text-sky-400 border border-slate-700">
                  Enterprise
                </span>
              </div>
              <p className="text-xs text-slate-400">Production & Energy Monitoring</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1 bg-slate-950/60 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Plant Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('entry')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'entry'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <FilePenLine className="w-3.5 h-3.5" />
              <span>Production Entry</span>
            </button>

            <button
              onClick={() => setActiveTab('table')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'table'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Production Records</span>
            </button>
          </nav>

          {/* Status & Actions */}
          <div className="flex items-center space-x-3">
            {/* Clock */}
            <div className="hidden lg:flex items-center space-x-1.5 text-xs text-slate-300 bg-slate-800/80 px-2.5 py-1.5 rounded border border-slate-700/80">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-mono text-slate-200">{currentTime}</span>
            </div>

            {/* DB Status Pill */}
            <div className="hidden sm:flex items-center space-x-1.5 text-xs bg-emerald-950/50 text-emerald-300 border border-emerald-600/30 px-2.5 py-1.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <Database className="w-3 h-3 text-emerald-400" />
              <span>PostgreSQL 18.6 Connected</span>
            </div>

            {/* Quick Record CTA */}
            <button
              onClick={onOpenNewRecordModal}
              className="flex items-center space-x-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold px-3 py-1.5 rounded shadow-sm transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Log Shift Record</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
