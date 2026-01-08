
import React from 'react';
import { FileText, CheckCircle2, AlertTriangle, Quote, Sparkles } from 'lucide-react';
import { CVEvidence } from '../types';

interface CVEvidencePanelProps {
  evidences: CVEvidence[];
  candidateName: string;
}

const CVEvidencePanel: React.FC<CVEvidencePanelProps> = ({ evidences, candidateName }) => {
  if (!evidences || evidences.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 bg-neutral-50/50 border-b border-neutral-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Quote className="w-5 h-5 text-brand-blue" />
          <h3 className="font-bold text-neutral-800 text-sm uppercase tracking-wider">Evidências do Currículo</h3>
        </div>
        <div className="flex items-center gap-1 text-[10px] font-bold text-brand-blue bg-brand-lightBlue px-2 py-0.5 rounded-full uppercase">
          <Sparkles className="w-3 h-3" /> IA Evidence Matcher
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {evidences.map((evidence, idx) => (
          <div key={idx} className={`p-4 rounded-xl border transition-all hover:shadow-md ${
            evidence.type === 'positive' ? 'bg-emerald-50/30 border-emerald-100' : 
            evidence.type === 'negative' ? 'bg-amber-50/30 border-amber-100' : 
            'bg-neutral-50 border-neutral-200'
          }`}>
            <div className="flex justify-between items-start mb-3">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-500">
                {evidence.competency}
              </span>
              {evidence.type === 'positive' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              )}
            </div>
            
            <p className="text-xs text-neutral-600 italic leading-relaxed mb-3">
              "{evidence.snippet}"
            </p>

            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${evidence.type === 'positive' ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
              <p className="text-[10px] font-bold text-neutral-500 uppercase">
                {evidence.type === 'positive' ? 'Valida Competência' : 'Ponto de Investigação'}
              </p>
            </div>
          </div>
        ))}
      </div>
      
      <div className="px-6 py-3 bg-brand-lightBlue/20 text-[9px] text-brand-blue font-bold uppercase tracking-widest text-center border-t border-neutral-100">
        Snippet extraído do documento original de {candidateName}
      </div>
    </div>
  );
};

export default CVEvidencePanel;
