
import React, { useMemo, useState, useEffect } from "react";
import { 
    Brain, Sparkles, Loader2, Target, List, Download, LayoutGrid, 
    ArrowLeft, Printer, Mail, PieChart, BarChart3, Compass, 
    CheckCircle2, AlertTriangle, XCircle, Info, Building, Briefcase,
    Zap, Heart, Shield, Star, Users, ArrowRight, ChevronDown, ChevronUp, Scale, ShieldAlert,
    Bot, Quote, Lightbulb, FileCheck, AlertCircle, RefreshCw
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList, ReferenceLine } from 'recharts';
import { CandidateReport, JobRole, RadarDataPoint, AttributeIndexItem, MainAttributeItem, ComparisonItem } from '../types';
import { supabase } from '../supabaseClient';
import RadarChartWrapper from './RadarChartWrapper';
import DimensionalBarChart from './DimensionalBarChart';
import { getScoreFromMap, SYNONYM_MAP, riskAnalysisService } from '../services/riskAnalysisService';
import { normalizeReport, NormalizedReport } from '../utils/normalizeReport';
import { copilotService, PredictiveInsightResult } from '../services/copilotService';
import { buildFullComparison } from '../utils/comparisonUtils';

// --- CONFIGURAÇÕES VISUAIS E DE MAPEAMENTO ---

const VALUES_CONFIG: Record<string, { label: string, color: string, icon: any, desc: string }> = {
    'aesthetic': { label: 'Estética', color: 'text-purple-600 bg-purple-500', icon: Sparkles, desc: 'Valorização da forma, harmonia e expressão artística.' },
    'economic': { label: 'Econômica', color: 'text-emerald-600 bg-emerald-500', icon: BarChart3, desc: 'Foco em utilidade prática, retorno sobre investimento e eficiência.' },
    'individualistic': { label: 'Individualista', color: 'text-orange-600 bg-orange-500', icon: Star, desc: 'Desejo de independência, reconhecimento e liderança.' },
    'political': { label: 'Política', color: 'text-red-600 bg-red-500', icon: Target, desc: 'Busca por poder, controle e influência sobre os outros.' },
    'altruistic': { label: 'Altruísta', color: 'text-blue-600 bg-blue-500', icon: Heart, desc: 'Motivação para ajudar os outros e servir à comunidade.' },
    'regulatory': { label: 'Reguladora', color: 'text-slate-600 bg-slate-500', icon: Shield, desc: 'Respeito por tradições, regras, sistemas e ordem.' },
    'theoretical': { label: 'Teórica', color: 'text-yellow-600 bg-yellow-500', icon: Brain, desc: 'Paixão pelo conhecimento, verdade e aprendizado contínuo.' }
};

const DISC_CONFIG = {
    'D': { label: 'Dominância', color: '#EF4444', text: 'text-red-600', desc: 'Foco em problemas, desafios e poder.' },
    'I': { label: 'Influência', color: '#F59E0B', text: 'text-yellow-600', desc: 'Foco em pessoas, persuasão e otimismo.' },
    'S': { label: 'Estabilidade', color: '#10B981', text: 'text-green-600', desc: 'Foco em ritmo, segurança e harmonia.' },
    'C': { label: 'Cautela', color: '#3B82F6', text: 'text-blue-600', desc: 'Foco em regras, precisão e qualidade.' }
};

// --- HELPERS DISC ---

const calculateDiscProfile = (scores: { D: number, I: number, S: number, C: number }) => {
    // Ordena os fatores do maior para o menor
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const highFactors = sorted.filter(([_, score]) => score >= 50);
    
    // Se nenhum for alto (perfil achatado), pega o maior
    if (highFactors.length === 0) return sorted[0][0];
    
    // Retorna as letras dos fatores altos (ex: "DI", "C", "SC")
    return highFactors.map(f => f[0]).join('');
};

const getDiscDescription = (profile: string) => {
    const p = profile.substring(0, 2); // Pega as 2 primeiras letras no máximo
    const map: Record<string, string> = {
        'D': 'Direto, decisivo e focado em resultados rápidos. Tende a assumir o controle e gosta de desafios.',
        'I': 'Extrovertido, comunicativo e persuasivo. Gosta de interagir com pessoas e motivar o grupo.',
        'S': 'Paciente, leal e bom ouvinte. Valoriza a segurança, a harmonia e ambientes estáveis.',
        'C': 'Analítico, preciso e detalhista. Foca na qualidade, regras e procedimentos lógicos.',
        'DI': 'Empreendedor: Combina assertividade com persuasão. Move as coisas rapidamente através das pessoas.',
        'ID': 'Persuasivo: Usa charme e confiança para alcançar objetivos. Liderança carismática.',
        'DS': 'Realizador: Determinado e persistente. Foca no objetivo com tenacidade.',
        'SD': 'Determinado: Busca resultados de forma consistente e planejada.',
        'DC': 'Criativo: Foca em resultados com perfeccionismo. Alta exigência consigo e com os outros.',
        'CD': 'Cauteloso: Toma decisões baseadas em fatos e lógica rigorosa.',
        'IS': 'Relacionador: Amigável e compreensivo. Ótimo em construir pontes e manter o clima.',
        'SI': 'Conselheiro: Bom ouvinte e apoiador. Foca no bem-estar da equipe.',
        'IC': 'Articulador: Comunica detalhes com entusiasmo. Bom em apresentações técnicas.',
        'CI': 'Crítico: Analisa pessoas e processos com precisão.',
        'SC': 'Técnico: Metódico, paciente e orientado a processos. Busca a perfeição na execução.',
        'CS': 'Preciso: Segue normas e procedimentos com rigor e constância.'
    };
    return map[p] || map[p[0]] || 'Perfil equilibrado.';
};

const getGapAnalysis = (candScore: number, benchScore: number, label: string) => {
    const diff = candScore - benchScore;
    if (Math.abs(diff) <= 15) return { status: 'Alinhado', color: 'text-emerald-600', icon: CheckCircle2 };
    if (diff > 15) return { status: `Mais ${label} que o cargo`, color: 'text-amber-600', icon: ArrowRight };
    return { status: `Menos ${label} que o cargo`, color: 'text-red-500', icon: AlertTriangle };
};

