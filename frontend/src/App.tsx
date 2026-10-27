import React, { useState, useEffect, useCallback } from 'react';
import { api } from './api/client';
import {
  ProductionLine,
  Product,
  Shift,
  LineProductMapping,
  ProductionRecord,
  KPIStats,
  DailyProductionPoint,
  DailyByLineProductPoint,
  ShiftComparisonPoint,
  ProductComparisonPoint,
  LineComparisonPoint,
  LineSpeedTrendPoint,
} from './types';
import { Navbar } from './components/Navbar';
import { KpiCards } from './components/KpiCards';
import { DashboardCharts } from './components/DashboardCharts';
import { DailyLineProductSummary } from './components/DailyLineProductSummary';
import { ProductionTable } from './components/ProductionTable';
import { DataEntryForm } from './components/DataEntryForm';
import { DataEntryModal } from './components/DataEntryModal';
import { RefreshCw, Database, Calendar } from 'lucide-react';

export const App: React.FC = () => {
  // Navigation & Modal State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'table' | 'entry'>('dashboard');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Metadata State
  const [lines, setLines] = useState<ProductionLine[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [lineMappings, setLineMappings] = useState<LineProductMapping[]>([]);

  // Filter State
  const currentMonthStr = new Date().toISOString().slice(0, 7); // e.g. '2026-10'
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [filters, setFilters] = useState<{
    line_id?: number;
    shift_id?: number;
    product_id?: number;
    startDate?: string;
    endDate?: string;
  }>({});
  const [page, setPage] = useState<number>(1);

  // Data State
  const [kpis, setKpis] = useState<KPIStats | null>(null);
  const [dailyData, setDailyData] = useState<DailyProductionPoint[]>([]);
  const [dailyLineProductData, setDailyLineProductData] = useState<DailyByLineProductPoint[]>([]);
  const [shiftData, setShiftData] = useState<ShiftComparisonPoint[]>([]);
  const [productData, setProductData] = useState<ProductComparisonPoint[]>([]);
  const [lineData, setLineData] = useState<LineComparisonPoint[]>([]);
  const [lineSpeedTrendData, setLineSpeedTrendData] = useState<LineSpeedTrendPoint[]>([]);
  const [records, setRecords] = useState<ProductionRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [dataLoading, setDataLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(true);

  // Load Metadata once on startup
  useEffect(() => {
    async function loadMetadata() {
      try {
        const [l, p, s, m, health] = await Promise.all([
          api.getLines(),
          api.getProducts(),
          api.getShifts(),
          api.getLineProducts(),
          api.getHealth().catch(() => null),
        ]);
        setLines(l);
        setProducts(p);
        setShifts(s);
        setLineMappings(m);
        setIsBackendConnected(health?.status === 'ok');
      } catch (err) {
        console.error('Failed to load system metadata:', err);
        setIsBackendConnected(false);
      }
    }
    loadMetadata();
  }, []);

  // Fetch all analytics and records using real PostgreSQL queries
  const loadData = useCallback(async () => {
    setDataLoading(true);
    try {
      const queryParams = { ...filters, month: selectedMonth || undefined };
      const [kpiRes, dailyRes, lineProdRes, shiftRes, prodRes, lineRes, speedRes, recRes] =
        await Promise.all([
          api.getKPIs(queryParams),
          api.getDailyProduction(queryParams),
          api.getDailyByLineAndProduct(queryParams),
          api.getShiftComparison(queryParams),
          api.getProductComparison(queryParams),
          api.getLineComparison(queryParams),
          api.getLineSpeedTrends(queryParams),
          api.getRecords({ ...filters, page, limit: 15 }),
        ]);

      setKpis(kpiRes);
      setDailyData(dailyRes);
      setDailyLineProductData(lineProdRes);
      setShiftData(shiftRes);
      setProductData(prodRes);
      setLineData(lineRes);
      setLineSpeedTrendData(speedRes);
      setRecords(recRes.data);
      setTotalRecords(recRes.pagination.total);
      setTotalPages(recRes.pagination.totalPages);
      setIsBackendConnected(true);
    } catch (err) {
      console.error('Failed to load production data:', err);
      setIsBackendConnected(false);
    } finally {
      setDataLoading(false);
      setRefreshing(false);
    }
  }, [filters, selectedMonth, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleDeleteRecord = async (id: number) => {
    await api.deleteRecord(id);
    loadData();
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      
      {/* Top Header Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNewRecordModal={() => setIsModalOpen(true)}
        isBackendConnected={isBackendConnected}
      />

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5">
        
        {/* Global Toolbar: Month Picker & Status Pills */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-3">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Plant Status:</span>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
              4 Production Lines
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200 font-semibold">
              5 Products Configured
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200 font-semibold">
              Shift A, B, C Active
            </span>
          </div>

          <div className="flex items-center space-x-2.5">
            {/* Calendar Month Selector */}
            <div className="flex items-center space-x-1.5 bg-white px-2.5 py-1 rounded border border-slate-300 text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <label htmlFor="monthPicker" className="text-slate-500 text-[11px] font-medium">Month:</label>
              <input
                id="monthPicker"
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="text-xs text-slate-800 font-semibold focus:outline-none bg-transparent"
              />
            </div>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center space-x-1.5 px-3 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 hover:text-slate-900 shadow-sm transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-sky-600' : 'text-slate-500'}`} />
              <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* Global Key Performance Indicators */}
        <KpiCards stats={kpis} loading={dataLoading} />

        {/* Tab 1: Plant Overview Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="space-y-5">
            <DashboardCharts
              dailyData={dailyData}
              shiftData={shiftData}
              productData={productData}
              lineData={lineData}
              lineSpeedTrendData={lineSpeedTrendData}
              loading={dataLoading}
              selectedMonth={selectedMonth}
            />

            {/* Daily Line & Product Summary Table */}
            <DailyLineProductSummary
              data={dailyLineProductData}
              loading={dataLoading}
            />
          </div>
        )}

        {/* Tab 2: Production Records Table */}
        {activeTab === 'table' && (
          <div>
            <ProductionTable
              records={records}
              totalRecords={totalRecords}
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
              lines={lines}
              products={products}
              shifts={shifts}
              filters={filters}
              onFilterChange={(newFilters) => {
                setFilters(newFilters);
                setPage(1);
              }}
              onDeleteRecord={handleDeleteRecord}
              loading={dataLoading}
            />
          </div>
        )}

        {/* Tab 3: Operator Production Entry */}
        {activeTab === 'entry' && (
          <div>
            <DataEntryForm
              lines={lines}
              products={products}
              shifts={shifts}
              lineMappings={lineMappings}
              onSuccess={() => {
                loadData();
                setActiveTab('table');
              }}
            />
          </div>
        )}

      </main>

      {/* Quick Shift Entry Modal */}
      <DataEntryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        lines={lines}
        products={products}
        shifts={shifts}
        lineMappings={lineMappings}
        onSuccess={loadData}
      />

      {/* Enterprise Footer with Required Author Credit */}
      <footer className="border-t border-slate-200 bg-white py-4 text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            <span>Manufacturing Operations • PostgreSQL 18 Relational Platform</span>
          </div>
          <div className="text-slate-600 font-medium">
            Designed & Developed by Rohit Kumar
          </div>
        </div>
      </footer>

    </div>
  );
};
