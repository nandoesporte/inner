
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import { DimensionalBalance } from '../types';
import { getScoreFromMap } from '../services/riskAnalysisService';

interface ComparativeDimensionalChartProps {
  candidateData: DimensionalBalance | Record<string, any>;
  benchmarkData: Record<string, number>;
  candidateName?: string;
}

const ComparativeDimensionalChart: React.FC<ComparativeDimensionalChartProps> = ({ 
  candidateData, 
  benchmarkData,
  candidateName = "Candidato"
}) => {
  
  const dimensions = [
    { key: 'empathy', label: 'Empatia' },
    { key: 'practical_thinking', label: 'Pensamento Prático' },
    { key: 'systems_judgment', label: 'Pensamento Sistêmico' },
    { key: 'self_esteem_self_control', label: 'Autoestima' },
    { key: 'functional_awareness', label: 'Consciência de Função' },
    { key: 'self_direction', label: 'Auto-Direção' },
  ];

  const chartData = dimensions.map(dim => {
    const candScore = candidateData ? (
      (candidateData as any)[dim.key] || 
      (candidateData as any)[dim.label] ||
      getScoreFromMap(dim.label, candidateData) || 
      0
    ) : 0;

    const benchScore = benchmarkData ? (
      (benchmarkData as any)[dim.label] ||
      getScoreFromMap(dim.label, benchmarkData) || 
      0
    ) : 0;

    return {
      name: dim.label,
      candidate: Number(Number(candScore).toFixed(1)),
      benchmark: Number(Number(benchScore).toFixed(1)),
      diff: Number((Number(candScore) - Number(benchScore)).toFixed(1))
    };
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // Busca segura pelos itens no payload via dataKey
      const candidateItem = payload.find((p: any) => p.dataKey === 'candidate');
      const benchmarkItem = payload.find((p: any) => p.dataKey === 'benchmark');
      const diffItem = payload.find((p: any) => p.dataKey === 'diff');

      const candVal = candidateItem?.value ?? 0;
      const benchVal = benchmarkItem?.value ?? 0;
      const diffVal = diffItem?.value ?? (candVal - benchVal);

      return (
        <div className="bg-white p-4 border border-neutral-100 shadow-xl rounded-2xl animate-fadeIn z-50">
          <p className="font-black text-neutral-800 uppercase text-[10px] tracking-widest mb-3 border-b pb-2">{label || 'Dimensão'}</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-8">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: candidateItem?.fill || '#002855' }}></div>
                <span className="text-xs font-bold text-neutral-500">{candidateName}</span>
              </div>
              <span className="text-sm font-black" style={{ color: candidateItem?.fill || '#002855' }}>{candVal}</span>
            </div>
            <div className="flex items-center justify-between gap-8">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-neutral-300"></div>
                <span className="text-xs font-bold text-neutral-500">Benchmark</span>
              </div>
              <span className="text-sm font-black text-neutral-400">{benchVal}</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-dashed border-neutral-100">
             <p className={`text-[10px] font-black uppercase text-center ${diffVal >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                Desvio: {diffVal > 0 ? '+' : ''}{diffVal.toFixed(1)}
             </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-neutral-100 shadow-sm flex flex-col min-h-[600px] relative overflow-hidden w-full">
      <div className="flex justify-between items-center mb-10">
          <div className="space-y-1">
            <h3 className="text-sm md:text-base font-black text-neutral-800 uppercase tracking-[0.2em]">Comparativo de Equilíbrio Dimensional</h3>
            <p className="text-[10px] text-neutral-400 font-black uppercase tracking-widest">Sincronia entre Perfil Real e Exigência do Cargo</p>
          </div>
      </div>

      <div className="w-full h-[400px] relative">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 10, fontWeight: 800, fill: '#64748B' }} 
              tickFormatter={(val) => (val || '').toUpperCase()}
              axisLine={false}
              tickLine={false}
              interval={0}
              dy={15}
            />
            <YAxis 
              domain={[0, 10]} 
              ticks={[0, 2, 4, 6, 8, 10]} 
              tick={{ fontSize: 11, fontWeight: 800, fill: '#CBD5E1' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
            <Legend 
               verticalAlign="top" 
               align="right" 
               wrapperStyle={{ paddingBottom: '30px', textTransform: 'uppercase', fontSize: '9px', fontWeight: '900', letterSpacing: '0.1em' }} 
            />
            
            <Bar name={candidateName} dataKey="candidate" radius={[4, 4, 0, 0]} barSize={32}>
                {chartData.map((entry, index) => (
                    <Cell 
                        key={`cell-${index}`} 
                        // Vermelho para as 3 primeiras (Externas), Azul para as 3 últimas (Internas)
                        fill={index < 3 ? '#E93D25' : '#002855'} 
                    />
                ))}
            </Bar>
            <Bar name="Benchmark" dataKey="benchmark" fill="#cbd5e1" radius={[4, 4, 0, 0]} barSize={32} />
            <Bar name="Desvio" dataKey="diff" hide />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-8 border-t border-neutral-50 pt-8">
          <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-gradient-to-r from-[#E93D25] to-[#002855] rounded-sm"></div>
              <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Série Candidato</span>
          </div>
          <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-[#cbd5e1] rounded-sm"></div>
              <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Série Alvo (Benchmark)</span>
          </div>
      </div>
    </div>
  );
};

export default ComparativeDimensionalChart;
