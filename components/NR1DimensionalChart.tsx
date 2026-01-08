
import React from 'react';
import { getScoreFromMap } from '../services/riskAnalysisService';

interface NR1DimensionalChartProps {
  scores: any;
}

const NR1DimensionalChart: React.FC<NR1DimensionalChartProps> = ({ scores }) => {
  
  // Mapeamento Oficial Innermetrix -> NR-1
  const dimensions = [
    { id: '1', original: 'Empatia', label: '1. Relações Interpessoais NR1' },
    { id: '2', original: 'Pensamento Prático', label: '2. Gestão de Demandas e Eficácia Operacional NR1' },
    { id: '3', original: 'Pensamento Sistêmico', label: '3. Clareza Organizacional e Conformidade NR1' },
    { id: '4', original: 'Autoestima', label: '4. Autopercepção e Resiliência Pessoal NR1' },
    { id: '5', original: 'Consciência de Função', label: '5. Clareza de Papel e Responsabilidade NR1' },
    { id: '6', original: 'Auto-Direção', label: '6. Sentido, Propósito e Autonomia NR1' }
  ];

  // Regras de Classificação NR-1 Específicas
  const getRiskClassification = (score: number) => {
    if (score <= 4.0) return { label: 'ALTO RISCO', color: 'bg-[#E93D25]', text: 'text-[#E93D25]' }; // Vermelho
    if (score <= 5.9) return { label: 'MODERADO RISCO', color: 'bg-[#F59E0B]', text: 'text-[#F59E0B]' }; // Amarelo/Âmbar
    if (score <= 8.0) return { label: 'BAIXO RISCO', color: 'bg-[#0056D2]', text: 'text-[#0056D2]' }; // Azul (conforme imagem)
    return { label: 'MUITO BAIXO RISCO', color: 'bg-[#10B981]', text: 'text-[#10B981]' }; // Verde
  };

  return (
    <div className="bg-white p-8 rounded-[2rem] border border-neutral-100 shadow-sm animate-fadeIn">
      
      {/* Texto Introdutório NR-1 */}
      <div className="mb-10 pb-6 border-b border-neutral-100">
        <h3 className="text-lg font-black text-neutral-800 uppercase tracking-widest mb-4">
          Comparativo de Equilíbrio Dimensional (NR-1)
        </h3>
        <p className="text-xs text-neutral-600 leading-relaxed text-justify mb-4">
          A NR1 exige o Gerenciamento de Riscos Ocupacionais (GRO) e o Programa de Gerenciamento de Riscos (PGR), que inclui a análise de riscos psicossociais. Com o Attribute Index, é possível identificar não apenas a presença destes riscos, mas também a vulnerabilidade específica de cada colaborador a eles, permitindo a criação de um PGR/GRO mais estratégico, com medidas de prevenção e controle personalizadas e alinhadas à complexidade da interação pessoa-trabalho.
        </p>
        
        <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200">
          <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-2">
            Classificação de Risco (Categorias):
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px] font-black">
            <span className="text-[#E93D25]">≤ 4,0: ALTO RISCO</span>
            <span className="text-[#F59E0B]">4,1 – 5,9: MODERADO RISCO</span>
            <span className="text-[#0056D2]">6,0 – 8,0: BAIXO RISCO</span>
            <span className="text-[#10B981]">8,1 – 10,0: MUITO BAIXO RISCO</span>
          </div>
        </div>
      </div>

      {/* Gráficos de Barras */}
      <div className="space-y-8">
        <h4 className="text-sm font-bold text-neutral-800 mb-6">Gráficos dos Componentes do Relatório</h4>
        
        {dimensions.map((dim) => {
          const rawScore = getScoreFromMap(dim.original, scores) || 0;
          const score = Number(rawScore.toFixed(1));
          const classification = getRiskClassification(score);

          return (
            <div key={dim.id} className="space-y-2">
              <div className="flex justify-between items-end">
                <span className="text-xs font-bold text-neutral-900">{dim.label}</span>
                {/* Score exibido à direita, fora da barra, como no PDF */}
                <span className="text-xs font-black text-neutral-700">{score.toFixed(1)}</span>
              </div>
              
              <div className="relative h-8 w-full border border-neutral-300 bg-white rounded-sm overflow-visible flex items-center">
                {/* Barra de Valor */}
                <div 
                  className={`h-full relative z-10 flex items-center justify-end pr-2 transition-all duration-1000 ${classification.color}`}
                  style={{ width: `${score * 10}%` }}
                >
                   {/* Efeito de brilho/corte na ponta */}
                   <div className="absolute right-0 top-0 bottom-0 w-4 bg-white/20 transform skew-x-12"></div>
                </div>

                {/* Régua de Escala (0.0 a 10.0) */}
                <div className="absolute top-full left-0 right-0 flex justify-between px-0.5 z-0 mt-1">
                   {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(tick => (
                     <div key={tick} className="flex flex-col items-center" style={{ width: '0px' }}>
                        <div className="h-1 w-px bg-neutral-300 -mt-1"></div>
                        <span className="text-[8px] text-neutral-400 mt-0.5">{tick}.0</span>
                     </div>
                   ))}
                </div>
              </div>
              {/* Espaçador para a régua */}
              <div className="h-4"></div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default NR1DimensionalChart;
