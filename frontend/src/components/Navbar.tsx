import React, { useState, useEffect } from 'react';
import {
  Factory,
  Clock,
  Database,
  PlusCircle,
  LayoutDashboard,
  Table,
  FilePenLine,
  Menu,
  X,
} from 'lucide-react';

interface NavbarProps {
  activeTab: 'dashboard' | 'table' | 'entry';
  setActiveTab: (tab: 'dashboard' | 'table' | 'entry') => void;
  onOpenNewRecordModal: () => void;
  isBackendConnected: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenNewRecordModal,
  isBackendConnected,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

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
    <header className="sticky top-0 z-30 bg-slate-900 border-b border-slate-800 text-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-15 py-2.5">
          
          {/* Brand Identity */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded bg-sky-600 flex items-center justify-center text-white shadow-sm">
              <Factory className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-sm sm:text-base text-white tracking-tight">
                  Manufacturing Operations
                </span>
                <span className="hidden sm:inline-block px-1.5 py-0.2 text-[10px] font-medium tracking-wide uppercase rounded bg-slate-800 text-slate-300 border border-slate-700">
                  MES
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-normal">
                Production & Energy Monitoring
              </p>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1 bg-slate-950/70 p-1 rounded-md border border-slate-800" aria-label="Main Navigation">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                activeTab === 'dashboard'
                  ? 'bg-sky-600 text-white font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Plant Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('entry')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                activeTab === 'entry'
                  ? 'bg-sky-600 text-white font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <FilePenLine className="w-3.5 h-3.5" />
              <span>Production Entry</span>
            </button>

            <button
              onClick={() => setActiveTab('table')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                activeTab === 'table'
                  ? 'bg-sky-600 text-white font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Production Records</span>
            </button>
          </nav>

          {/* Right Status Indicators & Primary Action */}
          <div className="flex items-center space-x-2.5">
            {/* Clock */}
            <div className="hidden lg:flex items-center space-x-1 text-xs text-slate-300 bg-slate-800/80 px-2 py-1 rounded border border-slate-700/80">
              <Clock className="w-3 h-3 text-slate-400" />
              <span className="font-mono tabular-nums text-slate-300">{currentTime}</span>
            </div>

            {/* Live Backend Connection Status Indicator */}
            <div
              className={`flex items-center space-x-1.5 text-xs px-2.5 py-1 rounded border font-medium transition-colors ${
                isBackendConnected
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-600/40'
                  : 'bg-rose-950/60 text-rose-300 border-rose-600/40'
              }`}
              title={isBackendConnected ? 'Connected to PostgreSQL Backend' : 'Disconnected from Backend'}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isBackendConnected ? 'bg-emerald-400' : 'bg-rose-400'
                }`}
              />
              <Database className="w-3 h-3" />
              <span className="hidden sm:inline">
                {isBackendConnected ? 'PostgreSQL Online' : 'Backend Offline'}
              </span>
            </div>

            {/* Quick Shift Entry CTA */}
            <button
              onClick={onOpenNewRecordModal}
              className="flex items-center space-x-1 bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium px-2.5 py-1 rounded shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Log Shift</span>
            </button>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-800 py-2.5 space-y-1">
            <button
              onClick={() => {
                setActiveTab('dashboard');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center space-x-2 px-3 py-2 rounded text-xs font-medium ${
                activeTab === 'dashboard' ? 'bg-sky-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Plant Overview</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('entry');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center space-x-2 px-3 py-2 rounded text-xs font-medium ${
                activeTab === 'entry' ? 'bg-sky-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <FilePenLine className="w-4 h-4" />
              <span>Production Entry</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('table');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center space-x-2 px-3 py-2 rounded text-xs font-medium ${
                activeTab === 'table' ? 'bg-sky-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Table className="w-4 h-4" />
              <span>Production Records</span>
            </button>
          </div>
        )}

      </div>
    </header>
  );
};
