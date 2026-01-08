import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Brain, Target, AlertCircle, TrendingUp, ShieldCheck, Zap, Info, BookOpen, Calculator } from 'lucide-react';

interface ExecutiveRiskAnalysisProps {
    score: number;
    label: string;
    criticalGaps: string[];
}

const ExecutiveRiskAnalysis: React.FC<ExecutiveRiskAnalysisProps> = ({ score, label, criticalGaps }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [showMethodology, setShowMethodology] = useState(false);

    const getNarrative = () => {
        if (score >= 60) {
            return {
                summary: "Desalinhamento Estrutural com Alto Risco de Performance.",
                impact: "A contratação ou movimentação deste perfil apresenta uma probabilidade estatística elevada de turnover precoce ou baixo engajamento operacional. Os gaps identificados são de natureza axial (mindset), o que exige um esforço de gestão desproporcional para correção.",
                recommendation: "Não recomendada a progressão sem uma revisão profunda do Job Benchmark ou um plano de sucessão que mitigue as lacunas críticas.",
                icon: <AlertCircle className="w-5 h-5 text-red-500" />
            };
        } else if (score >= 30) {
            return {
                summary: "Aderência Condicional com Necessidade de Desenvolvimento.",
                impact: "O perfil demonstra competências base, porém os gaps moderados em " + (criticalGaps.length > 0 ? criticalGaps.join(", ") : "áreas específicas") + " atuarão como 'freios' de produtividade. O ROI desta contratação será médio-longo prazo devido ao tempo necessário para aculturamento.",
                recommendation: "Avançar apenas mediante Plano de Desenvolvimento Individual (PDI) focado nos gaps de mindset. Recomenda-se acompanhamento mensal por 90 dias.",
                icon: <TrendingUp className="w-5 h-5 text-amber-500" />
            };
        } else {
            return {
                summary: "Alta Compatibilidade Comportamental e Sincronia de Função.",
                impact: "Candidato apresenta baixíssimo atrito comportamental com as exigências da cadeira. A energia interna do indivíduo está canalizada para a execução, minimizando o 'custo invisível' de adaptação cultural.",
                recommendation: "Priorizar integração técnica imediata. Perfil com alto potencial de ROI rápido e estabilidade na função.",
                icon: <ShieldCheck className="w-5 h-5 text-emerald-500" />
            };
        }
    };

    const narrative = getNarrative();

    return (
        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden mt-4 transition-all duration-300">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-neutral-50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-brand-lightBlue text-brand-blue rounded-lg">
                        <Brain className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                        <h4 className="text-xs font-black text-neutral-800 uppercase tracking-widest">Leitura Executiva</h4>
                        <p className="text-[10px] text-neutral-400 font-bold uppercase mt-0.5">Parecer Analítico para Tomada de Decisão</p>
                    </div>
                </div>
                {isOpen ? <ChevronUp className="text-neutral-400" /> : <ChevronDown className="text-neutral-400" />}
            </button>

            {isOpen && (
                <div className="px-6 pb-6 animate-fadeIn">
                    <div className="pt-4 border-t border-neutral-50 space-y-5">
                        {/* Resumo */}
                        <div className="flex gap-4 items-start">
                            <div className="mt-1">{narrative.icon}</div>
                            <div>
                                <h5 className="text-sm font-bold text-neutral-800 mb-1">{narrative.summary}</h5>
                                <p className="text-xs text-neutral-600 leading-relaxed italic">
                                    "{narrative.impact}"
                                </p>
                            </div>
                        </div>

                        {/* Recommendation Block */}
                        <div className="p-4 bg-brand-lightBlue/30 rounded-xl border border-brand-blue/10">
                            <h5 className="text-[10px] font-black text-brand-blue uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                <Target className="w-3 h-3" /> Diretriz Estratégica
                            </h5>
                            <p className="text-xs text-brand-textBlue font-medium leading-relaxed">
                                {narrative.recommendation}
                            </p>
                        </div>

                        {/* Metodologia Científica (Recolhível interna) */}
                        <div className="border-t border-neutral-100 pt-4">
                            <button 
                                onClick={() => setShowMethodology(!showMethodology)}
                                className="flex items-center gap-2 text-[10px] font-black text-neutral-400 uppercase tracking-widest hover:text-brand-blue transition-colors"
                            >
                                <Calculator className="w-3 h-3" /> Fundamentação Metodológica {showMethodology ? '(-)' : '(+)'}
                            </button>

                            {showMethodology && (
                                <div className="mt-4 p-4 bg-neutral-50 rounded-xl border border-dashed border-neutral-200 space-y-4 animate-fadeIn">
                                    <div className="flex items-start gap-3">
                                        <BookOpen className="w-4 h-4 text-brand-blue mt-0.5 shrink-0" />
                                        <div className="space-y-3">
                                            <h6 className="text-[11px] font-bold text-neutral-800 uppercase">Algoritmo de Risco Exponencial v6.2</h6>
                                            <p className="text-[10px] text-neutral-600 leading-relaxed">
                                                Diferente de médias simples, este índice utiliza um <strong>Modelo Não-Compensatório</strong>. Na psicometria avançada, entende-se que competências extremas em uma área não compensam lacunas críticas em dimensões axiais do cargo.
                                            </p>
                                            <div className="bg-white p-2 rounded border border-neutral-200 font-mono text-[9px] text-neutral-500 text-center">
                                                Risk_Score = 1 - e^[ -0.4 * Σ( (Ideal - Real) / Ideal * Peso ) ]
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                                                <div className="space-y-1">
                                                    <span className="text-[9px] font-black text-brand-blue uppercase tracking-tighter">Gap Normalizado</span>
                                                    <p className="text-[9px] text-neutral-500 italic">Cada ponto de déficit é ponderado pela importância relativa da dimensão para a cadeira (Job Benchmark).</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="text-[9px] font-black text-brand-blue uppercase tracking-tighter">Aceleração Logística</span>
                                                    <p className="text-[9px] text-neutral-500 italic">A função exponencial garante que o risco cresça rapidamente após o primeiro gap crítico, refletindo o ponto de ruptura da performance.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footnote */}
                        <div className="flex items-center gap-2 text-[9px] font-bold text-neutral-300 uppercase tracking-tight">
                            <Zap className="w-3 h-3" /> Tecnologia Psychometric Engine v6.2 • Pessoa Certa Analytics
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExecutiveRiskAnalysis;