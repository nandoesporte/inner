
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Layout from './components/Layout';
import KPICard from './components/KPICard';
import ReportsView from './components/ReportsView'; 
import UploadModal from './components/UploadModal';
import BatchSendModal from './components/BatchSendModal';
import CompaniesView from './components/CompaniesView'; 
import JobBenchmarksView from './components/JobBenchmarksView';
import SettingsView from './components/SettingsView'; 
import PredictiveAnalyticsView from './components/PredictiveAnalyticsView'; 
import RiskManagementView from './components/RiskManagementView'; 
import ReportFullPageView from './components/ReportFullPageView';
import CompareView from './components/CompareView';
import MultiCompareView from './components/MultiCompareView';
import SuccessionView from './components/SuccessionView';
import PerformanceIntegrationView from './components/PerformanceIntegrationView';
import AuthView from './components/AuthView';
import ResumeForm from './components/public/ResumeForm'; 
import PsychosocialSurveyForm from './components/public/PsychosocialSurveyForm';
import LinkErrorView from './components/public/LinkErrorView';
import LinkExpiredView from './components/public/LinkExpiredView';
import { Loader2, Brain, Activity, Users, RefreshCw } from 'lucide-react';
import { UserRole, CandidateReport, KPI, JobRole, TenantSettings, RadarDataPoint } from './types';
import { supabase } from './supabaseClient';
import { riskAnalysisService, getScoreFromMap, SYNONYM_MAP } from './services/riskAnalysisService';
import { INNERMETRIX_ATTRIBUTES } from './constants';

const INITIAL_KPIS: KPI[] = [
  { id: '1', label: 'Total de Avaliados', value: 0, trend: 0, trendLabel: 'vivos no banco', icon: 'users' },
  { id: '2', label: 'Relatórios Gerados', value: 0, trend: 0, trendLabel: 'processados via IA', icon: 'file' },
  { id: '3', label: 'Empresas Ativas', value: 0, trend: 0, trendLabel: 'gerenciadas', icon: 'building' },
  { id: '4', label: 'Média de Fit (ADV)', value: '0%', trend: 0, trendLabel: 'global', icon: 'activity' },
];

// Helper de Força Bruta para extrair tokens da URL (ignora formatação estrita)
const extractTokenFromUrl = (key: string): string | null => {
    if (typeof window === 'undefined') return null;
    
    // 1. Tenta URLSearchParams padrão (Mais robusto)
    const urlParams = new URLSearchParams(window.location.search);
    const paramValue = urlParams.get(key);
    if (paramValue) return paramValue;

    // 2. Fallback: Regex na string completa (Útil se houver hash router ou URLs malformadas)
    const href = window.location.href;
    const regex = new RegExp(`[?&]${key}=([^&#]*)`);
    const match = href.match(regex);
    if (match && match[1]) {
        return decodeURIComponent(match[1]);
    }
    return null;
};