// --- COMPONENTES AUXILIARES ---

const UnifiedComparisonTable = ({ items }: { items: ComparisonItem[] }) => {
    // Sort by Delta (Absolute) descending to show critical gaps first
    const sorted = [...items].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

    if (sorted.length === 0) return null;

    return (
        <div className="bg-white rounded-[2.5rem] border border-neutral-100 shadow-sm overflow-hidden mt-12">
            <div className="px-8 py-6 bg-neutral-50/50 border-b border-neutral-100 flex justify-between items-center">
                <h3 className="text-lg font-black text-neutral-800 flex items-center gap-2 uppercase tracking-widest">
                    <LayoutGrid className="w-5 h-5 text-brand-blue" /> Detalhamento de Gaps (Prioridade)
                </h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b border-neutral-100 text-[10px] font-black uppercase tracking-widest text-neutral-400 bg-white">
                            <th className="px-8 py-4">Dimensão</th>
                            <th className="px-6 py-4 text-center">Candidato</th>
                            <th className="px-6 py-4 text-center">Alvo (Benchmark)</th>
                            <th className="px-6 py-4 text-center">Gap (Delta)</th>
                            <th className="px-8 py-4 text-right">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-50">
                        {sorted.map((item, idx) => {
                            const isCritical = item.status === 'critical';
                            return (
                                <tr key={idx} className={`hover:bg-neutral-50 transition-colors ${isCritical ? 'bg-red-50/30' : ''}`}>
                                    <td className="px-8 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-neutral-700">{item.label}</span>
                                            <span className="text-[9px] text-neutral-400 uppercase tracking-wider">{item.domain}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center font-mono font-bold text-neutral-600">
                                        {item.domain === 'value' ? item.candidate_score.toFixed(0) : (item.candidate_score / 10).toFixed(1)}
                                    </td>
                                    <td className="px-6 py-4 text-center font-mono text-neutral-400">
                                        {item.domain === 'value' ? item.benchmark_score.toFixed(0) : (item.benchmark_score / 10).toFixed(1)}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`font-mono font-black ${item.delta < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                            {item.delta > 0 ? '+' : ''}{item.domain === 'value' ? item.delta.toFixed(0) : (item.delta / 10).toFixed(1)}
                                        </span>
                                    </td>
                                    <td className="px-8 py-4 text-right">
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

const FitGauge = ({ score }: { score: number }) => {
    const radius = 36;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;
    
    let color = 'text-emerald-500';
    if (score < 60) color = 'text-red-500';
    else if (score < 80) color = 'text-amber-500';

    return (
        <div className="relative w-24 h-24 flex items-center justify-center">
            <svg className="transform -rotate-90 w-full h-full">
                <circle cx="48" cy="48" r={radius} stroke="currentColor" strokeWidth="8" fill="transparent" className="text-neutral-100" />
                <circle cx="48" cy="48" r={radius} stroke="currentColor" strokeWidth="8" fill="transparent" 
                    className={`${color} transition-all duration-1000 ease-out`} 
                    strokeDasharray={circumference} 
                    strokeDashoffset={offset} 
                    strokeLinecap="round" 
                />
            </svg>
            <div className="absolute flex flex-col items-center">
                <span className="text-2xl font-black text-neutral-800">{score}%</span>
                <span className="text-[10px] font-bold text-neutral-400 uppercase">FIT GLOBAL</span>
            </div>
        </div>
    );
};

const AttributeRow: React.FC<{ label: string, score: number, benchmark: number }> = ({ label, score, benchmark }) => {
    const diff = score - benchmark;
    const isCritical = diff < -2;
    
    return (
        <div className="flex items-center gap-4 py-3 border-b border-neutral-50 last:border-0 group">
            <div className="w-32 text-xs font-bold text-neutral-600 truncate" title={label}>{label}</div>
            
            <div className="flex-1 relative h-2 bg-neutral-100 rounded-full overflow-hidden">
                {/* Benchmark Marker */}
                <div className="absolute top-0 bottom-0 w-0.5 bg-neutral-800 z-10" style={{ left: `${benchmark * 10}%` }} />
                
                {/* Score Bar */}
                <div 
                    className={`absolute top-0 bottom-0 rounded-full transition-all duration-700 ${score >= benchmark ? 'bg-emerald-500' : isCritical ? 'bg-red-500' : 'bg-amber-400'}`}
                    style={{ width: `${score * 10}%` }}
                />
            </div>
            
            <div className="w-20 text-right flex flex-col items-end">
                <span className="text-xs font-black text-neutral-800">{score.toFixed(1)}</span>
                <span className="text-[9px] text-neutral-400">Alvo: {benchmark.toFixed(1)}</span>
            </div>
        </div>
    );
};

// Componente Atualizado de Comparação de Valores
const ValueComparisonCard: React.FC<{ config: any, score: number, description?: string, bench: string | number }> = ({ config, score, description, bench }) => {
    // Normalização do Benchmark
    // Se for string: "alto" -> 85, "medio" -> 50, "baixo" -> 15. Se for número, usa o número.
    let benchValue = 50; 
    let benchLabel = "Médio";

    if (typeof bench === 'string') {
        const lower = bench.toLowerCase();
        if (lower.includes('alto') || lower.includes('high')) { benchValue = 85; benchLabel = "Alto"; }
        else if (lower.includes('baixo') || lower.includes('low')) { benchValue = 15; benchLabel = "Baixo"; }
        else { benchValue = 50; benchLabel = "Médio"; }
    } else if (typeof bench === 'number') {
        benchValue = bench <= 10 ? bench * 10 : bench; // Normaliza 0-10 para 0-100
        benchLabel = benchValue >= 70 ? "Alto" : benchValue <= 30 ? "Baixo" : "Médio";
    }

    const candidateValue = score <= 10 ? score * 10 : score;
    const textClass = config.color.split(' ')[0];
    const bgClass = config.color.split(' ')[1];

    // Lógica de Alinhamento
    // Se a diferença for pequena (<25%), está alinhado. Se for grande, atenção.
    const diff = Math.abs(candidateValue - benchValue);
    const isAligned = diff < 30;

    return (
        <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between h-full">
            <div>
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                        <config.icon className={`w-4 h-4 ${textClass}`} />
                        <span className="font-bold text-neutral-700 text-sm uppercase">{config.label}</span>
                    </div>
                    {isAligned ? (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                            <CheckCircle2 className="w-3 h-3" /> Alinhado
                        </div>
                    ) : (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                            <Scale className="w-3 h-3" /> Desvio
                        </div>
                    )}
                </div>
                
                <div className="space-y-4 mb-4">
                    {/* Barra do Candidato */}
                    <div>
                        <div className="flex justify-between items-end mb-1.5">
                            <span className="text-[10px] font-black text-neutral-400 uppercase tracking-wider">Candidato</span>
                            <span className={`text-lg font-black leading-none ${textClass}`}>{score.toFixed(1)}</span>
                        </div>
                        <div className="h-2 w-full bg-neutral-50 rounded-full overflow-hidden border border-neutral-100">
                            <div className={`h-full ${bgClass} rounded-full`} style={{ width: `${Math.min(100, candidateValue)}%` }}></div>
                        </div>
                    </div>

                    {/* Barra do Benchmark (Cargo) */}
                    <div>
                        <div className="flex justify-between items-end mb-1.5">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Cargo (Alvo)</span>
                            <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-medium text-slate-400 uppercase">{benchLabel}</span>
                                <span className="text-sm font-black text-slate-700 bg-slate-100 px-1.5 rounded">{benchValue.toFixed(0)}</span>
                            </div>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden relative border border-slate-200">
                            {/* Marcador de Alvo com cor forte */}
                            <div className="h-full bg-slate-600" style={{ width: `${benchValue}%` }}></div>
                            {/* Linha vertical de precisão */}
                            <div className="absolute top-0 bottom-0 w-0.5 bg-black z-10 opacity-20" style={{ left: `${benchValue}%` }}></div>
                        </div>
                    </div>
                </div>
            </div>

            <p className="text-[11px] text-neutral-500 leading-relaxed min-h-[40px] line-clamp-3 italic border-t border-neutral-50 pt-3 mt-1">
                {description || config.desc}
            </p>
        </div>
    );
};

// Componente Accordion para Atributos Detalhados
const GroupedAttributes = ({ items }: { items: any[] }) => {
    const grouped = useMemo(() => {
        const g: Record<string, any[]> = {};
        if (!items || !Array.isArray(items)) return g;

        items.forEach(item => {
            // Normaliza categoria: se não tiver, tenta inferir ou joga em Geral
            let cat = item.category || 'Competências Gerais';
            // Limpa strings sujas se necessário
            cat = cat.trim();
            if (!g[cat]) g[cat] = [];
            g[cat].push(item);
        });

        // Ordena categorias para que 'Competências Gerais' fique por último se existir
        return Object.keys(g).sort().reduce(
            (obj, key) => { 
                obj[key] = g[key]; 
                return obj;
            }, 
            {} as Record<string, any[]>
        );
    }, [items]);

    // Estado inicial: primeira categoria aberta por padrão
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    // Inicializa abrindo a primeira categoria quando os dados chegarem
    useEffect(() => {
        const keys = Object.keys(grouped);
        if (keys.length > 0 && Object.keys(expanded).length === 0) {
            setExpanded({ [keys[0]]: true });
        }
    }, [grouped]);

    const toggle = (cat: string) => {
        setExpanded(prev => ({...prev, [cat]: !prev[cat]}));
    };

    if (!items || items.length === 0) return null;

    return (
        <div className="bg-white p-8 rounded-[2.5rem] border border-neutral-100 shadow-sm">
             <h3 className="text-lg font-black text-neutral-800 uppercase tracking-widest mb-8 flex items-center gap-2">
                <List className="w-5 h-5 text-brand-blue"/> Attribute Index Detalhado
             </h3>
             <div className="space-y-4">
                {Object.entries(grouped).map(([category, attrs]: [string, any[]]) => (
                    <div key={category} className="border border-neutral-100 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-md">
                        <button
                            onClick={() => toggle(category)}
                            className={`w-full flex items-center justify-between p-5 transition-colors text-left ${expanded[category] ? 'bg-brand-lightBlue/30' : 'bg-neutral-50 hover:bg-neutral-100'}`}
                        >
                            <span className={`font-bold text-sm uppercase tracking-wide ${expanded[category] ? 'text-brand-blue' : 'text-neutral-700'}`}>{category}</span>
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-bold text-neutral-400 bg-white px-2 py-1 rounded border border-neutral-200 uppercase">{attrs.length} itens</span>
                                {expanded[category] ? <ChevronUp className="w-4 h-4 text-brand-blue"/> : <ChevronDown className="w-4 h-4 text-neutral-400"/>}
                            </div>
                        </button>
                        {expanded[category] && (
                            <div className="p-6 bg-white divide-y divide-neutral-50 animate-fadeIn">
                                {attrs.map((attr: any, idx: number) => {
                                    const score = Number(attr.score || 0);
                                    const name = attr.component || attr.attribute || 'Atributo sem nome';
                                    const desc = attr.analysis || attr.score_description || attr.description;
                                    
                                    let scoreColor = 'text-neutral-600 bg-neutral-50';
                                    if (score >= 7.5) scoreColor = 'text-emerald-700 bg-emerald-50 border-emerald-100';
                                    else if (score >= 5.0) scoreColor = 'text-amber-700 bg-amber-50 border-amber-100';
                                    else scoreColor = 'text-red-700 bg-red-50 border-red-100';

                                    return (
                                        <div key={idx} className="py-4 first:pt-0 last:pb-0">
                                            <div className="flex justify-between items-center mb-2">
                                                <h4 className="text-sm font-bold text-neutral-800">{name}</h4>
                                                <span className={`text-xs font-black px-3 py-1 rounded-lg border ${scoreColor}`}>
                                                    {score.toFixed(1)}
                                                </span>
                                            </div>
                                            {/* Barra Visual */}
                                            <div className="h-1.5 w-full bg-neutral-100 rounded-full overflow-hidden mb-2">
                                                <div 
                                                    className={`h-full rounded-full ${score >= 7.5 ? 'bg-emerald-500' : score >= 5.0 ? 'bg-amber-500' : 'bg-red-500'}`} 
                                                    style={{ width: `${score * 10}%` }}
                                                />
                                            </div>
                                            {desc && (
                                                <p className="text-xs text-neutral-500 leading-relaxed italic mt-2">
                                                    "{desc}"
                                                </p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ))}
             </div>
        </div>
    );
};

// --- COMPONENTE AGENTE DE ANÁLISE INTEGRADA (FINAL) ---
const AIIntegratedAnalysis = ({ report, jobRole, fitScore, comparisonItems }: { report: CandidateReport, jobRole: JobRole | null, fitScore: number, comparisonItems: ComparisonItem[] }) => {
    const [analysis, setAnalysis] = useState<PredictiveInsightResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const fetchOrGenerate = async () => {
            // 1. Tenta carregar dos metadados existentes
            if (report.metadata?.ai_analysis) {
                setAnalysis(report.metadata.ai_analysis);
                return;
            }

            // 2. Se não existir, gera on-the-fly
            await handleRegenerate();
        };

        fetchOrGenerate();
    }, [report.id, fitScore, comparisonItems]); // Re-executa se o Fit ou Gaps mudarem

    const handleRegenerate = async () => {
        setIsLoading(true);
        try {
            // Modifica o report para usar o fit unificado
            const reportWithUnifiedFit = { ...report, fit_score: fitScore };

            // Passa null para resume se não tiver, o copilot sabe lidar
            // Adicionada passagem dos comparisonItems para que a IA considere os Gaps e o Fit calculado
            const result = await copilotService.generatePredictiveInsights(
                reportWithUnifiedFit, 
                null, 
                jobRole?.title || report.role || 'Cargo Geral',
                undefined, // pdfBase64
                comparisonItems
            );
            
            setAnalysis(result);

            // 3. Salva silenciosamente para cachear
            // Tenta salvar tanto na tabela nova quanto na antiga (dependendo de onde veio)
            const table = report.report_type === 'adv' ? 'reports_adv' : 'reports';
            const { data: latest } = await supabase.from(table).select('metadata').eq('id', report.id).single();
            
            if (latest) {
                const updatedMetadata = { ...(latest.metadata || {}), ai_analysis: result };
                await supabase.from(table).update({ metadata: updatedMetadata }).eq('id', report.id);
            }
        } catch (e) {
            console.error("Falha ao gerar análise integrada:", e);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading && !analysis) {
        return (
            <div className="bg-[#001A3B] rounded-[2.5rem] p-12 mt-12 relative overflow-hidden shadow-2xl animate-pulse">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                        <Bot className="w-6 h-6 text-blue-300 animate-spin" />
                    </div>
                    <div className="space-y-2 w-2/3">
                        <div className="h-4 bg-white/20 rounded w-1/2"></div>
                        <div className="h-3 bg-white/10 rounded w-full"></div>
                    </div>
                </div>
                <div className="space-y-3">
                    <div className="h-2 bg-white/5 rounded w-full"></div>
                    <div className="h-2 bg-white/5 rounded w-full"></div>
                    <div className="h-2 bg-white/5 rounded w-3/4"></div>
                </div>
            </div>
        );
    }

    if (!analysis && !isLoading) return null;

    return (
        <div className="mt-16 bg-[#001A3B] rounded-[2.5rem] p-10 md:p-14 relative overflow-hidden shadow-2xl text-white isolate">
            {/* Background Effects */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-blue/30 rounded-full blur-[120px] -mr-32 -mt-32 -z-10 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-primary/20 rounded-full blur-[100px] -ml-32 -mb-32 -z-10 pointer-events-none"></div>

            <div className="flex flex-col md:flex-row gap-12">
                {/* Header Lateral */}
                <div className="md:w-1/3 flex flex-col justify-between border-b md:border-b-0 md:border-r border-white/10 pb-8 md:pb-0 md:pr-12">
                    <div>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg">
                                <Bot className="w-8 h-8 text-white" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-black uppercase tracking-[0.2em] leading-tight">
                                    Parecer Analítico<br/><span className="text-blue-300">Integrado (IA)</span>
                                </h3>
                            </div>
                            <button 
                                onClick={handleRegenerate}
                                disabled={isLoading} 
                                className="p-2 bg-white/10 hover:bg-white/20 text-blue-200 rounded-lg transition-colors" 
                                title="Regenerar Análise com IA"
                            >
                                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                        <p className="text-sm text-blue-100/80 leading-relaxed font-medium">
                            Síntese executiva gerada via inteligência artificial, cruzando dimensões de comportamento (DISC), motivação (Values) e competência (Attribute Index).
                        </p>
                    </div>
                    
                    <div className="mt-8 md:mt-0 space-y-4">
                        <div className={`p-4 rounded-xl border flex items-start gap-3 ${analysis?.risk_level === 'Alto' ? 'bg-red-500/20 border-red-500/50' : analysis?.risk_level === 'Médio' ? 'bg-amber-500/20 border-amber-500/50' : 'bg-emerald-500/20 border-emerald-500/50'}`}>
                            <ShieldAlert className={`w-5 h-5 shrink-0 ${analysis?.risk_level === 'Alto' ? 'text-red-300' : analysis?.risk_level === 'Médio' ? 'text-amber-300' : 'text-emerald-300'}`} />
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Nível de Risco Calculado</p>
                                <p className="text-xl font-bold">{analysis?.risk_level}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Conteúdo Principal */}
                <div className="md:w-2/3 space-y-10">
                    <div>
                        <h4 className="text-xs font-black text-blue-300 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Quote className="w-4 h-4" /> Síntese do Perfil
                        </h4>
                        <div className="text-lg md:text-xl leading-relaxed font-light text-white/95 space-y-4">
                            {/* Renderiza a síntese, tratando quebras de linha se houver */}
                            {analysis?.three_pillar_synthesis.split('\n').map((p, i) => (
                                p.trim() && <p key={i}>{p}</p>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                            <h5 className="text-xs font-black text-emerald-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <Sparkles className="w-3 h-3" /> Pontos de Alavancagem
                            </h5>
                            <ul className="space-y-2">
                                {(analysis?.signals || []).slice(0, 3).map((signal, idx) => (
                                    <li key={idx} className="text-sm text-blue-50 flex gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0"></span>
                                        {signal.signal}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                            <h5 className="text-xs font-black text-amber-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <Lightbulb className="w-3 h-3" /> Recomendações Táticas
                            </h5>
                            <ul className="space-y-2">
                                {(analysis?.recommendations || []).slice(0, 3).map((rec, idx) => (
                                    <li key={idx} className="text-sm text-blue-50 flex gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0"></span>
                                        {rec}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                    
                    <div className="pt-6 border-t border-white/10 flex justify-between items-center text-[10px] uppercase tracking-widest opacity-50 font-bold">
                        <span>Algoritmo Predictive Engine v3.5</span>
                        <span className="flex items-center gap-1"><FileCheck className="w-3 h-3" /> Análise Concluída</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- COMPONENTE PRINCIPAL ---

export default function ReportFullPageView({ reportId, onBack }: { reportId: string, onBack?: () => void }) {
    const [report, setReport] = useState<CandidateReport | null>(null);
    const [jobRole, setJobRole] = useState<JobRole | null>(null);
    const [loading, setLoading] = useState(true);

    // 1. Fetching Data with Robust Fallback
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Tenta tabela ADV com JOINs complexos primeiro
                let { data: r, error } = await supabase.from('reports_adv')
                    .select(`*, job_roles:job_role_id (id, title, benchmarks, metadata), companies:company_id (id, name)`)
                    .eq('id', reportId).maybeSingle();

                // Se houver erro (ex: FK quebrada ou tabela faltando), tenta fetch simples
                if (error) {
                    console.warn("ADV Join failed, trying simple fetch:", error.message);
                    const { data: simpleR, error: simpleErr } = await supabase.from('reports_adv')
                        .select('*')
                        .eq('id', reportId).maybeSingle();
                    
                    if (!simpleErr && simpleR) {
                        r = simpleR;
                        // Fetch manual relationships
                        if (r.job_role_id) {
                            const { data: jr } = await supabase.from('job_roles').select('*').eq('id', r.job_role_id).single();
                            if(jr) r.job_roles = jr;
                        }
                        if (r.company_id) {
                            const { data: co } = await supabase.from('companies').select('name').eq('id', r.company_id).single();
                            if(co) r.companies = co;
                        }
                    }
                }

                // Fallback tabela antiga se não achou em ADV
                if (!r) {
                    const { data: rOld } = await supabase.from('reports')
                        .select(`*, job_roles:job_role_id (id, title, benchmarks, metadata), companies:company_id (id, name)`)
                        .eq('id', reportId).maybeSingle();
                    r = rOld;
                }

                if (r) {
                    const mapped: CandidateReport = {
                        ...r,
                        role: r.job_roles?.title || r.role || 'Cargo Geral',
                        company_name: r.companies?.name || r.company_name || 'Empresa',
                        report_type: 'adv'
                    };
                    setReport(mapped);
                    if (r.job_roles) setJobRole(r.job_roles);
                    else if (r.metadata?.benchmarks) {
                        setJobRole({ id: 'temp', title: 'Snapshot', benchmarks: r.metadata.benchmarks });
                    }
                } else {
                    console.error("Relatório não encontrado em nenhuma tabela:", reportId);
                }
            } catch (e) {
                console.error("Erro crítico carregando relatório:", e);
            } finally {
                setLoading(false);
            }
        };
        if (reportId) fetchData();
    }, [reportId]);

    // 2. Data Processing & Normalization
    const processedData = useMemo(() => {
        if (!report) return null;

        // USA O NORMALIZADOR CENTRAL
        const normalized = normalizeReport(report);
        if (!normalized) return null;

        const roleBenchmarks = jobRole?.benchmarks || {};
        const roleValues = jobRole?.metadata?.value_preferences || {};
        const roleDisc = jobRole?.metadata?.disc_preferences || {}; // DISC do Cargo (Opcional)

        // --- MERGE FULL ATTRIBUTE LIST (MAIN LIST + ATTRIBUTE INDEX) ---
        // Garante que TODOS os ~78 atributos sejam exibidos, mesmo que sem categoria definida
        const indexItems: AttributeIndexItem[] = report.attribute_index || report.analysis?.attribute_index || normalized.attributes || [];
        const mainList: MainAttributeItem[] = report.main_attributes_list || report.analysis?.main_attributes_list || [];
        
        const resultMap = new Map<string, AttributeIndexItem>();
        
        // 1. Prioriza attribute_index (que tem detalhes como análise e categoria)
        indexItems.forEach(item => {
            if(item.component) {
                resultMap.set(item.component.toLowerCase().trim(), { ...item });
            }
        });
        
        // 2. Adiciona itens da main_attributes_list que não estão no index
        mainList.forEach(item => {
            const key = item.attribute.toLowerCase().trim();
            if (!resultMap.has(key)) {
                resultMap.set(key, {
                    category: "Competências Gerais", // Agrupador padrão para itens sem categoria
                    component: item.attribute,
                    score: item.score,
                    score_description: "",
                    analysis: ""
                });
            }
        });
        
        const fullAttributeList = Array.from(resultMap.values()).sort((a, b) => a.component.localeCompare(b.component));

        // --- PROCESSAMENTO DISC COMPARATIVO ---
        const discFull = normalized.disc_full;
        const natural = discFull?.natural || discFull?.estilo_natural || normalized.disc;
        const adapted = discFull?.adapted || discFull?.estilo_adaptado || normalized.disc; 

        // Cálculo de Perfil (String) e Descrição
        const profileString = normalized.rawDiscProfile?.profile || calculateDiscProfile(natural);
        const profileDescription = normalized.rawDiscProfile?.description || getDiscDescription(profileString);

        // Array para o gráfico
        const discComparisonData = ['D', 'I', 'S', 'C'].map(factor => ({
            name: factor,
            Natural: Number(natural[factor as keyof typeof natural] || 0),
            Adaptado: Number(adapted[factor as keyof typeof adapted] || 0),
            // Adiciona Benchmark se existir no cargo, senão usa 50 como linha neutra visual
            Benchmark: roleDisc[factor as keyof typeof roleDisc] || 50, 
            color: DISC_CONFIG[factor as 'D'].color
        }));

        // Prepare Attributes List
        const attributesList = Object.keys(SYNONYM_MAP).map(key => ({
            id: key, // Renamed to avoid key prop issues
            label: key,
            score: getScoreFromMap(key, normalized.scores) || 0,
            benchmark: getScoreFromMap(key, roleBenchmarks) || 5.0
        }));

        // Prepare Values (Iterate over Canonical Config Keys)
        const valuesList = Object.entries(VALUES_CONFIG).map(([key, config]) => {
            const dataPoint = normalized.values[key]; // Access via canonical key directly
            return {
                id: key, // Renamed to avoid key prop issues
                config,
                score: dataPoint ? dataPoint.score : 0,
                description: dataPoint ? dataPoint.description : null,
                benchmark: roleValues[key] || 'medio' // Passa string ou número
            };
        });

        // --- UNIFIED FIT CALCULATION (NEW) ---
        // Calcula o Fit Global Unificado considerando todos os eixos (se houver benchmark)
        const comparisonItems = jobRole ? buildFullComparison(normalized, jobRole) : [];
        
        let unifiedFit = normalized.fit;
        if (comparisonItems.length > 0) {
            const totalFit = comparisonItems.reduce((acc, item) => acc + item.fit, 0);
            unifiedFit = Math.round(totalFit / comparisonItems.length);
        } else {
            // Fallback (Fit de Atributos puro)
            const attrFit = attributesList.reduce((acc, curr) => acc + (10 - Math.abs(curr.score - curr.benchmark)), 0) / attributesList.length * 10;
            unifiedFit = normalized.fit > 0 ? normalized.fit : Math.round(attrFit);
        }

        return {
            normalized,
            attributesList,
            discComparisonData,
            valuesList,
            fit: unifiedFit, // USES UNIFIED FIT
            comparisonItems, // Export for the Gap Table
            rawDisc: normalized.rawDiscProfile || normalized.disc_full,
            profileString,
            profileDescription,
            roleDisc,
            fullAttributeList // New merged list
        };

    }, [report, jobRole]);

    // Determine highest value for recommendation card
    const primaryValue = useMemo(() => {
        if (!processedData?.valuesList || processedData.valuesList.length === 0) return null;
        // Ordena para pegar o maior score
        const sorted = [...processedData.valuesList].sort((a, b) => b.score - a.score);
        return sorted[0]; // Maior valor
    }, [processedData]);

    // Calculate Combined Risk Index (New Calculation)
    const riskResult = useMemo(() => {
        if (!processedData?.normalized?.scores) return null;
        return riskAnalysisService.calculateCombinedRiskIndex(processedData.normalized.scores);
    }, [processedData]);

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="w-10 h-10 text-brand-blue animate-spin" /></div>;
    
    if (!processedData || !report) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 p-8">
            <XCircle className="w-12 h-12 text-neutral-300 mb-4" />
            <h2 className="text-xl font-bold text-neutral-700">Erro ao processar dados</h2>
            <p className="text-neutral-500 mt-2 text-sm max-w-md text-center">
                Não foi possível carregar ou normalizar os dados deste relatório. Verifique se o ID está correto ou se o arquivo original foi processado corretamente.
            </p>
            <div className="mt-6 p-4 bg-white rounded-lg border border-neutral-200 text-xs font-mono text-neutral-400">
                ID: {reportId}
            </div>
            <button onClick={() => onBack ? onBack() : window.history.back()} className="mt-8 px-6 py-2 bg-brand-blue text-white rounded-lg font-bold text-sm hover:bg-brand-dark transition-all">
                Voltar
            </button>
        </div>
    );

    const { normalized, attributesList, discComparisonData, valuesList, fit, comparisonItems, rawDisc, profileString, profileDescription, roleDisc, fullAttributeList } = processedData;

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-20 font-sans text-neutral-800 absolute inset-0 z-50 overflow-y-auto">
            
            {/* 1. HEADER */}
            <header className="bg-white border-b border-neutral-200 sticky top-0 z-50 px-6 md:px-12 h-20 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={() => onBack ? onBack() : window.history.back()} className="p-2 text-neutral-400 hover:text-brand-blue rounded-full hover:bg-neutral-50 transition-all">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-lg font-black text-neutral-900 leading-tight">{report.name}</h1>
                        <div className="flex items-center gap-2 text-xs text-neutral-500">
                            <Briefcase className="w-3 h-3" /> <span>{report.role}</span>
                            <span className="w-1 h-1 bg-neutral-300 rounded-full"></span>
                            <Building className="w-3 h-3" /> <span>{report.company_name}</span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => window.print()} className="p-2 border border-neutral-200 rounded-lg hover:bg-neutral-50 text-neutral-600"><Printer size={18} /></button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-brand-blue text-white rounded-lg font-bold text-sm hover:bg-brand-dark transition-all shadow-md">
                        <Download size={16} /> Exportar PDF
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 md:px-12 py-8 space-y-12 animate-fadeIn">
                
                {/* 2. HERO / OVERVIEW CARD */}
                <div className="bg-white rounded-[2rem] p-8 border border-neutral-100 shadow-sm flex flex-col md:flex-row gap-8 items-center">
                    <div className="flex-shrink-0">
                        {/* FIT UNIFICADO */}
                        <FitGauge score={fit} />
                    </div>
                    <div className="flex-1 space-y-6 w-full">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100 flex items-center gap-3">
                                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Brain className="w-5 h-5"/></div>
                                <div>
                                    <p className="text-[10px] font-black text-neutral-400 uppercase tracking-wider">Atributos</p>
                                    <p className="text-lg font-bold text-neutral-800">Equilibrado</p>
                                </div>
                            </div>
                            <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100 flex items-center gap-3">
                                <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><Compass className="w-5 h-5"/></div>
                                <div>
                                    <p className="text-[10px] font-black text-neutral-400 uppercase tracking-wider">Valores</p>
                                    <p className="text-lg font-bold text-neutral-800">Alinhado</p>
                                </div>
                            </div>
                            <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100 flex items-center gap-3">
                                <div className="p-2 bg-amber-100 text-amber-600 rounded-lg"><PieChart className="w-5 h-5"/></div>
                                <div>
                                    <p className="text-[10px] font-black text-neutral-400 uppercase tracking-wider">Perfil DISC</p>
                                    {/* CORREÇÃO: Mostra o perfil calculado (ex: DI) em vez de N/A */}
                                    <p className="text-lg font-bold text-neutral-800">{profileString}</p>
                                </div>
                            </div>
                        </div>
                        <div className="text-sm text-neutral-600 italic border-l-4 border-brand-blue pl-4 py-1">
                            "{report.overall_summary || 'O perfil apresenta características consistentes com as demandas mapeadas para a função, destacando-se pela capacidade de execução.'}"
                        </div>
                    </div>
                </div>

                {/* 3. CONTENT AREAS (Stacked) */}
                
                {/* SECTION 1: VISÃO GERAL & ESTRATÉGICA */}
                <div className="space-y-8">
                    {/* Split Grid: Radar + Alerts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-white p-8 rounded-[2rem] border border-neutral-100 shadow-sm h-[600px] flex flex-col">
                            <h3 className="font-black text-neutral-800 uppercase tracking-widest mb-6 text-sm">Radar de Competências</h3>
                            <div className="flex-1">
                                <RadarChartWrapper 
                                    data={attributesList.map(a => ({ attribute: a.label, candidate: a.score, benchmark: a.benchmark, fullMark: 10 })) as RadarDataPoint[]} 
                                />
                            </div>
                        </div>
                        <div className="space-y-6">
                            {/* PONTOS DE ATENÇÃO */}
                            <div className="bg-white p-8 rounded-[2rem] border border-neutral-100 shadow-sm">
                                <h3 className="font-black text-neutral-800 uppercase tracking-widest mb-6 text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500"/> Pontos de Atenção</h3>
                                <div className="space-y-4">
                                    {attributesList.filter(a => a.score < a.benchmark - 1.5).length === 0 ? (
                                        <p className="text-sm text-emerald-600 flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/> Nenhum gap crítico identificado.</p>
                                    ) : (
                                        attributesList.filter(a => a.score < a.benchmark - 1.5).map((a, i) => (
                                            <div key={i} className="flex justify-between items-center bg-amber-50 p-3 rounded-xl border border-amber-100">
                                                <span className="text-sm font-bold text-neutral-700">{a.label}</span>
                                                <div className="flex gap-3 text-xs">
                                                    <span className="text-neutral-500">Alvo: {a.benchmark}</span>
                                                    <span className="text-red-600 font-bold">Cand: {a.score.toFixed(1)}</span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* RECOMENDAÇÃO / PRINCIPAL MOTIVADOR */}
                            <div className="bg-brand-blue text-white p-8 rounded-[2rem] shadow-lg relative overflow-hidden">
                                <div className="relative z-10">
                                    <h3 className="font-black uppercase tracking-widest mb-2 text-sm text-blue-200 flex items-center gap-2">
                                        <Compass className="w-4 h-4"/> Principal Motivador (Driver)
                                    </h3>
                                    {primaryValue && primaryValue.score > 0 ? (
                                        <>
                                            <p className="text-2xl font-black leading-tight mb-2">{primaryValue.config.label}</p>
                                            <p className="text-sm text-blue-100 font-medium leading-relaxed opacity-90">
                                                {primaryValue.config.desc}
                                            </p>
                                        </>
                                    ) : (
                                        <p className="text-xl font-bold">Dados de valores insuficientes.</p>
                                    )}
                                </div>
                                <Sparkles className="absolute -bottom-4 -right-4 w-32 h-32 text-white opacity-10" />
                            </div>

                            {/* RISCO PSICOSSOCIAL PREDITIVO (GRO) */}
                            {riskResult && (
                                <div className={`p-6 rounded-[2rem] border shadow-sm relative overflow-hidden transition-all duration-500 ${
                                    riskResult.level === 'Alto' || riskResult.level === 'Crítico' ? 'bg-gradient-to-br from-red-50 to-white border-red-100' :
                                    riskResult.level === 'Moderado' ? 'bg-gradient-to-br from-amber-50 to-white border-amber-100' :
                                    'bg-gradient-to-br from-emerald-50 to-white border-emerald-100'
                                }`}>
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className={`font-black uppercase tracking-widest text-[10px] flex items-center gap-1.5 ${
                                                riskResult.level === 'Alto' || riskResult.level === 'Crítico' ? 'text-red-600' :
                                                riskResult.level === 'Moderado' ? 'text-amber-600' :
                                                'text-emerald-600'
                                            }`}>
                                                <ShieldAlert className="w-3 h-3" /> Risco Psicossocial Preditivo (GRO/NR-01)
                                            </h3>
                                            <p className={`text-2xl font-black mt-1 ${
                                                riskResult.level === 'Alto' || riskResult.level === 'Crítico' ? 'text-red-700' :
                                                riskResult.level === 'Moderado' ? 'text-amber-700' :
                                                'text-emerald-700'
                                            }`}>
                                                {riskResult.risk_percentage}% <span className="text-sm font-bold opacity-60">({riskResult.level})</span>
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="w-full bg-white/60 rounded-full h-1.5 mb-3 overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full transition-all duration-1000 ${
                                                riskResult.level === 'Alto' || riskResult.level === 'Crítico' ? 'bg-red-500' :
                                                riskResult.level === 'Moderado' ? 'bg-amber-500' :
                                                'bg-emerald-500'
                                            }`} 
                                            style={{ width: `${riskResult.risk_percentage}%` }}
                                        />
                                    </div>

                                    <p className="text-[10px] text-neutral-500 font-medium leading-relaxed">
                                        Análise preditiva de vulnerabilidade a estressores ocupacionais baseada no perfil comportamental (cenário de contratação).
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* GRÁFICO DE BALANÇO DIMENSIONAL (FULL WIDTH) */}
                    <div className="w-full">
                        <DimensionalBarChart scores={normalized.scores} />
                    </div>
                </div>

                {/* SECTION 2: ATTRIBUTES LIST */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-neutral-100 shadow-sm">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-lg font-black text-neutral-800 uppercase tracking-widest flex items-center gap-2"><Brain className="w-5 h-5"/> Attribute Index (Axiologia)</h3>
                        <div className="flex gap-4 text-[10px] font-bold uppercase tracking-wider">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-neutral-800 rounded-full"></span> Alvo</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500 rounded-full"></span> Candidato</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2">
                        {attributesList.map((attr) => (
                            <AttributeRow key={attr.id} label={attr.label} score={attr.score} benchmark={attr.benchmark} />
                        ))}
                    </div>
                </div>

                {/* SECTION 3: DISC COMPARATIVE (NATURAL VS ADAPTED) */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-neutral-100 shadow-sm">
                    <div className="flex flex-col md:flex-row justify-between items-center mb-8">
                        <h3 className="text-lg font-black text-neutral-800 uppercase tracking-widest flex items-center gap-2"><PieChart className="w-5 h-5"/> Estilo Comportamental (DISC)</h3>
                        <div className="flex gap-6 mt-4 md:mt-0">
                            <div className="flex items-center gap-2 text-xs font-bold text-neutral-500 uppercase">
                                <span className="w-3 h-3 bg-neutral-400/20 border border-neutral-300 rounded-sm"></span> Adaptado
                            </div>
                            <div className="flex items-center gap-2 text-xs font-bold text-neutral-500 uppercase">
                                <span className="w-3 h-3 bg-brand-blue rounded-sm"></span> Natural
                            </div>
                        </div>
                    </div>

                    {/* Chart Container */}
                    <div className="h-80 w-full mb-10">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={discComparisonData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis 
                                    dataKey="name" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fontSize: 14, fontWeight: 900, fill: '#64748B' }}
                                    dy={10}
                                />
                                <YAxis hide />
                                <Tooltip 
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                />
                                {/* Renderiza linha de benchmark se houver dados do cargo */}
                                {Object.keys(roleDisc).length > 0 && (
                                    <ReferenceLine y={50} stroke="#cbd5e1" strokeDasharray="3 3" />
                                )}
                                <Bar dataKey="Natural" radius={[6, 6, 0, 0]} animationDuration={1500}>
                                    {discComparisonData.map((entry, index) => (
                                        <Cell key={`cell-nat-${index}`} fill={entry.color} />
                                    ))}
                                    <LabelList dataKey="Natural" position="top" style={{ fontSize: 12, fontWeight: 900, fill: '#64748B' }} />
                                </Bar>
                                <Bar dataKey="Adaptado" radius={[6, 6, 0, 0]} fill="#e2e8f0" animationDuration={1500}>
                                    <LabelList dataKey="Adaptado" position="top" style={{ fontSize: 12, fontWeight: 900, fill: '#94A3B8' }} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Concept Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div className="bg-neutral-50 p-6 rounded-2xl border border-neutral-100 flex gap-4">
                            <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-brand-blue shrink-0">
                                <Users className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-black text-neutral-800 text-sm uppercase tracking-wide mb-2">Estilo Natural ({profileString})</h4>
                                <p className="text-xs text-neutral-500 leading-relaxed">
                                    {profileDescription}
                                </p>
                            </div>
                        </div>
                        <div className="bg-neutral-50 p-6 rounded-2xl border border-neutral-100 flex gap-4">
                            <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-neutral-400 shrink-0">
                                <Briefcase className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-black text-neutral-800 text-sm uppercase tracking-wide mb-2">Estilo Adaptado</h4>
                                <p className="text-xs text-neutral-500 leading-relaxed">
                                    A adaptação sugere ajustes ao ambiente atual. Grandes variações entre natural e adaptado podem indicar estresse ou esforço consciente para atender demandas.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* ANÁLISE DE ADERÊNCIA AO CARGO (NOVA SEÇÃO) */}
                    {Object.keys(roleDisc).length > 0 && (
                        <div className="bg-brand-lightBlue/10 p-6 rounded-2xl border border-brand-blue/10 animate-fadeIn">
                            <h4 className="font-black text-brand-blue text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Target className="w-4 h-4" /> Análise de Aderência ao Cargo (Candidato vs Benchmark)
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {discComparisonData.map(factor => {
                                    const analysis = getGapAnalysis(factor.Natural, factor.Benchmark, factor.name);
                                    return (
                                        <div key={factor.name} className="flex justify-between items-center bg-white p-3 rounded-xl border border-neutral-100">
                                            <div className="flex items-center gap-2">
                                                <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold text-white`} style={{ backgroundColor: factor.color }}>{factor.name[0]}</span>
                                                <span className="text-xs font-bold text-neutral-700">{factor.name}</span>
                                            </div>
                                            <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase ${analysis.color}`}>
                                                <analysis.icon className="w-3 h-3" /> {analysis.status}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* SECTION 4: VALUES INDEX */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-neutral-100 shadow-sm">
                    <h3 className="text-lg font-black text-neutral-800 uppercase tracking-widest mb-8 flex items-center gap-2"><Compass className="w-5 h-5"/> Motivadores (Values Index)</h3>
                    
                    {/* Se não houver nenhum valor > 0, mostra aviso */}
                    {valuesList.every(v => v.score === 0) ? (
                        <div className="p-12 text-center bg-neutral-50 rounded-2xl border-2 border-dashed border-neutral-200">
                            <Compass className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                            <p className="text-neutral-500 font-bold">Dados de valores não disponíveis para este relatório.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {valuesList.map((val) => (
                                <ValueComparisonCard 
                                    key={val.id} 
                                    config={val.config} 
                                    score={val.score} 
                                    description={val.description || ''} 
                                    bench={typeof val.benchmark === 'string' || typeof val.benchmark === 'number' ? val.benchmark : 'N/A'} 
                                />
                            ))}
                        </div>
                    )}
                    
                    <div className="mt-10 p-4 bg-blue-50 border border-blue-100 rounded-xl text-center text-xs text-blue-800 font-medium">
                        <Info className="w-4 h-4 inline mr-2 align-text-bottom" />
                        Os motivadores indicam o "porquê" das ações. Alinhamento nestes fatores é crucial para engajamento de longo prazo.
                    </div>
                </div>

                {/* SECTION 5: FULL ATTRIBUTE INDEX ACCORDION */}
                <GroupedAttributes items={fullAttributeList || []} />

                {/* SECTION 5.1: GAP DETAILING TABLE (NOVA) */}
                <UnifiedComparisonTable items={comparisonItems} />

                {/* SECTION 6: AI INTEGRATED ANALYSIS */}
                <AIIntegratedAnalysis report={report} jobRole={jobRole} fitScore={fit} comparisonItems={comparisonItems} />

            </main>
        </div>
    );
}
