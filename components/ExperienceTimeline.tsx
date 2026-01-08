
import React from 'react';
import { Clock, Briefcase } from 'lucide-react';

interface ExperienceTimelineProps {
  totalYears: number;
  relevantYears: number;
  label?: string;
  color?: string;
}

const ExperienceTimeline: React.FC<ExperienceTimelineProps> = ({ totalYears, relevantYears, label, color = 'bg-brand-blue' }) => {
  const maxYears = Math.max(15, totalYears + 2); // Escala dinâmica
  const totalPercent = Math.min(100, (totalYears / maxYears) * 100);
  const relevantPercent = Math.min(100, (relevantYears / maxYears) * 100);

  return (
    <div className="space-y-2 w-full">
      <div className="flex justify-between items-end">
        <div>
          <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-tight">{label || 'Carreira'}</p>
          <p className="text-xs font-bold text-neutral-700">{totalYears} anos total</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold text-brand-accent uppercase tracking-tighter">Foco no Cargo</p>
          <p className="text-xs font-bold text-neutral-900">{relevantYears} anos exp.</p>
        </div>
      </div>
      
      <div className="relative h-2 w-full bg-neutral-100 rounded-full overflow-hidden">
        {/* Total Career */}
        <div 
          className="absolute top-0 left-0 h-full bg-neutral-300 rounded-full transition-all duration-700"
          style={{ width: `${totalPercent}%` }}
        />
        {/* Relevant Experience */}
        <div 
          className={`absolute top-0 left-0 h-full ${color} rounded-full shadow-sm transition-all duration-1000 delay-300`}
          style={{ width: `${relevantPercent}%` }}
        />
      </div>

      <div className="flex justify-between text-[8px] text-neutral-400 font-bold uppercase">
        <span>Início</span>
        <span>{maxYears} anos</span>
      </div>
    </div>
  );
};

export default ExperienceTimeline;
