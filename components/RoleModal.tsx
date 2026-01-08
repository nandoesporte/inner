
import React, { useState, useEffect } from 'react';
import { X, Briefcase, Save, Loader2, Sparkles, BrainCircuit } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { JobRole } from '../types';
import { INNERMETRIX_ATTRIBUTES } from '../constants'; 
import { roleAiService } from '../services/roleAiService';

interface RoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId?: string;
  companyId?: string;
  onSuccess: () => void;
  roleToEdit?: JobRole | null;
}

const RoleModal: React.FC<RoleModalProps> = ({ isOpen, onClose, tenantId, companyId, onSuccess, roleToEdit }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [benchmarks, setBenchmarks] = useState<Record<string, number>>({});

  const attributes = INNERMETRIX_ATTRIBUTES;

  useEffect(() => {
    if (isOpen) {
      if (roleToEdit) {
        setTitle(roleToEdit.title);
        setBenchmarks(roleToEdit.benchmarks || initializeBenchmarks());
      } else {
        reset();
      }
    }
  }, [isOpen, roleToEdit]);

  const initializeBenchmarks = () => {
    const init: Record<string, number> = {};
    attributes.forEach(attr => init[attr] = 5.0); 
    return init;
  };

  const reset = () => {
    setTitle('');
    setBenchmarks(initializeBenchmarks());
  };

  const handleBenchmarkChange = (attribute: string, value: string) => {
    setBenchmarks(prev => ({
      ...prev,
      [attribute]: parseFloat(value)
    }));
  };

  const handleAiSuggestion = async () => {
    if (!title) return;
    setIsAiLoading(true);

    try {
      const suggestions = await roleAiService.suggestBenchmarks(title, attributes);
      if (suggestions && Object.keys(suggestions).length > 0) {
        setBenchmarks(prev => ({ ...prev, ...suggestions }));
      }
    } catch (error) {
      console.error("Erro na sugestão de IA:", error);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSave = async () => {
    if (!tenantId || !title) return;
    setIsLoading(true);

    try {
      if (roleToEdit) {
        const { error } = await supabase
          .from('job_roles')
          .update({ title, benchmarks })
          .eq('id', roleToEdit.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('job_roles')
          .insert({
            tenant_id: tenantId,
            company_id: companyId,
            title,
            benchmarks,
            active: true
          });
        if (error) throw error;
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao salvar cargo:', error);
      onSuccess();
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl z-10 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center px-6 py-4 border-b border-neutral-100">
          <h3 className="font-semibold text-lg text-neutral-900 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-brand-blue" />
            {roleToEdit ? 'Editar Cargo' : 'Novo Cargo'}
          </h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
           <div className="space-y-6">
             <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700">Título do Cargo <span className="text-red-500">*</span></label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Executivo de Vendas"
                    className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAiSuggestion}
                    disabled={!title || isAiLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-blue to-purple-600 text-white rounded-lg font-medium shadow-md hover:shadow-lg disabled:opacity-50 transition-all text-xs sm:text-sm whitespace-nowrap"
                  >
                    {isAiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {isAiLoading ? 'Analisando...' : 'Sugerir com IA'}
                  </button>
                </div>
             </div>

             <div className="border-t border-neutral-100 pt-4">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h4 className="font-medium text-neutral-900 mb-1">Benchmarks Comportamentais</h4>
                    <p className="text-xs text-neutral-500">Defina o nível ideal (0 a 10) esperado para este cargo.</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  {attributes.map(attr => (
                    <div key={attr} className="space-y-2 group">
                      <div className="flex justify-between text-xs mb-1">
                        <label className="font-medium text-neutral-700 group-hover:text-brand-blue transition-colors">{attr}</label>
                        <span className={`font-bold transition-all ${benchmarks[attr] > 8 ? 'text-brand-blue' : 'text-neutral-600'}`}>
                          {benchmarks[attr]?.toFixed(1) || 0}
                        </span>
                      </div>
                      <div className="relative h-2 w-full">
                        <div className="absolute top-0 left-0 right-0 bottom-0 bg-neutral-100 rounded-lg"></div>
                        <div 
                          className="absolute top-0 left-0 bottom-0 bg-brand-blue/20 rounded-l-lg transition-all duration-500 ease-out"
                          style={{ width: `${(benchmarks[attr] || 0) * 10}%` }}
                        ></div>
                        <input 
                          type="range" 
                          min="0" 
                          max="10" 
                          step="0.1"
                          value={benchmarks[attr] || 0}
                          onChange={(e) => handleBenchmarkChange(attr, e.target.value)}
                          className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div 
                          className="absolute top-1/2 -mt-2 w-4 h-4 bg-brand-blue rounded-full border-2 border-white shadow-md pointer-events-none transition-all duration-500 ease-out"
                          style={{ left: `calc(${(benchmarks[attr] || 0) * 10}% - 8px)` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
             </div>
           </div>
        </div>

        <div className="p-6 border-t border-neutral-100 bg-neutral-50 flex justify-end gap-3">
           <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 rounded-lg">Cancelar</button>
           <button 
             onClick={handleSave}
             disabled={isLoading || !title}
             className="px-4 py-2 text-sm font-medium text-white bg-brand-blue hover:bg-brand-dark rounded-lg shadow-sm flex items-center gap-2 disabled:opacity-50"
           >
             {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
             Salvar Cargo
           </button>
        </div>
      </div>
    </div>
  );
};

export default RoleModal;