const App: React.FC = () => {
  // Inicialização síncrona do modo público baseada na URL atual e Paths
  const [publicMode, setPublicMode] = useState<{ type: 'survey' | 'resume' | 'report' | 'error' | 'expired', id: string } | null>(() => {
      // 1. Rota por Caminho (Path-based Routing) - Prioritária
      const path = window.location.pathname;
      
      // Rotas de Erro Explícitas
      if (path === '/erro-link') return { type: 'error', id: '' };
      if (path === '/link-expirado') return { type: 'expired', id: '' };

      // Verifica rota /questionario/:id
      const questionarioMatch = path.match(/^\/questionario\/([^/]+)/);
      if (questionarioMatch && questionarioMatch[1]) {
          return { type: 'survey', id: questionarioMatch[1] };
      }
      
      // Se acessou /questionario mas sem ID, cai no erro
      if (path.startsWith('/questionario')) {
          return { type: 'error', id: '' };
      }

      // 2. Rota por Query Params (Prioridade Secundária, mas mandatória para links antigos/email)
      const surveyToken = extractTokenFromUrl('survey_token');
      if (surveyToken) return { type: 'survey', id: surveyToken };

      const resumeToken = extractTokenFromUrl('resume_token');
      if (resumeToken) return { type: 'resume', id: resumeToken };

      const view = extractTokenFromUrl('view');
      const id = extractTokenFromUrl('id');
      if (view === 'report' && id) return { type: 'report', id };

      return null;
  });

  const [session, setSession] = useState<any | null>(null);
  // Se estiver em modo público, loading é false imediatamente para evitar flash de loading
  const [loading, setLoading] = useState(!publicMode);
  
  const [activePage, setActivePage] = useState('dashboard');
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>('COMPANY_ADMIN'); 
  
  const [tenantSettings, setTenantSettings] = useState<TenantSettings>({
      logo_url: 'https://nxccuamwkcqcpghlvirj.supabase.co/storage/v1/object/public/reports/pessoacerta.png',
      login_title: 'Bem-vindo de volta!',
      login_subtitle: 'Acesso Administrativo Pessoa Certa.',
      login_cover_title: 'PessoaCerta Analytics',
      login_cover_subtitle: 'Decisões humanas fundamentadas em ciência comportamental validada, colocando a pessoa certa no lugar certo.'
  });

  const [tenantId, setTenantId] = useState<string | undefined>(undefined);
  const [reports, setReports] = useState<CandidateReport[]>([]);
  const [roles, setRoles] = useState<JobRole[]>([]);
  const [kpis, setKpis] = useState<KPI[]>(INITIAL_KPIS);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [autoOpenReportId, setAutoOpenReportId] = useState<string | undefined>(undefined);

  const [selectedCompareRoleId, setSelectedCompareRoleId] = useState('');
  const [selectedCompareCandidateId, setSelectedCompareCandidateId] = useState('');

  // 1. Auth and Initial Profile Fetch
  useEffect(() => {
    // Se for rota pública, ABORTA qualquer lógica de autenticação.
    if (publicMode) {
        return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchUserProfile(session.user.id);
      else setLoading(false);
    });
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchUserProfile(session.user.id);
      else setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, [publicMode]); 

  // 2. Realtime Subscription for Automatic Updates
  useEffect(() => {
    if (!tenantId) return;

    const changesChannel = supabase
        .channel('dashboard-realtime')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'reports', filter: `tenant_id=eq.${tenantId}` },
            (payload) => {
                console.log('Realtime Update (NR1):', payload);
                fetchDashboardData(tenantId);
            }
        )
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'reports_adv', filter: `tenant_id=eq.${tenantId}` },
            (payload) => {
                console.log('Realtime Update (ADV):', payload);
                fetchDashboardData(tenantId);
            }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(changesChannel);
    };
  }, [tenantId]);

  // 3. Polling Fallback (15s) - Garante atualização mesmo se Realtime falhar
  useEffect(() => {
      if (!tenantId) return;
      const interval = setInterval(() => {
          fetchDashboardData(tenantId, true); // true = silent update
      }, 15000);
      return () => clearInterval(interval);
  }, [tenantId]);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase.from('profiles').select('role, tenant_id').eq('id', userId).single();
      if (error) throw error;
      if (profile) {
        setUserRole(profile.role as UserRole);
        setTenantId(profile.tenant_id);
        fetchDashboardData(profile.tenant_id);
        fetchRoles(profile.tenant_id);
      }
    } catch (e) {
      console.error("Erro ao carregar perfil:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async (tid: string) => {
      const { data } = await supabase.from('job_roles').select('*').eq('tenant_id', tid).eq('active', true);
      if (data) setRoles(data);
  };

  // useCallback to ensure stable reference for Realtime calls
  const fetchDashboardData = useCallback(async (tid: string, silent = false) => {
    if (!tid) return;
    
    // Se não for silent (polling), mostra loading
    if (!silent) setIsDataLoading(true);

    try {
        // 1. Busca dados auxiliares para mapeamento manual (resiliência contra falha de JOINs)
        const safeAuxFetch = async (query: any) => {
            try {
                const { data, error } = await query;
                if (error) return [];
                return data || [];
            } catch (e) {
                // Silently ignore aux fetch errors to keep dashboard working
                return [];
            }
        };

        const [companiesList, rolesList, resumesList] = await Promise.all([
            safeAuxFetch(supabase.from('companies').select('id, name').eq('tenant_id', tid)),
            safeAuxFetch(supabase.from('job_roles').select('id, title, benchmarks').eq('tenant_id', tid)),
            safeAuxFetch(supabase.from('candidate_resumes').select('invite_id, email').eq('tenant_id', tid))
        ]);

        const compMap = new Map(companiesList.map((c: any) => [c.id, c.name]));
        const roleMap = new Map(rolesList.map((r: any) => [r.id, r]));
        const resumeInviteIds = new Set(resumesList.map((res: any) => res.invite_id).filter((id: any) => id));
        const resumeEmails = new Set(resumesList.map((res: any) => res.email?.toLowerCase().trim()).filter((e: any) => e));

        // 2. Helper Resiliente para buscar tabelas principais
        const fetchTableSafely = async (table: string) => {
            try {
                // TENTATIVA A: Query Completa (Ideal)
                let { data, error } = await supabase
                    .from(table)
                    .select(`
                        *,
                        job_roles:job_role_id (title, benchmarks),
                        companies:company_id (name),
                        invites:invite_id (id, candidate_email, resume_sent, resume_completed)
                    `)
                    .eq('tenant_id', tid)
                    .order('created_at', { ascending: false });
                
                if (error) {
                    // TENTATIVA B: Query Simples (Fallback - Sem Joins)
                    const simple = await supabase
                        .from(table)
                        .select('*')
                        .eq('tenant_id', tid)
                        .order('created_at', { ascending: false });
                    
                    if (simple.error) {
                        console.warn(`Tabela ${table} não acessível (pode não existir):`, simple.error.message);
                        return [];
                    }
                    data = simple.data;
                }
                return data || [];
            } catch (err) {
                console.warn(`Erro de rede/cliente ao buscar ${table}:`, err);
                return [];
            }
        };

        const [legacyReports, advReports] = await Promise.all([
            fetchTableSafely('reports'),
            fetchTableSafely('reports_adv')
        ]);

        // 3. Função de Mapeamento (Normalização + Fallback de Nomes)
        const mapReport = (r: any, isAdvTable: boolean): CandidateReport => {
            // Helper para Parsing Seguro de JSON
            const parse = (val: any) => {
                if (typeof val === 'string') {
                    try { return JSON.parse(val); } catch { return null; }
                }
                return val;
            };

            const roleObj = r.job_roles || (r.job_role_id ? roleMap.get(r.job_role_id) : null);
            const compName = r.companies?.name || (r.company_id ? compMap.get(r.company_id) : null) || 'Interno';
            
            const jobTitle = roleObj?.title || r.metadata?.analysis?.cargo || r.metadata?.cargo || r.metadata?.job_title || r.role || 'Geral';
            
            const candidateName = r.full_name || r.candidate_name || r.name || r.metadata?.full_name || r.metadata?.name || r.metadata?.person?.name || r.email?.split('@')[0] || 'Candidato';
            const candidateEmail = (r.email || r.invites?.candidate_email || r.candidate_email || r.metadata?.email || r.metadata?.person?.email || '').toLowerCase().trim();
            
            // --- LÓGICA ROBUSTA DE EXTRAÇÃO DE SCORES ---
            let rawScores = parse(r.scores);

            // Se scores estiver vazio, tenta outras fontes em ordem de prioridade
            if (!rawScores || (typeof rawScores === 'object' && Object.keys(rawScores).length === 0)) {
                
                // 1. Dimensional Balance (Comum em ADV)
                const db = parse(r.dimensional_balance || r.metadata?.dimensional_balance || r.metadata?.analysis?.dimensional_balance);
                if (db && Object.keys(db).length > 0) {
                    rawScores = db;
                } 
                // 2. Competencies (Comum em Legacy)
                else {
                    const comp = parse(r.competencies || r.metadata?.competencies);
                    if (comp && Object.keys(comp).length > 0) {
                        rawScores = comp;
                    }
                    // 3. Survey Answers (PSA / NR1 - Importante para o problema relatado)
                    else {
                        const answers = parse(r.metadata?.answers || r.answers);
                        if (answers && Object.keys(answers).length > 0) {
                            rawScores = answers;
                        }
                        // 4. Fallback final para metadados genéricos
                        else {
                            const metaScores = parse(r.metadata?.scores);
                            if (metaScores && Object.keys(metaScores).length > 0) {
                                rawScores = metaScores;
                            }
                        }
                    }
                }
            }
            if (!rawScores) rawScores = {};

            const candidateScore = typeof r.fit_score === 'number' ? r.fit_score : (r.score || 0);
            const hasResumeRecord = (r.invite_id && resumeInviteIds.has(r.invite_id)) || (candidateEmail && resumeEmails.has(candidateEmail));

            const attrIndex = r.attribute_index || r.metadata?.attribute_index || r.metadata?.analysis?.attribute_index || [];
            const mainList = r.main_attributes_list || r.metadata?.main_attributes_list || r.metadata?.analysis?.main_attributes_list || [];

            // --- CORREÇÃO DE CLASSIFICAÇÃO DE TIPO (ADV vs NR1) ---
            // Não confie apenas na tabela. O relatório NR1 pode estar na tabela 'reports' mas não deve ser 'legacy' mascarado.
            let calculatedDomain = r.domain;
            let calculatedType = r.report_type;

            // Se o banco não tem a info, inferir pelo conteúdo
            if (!calculatedType) {
                if (isAdvTable) {
                    calculatedDomain = 'psychometric';
                    calculatedType = 'adv';
                } else {
                    // Verificação Heurística para tabela 'reports' (Legacy Mixed)
                    const hasDisc = r.disc || r.metadata?.disc || r.metadata?.disc_profile;
                    const hasValues = r.values_index || r.metadata?.values_index;
                    const hasAttributeIndex = r.attribute_index || r.metadata?.attribute_index;
                    
                    if (hasDisc || hasValues || (hasAttributeIndex && hasAttributeIndex.length > 20)) {
                        calculatedDomain = 'psychometric';
                        calculatedType = 'adv';
                    } else {
                        // Se não tem DISC/Values, assume NR1/PSA/Legacy simplificado
                        calculatedDomain = 'nr1';
                        calculatedType = 'nr1'; 
                    }
                }
            }

            return {
                ...r,
                name: candidateName,
                email: candidateEmail,
                role: jobTitle,
                score: candidateScore,
                scores: rawScores,
                attribute_index: attrIndex,
                main_attributes_list: mainList,
                company_name: compName,
                date: r.created_at || new Date().toISOString(),
                resume_sent: r.invites?.resume_sent || r.resume_sent || false,
                resume_completed: hasResumeRecord,
                
                // Tipagem Calculada Corretamente
                domain: calculatedDomain,
                report_type: calculatedType,
                
                // Default status to completed for legacy reports to ensure visibility
                status: r.status || 'completed' 
            };
        };

        const mappedLegacy = legacyReports.map((r: any) => mapReport(r, false));
        const mappedAdv = advReports.map((r: any) => mapReport(r, true));

        // Unificar listas
        const combinedReports = [...mappedAdv, ...mappedLegacy];
        
        // Ordenar por data (Safe Sort)
        combinedReports.sort((a, b) => {
            const dateA = new Date(a.created_at || a.date || 0).getTime();
            const dateB = new Date(b.created_at || b.date || 0).getTime();
            return (isNaN(dateB) ? 0 : dateB) - (isNaN(dateA) ? 0 : dateA);
        });

        setReports(combinedReports);
        
        const total = combinedReports.length;
        const completedReports = combinedReports.filter(r => r.status === 'completed');
        
        // CÁLCULO DE FIT: Considera apenas relatórios ADV/Psicométricos para não distorcer a média com NR1
        const scorableReports = combinedReports.filter(r => r.status === 'completed' && (r.domain === 'psychometric' || r.report_type === 'adv') && (r.score > 0 || r.fit_score > 0));
        const avgFit = scorableReports.length > 0 
            ? Math.round(scorableReports.reduce((acc, c) => acc + (c.score || 0), 0) / scorableReports.length) 
            : 0;
        
        const uniqueCompanies = new Set(combinedReports.map(r => r.company_id).filter(id => id)).size;

        setKpis([
            { ...INITIAL_KPIS[0], value: total.toLocaleString() },
            { ...INITIAL_KPIS[1], value: completedReports.length.toLocaleString() },
            { ...INITIAL_KPIS[2], value: uniqueCompanies.toLocaleString() },
            { ...INITIAL_KPIS[3], value: `${avgFit}%` }
        ]);

    } catch (error: any) {
        console.error('Erro geral no Dashboard:', error);
    } finally {
        if (!silent) setIsDataLoading(false);
    }
  }, []); // Dependências vazias, pois tid é passado como argumento

  // Segregação de Relatórios para uso nas Views
  const advReports = useMemo(() => {
      return reports.filter(r => r.domain === 'psychometric' || r.report_type === 'adv');
  }, [reports]);

  // UseMemo seguro para NR1 Reports
  const nr1Reports = useMemo(() => {
      // Pega qualquer coisa que NÃO seja explicitamente ADV
      return reports.filter(r => r.domain !== 'psychometric' && r.report_type !== 'adv');
  }, [reports]);

  const compareData = useMemo(() => {
      // Use advReports for comparison to ensure data integrity
      const cand = advReports.find(r => r.id === selectedCompareCandidateId);
      const role = roles.find(r => r.id === selectedCompareRoleId);
      if (!cand || !role) return { radar: [], risk: null };
      const attributes = INNERMETRIX_ATTRIBUTES;
      const radar = attributes.map(attr => {
          const candScore = getScoreFromMap(attr, cand.scores);
          const benchScore = getScoreFromMap(attr, role.benchmarks);
          return {
              attribute: attr,
              candidate: candScore !== undefined ? candScore : 0,
              benchmark: benchScore ?? 5.0, 
              fullMark: 10
          };
      });
      const risk = riskAnalysisService.calculateScientificRisk(cand.scores || {}, role.benchmarks || {}, cand.score);
      return { radar, risk };
  }, [selectedCompareCandidateId, selectedCompareRoleId, advReports, roles]);

  const handleLogout = async () => { await supabase.auth.signOut(); };
  const handleRefresh = () => { if (tenantId) { fetchDashboardData(tenantId); fetchRoles(tenantId); } };

  const openReportDetail = (reportId: string) => {
      setAutoOpenReportId(reportId);
      setActivePage('reports');
  };

  // --- RENDERIZAÇÃO DE ROTAS PÚBLICAS (PRIORIDADE MÁXIMA) ---
  if (publicMode?.type === 'error') return <LinkErrorView />;
  if (publicMode?.type === 'expired') return <LinkExpiredView />;
  if (publicMode?.type === 'survey') return <PsychosocialSurveyForm token={publicMode.id} />;
  if (publicMode?.type === 'resume') return <ResumeForm token={publicMode.id} />;
  if (publicMode?.type === 'report') return <ReportFullPageView reportId={publicMode.id} />;

  // RENDERIZAÇÃO DE ROTAS PROTEGIDAS
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="w-10 h-10 text-brand-blue animate-spin" /></div>;
  if (!session) return <AuthView onLoginSuccess={() => setLoading(true)} settings={tenantSettings} />;
  
  return (
    <Layout activePage={activePage} onNavigate={setActivePage} userRole={userRole} onLogout={handleLogout} logoUrl={tenantSettings.logo_url} onNewReport={() => setIsBatchModalOpen(true)}>
      {activePage === 'dashboard' && (
          <DashboardView 
            kpis={kpis} 
            reports={reports} // CHANGE: Show ALL reports in Dashboard to ensure visibility
            onNewInviteClick={() => setIsBatchModalOpen(true)} 
            isLoading={isDataLoading} 
            onNavigateToPredictive={() => setActivePage('predictive')} 
            onNavigateToRisk={() => setActivePage('risk-management')}
            onOpenReport={openReportDetail}
            onRefresh={handleRefresh}
          />
      )}
      {activePage === 'reports' && (
        <ReportsView 
            reports={reports} // CHANGE: Show ALL reports in List View (filtering happens inside)
            isLoading={isDataLoading} 
            onNewInviteClick={() => setIsBatchModalOpen(true)} 
            onRefresh={handleRefresh} 
            tenantId={tenantId}
            initialReportId={autoOpenReportId}
        />
      )}
      {activePage === 'companies' && <CompaniesView tenantId={tenantId} onRefreshData={handleRefresh} />}
      {activePage === 'jobs' && <JobBenchmarksView tenantId={tenantId} onRefreshData={handleRefresh} />}
      
      {activePage === 'compare' && (
          <CompareView 
            roles={roles} 
            reports={advReports} // Compare ONLY supports ADV (Metrics)
            selectedRoleId={selectedCompareRoleId}
            onRoleChange={setSelectedCompareRoleId}
            candidateA={selectedCompareCandidateId}
            onCandidateAChange={setSelectedCompareCandidateId}
            radarData={compareData.radar}
            riskData={compareData.risk}
          />
      )}

      {activePage === 'multi-compare' && <MultiCompareView roles={roles} reports={advReports} tenantId={tenantId} />} {/* ONLY ADV */}
      {activePage === 'succession' && <SuccessionView roles={roles} reports={advReports} />} {/* ONLY ADV */}
      {activePage === 'performance' && <PerformanceIntegrationView reports={advReports} tenantId={tenantId} />} {/* ONLY ADV */}
      
      {activePage === 'predictive' && <PredictiveAnalyticsView tenantId={tenantId} />}
      
      {/* Risk Management supports BOTH ADV (via Dimensional Balance) and NR1/PSA */}
      {activePage === 'risk-management' && <RiskManagementView reports={reports} tenantId={tenantId} />} 
      {activePage === 'settings' && <SettingsView session={session} userRole={userRole} tenantId={tenantId} />}
      
      <BatchSendModal isOpen={isBatchModalOpen} onClose={() => setIsBatchModalOpen(false)} tenantId={tenantId} onSuccess={handleRefresh} />
    </Layout>
  );
};

