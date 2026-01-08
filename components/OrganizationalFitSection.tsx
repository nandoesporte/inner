
import React, { useMemo } from 'react';
import { HelpCircle, ShieldAlert, Calculator, Info, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { riskAnalysisService } from '../services/riskAnalysisService';

interface Props {
  candidateScores: any;
  benchmarkScores: any; // Mantido para compatibilidade, mas o cálculo agora é intrínseco ao risco
}

const OrganizationalFitSection: React.FC<Props> = ({ candidateScores }) => {
  
  const riskResult = useMemo(() => {
      return riskAnalysisService.calculateCombinedRiskIndex(candidateScores);
  }, [candidateScores]);

  // Se não houver dados suficientes para calcular risco (sem NR1 nem PSA), não renderiza
  if (riskResult.details.sources_used.length === 0) return null;

  // Definição de Cores Baseada no Risco (Inverso do Fit: Alto Score = Ruim)
  const getRiskColor = (risk: number) => {
      if (risk >= 60) return 'text-red-600 bg-red-50 border-red-100'; // Crítico
      if (risk >= 40) return 'text-orange-600 bg-orange-50 border-orange-100'; // Alto
      if (risk >= 20) return 'text-amber-600 bg-amber-50 border-amber-100'; // Moderado
      return 'text-emerald-600 bg-emerald-50 border-emerald-100'; // Baixo
  };

  const colorClass = getRiskColor(riskResult.risk_percentage);
  const textColor = colorClass.split(' ')[0]; // Pega só a classe de texto

  return (
    <div className={`p-8 rounded-[2rem] border shadow-sm space-y-8 animate-fadeIn ${colorClass} bg-opacity-30`}>
      {/* Topo do Relatório */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-neutral-200/50 pb-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <ShieldAlert className={`w-8 h-8 ${textColor}`} />
            <div>
                <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-widest">Índice de Risco (GRO/NR-01)</h3>
                <div className="flex items-baseline gap-2">
                    <span className={`text-4xl font-black ${textColor}`}>{riskResult.risk_percentage}%</span>
                    <span className={`text-sm font-bold px-3 py-1 rounded-lg uppercase ${colorClass} bg-opacity-100 border`}>{riskResult.level}</span>
                </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 max-w-md">
            <div className="flex items-start gap-2 text-[10px] text-neutral-600 bg-white/60 p-3 rounded-xl">
                <Calculator className="w-3 h-3 mt-0.5 shrink-0" />
                <p>
                    <strong>Cálculo Unificado:</strong> Média ponderada entre a escala de risco psicométrico (NR-1) e a pesquisa psicossocial (PSA). 
                    <br/>Quanto <strong>maior</strong> o percentual, <strong>maior</strong> o risco organizacional.
                </p>
            </div>
            <div className="flex gap-2">
                {riskResult.details.sources_used.map(source => (
                    <span key={source} className="text-[9px] font-bold uppercase bg-white/80 px-2 py-1 rounded border border-neutral-200 text-neutral-500">
                        Fonte: {source}
                    </span>
                ))}
            </div>
        </div>
      </div>

      {/* Detalhamento dos Fatores de Risco */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/80 p-4 rounded-xl border border-neutral-100 flex justify-between items-center">
              <div>
                  <p className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Risco Psicométrico (NR-1)</p>
                  <p className="text-xs text-neutral-500">Baseado no Equilíbrio Dimensional</p>
              </div>
              <div className="text-right">
                  {riskResult.details.nr1_risk !== null ? (
                      <span className={`text-xl font-black ${getRiskColor(riskResult.details.nr1_risk).split(' ')[0]}`}>
                          {Math.round(riskResult.details.nr1_risk)}%
                      </span>
                  ) : <span className="text-xs text-neutral-300">N/A</span>}
              </div>
          </div>

          <div className="bg-white/80 p-4 rounded-xl border border-neutral-100 flex justify-between items-center">
              <div>
                  <p className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Risco Psicossocial (PSA)</p>
                  <p className="text-xs text-neutral-500">Baseado na Percepção do Colaborador</p>
              </div>
              <div className="text-right">
                  {riskResult.details.psa_risk !== null ? (
                      <span className={`text-xl font-black ${getRiskColor(riskResult.details.psa_risk).split(' ')[0]}`}>
                          {Math.round(riskResult.details.psa_risk)}%
                      </span>
                  ) : <span className="text-xs text-neutral-300">N/A</span>}
              </div>
          </div>
      </div>
      
      {/* Alerta de Interpretação */}
      {riskResult.risk_percentage > 40 && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-red-800">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <div className="text-xs leading-relaxed">
                  <strong>Atenção Requerida:</strong> Este perfil apresenta indicadores que sugerem vulnerabilidade a estressores ocupacionais. 
                  Recomenda-se acompanhamento próximo e validação das condições de trabalho (ergonomia cognitiva).
              </div>
          </div>
      )}
      
      {riskResult.risk_percentage <= 20 && (
          <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <div className="text-xs leading-relaxed">
                  <strong>Zona de Segurança:</strong> Os indicadores sugerem alta resiliência e adaptação positiva ao ambiente, representando baixo risco para o passivo trabalhista (GRO).
              </div>
          </div>
      )}

    </div>
  );
};

export default OrganizationalFitSection;
