
import React, { useState, useEffect } from 'react';
import { AssessmentLink } from '../types';
import { assessmentLinkService } from '../services/assessmentLinkService';
import { Plus, Edit, Trash2, Link as LinkIcon, CheckCircle2, AlertCircle, X, Save, Loader2, ExternalLink } from 'lucide-react';

interface AssessmentLinksTabProps {
  tenantId: string;
}

const AssessmentLinksTab: React.FC<AssessmentLinksTabProps> = ({ tenantId }) => {
  const [links, setLinks] = useState<AssessmentLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<AssessmentLink | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    type: 'attributes' as 'attributes' | 'nr1' | 'psa',
    url: '',
    is_active: true
  });

  useEffect(() => {
    if (tenantId) fetchLinks();
  }, [tenantId]);

  const fetchLinks = async () => {
    setLoading(true);
    try {
      const data = await assessmentLinkService.getAll(tenantId);
      setLinks(data);
    } catch (error) {
      console.error('Erro ao buscar links:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (link?: AssessmentLink) => {
    if (link) {
      setEditingLink(link);
      setFormData({
        name: link.name,
        type: link.type,
        url: link.url,
        is_active: link.is_active
      });
    } else {
      setEditingLink(null);
      setFormData({
        name: '',
        type: 'attributes',
        url: '',
        is_active: true
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);

    try {
      if (editingLink) {
        await assessmentLinkService.update(editingLink.id, formData);
      } else {
        await assessmentLinkService.create({ ...formData, tenant_id: tenantId });
      }
      setIsModalOpen(false);
      fetchLinks();
    } catch (error) {
      alert('Erro ao salvar link.');
      console.error(error);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este link?')) {
      try {
        await assessmentLinkService.delete(id);
        fetchLinks();
      } catch (error) {
        alert('Erro ao excluir.');
      }
    }
  };

  const toggleStatus = async (link: AssessmentLink) => {
      try {
          await assessmentLinkService.update(link.id, { is_active: !link.is_active });
          fetchLinks();
      } catch (e) {
          alert('Erro ao atualizar status');
      }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden animate-fadeIn">
      {/* Header */}
      <div className="px-6 py-4 border-b border-neutral-100 bg-neutral-50/50 flex justify-between items-center">
        <div>
          <h3 className="font-semibold text-neutral-800 flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-brand-blue" /> Gerenciar Links de Avaliação
          </h3>
          <p className="text-xs text-neutral-500 mt-1">Configure os URLs base para os convites enviados aos candidatos.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-brand-blue hover:bg-brand-dark text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> Novo Link
        </button>
      </div>

      {/* Table */}
      <div className="p-0">
        {loading ? (
           <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-blue" /></div>
        ) : links.length === 0 ? (
           <div className="p-12 text-center text-neutral-500 flex flex-col items-center">
               <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mb-4">
                   <LinkIcon className="w-8 h-8 text-neutral-300" />
               </div>
               <p>Nenhum link configurado.</p>
               <button onClick={() => handleOpenModal()} className="mt-4 text-brand-blue font-bold text-sm hover:underline">Criar o primeiro</button>
           </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-white border-b border-neutral-100 text-neutral-500 font-semibold uppercase text-xs">
              <tr>
                <th className="px-6 py-4">Nome</th>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4">URL Base</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {links.map(link => (
                <tr key={link.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-neutral-900">{link.name}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-md text-xs font-bold border ${
                        link.type === 'attributes' ? 'bg-purple-50 text-purple-700 border-purple-100' : 
                        link.type === 'psa' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                        'bg-blue-50 text-blue-700 border-blue-100'
                    }`}>
                        {link.type === 'attributes' ? 'Attributes (ADV)' : link.type === 'psa' ? 'PSA (Riscos)' : 'Recruit (NR1)'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-neutral-500 max-w-xs truncate" title={link.url}>
                     <div className="flex items-center gap-2">
                        <span className="truncate flex-1">{link.url}</span>
                        <a href={link.url} target="_blank" rel="noreferrer" className="text-brand-blue hover:text-brand-dark"><ExternalLink className="w-3 h-3" /></a>
                     </div>
                  </td>
                  <td className="px-6 py-4">
                    <button onClick={() => toggleStatus(link)} className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border transition-all ${link.is_active ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100' : 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100'}`}>
                        {link.is_active ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                        {link.is_active ? 'Ativo' : 'Inativo'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleOpenModal(link)} className="p-1.5 text-neutral-400 hover:text-brand-blue hover:bg-brand-blue/5 rounded transition-colors"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(link.id)} className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
           <div className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg z-10 overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-neutral-100 flex justify-between items-center">
                 <h3 className="font-bold text-lg text-neutral-900">{editingLink ? 'Editar Link' : 'Novo Link de Avaliação'}</h3>
                 <button onClick={() => setIsModalOpen(false)}><X className="w-5 h-5 text-neutral-400 hover:text-neutral-600" /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                 <div className="space-y-2">
                    <label className="text-sm font-bold text-neutral-700">Nome Identificador</label>
                    <input 
                        required
                        type="text" 
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        placeholder="Ex: Link Padrão 2024"
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none"
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-sm font-bold text-neutral-700">Tipo de Avaliação</label>
                    <select 
                        value={formData.type}
                        onChange={e => setFormData({...formData, type: e.target.value as any})}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none"
                    >
                        <option value="attributes">Attributes Index (ADV)</option>
                        <option value="nr1">InnerMetrix NR1 (Recruit)</option>
                        <option value="psa">Psychosocial Assessment (PSA)</option>
                    </select>
                    <p className="text-xs text-neutral-500">Este link será usado automaticamente quando você criar um relatório deste tipo.</p>
                 </div>
                 <div className="space-y-2">
                    <label className="text-sm font-bold text-neutral-700">URL Base</label>
                    <input 
                        required
                        type="url" 
                        value={formData.url}
                        onChange={e => setFormData({...formData, url: e.target.value})}
                        placeholder="https://profiles.innermetrix.com/..."
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none"
                    />
                 </div>
                 <div className="flex items-center gap-2 pt-2">
                    <input 
                        type="checkbox" 
                        id="isActive"
                        checked={formData.is_active}
                        onChange={e => setFormData({...formData, is_active: e.target.checked})}
                        className="w-4 h-4 text-brand-blue rounded border-gray-300 focus:ring-brand-blue"
                    />
                    <label htmlFor="isActive" className="text-sm text-neutral-700 font-medium select-none">Link Ativo</label>
                 </div>

                 <div className="pt-4 flex justify-end gap-3">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50 rounded-lg">Cancelar</button>
                    <button type="submit" disabled={submitLoading} className="px-4 py-2 bg-brand-blue text-white rounded-lg font-bold text-sm hover:bg-brand-dark flex items-center gap-2 shadow-sm disabled:opacity-70">
                        {submitLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default AssessmentLinksTab;