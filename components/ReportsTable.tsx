
import React, { useState } from 'react';
import { CandidateReport } from '../types';
import { Download, Eye, AlertCircle, CheckCircle2, Loader2, Building, Trash2, Mail, Briefcase, FileText, Layers, UserPlus, Clock } from 'lucide-react';
import { reportTrackingService } from '../services/reportTrackingService';

interface ReportsTableProps {
  reports: CandidateReport[];
  tenantId?: string;
  onViewReport?: (report: CandidateReport) => void;
  onDeleteReport?: (report: CandidateReport) => void;
  onRefresh?: () => void;
}

const FitScoreRing = ({ score, hasValue }: { score: number, hasValue: boolean }) => {
    const radius = 18;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;
    let color = 'text-brand-blue';
    let bgColor = 'text-blue-100';
    
    if(!hasValue) { 
        color = 'text-neutral-300'; 
        bgColor = 'text-neutral-100'; 
    } else if(score < 60) { 
        color = 'text-red-500'; 
        bgColor = 'text-red-100'; 
    } else if(score < 80) { 
        color = 'text-amber-500'; 
        bgColor = 'text-amber-100'; 
    } else { 
        color = 'text-emerald-500'; 
        bgColor = 'text-emerald-100'; 
    }

    return (
        <div className="relative w-14 h-14 flex items-center justify-center">
            <svg className="transform -rotate-90 w-full h-full">
                <circle cx="28" cy="28" r={radius} stroke="currentColor" strokeWidth="4.5" fill="transparent" className={bgColor} />
                <circle cx="28" cy="28" r={radius} stroke="currentColor" strokeWidth="4.5" fill="transparent" className={`${color} transition-all duration-1000 ease-out`} strokeDasharray={circumference} strokeDashoffset={hasValue ? offset : circumference} strokeLinecap="round" />
            </svg>
            <span className={`absolute text-xs font-black ${!hasValue ? 'text-neutral-400' : 'text-neutral-800'}`}>
                {hasValue ? score : '-'}
            </span>
        </div>
    );
};

