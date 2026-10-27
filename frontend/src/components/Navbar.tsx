import React, { useState, useEffect } from 'react';
import { Activity, Clock, Database, PlusCircle, LayoutDashboard, Table, FilePenLine } from 'lucide-react';

interface NavbarProps {
  activeTab: 'dashboard' | 'table' | 'entry';
  setActiveTab: (tab: 'dashboard' | 'table' | 'entry') => void;
  onOpenNewRecordModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, onOpenNewRecordModal }) => {
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand & Plant Identification */}
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <Activity className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg text-white tracking-wide">MES Core</span>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-800 text-sky-400 border border-slate-700">
                  v1.0
                </span>
              </div>
              <p className="text-xs text-slate-400">Manufacturing Production Monitoring System</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Plant Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('table')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'table'
                  ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Table className="w-4 h-4" />
              <span>Production Logs</span>
            </button>

            <button
              onClick={() => setActiveTab('entry')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'entry'
                  ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <FilePenLine className="w-4 h-4" />
              <span>Operator Entry</span>
            </button>
          </nav>

          {/* System Status Indicators & Action CTA */}
          <div className="flex items-center space-x-3">
            {/* Clock */}
            <div className="hidden lg:flex items-center space-x-1.5 text-xs text-slate-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-mono">{currentTime}</span>
            </div>

            {/* DB Health Pill */}
            <div className="hidden sm:flex items-center space-x-2 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <Database className="w-3.5 h-3.5" />
              <span>PostgreSQL 18.6 Live</span>
            </div>

            {/* Quick Record CTA */}
            <button
              onClick={onOpenNewRecordModal}
              className="flex items-center space-x-1.5 bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-400 hover:to-teal-400 text-white text-xs sm:text-sm font-semibold px-3.5 py-2 rounded-lg shadow-md shadow-sky-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Log Shift Record</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
