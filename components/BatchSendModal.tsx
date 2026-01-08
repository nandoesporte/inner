
import React, { useState, useEffect } from 'react';
import { X, Send, Users, AlertCircle, CheckCircle2, Loader2, Building, Briefcase, Check, LayoutGrid, FileText } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { Company, JobRole, AssessmentType } from '../types';
import { reportTrackingService } from '../services/reportTrackingService';

interface BatchSendModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId?: string;
  onSuccess: () => void;
}

const BatchSendModal: React.FC<BatchSendModalProps> = ({ isOpen, onClose, tenantId, onSuccess }) => {
  const [step, setStep] = useState<'config' | 'sending' | 'result'>('config');
  const [candidatesText, setCandidatesText] = useState('');
  const [parsedCandidates, setParsedCandidates] = useState<{name: string, email: string}[]>([]);
  const [errorLines, setErrorLines] = useState<number[]>([]);
  
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState('');
  
  // Changed to array for multi-select
  const [assessmentTypes, setAssessmentTypes] = useState<AssessmentType[]>(['ADV']);
  const [includeResume, setIncludeResume] = useState(true);
  
  const [companies, setCompanies] = useState<Company[]>([]);
  const [roles, setRoles] = useState<JobRole[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [sentCount, setSentCount] = useState(0);

  useEffect(() => {
    if (isOpen && tenantId) {
      fetchCompanies();
      reset();
    }
  }, [isOpen, tenantId]);

  useEffect(() => {
    if (selectedCompanyId) {
      fetchRoles(selectedCompanyId);
      setSelectedRoleId('');
    } else {
      setRoles([]);
    }
  }, [selectedCompanyId]);

  const fetchCompanies = async () => {
    if (!tenantId) return;
    setIsDataLoading(true);
    const { data } = await supabase.from('companies').select('*').eq('tenant_id', tenantId).order('name');
    if (data) setCompanies(data);
    setIsDataLoading(false);
  };

  const fetchRoles = async (companyId: string) => {
    const { data } = await supabase.from('job_roles').select('*').eq('company_id', companyId).eq('active', true);
    if (data) setRoles(data);
  };

  const reset = () => {
    setStep('config');
    setCandidatesText('');
    setParsedCandidates([]);
    setErrorLines([]);
    setSelectedCompanyId('');
    setSelectedRoleId('');
    setAssessmentTypes(['ADV']);
    setIncludeResume(true);
    setSentCount(0);
    setLoading(false);
  };

  const toggleType = (type: AssessmentType) => {
      setAssessmentTypes(prev => {
          if (prev.includes(type)) {
              if (prev.length === 1) return prev; // Keep at least one
              return prev.filter(t => t !== type);
          }
          return [...prev, type];
      });
  };

  const validateCandidates = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    const valid: {name: string, email: string}[] = [];
    const errors: number[] = [];

    lines.forEach((line, index) => {
      const parts = line.split(/[;,\t]+/).map(p => p.trim());
      const emailIndex = parts.findIndex(p => p.includes('@') && p.includes('.'));
      if (emailIndex !== -1) {
        valid.push({ name: parts.filter((_, i) => i !== emailIndex).join(' ') || "Candidato", email: parts[emailIndex] });
      } else {
        errors.push(index + 1);
      }
    });

    setParsedCandidates(valid);
    setErrorLines(errors);
  };

  const handleSend = async () => {
    if (!tenantId || parsedCandidates.length === 0 || !selectedCompanyId || assessmentTypes.length === 0) return;
    setLoading(true);
    setStep('sending');
    try {
      const result = await reportTrackingService.createBatchInvite(tenantId, {
        companyId: selectedCompanyId,
        jobId: selectedRoleId || undefined,
        assessmentTypes,
        candidates: parsedCandidates,
        includeResume
      });
      if (result.success) { setSentCount(result.sent || 0); setStep('result'); } 
      else { alert(`Erro ao enviar: ${result.error}`); setStep('config'); }
    } catch (error) { setStep('config'); } finally { setLoading(false); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl z-10 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center px-6 py-4 border-b border-neutral-100 bg-neutral-50/50">
          <div><h3 className="font-bold text-xl text-neutral-900 flex items-center gap-2"><Users className="w-5 h-5 text-brand-blue" /> Envio em Lote Unificado</h3><p className="text-xs text-neutral-500 mt-1">Um convite único por candidato, contendo múltiplos testes.</p></div>
          <button onClick={onClose} disabled={loading} className="text-neutral-400 hover:text-neutral-600 transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 overflow-y-auto">
          {step === 'config' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div><label className="text-xs font-bold text-neutral-500 uppercase flex items-center gap-1 mb-1"><Building className="w-3.5 h-3.5" /> Empresa</label><select value={selectedCompanyId} onChange={(e) => setSelectedCompanyId(e.target.value)} disabled={isDataLoading} className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:border-brand-blue outline-none disabled:opacity-50"><option value="">{isDataLoading ? 'Carregando...' : 'Selecione...'}</option>{companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                 <div><label className="text-xs font-bold text-neutral-500 uppercase flex items-center gap-1 mb-1"><Briefcase className="w-3.5 h-3.5" /> Cargo</label><select value={selectedRoleId} onChange={(e) => setSelectedRoleId(e.target.value)} disabled={!selectedCompanyId} className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:border-brand-blue outline-none disabled:opacity-50"><option value="">Selecione...</option>{roles.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}</select></div>
              </div>

              <div>
                  <label className="text-[10px] font-bold text-brand-blue uppercase flex items-center gap-1 mb-2"><LayoutGrid className="w-3.5 h-3.5" /> Selecione as Avaliações</label>
                  <div className="grid grid-cols-4 gap-3">
                      {['ADV', 'IM_NR1', 'PSA'].map((type) => (
                          <div 
                            key={type} 
                            onClick={() => toggleType(type as AssessmentType)}
                            className={`
                                cursor-pointer rounded-xl border p-3 flex flex-col items-center justify-center text-center transition-all
                                ${assessmentTypes.includes(type as AssessmentType) 
                                    ? 'bg-brand-lightBlue/20 border-brand-blue shadow-sm' 
                                    : 'bg-white border-neutral-200 text-neutral-400 hover:border-neutral-300'}
                            `}
                          >
                              <div className={`w-4 h-4 rounded-full border mb-2 flex items-center justify-center ${assessmentTypes.includes(type as AssessmentType) ? 'bg-brand-blue border-brand-blue' : 'border-neutral-300'}`}>
                                  {assessmentTypes.includes(type as AssessmentType) && <Check className="w-3 h-3 text-white" />}
                              </div>
                              <span className={`text-xs font-bold ${assessmentTypes.includes(type as AssessmentType) ? 'text-brand-blue' : 'text-neutral-500'}`}>
                                  {type === 'ADV' ? 'ADV' : type === 'IM_NR1' ? 'NR1' : 'PSA'}
                              </span>
                          </div>
                      ))}
                      
                      <div 
                        onClick={() => setIncludeResume(!includeResume)}
                        className={`
                            cursor-pointer rounded-xl border p-3 flex flex-col items-center justify-center text-center transition-all
                            ${includeResume 
                                ? 'bg-neutral-100 border-neutral-300 shadow-sm' 
                                : 'bg-white border-neutral-200 text-neutral-400 hover:border-neutral-300'}
                        `}
                      >
                          <div className={`w-4 h-4 rounded-full border mb-2 flex items-center justify-center ${includeResume ? 'bg-neutral-600 border-neutral-600' : 'border-neutral-300'}`}>
                              {includeResume && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <span className={`text-xs font-bold ${includeResume ? 'text-neutral-700' : 'text-neutral-500'}`}>
                              <FileText className="w-3 h-3 inline mr-1" /> CV
                          </span>
                      </div>
                  </div>
              </div>

              <div>
                  <div className="flex justify-between items-center mb-1"><label className="text-xs font-bold text-neutral-500 uppercase">Lista de Candidatos</label><span className="text-[10px] text-neutral-400">Nome, E-mail (um por linha)</span></div>
                  <textarea value={candidatesText} onChange={e => { setCandidatesText(e.target.value); validateCandidates(e.target.value); }} placeholder={`Exemplo:\nAna Souza, ana@email.com\nJoão Silva, joao@empresa.com`} rows={6} className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-mono focus:bg-white focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none transition-all resize-none" />
                  <div className="mt-2 flex justify-between items-center"><div className="text-xs">{parsedCandidates.length > 0 ? (<span className="text-emerald-600 font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {parsedCandidates.length} candidatos válidos</span>) : (<span className="text-neutral-400">Cole os dados acima...</span>)}</div>{errorLines.length > 0 && (<div className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Erro nas linhas: {errorLines.join(', ')}</div>)}</div>
              </div>
            </div>
          )}

          {step === 'sending' && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="relative mb-6"><div className="w-16 h-16 border-4 border-brand-lightBlue rounded-full"></div><div className="absolute top-0 left-0 w-16 h-16 border-4 border-brand-blue border-t-transparent rounded-full animate-spin"></div><Send className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-brand-blue" /></div>
                  <h4 className="text-lg font-bold text-neutral-800">Disparando Convites Unificados...</h4>
                  <p className="text-sm text-neutral-500 mt-2 max-w-xs">Gerando links múltiplos por candidato.</p>
              </div>
          )}

          {step === 'result' && (
              <div className="flex flex-col items-center justify-center py-8 text-center animate-fadeIn">
                  <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6"><CheckCircle2 className="w-10 h-10 text-emerald-600" /></div>
                  <h4 className="text-2xl font-bold text-neutral-900 mb-2">Lote Enviado!</h4>
                  <p className="text-neutral-500 mb-8 max-w-md"><strong>{sentCount}</strong> convites enviados com sucesso.</p>
                  <button onClick={() => { onSuccess(); onClose(); }} className="px-6 py-2.5 bg-brand-blue text-white font-bold rounded-xl shadow-lg hover:bg-brand-dark transition-all">Voltar ao Dashboard</button>
              </div>
          )}
        </div>

        {step === 'config' && (
            <div className="p-4 bg-neutral-50 border-t border-neutral-100 flex justify-end gap-3">
                <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 rounded-lg">Cancelar</button>
                <button onClick={handleSend} disabled={parsedCandidates.length === 0 || !selectedCompanyId || loading} className="px-6 py-2 bg-brand-blue text-white font-bold rounded-lg shadow-sm hover:bg-brand-dark disabled:opacity-50 flex items-center gap-2 transition-all"><Send className="w-4 h-4" /> Enviar Links {parsedCandidates.length > 0 ? `(${parsedCandidates.length})` : ''}</button>
            </div>
        )}
      </div>
    </div>
  );
};

export default BatchSendModal;