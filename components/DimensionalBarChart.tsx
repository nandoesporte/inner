
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from 'recharts';
import { getScoreFromMap } from '../services/riskAnalysisService';

interface DimensionalBarChartProps {
  scores: any;
}

const DimensionalBarChart: React.FC<DimensionalBarChartProps> = ({ scores }) => {
  const dataPoints = [
    { name: 'Empatia', key: 'Empatia', type: 'Externo', color: '#002855' },
    { name: 'Pensamento Prático', key: 'Pensamento Prático', type: 'Externo', color: '#002855' },
    { name: 'Julgamento de Sistemas', key: 'Pensamento Sistêmico', type: 'Externo', color: '#002855' },
    { name: 'Autoestima', key: 'Autoestima', type: 'Interno', color: '#E93D25' },
    { name: 'Consciência de Função', key: 'Consciência de Função', type: 'Interno', color: '#E93D25' },
    { name: 'Autodireção', key: 'Auto-Direção', type: 'Interno', color: '#E93D25' },
  ];

  const chartData = dataPoints.map(d => ({
    ...d,
    score: getScoreFromMap(d.key, scores) || 0
  }));

  // Cálculo das Razões (Média / 10 para formato 0.XX)
  const extScores = chartData.filter(d => d.type === 'Externo').map(d => d.score);
  const intScores = chartData.filter(d => d.type === 'Interno').map(d => d.score);
  
  const extAvg = extScores.reduce((a,b) => a+b, 0) / (extScores.length || 1);
  const intAvg = intScores.reduce((a,b) => a+b, 0) / (intScores.length || 1);
  
  const extRatio = (extAvg / 10).toFixed(2);
  const intRatio = (intAvg / 10).toFixed(2);

  const RenderGroup = ({ data, label, color, align }: { data: any[], label: string, color: string, align: 'left' | 'right' }) => (
      <div className={`flex-1 flex flex-col relative h-full ${align === 'left' ? 'border-r border-dashed border-neutral-200' : ''}`}>
         {/* Vertical Label */}
         <div className={`absolute top-0 bottom-24 flex items-center justify-center w-8 z-10 ${align === 'left' ? 'left-0' : 'right-0'}`}>
             <span className="-rotate-90 text-[9px] font-black uppercase tracking-[0.2em] text-neutral-300 whitespace-nowrap select-none">{label}</span>
         </div>
         
         <div className={`flex-1 pt-12 ${align === 'left' ? 'pl-8 pr-4' : 'pl-4 pr-8'}`}>
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <YAxis domain={[0, 10]} hide />
                    <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        interval={0}
                        height={90}
                        tick={({ x, y, payload }) => {
                            const item = data.find(d => d.name === payload.value);
                            return (
                                <g transform={`translate(${x},${y})`}>
                                    {/* Score */}
                                    <text x={0} y={24} textAnchor="middle" fill={color} fontSize={18} fontWeight="900" fontFamily="Inter" style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.05))' }}>
                                        {item?.score.toFixed(1)}
                                    </text>
                                    {/* Label Multi-line */}
                                    <text x={0} y={50} textAnchor="middle" fill="#64748B" fontSize={10} fontWeight="700" fontFamily="Inter" style={{ textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                                        {payload.value.split(' ').map((w: string, i: number) => (
                                            <tspan x={0} dy={i===0?0:12} key={i}>{w}</tspan>
                                        ))}
                                    </text>
                                </g>
                            );
                        }}
                    />
                    <Bar dataKey="score" radius={[8, 8, 0, 0]} barSize={44} animationDuration={1500}>
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={color} />
                        ))}
                    </Bar>
                </BarChart>
             </ResponsiveContainer>
         </div>
      </div>
  );

  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-neutral-100 shadow-sm flex flex-col h-[520px] relative overflow-hidden">
      {/* Ratio Badge */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20">
         <div className="bg-white px-8 py-3 rounded-2xl border border-neutral-100 shadow-lg shadow-neutral-200/50 flex items-center gap-4">
            <div className="text-center">
                <span className="block text-2xl font-black text-[#002855] leading-none">{extRatio}</span>
            </div>
            <div className="h-8 w-px bg-neutral-200"></div>
            <div className="text-center">
                <span className="block text-2xl font-black text-[#E93D25] leading-none">{intRatio}</span>
            </div>
         </div>
      </div>

      <div className="flex-1 flex w-full">
         <RenderGroup data={chartData.slice(0,3)} label="DIMENSÃO EXTERNA" color="#002855" align="left" />
         <RenderGroup data={chartData.slice(3,6)} label="DIMENSÃO INTERNA" color="#E93D25" align="right" />
      </div>
    </div>
  );
};

export default DimensionalBarChart;
