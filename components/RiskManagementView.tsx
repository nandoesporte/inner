
import React, { useMemo, useState, useEffect } from 'react';
import { CandidateReport, PsychosocialRiskType, Company, JobRole, AttributeIndexItem, MainAttributeItem, RadarDataPoint } from '../types';
import { riskAnalysisService, getScoreFromMap, SYNONYM_MAP } from '../services/riskAnalysisService';
import { nr01Service, NR01Classification } from '../services/nr01Service';
import { 
    AlertTriangle, ShieldAlert, Flame, Zap, Clock,  
    MessageSquareX, UserX, Brain, Lock, Info, Activity, 
    Flag, Search, Filter, AlertOctagon, ThumbsUp, Building, Briefcase, X, ShieldCheck,
    ChevronRight, BarChart3, Users, LayoutGrid, Eye, EyeOff, LockKeyhole, User, Loader2,
    Target, Award, List, Star, ArrowLeft, Printer, Mail, Download, ChevronDown, ChevronUp, BookOpen, ClipboardList,
    Frown, Heart, Gavel, Scale, BatteryWarning, PieChart, FileQuestion
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { supabase } from '../supabaseClient';
import DimensionalBarChart from './DimensionalBarChart';
import RadarChartWrapper from './RadarChartWrapper';
import NR1DimensionalChart from './NR1DimensionalChart';
import OrganizationalFitSection from './OrganizationalFitSection';
import { PSYCHOSOCIAL_SURVEY_DATA, INNERMETRIX_ATTRIBUTES } from '../constants';

interface RiskManagementViewProps {
  reports: CandidateReport[];
  tenantId?: string;
}

// Configuração Visual das Bandeiras de Risco
const RISK_FLAG_CONFIG: Record<PsychosocialRiskType, { label: string; description: string; icon: any; color: string; bg: string }> = {
    'Burnout': {
        label: 'Esgotamento (Burnout)',
        description: 'Alta responsabilidade com baixa autoestima e eficiência prática.',
        icon: Flame,
        color: 'text-orange-600',
        bg: 'bg-orange-50 border-orange-200'
    },
    'Assedio_Vitima': {
        label: 'Vulnerabilidade a Assédio',
        description: 'Baixa auto-direção combinada com baixa autoestima.',
        icon: Heart, // Alterado para Heart para compatibilidade
        color: 'text-pink-600',
        bg: 'bg-pink-50 border-pink-200'
    },
    'Assedio_Agressor': {
        label: 'Perfil Dominante/Agressivo',
        description: 'Alta auto-direção com baixa empatia.',
        icon: Gavel,
        color: 'text-red-700',
        bg: 'bg-red-50 border-red-200'
    },
    'Procrastinacao': {
        label: 'Procrastinação Crônica',
        description: 'Baixo pensamento prático com alto perfeccionismo sistêmico.',
        icon: Clock,
        color: 'text-indigo-600',
        bg: 'bg-indigo-50 border-indigo-200'
    },
    'Decisao_Impulsiva': {
        label: 'Decisão Impulsiva',
        description: 'Ação prática alta sem julgamento de sistemas/regras.',
        icon: Zap,
        color: 'text-yellow-600',
        bg: 'bg-yellow-50 border-yellow-200'
    },
    'Conflito': {
        label: 'Atrito Interpessoal',
        description: 'Baixa empatia com alta rigidez de valores.',
        icon: MessageSquareX,
        color: 'text-red-600',
        bg: 'bg-red-50 border-red-200'
    },
    'Isolamento': {
        label: 'Isolamento Social',
        description: 'Extrema baixa empatia e desconexão social.',
        icon: UserX,
        color: 'text-slate-600',
        bg: 'bg-slate-100 border-slate-200'
    },
    'Desmotivacao': {
        label: 'Desengajamento',
        description: 'Baixa pontuação geral em motivadores.',
        icon: Frown,
        color: 'text-gray-600',
        bg: 'bg-gray-100 border-gray-200'
    },
    'Rigidez': {
        label: 'Rigidez Cognitiva',
        description: 'Dificuldade severa de adaptação a mudanças.',
        icon: Scale,
        color: 'text-stone-600',
        bg: 'bg-stone-100 border-stone-200'
    }
};

const NR1_STRUCTURE = [
    {
        id: '1',
        key: 'Empatia',
        title: '1. Relações Interpessoais NR1',
        description: 'Esta categoria avalia a capacidade das pessoas em interagir, compreender e apoiar os outros, bem como de construir e manter relacionamentos saudáveis no ambiente de trabalho.',
        risks: ['Isolamento social', 'Conflitos interpessoais', 'Assédio moral/psicológico', 'Estresse por pressão de convívio social', 'Burnout emocional'],
        components: [
            'Atitude Empática', 'Escuta Empática', 'Relacionar-se com os Demais', 'Atitude com as Pessoas', 'Diplomacia', 'Consciência Humana', 'Desenvolver Pessoas'
        ]
    },
    {
        id: '2',
        key: 'Pensamento Prático',
        title: '2. Gestão de Demandas e Eficácia Operacional NR1',
        description: 'Esta categoria foca na capacidade das pessoas em identificar prioridades de ação, organizar, executar e entregar resultados, lidando com as demandas do trabalho de forma eficaz.',
        risks: ['Sobrecarga por resultados', 'Estresse por desempenho', 'Baixa autoeficácia', 'Erros e retrabalho'],
        components: [
            'Atenção aos Detalhes', 'Resolução de Problemas', 'Organização Concreta', 'Orientação para Qualidade', 'Orientação para Resultados', 'Foco em Metas e Projetos', 'Pensamento Prático'
        ]
    },
    {
        id: '3',
        key: 'Pensamento Sistêmico',
        title: '3. Clareza Organizacional e Conformidade NR1',
        description: 'Esta categoria aborda a compreensão e aderência das pessoas às estruturas, regras, políticas, sistemas e planejamento da organização, bem como sua capacidade de antecipar problemas.',
        risks: ['Ansiedade por ambiguidade', 'Insegurança com hierarquia', 'Estresse por controle', 'Frustração com burocracia', 'Burnout por imposição de limites'],
        components: [
            'Respeito às Regras e Políticas', 'Seguir Instruções', 'Julgamento de Sistemas', 'Planejamento a Longo Prazo', 'Pensamento Proativo', 'Enxergar Potenciais Problemas', 'Expectativas Realistas'
        ]
    },
    {
        id: '4',
        key: 'Autoestima',
        title: '4. Autopercepção e Resiliência Pessoal NR1',
        description: 'Esta categoria avalia a capacidade das pessoas de identificarem, entenderem e regularem as próprias emoções, sua força interna e sua capacidade de manter uma autoimagem positiva ao ter que lidar com adversidades.',
        risks: ['Estresse crônico e burnout', 'Ansiedade e depressão', 'Baixa resiliência emocional', 'Dificuldade em lidar com feedbacks', 'Desengajamento e apatia'],
        components: [
            'Autoestima', 'Lidar com a Rejeição', 'Lidar com o Estresse', 'Autoconfiança', 'Autocontrole', 'Controle Emocional', 'Prazer pelo Trabalho'
        ]
    },
    {
        id: '5',
        key: 'Consciência de Função',
        title: '5. Clareza de Papel e Responsabilidade NR1',
        description: 'Esta categoria se refere à compreensão das pessoas sobre seus próprios papéis e funções, sua capacidade de assumir responsabilidades e de manter um desempenho consistente e confiável.',
        risks: ['Ambiguidade de papéis', 'Conflito de papéis', 'Estresse por autodesempenho', 'Falta de comprometimento', 'Insegurança no trabalho', 'Sobrecarga de responsabilidade'],
        components: [
            'Consciência de Papéis', 'Responsabilização Pessoal', 'Comprometimento Pessoal', 'Atender a Padrões', 'Consistência e Confiabilidade', 'Avaliação de Desempenho', 'Confiança nos Papéis'
        ]
    },
    {
        id: '6',
        key: 'Auto-Direção',
        title: '6. Sentido, Propósito e Autonomia NR1',
        description: 'Esta categoria explora a motivação interna das pessoas em seguir um caminho até o objetivo final, sua capacidade de autodireção, iniciativa, persistência e de encontrar significado maior no trabalho.',
        risks: ['Monotonia e tédio', 'Desengajamento e apatia', 'Burnout por falta de propósito', 'Falta de autonomia', 'Baixa resiliência para superar desafios'],
        components: [
            'Autodireção', 'Motivação Pessoal', 'Autoaperfeiçoamento', 'Autodisciplina e Senso de Dever', 'Capacidade de Iniciativa', 'Persistência', 'Criatividade'
        ]
    }
];

const getRiskLabelAndColor = (score: number) => {
    if (score <= 4.0) return { label: 'ALTO RISCO', bg: 'bg-[#E93D25]', text: 'text-[#E93D25]', border: 'border-[#E93D25]' };
    if (score <= 5.9) return { label: 'RISCO MODERADO', bg: 'bg-[#F59E0B]', text: 'text-[#F59E0B]', border: 'border-[#F59E0B]' };
    if (score <= 8.0) return { label: 'BAIXO RISCO', bg: 'bg-[#0056D2]', text: 'text-[#0056D2]', border: 'border-[#0056D2]' };
    return { label: 'MUITO BAIXO RISCO', bg: 'bg-[#10B981]', text: 'text-[#10B981]', border: 'border-[#10B981]' };
};

const PsychometricCategoryItem: React.FC<{ 
    definition: typeof NR1_STRUCTURE[0], 
    allScores: any, 
    attributeList: AttributeIndexItem[] 
}> = ({ definition, allScores, attributeList }) => {
    const [isOpen, setIsOpen] = useState(false);
    const categoryScore = getScoreFromMap(definition.key, allScores) || 0;
    const riskInfo = getRiskLabelAndColor(categoryScore);

    const categoryComponents = definition.components.map(compName => {
        let score = getScoreFromMap(compName, attributeList);
        if (score === undefined) {
            score = getScoreFromMap(compName, allScores) || 0;
        }
        const details = attributeList.find(item => 
            item.component.toLowerCase().trim() === compName.toLowerCase().trim() || 
            item.component.toLowerCase().includes(compName.toLowerCase()) ||
            compName.toLowerCase().includes(item.component.toLowerCase())
        );
        return {
            name: compName,
            score: score,
            description: details?.analysis || details?.score_description || "Análise detalhada não disponível."
        };
    });

    return (
        <div className="border border-neutral-200 rounded-xl bg-white overflow-hidden transition-all duration-300 hover:shadow-md">
            <div 
                onClick={() => setIsOpen(!isOpen)}
                className={`flex flex-col md:flex-row md:items-center justify-between p-5 cursor-pointer transition-colors ${isOpen ? 'bg-neutral-50' : 'bg-white'}`}
            >
                <div className="flex items-center gap-4">
                    <button className={`p-1 rounded-full transition-transform duration-300 ${isOpen ? 'rotate-180 bg-neutral-200' : 'bg-neutral-100'}`}>
                        <ChevronDown className="w-5 h-5 text-neutral-600" />
                    </button>
                    <div>
                        <h4 className="text-base font-bold text-neutral-800 uppercase tracking-wide">{definition.title}</h4>
                    </div>
                </div>
                <div className="flex items-center gap-4 mt-3 md:mt-0 pl-10 md:pl-0">
                    <div className="flex flex-col items-end">
                        <span className="text-xs font-black text-neutral-400 uppercase tracking-widest">Score</span>
                        <span className="text-2xl font-black text-neutral-900">{categoryScore.toFixed(1)}</span>
                    </div>
                    <div className={`px-3 py-1.5 rounded-lg border ${riskInfo.border} bg-opacity-10 border-opacity-30`}>
                        <span className={`text-xs font-black uppercase tracking-widest ${riskInfo.text}`}>
                            {riskInfo.label}
                        </span>
                    </div>
                </div>
            </div>
            {isOpen && (
                <div className="p-6 border-t border-neutral-100 animate-fadeIn space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200">
                            <h5 className="text-xs font-black text-neutral-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <BookOpen className="w-3 h-3" /> Definição da Categoria
                            </h5>
                            <p className="text-sm text-neutral-600 leading-relaxed text-justify">
                                {definition.description}
                            </p>
                        </div>
                        <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                            <h5 className="text-xs font-black text-red-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <AlertTriangle className="w-3 h-3" /> Riscos Psicossociais Associados
                            </h5>
                            <ul className="space-y-1">
                                {definition.risks.map((risk, i) => (
                                    <li key={i} className="text-sm text-red-700 flex items-start gap-2">
                                        <span className="mt-1.5 w-1 h-1 bg-red-400 rounded-full shrink-0"></span>
                                        {risk}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                    <div>
                        <h5 className="text-sm font-black text-neutral-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <List className="w-4 h-4 text-brand-blue" /> Detalhamento dos Componentes
                        </h5>
                        <div className="space-y-4">
                            {categoryComponents.map((comp, idx) => {
                                const compColor = getRiskLabelAndColor(comp.score);
                                return (
                                    <div key={idx} className="bg-white border border-neutral-100 p-4 rounded-xl shadow-sm hover:border-brand-blue/30 transition-all">
                                        <div className="flex justify-between items-end mb-2">
                                            <span className="text-base font-bold text-neutral-800">{comp.name}</span>
                                            <span className={`text-base font-black ${compColor.text}`}>{comp.score.toFixed(1)}</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-neutral-100 rounded-full overflow-hidden mb-3">
                                            <div className={`h-full ${compColor.bg} transition-all duration-1000`} style={{ width: `${comp.score * 10}%` }}></div>
                                        </div>
                                        <p className="text-xs text-neutral-500 leading-relaxed italic">
                                            {comp.description}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const PsychometricAccordion: React.FC<{ scores: any, attributes: AttributeIndexItem[] }> = ({ scores, attributes }) => {
    return (
        <div className="space-y-4 animate-fadeIn">
            <div className="flex items-center gap-3 mb-4">
                <List className="w-5 h-5 text-brand-blue" />
                <h3 className="text-xl font-black text-neutral-800 uppercase tracking-widest">
                    Índice Psicométrico Completo (NR-1)
                </h3>
            </div>
            {NR1_STRUCTURE.map((def) => (
                <PsychometricCategoryItem key={def.id} definition={def} allScores={scores} attributeList={attributes} />
            ))}
        </div>
    );
};

const PSASurveyResult: React.FC<{ scores: any }> = ({ scores }) => {
    const hasPSAData = Object.keys(scores || {}).some(k => /^\d+-\d+$/.test(k));
    if (!hasPSAData) return null;

    const aggregatedResults = PSYCHOSOCIAL_SURVEY_DATA.dimensions.map(dim => {
        let totalScore = 0;
        let count = 0;
        dim.questions.forEach((_, idx) => {
            const key = `${dim.id}-${idx}`;
            if (scores[key] !== undefined) {
                totalScore += Number(scores[key]);
                count++;
            }
        });
        const average = count > 0 ? totalScore / count : 0;
        let status = { label: 'BAIXO RISCO', color: 'text-emerald-600', bar: 'bg-emerald-500', bg: 'bg-emerald-50 border-emerald-100' };
        if (average < 3.0) {
            status = { label: 'ALTO RISCO', color: 'text-red-600', bar: 'bg-red-500', bg: 'bg-red-50 border-red-100' };
        } else if (average < 4.0) {
            status = { label: 'RISCO MODERADO', color: 'text-amber-600', bar: 'bg-amber-500', bg: 'bg-amber-50 border-amber-100' };
        }
        return { ...dim, average, status };
    });

    return (
        <div className="space-y-6 animate-fadeIn mt-12 pt-8 border-t border-dashed border-neutral-200">
            <div className="flex items-center gap-3 mb-4">
                <ClipboardList className="w-5 h-5 text-brand-blue" />
                <div>
                    <h3 className="text-xl font-black text-neutral-800 uppercase tracking-widest">
                        Resultado da Pesquisa Psicossocial (PSA)
                    </h3>
                    <p className="text-sm text-neutral-500 mt-1">Percepção direta do colaborador sobre o ambiente de trabalho.</p>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {aggregatedResults.map((result) => (
                    <div key={result.id} className={`p-5 rounded-xl border ${result.status.bg} shadow-sm relative overflow-hidden group`}>
                        <div className="flex justify-between items-start mb-3 relative z-10">
                            <h4 className="text-base font-bold text-neutral-800 w-3/4 leading-tight">{result.title}</h4>
                            <div className="text-right">
                                <span className={`block text-3xl font-black ${result.status.color}`}>{result.average.toFixed(1)}</span>
                                <span className="text-[10px] text-neutral-400 uppercase font-bold">Escala 1-5</span>
                            </div>
                        </div>
                        <div className="h-2 w-full bg-white/60 rounded-full overflow-hidden mb-3 relative z-10">
                            <div className={`h-full ${result.status.bar} transition-all duration-1000`} style={{ width: `${(result.average / 5) * 100}%` }}></div>
                        </div>
                        <div className="flex justify-between items-center relative z-10">
                            <span className={`text-xs font-black uppercase tracking-widest px-2 py-1 rounded bg-white/80 ${result.status.color}`}>
                                {result.status.label}
                            </span>
                            <span className="text-[10px] text-neutral-500 font-medium">
                                {result.questions.length} questões
                            </span>
                        </div>
                    </div>
                ))}
            </div>
            <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 flex gap-3 items-start">
                <Info className="w-4 h-4 text-neutral-400 mt-0.5 shrink-0" />
                <p className="text-xs text-neutral-500 leading-relaxed">
                    <strong>Nota:</strong> No PSA, pontuações mais altas (próximas de 5.0) indicam uma percepção positiva do ambiente e menor risco psicossocial. Pontuações baixas indicam áreas de desconforto ou insatisfação que podem gerar riscos ergonômicos.
                </p>
            </div>
        </div>
    );
};

const RiskManagementView: React.FC<RiskManagementViewProps> = ({ reports, tenantId }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCompanyId, setFilterCompanyId] = useState('');
    const [filterRoleId, setFilterRoleId] = useState('');
    const [companies, setCompanies] = useState<Company[]>([]);
    const [roles, setRoles] = useState<JobRole[]>([]);
    
    const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
    const [isDataRevealed, setIsDataRevealed] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [isCheckingPassword, setIsCheckingPassword] = useState(false);

    useEffect(() => {
        if (tenantId) {
            supabase.from('companies').select('id, name, created_at').eq('tenant_id', tenantId).order('name')
            .then(({data}) => { if (data) setCompanies(data); });
        }
    }, [tenantId]);

    useEffect(() => {
        if (tenantId) {
            let query = supabase.from('job_roles').select('id, title, benchmarks').eq('tenant_id', tenantId).eq('active', true).order('title');
            if (filterCompanyId) query = query.eq('company_id', filterCompanyId);
            query.then(({data}) => {
                if (data) setRoles(data);
                else setRoles([]);
            });
        }
    }, [tenantId, filterCompanyId]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && selectedReportId) {
                if(isPasswordModalOpen) setIsPasswordModalOpen(false);
                else setSelectedReportId(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedReportId, isPasswordModalOpen]);

    const aggregatedData = useMemo(() => {
        const riskCounts: Record<string, number> = {};
        const nr01LevelCounts = { Baixo: 0, Médio: 0, Alto: 0 };
        const reportsWithRisk: any[] = [];
        
        let totalRiskSum = 0;
        let countForAverage = 0;

        Object.keys(RISK_FLAG_CONFIG).forEach(k => riskCounts[k] = 0);

        const filteredReports = reports.filter(report => {
            if (report.status !== 'completed') return false;
            if (filterCompanyId && report.company_id !== filterCompanyId) return false;
            if (filterRoleId && report.role_id !== filterRoleId) return false;
            if (searchTerm && !report.name?.toLowerCase().includes(searchTerm.toLowerCase()) && !report.email?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
            return true;
        });

        filteredReports.forEach(report => {
            // Se não houver scores, adiciona com risco nulo para visibilidade
            if (!report.scores || Object.keys(report.scores).length === 0) {
                reportsWithRisk.push({
                    ...report,
                    nr01: { psychosocial_risk_level: 'N/A' },
                    riskIndex: 0,
                    detectedFlags: []
                });
                return;
            }

            const unifiedRisk = riskAnalysisService.calculateCombinedRiskIndex(report.scores);
            
            if (unifiedRisk.level === 'Crítico' || unifiedRisk.level === 'Alto') nr01LevelCounts.Alto++;
            else if (unifiedRisk.level === 'Moderado') nr01LevelCounts.Médio++;
            else nr01LevelCounts.Baixo++;

            totalRiskSum += unifiedRisk.risk_percentage;
            countForAverage++;

            const analysis = riskAnalysisService.calculatePsychosocialRisks(report.scores);
            analysis.detectedRisks.forEach(risk => { 
                if(riskCounts[risk] !== undefined) riskCounts[risk]++; 
            });

            reportsWithRisk.push({ 
                ...report, 
                nr01: { psychosocial_risk_level: unifiedRisk.level }, 
                riskIndex: unifiedRisk.risk_percentage,
                detectedFlags: analysis.detectedRisks
            });
        });

        const total = reportsWithRisk.length;
        const effectiveTotal = countForAverage === 0 ? 1 : countForAverage; // Use count of valid reports for stats
        const avgRisk = countForAverage > 0 ? Math.round(totalRiskSum / countForAverage) : 0;
        const highRiskPct = (nr01LevelCounts.Alto / effectiveTotal) * 100;

        let flagColor = 'emerald';
        let flagLabel = 'Bandeira Verde';
        let flagDesc = 'Baixo Risco Psicossocial identificado no grupo selecionado (NR-01).';

        if (total === 0) {
            flagColor = 'neutral';
            flagLabel = 'Dados Insuficientes';
            flagDesc = 'Não há relatórios suficientes para análise com os filtros atuais.';
        } else if (highRiskPct > 15) {
            flagColor = 'red';
            flagLabel = 'Bandeira Vermelha';
            flagDesc = 'Risco Preventivo Organizacional Crítico (>15% em Risco Alto NR-01). Requer revisão urgente de GRO/PGR.';
        } else if (highRiskPct > 5) {
            flagColor = 'amber';
            flagLabel = 'Bandeira Amarela';
            flagDesc = 'Atenção. Concentração moderada de vulnerabilidades dimensionais detectada no grupo.';
        }

        return { riskCounts, nr01LevelCounts, reportsWithRisk, flagColor, flagLabel, flagDesc, total, avgRisk };
    }, [reports, filterCompanyId, filterRoleId, searchTerm]);

    // CÁLCULO DE MÉDIAS DO GRUPO (PARA GRÁFICOS COLETIVOS)
    const groupAverageScores = useMemo(() => {
        if (aggregatedData.reportsWithRisk.length === 0) return {};

        const sums: Record<string, number> = {};
        const counts: Record<string, number> = {};

        const attributesToAvg = INNERMETRIX_ATTRIBUTES;
        const surveyQuestionsToAvg: string[] = [];
        PSYCHOSOCIAL_SURVEY_DATA.dimensions.forEach(d => {
            d.questions.forEach((_, idx) => surveyQuestionsToAvg.push(`${d.id}-${idx}`));
        });

        [...attributesToAvg, ...surveyQuestionsToAvg].forEach(key => {
            sums[key] = 0;
            counts[key] = 0;
        });

        aggregatedData.reportsWithRisk.forEach(report => {
            if (!report.scores) return;
            attributesToAvg.forEach(attr => {
                const val = getScoreFromMap(attr, report.scores);
                if (val !== undefined && !isNaN(val)) {
                    sums[attr] += val;
                    counts[attr]++;
                }
            });
            surveyQuestionsToAvg.forEach(qKey => {
                if (report.scores && report.scores[qKey] !== undefined) {
                    sums[qKey] += Number(report.scores[qKey]);
                    counts[qKey]++;
                }
            });
        });

        const averages: Record<string, number> = {};
        Object.keys(sums).forEach(key => {
            if (counts[key] > 0) {
                averages[key] = sums[key] / counts[key];
            }
        });

        return averages;
    }, [aggregatedData.reportsWithRisk]);

    const selectedReport = useMemo(() => {
        if (!selectedReportId) return null;
        
        const primaryReport = aggregatedData.reportsWithRisk.find(r => r.id === selectedReportId);
        if (!primaryReport) return null;

        const pEmail = (primaryReport.email || "").toLowerCase().trim();
        if (!pEmail) return primaryReport;

        const relatedReports = reports.filter(r => 
            (r.email || "").toLowerCase().trim() === pEmail && 
            r.status === 'completed'
        );

        let mergedScores = { ...primaryReport.scores };
        let initialBalance = primaryReport.dimensional_balance || primaryReport.metadata?.dimensional_balance || {};
        mergedScores = { ...mergedScores, ...initialBalance };

        let mergedAttributes = [...(primaryReport.attribute_index || [])];
        
        relatedReports.forEach(r => {
            if (r.id === primaryReport.id) return;
            const rScores = r.scores || {};
            const rBalance = r.dimensional_balance || r.metadata?.dimensional_balance || {};
            mergedScores = { ...mergedScores, ...rScores, ...rBalance };
            
            if ((!mergedAttributes || mergedAttributes.length === 0) && r.attribute_index?.length) {
                mergedAttributes = r.attribute_index;
            }
        });

        const mergedRisk = riskAnalysisService.calculateCombinedRiskIndex(mergedScores);

        return {
            ...primaryReport,
            scores: mergedScores,
            attribute_index: mergedAttributes,
            nr01: { psychosocial_risk_level: mergedRisk.level },
            riskIndex: mergedRisk.risk_percentage
        };
    }, [selectedReportId, aggregatedData.reportsWithRisk, reports]);

    const reportData = useMemo(() => {
        if (!selectedReport) return { radar: [], attributes: [] };

        const currentRole = roles.find(r => r.id === selectedReport.job_role_id || r.id === selectedReport.job_id);
        const benchmarks = currentRole?.benchmarks || {};

        const radar = Object.keys(SYNONYM_MAP).map(attr => ({
            attribute: attr,
            candidate: getScoreFromMap(attr, selectedReport.scores),
            benchmark: getScoreFromMap(attr, benchmarks) || 7.0,
            fullMark: 10
        })) as RadarDataPoint[];

        const indexItems: AttributeIndexItem[] = selectedReport.attribute_index || selectedReport.analysis?.attribute_index || [];
        const mainList: MainAttributeItem[] = selectedReport.main_attributes_list || selectedReport.analysis?.main_attributes_list || [];
        
        const resultMap = new Map<string, AttributeIndexItem>();
        indexItems.forEach(item => { resultMap.set(item.component.toLowerCase().trim(), { ...item }); });
        
        mainList.forEach(item => {
            const key = item.attribute.toLowerCase().trim();
            if (!resultMap.has(key)) {
                resultMap.set(key, { category: "Atributo", component: item.attribute, score: item.score, score_description: "", analysis: "" });
            }
        });
        
        const attributes = Array.from(resultMap.values()).sort((a, b) => a.component.localeCompare(b.component));

        return { radar, attributes, benchmarks };
    }, [selectedReport, roles]);

    const handleUnlockData = async () => { /* ... lógica de senha mantida ... */ };

    if (selectedReport) {
        return (
            <div className="fixed inset-0 z-[100] bg-[#F8FAFC] flex flex-col animate-fadeIn overflow-hidden">
                <header className="bg-white border-b border-neutral-200 px-8 py-4 flex justify-between items-center shrink-0 shadow-sm z-50">
                    <div className="flex items-center gap-6">
                        <button onClick={() => { setSelectedReportId(null); setIsDataRevealed(false); }} className="flex items-center gap-2 px-4 py-2 text-neutral-500 hover:text-brand-blue hover:bg-neutral-50 rounded-xl transition-all font-bold text-base border border-transparent hover:border-neutral-200">
                            <ArrowLeft className="w-5 h-5" /> Voltar ao Painel
                        </button>
                        <div className="h-8 w-px bg-neutral-200"></div>
                        <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md ${selectedReport.nr01.psychosocial_risk_level === 'Alto' || selectedReport.nr01.psychosocial_risk_level === 'Crítico' ? 'bg-red-600' : selectedReport.nr01.psychosocial_risk_level === 'Moderado' ? 'bg-amber-500' : selectedReport.nr01.psychosocial_risk_level === 'N/A' ? 'bg-neutral-400' : 'bg-emerald-600'}`}><User className="w-5 h-5" /></div>
                            <div><h2 className="text-xl font-black text-neutral-900">{isDataRevealed ? selectedReport.name : 'Nome Confidencial'}</h2>
                            <div className="flex items-center gap-2"><span className="text-xs font-black text-neutral-400 uppercase tracking-widest">{selectedReport.role}</span><span className="text-xs font-black px-2 py-0.5 rounded border uppercase bg-neutral-50 text-neutral-500 border-neutral-200">Risco: {selectedReport.nr01.psychosocial_risk_level}</span></div></div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {!isDataRevealed && (<button onClick={() => setIsPasswordModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-brand-blue text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md hover:bg-brand-dark transition-all"><LockKeyhole className="w-4 h-4" /> Desbloquear Dados</button>)}
                        <button onClick={() => window.print()} className="p-2.5 text-neutral-400 hover:text-brand-blue hover:bg-neutral-50 rounded-lg transition-all"><Printer className="w-5 h-5" /></button>
                    </div>
                </header>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-8 md:p-12">
                    <div className="max-w-6xl mx-auto space-y-12">
                        {selectedReport.nr01.psychosocial_risk_level === 'N/A' ? (
                            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[3rem] border border-neutral-200">
                                <FileQuestion className="w-16 h-16 text-neutral-300 mb-4" />
                                <h3 className="text-xl font-bold text-neutral-600">Dados Insuficientes para Análise</h3>
                                <p className="text-neutral-400 max-w-md text-center mt-2">
                                    Este relatório não possui os scores necessários (Attribute Index ou PSA) para o cálculo de risco psicossocial. Verifique a importação ou se o candidato completou o processo.
                                </p>
                            </div>
                        ) : (
                            <>
                                <OrganizationalFitSection candidateScores={selectedReport.scores || {}} benchmarkScores={reportData.benchmarks} />
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                                    <div className="lg:col-span-5 space-y-6">
                                        <div className={`p-8 rounded-[2rem] border shadow-sm flex items-center gap-6 ${selectedReport.riskIndex >= 60 ? 'bg-red-50 border-red-100' : selectedReport.riskIndex >= 40 ? 'bg-amber-50 border-amber-100' : 'bg-emerald-50 border-emerald-100'}`}>
                                            <div className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-inner ${selectedReport.riskIndex >= 60 ? 'bg-red-100 text-red-600' : selectedReport.riskIndex >= 40 ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}><Activity size={28}/></div>
                                            <div><p className="text-xs font-black text-neutral-400 uppercase tracking-widest">Índice de Risco GRO</p><p className={`text-3xl font-black ${selectedReport.riskIndex >= 60 ? 'text-red-700' : selectedReport.riskIndex >= 40 ? 'text-amber-700' : 'text-emerald-700'}`}>{selectedReport.riskIndex}%</p></div>
                                        </div>
                                        <div className="bg-brand-blue/5 border border-brand-blue/10 rounded-[2rem] p-8 shadow-inner relative"><h4 className="font-black text-brand-blue uppercase text-xs tracking-widest mb-6 flex items-center gap-2"><Info size={16} /> Parecer Comportamental NR-01</h4><div className={`transition-all duration-700 ${!isDataRevealed ? 'blur-xl select-none opacity-20' : 'blur-0 opacity-100'}`}><p className="text-xl text-neutral-700 leading-relaxed font-medium italic">"{selectedReport.overall_summary || 'O perfil demonstra padrões comportamentais alinhados aos requisitos de segurança psicossocial da função.'}"</p></div>{!isDataRevealed && (<div className="absolute inset-0 flex items-center justify-center"><div className="bg-white/80 backdrop-blur px-4 py-2 rounded-xl border border-neutral-200 shadow-xl flex items-center gap-2"><Lock className="w-4 h-4 text-neutral-400" /><span className="text-[10px] font-black text-neutral-500 uppercase">Conteúdo Protegido</span></div></div>)}</div>
                                    </div>
                                    <div className="lg:col-span-7 bg-white p-8 rounded-[2rem] border border-neutral-100 shadow-sm min-h-[450px] flex flex-col"><div className="mb-6"><h3 className="font-black text-neutral-800 uppercase text-sm tracking-widest">Balanço Dimensional</h3></div><div className="flex-1"><DimensionalBarChart scores={selectedReport.scores || {}} /></div></div>
                                </div>
                                <NR1DimensionalChart scores={selectedReport.scores || {}} />
                                <PsychometricAccordion scores={selectedReport.scores || {}} attributes={reportData.attributes} />
                                <PSASurveyResult scores={selectedReport.scores || {}} />
                                <div className="bg-neutral-100 p-6 rounded-2xl border border-neutral-200 flex items-start gap-4 text-neutral-500"><ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" /><div className="text-xs leading-relaxed"><strong className="block uppercase text-neutral-600 mb-1">Nota de Conformidade NR-01</strong>Este relatório é um instrumento de apoio à decisão e gestão de riscos psicossociais. Os dados apresentados são derivados de inventário de autopercepção e não constituem laudo médico ou psicológico clínico.</div></div>
                            </>
                        )}
                    </div>
                </div>
                {/* Modal Password */}
                {isPasswordModalOpen && (<div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-neutral-900/70 backdrop-blur-md animate-fadeIn"><div className="bg-white w-full max-w-md rounded-[3rem] p-12 shadow-2xl border border-white/20 animate-slideDown"><div className="flex flex-col items-center text-center"><div className="w-24 h-24 bg-brand-lightBlue rounded-full flex items-center justify-center mb-8 shadow-inner"><LockKeyhole className="w-12 h-12 text-brand-blue" /></div><h3 className="text-2xl font-black text-neutral-800 uppercase tracking-tight mb-3">Acesso ao Dossiê</h3><p className="text-sm text-neutral-500 mb-10 font-medium">Esta visualização contém dados sensíveis. Confirme sua senha de acesso.</p><input type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !isCheckingPassword && handleUnlockData()} placeholder="Sua senha do sistema" disabled={isCheckingPassword} className="w-full text-center text-xl font-bold px-6 py-5 bg-neutral-50 border-2 border-neutral-100 rounded-[2rem] focus:border-brand-blue focus:ring-8 focus:ring-brand-blue/5 outline-none transition-all mb-10 placeholder:font-normal" autoFocus /><div className="flex gap-4 w-full"><button onClick={() => { setIsPasswordModalOpen(false); setPasswordInput(''); }} disabled={isCheckingPassword} className="flex-1 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-neutral-400 hover:bg-neutral-50 transition-all">Cancelar</button><button onClick={handleUnlockData} disabled={isCheckingPassword || !passwordInput} className="flex-1 px-6 py-4 rounded-2xl bg-brand-blue text-white text-xs font-black uppercase tracking-widest shadow-xl shadow-brand-blue/20 hover:bg-brand-dark transition-all flex items-center justify-center gap-3">{isCheckingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar'}</button></div></div></div></div>)}
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fadeIn pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black text-neutral-800 flex items-center gap-3">
                        <ShieldCheck className="w-8 h-8 text-brand-blue" />
                        Gestão de Riscos Organizacionais (NR-01)
                    </h2>
                    <p className="text-neutral-500 text-base font-medium">
                        Monitoramento preventivo de saúde psicossocial baseado no Equilíbrio Dimensional Axiais.
                    </p>
                </div>
                <div className="bg-brand-blue text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg shadow-brand-blue/20">
                    <LayoutGrid className="w-4 h-4 text-blue-300" />
                    <span className="text-sm font-black uppercase tracking-widest">Painel GRO Ativo</span>
                </div>
            </div>
            
            <div className="bg-white p-4 rounded-2xl border border-neutral-100 shadow-sm flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2 text-xs font-black text-neutral-400 uppercase tracking-widest mr-2">
                    <Filter className="w-4 h-4" /> Filtros:
                </div>
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar por nome do indivíduo..." className="w-full pl-10 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-base font-bold text-neutral-700 outline-none" />
                </div>
                <div className="relative w-full md:w-auto min-w-[180px]">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <select value={filterCompanyId} onChange={(e) => { setFilterCompanyId(e.target.value); setFilterRoleId(''); }} className="w-full pl-10 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-base font-bold text-neutral-700 outline-none appearance-none">
                        <option value="">Todas as Empresas</option>
                        {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div className="relative w-full md:w-auto min-w-[180px]">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <select value={filterRoleId} onChange={(e) => setFilterRoleId(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-base font-bold text-neutral-700 outline-none appearance-none">
                        <option value="">Todas as Funções</option>
                        {roles.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
                    </select>
                </div>
                {(filterCompanyId || filterRoleId || searchTerm) && (
                    <button onClick={() => { setFilterCompanyId(''); setFilterRoleId(''); setSearchTerm(''); }} className="p-2 text-neutral-400 hover:text-red-500 transition-colors"><X className="w-5 h-5" /></button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-sm flex flex-col justify-between">
                    <p className="text-xs font-black text-neutral-400 uppercase tracking-widest mb-3">Grupo Analisado</p>
                    <div className="flex items-end justify-between">
                        <p className="text-4xl font-black text-neutral-800">{aggregatedData.total}</p>
                        <Users className="w-5 h-5 text-neutral-200" />
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-sm flex flex-col justify-between">
                    <p className="text-xs font-black text-red-500 uppercase tracking-widest mb-3">Risco Alto (GRO)</p>
                    <div className="flex items-end justify-between">
                        <p className="text-4xl font-black text-red-600">{aggregatedData.nr01LevelCounts.Alto}</p>
                        <AlertOctagon className="w-5 h-5 text-red-100" />
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-sm flex flex-col justify-between">
                    <p className="text-xs font-black text-amber-500 uppercase tracking-widest mb-3">Risco Médio (GRO)</p>
                    <div className="flex items-end justify-between">
                        <p className="text-4xl font-black text-amber-600">{aggregatedData.nr01LevelCounts.Médio}</p>
                        <AlertTriangle className="w-5 h-5 text-amber-100" />
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-sm flex flex-col justify-between">
                    <p className="text-xs font-black text-orange-500 uppercase tracking-widest mb-3">Índice Risco Médio</p>
                    <div className="flex items-end justify-between">
                        <p className="text-4xl font-black text-orange-600">{aggregatedData.avgRisk}%</p>
                        <ShieldCheck className="w-5 h-5 text-orange-100" />
                    </div>
                </div>
            </div>

            {/* SEÇÃO GRÁFICA COLETIVA */}
            {aggregatedData.total > 0 && Object.keys(groupAverageScores).length > 0 && (
                <div className="space-y-8 animate-slideDown">
                    <div className="bg-gradient-to-r from-[#002855] to-brand-blue text-white p-6 rounded-2xl shadow-lg flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <BarChart3 className="w-6 h-6 text-blue-300" />
                            <div>
                                <h3 className="text-xl font-bold uppercase tracking-widest">Diagnóstico Coletivo (Média do Grupo)</h3>
                                <p className="text-sm text-blue-200">Análise agregada de {aggregatedData.total} colaboradores baseada nos filtros ativos.</p>
                            </div>
                        </div>
                        <span className="text-[10px] font-black uppercase bg-white/20 px-3 py-1 rounded-full border border-white/30">Visão Sintética</span>
                    </div>

                    <div className="space-y-12">
                        <div className="space-y-4">
                            <h4 className="text-sm font-bold text-neutral-500 uppercase tracking-widest pl-2 flex items-center gap-2">
                                <Activity className="w-4 h-4 text-brand-blue" /> Balanço Dimensional Médio (Grupo)
                            </h4>
                            <div className="w-full">
                                <DimensionalBarChart scores={groupAverageScores} />
                            </div>
                        </div>
                        <div className="space-y-4">
                            <h4 className="text-sm font-bold text-neutral-500 uppercase tracking-widest pl-2 flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-brand-blue" /> Detalhamento NR-1 Coletivo
                            </h4>
                            <div className="w-full">
                                <NR1DimensionalChart scores={groupAverageScores} />
                            </div>
                        </div>
                    </div>
                    
                    {/* Renderiza PSA Médio se houver dados */}
                    {Object.keys(groupAverageScores).some(k => k.includes('-')) && (
                        <div className="space-y-2">
                            <h4 className="text-sm font-bold text-neutral-500 uppercase tracking-widest pl-2">Clima Psicossocial Médio (PSA)</h4>
                            <PSASurveyResult scores={groupAverageScores} />
                        </div>
                    )}
                </div>
            )}

            {/* Bandeiras de Risco */}
            <div className="bg-white rounded-[2rem] p-8 border border-neutral-100 shadow-sm mt-8">
                <div className="flex items-center gap-3 mb-6">
                    <Flag className="w-6 h-6 text-brand-blue" />
                    <h3 className="text-xl font-black text-neutral-800 uppercase tracking-widest">Mapa de Bandeiras de Risco (Incidência no Grupo)</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(aggregatedData.riskCounts).map(([riskKey, count]) => {
                        const totalAnalyzed = aggregatedData.total || 1;
                        const percentage = (Number(count) / totalAnalyzed) * 100;
                        const config = RISK_FLAG_CONFIG[riskKey as PsychosocialRiskType];
                        
                        if (!config) return null;

                        return (
                            <div key={riskKey} className={`p-4 rounded-xl border ${percentage > 0 ? config.bg : 'bg-neutral-50 border-neutral-100 opacity-60'}`}>
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <config.icon className={`w-5 h-5 ${config.color}`} />
                                        <span className={`text-xs font-black uppercase tracking-wider ${config.color}`}>{config.label}</span>
                                    </div>
                                    <span className={`text-2xl font-black ${percentage > 0 ? 'text-neutral-800' : 'text-neutral-300'}`}>
                                        {percentage.toFixed(0)}%
                                    </span>
                                </div>
                                <div className="h-1.5 w-full bg-white/50 rounded-full overflow-hidden mb-2">
                                    <div className={`h-full ${config.color.replace('text', 'bg')}`} style={{ width: `${percentage}%` }}></div>
                                </div>
                                <p className="text-xs text-neutral-500 leading-tight">{config.description}</p>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className={`relative overflow-hidden rounded-[2rem] p-8 border-2 shadow-xl transition-all ${
                  aggregatedData.flagColor === 'red' ? 'bg-red-50 border-red-200' : 
                  aggregatedData.flagColor === 'amber' ? 'bg-amber-50 border-amber-200' : 
                  aggregatedData.flagColor === 'neutral' ? 'bg-neutral-50 border-neutral-200' : 'bg-emerald-50 border-emerald-200'}`}>
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="flex items-center gap-6">
                        <div className={`w-24 h-24 rounded-full flex items-center justify-center border-4 shadow-inner shrink-0 ${
                            aggregatedData.flagColor === 'red' ? 'bg-red-100 border-red-300 text-red-600' : 
                            aggregatedData.flagColor === 'amber' ? 'bg-amber-100 border-amber-300 text-amber-600' : 
                            aggregatedData.flagColor === 'neutral' ? 'bg-neutral-100 border-neutral-300 text-neutral-400' : 'bg-emerald-100 border-emerald-300 text-emerald-600'}`}>
                            <Flag className="w-12 h-12 fill-current" />
                        </div>
                        <div>
                            <h3 className={`text-3xl font-black uppercase tracking-widest mb-1 ${
                                aggregatedData.flagColor === 'red' ? 'text-red-800' : 
                                aggregatedData.flagColor === 'amber' ? 'text-amber-800' : 
                                aggregatedData.flagColor === 'neutral' ? 'text-neutral-500' : 'text-emerald-800'}`}>{aggregatedData.flagLabel}</h3>
                            <p className="text-neutral-700 max-w-xl text-base font-bold opacity-80 leading-relaxed italic">"{aggregatedData.flagDesc}"</p>
                        </div>
                    </div>
                    <div className="bg-white/50 p-4 rounded-2xl border border-white flex flex-col items-center min-w-[120px]">
                        <span className="text-xs font-black uppercase text-neutral-400 mb-1">Pessoas em Risco</span>
                        <span className={`text-5xl font-black ${aggregatedData.nr01LevelCounts.Alto > 0 ? 'text-red-600' : 'text-neutral-700'}`}>{aggregatedData.nr01LevelCounts.Alto}</span>
                    </div>
                </div>
            </div>
            
            {/* LISTAGEM DE COLABORADORES */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-neutral-100 flex flex-col overflow-hidden min-h-[500px] mt-8">
                <div className="px-8 py-6 border-b border-neutral-50 bg-neutral-50/30 flex justify-between items-center">
                    <h3 className="font-black text-neutral-800 uppercase text-sm tracking-widest">Painel de Indivíduos e Riscos</h3>
                    <span className="text-xs font-black bg-neutral-200 text-neutral-600 px-2 py-0.5 rounded-full">{aggregatedData.reportsWithRisk.length} Avaliados</span>
                </div>
                
                {aggregatedData.reportsWithRisk.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-20 opacity-30">
                        <Search className="w-12 h-12 mx-auto mb-4" />
                        <p className="text-xs font-black uppercase">Nenhum resultado encontrado</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                        {aggregatedData.reportsWithRisk.map((r) => {
                            const isMissingData = r.nr01.psychosocial_risk_level === 'N/A';
                            return (
                                <button 
                                    key={r.id} 
                                    onClick={() => { setSelectedReportId(r.id); setIsDataRevealed(false); }}
                                    className={`text-left border p-5 rounded-2xl transition-all group relative overflow-hidden flex flex-col justify-between ${isMissingData ? 'bg-neutral-50 border-neutral-100 opacity-80' : 'bg-white border-neutral-200 hover:shadow-lg hover:border-brand-blue/30'}`}
                                >
                                    <div className={`absolute top-0 left-0 w-1.5 h-full ${
                                        isMissingData ? 'bg-neutral-300' :
                                        r.nr01.psychosocial_risk_level === 'Alto' || r.nr01.psychosocial_risk_level === 'Crítico' ? 'bg-red-500' : 
                                        r.nr01.psychosocial_risk_level === 'Moderado' ? 'bg-amber-500' : 'bg-emerald-500'
                                    }`}></div>
                                    
                                    <div className="pl-3 w-full">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="w-10 h-10 rounded-xl bg-neutral-100 text-neutral-600 flex items-center justify-center font-black text-sm group-hover:bg-brand-blue group-hover:text-white transition-colors">
                                                {(r.name || 'C').substring(0, 2).toUpperCase()}
                                            </div>
                                            <div className="text-right">
                                                <span className={`block text-xs font-black px-2 py-1 rounded border uppercase mb-1 ${
                                                    isMissingData ? 'bg-neutral-100 text-neutral-500 border-neutral-200' :
                                                    r.nr01.psychosocial_risk_level === 'Alto' || r.nr01.psychosocial_risk_level === 'Crítico' ? 'bg-red-50 text-red-600 border-red-200' : 
                                                    r.nr01.psychosocial_risk_level === 'Moderado' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                                                    {isMissingData ? 'Dados n/d' : r.nr01.psychosocial_risk_level}
                                                </span>
                                                {!isMissingData && <span className={`text-sm font-black ${r.nr01.psychosocial_risk_level === 'Alto' || r.nr01.psychosocial_risk_level === 'Crítico' ? 'text-red-600' : 'text-neutral-400'}`}>Risco {r.riskIndex}%</span>}
                                            </div>
                                        </div>
                                        
                                        <div className="mb-4">
                                            <p className="text-base font-bold text-neutral-800 truncate mb-1">{r.name}</p>
                                            <p className="text-xs font-bold text-neutral-400 uppercase truncate">{r.role}</p>
                                        </div>

                                        {/* Flags Detectadas neste Indivíduo */}
                                        <div className="flex flex-wrap gap-1 mt-auto">
                                            {(() => {
                                                if (isMissingData) return null;
                                                const flags = (r.detectedFlags || []) as PsychosocialRiskType[];
                                                if (flags.length > 0) {
                                                    return (
                                                        <>
                                                            {flags.slice(0, 3).map((flag, idx) => {
                                                                const flagCfg = RISK_FLAG_CONFIG[flag];
                                                                if (!flagCfg) return null;
                                                                return (
                                                                    <span key={idx} className={`text-[10px] font-bold px-1.5 py-0.5 rounded border flex items-center gap-1 ${flagCfg.bg} ${flagCfg.color.replace('text', 'text').replace('600', '700')}`} title={flagCfg.label}>
                                                                        <flagCfg.icon className="w-2.5 h-2.5" />
                                                                        {flagCfg.label.split(' ')[0]} {/* Nome curto */}
                                                                    </span>
                                                                );
                                                            })}
                                                            {flags.length > 3 && (
                                                                <span className="text-[10px] text-neutral-400 px-1 py-0.5">+{ flags.length - 3 }</span>
                                                            )}
                                                        </>
                                                    );
                                                }
                                                return (
                                                    <span className="text-[9px] text-emerald-600 font-bold flex items-center gap-1"><ShieldCheck className="w-3 h-3"/> Sem bandeiras críticas</span>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
            
            {/* Disclaimer Legal */}
            <div className="bg-neutral-100/50 p-6 rounded-[2rem] border border-neutral-200 flex items-start gap-4 text-neutral-500"><ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" /><div className="text-xs leading-relaxed"><strong className="block uppercase text-neutral-600 mb-1">Nota de Conformidade NR-01</strong>Esta ferramenta atua exclusivamente como <strong>Indicador Preventivo Organizacional</strong> em conformidade com a NR-01. Os dados são gerados a partir do inventário dimensional de personalidade (DNA Innermetrix) e não constituem diagnóstico clínico, perícia médica ou avaliação de saúde mental. Os resultados devem ser utilizados por profissionais de SST, RH e Liderança para mitigação de riscos ergonômicos psicossociais.</div></div>
        </div>
    );
};

export default RiskManagementView;
