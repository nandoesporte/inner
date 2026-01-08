
import React from 'react';
import { ShieldAlert, AlertTriangle, ArrowLeft } from 'lucide-react';

const LinkErrorView: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 font-sans">
      <div className="bg-white p-10 rounded-3xl shadow-xl max-w-md w-full text-center border border-neutral-100 animate-fadeIn">
        
        <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
          <ShieldAlert className="w-12 h-12 text-red-500" />
        </div>
        
        <h1 className="text-2xl font-black text-neutral-800 mb-3 uppercase tracking-tight">
          Link Inválido ou Expirado
        </h1>
        
        <p className="text-neutral-500 text-sm leading-relaxed mb-8">
          Não foi possível identificar o código de acesso (token) na sua solicitação. O link pode estar incompleto, ter expirado ou já ter sido utilizado.
        </p>

        <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 mb-8 text-left flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-xs text-neutral-600">
                <span className="font-bold block mb-1 text-neutral-800">O que fazer?</span>
                Verifique se você copiou o link completo do seu e-mail. Se o problema persistir, solicite um novo convite ao recrutador responsável.
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

export default LinkErrorView;
