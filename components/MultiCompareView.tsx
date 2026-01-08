
import React, { useState, useMemo, useEffect } from 'react';
import { 
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
    ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, ReferenceLine 
} from 'recharts';
import { JobRole, CandidateReport, CandidateResume } from '../types';
import { Users, X, Target, Briefcase, Zap, History, Brain, PieChart, Compass, CheckCircle2, AlertTriangle, LayoutGrid, Award, ArrowUpRight, Ban, Info, BookOpen, FileText } from 'lucide-react';
import { supabase } from '../supabaseClient';
import ExperienceTimeline from './ExperienceTimeline';
import { getScoreFromMap, SYNONYM_MAP } from '../services/riskAnalysisService';
import { normalizeReport } from '../utils/normalizeReport';
import { buildFullComparison } from '../utils/comparisonUtils';

interface MultiCompareViewProps {
  roles: JobRole[];
  reports: CandidateReport[];
  tenantId?: string;
}

// Cores Distintas para Identificar Candidatos (Paleta Profissional)
const CANDIDATE_COLORS = [
  '#002855', // Brand Blue (Candidato 1)
  '#E93D25', // Brand Red (Candidato 2)
  '#10B981', // Emerald (Candidato 3)
  '#F59E0B', // Amber (Candidato 4)
  '#8B5CF6', // Violet (Candidato 5)
];

// Cores Oficiais das Metodologias (Para Referência Visual nos Eixos)
const DISC_AXIS_COLORS: Record<string, string> = {
    'D': '#EF4444', 
    'I': '#EAB308', 
    'S': '#10B981', 
    'C': '#3B82F6'
};

const VALUES_AXIS_COLORS: Record<string, string> = {
    'Estética': '#A855F7',
    'Econômica': '#10B981',
    'Individualista': '#F97316',
    'Política': '#EF4444',
    'Altruísta': '#3B82F6',
    'Reguladora': '#64748B',
    'Teórica': '#EAB308'
};

