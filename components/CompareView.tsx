
import React, { useMemo, useState } from 'react';
import { JobRole, CandidateReport, ComparisonItem } from '../types';
import { Target, Users, Star, LayoutGrid, Award, ShieldCheck, BarChart3, Brain, Compass, AlertCircle, ArrowRight, ArrowDown, FileText, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { normalizeReport, NormalizedReport } from '../utils/normalizeReport';
import { buildFullComparison } from '../utils/comparisonUtils';
import RadarChartWrapper from './RadarChartWrapper';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine, LabelList, Legend } from 'recharts';

interface CompareViewProps {
    roles: JobRole[];
    reports: CandidateReport[];
    selectedRoleId: string;
    onRoleChange: (id: string) => void;
    candidateA: string;
    onCandidateAChange: (id: string) => void;
    // Legacy props ignored
    radarData?: any; 
    riskData?: any;
}

// --- VISUAL COMPONENTS ---

const GlobalFitCard = ({ score }: { score: number }) => {
    let color = 'text-emerald-600';
    let label = 'Alta Aderência';
    if(score < 60) { color = 'text-red-600'; label = 'Baixa Aderência'; }
    else if(score < 80) { color = 'text-amber-600'; label = 'Aderência Parcial'; }

    return (
        <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm flex items-center justify-between">
            <div>
                <h3 className="text-xs font-black text-neutral-400 uppercase tracking-widest">Fit Global (Unificado)</h3>
                <p className="text-xs text-neutral-500 mt-1">Média ponderada: Attribute + DISC + Values</p>
            </div>
            <div className="text-right">
                <span className={`block text-4xl font-black ${color}`}>{score}%</span>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${color}`}>{label}</span>
            </div>
        </div>
    );
};

const AnalyticalConclusion = ({ items, fitGlobal, candidateName, roleTitle }: { items: ComparisonItem[], fitGlobal: number, candidateName: string, roleTitle: string }) => {
    const strengths = items.filter(i => i.status === 'aligned' || i.fit > 85).map(i => i.label);
    const risks = items.filter(i => i.status === 'critical' || i.fit < 50).map(i => i.label);
    
    // Lógica de Recomendação
    let recommendation = "";
    let style = "";
    
    if (fitGlobal >= 80) {
        recommendation = "Recomendado para Contratação/Movimentação";
        style = "border-emerald-500 bg-emerald-50 text-emerald-800";
    } else if (fitGlobal >= 60) {
        recommendation = "Recomendado com Plano de Desenvolvimento (PDI)";
        style = "border-amber-500 bg-amber-50 text-amber-800";
    } else {
        recommendation = "Alto Risco de Performance - Não Recomendado";
        style = "border-red-500 bg-red-50 text-red-800";
    }

    return (
        <div className="bg-white rounded-[2rem] border border-neutral-200 shadow-lg overflow-hidden mt-12 mb-12">
            <div className="bg-[#002855] px-8 py-6 text-white flex justify-between items-center">
                <h3 className="text-lg font-bold flex items-center gap-3">
                    <FileText className="w-6 h-6 text-brand-accent" /> Parecer Analítico Conclusivo
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">Gerado Automaticamente</span>
            </div>
            <div className="p-8 md:p-10 space-y-8">
                
                {/* Resumo Executivo */}
                <div>
                    <h4 className="text-sm font-black text-neutral-400 uppercase tracking-widest mb-3">Síntese do Perfil</h4>
                    <p className="text-base text-neutral-700 leading-relaxed">
                        O candidato <strong>{candidateName}</strong> apresenta um índice de aderência global de <strong>{fitGlobal}%</strong> para a posição de <strong>{roleTitle}</strong>. 
                        A análise estrutural indica {fitGlobal > 75 ? 'alta' : fitGlobal > 50 ? 'moderada' : 'baixa'} compatibilidade entre o estilo natural de tomada de decisão (Axiologia), o ritmo comportamental (DISC) e os motivadores internos (Values) em relação ao benchmark estabelecido.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Pontos de Alavancagem */}
                    <div className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100">
                        <h4 className="text-xs font-black text-emerald-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4" /> Pontos de Alavancagem
                        </h4>
                        <ul className="space-y-2">
                            {strengths.slice(0, 5).map((s, i) => (
                                <li key={i} className="text-sm text-neutral-700 flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 shrink-0"></span>
                                    {s}
                                </li>
                            ))}
                            {strengths.length === 0 && <li className="text-sm text-neutral-500 italic">Nenhum ponto de destaque significativo detectado.</li>}
                        </ul>
                    </div>

                    {/* Pontos de Atenção */}
                    <div className="bg-red-50/50 p-6 rounded-2xl border border-red-100">
                        <h4 className="text-xs font-black text-red-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" /> Pontos de Atenção (Gaps)
                        </h4>
                        <ul className="space-y-2">
                            {risks.slice(0, 5).map((r, i) => (
                                <li key={i} className="text-sm text-neutral-700 flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 shrink-0"></span>
                                    {r}
                                </li>
                            ))}
                            {risks.length === 0 && <li className="text-sm text-neutral-500 italic">Nenhum gap crítico detectado.</li>}
                        </ul>
                    </div>
                </div>

                {/* Veredito */}
                <div className={`p-6 rounded-xl border-l-4 ${style} flex flex-col md:flex-row items-center justify-between gap-4`}>
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1 block">Recomendação do Sistema</span>
                        <span className="text-xl font-bold">{recommendation}</span>
                    </div>
                    <div className="text-right">
                        <span className="text-xs font-medium opacity-80 block">Baseado no Fit Global</span>
                        <span className="text-3xl font-black">{fitGlobal}%</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const UnifiedComparisonTable = ({ items }: { items: ComparisonItem[] }) => {
    // Sort by Delta (Absolute) descending to show critical gaps first
    const sorted = [...items].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

    return (
        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-neutral-50/50 border-b border-neutral-100 flex justify-between items-center">
                <h3 className="font-bold text-neutral-800 flex items-center gap-2 text-sm uppercase tracking-wide">
                    <LayoutGrid className="w-4 h-4 text-brand-blue" /> Detalhamento de Gaps (Prioridade)
                </h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b border-neutral-100 text-[10px] font-black uppercase tracking-widest text-neutral-400 bg-white">
                            <th className="px-6 py-3">Dimensão</th>
                            <th className="px-6 py-3 text-center">Candidato</th>
                            <th className="px-6 py-3 text-center">Alvo (Benchmark)</th>
                            <th className="px-6 py-3 text-center">Gap (Delta)</th>
                            <th className="px-6 py-3 text-right">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-50">
                        {sorted.map((item, idx) => {
                            const isCritical = item.status === 'critical';
                            return (
                                <tr key={idx} className={`hover:bg-neutral-50 transition-colors ${isCritical ? 'bg-red-50/30' : ''}`}>
                                    <td className="px-6 py-3">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-neutral-700">{item.label}</span>
                                            <span className="text-[9px] text-neutral-400 uppercase tracking-wider">{item.domain}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3 text-center font-mono font-bold text-neutral-600">
                                        {item.domain === 'value' ? item.candidate_score.toFixed(0) : (item.candidate_score / 10).toFixed(1)}
                                    </td>
                                    <td className="px-6 py-3 text-center font-mono text-neutral-400">
                                        {item.domain === 'value' ? item.benchmark_score.toFixed(0) : (item.benchmark_score / 10).toFixed(1)}
                                    </td>
                                    <td className="px-6 py-3 text-center">
                                        <span className={`font-mono font-black ${item.delta < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                            {item.delta > 0 ? '+' : ''}{item.domain === 'value' ? item.delta.toFixed(0) : (item.delta / 10).toFixed(1)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        {isCritical ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-100 text-red-700 text-[10px] font-black uppercase">
                                                <AlertCircle className="w-3 h-3" /> Crítico
                                            </span>
                                        ) : item.status === 'moderate' ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-100 text-amber-700 text-[10px] font-black uppercase">
                                                Moderado
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase">
                                                Alinhado
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// Cores Oficiais DISC Innermetrix
const DISC_COLORS = {
    D: '#EF4444', // Red (Dominance)
    I: '#EAB308', // Yellow/Gold (Influence)
    S: '#10B981', // Green (Stability)
    C: '#3B82F6'  // Blue (Caution/Compliance)
};

const DiscComparisonChart = ({ normalizedReport, benchmarkDisc }: { normalizedReport: NormalizedReport, benchmarkDisc: any }) => {
    // Extrai Natural e Adaptado do report normalizado
    const natural = normalizedReport.disc_full?.natural || normalizedReport.disc_full?.estilo_natural || normalizedReport.disc;
    const adapted = normalizedReport.disc_full?.adapted || normalizedReport.disc_full?.estilo_adaptado || normalizedReport.disc;
    
    // Benchmark safe check
    const bench = benchmarkDisc || { D: 50, I: 50, S: 50, C: 50 };

    const data = ['D', 'I', 'S', 'C'].map(k => ({
        name: k,
        Natural: Number(natural[k as keyof typeof natural] || 0),
        Adaptado: Number(adapted[k as keyof typeof adapted] || 0),
        Benchmark: Number(bench[k] || 50),
        fillColor: DISC_COLORS[k as keyof typeof DISC_COLORS]
    }));

    return (
        <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm flex flex-col h-[400px]">
            <div className="flex justify-between items-center mb-6">
                <h4 className="text-xs font-black text-neutral-500 uppercase tracking-widest flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-brand-blue" /> Estilo Comportamental (DISC)
                </h4>
                <div className="flex gap-4 text-[9px] font-bold uppercase text-neutral-400">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-neutral-800"></span> Natural</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-neutral-200 border border-neutral-300"></span> Adaptado</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-neutral-400"></span> Alvo (Benchmark)</span>
                </div>
            </div>
            
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 14, fontWeight: 900, fill: '#64748B' }} 
                        axisLine={false} 
                        tickLine={false}
                    />
                    <YAxis domain={[0, 100]} hide />
                    <Tooltip 
                        cursor={{fill: 'transparent'}} 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} 
                    />
                    
                    {/* Barra de Estilo Natural (Sólida) */}
                    <Bar dataKey="Natural" radius={[4, 4, 0, 0]} animationDuration={1500}>
                        {data.map((entry, index) => (
                            <Cell key={`cell-nat-${index}`} fill={entry.fillColor} />
                        ))}
                        <LabelList dataKey="Natural" position="top" style={{ fontSize: 10, fontWeight: 800, fill: '#64748B' }} />
                    </Bar>

                    {/* Barra de Estilo Adaptado (Clara) */}
                    <Bar dataKey="Adaptado" radius={[4, 4, 0, 0]} animationDuration={1500}>
                        {data.map((entry, index) => (
                            <Cell key={`cell-adp-${index}`} fill={entry.fillColor} fillOpacity={0.3} stroke={entry.fillColor} strokeWidth={1} strokeDasharray="4 4"/>
                        ))}
                    </Bar>

                    {/* Barra do Alvo (Benchmark) */}
                    <Bar dataKey="Benchmark" radius={[4, 4, 0, 0]} animationDuration={1500} fill="#94a3b8">
                        <LabelList dataKey="Benchmark" position="top" style={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} />
                    </Bar>

                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

const ValuesComparisonCards = ({ items }: { items: ComparisonItem[] }) => {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {items.map((item) => (
                <div key={item.key} className={`p-3 rounded-xl border ${item.fit >= 70 ? 'bg-emerald-50/50 border-emerald-100' : item.fit >= 40 ? 'bg-amber-50/50 border-amber-100' : 'bg-red-50/50 border-red-100'}`}>
                    <p className="text-[10px] font-black uppercase text-neutral-500 mb-1">{item.label}</p>
                    <div className="flex justify-between items-end">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-neutral-400">Score: {item.candidate_score.toFixed(0)}</span>
                            <span className={`text-sm font-black ${item.fit >= 70 ? 'text-emerald-700' : item.fit >= 40 ? 'text-amber-700' : 'text-red-700'}`}>
                                {item.fit >= 70 ? 'Alinhado' : item.fit >= 40 ? 'Desvio' : 'Oposto'}
                            </span>
                        </div>
                        <Compass className={`w-4 h-4 ${item.fit >= 70 ? 'text-emerald-400' : 'text-red-400'}`} />
                    </div>
                </div>
            ))}
        </div>
    );
};

// --- MAIN COMPONENT ---

const CompareView: React.FC<CompareViewProps> = ({ 
    roles, reports, selectedRoleId, onRoleChange, candidateA, onCandidateAChange 
}) => {
    // 1. Data Preparation
    const activeRole = useMemo(() => roles.find(r => r.id === selectedRoleId), [roles, selectedRoleId]);
    const rawReport = useMemo(() => reports.find(r => r.id === candidateA), [reports, candidateA]);
    
    // 2. Normalization & Comparison Pipeline
    const comparisonData = useMemo(() => {
        if (!rawReport || !activeRole) return { items: [], fitGlobal: 0, normalized: null };
        
        const normalized = normalizeReport(rawReport);
        if (!normalized) return { items: [], fitGlobal: 0, normalized: null };

        const items = buildFullComparison(normalized, activeRole);
        
        // Calculate Global Weighted Fit
        const totalFit = items.reduce((acc, item) => acc + item.fit, 0);
        const fitGlobal = items.length > 0 ? Math.round(totalFit / items.length) : 0;

        return { items, fitGlobal, normalized };
    }, [rawReport, activeRole]);

    // 3. Segment Data for Visualization
    const attributeItems = comparisonData.items.filter(i => i.domain === 'attribute');
    const valueItems = comparisonData.items.filter(i => i.domain === 'value');

    // Prepare Radar Data specifically
    const radarData = attributeItems.map(i => ({
        attribute: i.label,
        candidate: i.candidate_score / 10, // Back to 0-10 for Radar
        benchmark: i.benchmark_score / 10,
        fullMark: 10
    }));

    // Check for incompatible report type
    const isNR1Only = rawReport?.report_type === 'nr1' || rawReport?.domain === 'nr1' || (rawReport && (!rawReport.disc && !rawReport.values_index));

    return (
        <div className="space-y-8 animate-fadeIn max-w-6xl mx-auto pb-24 text-neutral-700">
            
            {/* --- HEADER SELECTORS --- */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm flex flex-col justify-between min-h-[120px]">
                    <div className="space-y-2">
                        <label className="text-xs font-black text-neutral-400 uppercase tracking-[0.2em] block">Cargo de Referência (Alvo)</label>
                        <div className="relative">
                            <Target className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-blue" />
                            <select 
                                value={selectedRoleId} 
                                onChange={(e) => onRoleChange(e.target.value)}
                                className="w-full pl-8 pr-4 py-3 bg-transparent text-base font-extrabold text-neutral-900 outline-none appearance-none cursor-pointer border-b-2 border-neutral-50 focus:border-brand-blue transition-colors"
                            >
                                <option value="">Selecionar Cargo...</option>
                                {roles.map(role => (
                                    <option key={role.id} value={role.id}>{role.title}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm flex flex-col justify-between min-h-[120px]">
                    <div className="space-y-2">
                        <label className="text-xs font-black text-neutral-400 uppercase tracking-[0.2em] block">Candidato em Análise</label>
                        <div className="relative">
                            <Users className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-blue" />
                            <select 
                                value={candidateA} 
                                onChange={(e) => onCandidateAChange(e.target.value)}
                                className="w-full pl-8 pr-4 py-3 bg-transparent text-base font-extrabold text-neutral-900 outline-none appearance-none cursor-pointer border-b-2 border-neutral-50 focus:border-brand-blue transition-colors"
                            >
                                <option value="">Selecionar Candidato...</option>
                                {reports.filter(r => r.status === 'completed').map(report => (
                                    <option key={report.id} value={report.id}>{report.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- CONTENT AREA --- */}
            {isNR1Only && rawReport ? (
                <div className="bg-amber-50 border border-amber-200 rounded-[2rem] p-12 text-center flex flex-col items-center justify-center animate-fadeIn">
                    <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mb-6 shadow-sm text-amber-600">
                        <AlertTriangle className="w-10 h-10" />
                    </div>
                    <h3 className="text-xl font-black text-amber-800 tracking-tight mb-2">Relatório Incompatível com Comparação 360º</h3>
                    <p className="text-amber-700 max-w-lg mx-auto text-sm leading-relaxed">
                        O candidato selecionado (<strong>{rawReport.name}</strong>) possui um relatório do tipo <strong>NR-1 / Recrutamento</strong>, que não contém os dados completos de DISC e Valores necessários para esta análise profunda.
                    </p>
                    <p className="mt-4 text-xs font-bold text-amber-600 uppercase tracking-widest">
                        Sugestão: Utilize a aba "Gestão de Riscos (NR-1)" para analisar este perfil.
                    </p>
                </div>
            ) : activeRole && rawReport && comparisonData.normalized ? (
                <div className="space-y-8">
                    
                    {/* 1. Global Fit Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <GlobalFitCard score={comparisonData.fitGlobal} />
                        <div className="md:col-span-2 bg-brand-lightBlue/30 border border-brand-blue/10 p-6 rounded-2xl flex items-center gap-4">
                            <ShieldCheck className="w-8 h-8 text-brand-blue" />
                            <div className="text-xs text-brand-textBlue leading-relaxed">
                                <strong className="block uppercase mb-1">Análise Integrada</strong>
                                Esta comparação utiliza os 3 eixos fundamentais (Attribute Index, DISC e Values). O Fit Global é uma média ponderada que considera não apenas a capacidade (Attributes), mas também o estilo (DISC) e a motivação (Values) para garantir permanência no cargo.
                            </div>
                        </div>
                    </div>

                    {/* 2. Visualizations per Domain */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Left Column: Attribute Radar */}
                        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm flex flex-col">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="text-xs font-black text-neutral-500 uppercase tracking-widest flex items-center gap-2">
                                    <Brain className="w-4 h-4 text-brand-blue" /> Estrutura de Decisão (Axiologia)
                                </h4>
                            </div>
                            <div className="flex-1 min-h-[350px]">
                                <RadarChartWrapper data={radarData} />
                            </div>
                        </div>

                        {/* Right Column: DISC & Values */}
                        <div className="lg:col-span-5 space-y-6">
                            <DiscComparisonChart 
                                normalizedReport={comparisonData.normalized} 
                                benchmarkDisc={activeRole.metadata?.disc_preferences} 
                            />
                            
                            <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm">
                                <h4 className="text-xs font-black text-neutral-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Compass className="w-4 h-4 text-brand-blue" /> Aderência Cultural (Values)
                                </h4>
                                <ValuesComparisonCards items={valueItems} />
                            </div>
                        </div>
                    </div>

                    {/* 3. Detailed Data Table */}
                    <UnifiedComparisonTable items={comparisonData.items} />

                    {/* 4. PARECER ANALÍTICO CONCLUSIVO (NOVO) */}
                    <AnalyticalConclusion 
                        items={comparisonData.items} 
                        fitGlobal={comparisonData.fitGlobal} 
                        candidateName={rawReport.name || 'Candidato'} 
                        roleTitle={activeRole.title}
                    />

                </div>
            ) : (
                <div className="bg-white border-2 border-dashed border-neutral-200 rounded-[2rem] p-32 text-center flex flex-col items-center justify-center opacity-80 mt-6 shadow-inner animate-fadeIn">
                    <div className="w-24 h-24 bg-neutral-50 rounded-full flex items-center justify-center mb-8 text-neutral-300 shadow-sm">
                        <Award className="w-12 h-12" />
                    </div>
                    <h3 className="text-2xl font-black text-neutral-800 tracking-tight">Comparador de Aderência 360º</h3>
                    <p className="text-neutral-500 max-w-sm mx-auto mt-3 font-medium text-lg">Selecione o Cargo e o Candidato para iniciar a triangulação de dados (Attributes, DISC e Values).</p>
                </div>
            )}
        </div>
    );
};

export default CompareView;
