
import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { RadarDataPoint } from '../types';

interface RadarChartWrapperProps {
  data: RadarDataPoint[];
  title?: string;
}

const RadarChartWrapper: React.FC<RadarChartWrapperProps> = ({ data, title }) => {
  return (
    <div className="w-full h-full flex flex-col min-h-[450px]">
      {title && (
         <div className="flex justify-between items-center mb-8 border-b border-neutral-50 pb-4">
            <h3 className="font-black text-lg text-neutral-800 uppercase tracking-widest">{title}</h3>
            <div className="flex gap-6">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-neutral-200 border border-neutral-300"></div>
                    <span className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">Benchmark</span>
                </div>
            </div>
         </div>
      )}
      
      <div className="flex-grow w-full relative min-h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
            <PolarGrid gridType="polygon" stroke="#cbd5e1" strokeWidth={1} />
            <PolarAngleAxis 
                dataKey="attribute" 
                tick={{ fill: '#475569', fontSize: 11, fontWeight: 800, letterSpacing: '0.05em' }} 
                tickFormatter={(val) => (val || '').toUpperCase()}
            />
            <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
            
            <Radar
              name="Alvo (Vaga)"
              dataKey="benchmark"
              stroke="#94A3B8"
              strokeWidth={2}
              strokeDasharray="6 3"
              fill="#94A3B8"
              fillOpacity={0.05}
              isAnimationActive={false}
            />

            {data.some(d => d.technical !== undefined) && (
              <Radar
                name="Histórico (CV)"
                dataKey="technical"
                stroke="#10B981" 
                strokeWidth={3}
                fill="#10B981"
                fillOpacity={0.15}
              />
            )}

            <Radar
              name="Real (Candidato)"
              dataKey="candidate"
              stroke="#002855" 
              strokeWidth={4}
              fill="#002855"
              fillOpacity={0.1}
            />

            <Tooltip 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', fontSize: '13px', fontWeight: '800' }}
            />
            <Legend 
                verticalAlign="bottom"
                wrapperStyle={{ paddingTop: '30px', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em' }} 
                iconType="circle"
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default RadarChartWrapper;
