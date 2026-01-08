import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine, LabelList } from 'recharts';
import { ShieldAlert, Zap, ChevronDown, ChevronUp, Info, Target, Brain, Briefcase } from 'lucide-react';

interface CompetencyGapChartProps {
    data: {
        attribute: string;
        behavioralGap: number;
        technicalGap: number;
    }[];
}

const CompetencyGapChart: React.FC<CompetencyGapChartProps> = ({ data }) => {
    const [isExplanationOpen, setIsExplanationOpen] = useState(false);

    // Cálculos de Resumo Executivo
    const summary = useMemo(() => {
        if (!data || data.length === 0) return { avgGap: 0, criticalCount: 0, readiness: 0 };
        const totalGap = data.reduce((acc, curr) => acc + curr.behavioralGap, 0);
        const criticals = data.filter(d => d.behavioralGap <= -2.0).length;
        // Cálculo de prontidão baseado no gap médio
        const readiness = Math.max(0, Math.min(100, 100 + (totalGap / data.length) * 10));
        return {
            avgGap: totalGap / data.length,
            criticalCount: criticals,
            readiness: readiness
        };
    }, [data]);

    const getStatusColor = (score: number) => {
        if (score >= 75) return 'text-emerald-600 bg-emerald-50 border-emerald-100';
        if (score >= 50) return 'text-amber-600 bg-amber-50 border-amber-100';
        return 'text-red-600 bg-red-50 border-red-100';
    };

    const getGapColor = (gap: number) => {
        if (gap >= 0.5) return '#10B981'; // Superávit (Verde)
        if (gap >= -0.5) return '#3B82F6'; // Alinhado (Azul)
        if (gap > -2.0) return '#F59E0B';  // Gap Moderado (Amarelo)
        return '#EF4444';                 // Gap Crítico (Vermelho)
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const val = payload[0].value;
            let status = "";
            let description = "";

            if (val >= 0.5) {
                status = "Superávit";
                description = "O candidato excede os requisitos ideais.";
            } else if (val >= -0.5) {
                status = "Alinhado";
                description = "Perfil em sincronia com o cargo.";
            } else if (val > -2.0) {
                status = "Gap Moderado";
                description = "Necessário desenvolvimento pontual.";
            } else {
                status = "Gap Crítico";
                description = "Risco de performance/mindset.";
            }

            return (
                <div className="bg-white p-4 border border-neutral-200 shadow-2xl rounded-2xl max-w-[240px] animate-fadeIn">
                    <p className="font-black text-neutral-800 uppercase text-[10px] tracking-widest mb-1">{label}</p>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg font-black text-neutral-900">{val > 0 ? `+${val.toFixed(1)}` : val.toFixed(1)}</span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                            val >= 0.5 ? 'bg-emerald-100 text-emerald-700' :
                            val >= -0.5 ? 'bg-blue-100 text-blue-700' :
                            val > -2.0 ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-700'
                        }`}>
                            {status}
                        </span>
                    </div>
                    <p className="text-[11px] text-neutral-500 leading-relaxed italic">
                        {description}
                    </p>
                </div>
            );
        }
        return null;
    };

    const RenderChart = ({ dataKey, title, icon: Icon }: { dataKey: 'behavioralGap' | 'technicalGap', title: string, icon: any }) => {
        // Verifica se há dados reais para o gap técnico (se todos forem 0, pode ser que o CV não tenha sido processado)
        const hasData = data.some(d => Math.abs(d[dataKey]) > 0.01);

        return (
            <div className="flex flex-col h-full bg-neutral-50/30 rounded-3xl border border-neutral-100 p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-white rounded-xl shadow-sm">
                        <Icon className="w-4 h-4 text-brand-blue" />
                    </div>
                    <h4 className="text-xs font-black text-neutral-700 uppercase tracking-[0.15em]">{title}</h4>
                </div>
                
                <div className="flex-grow min-h-[400px] relative">
                    {!hasData && dataKey === 'technicalGap' ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 text-neutral-400">
                            <Briefcase className="w-8 h-8 mb-3 opacity-20" />
                            <p className="text-xs font-bold uppercase tracking-widest">Sem evidências de CV</p>
                            <p className="text-[10px] mt-1">Solicite o currículo para habilitar o gap técnico.</p>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data} layout="vertical" margin={{ left: 10, right: 40, top: 10, bottom: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" />
                                <XAxis type="number" domain={[-10, 10]} hide />
                                {/* Removed textTransform from tick object and added tickFormatter to fix TypeScript error on line 115 */}
                                <YAxis 
                                    type="category" 
                                    dataKey="attribute" 
                                    tick={{ fontSize: 10, fill: '#64748B', fontWeight: 800 }} 
                                    tickFormatter={(val) => val.toUpperCase()}
                                    width={110}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip 
                                    cursor={{ fill: '#ffffff', opacity: 0.4 }}
                                    content={<CustomTooltip />}
                                />
                                <ReferenceLine x={0} stroke="#cbd5e1" strokeWidth={2} />
                                
                                <Bar dataKey={dataKey} radius={[4, 4, 4, 4]} barSize={16}>
                                    {data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={getGapColor(entry[dataKey])} />
                                    ))}
                                    <LabelList 
                                        dataKey={dataKey} 
                                        position="right" 
                                        content={(props: any) => {
                                            const { x, y, width, value, height } = props;
                                            // Posicionamento inteligente para valores negativos
                                            const isNegative = value < 0;
                                            const xPos = isNegative ? x - 25 : x + width + 5;
                                            return (
                                                <text 
                                                    x={xPos} 
                                                    y={y + height/2 + 4} 
                                                    fill={isNegative ? '#EF4444' : '#64748B'} 
                                                    fontSize={10} 
                                                    fontWeight="900"
                                                    textAnchor={isNegative ? 'end' : 'start'}
                                                >
                                                    {value > 0 ? `+${value.toFixed(1)}` : value.toFixed(1)}
                                                </text>
                                            );
                                        }}
                                    />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="bg-white p-8 rounded-[2rem] flex flex-col gap-8 shadow-sm border border-neutral-100">
            {/* Header com KPIs */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-8 border-b border-neutral-50">
                <div className="space-y-1">
                    <h3 className="text-base font-black text-neutral-800 uppercase tracking-[0.2em] flex items-center gap-3">
                        <Target className="w-5 h-5 text-brand-blue" /> Matriz de Desvios Estruturais
                    </h3>
                    <p className="text-[10px] text-neutral-400 font-black uppercase tracking-widest">Diferença absoluta entre o Perfil do Candidato e o Alvo do Cargo</p>
                </div>

                <div className="flex gap-4">
                    <div className={`px-5 py-4 rounded-2xl border flex flex-col items-center min-w-[150px] shadow-sm transition-all ${getStatusColor(summary.readiness)}`}>
                        <span className="text-[9px] font-black uppercase opacity-60 tracking-[0.2em] mb-1">Fit Estimado</span>
                        <span className="text-4xl font-black leading-none">{summary.readiness.toFixed(0)}%</span>
                    </div>
                    <div className={`px-5 py-4 rounded-2xl border flex flex-col items-center min-w-[150px] shadow-sm transition-all ${summary.criticalCount > 0 ? 'text-red-600 bg-red-50 border-red-200' : 'text-emerald-600 bg-emerald-50 border-emerald-200'}`}>
                        <span className="text-[9px] font-black uppercase opacity-60 tracking-[0.2em] mb-1">Gaps Críticos</span>
                        <span className="text-4xl font-black leading-none">{summary.criticalCount}</span>
                    </div>
                </div>
            </div>

            {/* Legenda */}
            <div className="flex flex-wrap justify-center gap-6 py-2 bg-neutral-50/50 rounded-xl border border-neutral-100">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#10B981]"></div>
                    <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Superávit</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#3B82F6]"></div>
                    <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Alinhado</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#F59E0B]"></div>
                    <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Moderado</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#EF4444]"></div>
                    <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Crítico (Déficit)</span>
                </div>
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <RenderChart dataKey="behavioralGap" title="DNA Comportamental" icon={Brain} />
                <RenderChart dataKey="technicalGap" title="Histórico Técnico (CV)" icon={Briefcase} />
            </div>

            {/* Guia */}
            <div className="border-t border-neutral-100 pt-6">
                <button 
                    onClick={() => setIsExplanationOpen(!isExplanationOpen)}
                    className="w-full flex items-center justify-between text-neutral-500 hover:text-brand-blue transition-all group py-2"
                >
                    <div className="flex items-center gap-3">
                        <Info className="w-4 h-4 text-brand-blue" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Como interpretar estes desvios?</span>
                    </div>
                    {isExplanationOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {isExplanationOpen && (
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
                        <div className="p-6 bg-white rounded-3xl border border-neutral-200 shadow-sm">
                            <h4 className="text-[11px] font-black text-red-600 uppercase mb-3 flex items-center gap-2">
                                <ShieldAlert className="w-4 h-4" /> Déficit (Valores Negativos)
                            </h4>
                            <p className="text-xs text-neutral-600 leading-relaxed font-medium">
                                Indica que o candidato possui um score <strong>menor</strong> que o exigido pelo benchmark. 
                                <br/><br/>
                                Gaps no <span className="text-blue-700">DNA</span> sugerem esforço mental maior para realizar a tarefa, enquanto gaps <span className="text-emerald-700">Técnicos</span> indicam falta de experiência prática.
                            </p>
                        </div>
                        <div className="p-6 bg-white rounded-3xl border border-neutral-200 shadow-sm">
                            <h4 className="text-[11px] font-black text-emerald-600 uppercase mb-3 flex items-center gap-2">
                                <Zap className="w-4 h-4" /> Superávit (Valores Positivos)
                            </h4>
                            <p className="text-xs text-neutral-600 leading-relaxed font-medium">
                                Indica que o candidato possui <strong>mais</strong> competência ou potencial que o necessário para o nível atual do cargo. 
                                <br/><br/>
                                Representa facilidade natural, mas superávits extremos (> 4.0) podem levar à desmotivação se a vaga não oferecer desafios à altura.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CompetencyGapChart;