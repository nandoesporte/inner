
import React, { useState, useEffect } from 'react';
import { Company, JobRole } from '../types';
import { Plus, Building, Briefcase, ChevronRight, Edit, ArrowLeft, MoreHorizontal, Users, FileText, Search, Trash2 } from 'lucide-react';
import { MOCK_COMPANIES, MOCK_REPORTS } from '../constants';
import CompanyModal from './CompanyModal';
import RoleModal from './RoleModal';
import { supabase } from '../supabaseClient';

interface CompaniesViewProps {
  tenantId?: string;
  onRefreshData?: () => void;
}

const CompaniesView: React.FC<CompaniesViewProps> = ({ tenantId, onRefreshData }) => {
  // State
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]); 
  const [roles, setRoles] = useState<JobRole[]>([]);
  
  // Modals
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [companyToEdit, setCompanyToEdit] = useState<Company | null>(null);
  const [roleToEdit, setRoleToEdit] = useState<JobRole | null>(null);

  // Search
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (tenantId) {
       fetchCompanies();
    }
  }, [tenantId]);

  useEffect(() => {
    if (selectedCompany && viewMode === 'detail') {
        fetchRolesForCompany(selectedCompany.id);
    }
  }, [selectedCompany, viewMode]);

  const fetchCompanies = async () => {
    if (!tenantId) return;
    try {
        const { data, error } = await supabase
            .from('companies')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('name');
            
        if (error) throw error;
        
        if (data) {
            // Enrich with counts
            const enriched = await Promise.all(data.map(async (company: any) => {
                const { count: roleCount } = await supabase
                    .from('job_roles')
                    .select('*', { count: 'exact', head: true })
                    .eq('company_id', company.id);
                    
                const { count: reportCount } = await supabase
                    .from('reports') // CHANGE: table name corrected from 'candidates' to 'reports'
                    .select('*', { count: 'exact', head: true })
                    .eq('company_id', company.id);

                return {
                    ...company,
                    role_count: roleCount || 0,
                    report_count: reportCount || 0
                };
            }));
            setCompanies(enriched);
        }
    } catch (err) {
        console.error('Error fetching companies:', err);
        // Fallback to MOCK
        setCompanies(MOCK_COMPANIES);
    }
  };

  const fetchRolesForCompany = async (companyId: string) => {
     try {
        const { data, error } = await supabase.from('job_roles').select('*').eq('company_id', companyId);
        if (error) throw error;
        if (data) setRoles(data);
        else setRoles([]);
     } catch (err) {
         console.error('Error fetching roles:', err);
         setRoles([]);
     }
  };

  const handleDeleteCompany = async (company: Company) => {
      if (confirm(`ATENÇÃO: Excluir a empresa "${company.name}" também apagará TODOS os cargos e relatórios vinculados a ela.\n\nDeseja continuar?`)) {
          try {
              const { error } = await supabase.from('companies').delete().eq('id', company.id);
              if (error) throw error;
              
              fetchCompanies();
              if (onRefreshData) onRefreshData();
          } catch (e) {
              alert('Erro ao excluir empresa.');
              console.error(e);
          }
      }
  };

  const handleDeleteRole = async (role: JobRole) => {
      if (confirm(`Deseja excluir o cargo "${role.title}"?`)) {
          try {
              const { error } = await supabase.from('job_roles').delete().eq('id', role.id);
              if (error) throw error;
              
              if (selectedCompany) fetchRolesForCompany(selectedCompany.id);
              fetchCompanies(); // Atualiza contagens
          } catch (e) {
              alert('Erro ao excluir cargo.');
              console.error(e);
          }
      }
  };

  const handleOpenCompanyDetail = (company: Company) => {
     setSelectedCompany(company);
     setViewMode('detail');
  };

  const handleBackToList = () => {
     setSelectedCompany(null);
     setViewMode('list');
  };

  const handleSuccess = () => {
      if (viewMode === 'list') fetchCompanies();
      if (viewMode === 'detail' && selectedCompany) fetchRolesForCompany(selectedCompany.id);
      if (onRefreshData) onRefreshData();
  };

  // --- Render Functions ---

  const renderCompanyList = () => (
    <div className="space-y-6 animate-fadeIn">
        <div className="flex justify-between items-center">
            <div>
                <h2 className="text-2xl font-bold text-neutral-800">Empresas</h2>
                <p className="text-neutral-500 text-sm">Gerencie as empresas e suas estruturas de cargos.</p>
            </div>
            <button 
                onClick={() => { setCompanyToEdit(null); setIsCompanyModalOpen(true); }}
                className="flex items-center gap-2 bg-brand-blue hover:bg-brand-dark text-white px-4 py-2 rounded-lg shadow-md font-medium transition-all text-sm"
            >
                <Plus className="w-4 h-4" /> Nova Empresa
            </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-neutral-100 overflow-hidden">
            <div className="p-4 border-b border-neutral-100 bg-neutral-50/30 flex gap-4">
                 <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-4 h-4" />
                    <input 
                        type="text" 
                        placeholder="Buscar empresa..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none"
                    />
                 </div>
            </div>
            <table className="w-full text-left">
                <thead className="bg-neutral-50/50 text-neutral-500 text-xs font-semibold uppercase tracking-wider">
                    <tr>
                        <th className="px-6 py-4">Empresa</th>
                        <th className="px-6 py-4">Cargos</th>
                        <th className="px-6 py-4">Relatórios</th>
                        <th className="px-6 py-4">Criado em</th>
                        <th className="px-6 py-4 text-right">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                    {companies.length === 0 ? (
                        <tr>
                            <td colSpan={5} className="px-6 py-8 text-center text-neutral-400">
                                Nenhuma empresa encontrada. Crie a primeira!
                            </td>
                        </tr>
                    ) : (
                        companies.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())).map(company => (
                        <tr key={company.id} className="hover:bg-neutral-50/50 transition-colors group cursor-pointer" onClick={() => handleOpenCompanyDetail(company)}>
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-brand-lightBlue flex items-center justify-center text-brand-blue">
                                        <Building className="w-5 h-5" />
                                    </div>
                                    <span className="font-bold text-neutral-800 group-hover:text-brand-blue transition-colors">{company.name}</span>
                                </div>
                            </td>
                            <td className="px-6 py-4 text-neutral-600">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-600">
                                    <Briefcase className="w-3 h-3" /> {company.role_count || 0}
                                </span>
                            </td>
                             <td className="px-6 py-4 text-neutral-600">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-600">
                                    <FileText className="w-3 h-3" /> {company.report_count || 0}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-neutral-500">{new Date(company.created_at).toLocaleDateString('pt-BR')}</td>
                            <td className="px-6 py-4 text-right">
                                <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                    <button 
                                        onClick={() => { setCompanyToEdit(company); setIsCompanyModalOpen(true); }}
                                        className="p-2 text-neutral-400 hover:text-brand-blue hover:bg-brand-blue/5 rounded-md transition-colors"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                     <button 
                                        onClick={() => handleDeleteCompany(company)}
                                        className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                     <button className="p-2 text-neutral-400 hover:text-brand-blue hover:bg-brand-blue/5 rounded-md transition-colors">
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    )))}
                </tbody>
            </table>
        </div>
    </div>
  );

  const renderCompanyDetail = () => (
    <div className="space-y-6 animate-fadeIn">
         {/* Header Detail */}
         <div className="flex flex-col gap-4">
             <button onClick={handleBackToList} className="flex items-center gap-2 text-sm text-neutral-500 hover:text-brand-blue transition-colors w-fit">
                 <ArrowLeft className="w-4 h-4" /> Voltar para Empresas
             </button>
             
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                 <div className="flex items-center gap-4">
                     <div className="w-16 h-16 rounded-xl bg-brand-lightBlue flex items-center justify-center text-brand-blue border border-brand-blue/10">
                         <Building className="w-8 h-8" />
                     </div>
                     <div>
                         <h1 className="text-2xl font-bold text-neutral-900">{selectedCompany?.name}</h1>
                         <div className="flex items-center gap-4 mt-1 text-sm text-neutral-500">
                             <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> ID: {selectedCompany?.id}</span>
                             <span className="w-1 h-1 bg-neutral-300 rounded-full"></span>
                             <span>Criado em {selectedCompany && new Date(selectedCompany.created_at).toLocaleDateString()}</span>
                         </div>
                     </div>
                 </div>
                 <div className="flex gap-2">
                     <button 
                        onClick={() => { setCompanyToEdit(selectedCompany); setIsCompanyModalOpen(true); }}
                        className="px-4 py-2 text-sm font-medium text-neutral-600 border border-neutral-200 rounded-lg hover:bg-neutral-50"
                     >
                         Editar Dados
                     </button>
                 </div>
             </div>
         </div>

         {/* Roles Section */}
         <div className="space-y-4">
             <div className="flex justify-between items-center px-1">
                 <h3 className="text-lg font-bold text-neutral-800 flex items-center gap-2">
                     <Briefcase className="w-5 h-5 text-neutral-500" /> Cargos Vinculados
                 </h3>
                 <button 
                    onClick={() => { setRoleToEdit(null); setIsRoleModalOpen(true); }}
                    className="flex items-center gap-2 bg-white border border-brand-blue text-brand-blue hover:bg-brand-blue hover:text-white px-4 py-2 rounded-lg shadow-sm font-medium transition-all text-sm"
                 >
                    <Plus className="w-4 h-4" /> Adicionar Cargo
                 </button>
             </div>

            <div className="bg-white rounded-xl shadow-sm border border-neutral-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-neutral-50/50 text-neutral-500 text-xs font-semibold uppercase tracking-wider">
                        <tr>
                        <th className="px-6 py-4">Título do Cargo</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Benchmark (Média)</th>
                        <th className="px-6 py-4 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                        {roles.length === 0 ? (
                            <tr><td colSpan={4} className="px-6 py-12 text-center text-neutral-400">Nenhum cargo cadastrado para esta empresa.</td></tr>
                        ) : (
                            roles.map(role => (
                                <tr key={role.id} className="hover:bg-neutral-50/50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-neutral-900">{role.title}</td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase tracking-wide">Ativo</span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-neutral-600">
                                        {role.benchmarks && Object.keys(role.benchmarks).length > 0 
                                        ? ((Object.values(role.benchmarks) as number[]).reduce((a, b) => a + b, 0) / Object.values(role.benchmarks).length).toFixed(1) 
                                        : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button 
                                                onClick={() => { setRoleToEdit(role); setIsRoleModalOpen(true); }}
                                                className="p-1.5 text-neutral-400 hover:text-brand-blue hover:bg-brand-blue/5 rounded-md transition-colors"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteRole(role)}
                                                className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
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
    </div>
  );

  return (
    <>
      {viewMode === 'list' ? renderCompanyList() : renderCompanyDetail()}
      
      <CompanyModal 
        isOpen={isCompanyModalOpen}
        onClose={() => setIsCompanyModalOpen(false)}
        tenantId={tenantId}
        onSuccess={handleSuccess}
        companyToEdit={companyToEdit}
      />

      <RoleModal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        tenantId={tenantId}
        companyId={selectedCompany?.id} // Passa o ID da empresa selecionada
        onSuccess={handleSuccess}
        roleToEdit={roleToEdit}
      />
    </>
  );
};

export default CompaniesView;
