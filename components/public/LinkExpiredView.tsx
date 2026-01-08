
import React from 'react';
import { Clock, CheckCircle2, ArrowLeft } from 'lucide-react';

const LinkExpiredView: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 font-sans">
      <div className="bg-white p-10 rounded-3xl shadow-xl max-w-md w-full text-center border border-neutral-100 animate-fadeIn">
        
        <div className="w-24 h-24 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
          <Clock className="w-12 h-12 text-neutral-400" />
        </div>
        
        <h1 className="text-2xl font-black text-neutral-800 mb-3 uppercase tracking-tight">
          Link Expirado
        </h1>
        
        <p className="text-neutral-500 text-sm leading-relaxed mb-8">
          Este link de avaliação não é mais válido. O questionário pode ter sido concluído anteriormente ou o prazo de acesso expirou.
        </p>

        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 mb-8 text-left flex gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-800">
                <span className="font-bold block mb-1">Processo Concluído?</span>
                Se você já finalizou este questionário, seus dados foram salvos com segurança e nenhuma ação adicional é necessária.
            </div>
        </div>

        <div className="pt-6 border-t border-neutral-100">
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                Pessoa Certa Analytics • Segurança
            </p>
        </div>
      </div>
    </div>
  );
};

export default LinkExpiredView;
