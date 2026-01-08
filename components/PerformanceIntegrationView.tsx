
import React, { useState, useEffect, useMemo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Label, Cell } from 'recharts';
import { CandidateReport, PerformanceReviewData, PerformanceQuadrant } from '../types';
import { UploadCloud, Save, AlertCircle, Info, Star, Target, AlertTriangle, XCircle, Search, Filter, Edit2, Check, TrendingUp } from 'lucide-react';

interface PerformanceIntegrationViewProps {
  reports: CandidateReport[];
  tenantId?: string;
}

const PerformanceIntegrationView: React.FC<PerformanceIntegrationViewProps> = ({ reports, tenantId }) => {
  const [data, setData] = useState<PerformanceReviewData[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editScore, setEditScore] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  // Lógica de Quadrantes (Matriz 2x2 - 9 Box Simplified)
  const calculateQuadrant = (fit: number, perf: number): PerformanceQuadrant => {
    const FIT_THRESHOLD = 75;
    const PERF_THRESHOLD = 75;

    if (fit >= FIT_THRESHOLD && perf >= PERF_THRESHOLD) return 'Estrela';
    if (fit < FIT_THRESHOLD && perf >= PERF_THRESHOLD) return 'Risco'; // Entrega mas não tem fit (Risco de saída/cultura)
    if (fit >= FIT_THRESHOLD && perf < PERF_THRESHOLD) return 'Potencial'; // Tem fit mas não entrega (Treinável)
    return 'Desalinhado';
  };

  // Processamento de Dados (ADV Native)
  useEffect(() => {
    if (reports.length > 0) {
      const processedData: PerformanceReviewData[] = reports
        .filter(r => r.status === 'completed')
        .map(r => {
          // 1. Prioriza o Fit Score do ADV (que é mais preciso), fallback para legacy score
          const fit = r.fit_score !== undefined && r.fit_score !== null ? r.fit_score : (r.score || 0);
          
          // 2. Tenta recuperar performance real dos metadados ou gera mock estável baseado no ID
          // (Isso evita que os pontos "pulem" ao atualizar a tela)
          let perf = r.metadata?.performance_score;
          if (perf === undefined) {
              // Mock determinístico simples baseado no charCode do ID para consistência visual na demo
              const seed = r.id.charCodeAt(0) + r.id.charCodeAt(r.id.length - 1);
              perf = (seed % 40) + 55; // Gera entre 55 e 95
          }

          return {
            report_id: r.id,
            employee_name: r.name || r.candidate_name || r.email || 'Colaborador',
            role: r.role || r.job_title || 'Cargo não definido',
            fit_score: fit,
            performance_score: perf,
            quadrant: calculateQuadrant(fit, perf),
            last_review_date: r.metadata?.last_review_date || new Date().toISOString().split('T')[0]
          };
        })
        .filter(item => item.fit_score > 0); // Remove itens sem análise válida

      setData(processedData);
    }
  }, [reports]);

  const handleScoreUpdate = (reportId: string) => {
    const newScore = parseFloat(editScore);
    if (isNaN(newScore) || newScore < 0 || newScore > 100) {
      alert("Por favor insira uma nota entre 0 e 100.");
      return;
    }

    setData(prev => prev.map(item => {
      if (item.report_id === reportId) {
        return {
          ...item,
          performance_score: newScore,
          quadrant: calculateQuadrant(item.fit_score, newScore)
        };
      }
      return item;
    }));
    
    // Aqui poderia haver uma chamada ao Supabase para salvar r.metadata.performance_score
    setEditingId(null);
    setEditScore('');
  };

  const startEdit = (item: PerformanceReviewData) => {
    setEditingId(item.report_id);
    setEditScore(item.performance_score.toString());
  };

  const getQuadrantColor = (quadrant: PerformanceQuadrant) => {
    switch (quadrant) {
      case 'Estrela': return '#10B981'; // Emerald
      case 'Potencial': return '#F59E0B'; // Amber
      case 'Risco': return '#6366F1'; // Indigo
      case 'Desalinhado': return '#EF4444'; // Red
    }
  };

  const getQuadrantIcon = (quadrant: PerformanceQuadrant) => {
    switch (quadrant) {
      case 'Estrela': return <Star className="w-4 h-4 text-emerald-600" />;
      case 'Potencial': return <TrendingUp className="w-4 h-4 text-amber-600" />;
      case 'Risco': return <AlertTriangle className="w-4 h-4 text-indigo-600" />;
      case 'Desalinhado': return <XCircle className="w-4 h-4 text-red-600" />;
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload as PerformanceReviewData;
      return (
        <div className="bg-white p-3 border border-neutral-200 shadow-xl rounded-xl text-xs z-50">
          <p className="font-bold text-neutral-900 mb-1 text-sm">{d.employee_name}</p>
          <p className="text-neutral-500 mb-3 font-medium">{d.role}</p>
          <div className="space-y-2">
            <div className="flex justify-between gap-4">
               <span className="text-neutral-500">Fit Cultural (ADV):</span>
               <span className="text-brand-blue font-black">{d.fit_score}%</span>
            </div>
            <div className="flex justify-between gap-4">
               <span className="text-neutral-500">Performance:</span>
               <span className="text-neutral-800 font-black">{d.performance_score}</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-neutral-100 font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: getQuadrantColor(d.quadrant) }}>
            {getQuadrantIcon(d.quadrant)}
            {d.quadrant}
          </div>
        </div>
      );
    }
    return null;
  };

  // Filtragem
  const filteredData = useMemo(() => {
    return data.filter(d => 
      d.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      d.role.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [data, searchTerm]);

  // Estatísticas
  const stats = {
    stars: data.filter(d => d.quadrant === 'Estrela').length,
    avgPerf: data.length > 0 ? Math.round(data.reduce((a, b) => a + b.performance_score, 0) / data.length) : 0,
    risk: data.filter(d => d.quadrant === 'Risco' || d.quadrant === 'Desalinhado').length
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-800 flex items-center gap-2">
             <Target className="w-6 h-6 text-brand-blue" /> Gestão de Performance 
          </h2>
          <p className="text-neutral-500 text-sm">Integração entre o Fit Cultural (ADV) e Avaliação de Desempenho Real.</p>
        </div>
        <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-neutral-200 text-neutral-600 rounded-lg hover:bg-neutral-50 font-medium transition-colors text-sm shadow-sm">
                <UploadCloud className="w-4 h-4" /> Importar Dados (CSV)
            </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-xl border border-neutral-100 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                <Star className="w-6 h-6" />
            </div>
            <div>
                <p className="text-xs text-neutral-500 font-bold uppercase">Talentos Estrela</p>
                <p className="text-2xl font-bold text-neutral-800">{stats.stars} <span className="text-sm text-neutral-400 font-normal">colaboradores</span></p>
            </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-neutral-100 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-brand-lightBlue text-brand-blue rounded-lg">
                <Target className="w-6 h-6" />
            </div>
            <div>
                <p className="text-xs text-neutral-500 font-bold uppercase">Média Performance</p>
                <p className="text-2xl font-bold text-neutral-800">{stats.avgPerf}</p>
            </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-neutral-100 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-red-50 text-red-600 rounded-lg">
                <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
                <p className="text-xs text-neutral-500 font-bold uppercase">Risco de Turnover</p>
                <p className="text-2xl font-bold text-neutral-800">{stats.risk} <span className="text-sm text-neutral-400 font-normal">monitorados</span></p>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart Section */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm h-[500px] flex flex-col">
              <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-neutral-800 flex items-center gap-2 text-sm uppercase tracking-wider">
                      <Target className="w-4 h-4 text-brand-blue" /> Matriz de Talento (9-Box Simplificada)
                  </h3>
              </div>
              <div className="flex-1 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                            type="number" 
                            dataKey="fit_score" 
                            name="Fit Score" 
                            domain={[0, 100]} 
                            tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 700}}
                            label={{ value: 'Fit Cultural (ADV Score)', position: 'insideBottom', offset: -15, fontSize: 11, fill: '#64748B', fontWeight: 600 }} 
                        />
                        <YAxis 
                            type="number" 
                            dataKey="performance_score" 
                            name="Performance" 
                            domain={[0, 100]} 
                            tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 700}}
                            label={{ value: 'Avaliação de Desempenho (0-100)', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#64748B', fontWeight: 600 }}
                        />
                        <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
                        
                        {/* Quadrant Lines */}
                        <ReferenceLine x={75} stroke="#cbd5e1" strokeDasharray="3 3" />
                        <ReferenceLine y={75} stroke="#cbd5e1" strokeDasharray="3 3" />

                        {/* Labels for Quadrants (Optional Visual Aid) */}
                        <ReferenceLine y={90} label={{ position: 'insideRight', value: 'Alta Perf.', fill: '#cbd5e1', fontSize: 10 }} stroke="none" />
                        <ReferenceLine x={90} label={{ position: 'insideTop', value: 'Alto Fit', fill: '#cbd5e1', fontSize: 10 }} stroke="none" />

                        <Scatter name="Colaboradores" data={data}>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={getQuadrantColor(entry.quadrant)} stroke="#fff" strokeWidth={2} />
                            ))}
                        </Scatter>
                    </ScatterChart>
                </ResponsiveContainer>
              </div>
          </div>

          {/* Quick Info / Legend */}
          <div className="space-y-4">
               <div className="bg-brand-blue text-white p-6 rounded-2xl shadow-lg">
                   <h3 className="font-bold text-lg mb-4">Legenda Estratégica</h3>
                   <ul className="space-y-4 text-sm opacity-90">
                       <li className="flex gap-3">
                           <div className="mt-0.5 p-1 bg-emerald-500/20 rounded"><Star className="w-4 h-4 text-emerald-300" /></div>
                           <div>
                               <strong className="text-emerald-300 block mb-0.5">Estrela (High Potential)</strong>
                               Entrega resultados e respira a cultura. Reter e promover.
                           </div>
                       </li>
                       <li className="flex gap-3">
                           <div className="mt-0.5 p-1 bg-amber-500/20 rounded"><TrendingUp className="w-4 h-4 text-amber-300" /></div>
                           <div>
                               <strong className="text-amber-300 block mb-0.5">Potencial (Aculturado)</strong>
                               Alto fit cultural, mas precisa de treino técnico ou tempo.
                           </div>
                       </li>
                       <li className="flex gap-3">
                           <div className="mt-0.5 p-1 bg-indigo-500/20 rounded"><AlertTriangle className="w-4 h-4 text-indigo-300" /></div>
                           <div>
                               <strong className="text-indigo-300 block mb-0.5">Risco (Alta Entrega)</strong>
                               Entrega números, mas destoa da cultura. Risco de toxicidade.
                           </div>
                       </li>
                       <li className="flex gap-3">
                           <div className="mt-0.5 p-1 bg-red-500/20 rounded"><XCircle className="w-4 h-4 text-red-300" /></div>
                           <div>
                               <strong className="text-red-300 block mb-0.5">Desalinhado</strong>
                               Baixo desempenho e baixo fit. Plano de recuperação ou saída.
                           </div>
                       </li>
                   </ul>
               </div>

               <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200 text-sm text-yellow-800">
                   <Info className="w-4 h-4 inline mr-2" />
                   <strong>Dica:</strong> Você pode editar as notas de performance diretamente na tabela abaixo para simular cenários.
               </div>
          </div>
      </div>

      {/* Interactive Table */}
      <div className="bg-white rounded-xl shadow-sm border border-neutral-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-100 bg-neutral-50/50 flex justify-between items-center">
              <h3 className="font-bold text-neutral-800 flex items-center gap-2 text-sm uppercase tracking-wider">
                  <Search className="w-4 h-4" /> Detalhamento
              </h3>
              <div className="relative w-64">
                <input 
                    type="text" 
                    placeholder="Filtrar por nome ou cargo..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-4 pr-4 py-2 bg-white border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none transition-all"
                />
             </div>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-white border-b border-neutral-100 text-neutral-500 font-semibold uppercase text-xs">
              <tr>
                <th className="px-6 py-4">Colaborador</th>
                <th className="px-6 py-4">Cargo</th>
                <th className="px-6 py-4 text-center">Fit Score (ADV)</th>
                <th className="px-6 py-4 text-center">Performance (0-100)</th>
                <th className="px-6 py-4">Quadrante</th>
                <th className="px-6 py-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
                {filteredData.map((item) => (
                    <tr key={item.report_id} className="hover:bg-neutral-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-neutral-800">{item.employee_name}</td>
                        <td className="px-6 py-4 text-neutral-600">{item.role}</td>
                        <td className="px-6 py-4 text-center">
                             <span className={`font-bold ${item.fit_score >= 75 ? 'text-brand-blue' : 'text-amber-600'}`}>
                                {item.fit_score}
                             </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                            {editingId === item.report_id ? (
                                <div className="flex items-center justify-center gap-2">
                                    <input 
                                        type="number" 
                                        value={editScore}
                                        onChange={(e) => setEditScore(e.target.value)}
                                        className="w-16 px-2 py-1 border border-brand-blue rounded text-center font-bold focus:outline-none"
                                        autoFocus
                                    />
                                    <button onClick={() => handleScoreUpdate(item.report_id)} className="p-1 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200">
                                        <Check className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <span className="font-bold text-neutral-800">{item.performance_score}</span>
                            )}
                        </td>
                        <td className="px-6 py-4">
                            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold w-fit" style={{ color: getQuadrantColor(item.quadrant), backgroundColor: getQuadrantColor(item.quadrant) + '15', border: `1px solid ${getQuadrantColor(item.quadrant)}30` }}>
                                {getQuadrantIcon(item.quadrant)}
                                {item.quadrant}
                            </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                             {editingId !== item.report_id && (
                                 <button onClick={() => startEdit(item)} className="text-neutral-400 hover:text-brand-blue transition-colors flex items-center gap-1 justify-end w-full">
                                     <Edit2 className="w-4 h-4" />
                                 </button>
                             )}
                        </td>
                    </tr>
                ))}
            </tbody>
          </table>
          {filteredData.length === 0 && (
              <div className="p-12 text-center text-neutral-400 flex flex-col items-center">
                  <Filter className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-sm font-medium">Nenhum dado encontrado.</p>
              </div>
          )}
      </div>
    </div>
  );
};

export default PerformanceIntegrationView;
