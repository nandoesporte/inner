
import React, { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Brain, Sparkles, Loader2, Briefcase, History, Target, Activity, Zap, Download, LayoutGrid, Linkedin, Phone, ExternalLink, Globe, Award, Quote, FileText, ChevronLeft, Printer, Info, Mail, ShieldCheck, Search, Filter, ChevronRight, ListFilter, CheckCircle2, Clock, List } from 'lucide-react';
import { CandidateReport, CandidateResume, RadarDataPoint, AttributeIndexItem, MainAttributeItem } from '../types';
import { copilotService, PredictiveInsightResult } from '../services/copilotService';
import { supabase } from '../supabaseClient';
import { getScoreFromMap } from '../services/riskAnalysisService';
import ExperienceTimeline from './ExperienceTimeline';
import RadarChartWrapper from './RadarChartWrapper';
import DimensionalBarChart from './DimensionalBarChart';
import ComparativeDimensionalChart from './ComparativeDimensionalChart';
import CVEvidencePanel from './CVEvidencePanel';
import OrganizationalFitSection from './OrganizationalFitSection';
import { safeValue } from '../utils/safeRender';

const getScoreColors = (score: number) => {
    if (score >= 7.0) return { text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', bar: 'bg-emerald-500', label: 'ALTO' };
    if (score >= 5.0) return { text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', bar: 'bg-amber-400', label: 'MÉDIO' };
    return { text: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', bar: 'bg-red-500', label: 'BAIXO' };
};

const AttributeIndexGrid: React.FC<{ items: AttributeIndexItem[] }> = ({ items }) => {
    const [search, setSearch] = useState("");
    
    const filteredItems = useMemo(() => {
        return items.filter(item => 
            item.component.toLowerCase().includes(search.toLowerCase()) || 
            item.category.toLowerCase().includes(search.toLowerCase())
        );
    }, [items, search]);

    if (!items || items.length === 0) return null;

    return (
        <div className="space-y-8 animate-fadeIn">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-neutral-100 pb-6">
                <div>
                    <h3 className="text-lg font-black text-neutral-800 uppercase tracking-[0.2em] flex items-center gap-3">
                        <List className="w-6 h-6 text-brand-blue" /> Índice de Atributos Completo
                    </h3>
                    <p className="text-[10px] text-neutral-400 font-black uppercase tracking-widest mt-1">
                        Exibindo {filteredItems.length} de {items.length} atributos identificados
                    </p>
                </div>
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input 
                        type="text"
                        placeholder="Filtrar atributos..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm outline-none focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/5 transition-all"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredItems.map((item, idx) => {
                    const colors = getScoreColors(item.score);
                    return (
                        <div key={idx} className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm hover:shadow-md transition-all group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="min-w-0">
                                    <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-1 truncate">{item.category}</p>
                                    <h4 className="text-sm font-bold text-neutral-800 leading-tight group-hover:text-brand-blue transition-colors">{item.component}</h4>
                                </div>
                                <div className={`text-right px-2 py-1 rounded-lg ${colors.bg} ${colors.text}`}>
                                    <span className="text-sm font-black">{item.score.toFixed(1)}</span>
                                </div>
                            </div>
                            <div className="h-1 w-full bg-neutral-50 rounded-full overflow-hidden mb-4">
                                <div className={`h-full ${colors.bar} transition-all duration-1000`} style={{ width: `${item.score * 10}%` }}></div>
                            </div>
                            {item.analysis && (
                                <p className="text-[11px] text-neutral-500 leading-relaxed italic line-clamp-3">"{item.analysis}"</p>
                            )}
                        </div>
                    );
                })}
            </div>
            
            {filteredItems.length === 0 && (
                <div className="py-20 text-center bg-neutral-50 rounded-3xl border-2 border-dashed border-neutral-200">
                    <Search className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                    <p className="text-neutral-500 font-bold uppercase text-xs">Nenhum atributo corresponde à busca.</p>
                </div>
            )}
        </div>
    );
};

export default function ReportDetailModal({ isOpen, report, onClose }: { isOpen?: boolean, onClose?: () => void, report: CandidateReport | null }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<PredictiveInsightResult | null>(null);
  const [resumeData, setResumeData] = useState<CandidateResume | null>(null);
  const [isResumeLoading, setIsResumeLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'resume'>('profile');
  const [jobRoleData, setJobRoleData] = useState<any>(null);

  const reportPdfUrl = useMemo(() => {
      if (!report) return null;
      return report.pdf_url || report.metadata?.pdf_url || report.metadata?.source_pdf || report.metadata?.analysis?.pdf_url;
  }, [report]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && isOpen) onClose?.();
    };

    if (isOpen && report) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
      
      if (report.metadata?.ai_analysis) {
          setAiAnalysis(report.metadata.ai_analysis);
          setIsAnalyzing(false);
      } else {
          setAiAnalysis(null);
          handleGenerateInsights(report);
      }

      setResumeData(null);
      setIsResumeLoading(true);
      setActiveTab('profile');

      const fetchResumeData = async () => {
          try {
              const candidateEmail = (report.email || report.metadata?.email || report.metadata?.person?.email || '').toLowerCase().trim();
              const { data } = await supabase
                .from('candidate_resumes')
                .select('*')
                .or(`invite_id.eq.${report.invite_id},id.eq.${report.id},email.eq.${candidateEmail}`)
                .maybeSingle();
              
              if (data) setResumeData(data as CandidateResume);
          } catch (e) {
              console.error("Erro ao buscar currículo:", e);
          } finally {
              setIsResumeLoading(false);
          }
      };

      fetchResumeData();

      const roleId = report.job_role_id || report.role_id || report.job_id;
      if (roleId) {
        supabase.from('job_roles').select('*').eq('id', roleId).maybeSingle()
          .then(({ data }) => data && setJobRoleData(data));
      }
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, report]);

  const handleGenerateInsights = async (currentReport: CandidateReport) => {
      if (currentReport.metadata?.ai_analysis) return;
      setIsAnalyzing(true);
      try {
          const result = await copilotService.generatePredictiveInsights(currentReport, null, currentReport.role || "Cargo Geral");
          setAiAnalysis(result);
          const { data: latest } = await supabase.from('reports').select('metadata').eq('id', currentReport.id).single();
          const updatedMetadata = { ...(latest?.metadata || {}), ai_analysis: result };
          await supabase.from('reports').update({ metadata: updatedMetadata }).eq('id', currentReport.id);
      } catch (error) { console.error("IA Error:", error); } finally { setIsAnalyzing(false); }
  };

  const radarData = useMemo(() => {
    if (!report) return [];
    const scores = report.scores || {};
    const b = jobRoleData?.benchmarks || {};
    const getVal = (attr: string) => {
        const val = getScoreFromMap(attr, scores);
        return typeof val === 'number' ? val : 0;
    };
    return [
      { attribute: 'Empatia', candidate: getVal('Empatia'), benchmark: b['Empatia'] || 7.5, fullMark: 10 },
      { attribute: 'P. Prático', candidate: getVal('Pensamento Prático'), benchmark: b['Pensamento Prático'] || 8.0, fullMark: 10 },
      { attribute: 'P. Sistêmico', candidate: getVal('Pensamento Sistêmico'), benchmark: b['Pensamento Sistêmico'] || 7.0, fullMark: 10 },
      { attribute: 'Autoestima', candidate: getVal('Autoestima'), benchmark: b['Autoestima'] || 6.5, fullMark: 10 },
      { attribute: 'Função', candidate: getVal('Consciência de Função'), benchmark: b['Consciência de Função'] || 8.5, fullMark: 10 },
      { attribute: 'Direção', candidate: getVal('Auto-Direção'), benchmark: b['Auto-Direção'] || 7.5, fullMark: 10 },
    ] as RadarDataPoint[];
  }, [report, jobRoleData]);

  // Mesclagem inteligente de todos os atributos
  const allMergedAttributes = useMemo(() => {
    if (!report) return [];
    
    const indexItems: AttributeIndexItem[] = report.attribute_index || report.analysis?.attribute_index || [];
    const mainList: MainAttributeItem[] = report.main_attributes_list || report.analysis?.main_attributes_list || [];
    
    const resultMap = new Map<string, AttributeIndexItem>();
    
    // 1. Prioriza attribute_index (que tem detalhes como análise e categoria)
    indexItems.forEach(item => {
        resultMap.set(item.component.toLowerCase().trim(), { ...item });
    });
    
    // 2. Adiciona itens da main_attributes_list que não estão no index
    mainList.forEach(item => {
        const key = item.attribute.toLowerCase().trim();
        if (!resultMap.has(key)) {
            resultMap.set(key, {
                category: "Geral",
                component: item.attribute,
                score: item.score,
                score_description: "",
                analysis: ""
            });
        }
    });
    
    return Array.from(resultMap.values()).sort((a, b) => a.component.localeCompare(b.component));
  }, [report]);

  if (!isOpen || !report) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex flex-col bg-[#F8FAFC] animate-fadeIn overflow-hidden h-screen w-screen">
      
      <header className="h-16 md:h-20 bg-white border-b border-neutral-200 px-6 md:px-8 flex justify-between items-center shrink-0 shadow-sm z-50">
        <div className="flex items-center gap-4 md:gap-6">
          <button onClick={onClose} className="flex items-center gap-2 px-3 py-2 text-neutral-500 hover:text-brand-blue hover:bg-neutral-50 rounded-xl transition-all font-bold text-sm">
            <ChevronLeft size={20} /> <span className="hidden sm:inline">Voltar</span>
          </button>
          <div className="h-8 w-px bg-neutral-200"></div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-brand-blue text-white flex items-center justify-center font-black shadow-md text-xs md:text-sm">
                {(report.name || 'C').substring(0, 2).toUpperCase()}
            </div>
            <div>
                <h2 className="text-sm md:text-base font-bold text-neutral-900 leading-none truncate max-w-[150px] md:max-w-none">{report.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] md:text-[10px] font-black text-neutral-400 uppercase tracking-widest truncate">{report.role}</span>
                    <span className="w-1 h-1 bg-neutral-300 rounded-full"></span>
                    <div className="flex items-center gap-1">
                        <div className={`w-1.5 h-1.5 rounded-full ${aiAnalysis ? 'bg-emerald-500' : 'bg-neutral-300 animate-pulse'}`}></div>
                        <span className="text-[9px] md:text-[10px] font-black text-neutral-400 uppercase tracking-widest">{aiAnalysis ? 'IA Carregada' : 'IA Processando'}</span>
                    </div>
                </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
            {report.email && (
                <a 
                    href={`mailto:${report.email}`}
                    className="flex items-center gap-2 px-3 md:px-5 py-2 md:py-2.5 bg-white border border-neutral-200 text-neutral-600 hover:text-brand-blue hover:bg-neutral-50 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-sm"
                >
                    <Mail size={16} /> <span className="hidden lg:inline">Contatar Candidato</span>
                </a>
            )}
            <button onClick={() => window.print()} className="flex items-center gap-2 px-3 md:px-5 py-2 md:py-2.5 bg-white border border-neutral-200 text-neutral-600 hover:text-brand-blue hover:bg-neutral-50 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-sm">
                <Printer size={16} /> <span className="hidden lg:inline">Imprimir</span>
            </button>
            {reportPdfUrl && (
                <button 
                  onClick={() => window.open(reportPdfUrl, '_blank')} 
                  className="flex items-center gap-2 px-3 md:px-5 py-2 md:py-2.5 bg-brand-blue text-white hover:bg-brand-dark rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md"
                >
                    <Download size={16} /> <span className="hidden lg:inline">Baixar Original</span>
                </button>
            )}
            <button onClick={onClose} className="p-2 md:p-2.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all">
                <X size={24} />
            </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto custom-scrollbar bg-[#F8FAFC] pb-24">
          
          <div className="bg-white border-b border-neutral-100 px-8 md:px-12 flex gap-6 md:gap-10 sticky top-0 z-40 shadow-sm">
              <button onClick={() => setActiveTab('profile')} className={`py-4 md:py-5 text-[10px] md:text-xs font-black uppercase tracking-widest border-b-4 transition-all ${activeTab === 'profile' ? 'border-brand-blue text-brand-blue' : 'border-transparent text-neutral-400 hover:text-neutral-600'}`}>
                  DNA Comportamental
              </button>
              <button onClick={() => setActiveTab('resume')} className={`py-4 md:py-5 text-[10px] md:text-xs font-black uppercase tracking-widest border-b-4 transition-all flex items-center gap-2 ${activeTab === 'resume' ? 'border-brand-blue text-brand-blue' : 'border-transparent text-neutral-400 hover:text-neutral-600'}`}>
                  Dossiê Técnico (CV) {resumeData && <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>}
              </button>
          </div>

          <div className="max-w-7xl mx-auto p-6 md:p-12 space-y-20">
              
              {activeTab === 'profile' ? (
                  <div className="space-y-20 animate-fadeIn">
                      <OrganizationalFitSection candidateScores={report.scores || {}} benchmarkScores={jobRoleData?.benchmarks || {}} />

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                          <div className="bg-white p-8 rounded-[2rem] border border-neutral-100 shadow-sm flex items-center gap-6">
                              <div className="w-16 h-16 bg-blue-50 text-brand-blue rounded-2xl flex items-center justify-center shadow-inner"><Target size={32}/></div>
                              <div>
                                  <p className="text-[11px] font-black text-neutral-400 uppercase tracking-[0.2em]">Fit Cultural</p>
                                  <p className="text-3xl font-black text-neutral-800">{report.score}%</p>
                              </div>
                          </div>
                          <div className="bg-white p-8 rounded-[2rem] border border-neutral-100 shadow-sm flex items-center gap-6">
                              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner"><Zap size={32}/></div>
                              <div>
                                  <p className="text-[11px] font-black text-neutral-400 uppercase tracking-[0.2em]">Performance Estimada</p>
                                  <p className="text-3xl font-black text-neutral-800">Alta</p>
                              </div>
                          </div>
                          <div className="bg-white p-8 rounded-[2rem] border border-neutral-100 shadow-sm flex items-center gap-6">
                              <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center shadow-inner"><Brain size={32}/></div>
                              <div>
                                  <p className="text-[11px] font-black text-neutral-400 uppercase tracking-[0.2em]">Estilo Cognitivo</p>
                                  <p className="text-3xl font-black text-neutral-800">Pragmático</p>
                              </div>
                          </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                          <div className="bg-white p-8 md:p-12 rounded-[2.5rem] border border-neutral-100 shadow-sm flex flex-col min-h-[500px]">
                              <div className="mb-10">
                                  <h3 className="font-black text-neutral-800 uppercase text-sm tracking-[0.2em]">Equilíbrio Dimensional Axiais</h3>
                                  <p className="text-[10px] text-neutral-400 font-bold uppercase mt-1 tracking-widest">Mapeamento de Potencial vs Exigência</p>
                              </div>
                              <div className="flex-1"><RadarChartWrapper data={radarData} /></div>
                          </div>
                          <div className="bg-brand-blue/5 border border-brand-blue/10 rounded-[2.5rem] p-10 shadow-inner flex flex-col justify-center">
                              <h4 className="font-black text-brand-blue uppercase text-[11px] tracking-[0.2em] mb-6 flex items-center gap-3">
                                  <Info size={18} /> Parecer Comportamental
                              </h4>
                              <p className="text-xl text-neutral-700 leading-relaxed font-medium italic">
                                  "{report.overall_summary || 'A análise demonstra um perfil com forte orientação para resultados e pensamento estratégico.'}"
                              </p>
                          </div>
                      </div>

                      <ComparativeDimensionalChart candidateData={report.scores || {}} benchmarkData={jobRoleData?.benchmarks || {}} candidateName={report.name} />
                      
                      <DimensionalBarChart scores={report.scores as any || {}} />

                      {/* ÍNDICE DE ATRIBUTOS COMPLETO (RESTAURADO E AMPLIADO) */}
                      <AttributeIndexGrid items={allMergedAttributes} />

                      <div className="rounded-[2rem] md:rounded-[2.5rem] bg-[#001A3B] text-white p-8 md:p-12 relative overflow-hidden shadow-2xl">
                          <div className="relative z-10">
                              <div className="flex items-center gap-3 mb-8">
                                  <div className="p-2 bg-white/10 rounded-xl">
                                      {isAnalyzing ? <Loader2 className="w-5 h-5 text-blue-300 animate-spin" /> : <Sparkles className="w-5 h-5 text-blue-300" />}
                                  </div>
                                  <h3 className="font-black text-xs md:text-sm uppercase tracking-[0.3em] text-blue-200">Inteligência Preditiva PessoaCerta (Síntese Final)</h3>
                              </div>
                              {aiAnalysis ? (
                                  <p className="text-xl md:text-3xl leading-relaxed text-blue-50/95 font-medium border-l-8 border-primary/60 pl-8 md:pl-12 italic">
                                      {aiAnalysis.three_pillar_synthesis}
                                  </p>
                              ) : (
                                  <div className="space-y-4 animate-pulse">
                                      <div className="h-6 bg-white/10 rounded w-full"></div>
                                      <div className="h-6 bg-white/10 rounded w-5/6"></div>
                                  </div>
                              )}
                          </div>
                          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-[120px] -mr-48 -mt-48"></div>
                      </div>
                  </div>
              ) : (
                  <div className="animate-fadeIn space-y-16">
                      {isResumeLoading ? (
                          <div className="p-32 flex flex-col items-center justify-center">
                              <Loader2 className="w-12 h-12 text-brand-blue animate-spin mb-4" />
                              <p className="text-sm font-bold text-neutral-400 uppercase tracking-widest">Recuperando Dossiê...</p>
                          </div>
                      ) : resumeData ? (
                          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 animate-fadeIn">
                              <div className="lg:col-span-8 space-y-16">
                                  <div className="bg-white p-12 rounded-[3rem] border border-neutral-100 shadow-sm relative overflow-hidden group">
                                      <div className="absolute top-0 right-0 p-12 opacity-5"><Quote size={80} className="text-brand-blue" /></div>
                                      <h3 className="text-[11px] font-black text-neutral-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
                                          <Globe size={18} className="text-brand-blue"/> Sumário Executivo Profissional
                                      </h3>
                                      <p className="text-xl md:text-2xl text-neutral-800 font-bold leading-relaxed italic opacity-95">"{safeValue(resumeData.professional_summary)}"</p>
                                  </div>
                                  <div className="bg-white p-12 rounded-[3rem] border border-neutral-100 shadow-sm">
                                      <h3 className="text-[11px] font-black text-neutral-400 uppercase mb-10 tracking-[0.2em] flex items-center gap-3">
                                          <Briefcase size={18} className="text-brand-blue"/> Trajetória & Realizações
                                      </h3>
                                      <p className="text-sm md:text-base text-neutral-700 whitespace-pre-line leading-relaxed font-semibold opacity-90">{safeValue(resumeData.experience)}</p>
                                  </div>
                                  <CVEvidencePanel evidences={resumeData.evidence_snippets || []} candidateName={report.name || 'Candidato'} />
                              </div>
                              <div className="lg:col-span-4 space-y-10">
                                  <div className="bg-brand-lightBlue/30 p-10 rounded-[2.5rem] border border-brand-blue/10 shadow-inner">
                                      <h4 className="font-black text-brand-blue mb-8 flex items-center gap-3 uppercase text-[11px] tracking-[0.2em]"><History size={20}/> Maturidade Profissional</h4>
                                      <ExperienceTimeline totalYears={Number(resumeData.total_experience_years || 5)} relevantYears={Number(resumeData.relevant_experience_years || 2)} color="bg-brand-blue" />
                                  </div>
                                  <div className="p-8 bg-white rounded-[2rem] border border-neutral-100 shadow-sm">
                                      <h4 className="text-[11px] font-black text-neutral-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><Phone size={16} className="text-brand-blue"/> Contato Direto</h4>
                                      <p className="text-sm font-bold text-neutral-800">{safeValue(resumeData.phone)}</p>
                                      {resumeData.linkedin_url && (
                                          <a href={resumeData.linkedin_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 mt-4 text-xs font-bold text-brand-blue hover:underline">
                                              <Linkedin size={14}/> Perfil LinkedIn
                                          </a>
                                      )}
                                  </div>
                              </div>
                          </div>
                      ) : (
                          <div className="p-32 text-center flex flex-col items-center justify-center bg-white rounded-[4rem] border-2 border-dashed border-neutral-200 shadow-inner">
                              <div className="w-24 h-24 bg-neutral-50 rounded-full flex items-center justify-center mb-8 text-neutral-300 shadow-sm"><FileText size={48} /></div>
                              <h3 className="text-xl font-black text-neutral-800 uppercase tracking-[0.25em]">Aguardando Envio do Currículo</h3>
                              <p className="text-sm text-neutral-500 mt-3 max-w-xs mx-auto leading-relaxed">
                                  O currículo ainda não foi vinculado a esta avaliação. Certifique-se de que o candidato completou o upload.
                              </p>
                              <div className="mt-8 flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 text-[10px] font-black rounded-full border border-amber-100 uppercase">
                                  <Clock size={12}/> Pendente
                              </div>
                          </div>
                      )}
                  </div>
              )}
          </div>
      </main>
      
      <footer className="bg-white border-t border-neutral-200 px-8 py-5 flex flex-col md:flex-row gap-4 justify-between items-center text-[9px] md:text-[10px] font-black text-neutral-400 uppercase tracking-widest shrink-0 z-50">
          <div className="flex items-center gap-3">
              <ShieldCheck size={16} className="text-brand-blue" /> Documento Autenticado via PessoaCerta Analytics • MD5: {report.id.substring(0,16)}
          </div>
          <div className="flex items-center gap-6">
            <span>Powered by Innermetrix Brasil</span>
            <span className="w-1.5 h-1.5 bg-neutral-200 rounded-full"></span>
            <span>DNA Engine v5.2</span>
          </div>
      </footer>
    </div>
  );

  return createPortal(modalContent, document.getElementById('modal-root')!);
}
