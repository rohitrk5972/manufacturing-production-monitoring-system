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
  ShiftComparisonPoint,
  ProductComparisonPoint,
  LineComparisonPoint,
} from './types';
import { Navbar } from './components/Navbar';
import { KpiCards } from './components/KpiCards';
import { DashboardCharts } from './components/DashboardCharts';
import { ProductionTable } from './components/ProductionTable';
import { DataEntryForm } from './components/DataEntryForm';
import { DataEntryModal } from './components/DataEntryModal';
import { RefreshCw, Database } from 'lucide-react';

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
  const [shiftData, setShiftData] = useState<ShiftComparisonPoint[]>([]);
  const [productData, setProductData] = useState<ProductComparisonPoint[]>([]);
  const [lineData, setLineData] = useState<LineComparisonPoint[]>([]);
  const [records, setRecords] = useState<ProductionRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [dataLoading, setDataLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Load Metadata once on startup
  useEffect(() => {
    async function loadMetadata() {
      try {
        const [l, p, s, m] = await Promise.all([
          api.getLines(),
          api.getProducts(),
          api.getShifts(),
          api.getLineProducts(),
        ]);
        setLines(l);
        setProducts(p);
        setShifts(s);
        setLineMappings(m);
      } catch (err) {
        console.error('Failed to load system metadata:', err);
      }
    }
    loadMetadata();
  }, []);

  // Fetch all analytics and records
  const loadData = useCallback(async () => {
    setDataLoading(true);
    try {
      const [kpiRes, dailyRes, shiftRes, prodRes, lineRes, recRes] = await Promise.all([
        api.getKPIs(filters),
        api.getDailyProduction(filters),
        api.getShiftComparison(filters),
        api.getProductComparison(filters),
        api.getLineComparison(filters),
        api.getRecords({ ...filters, page, limit: 15 }),
      ]);

      setKpis(kpiRes);
      setDailyData(dailyRes);
      setShiftData(shiftRes);
      setProductData(prodRes);
      setLineData(lineRes);
      setRecords(recRes.data);
      setTotalRecords(recRes.pagination.total);
      setTotalPages(recRes.pagination.totalPages);
    } catch (err) {
      console.error('Failed to load production data:', err);
    } finally {
      setDataLoading(false);
      setRefreshing(false);
    }
  }, [filters, page]);

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
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      
      {/* Top Header Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNewRecordModal={() => setIsModalOpen(true)}
      />

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Global Toolbar: Filter Badge & Refresh Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-800 gap-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-semibold text-slate-300">Plant Status:</span>
            <span className="text-xs px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
              4 Lines Active
            </span>
            <span className="text-xs px-2.5 py-1 rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/20 font-medium">
              5 SKUs Configured
            </span>
            <span className="text-xs px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 font-medium">
              3 Shifts Operating
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-700 rounded-lg hover:bg-slate-800 hover:text-white transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-sky-400' : ''}`} />
              <span>{refreshing ? 'Refreshing...' : 'Refresh Queries'}</span>
            </button>
          </div>
        </div>

        {/* Global Key Performance Indicators */}
        <KpiCards stats={kpis} loading={dataLoading} />

        {/* Tab Views */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <DashboardCharts
              dailyData={dailyData}
              shiftData={shiftData}
              productData={productData}
              lineData={lineData}
              loading={dataLoading}
            />
          </div>
        )}

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

      {/* Quick Entry Modal */}
      <DataEntryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        lines={lines}
        products={products}
        shifts={shifts}
        lineMappings={lineMappings}
        onSuccess={loadData}
      />

      {/* Clean Industrial Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-xs text-slate-500 text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <Database className="w-3.5 h-3.5 text-emerald-500" />
            <span>PostgreSQL 18.6 Engine • ACID Compliant Relational Constraints</span>
          </div>
          <div>Manufacturing Execution System (MES) • Technical Assignment</div>
        </div>
      </footer>

    </div>
  );
};
