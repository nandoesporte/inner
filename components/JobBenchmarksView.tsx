
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { JobRole, Company } from '../types';
import { Plus, Search, Briefcase, Building, Sparkles, Edit, Trash2, Filter, Loader2, BrainCircuit } from 'lucide-react';
import JobBenchmarkModal from './JobBenchmarkModal';

interface JobBenchmarksViewProps {
  tenantId?: string;
  onRefreshData?: () => void;
}

const JobBenchmarksView: React.FC<JobBenchmarksViewProps> = ({ tenantId }) => {
  const [roles, setRoles] = useState<JobRole[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCompanyId, setFilterCompanyId] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<JobRole | null>(null);

  useEffect(() => {
    if (tenantId) {
      fetchData();
    }
  }, [tenantId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [companiesRes, rolesRes] = await Promise.all([
        supabase.from('companies').select('id, name').eq('tenant_id', tenantId).order('name'),
        supabase.from('job_roles').select('*, companies(name)').eq('tenant_id', tenantId).order('created_at', { ascending: false })
      ]);

      if (companiesRes.data) setCompanies(companiesRes.data);
      if (rolesRes.data) setRoles(rolesRes.data);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRoles = roles.filter(role => {
    const matchesSearch = role.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCompany = !filterCompanyId || role.company_id === filterCompanyId;
    return matchesSearch && matchesCompany;
  });

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este cargo?")) {
      await supabase.from('job_roles').delete().eq('id', id);
      fetchData();
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-800 flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-brand-blue" />
            Biblioteca de Cargos
          </h2>
          <p className="text-neutral-500 text-sm">Gerencie os benchmarks de função e perfis ideais.</p>
        </div>
        <button 
          onClick={() => { setSelectedRole(null); setIsModalOpen(true); }}
          className="flex items-center gap-2 bg-brand-blue hover:bg-brand-dark text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-brand-blue/20 transition-all text-sm transform hover:-translate-y-0.5"
        >
          <Sparkles className="w-4 h-4" /> Novo Benchmark com IA
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-neutral-100 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input 
            type="text" 
            placeholder="Buscar por título do cargo..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none transition-all"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-neutral-400" />
          <select 
            value={filterCompanyId} 
            onChange={(e) => setFilterCompanyId(e.target.value)}
            className="flex-1 md:w-48 px-3 py-2 bg-white border border-neutral-200 rounded-lg text-sm focus:border-brand-blue outline-none"
          >
            <option value="">Todas as Empresas</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white h-48 rounded-2xl shadow-sm border border-neutral-100 animate-pulse"></div>
          ))
        ) : filteredRoles.length > 0 ? (
          filteredRoles.map(role => (
            <div key={role.id} className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100 hover:shadow-md transition-all group relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-brand-blue opacity-0 group-hover:opacity-100 transition-opacity"></div>
              
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-brand-lightBlue/30 rounded-xl text-brand-blue">
                  <Briefcase className="w-6 h-6" />
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setSelectedRole(role); setIsModalOpen(true); }} className="p-2 text-neutral-400 hover:text-brand-blue hover:bg-neutral-50 rounded-lg"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(role.id)} className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>

              <h3 className="font-bold text-lg text-neutral-800 mb-1 line-clamp-1">{role.title}</h3>
              <div className="flex items-center gap-2 text-xs text-neutral-500 mb-6">
                <Building className="w-3 h-3" />
                <span>{(role as any).companies?.name || 'Empresa não definida'}</span>
              </div>

              {/* Mini Benchmark Preview */}
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                  <span>Perfil Decisório</span>
                  <span className="text-brand-blue flex items-center gap-1"><BrainCircuit className="w-3 h-3" /> AI Generated</span>
                </div>
                <div className="flex gap-1 h-1.5 w-full bg-neutral-100 rounded-full overflow-hidden">
                   {/* Visualização abstrata dos benchmarks */}
                   {role.benchmarks && Object.values(role.benchmarks).slice(0,6).map((val, i) => (
                      <div key={i} className="flex-1 bg-brand-blue opacity-80" style={{ height: `${Number(val) * 10}%`, marginTop: 'auto', borderRadius: '1px' }}></div>
                   ))}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center text-neutral-400 bg-neutral-50 rounded-2xl border-2 border-dashed border-neutral-200">
            <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="font-medium">Nenhum cargo encontrado.</p>
            <button onClick={() => setIsModalOpen(true)} className="mt-4 text-brand-blue font-bold text-sm hover:underline">Criar o primeiro agora</button>
          </div>
        )}
      </div>

      {isModalOpen && (
        <JobBenchmarkModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          tenantId={tenantId}
          onSuccess={fetchData}
          roleToEdit={selectedRole}
        />
      )}
    </div>
  );
};

export default JobBenchmarksView;