const DashboardView: React.FC<{
    kpis: KPI[],
    reports: CandidateReport[],
    onNewInviteClick: () => void,
    isLoading: boolean,
    onNavigateToPredictive: () => void,
    onNavigateToRisk: () => void,
    onOpenReport: (id: string) => void,
    onRefresh: () => void
}> = ({ kpis, reports, onNewInviteClick, isLoading, onNavigateToPredictive, onNavigateToRisk, onOpenReport, onRefresh }) => {
    return (
        <div className="space-y-8 animate-fadeIn">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-neutral-800 tracking-tight">Visão Geral de Inteligência</h2>
                    <p className="text-neutral-500 text-sm font-medium">Dados sincronizados em tempo real com o banco de talentos.</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={onRefresh} className="p-2.5 text-neutral-400 hover:text-brand-blue bg-white border border-neutral-200 rounded-xl hover:shadow-md transition-all" title="Atualizar Dados">
                        <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                    <button onClick={onNewInviteClick} className="flex items-center gap-2 bg-brand-blue text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-brand-blue/20 transition-all text-sm transform hover:scale-105 active:scale-95">
                        <Users className="w-4 h-4" /> Novo Relatório
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {kpis.map(kpi => <KPICard key={kpi.id} kpi={kpi} />)}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-7 bg-white p-8 rounded-3xl shadow-sm border border-neutral-100 flex flex-col justify-between">
                    <div>
                        <h3 className="font-black text-xs text-neutral-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <Brain className="w-5 h-5 text-brand-blue" /> Módulos Analíticos Ativos
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button onClick={onNavigateToPredictive} className="p-6 bg-brand-lightBlue/30 rounded-2xl border border-brand-blue/10 hover:border-brand-blue/30 transition-all text-left group">
                                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform">
                                    <Brain className="w-6 h-6 text-brand-blue" />
                                </div>
                                <h4 className="font-bold text-neutral-800">Analytics Preditivo</h4>
                                <p className="text-xs text-neutral-500 mt-2 leading-relaxed">Cruzamento real de performance e fit cultural dos colaboradores.</p>
                            </button>
                            <button onClick={onNavigateToRisk} className="p-6 bg-red-50/50 rounded-2xl border border-red-100 hover:border-red-200 transition-all text-left group">
                                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform">
                                    <Activity className="w-6 h-6 text-red-600" />
                                </div>
                                <h4 className="font-bold text-neutral-800">Gestão de Riscos</h4>
                                <p className="text-xs text-neutral-500 mt-2 leading-relaxed">Identificação de fatores psicossociais e conformidade NR-1.</p>
                            </button>
                        </div>
                    </div>
                    <div className="mt-8 pt-6 border-t border-neutral-50 flex items-center gap-2 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> Sistema Operacional e Seguro
                    </div>
                </div>

                <div className="lg:col-span-5 bg-white p-8 rounded-3xl shadow-sm border border-neutral-100 flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-black text-xs text-neutral-400 uppercase tracking-widest">Últimos Relatórios</h3>
                        <span className="text-[10px] font-bold bg-neutral-100 px-2 py-1 rounded text-neutral-500">{reports.length}</span>
                    </div>
                    <div className="space-y-4 flex-1">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-20 opacity-50">
                                <Loader2 className="w-8 h-8 text-brand-blue animate-spin mb-4" />
                                <span className="text-xs font-bold uppercase">Buscando registros...</span>
                            </div>
                        ) : reports.length > 0 ? (
                            reports.slice(0, 6).map(report => (
                                <div key={report.id} onClick={() => onOpenReport(report.id)} className="flex items-center justify-between p-3.5 bg-neutral-50/50 hover:bg-neutral-50 rounded-2xl border border-transparent hover:border-neutral-100 transition-all cursor-pointer">
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black border shrink-0 shadow-sm ${report.report_type === 'adv' ? 'bg-brand-blue text-white border-brand-blue' : 'bg-neutral-100 text-neutral-500 border-neutral-200'}`}>
                                            {(report.name || 'C').substring(0, 2).toUpperCase()}
                                        </div>
                                        <div className="truncate">
                                            <p className="text-sm font-bold text-neutral-800 truncate">{report.name}</p>
                                            <div className="flex items-center gap-2">
                                                <p className="text-xs text-neutral-400 font-bold uppercase truncate tracking-tight">{report.role}</p>
                                                <span className={`text-[9px] px-1.5 py-0.5 rounded border uppercase ${report.report_type === 'adv' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-gray-50 text-gray-500 border-gray-100'}`}>
                                                    {report.report_type === 'adv' ? 'ADV' : 'NR1'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className={`text-sm font-black shrink-0 ml-4 px-3 py-1 rounded-lg ${report.score >= 70 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                        {report.score || 0}%
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-neutral-300">
                                <Users className="w-12 h-12 opacity-10 mb-4" />
                                <p className="text-xs font-bold uppercase">Nenhum dado encontrado</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default App;