const ReportsTable: React.FC<ReportsTableProps> = ({ reports, onViewReport, onDeleteReport, tenantId, onRefresh }) => {
  const [requestingCv, setRequestingCv] = useState<string | null>(null);

  const getStatusBadge = (status: CandidateReport['status']) => {
    switch (status) {
      case 'completed': return <span className="flex items-center gap-1 w-fit px-2 py-1 rounded text-xs font-bold uppercase bg-emerald-50 text-emerald-600 border border-emerald-100"><CheckCircle2 className="w-3.5 h-3.5" /> OK</span>;
      case 'processing': return <span className="flex items-center gap-1 w-fit px-2 py-1 rounded text-xs font-bold uppercase bg-blue-50 text-blue-600 border border-blue-100"><Loader2 className="w-3.5 h-3.5 animate-spin" /> PROC.</span>;
      case 'error': return <span className="flex items-center gap-1 w-fit px-2 py-1 rounded text-xs font-bold uppercase bg-red-50 text-red-600 border border-red-100"><AlertCircle className="w-3.5 h-3.5" /> ERRO</span>;
    }
  };

  const handleView = (report: CandidateReport) => {
      if (onViewReport) {
          onViewReport(report);
      }
  };

  const handleDownloadPdf = async (url: string, filename: string) => {
      if (!url) { alert('URL do PDF não disponível.'); return; }
      try {
          const response = await fetch(url);
          const blob = await response.blob();
          const link = document.createElement('a');
          link.href = window.URL.createObjectURL(blob);
          link.setAttribute('download', `${filename.replace(/\s+/g, '_')}_Relatorio_Original.pdf`);
          document.body.appendChild(link);
          link.click();
          link.remove();
      } catch (e) {
          console.error('Download failed:', e);
          window.open(url, '_blank'); 
      }
  };

  const handleRequestResume = async (report: CandidateReport) => {
      if (!tenantId) { alert("ID da organização não identificado."); return; }
      if (!report.email || report.email.trim() === "") {
          alert("Este candidato não possui um e-mail cadastrado. Por favor, edite as informações do candidato primeiro.");
          return;
      }

      setRequestingCv(report.id);
      try {
          let inviteId = report.invite_id;
          if (!inviteId) {
              const result = await reportTrackingService.ensureInviteForReport(tenantId, report);
              if (!result.success || !result.inviteId) throw new Error(result.error || "Falha ao gerar registro.");
              inviteId = result.inviteId;
          }
          const emailResult = await reportTrackingService.sendResumeRequest(tenantId, inviteId);
          if(emailResult.success) { alert(`Solicitação enviada para ${report.email}!`); if (onRefresh) onRefresh(); } 
          else { alert('Erro ao enviar: ' + emailResult.error); }
      } catch (e: any) { alert('Erro: ' + e.message); } finally { setRequestingCv(null); }
  };

  return (
    <div className="w-full">
        <table className="w-full text-left border-collapse">
          <thead className="bg-white sticky top-0 z-10 border-b border-neutral-200">
            <tr>
              <th className="px-6 py-5 text-sm font-bold text-neutral-500 uppercase tracking-wider w-[35%]">Candidato</th>
              <th className="px-6 py-5 text-sm font-bold text-neutral-500 uppercase tracking-wider">Contexto</th>
              <th className="px-6 py-5 text-sm font-bold text-neutral-500 uppercase tracking-wider text-center">Fit Score</th>
              <th className="px-6 py-5 text-sm font-bold text-neutral-500 uppercase tracking-wider text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 bg-white">
            {reports.map((report) => {
              const rawFitScore = report.fit_score;
              const hasFitScore = typeof rawFitScore === 'number' && !isNaN(rawFitScore);
              const scoreToDisplay = hasFitScore ? rawFitScore : (report.score || 0);
              const hasValue = hasFitScore || (typeof report.score === 'number' && report.score > 0);

              return (
                <tr 
                    key={report.id} 
                    className="group hover:bg-neutral-50 transition-colors cursor-pointer" 
                    onClick={() => handleView(report)}
                >
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-xl bg-neutral-100 text-brand-blue flex items-center justify-center text-base font-black border border-neutral-200 shadow-sm group-hover:bg-brand-blue group-hover:text-white transition-all">
                          {(report.name || 'C').substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex flex-col min-w-0">
                          <span className="font-bold text-base text-neutral-900 truncate group-hover:text-brand-blue transition-colors">
                              {report.name}
                          </span>
                          <span className="text-sm text-neutral-500 truncate flex items-center gap-1.5 mt-0.5">
                              <Mail className="w-3.5 h-3.5" /> {report.email || 'Email não informado'}
                          </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                      <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2"><div className="p-1 bg-neutral-100 rounded text-neutral-500"><Building className="w-4 h-4" /></div><span className="text-sm font-bold text-neutral-700">{report.company_name || 'Interno'}</span></div>
                          <div className="flex items-center gap-2"><div className="p-1 bg-neutral-100 rounded text-neutral-500"><Briefcase className="w-4 h-4" /></div><span className="text-sm text-neutral-500 font-medium">{report.role || 'Sem cargo'}</span></div>
                      </div>
                  </td>
                  <td className="px-6 py-5">
                      <div className="flex flex-col items-center justify-center gap-2">
                          <FitScoreRing score={scoreToDisplay} hasValue={hasValue} />
                          {getStatusBadge(report.status)}
                      </div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex justify-end gap-3 items-center">
                      {report.resume_completed ? (
                          <span className="flex items-center gap-1.5 px-3 py-2 bg-purple-100 text-purple-800 text-xs font-black rounded-lg border border-purple-200 uppercase animate-fadeIn" title="Currículo recebido"><FileText className="w-4 h-4" /> CV OK</span>
                      ) : report.resume_sent ? (
                          <div className="flex items-center gap-2 animate-fadeIn"><span className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 text-amber-700 text-xs font-black rounded-lg border border-amber-100 uppercase" title="Aguardando envio do candidato"><Clock className="w-4 h-4" /> Pend.</span><button onClick={(e) => { e.stopPropagation(); handleRequestResume(report); }} disabled={requestingCv === report.id} className="p-2 text-brand-blue hover:bg-brand-lightBlue rounded-lg transition-colors border border-transparent"><UserPlus className="w-5 h-5" /></button></div>
                      ) : (
                          <button onClick={(e) => { e.stopPropagation(); handleRequestResume(report); }} disabled={requestingCv === report.id} className="flex items-center gap-2 px-3 py-2 bg-white border border-brand-blue text-brand-blue hover:bg-brand-blue hover:text-white text-xs font-black rounded-lg transition-colors shadow-sm uppercase">{requestingCv === report.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}Pedir CV</button>
                      )}
                      {report.status === 'completed' && (
                          <>
                              <button onClick={(e) => { e.stopPropagation(); handleView(report); }} className="flex items-center gap-2 px-4 py-2 bg-brand-blue text-white text-xs font-black rounded-lg shadow-md hover:bg-brand-dark transition-all uppercase"><Eye className="w-4 h-4" /> Ver</button>
                              <button onClick={(e) => { e.stopPropagation(); handleDownloadPdf(report.pdf_url, report.name || 'Relatorio'); }} className="p-2 text-neutral-400 hover:text-brand-blue hover:bg-brand-lightBlue rounded-lg transition-colors" title="Baixar PDF Original"><Download className="w-5 h-5" /></button>
                          </>
                      )}
                      {onDeleteReport && (<button onClick={(e) => { e.stopPropagation(); onDeleteReport(report); }} className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-5 h-5" /></button>)}
                    </div>
                    <div className="mt-3 text-xs font-medium text-neutral-400 text-right">{new Date(report.date || report.created_at || '').toLocaleDateString()}</div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      {reports.length === 0 && (<div className="p-20 text-center flex flex-col items-center justify-center"><div className="w-24 h-24 bg-neutral-50 rounded-full flex items-center justify-center mb-6 shadow-inner"><Layers className="w-10 h-10 text-neutral-300" /></div><p className="text-neutral-600 text-lg font-bold">Nenhum relatório encontrado.</p></div>)}
    </div>
  );
};
export default ReportsTable;
