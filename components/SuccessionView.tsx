
import React, { useState, useMemo } from 'react';
import { CandidateReport, JobRole, ComparisonItem } from '../types';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { GitPullRequest, ArrowRight, Target, AlertTriangle, CheckCircle2, BookOpen, Users, BrainCircuit, Clock, TrendingUp, PieChart, Compass, Brain } from 'lucide-react';
import { normalizeReport } from '../utils/normalizeReport';
import { buildFullComparison } from '../utils/comparisonUtils';

interface SuccessionViewProps {
  reports: CandidateReport[];
  roles: JobRole[];
}

const SuccessionView: React.FC<SuccessionViewProps> = ({ reports, roles }) => {
  const [selectedCandidateId, setSelectedCandidateId] = useState('');
  const [targetRoleId, setTargetRoleId] = useState('');

  // 1. Derivar Objetos Selecionados
  const candidate = useMemo(() => reports.find(r => r.id === selectedCandidateId), [reports, selectedCandidateId]);
  const targetRole = useMemo(() => roles.find(r => r.id === targetRoleId), [roles, targetRoleId]);

  // 2. Calcular Dados Unificados (ADV Logic)
  const analysis = useMemo(() => {
    if (!candidate || !targetRole) return null;

    // Normaliza o candidato para garantir acesso a DISC/Values/Attributes
    const normalized = normalizeReport(candidate);
    if (!normalized) return null;

    // Gera comparação completa (todos os itens)
    const comparisonItems = buildFullComparison(normalized, targetRole);

    // Separação por Domínio
    const attrItems = comparisonItems.filter(i => i.domain === 'attribute');
    const discItems = comparisonItems.filter(i => i.domain === 'disc');
    const valueItems = comparisonItems.filter(i => i.domain === 'value');

    // Cálculo de Fit por Dimensão
    const calcAvg = (items: ComparisonItem[]) => items.length > 0 ? Math.round(items.reduce((acc, i) => acc + i.fit, 0) / items.length) : 0;
    
    const fits = {
        global: calcAvg(comparisonItems),
        attribute: calcAvg(attrItems),
        disc: calcAvg(discItems),
        value: calcAvg(valueItems)
    };

    // Identificação de Gaps Críticos (Fit < 60 ou Delta alto)
    const criticalGaps = comparisonItems
        .filter(i => i.fit < 65)
        .sort((a, b) => a.fit - b.fit); // Piores primeiro

    // Dados para o Radar (Apenas Attributes)
    // Garante que candidate_score e benchmark_score existam e divide por 10 para escala 0-10
    const radarData = attrItems.map(item => ({
        attribute: item.label,
        candidate: (item.candidate_score || 0) / 10, 
        target: (item.benchmark_score || 0) / 10,
        fullMark: 10
    }));

    // Estimativa de Ramp-up (Tempo de Adaptação)
    let rampUpTime = "Imediato";
    let rampUpColor = "text-emerald-600 bg-emerald-50 border-emerald-100";
    
    if (fits.global < 50) {
        rampUpTime = "> 12 Meses";
        rampUpColor = "text-red-600 bg-red-50 border-red-100";
    } else if (fits.global < 70) {
        rampUpTime = "6 a 9 Meses";
        rampUpColor = "text-amber-600 bg-amber-50 border-amber-100";
    } else if (fits.global < 85) {
        rampUpTime = "3 a 6 Meses";
        rampUpColor = "text-blue-600 bg-blue-50 border-blue-100";
    }

    return { 
        radarData, 
        criticalGaps, 
        fits, 
        rampUp: { time: rampUpTime, color: rampUpColor },
        discItems,
        valueItems
    };
  }, [candidate, targetRole]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur shadow-xl border border-neutral-200 p-3 rounded-lg text-xs z-50">
          <p className="font-bold text-neutral-800 mb-2 border-b border-neutral-100 pb-1 uppercase tracking-wider">{label}</p>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4 text-brand-blue">
               <span className="font-medium">Atual (Cand):</span>
               <span className="font-bold">{payload[1]?.value?.toFixed(1)}</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-neutral-500">
               <span className="font-medium">Alvo (Cargo):</span>
               <span className="font-bold">{payload[0]?.value?.toFixed(1)}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-neutral-800 flex items-center gap-2">
          <GitPullRequest className="w-6 h-6 text-brand-blue" />
          Mapeamento de Sucessão (ADV)
        </h2>
        <p className="text-neutral-500 text-sm">
          Análise preditiva de transição de carreira baseada em 3 dimensões (Axiologia, DISC, Valores).
        </p>
      </div>

      {/* Selectors */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100 grid grid-cols-1 md:grid-cols-7 gap-4 items-end">
          <div className="md:col-span-3">
             <label className="text-xs font-bold text-neutral-500 uppercase block mb-1.5 ml-1">Colaborador (Sucessor)</label>
             <div className="relative">
                <select 
                    value={selectedCandidateId}
                    onChange={(e) => setSelectedCandidateId(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:border-brand-blue outline-none appearance-none transition-all"
                >
                    <option value="">Selecione quem será promovido...</option>
                    {reports.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
             </div>
          </div>

          <div className="md:col-span-1 flex justify-center pb-3">
              <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400">
                  <ArrowRight className="w-4 h-4" />
              </div>
          </div>

          <div className="md:col-span-3">
             <label className="text-xs font-bold text-neutral-500 uppercase block mb-1.5 ml-1">Cargo Alvo (Futuro)</label>
             <div className="relative">
                <select 
                    value={targetRoleId}
                    onChange={(e) => setTargetRoleId(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:border-brand-blue outline-none appearance-none transition-all"
                >
                    <option value="">Selecione o cargo de destino...</option>
                    {roles.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
                </select>
                <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
             </div>
          </div>
      </div>

      {analysis ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: KPI & Radar */}
            <div className="lg:col-span-5 space-y-6">
                
                {/* Readiness Card */}
                <div className="bg-gradient-to-br from-[#002855] to-[#001226] text-white p-8 rounded-[2rem] shadow-xl relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-6">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-blue-200">Índice de Prontidão (Unified)</h3>
                            <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${analysis.rampUp.color.replace('bg-', 'bg-opacity-20 ')}`}>
                                Ramp-up: {analysis.rampUp.time}
                            </div>
                        </div>
                        <div className="flex items-center gap-4 mb-4">
                            <span className="text-6xl font-black tracking-tighter">{analysis.fits.global}%</span>
                            <div className="flex flex-col text-xs text-blue-200 font-medium">
                                <span>Média ponderada</span>
                                <span>das 3 dimensões</span>
                            </div>
                        </div>
                        
                        {/* Mini Bars for Dimensions */}
                        <div className="space-y-3 mt-6 pt-6 border-t border-white/10">
                            <div className="flex items-center gap-3">
                                <Brain className="w-4 h-4 text-blue-300" />
                                <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-400" style={{ width: `${analysis.fits.attribute}%` }}></div>
                                </div>
                                <span className="text-xs font-bold w-8 text-right">{analysis.fits.attribute}%</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <PieChart className="w-4 h-4 text-red-300" />
                                <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-red-400" style={{ width: `${analysis.fits.disc}%` }}></div>
                                </div>
                                <span className="text-xs font-bold w-8 text-right">{analysis.fits.disc}%</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Compass className="w-4 h-4 text-purple-300" />
                                <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-purple-400" style={{ width: `${analysis.fits.value}%` }}></div>
                                </div>
                                <span className="text-xs font-bold w-8 text-right">{analysis.fits.value}%</span>
                            </div>
                        </div>
                    </div>
                    {/* Decorative Blobs */}
                    <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl"></div>
                </div>

                {/* Radar Chart - CORRIGIDO ALTURA E RENDERIZAÇÃO */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-100 h-[450px] flex flex-col">
                    <h3 className="font-bold text-neutral-800 mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                        <Target className="w-4 h-4 text-neutral-400" /> Estrutura de Decisão (Gap)
                    </h3>
                    <div className="flex-1 w-full min-h-0 relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={analysis.radarData}>
                                <PolarGrid stroke="#e5e5e5" />
                                <PolarAngleAxis dataKey="attribute" tick={{ fill: '#64748B', fontSize: 9, fontWeight: 700 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
                                <RechartsTooltip content={<CustomTooltip />} cursor={false} />
                                <Legend wrapperStyle={{ fontSize: '10px', marginTop: '5px' }} iconType="circle"/>
                                
                                <Radar
                                    name="Alvo (Cargo)"
                                    dataKey="target"
                                    stroke="#94A3B8"
                                    strokeWidth={2}
                                    strokeDasharray="4 4"
                                    fill="#94A3B8"
                                    fillOpacity={0.1}
                                />
                                <Radar
                                    name="Candidato"
                                    dataKey="candidate"
                                    stroke="#002855"
                                    strokeWidth={3}
                                    fill="#002855"
                                    fillOpacity={0.1}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Right Column: Critical Gaps & AI Insight */}
            <div className="lg:col-span-7 space-y-6">
                
                {/* Gaps List */}
                <div className="bg-white rounded-[2rem] shadow-sm border border-neutral-100 overflow-hidden flex flex-col h-full max-h-[600px]">
                    <div className="px-8 py-6 border-b border-neutral-100 bg-neutral-50/50 flex justify-between items-center shrink-0">
                        <h3 className="font-bold text-neutral-800 flex items-center gap-2 text-sm uppercase tracking-wider">
                            <AlertTriangle className="w-5 h-5 text-amber-500" /> Gaps Críticos de Sucessão
                        </h3>
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${analysis.criticalGaps.length === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                            {analysis.criticalGaps.length} Pontos de Atenção
                        </span>
                    </div>
                    
                    <div className="overflow-y-auto custom-scrollbar p-0">
                        {analysis.criticalGaps.length === 0 ? (
                            <div className="p-12 text-center flex flex-col items-center justify-center h-full">
                                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
                                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                                </div>
                                <p className="text-neutral-800 font-bold">Nenhum gap impeditivo!</p>
                                <p className="text-sm text-neutral-500 mt-1">O perfil atende aos requisitos essenciais para a transição.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-neutral-50">
                                {analysis.criticalGaps.slice(0, 6).map((gap, idx) => (
                                    <div key={idx} className="p-6 hover:bg-neutral-50 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                {/* Icon based on Domain */}
                                                {gap.domain === 'attribute' && <Brain className="w-4 h-4 text-blue-500" />}
                                                {gap.domain === 'disc' && <PieChart className="w-4 h-4 text-red-500" />}
                                                {gap.domain === 'value' && <Compass className="w-4 h-4 text-purple-500" />}
                                                <h4 className="font-bold text-neutral-800 text-sm">{gap.label}</h4>
                                            </div>
                                            <span className="text-[10px] font-black uppercase text-red-600 bg-red-50 px-2 py-1 rounded border border-red-100">
                                                Gap -{Math.abs(gap.delta).toFixed(0)}
                                            </span>
                                        </div>
                                        
                                        <div className="flex items-center gap-3 text-xs mb-3">
                                            <span className="text-neutral-500 w-16">Atual: <strong className="text-neutral-800">{gap.domain === 'value' ? gap.candidate_score.toFixed(0) : (gap.candidate_score / 10).toFixed(1)}</strong></span>
                                            <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden relative">
                                                <div className="absolute top-0 bottom-0 w-0.5 bg-neutral-800 z-10" style={{ left: `${gap.benchmark_score}%` }} title="Alvo"></div>
                                                <div className={`h-full rounded-full ${gap.delta < 0 ? 'bg-red-500' : 'bg-amber-500'}`} style={{ width: `${gap.candidate_score}%` }}></div>
                                            </div>
                                            <span className="text-neutral-500 w-16 text-right">Alvo: <strong className="text-neutral-800">{gap.domain === 'value' ? gap.benchmark_score.toFixed(0) : (gap.benchmark_score / 10).toFixed(1)}</strong></span>
                                        </div>

                                        <div className="flex gap-3 bg-neutral-50 p-3 rounded-lg border border-neutral-100">
                                            <div className="mt-0.5"><BookOpen className="w-3.5 h-3.5 text-neutral-400" /></div>
                                            <div>
                                                <p className="text-[10px] font-bold text-neutral-500 uppercase mb-0.5">Plano de Ação Sugerido</p>
                                                <p className="text-xs text-neutral-600 leading-relaxed">
                                                    {gap.domain === 'attribute' ? 'Treinamento prático e mentoring focado em situações reais.' : 
                                                     gap.domain === 'disc' ? 'Coaching comportamental para adaptação de estilo de comunicação.' :
                                                     'Alinhamento de expectativas e recompensas (difícil desenvolvimento).'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* AI Insight Placeholder */}
                <div className="bg-purple-50 border border-purple-100 p-6 rounded-2xl flex items-start gap-4">
                    <div className="p-3 bg-white rounded-xl shadow-sm text-purple-600 shrink-0">
                        <BrainCircuit className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-purple-900 mb-1 text-sm">Síntese de Inteligência</h4>
                        <p className="text-xs text-purple-800 leading-relaxed opacity-90">
                            A transição de <strong>{candidate.name.split(' ')[0]}</strong> para <strong>{targetRole.title}</strong> apresenta um desafio de {analysis.criticalGaps.length > 2 ? 'Alta' : 'Baixa'} complexidade. 
                            O principal obstáculo reside no eixo {analysis.criticalGaps[0]?.domain.toUpperCase() || 'Técnico'}, exigindo um plano de {analysis.rampUp.time}.
                        </p>
                    </div>
                </div>
            </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 bg-neutral-50 border-2 border-dashed border-neutral-200 rounded-[3rem] text-neutral-400 animate-fadeIn">
           <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm">
              <TrendingUp className="w-10 h-10 text-neutral-300" />
           </div>
           <h3 className="text-xl font-bold text-neutral-600 mb-2">Simulador de Sucessão</h3>
           <p className="text-sm max-w-md text-center mb-8">
             Selecione um colaborador atual e um cargo de destino nos filtros acima para gerar a análise preditiva de fit e tempo de ramp-up.
           </p>
        </div>
      )}
    </div>
  );
};

export default SuccessionView;