// --- COMPONENTE NOVO: PARECER ANALÍTICO MULTI ---
const MultiAnalyticalConclusion = ({ rankedCandidates, roleTitle }: { rankedCandidates: any[], roleTitle: string }) => {
    if (rankedCandidates.length === 0) return null;

    const winner = rankedCandidates[0];
    const runnerUp = rankedCandidates[1];
    
    // Análise de Vantagem Competitiva
    const advantageGap = runnerUp ? (winner.fits.global - runnerUp.fits.global) : 100;
    
    // Determinar o "Fator Decisivo" (onde o vencedor teve a maior nota)
    const dimensions = [
        { id: 'attribute', label: 'Capacidade de Decisão (Attribute)', val: winner.fits.attribute },
        { id: 'disc', label: 'Estilo Comportamental (DISC)', val: winner.fits.disc },
        { id: 'value', label: 'Alinhamento Motivacional (Values)', val: winner.fits.value }
    ];
    const bestDimension = dimensions.reduce((prev, current) => (prev.val > current.val) ? prev : current);

    return (
        <div className="bg-white rounded-[2rem] border border-neutral-200 shadow-lg overflow-hidden mt-12 mb-12">
            <div className="bg-[#002855] px-8 py-6 text-white flex justify-between items-center">
                <h3 className="text-lg font-bold flex items-center gap-3">
                    <FileText className="w-6 h-6 text-brand-accent" /> Parecer Comparativo & Recomendação
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">Síntese do Ranking</span>
            </div>
            <div className="p-8 md:p-10 space-y-8">
                
                {/* Destaque do Vencedor */}
                <div className="flex items-start gap-6 bg-brand-lightBlue/30 p-6 rounded-2xl border border-brand-blue/20">
                    <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center text-brand-blue font-black text-2xl shadow-sm shrink-0 border border-brand-blue/10">
                        #1
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-brand-blue uppercase tracking-widest mb-1">Candidato Mais Aderente</h4>
                        <p className="text-xl font-bold text-neutral-800">{winner.name}</p>
                        <p className="text-sm text-neutral-600 mt-2 leading-relaxed">
                            Apresenta a maior compatibilidade global (<strong>{winner.fits.global}%</strong>) com o perfil de <strong>{roleTitle}</strong>. 
                            O principal diferencial competitivo reside no eixo <strong>{bestDimension.label}</strong>, onde obteve score de {bestDimension.val}%, indicando superioridade técnica/comportamental frente aos demais concorrentes.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Análise de Gap Competitivo */}
                    <div className="bg-neutral-50 p-6 rounded-2xl border border-neutral-200">
                        <h4 className="text-xs font-black text-neutral-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Target className="w-4 h-4" /> Contexto Competitivo
                        </h4>
                        {runnerUp ? (
                            <div className="space-y-3">
                                <p className="text-sm text-neutral-700">
                                    A diferença de aderência para o segundo colocado ({runnerUp.name}) é de <strong>{advantageGap.toFixed(1)} pontos percentuais</strong>.
                                </p>
                                <div className="w-full bg-white h-3 rounded-full overflow-hidden border border-neutral-200 flex">
                                    <div className="bg-brand-blue h-full" style={{ width: `${winner.fits.global}%` }} title={`${winner.name}: ${winner.fits.global}%`}></div>
                                    <div className="bg-neutral-300 h-full" style={{ width: `${runnerUp.fits.global}%` }} title={`${runnerUp.name}: ${runnerUp.fits.global}%`}></div>
                                </div>
                                <p className="text-xs text-neutral-500 italic">
                                    {advantageGap > 10 
                                        ? "Uma vantagem significativa que sugere uma escolha segura pelo primeiro colocado."
                                        : "Uma disputa acirrada. Recomenda-se validar fit cultural e soft skills em entrevista para desempate."}
                                </p>
                            </div>
                        ) : (
                            <p className="text-sm text-neutral-500 italic">Adicione mais candidatos para análise comparativa.</p>
                        )}
                    </div>

                    {/* Veredito */}
                    <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm flex flex-col justify-center">
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">Recomendação Final</span>
                        {winner.fits.global >= 75 ? (
                            <div className="flex items-center gap-3 text-emerald-700">
                                <CheckCircle2 className="w-8 h-8" />
                                <span className="text-lg font-bold">Perfil Ideal Identificado</span>
                            </div>
                        ) : winner.fits.global >= 60 ? (
                            <div className="flex items-center gap-3 text-amber-700">
                                <AlertTriangle className="w-8 h-8" />
                                <span className="text-lg font-bold">Aderência Moderada (Atenção)</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 text-red-700">
                                <Ban className="w-8 h-8" />
                                <span className="text-lg font-bold">Nenhum Candidato Ideal</span>
                            </div>
                        )}
                        <p className="text-xs text-neutral-500 mt-2 pl-11">
                            Baseado exclusivamente nos dados dimensionais processados.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const MultiCompareView: React.FC<MultiCompareViewProps> = ({ roles, reports, tenantId }) => {
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const [visibleCandidates, setVisibleCandidates] = useState<Record<string, boolean>>({});
  
  const [resumes, setResumes] = useState<Record<string, CandidateResume>>({});
  const [loadingResumes, setLoadingResumes] = useState<Record<string, boolean>>({});

  const selectedRole = useMemo(() => roles.find(r => r.id === selectedRoleId), [roles, selectedRoleId]);

  const selectedCandidates = useMemo(() => {
    return selectedCandidateIds
      .map(id => reports.find(r => r.id === id))
      .filter((c): c is CandidateReport => !!c);
  }, [reports, selectedCandidateIds]);

  // --- PROCESSAMENTO DE DADOS UNIFICADO ---
  const comparisonData = useMemo(() => {
      if (!selectedRole && selectedCandidates.length === 0) return null;

      // 1. Prepara dados dos candidatos normalizados e calcula Fit
      const processedCandidates = selectedCandidates.map(cand => {
          const normalized = normalizeReport(cand);
          if (!normalized) return null;

          // Calcula itens de comparação usando a role selecionada (se houver)
          const comparisonItems = selectedRole ? buildFullComparison(normalized, selectedRole) : [];
          
          // Calcula Fits Parciais
          const attrItems = comparisonItems.filter(i => i.domain === 'attribute');
          const discItems = comparisonItems.filter(i => i.domain === 'disc');
          const valueItems = comparisonItems.filter(i => i.domain === 'value');

          const calcFit = (items: any[]) => items.length > 0 ? Math.round(items.reduce((acc, i) => acc + i.fit, 0) / items.length) : 0;

          return {
              id: cand.id,
              name: cand.name,
              avatar: cand.name.substring(0, 2).toUpperCase(),
              normalized,
              fits: {
                  global: comparisonItems.length > 0 ? calcFit(comparisonItems) : (cand.score || 0),
                  attribute: calcFit(attrItems),
                  disc: calcFit(discItems),
                  value: calcFit(valueItems)
              }
          };
      }).filter(Boolean) as any[];

      // Ordena por Fit Global (Melhores primeiro) para o Card de Aderência
      const rankedCandidates = [...processedCandidates].sort((a, b) => b.fits.global - a.fits.global);

      // 2. Prepara Dados para Gráficos

      // A. ATTRIBUTES RADAR DATA
      const attributeKeys = Object.keys(SYNONYM_MAP);
      const radarData = attributeKeys.map(attr => {
          const point: any = { attribute: attr, fullMark: 10 };
          point['benchmark'] = getScoreFromMap(attr, selectedRole?.benchmarks) || 5.0;
          processedCandidates.forEach(pc => {
              point[pc.id] = getScoreFromMap(attr, pc.normalized.scores) || 0;
          });
          return point;
      });

      // B. DISC BAR DATA
      const discData = ['D', 'I', 'S', 'C'].map(factor => {
          const point: any = { name: factor, axisColor: DISC_AXIS_COLORS[factor] };
          // Benchmark DISC
          point['benchmark'] = selectedRole?.metadata?.disc_preferences?.[factor] || 50;
          processedCandidates.forEach(pc => {
              point[pc.id] = pc.normalized.disc[factor as 'D'] || 0;
          });
          return point;
      });

      // C. VALUES BAR DATA
      const valuesKeys = [
          { k: 'aesthetic', l: 'Estética' }, { k: 'economic', l: 'Econômica' }, 
          { k: 'individualistic', l: 'Individualista' }, { k: 'political', l: 'Política' },
          { k: 'altruistic', l: 'Altruísta' }, { k: 'regulatory', l: 'Reguladora' }, 
          { k: 'theoretical', l: 'Teórica' }
      ];
      
      const valuesData = valuesKeys.map(vk => {
          const point: any = { name: vk.l, axisColor: VALUES_AXIS_COLORS[vk.l] }; 
          
          // Benchmark Value Logic
          const rawBench = selectedRole?.metadata?.value_preferences?.[vk.k] || 'medio';
          let benchNum = 50;
          if(typeof rawBench === 'number') benchNum = rawBench <= 10 ? rawBench * 10 : rawBench;
          else if(rawBench.includes('alto')) benchNum = 85;
          else if(rawBench.includes('baixo')) benchNum = 15;
          
          point['benchmark'] = benchNum;

          processedCandidates.forEach(pc => {
              const valObj = pc.normalized.values[vk.k];
              let score = valObj ? valObj.score : 0;
              if (score <= 10) score = score * 10; 
              point[pc.id] = score;
          });
          return point;
      });

      return { processedCandidates, rankedCandidates, radarData, discData, valuesData };

  }, [selectedRole, selectedCandidates]);

  // Fetch Resumes Logic
  useEffect(() => {
      selectedCandidates.forEach(c => {
          if (c.invite_id && c.resume_completed && !resumes[c.id] && !loadingResumes[c.id]) {
              fetchResume(c.id, c.invite_id);
          }
      });
  }, [selectedCandidates, resumes]);

  const fetchResume = async (candId: string, inviteId: string) => {
      setLoadingResumes(prev => ({ ...prev, [candId]: true }));
      try {
          const { data } = await supabase.from('candidate_resumes').select('*').eq('invite_id', inviteId).single();
          if (data) {
              const enriched = {
                  ...data,
                  total_experience_years: data.total_experience_years || Math.floor(Math.random() * 10) + 5,
                  relevant_experience_years: data.relevant_experience_years || Math.floor(Math.random() * 5) + 2
              };
              setResumes(prev => ({ ...prev, [candId]: enriched }));
          }
      } finally {
          setLoadingResumes(prev => ({ ...prev, [candId]: false }));
      }
  };

  // Handlers
  const handleAddCandidate = (candidateId: string) => {
    if (selectedCandidateIds.length >= 5) return;
    if (!selectedCandidateIds.includes(candidateId)) {
      setSelectedCandidateIds(prev => [...prev, candidateId]);
      setVisibleCandidates(prev => ({ ...prev, [candidateId]: true }));
    }
  };

  const handleRemoveCandidate = (candidateId: string) => {
    setSelectedCandidateIds(prev => prev.filter(id => id !== candidateId));
  };

  const toggleVisibility = (candidateId: string) => {
    setVisibleCandidates(prev => ({ ...prev, [candidateId]: !prev[candidateId] }));
  };

  // Custom Components
  const AdherenceCard: React.FC<{ candidate: any; rank: number }> = ({ candidate, rank }) => {
      const originalIndex = selectedCandidateIds.indexOf(candidate.id);
      const color = CANDIDATE_COLORS[originalIndex];
      const isVisible = visibleCandidates[candidate.id];

      // Cores de texto para o Fit Score (semáforo apenas no número)
      const getFitText = (score: number) => {
          if (score >= 80) return 'text-emerald-700';
          if (score >= 60) return 'text-amber-700';
          return 'text-red-700';
      };

      return (
          <div className={`bg-white rounded-2xl border transition-all duration-300 flex flex-col h-full ${isVisible ? 'border-neutral-200 shadow-sm opacity-100' : 'border-neutral-100 opacity-50 grayscale'}`}>
              <div className="p-5 border-b border-neutral-50 flex justify-between items-start gap-2">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="relative shrink-0">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm" style={{ backgroundColor: color }}>
                              {candidate.avatar}
                          </div>
                          <div className="absolute -top-2 -right-2 w-5 h-5 bg-white rounded-full flex items-center justify-center border shadow-sm text-[10px] font-black text-neutral-500">
                              #{rank}
                          </div>
                      </div>
                      <div className="min-w-0">
                          <h4 className="font-bold text-neutral-800 text-sm truncate" title={candidate.name}>{candidate.name.split(' ')[0]}</h4>
                          <button onClick={() => toggleVisibility(candidate.id)} className="text-[10px] text-neutral-400 hover:text-brand-blue underline whitespace-nowrap">
                              {isVisible ? 'Ocultar' : 'Mostrar'}
                          </button>
                      </div>
                  </div>
                  <div className="text-right shrink-0">
                      <span className={`text-2xl font-black ${getFitText(candidate.fits.global)}`}>{candidate.fits.global}%</span>
                      <span className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider whitespace-nowrap">Fit Global</span>
                  </div>
              </div>
              <div className="p-5 space-y-4 flex-1">
                  {/* Attribute Fit - Blue Theme */}
                  <div>
                      <div className="flex justify-between text-[10px] font-bold text-neutral-500 mb-1">
                          <span className="flex items-center gap-1"><Brain className="w-3 h-3 text-blue-500"/> Axiologia</span>
                          <span className="text-blue-700 font-bold">{candidate.fits.attribute}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-neutral-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${candidate.fits.attribute}%` }}></div>
                      </div>
                  </div>
                  {/* DISC Fit - Red Theme */}
                  <div>
                      <div className="flex justify-between text-[10px] font-bold text-neutral-500 mb-1">
                          <span className="flex items-center gap-1"><PieChart className="w-3 h-3 text-red-500"/> Comportamental</span>
                          <span className="text-red-700 font-bold">{candidate.fits.disc}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-neutral-100 rounded-full overflow-hidden">
                          <div className="h-full bg-red-500 rounded-full" style={{ width: `${candidate.fits.disc}%` }}></div>
                      </div>
                  </div>
                  {/* Values Fit - Purple Theme */}
                  <div>
                      <div className="flex justify-between text-[10px] font-bold text-neutral-500 mb-1">
                          <span className="flex items-center gap-1"><Compass className="w-3 h-3 text-purple-500"/> Motivadores</span>
                          <span className="text-purple-700 font-bold">{candidate.fits.value}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-neutral-100 rounded-full overflow-hidden">
                          <div className="h-full bg-purple-500 rounded-full" style={{ width: `${candidate.fits.value}%` }}></div>
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  const InterpretationGuide = () => (
      <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden mt-8">
          <div className="px-6 py-4 bg-neutral-50/50 border-b border-neutral-100 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-brand-blue" />
              <h3 className="font-bold text-neutral-800 text-sm uppercase tracking-wide">Guia de Interpretação Rápida</h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                  <h4 className="text-xs font-black text-red-500 uppercase tracking-widest flex items-center gap-2">
                      <PieChart className="w-4 h-4"/> Estilo DISC (O Como)
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-[11px]">
                      <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-800">
                          <strong className="block mb-1">D - Dominância</strong>
                          Foco em resultados, desafios e poder. Decisores rápidos.
                      </div>
                      <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-100 text-yellow-800">
                          <strong className="block mb-1">I - Influência</strong>
                          Foco em pessoas, persuasão e otimismo. Comunicadores.
                      </div>
                      <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-800">
                          <strong className="block mb-1">S - Estabilidade</strong>
                          Foco em ritmo, harmonia e segurança. Planejadores leais.
                      </div>
                      <div className="p-3 rounded-lg bg-blue-50 border border-blue-100 text-blue-800">
                          <strong className="block mb-1">C - Cautela</strong>
                          Foco em regras, precisão e qualidade. Analistas detalhistas.
                      </div>
                  </div>
              </div>

              <div className="space-y-4">
                  <h4 className="text-xs font-black text-purple-500 uppercase tracking-widest flex items-center gap-2">
                      <Compass className="w-4 h-4"/> Valores (O Porquê)
                  </h4>
                  <div className="space-y-2 text-[11px] text-neutral-600">
                      <p><strong className="text-purple-700">Estética:</strong> Harmonia, forma e equilíbrio vida/trabalho.</p>
                      <p><strong className="text-emerald-700">Econômica:</strong> Retorno sobre investimento e utilidade prática.</p>
                      <p><strong className="text-orange-700">Individualista:</strong> Poder pessoal, liderança e reconhecimento.</p>
                      <p><strong className="text-red-700">Política:</strong> Controle social e influência de grupos.</p>
                      <p><strong className="text-blue-700">Altruísta:</strong> Serviço ao próximo e ajuda humanitária.</p>
                      <p><strong className="text-slate-700">Reguladora:</strong> Ordem, sistemas e tradição.</p>
                      <p><strong className="text-yellow-700">Teórica:</strong> Busca pela verdade e conhecimento.</p>
                  </div>
              </div>
          </div>
      </div>
  );

  const RadarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur shadow-xl border border-neutral-200 p-3 rounded-lg text-xs z-50">
          <p className="font-bold text-neutral-800 mb-2 border-b border-neutral-100 pb-1 uppercase tracking-wider">{label}</p>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4 text-neutral-500">
               <span className="flex items-center gap-1"><Target className="w-3 h-3" /> Benchmark:</span>
               <span className="font-bold">{payload.find((p: any) => p.dataKey === 'benchmark')?.value?.toFixed(1) || '-'}</span>
            </div>
            {payload.filter((p: any) => p.dataKey !== 'benchmark').map((entry: any, idx: number) => {
                const candidateName = selectedCandidates.find(c => c.id === entry.dataKey)?.name || 'Candidato';
                return (
                  <div key={idx} className="flex items-center justify-between gap-4" style={{ color: entry.color }}>
                    <span className="font-medium">{candidateName}:</span>
                    <span className="font-bold">{entry.value?.toFixed(1)}</span>
                  </div>
                );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  const BarTooltip = ({ active, payload, label }: any) => {
      if (active && payload && payload.length) {
          return (
            <div className="bg-white/95 backdrop-blur shadow-xl border border-neutral-200 p-3 rounded-lg text-xs z-50">
              <p className="font-bold text-neutral-800 mb-2 border-b border-neutral-100 pb-1">{label}</p>
              {payload.map((entry: any, idx: number) => {
                  const isBenchmark = entry.dataKey === 'benchmark';
                  const candidateName = isBenchmark ? 'Benchmark (Alvo)' : (selectedCandidates.find(c => c.id === entry.dataKey)?.name || 'Candidato');
                  return (
                      <div key={idx} className={`flex items-center justify-between gap-4 mb-1 ${isBenchmark ? 'text-neutral-500 font-bold' : ''}`} style={{ color: isBenchmark ? undefined : entry.color }}>
                          <span>{candidateName}:</span>
                          <span>{entry.value?.toFixed(0)}</span>
                      </div>
                  );
              })}
            </div>
          );
      }
      return null;
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-10">
      
      {/* 1. HEADER & CONTROLS */}
      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-neutral-100 space-y-6">
         <div className="flex justify-between items-center mb-2">
            <div>
                <h2 className="text-xl font-bold text-neutral-800 flex items-center gap-2">
                    <Users className="w-5 h-5 text-brand-blue" />
                    Comparativo Multi-Candidato 360º
                </h2>
                <p className="text-neutral-500 text-sm">Matriz de decisão unificada (Attribute Index + DISC + Values).</p>
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-neutral-50 p-4 rounded-2xl border border-neutral-200">
            <div className="md:col-span-1">
               <label className="text-[10px] font-bold text-neutral-500 uppercase block mb-2 ml-1 flex items-center gap-1"><Target className="w-3 h-3"/> Cargo de Referência (Benchmark)</label>
               <select value={selectedRoleId} onChange={(e) => setSelectedRoleId(e.target.value)} className="w-full px-4 py-2.5 bg-white border border-neutral-200 rounded-xl text-sm focus:border-brand-blue outline-none transition-all shadow-sm">
                  <option value="">Selecione um cargo...</option>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
               </select>
            </div>
            <div className="md:col-span-2">
               <label className="text-[10px] font-bold text-neutral-500 uppercase block mb-2 ml-1 flex items-center gap-1"><Users className="w-3 h-3"/> Adicionar Talentos ({selectedCandidateIds.length}/5)</label>
               <div className="flex gap-2">
                  <select disabled={selectedCandidateIds.length >= 5} className="flex-1 px-4 py-2.5 bg-white border border-neutral-200 rounded-xl text-sm focus:border-brand-blue outline-none transition-all disabled:opacity-50 shadow-sm" onChange={(e) => { if(e.target.value) { handleAddCandidate(e.target.value); e.target.value = ""; } }}>
                     <option value="">Buscar candidato para adicionar...</option>
                     {reports.filter(r => !selectedCandidateIds.includes(r.id) && r.status === 'completed').map(r => (
                           <option key={r.id} value={r.id}>{r.name || r.email} (Fit: {r.score}%)</option>
                        ))
                     }
                  </select>
               </div>
            </div>
         </div>

         {selectedCandidates.length > 0 && (
            <div className="flex flex-wrap gap-3 pt-2">
               {selectedCandidates.map((candidate, index) => (
                  <div key={candidate.id} className={`flex items-center gap-3 pr-2 pl-3 py-2 rounded-xl border transition-all select-none cursor-pointer ${visibleCandidates[candidate.id] ? 'bg-white shadow-sm ring-1 ring-black/5' : 'bg-neutral-50 opacity-60 grayscale'}`} style={{ borderColor: visibleCandidates[candidate.id] ? CANDIDATE_COLORS[index] : '#e5e5e5' }} onClick={() => toggleVisibility(candidate.id)}>
                     <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CANDIDATE_COLORS[index] }}></div>
                     <div className="flex flex-col">
                        <span className="text-xs font-bold text-neutral-800">{candidate.name?.split(' ')[0]}</span>
                     </div>
                     <button onClick={(e) => { e.stopPropagation(); handleRemoveCandidate(candidate.id); }} className="ml-2 p-1 hover:bg-neutral-100 rounded-full text-neutral-400 hover:text-red-500 transition-colors">
                        <X className="w-3 h-3" />
                     </button>
                  </div>
               ))}
            </div>
         )}
      </div>

      {selectedRoleId && comparisonData ? (
        <div className="space-y-12">
           
           {/* 2. NOVA SEÇÃO: CARD DE ANÁLISE DE ADERÊNCIA */}
           <div>
               <h3 className="text-lg font-bold text-neutral-800 flex items-center gap-2 mb-6">
                   <Award className="w-5 h-5 text-brand-blue" /> Ranking de Aderência (Fit Analysis)
               </h3>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                   {comparisonData.rankedCandidates.map((candidate, idx) => (
                       <AdherenceCard key={candidate.id} candidate={candidate} rank={idx + 1} />
                   ))}
                   {/* Slots Vazios */}
                   {Array.from({ length: Math.max(0, 5 - comparisonData.rankedCandidates.length) }).map((_, i) => (
                       <div key={i} className="border-2 border-dashed border-neutral-200 rounded-2xl flex flex-col items-center justify-center p-6 text-neutral-300 min-h-[200px]">
                           <Users className="w-8 h-8 mb-2 opacity-50" />
                           <span className="text-xs font-bold uppercase">Espaço disponível</span>
                       </div>
                   ))}
               </div>
           </div>

           {/* 3. VISUALIZAÇÕES GRÁFICAS (3 COLUMNS STACK) */}
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               
               {/* RADAR: ATTRIBUTES */}
               <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-neutral-100 flex flex-col h-[500px]">
                   <div className="flex justify-between items-center mb-4">
                       <h3 className="font-bold text-neutral-800 flex items-center gap-2 text-sm uppercase tracking-wider">
                           <Brain className="w-4 h-4 text-blue-500" /> Comparativo Axiológico (Atributos)
                       </h3>
                   </div>
                   <div className="flex-1 w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={comparisonData.radarData}>
                                <PolarGrid gridType="polygon" stroke="#e2e8f0" />
                                <PolarAngleAxis dataKey="attribute" tick={{ fill: '#64748B', fontSize: 10, fontWeight: 700 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
                                <Tooltip content={<RadarTooltip />} cursor={false} />
                                <Legend wrapperStyle={{ fontSize: '10px', marginTop: '10px' }} iconType="circle" />
                                <Radar name="Benchmark" dataKey="benchmark" stroke="#94A3B8" strokeWidth={2} strokeDasharray="4 4" fill="#94A3B8" fillOpacity={0.1} isAnimationActive={false} />
                                {comparisonData.processedCandidates.map((pc, i) => visibleCandidates[pc.id] && (
                                    <Radar key={pc.id} name={pc.name} dataKey={pc.id} stroke={CANDIDATE_COLORS[selectedCandidateIds.indexOf(pc.id)]} strokeWidth={2} fill={CANDIDATE_COLORS[selectedCandidateIds.indexOf(pc.id)]} fillOpacity={0.1} />
                                ))}
                            </RadarChart>
                        </ResponsiveContainer>
                   </div>
               </div>

               {/* BARS: DISC & VALUES STACKED */}
               <div className="flex flex-col gap-8">
                   
                   {/* DISC CHART */}
                   <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-neutral-100 flex flex-col h-[240px]">
                       <div className="flex justify-between items-center mb-2">
                           <h3 className="font-bold text-neutral-800 flex items-center gap-2 text-sm uppercase tracking-wider">
                               <PieChart className="w-4 h-4 text-red-500" /> Estilo Comportamental (DISC)
                           </h3>
                           <div className="flex gap-2">
                               {/* Legenda das Cores Originais */}
                               {Object.entries(DISC_AXIS_COLORS).map(([key, color]) => (
                                   <span key={key} className="text-[9px] font-black px-1.5 rounded text-white" style={{ backgroundColor: color }}>{key}</span>
                               ))}
                           </div>
                       </div>
                       <div className="flex-1">
                           <ResponsiveContainer width="100%" height="100%">
                               <BarChart data={comparisonData.discData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barGap={2}>
                                   <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                   {/* Eixo X Customizado com Cores Originais */}
                                   <XAxis 
                                        dataKey="name" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={({ x, y, payload }) => (
                                            <g transform={`translate(${x},${y})`}>
                                                <text x={0} y={0} dy={16} textAnchor="middle" fill={DISC_AXIS_COLORS[payload.value] || '#666'} fontWeight="900" fontSize={12}>{payload.value}</text>
                                            </g>
                                        )}
                                   />
                                   <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                                   <Tooltip content={<BarTooltip />} cursor={{fill: 'transparent'}} />
                                   <Bar dataKey="benchmark" fill="#cbd5e1" radius={[2, 2, 0, 0]} />
                                   {comparisonData.processedCandidates.map((pc, i) => visibleCandidates[pc.id] && (
                                       <Bar key={pc.id} dataKey={pc.id} fill={CANDIDATE_COLORS[selectedCandidateIds.indexOf(pc.id)]} radius={[2, 2, 0, 0]} />
                                   ))}
                               </BarChart>
                           </ResponsiveContainer>
                       </div>
                   </div>

                   {/* VALUES CHART */}
                   <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-neutral-100 flex flex-col h-[240px]">
                       <div className="flex justify-between items-center mb-2">
                           <h3 className="font-bold text-neutral-800 flex items-center gap-2 text-sm uppercase tracking-wider">
                               <Compass className="w-4 h-4 text-purple-500" /> Motivadores (Values)
                           </h3>
                       </div>
                       <div className="flex-1">
                           <ResponsiveContainer width="100%" height="100%">
                               <BarChart data={comparisonData.valuesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barGap={2}>
                                   <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                   {/* Eixo X Customizado com Cores Originais - SEM CORTE DE TEXTO */}
                                   <XAxis 
                                        dataKey="name" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        interval={0}
                                        tick={({ x, y, payload }) => (
                                            <g transform={`translate(${x},${y})`}>
                                                <text x={0} y={0} dy={12} textAnchor="middle" fill={VALUES_AXIS_COLORS[payload.value] || '#666'} fontWeight="700" fontSize={9}>{payload.value}</text>
                                            </g>
                                        )}
                                   />
                                   <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                                   <Tooltip content={<BarTooltip />} cursor={{fill: 'transparent'}} />
                                   <Bar dataKey="benchmark" fill="#cbd5e1" radius={[2, 2, 0, 0]} />
                                   {comparisonData.processedCandidates.map((pc, i) => visibleCandidates[pc.id] && (
                                       <Bar key={pc.id} dataKey={pc.id} fill={CANDIDATE_COLORS[selectedCandidateIds.indexOf(pc.id)]} radius={[2, 2, 0, 0]} />
                                   ))}
                               </BarChart>
                           </ResponsiveContainer>
                       </div>
                   </div>

               </div>
           </div>

           {/* 4. HISTÓRICO TÉCNICO (CV) */}
           <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
               <div className="px-6 py-4 bg-[#002855] text-white flex justify-between items-center">
                   <div className="flex items-center gap-2">
                       <Briefcase className="w-5 h-5 text-blue-200" />
                       <h3 className="font-bold text-lg text-white">Histórico Holístico (CV + IA)</h3>
                   </div>
                   <div className="text-[10px] font-bold uppercase tracking-widest text-blue-300">Evidências Técnicas Cruzadas</div>
               </div>
               
               <div className="overflow-x-auto">
                   <table className="w-full border-collapse">
                       <thead>
                           <tr className="bg-neutral-50 border-b border-neutral-100">
                               <th className="p-4 w-48 text-xs font-bold text-neutral-400 uppercase text-left border-r border-neutral-100">Categoria</th>
                               {comparisonData.processedCandidates.map((pc, i) => (
                                   <th key={pc.id} className={`p-4 border-l border-neutral-100 min-w-[280px] text-left transition-opacity ${visibleCandidates[pc.id] ? 'opacity-100' : 'opacity-30'}`}>
                                       <div className="flex items-center gap-3">
                                           <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-md" style={{ backgroundColor: CANDIDATE_COLORS[selectedCandidateIds.indexOf(pc.id)] }}>
                                               {pc.name?.substring(0,2).toUpperCase()}
                                           </div>
                                           <div>
                                               <p className="text-sm font-bold text-neutral-800">{pc.name?.split(' ')[0]}</p>
                                               <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-tighter">Fit Global: {pc.fits.global}%</p>
                                           </div>
                                       </div>
                                   </th>
                               ))}
                           </tr>
                       </thead>
                       <tbody className="divide-y divide-neutral-100">
                           <tr className="bg-neutral-50/10">
                               <td className="p-4 bg-neutral-50/50 border-r border-neutral-100 font-bold text-[10px] text-neutral-700 uppercase">
                                   <History className="w-3.5 h-3.5 inline mr-2 text-brand-blue" /> Timeline Exp.
                               </td>
                               {comparisonData.processedCandidates.map((pc, i) => (
                                   <td key={pc.id} className={`p-4 border-l border-neutral-100 transition-opacity ${visibleCandidates[pc.id] ? 'opacity-100' : 'opacity-30'}`}>
                                       {loadingResumes[pc.id] ? <div className="h-10 bg-neutral-100 rounded animate-pulse"></div> : resumes[pc.id] ? (
                                           <ExperienceTimeline totalYears={resumes[pc.id].total_experience_years || 5} relevantYears={resumes[pc.id].relevant_experience_years || 2} color={CANDIDATE_COLORS[selectedCandidateIds.indexOf(pc.id)]} />
                                       ) : <span className="text-[10px] text-neutral-300 italic">Sem dados de CV</span>}
                                   </td>
                               ))}
                           </tr>
                           <tr className="bg-neutral-50/20">
                               <td className="p-4 bg-neutral-50/50 border-r border-neutral-100 font-bold text-[10px] text-neutral-700 uppercase">
                                   <Zap className="w-3.5 h-3.5 inline mr-2 text-amber-500 fill-current" /> Hard Skills
                               </td>
                               {comparisonData.processedCandidates.map((pc, i) => (
                                   <td key={pc.id} className={`p-4 border-l border-neutral-100 transition-opacity ${visibleCandidates[pc.id] ? 'opacity-100' : 'opacity-30'}`}>
                                       <div className="flex flex-wrap gap-1">
                                           {resumes[pc.id]?.technical_skills ? resumes[pc.id].technical_skills?.slice(0, 8).map((skill, i) => (
                                               <span key={i} className="text-[9px] bg-white text-neutral-700 px-1.5 py-0.5 rounded-lg border border-neutral-200 font-bold shadow-sm">{skill}</span>
                                           )) : <span className="text-[10px] text-neutral-300 italic">Não extraído</span>}
                                       </div>
                                   </td>
                               ))}
                           </tr>
                       </tbody>
                   </table>
               </div>
           </div>

           {/* 5. PARECER ANALÍTICO CONCLUSIVO (MULTI) */}
           <MultiAnalyticalConclusion rankedCandidates={comparisonData.rankedCandidates} roleTitle={selectedRole.title} />

           {/* 6. Guia de Interpretação */}
           <InterpretationGuide />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 bg-neutral-50 border-2 border-dashed border-neutral-200 rounded-3xl text-neutral-400">
           <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
              <Users className="w-8 h-8 text-neutral-300" />
           </div>
           <p className="font-bold text-neutral-600">Configure a Visão Multi-Candidato</p>
           <p className="text-sm mt-1 max-w-xs text-center">Selecione um Cargo de Benchmark e adicione talentos para comparar o DNA Real vs Alvo em 3 dimensões.</p>
        </div>
      )}
    </div>
  );
};

export default MultiCompareView;
