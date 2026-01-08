
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../supabaseClient';
import { JobRole, Company } from '../types';
import { X, Sparkles, Save, Loader2, Building, FileText, BrainCircuit, CheckCircle2, Library, Search, ChevronRight, Target, BarChart3, Compass, AlertCircle } from 'lucide-react';
import { PRESET_BENCHMARKS } from '../constants';

interface JobBenchmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId?: string;
  onSuccess: () => void;
  roleToEdit?: JobRole | null;
}

// Mapeamento de chaves da API para labels da UI
const ATTRIBUTE_MAP: Record<string, string> = {
  'empatia': 'Empatia',
  'pensamento_pratico': 'Pensamento Prático',
  'julgamento_sistemas': 'Pensamento Sistêmico',
  'autoestima': 'Autoestima',
  'consciencia_funcao': 'Consciência de Função',
  'autodirecao': 'Auto-Direção'
};

const DISC_COLORS = {
  'D': 'bg-red-500',
  'I': 'bg-yellow-400',
  'S': 'bg-green-500',
  'C': 'bg-blue-500'
};

const JobBenchmarkModal: React.FC<JobBenchmarkModalProps> = ({ isOpen, onClose, tenantId, onSuccess, roleToEdit }) => {
  const [method, setMethod] = useState<'ai' | 'library'>('ai');
  const [step, setStep] = useState<'input' | 'generating' | 'review'>('input');
  const [companies, setCompanies] = useState<Company[]>([]);
  
  // Form State
  const [title, setTitle] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [description, setDescription] = useState('');
  
  // Library State
  const [librarySearch, setLibrarySearch] = useState('');
  
  // AI/Library Result Data Model
  const [attributeRanges, setAttributeRanges] = useState<Record<string, [number, number]>>({});
  const [valuePreferences, setValuePreferences] = useState<Record<string, string>>({});
  const [discPreferences, setDiscPreferences] = useState<Record<string, number>>({});
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && tenantId) {
      fetchCompanies();
      if (roleToEdit) {
        setTitle(roleToEdit.title);
        setCompanyId(roleToEdit.company_id || '');
        
        // Load legacy data or metadata if available
        if (roleToEdit.benchmarks) {
            // Se for legado (apenas número), converte para range aproximado (+/- 0.5)
            const ranges: Record<string, [number, number]> = {};
            Object.entries(roleToEdit.benchmarks).forEach(([k, v]) => {
                const val = typeof v === 'number' ? v : 5;
                // Convertendo de 0-10 para 0-100 para visualização consistente com nova API
                const base = val * 10; 
                ranges[k] = [Math.max(0, base - 5), Math.min(100, base + 5)];
            });
            setAttributeRanges(ranges);
        }
        
        // Tenta carregar dados ricos do metadata se existirem
        // @ts-ignore
        if (roleToEdit.metadata?.value_preferences) setValuePreferences(roleToEdit.metadata.value_preferences);
        // @ts-ignore
        if (roleToEdit.metadata?.disc_preferences) setDiscPreferences(roleToEdit.metadata.disc_preferences);
        // @ts-ignore
        if (roleToEdit.metadata?.attribute_ranges) setAttributeRanges(roleToEdit.metadata.attribute_ranges);

        setStep('review'); 
      } else {
        reset();
      }
    }
  }, [isOpen, roleToEdit]);

  // Previne rolagem do fundo quando modal está aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const fetchCompanies = async () => {
    const { data } = await supabase.from('companies').select('id, name').eq('tenant_id', tenantId).order('name');
    if (data) setCompanies(data);
  };

  const reset = () => {
    setTitle('');
    setCompanyId('');
    setDescription('');
    setAttributeRanges({});
    setValuePreferences({});
    setDiscPreferences({});
    setAiAnalysis(null);
    setStep('input');
    setMethod('ai');
    setLibrarySearch('');
    setIsSaving(false);
  };

  const handleGenerate = async () => {
    if (!title || !companyId) return;
    setStep('generating');

    try {
      console.log('Invocando função create-job-benchmark...');
      const { data, error } = await supabase.functions.invoke('create-job-benchmark', {
        body: {
          company_id: companyId,
          job_title: title,
          job_description: description
        }
      });

      if (error) {
          console.error("Erro Supabase Invoke:", error);
          throw error;
      }
      
      if (!data) {
          throw new Error("A função retornou dados vazios.");
      }

      // 1. Process Attribute Ranges (Backend returns [min, max] 0-100)
      const ranges: Record<string, [number, number]> = {};
      if (data.attribute_ranges) {
          Object.entries(data.attribute_ranges).forEach(([key, val]) => {
              const uiKey = ATTRIBUTE_MAP[key] || key;
              if (Array.isArray(val) && val.length === 2) {
                  ranges[uiKey] = val as [number, number];
              }
          });
      }
      setAttributeRanges(ranges);

      // 2. Process Values Preferences
      if (data.value_preferences) {
          setValuePreferences(data.value_preferences);
      }

      // 3. Process DISC
      if (data.disc_preferences) {
          setDiscPreferences(data.disc_preferences);
      }
      
      setAiAnalysis({ rationale: "Benchmark gerado via Axiologia Formal (Hartman) + Análise de Função." });
      setStep('review');

    } catch (err: any) {
      console.error("Erro Detalhado na geração:", err);
      let errorMsg = err.message;
      if (errorMsg === "Failed to send a request to the Edge Function") {
          errorMsg = "Falha de conexão com a IA. Verifique se a função está implantada e acessível.";
      }
      alert("Falha ao gerar benchmark: " + errorMsg);
      setStep('input');
    }
  };

  const handleSelectFromLibrary = (preset: any) => {
      setTitle(preset.title);
      
      // 1. Attribute Ranges
      // Se o preset tiver ranges específicos, usa-os (convertidos para 0-100 se necessário)
      // Se não, usa o 'scores' para criar ranges aproximados
      const ranges: Record<string, [number, number]> = {};
      
      if (preset.ranges) {
          Object.entries(preset.ranges).forEach(([k, v]: [string, any]) => {
              // Verifica se já está em escala 0-10 ou 0-100. Assume que se for < 10 é escala pequena e multiplica
              const min = v[0] <= 10 ? v[0] * 10 : v[0];
              const max = v[1] <= 10 ? v[1] * 10 : v[1];
              ranges[k] = [min, max];
          });
          
          // Adiciona defaults para os atributos internos se não existirem
          const internalDefaults = {
              'Autoestima': [70, 80],
              'Consciência de Função': [70, 80],
              'Auto-Direção': [70, 80]
          };
          Object.entries(internalDefaults).forEach(([k, v]) => {
              if (!ranges[k]) ranges[k] = v as [number, number];
          });

      } else {
          // Fallback Legacy
          Object.entries(preset.scores).forEach(([k, v]) => {
              const base = (v as number) * 10;
              ranges[k] = [base - 5, base + 5];
          });
      }
      
      setAttributeRanges(ranges);

      // 2. DISC Preferences
      if (preset.disc) {
          setDiscPreferences(preset.disc);
      } else {
          setDiscPreferences({});
      }

      // 3. Values (Default Neutro se não houver)
      setValuePreferences({
          'senso_missao': 'medio',
          'status_reconhecimento': 'medio',
          'recompensa_material': 'medio',
          'pertencimento': 'medio',
          'autoaperfeicoamento': 'medio'
      });

      setAiAnalysis({ rationale: `Modelo de mercado: ${preset.title} (${preset.industry}).` });
      
      if (companyId) {
          setStep('review');
      } else {
          alert('Por favor, selecione uma empresa para vincular este cargo.');
      }
  };

  const handleSaveSelection = async () => {
      if (!title) {
          alert('Por favor, insira o título do cargo.');
          return;
      }
      if (!companyId) {
          alert('Por favor, selecione a empresa.');
          return;
      }
      if (!tenantId) {
          alert('Erro: ID da organização não identificado. Recarregue a página.');
          return;
      }
      
      setIsSaving(true);
      
      try {
          // Calculate average for legacy 'benchmarks' column (0-10 scale)
          const legacyBenchmarks: Record<string, number> = {};
          Object.entries(attributeRanges).forEach(([key, val]) => {
              const avg = (val[0] + val[1]) / 2;
              legacyBenchmarks[key] = Number((avg / 10).toFixed(1)); // Convert 0-100 back to 0-10
          });

          // Metadata stores the rich data structure
          const metadata = {
              source: method, 
              rationale: aiAnalysis?.rationale,
              value_preferences: valuePreferences,
              disc_preferences: discPreferences,
              attribute_ranges: attributeRanges // Persist the ranges
          };

          let error = null;

          // Tentativa 1: Salvar COM metadata (supondo que a coluna exista)
          if (roleToEdit) {
             const { error: err } = await supabase.from('job_roles').update({
                 title,
                 company_id: companyId,
                 benchmarks: legacyBenchmarks,
                 metadata // Update metadata
             }).eq('id', roleToEdit.id);
             error = err;
          } else {
             const { error: err } = await supabase.from('job_roles').insert({
                 tenant_id: tenantId,
                 company_id: companyId,
                 title: title,
                 benchmarks: legacyBenchmarks,
                 active: true,
                 metadata
             });
             error = err;
          }

          // Fallback: Se falhar por falta da coluna metadata, tenta salvar sem ela
          // 42703 = Undefined Column
          if (error && (error.message?.includes('metadata') || error.code === '42703')) {
             console.warn("Coluna 'metadata' não encontrada. Salvando em modo de compatibilidade (legado).");
             
             if (roleToEdit) {
                 const { error: retryErr } = await supabase.from('job_roles').update({
                     title,
                     company_id: companyId,
                     benchmarks: legacyBenchmarks
                 }).eq('id', roleToEdit.id);
                 if (retryErr) throw retryErr;
             } else {
                 const { error: retryErr } = await supabase.from('job_roles').insert({
                     tenant_id: tenantId,
                     company_id: companyId,
                     title: title,
                     benchmarks: legacyBenchmarks,
                     active: true
                 });
                 if (retryErr) throw retryErr;
             }
          } else if (error) {
              throw error;
          }
          
          onSuccess();
          onClose();
      } catch (err: any) {
          console.error("Erro ao salvar:", err);
          const errorMsg = err.message || err.details || (typeof err === 'object' ? JSON.stringify(err) : String(err));
          alert('Erro ao salvar cargo: ' + errorMsg);
      } finally {
          setIsSaving(false);
      }
  };

  const filteredPresets = useMemo(() => {
      return PRESET_BENCHMARKS.filter(p => 
          p.title.toLowerCase().includes(librarySearch.toLowerCase()) || 
          p.industry.toLowerCase().includes(librarySearch.toLowerCase())
      );
  }, [librarySearch]);

  const getValueColor = (level: string) => {
      switch(level.toLowerCase()) {
          case 'alto': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
          case 'medio': return 'bg-blue-50 text-blue-700 border-blue-100';
          case 'baixo': return 'bg-neutral-100 text-neutral-500 border-neutral-200';
          default: return 'bg-neutral-50 text-neutral-500';
      }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl z-10 overflow-hidden flex flex-col max-h-[95vh] animate-slideDown">
        <div className="flex justify-between items-center px-8 py-6 border-b border-neutral-100 bg-white">
          <div>
            <h3 className="font-bold text-xl text-neutral-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-brand-blue" />
              {roleToEdit ? 'Editar Benchmark' : 'Novo Benchmark de Cargo'}
            </h3>
            <p className="text-xs text-neutral-500 mt-1">Definição técnica da estrutura de decisão e perfil da função.</p>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {!roleToEdit && step === 'input' && (
            <div className="flex border-b border-neutral-100">
                <button 
                    onClick={() => setMethod('ai')}
                    className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${method === 'ai' ? 'border-brand-blue text-brand-blue bg-brand-lightBlue/10' : 'border-transparent text-neutral-400 hover:text-neutral-600'}`}
                >
                    <BrainCircuit className="w-4 h-4 inline mr-2" /> Gerar com IA
                </button>
                <button 
                    onClick={() => setMethod('library')}
                    className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${method === 'library' ? 'border-brand-blue text-brand-blue bg-brand-lightBlue/10' : 'border-transparent text-neutral-400 hover:text-neutral-600'}`}
                >
                    <Library className="w-4 h-4 inline mr-2" /> Biblioteca de Modelos
                </button>
            </div>
        )}

        <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
          
          {step === 'input' && method === 'ai' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                   <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-2">
                      <Building className="w-3.5 h-3.5" /> Empresa
                   </label>
                   <select 
                      value={companyId}
                      onChange={(e) => setCompanyId(e.target.value)}
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:border-brand-blue outline-none transition-all"
                   >
                      <option value="">Selecione...</option>
                      {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                   </select>
                </div>
                <div className="space-y-2">
                   <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5" /> Título do Cargo
                   </label>
                   <input 
                      type="text" 
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Ex: Gerente Comercial"
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:border-brand-blue outline-none transition-all font-bold text-neutral-800"
                   />
                </div>
              </div>

              <div className="space-y-2">
                 <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-2">
                    <BrainCircuit className="w-3.5 h-3.5" /> Descrição do Cargo & Responsabilidades
                 </label>
                 <textarea 
                    rows={6}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descreva as principais responsabilidades, desafios e o contexto da função para que a IA possa calibrar o perfil decisório..."
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:border-brand-blue outline-none transition-all text-sm resize-none"
                 />
                 <p className="text-[10px] text-neutral-400 text-right">A IA utilizará Axiologia Formal para determinar a estrutura de decisão ideal.</p>
              </div>
            </div>
          )}

          {step === 'input' && method === 'library' && (
              <div className="space-y-6 animate-fadeIn h-full flex flex-col">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-2">
                            <Building className="w-3.5 h-3.5" /> Empresa Destino
                        </label>
                        <select 
                            value={companyId}
                            onChange={(e) => setCompanyId(e.target.value)}
                            className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:border-brand-blue outline-none transition-all"
                        >
                            <option value="">Selecione...</option>
                            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-2">
                            <Search className="w-3.5 h-3.5" /> Buscar Modelo
                        </label>
                        <input 
                            type="text" 
                            value={librarySearch}
                            onChange={(e) => setLibrarySearch(e.target.value)}
                            placeholder="Filtrar por nome ou setor..."
                            className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:border-brand-blue outline-none transition-all"
                        />
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto border border-neutral-100 rounded-xl bg-neutral-50/50 p-2 min-h-[300px]">
                      {filteredPresets.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-neutral-400">
                              <Search className="w-8 h-8 mb-2 opacity-50" />
                              <p className="text-sm">Nenhum modelo encontrado.</p>
                          </div>
                      ) : (
                          <div className="grid gap-2">
                              {filteredPresets.map((preset, idx) => (
                                  <div key={idx} onClick={() => handleSelectFromLibrary(preset)} className="bg-white p-4 rounded-xl border border-neutral-200 hover:border-brand-blue hover:shadow-md cursor-pointer transition-all group">
                                      <div className="flex justify-between items-center">
                                          <div>
                                              <h4 className="font-bold text-neutral-800 group-hover:text-brand-blue transition-colors">{preset.title}</h4>
                                              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded">{preset.industry}</span>
                                          </div>
                                          <ChevronRight className="w-5 h-5 text-neutral-300 group-hover:text-brand-blue" />
                                      </div>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
              </div>
          )}

          {step === 'generating' && (
             <div className="flex flex-col items-center justify-center py-12 text-center animate-fadeIn">
                <div className="relative mb-8">
                   <div className="w-20 h-20 border-4 border-brand-lightBlue rounded-full"></div>
                   <div className="absolute top-0 left-0 w-20 h-20 border-4 border-brand-blue border-t-transparent rounded-full animate-spin"></div>
                   <BrainCircuit className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-brand-blue" />
                </div>
                <h4 className="text-xl font-bold text-neutral-800 mb-2">Analisando Arquitetura do Cargo...</h4>
                <p className="text-sm text-neutral-500 max-w-xs">Definindo ranges de decisão (Attribute Index), preferências motivacionais (Values) e estilo comportamental (DISC).</p>
             </div>
          )}

          {step === 'review' && (
             <div className="space-y-10 animate-fadeIn">
                <div className="flex items-center gap-4 bg-emerald-50 p-4 rounded-xl border border-emerald-100 text-emerald-800">
                   <CheckCircle2 className="w-6 h-6 shrink-0" />
                   <div>
                      <h4 className="font-bold text-sm">Benchmark Definido!</h4>
                      <p className="text-xs opacity-80">
                          {method === 'library' 
                            ? 'Modelo selecionado. Revise os parâmetros abaixo.' 
                            : 'Estrutura gerada com sucesso. Revise os ranges e motivadores.'}
                      </p>
                   </div>
                </div>

                {/* 1. ATTRIBUTE RANGES */}
                <div>
                    <h4 className="text-xs font-black text-neutral-500 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-neutral-100 pb-2">
                        <Target className="w-4 h-4 text-brand-blue" /> Estrutura de Decisão (Attribute Index)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {Object.entries(attributeRanges).map(([key, range]: [string, [number, number]]) => {
                            const [min, max] = range;
                            const label = ATTRIBUTE_MAP[key] || key;

                            return (
                                <div key={key} className="bg-neutral-50 p-4 rounded-xl border border-neutral-200">
                                    <div className="flex justify-between items-end mb-3">
                                        <span className="text-xs font-bold text-neutral-600 uppercase">{label}</span>
                                        <span className="text-sm font-black text-brand-blue">
                                            {min} - {max}
                                        </span>
                                    </div>
                                    <div className="h-3 w-full bg-neutral-200 rounded-full overflow-hidden relative">
                                        {/* Background Track */}
                                        <div className="absolute inset-0 bg-neutral-200" />
                                        
                                        {/* Filled Range Bar */}
                                        <div 
                                            className="absolute top-0 h-full bg-brand-blue/30 border-l-2 border-r-2 border-brand-blue transition-all duration-700" 
                                            style={{ 
                                                left: `${min}%`, 
                                                width: `${Math.max(2, max - min)}%` 
                                            }}
                                        >
                                            {/* Center Line for visual anchor */}
                                            <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-brand-blue/50 -translate-x-1/2"></div>
                                        </div>
                                    </div>
                                    <div className="flex justify-between mt-1 text-[9px] text-neutral-400 font-bold">
                                        <span>0</span>
                                        <span>50</span>
                                        <span>100</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 2. VALUE PREFERENCES */}
                {Object.keys(valuePreferences).length > 0 && (
                    <div>
                        <h4 className="text-xs font-black text-neutral-500 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-neutral-100 pb-2">
                            <Compass className="w-4 h-4 text-brand-blue" /> Preferências Motivacionais do Cargo (Values)
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {Object.entries(valuePreferences).map(([key, level]: [string, string]) => (
                                <div key={key} className="flex justify-between items-center p-3 bg-white border border-neutral-200 rounded-lg shadow-sm">
                                    <span className="text-xs font-bold text-neutral-700 capitalize">{key.replace(/_/g, ' ')}</span>
                                    <span className={`text-[10px] font-black uppercase px-2 py-1 rounded border ${getValueColor(level)}`}>
                                        {level}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 3. DISC PREFERENCES */}
                {Object.keys(discPreferences).length > 0 && (
                    <div>
                        <h4 className="text-xs font-black text-neutral-500 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-neutral-100 pb-2">
                            <BarChart3 className="w-4 h-4 text-brand-blue" /> DISC Esperado para a Função
                        </h4>
                        <div className="flex gap-4 items-end h-40 bg-neutral-50 p-6 rounded-2xl border border-neutral-200">
                            {['D', 'I', 'S', 'C'].map((factor) => {
                                const score = discPreferences[factor as keyof typeof discPreferences] || 0;
                                const color = DISC_COLORS[factor as keyof typeof DISC_COLORS];
                                return (
                                    <div key={factor} className="flex-1 flex flex-col items-center justify-end h-full gap-2 group">
                                        <span className="text-xs font-bold text-neutral-600 group-hover:scale-110 transition-transform">{score}</span>
                                        <div className="w-full bg-neutral-200 rounded-t-lg relative h-full overflow-hidden flex items-end">
                                            <div 
                                                className={`w-full transition-all duration-1000 ${color}`} 
                                                style={{ height: `${score}%` }}
                                            ></div>
                                        </div>
                                        <span className="text-sm font-black text-neutral-800">{factor}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
                
                {aiAnalysis?.rationale && (
                    <div className="p-4 bg-brand-lightBlue/20 rounded-xl border border-brand-blue/10 flex gap-3">
                        <AlertCircle className="w-5 h-5 text-brand-blue shrink-0 mt-0.5" />
                        <div>
                            <p className="text-xs font-bold text-brand-blue uppercase mb-1">Racional da Definição</p>
                            <p className="text-sm text-neutral-700 italic">"{aiAnalysis.rationale}"</p>
                        </div>
                    </div>
                )}
             </div>
          )}

        </div>

        <div className="p-6 border-t border-neutral-100 bg-neutral-50 flex justify-end gap-3">
           {step === 'review' ? (
              <button 
                onClick={handleSaveSelection} 
                disabled={isSaving}
                className="px-6 py-2.5 bg-brand-blue text-white font-bold rounded-xl shadow-lg hover:bg-brand-dark transition-all flex items-center gap-2 disabled:opacity-50"
              >
                 {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                 {roleToEdit ? 'Atualizar Benchmark' : 'Salvar Benchmark'}
              </button>
           ) : (
              <>
                <button onClick={onClose} disabled={step === 'generating' || isSaving} className="px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 rounded-lg">Cancelar</button>
                {method === 'ai' && (
                    <button 
                    onClick={handleGenerate} 
                    disabled={step === 'generating' || !title || !companyId} 
                    className="px-6 py-2 bg-brand-blue text-white font-bold rounded-xl shadow-lg hover:bg-brand-dark transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                    {step === 'generating' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    Gerar Perfil
                    </button>
                )}
              </>
           )}
        </div>
      </div>
    </div>
  );

  // Renderiza o modal via Portal na raiz do documento para garantir z-index correto
  return createPortal(modalContent, document.getElementById('modal-root') || document.body);
};

export default JobBenchmarkModal;
