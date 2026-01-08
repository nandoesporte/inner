
import React, { useState, useRef, useEffect } from 'react';
import { X, UploadCloud, FileText, CheckCircle2, AlertCircle, Loader2, User as UserIcon, Briefcase, ArrowRight, BrainCircuit, Sparkles, Link as LinkIcon, Globe, Building } from 'lucide-react';
import { COPY, MOCK_COMPANIES } from '../constants';
import { supabase } from '../supabaseClient';
import { JobRole, Company } from '../types';
import { candidateImportService } from '../services/candidateImportService';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId?: string;
  onSuccess: () => void;
}

type UploadStatus = 'idle' | 'uploading' | 'processing' | 'success' | 'error';
type UploadMethod = 'file' | 'link';

const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, tenantId, onSuccess }) => {
  const [method, setMethod] = useState<UploadMethod>('file');
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [candidateName, setCandidateName] = useState('');
  
  // Selection States
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  
  // Data Options
  const [companies, setCompanies] = useState<Company[]>([]);
  const [roles, setRoles] = useState<JobRole[]>([]);
  
  const [errorMessage, setErrorMessage] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && tenantId) {
      fetchCompanies();
    }
    if (!isOpen) {
        reset();
    }
  }, [isOpen, tenantId]);

  // Fetch Roles when Company Changes
  useEffect(() => {
      if (selectedCompanyId) {
          fetchRoles(selectedCompanyId);
          setSelectedRole(''); // Reset role selection
      } else {
          setRoles([]);
      }
  }, [selectedCompanyId]);

  const fetchCompanies = async () => {
      if (!tenantId) return;
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, created_at')
        .eq('tenant_id', tenantId)
        .order('name');
        
      if (data) setCompanies(data);
  };

  const fetchRoles = async (companyId: string) => {
    const { data } = await supabase.from('job_roles').select('id, title').eq('company_id', companyId).eq('active', true);
    if (data) setRoles(data);
    else setRoles([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!candidateName) {
        setCandidateName(selectedFile.name.replace('.pdf', '').replace(/_/g, ' '));
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const selectedFile = e.dataTransfer.files?.[0];
      if (selectedFile && selectedFile.type === 'application/pdf') {
          setFile(selectedFile);
          if (!candidateName) {
            setCandidateName(selectedFile.name.replace('.pdf', '').replace(/_/g, ' '));
          }
      }
  };

  const handleProcess = async () => {
    if (!tenantId) return;
    if (method === 'file' && !file) return;
    if (method === 'link' && !linkUrl) return;

    setStatus('uploading');
    setErrorMessage('');
    setProgress(0);

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 10;
      });
    }, 200);

    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1500)); 
      
      clearInterval(progressInterval);
      setProgress(100);
      
      setTimeout(() => {
        setStatus('processing');
        setProgress(0); 
      }, 500);

      let result;
      if (method === 'file' && file) {
          result = await candidateImportService.processManualUpload(file, tenantId, selectedRole);
      } else if (method === 'link' && linkUrl) {
          result = await candidateImportService.processUrlUpload(linkUrl, candidateName, tenantId, selectedRole);
      }

      if (!result || !result.success) {
        throw new Error(result?.error || 'Erro desconhecido');
      }

      setStatus('success');
      setTimeout(() => {
          onSuccess(); 
      }, 2000);

    } catch (error: any) {
      console.error('Processing error:', error);
      clearInterval(progressInterval);
      setErrorMessage(error.message || 'Erro ao processar dados.');
      setStatus('error');
    }
  };

  const reset = () => {
      setStatus('idle');
      setFile(null);
      setLinkUrl('');
      setCandidateName('');
      setSelectedCompanyId('');
      setSelectedRole('');
      setErrorMessage('');
      setProgress(0);
      setMethod('file');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop with Blur */}
      <div 
        className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm transition-opacity duration-300" 
        onClick={onClose} 
      />
      
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg z-10 overflow-hidden transform transition-all duration-300 scale-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center px-8 py-6 border-b border-neutral-100 bg-white/80 backdrop-blur-md sticky top-0 z-20">
          <div>
              <h3 className="font-bold text-xl text-neutral-800 tracking-tight">Novo Relatório</h3>
              <p className="text-xs text-neutral-400 font-medium uppercase tracking-wider mt-1">Importação de Candidato</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 -mr-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-full transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        {status === 'idle' && (
            <div className="flex border-b border-neutral-100">
                <button 
                    onClick={() => setMethod('file')}
                    className={`flex-1 py-3 text-sm font-medium transition-colors ${method === 'file' ? 'text-brand-blue border-b-2 border-brand-blue bg-brand-lightBlue/10' : 'text-neutral-500 hover:text-neutral-700'}`}
                >
                    Arquivo PDF
                </button>
                <button 
                    onClick={() => setMethod('link')}
                    className={`flex-1 py-3 text-sm font-medium transition-colors ${method === 'link' ? 'text-brand-blue border-b-2 border-brand-blue bg-brand-lightBlue/10' : 'text-neutral-500 hover:text-neutral-700'}`}
                >
                    Link Direto
                </button>
            </div>
        )}

        <div className="p-8 overflow-y-auto">
          {/* METHOD: FILE */}
          {status === 'idle' && method === 'file' && !file && (
            <div 
              className={`
                relative border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center text-center transition-all duration-300 cursor-pointer group
                ${isDragOver 
                    ? 'border-brand-blue bg-brand-lightBlue/30 scale-[1.02]' 
                    : 'border-neutral-200 hover:border-brand-blue/50 hover:bg-neutral-50'
                }
              `}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className={`
                w-20 h-20 bg-brand-lightBlue rounded-full flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110 shadow-sm
                ${isDragOver ? 'bg-brand-blue text-white shadow-brand-blue/30 shadow-lg' : 'text-brand-blue'}
              `}>
                <UploadCloud className="w-10 h-10" />
              </div>
              <h4 className="text-lg font-bold text-neutral-800 mb-2">
                {isDragOver ? 'Solte o arquivo aqui' : 'Arraste seu PDF aqui'}
              </h4>
              <p className="text-sm text-neutral-500 max-w-xs mx-auto mb-6 leading-relaxed">
                Suportamos arquivos PDF de relatórios Innermetrix para extração automática via AI.
              </p>
              <button className="px-5 py-2.5 bg-white border border-neutral-200 text-neutral-700 font-medium rounded-lg hover:bg-neutral-50 hover:border-neutral-300 transition-all shadow-sm text-sm">
                Selecionar do Computador
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".pdf" 
                onChange={handleFileChange}
              />
            </div>
          )}

          {/* METHOD: LINK */}
          {status === 'idle' && method === 'link' && (
              <div className="space-y-6">
                  <div className="p-4 bg-brand-lightBlue/20 rounded-xl border border-brand-blue/10">
                      <label className="text-xs font-bold text-brand-blue uppercase tracking-wider flex items-center gap-2 mb-2">
                          <LinkIcon className="w-3.5 h-3.5" /> URL do Relatório
                      </label>
                      <input 
                        type="url" 
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        placeholder="https://profiles.innermetrix.com/report/..."
                        className="w-full px-4 py-3 bg-white border border-neutral-200 rounded-lg focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none text-neutral-800"
                      />
                      <p className="text-xs text-neutral-500 mt-2">
                         Cole o link público do relatório. O sistema irá extrair os dados automaticamente.
                      </p>
                  </div>
              </div>
          )}

          {/* SHARED FIELDS (Name & Role) */}
          {status === 'idle' && (file || (method === 'link')) && (
            <div className={`space-y-6 ${method === 'link' ? 'mt-6' : ''}`}>
               {/* File Card if File Method */}
               {method === 'file' && file && (
                   <div className="flex items-start gap-4 p-4 bg-brand-lightBlue/30 rounded-xl border border-brand-blue/10 relative group">
                      <div className="p-3 bg-white rounded-lg shadow-sm">
                        <FileText className="w-6 h-6 text-brand-blue" />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-bold text-neutral-900 truncate pr-8">{file.name}</p>
                        <p className="text-xs text-neutral-500 mt-1 font-medium">{(file.size / 1024 / 1024).toFixed(2)} MB • PDF</p>
                      </div>
                      <button 
                        onClick={() => setFile(null)} 
                        className="absolute top-2 right-2 p-1.5 text-neutral-400 hover:text-red-500 hover:bg-white rounded-md transition-all opacity-0 group-hover:opacity-100"
                      >
                        <X className="w-4 h-4" />
                      </button>
                   </div>
               )}

               <div className="grid gap-5">
                   <div className="space-y-2">
                     <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-2">
                        <UserIcon className="w-3.5 h-3.5" /> Nome do Candidato
                     </label>
                     <div className="relative">
                        <input 
                            type="text" 
                            value={candidateName}
                            onChange={(e) => setCandidateName(e.target.value)}
                            className="w-full pl-4 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none transition-all font-medium text-neutral-800"
                            placeholder="Ex: João da Silva"
                        />
                     </div>
                   </div>

                   {/* SELECT COMPANY */}
                   <div className="space-y-2">
                     <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-2">
                        <Building className="w-3.5 h-3.5" /> Empresa
                     </label>
                     <div className="relative">
                        <select 
                            value={selectedCompanyId}
                            onChange={(e) => setSelectedCompanyId(e.target.value)}
                            className="w-full pl-4 pr-10 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none transition-all font-medium text-neutral-800 appearance-none"
                        >
                            <option value="">Selecione a empresa...</option>
                            {companies.map(comp => (
                                <option key={comp.id} value={comp.id}>{comp.name}</option>
                            ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400">
                             <ArrowRight className="w-4 h-4 rotate-90" />
                        </div>
                     </div>
                   </div>

                   {/* SELECT ROLE (Dependent on Company) */}
                   <div className="space-y-2">
                     <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-2">
                        <Briefcase className="w-3.5 h-3.5" /> Cargo Alvo (Opcional)
                     </label>
                     <div className="relative">
                        <select 
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value)}
                            disabled={!selectedCompanyId}
                            className={`w-full pl-4 pr-10 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none transition-all font-medium text-neutral-800 appearance-none ${!selectedCompanyId ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <option value="">Selecione o cargo...</option>
                            {roles.map(role => (
                                <option key={role.id} value={role.id}>{role.title}</option>
                            ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400">
                             <ArrowRight className="w-4 h-4 rotate-90" />
                        </div>
                     </div>
                   </div>
               </div>

               <button 
                  onClick={handleProcess}
                  disabled={!candidateName || (method === 'link' && !linkUrl)}
                  className="w-full group relative overflow-hidden bg-brand-blue hover:bg-brand-dark text-white font-bold py-3.5 rounded-xl shadow-lg shadow-brand-blue/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
               >
                 <span className="relative z-10 flex items-center justify-center gap-2">
                    Processar com AI <Sparkles className="w-4 h-4" />
                 </span>
                 <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
               </button>
            </div>
          )}

          {/* Uploading State */}
          {status === 'uploading' && (
             <div className="py-8 px-4 flex flex-col items-center text-center">
                <div className="relative w-20 h-20 mb-6">
                    <svg className="w-full h-full transform -rotate-90">
                        <circle cx="40" cy="40" r="36" stroke="#f1f5f9" strokeWidth="6" fill="transparent" />
                        <circle 
                            cx="40" cy="40" r="36" 
                            stroke="#06B6D4" strokeWidth="6" 
                            fill="transparent" 
                            strokeDasharray={226} 
                            strokeDashoffset={226 - (226 * progress) / 100} 
                            strokeLinecap="round"
                            className="transition-all duration-300 ease-out"
                        />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Globe className="w-8 h-8 text-brand-blue animate-bounce" />
                    </div>
                </div>
                <h4 className="text-lg font-bold text-neutral-800 mb-2">
                   {method === 'link' ? 'Baixando Dados...' : 'Enviando Arquivo...'}
                </h4>
                <p className="text-sm text-neutral-500 max-w-xs mx-auto">
                    {method === 'link' ? 'Conectando ao servidor do Innermetrix.' : 'Enviando seu PDF para o ambiente seguro.'}
                </p>
             </div>
          )}

          {/* Processing State */}
          {status === 'processing' && (
             <div className="py-8 px-4 flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-purple-50 rounded-full flex items-center justify-center mb-6 relative overflow-hidden">
                    <div className="absolute inset-0 bg-purple-100 rounded-full animate-ping opacity-20"></div>
                    <BrainCircuit className="w-10 h-10 text-purple-600 relative z-10" />
                </div>
                <h4 className="text-lg font-bold text-neutral-800 mb-2">Analisando Perfil</h4>
                <div className="flex items-center gap-2 text-sm text-neutral-500 mb-6">
                    <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></span>
                    <span>Extraindo competências e atributos...</span>
                </div>
                {/* Indeterminate Bar */}
                <div className="w-full max-w-xs h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-blue rounded-full w-full animate-pulse opacity-70"></div>
                </div>
             </div>
          )}

          {/* Success State */}
          {status === 'success' && (
             <div className="py-8 px-4 flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6 shadow-inner relative">
                     <div className="absolute inset-0 animate-ping opacity-20 bg-emerald-400 rounded-full"></div>
                     <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                </div>
                <h4 className="text-2xl font-bold text-neutral-900 mb-2">Sucesso!</h4>
                <p className="text-neutral-500 max-w-xs mx-auto mb-8">
                    O relatório foi processado e os dados já estão disponíveis no dashboard.
                </p>
                <div className="flex gap-3 w-full justify-center">
                    <button onClick={reset} className="px-5 py-2.5 text-sm font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl transition-colors border border-neutral-200">
                        Importar Outro
                    </button>
                    <button onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-white bg-brand-blue hover:bg-brand-dark rounded-xl shadow-lg shadow-brand-blue/20 transition-all">
                        Ver Resultados
                    </button>
                </div>
             </div>
          )}
          
          {/* Error State */}
          {status === 'error' && (
             <div className="py-8 px-4 flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
                    <AlertCircle className="w-10 h-10 text-red-500" />
                </div>
                <h4 className="text-lg font-bold text-neutral-800 mb-2">Falha no Processamento</h4>
                <p className="text-sm text-red-500 bg-red-50 px-4 py-2 rounded-lg mb-8 max-w-xs">
                    {errorMessage}
                </p>
                <button 
                    onClick={() => setStatus('idle')} 
                    className="px-6 py-2.5 text-sm font-semibold text-white bg-neutral-800 hover:bg-neutral-900 rounded-xl shadow-lg transition-all"
                >
                    Tentar Novamente
                </button>
             </div>
          )}

        </div>
        
        {/* Footer info (only visible in idle/file select) */}
        {(status === 'idle') && (
            <div className="bg-neutral-50/50 px-8 py-4 border-t border-neutral-100 flex justify-between items-center text-[10px] font-medium text-neutral-400 uppercase tracking-wider">
                <span className="flex items-center gap-1.5"><BrainCircuit className="w-3 h-3" /> Innermetrix Parser AI v2.5</span>
                <span>TLS Seguro • GDPR Compliant</span>
            </div>
        )}
      </div>
    </div>
  );
};

export default UploadModal;
