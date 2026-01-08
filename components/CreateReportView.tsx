
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Company, JobRole, AssessmentType } from '../types';
import { ArrowLeft, User, Mail, Building, Briefcase, Link as LinkIcon, Sparkles, CheckCircle2, Copy, AlertCircle, Loader2, Users, Send, FileText, Check, LayoutGrid } from 'lucide-react';
import { reportTrackingService } from '../services/reportTrackingService';
import BatchSendModal from './BatchSendModal';

interface CreateReportViewProps {
  tenantId?: string;
  onBack: () => void;
}

const CreateReportView: React.FC<CreateReportViewProps> = ({ tenantId, onBack }) => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  
  const [companies, setCompanies] = useState<Company[]>([]);
  const [roles, setRoles] = useState<JobRole[]>([]);

  // Added includeResume to state
  const [includeResume, setIncludeResume] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    companyId: '',
    roleId: '',
    observation: '',
    assessmentTypes: ['ADV'] as AssessmentType[] 
  });

  useEffect(() => {
    if (tenantId) fetchCompanies();
  }, [tenantId]);

  useEffect(() => {
    if (formData.companyId) {
      fetchRoles(formData.companyId);
    } else {
      setRoles([]);
    }
  }, [formData.companyId]);

  const fetchCompanies = async () => {
    const { data } = await supabase
      .from('companies')
      .select('id, name, created_at')
      .eq('tenant_id', tenantId)
      .order('name');
    if (data) setCompanies(data);
  };

  const fetchRoles = async (companyId: string) => {
    const { data } = await supabase
      .from('job_roles')
      .select('id, title')
      .eq('company_id', companyId)
      .eq('active', true);
    if (data) setRoles(data);
  };

  const toggleAssessmentType = (type: AssessmentType) => {
      setFormData(prev => {
          const exists = prev.assessmentTypes.includes(type);
          if (exists) {
              // Don't allow empty selection
              if (prev.assessmentTypes.length === 1) return prev;
              return { ...prev, assessmentTypes: prev.assessmentTypes.filter(t => t !== type) };
          } else {
              return { ...prev, assessmentTypes: [...prev.assessmentTypes, type] };
          }
      });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;
    if (formData.assessmentTypes.length === 0) {
        alert("Selecione pelo menos um tipo de avaliação.");
        return;
    }
    setLoading(true);

    try {
      const result = await reportTrackingService.createBatchInvite(tenantId, {
          companyId: formData.companyId,
          jobId: formData.roleId || undefined,
          assessmentTypes: formData.assessmentTypes,
          candidates: [{ name: formData.name, email: formData.email }],
          includeResume: includeResume // Passing the option
      });

      if (!result.success) {
          throw new Error(result.error || 'Erro desconhecido ao processar convite.');
      }

      setSuccess(true);
    } catch (error: any) {
      console.error('Erro ao enviar relatório:', error);
      alert(`Falha no envio: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      companyId: '',
      roleId: '',
      observation: '',
      assessmentTypes: ['ADV']
    });
    setIncludeResume(true);
    setSuccess(false);
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto animate-fadeIn">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-neutral-500 hover:text-brand-blue mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Voltar ao Dashboard
        </button>

        <div className="bg-white rounded-2xl shadow-card p-8 text-center border border-neutral-100">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Send className="w-10 h-10 text-emerald-600 ml-1" />
          </div>
          <h2 className="text-2xl font-bold text-neutral-900 mb-2">Convite Unificado Enviado!</h2>
          <p className="text-neutral-500 mb-8 max-w-md mx-auto">
            O candidato <strong>{formData.name}</strong> recebeu um e-mail contendo os links para:
          </p>

          <div className="flex justify-center gap-2 mb-8 flex-wrap">
              {formData.assessmentTypes.map(t => (
                  <span key={t} className="px-3 py-1 bg-brand-lightBlue text-brand-blue font-bold rounded-lg text-sm border border-brand-blue/20">
                      {t === 'ADV' ? 'Avaliação Liderança (ADV)' : t === 'IM_NR1' ? 'Recrutamento (NR1)' : 'Psicossocial (PSA)'}
                  </span>
              ))}
              {includeResume && (
                  <span className="px-3 py-1 bg-neutral-100 text-neutral-600 font-bold rounded-lg text-sm border border-neutral-200">
                      + Currículo
                  </span>
              )}
          </div>

          <div className="flex justify-center gap-4">
            <button onClick={onBack} className="px-6 py-2.5 bg-white border border-neutral-200 text-neutral-600 font-medium rounded-xl hover:bg-neutral-50 transition-colors">Voltar ao Início</button>
            <button onClick={resetForm} className="px-6 py-2.5 bg-brand-blue text-white font-bold rounded-xl shadow-lg shadow-brand-blue/20 hover:bg-brand-dark transition-all flex items-center gap-2">
              <Users className="w-4 h-4" /> Enviar para Outro
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between mb-4">
         <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 -ml-2 text-neutral-400 hover:text-brand-blue rounded-full transition-colors"><ArrowLeft className="w-5 h-5" /></button>
            <div>
                <h2 className="text-2xl font-bold text-neutral-800">Novo Convite</h2>
                <p className="text-neutral-500 text-sm">Configure o pacote de avaliações para o candidato.</p>
            </div>
         </div>
         <button onClick={() => setIsBatchModalOpen(true)} className="hidden md:flex items-center gap-2 px-4 py-2 bg-brand-lightBlue text-brand-blue border border-brand-blue/20 rounded-lg hover:bg-brand-blue hover:text-white transition-all text-sm font-bold">
            <Users className="w-4 h-4" /> Enviar em Lote
         </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
        <div className="p-8 space-y-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-5">
               <h3 className="text-sm font-bold text-brand-blue uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-neutral-100"><User className="w-4 h-4" /> Dados do Candidato</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-700">Nome Completo <span className="text-primary">*</span></label>
                    <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ex: Ana Souza" className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-700">E-mail <span className="text-primary">*</span></label>
                    <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="Ex: ana.souza@email.com" className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none transition-all" />
                  </div>
               </div>
            </div>

            <div className="space-y-5">
               <h3 className="text-sm font-bold text-brand-blue uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-neutral-100"><Building className="w-4 h-4" /> Contexto</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-700">Empresa <span className="text-primary">*</span></label>
                    <select required value={formData.companyId} onChange={e => setFormData({...formData, companyId: e.target.value})} className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none transition-all">
                      <option value="">Selecione...</option>
                      {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-700">Cargo (Job Role)</label>
                    <div className="relative">
                      <select value={formData.roleId} onChange={e => setFormData({...formData, roleId: e.target.value})} disabled={!formData.companyId} className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none transition-all appearance-none disabled:opacity-50 disabled:cursor-not-allowed">
                        <option value="">Selecione...</option>
                        {roles.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
                      </select>
                      {!formData.companyId && <span className="absolute right-3 top-2.5 text-xs text-neutral-400">Selecione uma empresa primeiro</span>}
                    </div>
                  </div>
               </div>
            </div>

            <div className="space-y-5">
               <h3 className="text-sm font-bold text-brand-blue uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-neutral-100"><LayoutGrid className="w-4 h-4" /> Composição da Avaliação</h3>
               
               <p className="text-xs text-neutral-500 mb-4">Selecione quais instrumentos o candidato deverá responder. Todos serão enviados em um único convite.</p>

               <div className="grid grid-cols-1 gap-3">
                  <label className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all ${formData.assessmentTypes.includes('ADV') ? 'border-brand-blue bg-brand-lightBlue/10 shadow-sm' : 'border-neutral-200 hover:bg-neutral-50'}`}>
                      <input type="checkbox" checked={formData.assessmentTypes.includes('ADV')} onChange={() => toggleAssessmentType('ADV')} className="w-5 h-5 text-brand-blue rounded border-gray-300 focus:ring-brand-blue" />
                      <div className="ml-3">
                          <span className="block text-sm font-bold text-neutral-800">Attribute Index (ADV)</span>
                          <span className="block text-xs text-neutral-500">Avaliação completa de 78 atributos para Liderança e Gestão.</span>
                      </div>
                  </label>

                  <label className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all ${formData.assessmentTypes.includes('IM_NR1') ? 'border-brand-blue bg-brand-lightBlue/10 shadow-sm' : 'border-neutral-200 hover:bg-neutral-50'}`}>
                      <input type="checkbox" checked={formData.assessmentTypes.includes('IM_NR1')} onChange={() => toggleAssessmentType('IM_NR1')} className="w-5 h-5 text-brand-blue rounded border-gray-300 focus:ring-brand-blue" />
                      <div className="ml-3">
                          <span className="block text-sm font-bold text-neutral-800">Innermetrix Recruit (NR1)</span>
                          <span className="block text-xs text-neutral-500">Focado em Risco e Segurança do Trabalho. Versão simplificada.</span>
                      </div>
                  </label>

                  <label className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all ${formData.assessmentTypes.includes('PSA') ? 'border-brand-blue bg-brand-lightBlue/10 shadow-sm' : 'border-neutral-200 hover:bg-neutral-50'}`}>
                      <input type="checkbox" checked={formData.assessmentTypes.includes('PSA')} onChange={() => toggleAssessmentType('PSA')} className="w-5 h-5 text-brand-blue rounded border-gray-300 focus:ring-brand-blue" />
                      <div className="ml-3">
                          <span className="block text-sm font-bold text-neutral-800">Avaliação Psicossocial (PSA)</span>
                          <span className="block text-xs text-neutral-500">Questionário específico de conformidade e saúde mental.</span>
                      </div>
                  </label>
                  
                  <label className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all ${includeResume ? 'border-brand-blue bg-brand-lightBlue/10 shadow-sm' : 'border-neutral-200 hover:bg-neutral-50'}`}>
                      <input type="checkbox" checked={includeResume} onChange={(e) => setIncludeResume(e.target.checked)} className="w-5 h-5 text-brand-blue rounded border-gray-300 focus:ring-brand-blue" />
                      <div className="ml-3">
                          <span className="block text-sm font-bold text-neutral-800">Solicitar Currículo (Upload)</span>
                          <span className="block text-xs text-neutral-500">Inclui link para envio de CV e dados pessoais no email.</span>
                      </div>
                  </label>
               </div>
            </div>

            <div className="pt-4 flex items-center justify-end gap-4 border-t border-neutral-100">
               <button type="button" onClick={onBack} className="px-6 py-3 bg-white border border-neutral-200 text-neutral-600 font-medium rounded-xl hover:bg-neutral-50 transition-colors">Cancelar</button>
               <button type="submit" disabled={loading} className="px-8 py-3 bg-brand-blue hover:bg-brand-dark text-white font-bold rounded-xl shadow-lg shadow-brand-blue/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 flex items-center gap-2">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-4 h-4" />} 
                  {loading ? 'Processando...' : 'Enviar Convite Unificado'}
               </button>
            </div>
          </form>
        </div>
      </div>

      <BatchSendModal isOpen={isBatchModalOpen} onClose={() => setIsBatchModalOpen(false)} tenantId={tenantId} onSuccess={() => { alert('Lote enviado!'); onBack(); }} />
    </div>
  );
};

export default CreateReportView;