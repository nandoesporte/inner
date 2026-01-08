import React from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle2, Info, ArrowDownRight } from 'lucide-react';

interface BehaviouralRiskWidgetProps {
    score: number;
    label: string;
    colorClass: string;
    criticalGaps: string[];
    isLoading?: boolean;
}

const BehaviouralRiskWidget: React.FC<BehaviouralRiskWidgetProps> = ({ score, label, colorClass, criticalGaps, isLoading }) => {
    if (isLoading) return <div className="h-48 bg-neutral-50 animate-pulse rounded-2xl border border-neutral-100"></div>;

    return (
        <div className={`p-6 rounded-2xl border shadow-sm transition-all duration-500 ${colorClass}`}>
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-[10px] font-black uppercase tracking-widest opacity-70 flex items-center gap-1.5">
                        <ShieldAlert className="w-3 h-3" /> Índice de Risco de Desalinhamento
                    </h3>
                    <p className="text-2xl font-black mt-1">{label}</p>
                </div>
                <div className="text-right">
                    <span className="text-4xl font-black tracking-tighter">{score}%</span>
                </div>
            </div>

            {/* Barra de Risco */}
            <div className="h-1.5 w-full bg-white/40 rounded-full overflow-hidden mb-6">
                <div 
                    className="h-full bg-current transition-all duration-1000 ease-out" 
                    style={{ width: `${score}%` }}
                />
            </div>

            {/* Gaps Críticos */}
            <div className="space-y-3">
                <p className="text-[9px] font-bold uppercase tracking-tight opacity-60 flex items-center gap-1">
                    <ArrowDownRight className="w-3 h-3" /> Gaps Críticos Identificados ({criticalGaps.length})
                </p>
                
                {criticalGaps.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                        {criticalGaps.map((gap, i) => (
                            <span key={i} className="px-2 py-1 bg-white/50 border border-current/10 rounded-lg text-[10px] font-bold flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 text-red-500" /> {gap}
                            </span>
                        ))}
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-700 bg-white/50 p-2 rounded-lg border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Nenhum gap > 40% detectado.
                    </div>
                )}
            </div>

            <div className="mt-6 pt-4 border-t border-current/10 flex items-start gap-2">
                <Info className="w-3 h-3 mt-0.5 opacity-50" />
                <p className="text-[9px] leading-tight opacity-60 font-medium">
                    Algoritmo Ponderado Exponencial v6.1. O risco não é compensado por excessos em outras dimensões para garantir integridade da função.
                </p>
            </div>
        </div>
    );
};

export default BehaviouralRiskWidget;