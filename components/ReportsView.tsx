
import React, { useState, useMemo, useEffect } from 'react';
import { CandidateReport, PendingReport, Company, JobRole } from '../types';
import ReportsTable from './ReportsTable';
import ReportFullPageView from './ReportFullPageView';
import { Search, Filter, Users, X, BarChart3, TrendingUp, Zap, Loader2, RefreshCw, BrainCircuit, ShieldCheck, ListFilter } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface ReportsViewProps {
  reports: CandidateReport[];
  onNewInviteClick: () => void;
  isLoading: boolean;
  onRefresh?: () => void;
  tenantId?: string;
  initialReportId?: string;
}

const ReportsView: React.FC<ReportsViewProps> = ({ reports, onNewInviteClick, isLoading, onRefresh, tenantId, initialReportId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCompanyId, setFilterCompanyId] = useState('');
  const [filterRoleId, setFilterRoleId] = useState('');
  
  // State for view navigation (List vs Detail)
  const [selectedReportId, setSelectedReportId] = useState<string | null>(initialReportId || null);
  
  // State for Report Type Tab (ADV vs NR1)
  const [activeTab, setActiveTab] = useState<'ADV' | 'NR1'>('ADV');

  const [companies, setCompanies] = useState<Company[]>([]);
  const [roles, setRoles] = useState<JobRole[]>([]);
  
  useEffect(() => {
    if (onRefresh) onRefresh();
  }, []);

  useEffect(() => {
    if (tenantId) {
       supabase.from('companies').select('id, name').eq('tenant_id', tenantId).order('name')
       .then(({data}) => { if (data) setCompanies(data); });
    }
  }, [tenantId]);

  useEffect(() => {
    if (filterCompanyId) {
       supabase.from('job_roles').select('id, title').eq('company_id', filterCompanyId).order('title')
       .then(({data}) => { if (data) setRoles(data); });
    } else {
       setRoles([]);
    }
    setFilterRoleId('');
  }, [filterCompanyId]);

  // Sync initialReportId prop to local state
  useEffect(() => {
    if (initialReportId) {
        setSelectedReportId(initialReportId);
    }
  }, [initialReportId]);

  // Lógica de Filtragem Baseada na Aba Ativa
  const displayedReports = useMemo(() => {
    return reports.filter(r => {
        // Filtro de Tab (Tipo)
        const isAdv = r.report_type === 'adv' || r.domain === 'psychometric';
        if (activeTab === 'ADV' && !isAdv) return false;
        if (activeTab === 'NR1' && isAdv) return false; // NR1 pega 'legacy', 'nr1', etc.

        // Filtro de Status
        if (r.status !== 'completed') return false;

        // Filtros de UI
        const matchesSearch = (r.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                              (r.email || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCompany = !filterCompanyId || r.company_id === filterCompanyId;
        const matchesRole = !filterRoleId || (r.role_id === filterRoleId || r.job_id === filterRoleId);
        
        return matchesSearch && matchesCompany && matchesRole;
    });
  }, [reports, activeTab, searchTerm, filterCompanyId, filterRoleId]);

  const summaryMetrics = useMemo(() => {
      const total = displayedReports.length;
      const avg = total > 0 ? Math.round(displayedReports.reduce((a, b) => a + (b.score || 0), 0) / total) : 0;
      // Para NR1, fit > 85 pode não ser a métrica ideal, mas mantemos para consistência visual
      const high = displayedReports.filter(s => (s.score || 0) >= 85).length;
      return { total, avg, high };
  }, [displayedReports]);

  // --- RENDER DETAIL VIEW IF SELECTED ---
  if (selectedReportId) {
      return (
          <ReportFullPageView 
              reportId={selectedReportId} 
              onBack={() => setSelectedReportId(null)} 
          />
      );
  }

  // --- RENDER LIST VIEW ---
  return (
    <div className="space-y-8 pb-12 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h2 className="text-2xl font-bold text-neutral-800 tracking-tight flex items-center gap-2">
             <ListFilter className="w-6 h-6 text-brand-blue" /> Banco de Relatórios
           </h2>
           <p className="text-neutral-500 text-sm font-medium">Gerencie e acesse os resultados processados.</p>
        </div>
        <div className="flex gap-3">
            <button onClick={() => onRefresh?.()} className="p-2.5 text-neutral-400 hover:text-brand-blue bg-white border border-neutral-200 rounded-xl hover:shadow-md transition-all">
                <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onNewInviteClick} className="flex items-center gap-2 bg-brand-blue hover:bg-brand-dark text-white px-5 py-2.5 rounded-xl shadow-lg shadow-brand-blue/20 font-bold transition-all text-sm transform hover:-translate-y-0.5">
                <Users className="w-4 h-4" /> Novo Processo
            </button>
        </div>
      </div>

      {/* ABAS DE NAVEGAÇÃO (TIPO DE RELATÓRIO) */}
      <div className="flex border-b border-neutral-200">
          <button 
            onClick={() => setActiveTab('ADV')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'ADV' ? 'border-brand-blue text-brand-blue bg-brand-lightBlue/10' : 'border-transparent text-neutral-400 hover:text-neutral-600'}`}
          >
              <BrainCircuit className="w-4 h-4" /> Relatórios ADV (Liderança)
          </button>
          <button 
            onClick={() => setActiveTab('NR1')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'NR1' ? 'border-brand-blue text-brand-blue bg-brand-lightBlue/10' : 'border-transparent text-neutral-400 hover:text-neutral-600'}`}
          >
              <ShieldCheck className="w-4 h-4" /> Relatórios NR-1 (Risco/Recrutamento)
          </button>
      </div>

      {/* KPI Cards (Dinâmicos baseados na aba) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-50 text-brand-blue rounded-xl flex items-center justify-center shadow-inner"><BarChart3 className="w-6 h-6" /></div>
              <div><p className="text-[10px] text-neutral-400 uppercase font-black tracking-widest">Total {activeTab}</p><p className="text-2xl font-black text-neutral-800">{summaryMetrics.total}</p></div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shadow-inner"><TrendingUp className="w-6 h-6" /></div>
              <div><p className="text-[10px] text-neutral-400 uppercase font-black tracking-widest">Score Médio</p><p className="text-2xl font-black text-neutral-800">{summaryMetrics.avg}%</p></div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center shadow-inner"><Zap className="w-6 h-6" /></div>
              <div><p className="text-[10px] text-neutral-400 uppercase font-black tracking-widest">Alta Aderência</p><p className="text-2xl font-black text-neutral-800">{summaryMetrics.high}</p></div>
          </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-neutral-100 overflow-hidden min-h-[500px]">
          {/* Filters Bar */}
          <div className="px-8 py-6 bg-neutral-50/30 border-b border-neutral-100 flex flex-wrap items-center gap-4 justify-between">
             <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 w-4 h-4" />
                  <input type="text" placeholder="Filtrar por nome..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-11 pr-4 py-2.5 bg-white border border-neutral-200 rounded-xl text-sm font-medium focus:ring-4 focus:ring-brand-blue/5 focus:border-brand-blue outline-none transition-all" />
             </div>
             
             <div className="flex items-center gap-3">
                <Filter className="w-4 h-4 text-neutral-400" />
                <select value={filterCompanyId} onChange={(e) => setFilterCompanyId(e.target.value)} className="bg-white border border-neutral-200 text-xs font-bold uppercase tracking-wider rounded-lg px-3 py-2 outline-none hover:border-brand-blue transition-colors">
                    <option value="">Todas Empresas</option>
                    {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select value={filterRoleId} onChange={(e) => setFilterRoleId(e.target.value)} disabled={!filterCompanyId} className="bg-white border border-neutral-200 text-xs font-bold uppercase tracking-wider rounded-lg px-3 py-2 outline-none hover:border-brand-blue transition-colors disabled:opacity-50">
                    <option value="">Todos Cargos</option>
                    {roles.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
                </select>
                {(filterCompanyId || filterRoleId || searchTerm) && (
                    <button onClick={() => { setFilterCompanyId(''); setFilterRoleId(''); setSearchTerm(''); }} className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:underline ml-2 flex items-center gap-1"><X className="w-3 h-3" /> Limpar</button>
                )}
             </div>
          </div>

          <div className="relative">
             {isLoading ? (
                <div className="flex flex-col items-center justify-center py-32 opacity-40">
                    <Loader2 className="w-12 h-12 text-brand-blue animate-spin mb-4" />
                    <span className="text-sm font-black uppercase tracking-widest">Carregando Dados...</span>
                </div>
             ) : (
                <ReportsTable 
                    reports={displayedReports} 
                    tenantId={tenantId}
                    onRefresh={onRefresh}
                    onViewReport={(report) => {
                        // Switch to Full Page View via state
                        setSelectedReportId(report.id);
                    }}
                />
             )}
          </div>
      </div>
    </div>
  );
};

export default ReportsView;
