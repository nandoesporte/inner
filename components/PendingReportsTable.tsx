
import React, { useState, useEffect } from 'react';
import { PendingReport } from '../types';
import { Clock, Link as LinkIcon, Building, Briefcase, Mail, Trash2, Layers } from 'lucide-react';

interface PendingReportsTableProps {
  reports: PendingReport[];
  isLoading: boolean;
  onDelete?: (ids: string[]) => void;
}

const PendingReportsTable: React.FC<PendingReportsTableProps> = ({ reports, isLoading, onDelete }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Limpa a seleção quando a lista de relatórios mudar (ex: após exclusão ou refresh)
  useEffect(() => {
    setSelectedIds([]);
  }, [reports]);

  const handleCopyLink = (link: string) => {
    if (!link) {
        alert('Este é um convite múltiplo sem link único de topo.');
        return;
    }
    navigator.clipboard.writeText(link);
    alert('Link copiado!');
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(reports.map(r => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(sId => sId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBulkDelete = () => {
    if (onDelete && selectedIds.length > 0) {
      onDelete(selectedIds);
    }
  };

  const handleSingleDelete = (id: string) => {
    if (onDelete) {
      onDelete([id]);
    }
  };

  if (isLoading) {
    return (
        <div className="bg-white p-12 rounded-xl text-center shadow-sm border border-neutral-100">
            <div className="animate-spin w-8 h-8 border-4 border-brand-blue border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-neutral-500">Carregando convites...</p>
        </div>
    );
  }

  const allSelected = reports.length > 0 && selectedIds.length === reports.length;
  const isIndeterminate = selectedIds.length > 0 && selectedIds.length < reports.length;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-neutral-100 overflow-hidden animate-fadeIn relative">
      
      {/* Barra de Ações em Lote (Floating Header) */}
      {selectedIds.length > 0 && (
        <div className="absolute top-0 left-0 right-0 z-10 bg-brand-blue/95 backdrop-blur-sm text-white px-6 py-3 flex justify-between items-center animate-slideDown">
          <div className="flex items-center gap-3">
             <span className="font-bold text-sm bg-white/20 px-2 py-0.5 rounded">{selectedIds.length} selecionados</span>
             <button 
                onClick={() => setSelectedIds([])}
                className="text-xs hover:underline text-white/80"
             >
                Cancelar
             </button>
          </div>
          <button 
            onClick={handleBulkDelete}
            className="flex items-center gap-2 bg-white text-red-600 hover:bg-red-50 px-4 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all"
          >
             <Trash2 className="w-3.5 h-3.5" /> Excluir Selecionados
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-neutral-50/50 text-neutral-500 text-xs font-semibold uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4 w-12 text-center">
                 <input 
                    type="checkbox" 
                    checked={allSelected}
                    ref={input => { if (input) input.indeterminate = isIndeterminate; }}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-brand-blue rounded border-gray-300 focus:ring-brand-blue cursor-pointer"
                 />
              </th>
              <th className="px-6 py-4">Candidato</th>
              <th className="px-6 py-4">Empresa / Cargo</th>
              <th className="px-6 py-4">Avaliação</th>
              <th className="px-6 py-4">Enviado em</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {reports.length === 0 ? (
                <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-neutral-400">
                        Nenhum convite pendente no momento.
                    </td>
                </tr>
            ) : (
                reports.map((report) => (
                <tr key={report.id} className={`hover:bg-neutral-50/50 transition-colors ${selectedIds.includes(report.id) ? 'bg-brand-lightBlue/10' : ''}`}>
                    <td className="px-6 py-4 text-center">
                        <input 
                            type="checkbox" 
                            checked={selectedIds.includes(report.id)}
                            onChange={() => handleSelectOne(report.id)}
                            className="w-4 h-4 text-brand-blue rounded border-gray-300 focus:ring-brand-blue cursor-pointer"
                        />
                    </td>
                    <td className="px-6 py-4">
                        <div className="flex flex-col">
                            <span className="font-bold text-neutral-800">{report.candidate_name}</span>
                            <div className="flex items-center gap-1.5 text-xs text-neutral-500 mt-0.5">
                                <Mail className="w-3 h-3" /> {report.candidate_email}
                            </div>
                        </div>
                    </td>
                    <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 text-sm font-medium text-neutral-700">
                                <Building className="w-3.5 h-3.5 text-neutral-400" />
                                {report.company_name}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                                <Briefcase className="w-3 h-3 text-neutral-400" />
                                {report.job_title}
                            </div>
                        </div>
                    </td>
                    <td className="px-6 py-4">
                        {report.assessments_list && report.assessments_list.length > 1 ? (
                            <div className="flex flex-wrap gap-1">
                                {report.assessments_list.map((type, i) => (
                                    <span key={i} className="px-2 py-0.5 bg-neutral-100 text-neutral-600 rounded text-[10px] font-bold border border-neutral-200">
                                        {type}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <span className={`px-2 py-1 rounded text-xs font-bold border ${report.assessment_type === 'ADV' ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                                {report.assessment_type}
                            </span>
                        )}
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-500">
                        <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-neutral-400" />
                            {new Date(report.link_sent_at).toLocaleDateString()}
                        </div>
                    </td>
                    <td className="px-6 py-4">
                        <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-600 border border-amber-100">
                            <Clock className="w-3 h-3" /> Aguardando
                        </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                            {report.assessment_type !== 'Multi' && (
                                <button 
                                    onClick={() => handleCopyLink(report.generated_link)}
                                    className="p-2 text-brand-blue hover:bg-brand-blue/10 rounded-lg transition-colors group relative"
                                    title="Copiar Link"
                                >
                                    <LinkIcon className="w-4 h-4" />
                                </button>
                            )}
                            <button 
                                onClick={() => handleSingleDelete(report.id)}
                                className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Excluir Convite"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </td>
                </tr>
                ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PendingReportsTable;