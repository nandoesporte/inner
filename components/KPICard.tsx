
import React from 'react';
import { KPI } from '../types';

const KPICard: React.FC<{ kpi: KPI }> = ({ kpi }) => {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100 flex flex-col justify-between h-full hover:shadow-md transition-shadow">
      
      {/* Header: Label e Badge */}
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-neutral-500 font-bold text-sm lg:text-base leading-tight w-2/3">
          {kpi.label}
        </h3>
        
        {/* Badge "ÚLTIMO MÊS" fixo conforme print */}
        <div className="bg-[#DCFCE7] text-[#166534] text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
           Último Mês
        </div>
      </div>
      
      {/* Valor Gigante */}
      <div className="mb-4">
         <p className="text-5xl font-bold text-neutral-800 tracking-tight">{kpi.value}</p>
      </div>

      {/* Footer: Barra de Progresso e Percentual */}
      <div className="flex items-center gap-4 mt-auto">
         {/* Barra Azul Escura (Marca) */}
         <div className="h-1.5 flex-1 bg-neutral-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#002855] rounded-full" style={{ width: '35%' }}></div>
         </div>
         
         <span className="text-sm font-bold text-neutral-600">
            {kpi.trend > 0 ? '+' : ''}{kpi.trend}%
         </span>
      </div>
    </div>
  );
};

export default KPICard;
