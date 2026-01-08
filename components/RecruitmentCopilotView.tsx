
import React, { useState, useEffect } from 'react';
/* Added Zap, Target, and Brain to the lucide-react imports to fix errors on lines 331, 339, and 536 */
import { Sparkles, Briefcase, FileText, MessageSquare, CheckSquare, Copy, Loader2, List, UserCheck, MapPin, Building, Globe, Clock, Trash2, ArrowRight, Share2, History, ClipboardList, TrendingUp, AlertCircle, CheckCircle2, XCircle, HelpCircle, Zap, Target, Brain } from 'lucide-react';
import { recruitmentService, RecruitmentPayload, RecruitmentTask } from '../services/recruitmentService';

// Interface para o Histórico
interface HistoryItem {
    id: string;
    timestamp: number;
    task: RecruitmentTask;
    jobTitle: string;
    content: any;
    inputs: {
        requirements: string;
        behavioral: string;
        resumeText?: string;
        info: any;
    }
}

const RecruitmentCopilotView: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const [activeTask, setActiveTask] = useState<RecruitmentTask>('job_posting');
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Form State
  const [jobInfo, setJobInfo] = useState({
    title: '',
    area: '',
    seniority: 'Pleno',
    work_model: 'Híbrido',
    location: '',
    company_context: ''
  });
  const [requirementsInput, setRequirementsInput] = useState('');
  const [behavioralInput, setBehavioralInput] = useState('');
  const [resumeTextInput, setResumeTextInput] = useState('');

  // Load History on Mount
  useEffect(() => {
      const savedHistory = localStorage.getItem('recruitment_copilot_history');
      if (savedHistory) {
          try {
              setHistory(JSON.parse(savedHistory));
          } catch (e) {
              console.error("Erro ao carregar histórico", e);
          }
      }
  }, []);

  // Save History Helper
  const saveToHistory = (content: any, task: RecruitmentTask) => {
      const newItem: HistoryItem = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          task,
          jobTitle: jobInfo.title || 'Sem título',
          content,
          inputs: {
              requirements: requirementsInput,
              behavioral: behavioralInput,
              resumeText: resumeTextInput,
              info: { ...jobInfo }
          }
      };

      const updatedHistory = [newItem, ...history].slice(0, 20); // Manter últimos 20
      setHistory(updatedHistory);
      localStorage.setItem('recruitment_copilot_history', JSON.stringify(updatedHistory));
  };

  const deleteHistoryItem = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const updated = history.filter(item => item.id !== id);
      setHistory(updated);
      localStorage.setItem('recruitment_copilot_history', JSON.stringify(updated));
  };

  const loadHistoryItem = (item: HistoryItem) => {
      setJobInfo(item.inputs.info);
      setRequirementsInput(item.inputs.requirements);
      setBehavioralInput(item.inputs.behavioral);
      setResumeTextInput(item.inputs.resumeText || '');
      setActiveTask(item.task);
      setGeneratedContent(item.content);
  };

  const handleGenerate = async () => {
    if (!jobInfo.title) {
        alert("Por favor, preencha pelo menos o Cargo.");
        return;
    }

    if (activeTask === 'resume_screening' && !resumeTextInput) {
        alert("Para triagem, é obrigatório colar o texto do currículo.");
        return;
    }

    setIsLoading(true);
    setGeneratedContent(null);

    try {
        const payload: RecruitmentPayload = {
            task: activeTask,
            job_info: jobInfo,
            requirements: requirementsInput.split('\n').filter(r => r.trim() !== ''),
            behavioral_profile: behavioralInput,
            resume_text: activeTask === 'resume_screening' ? resumeTextInput : undefined
        };

        const result = await recruitmentService.generateContent(payload);
        setGeneratedContent(result);
        saveToHistory(result, activeTask);

    } catch (error) {
        console.error(error);
        alert("Erro ao gerar conteúdo. Tente novamente.");
    } finally {
        setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
      if (typeof text !== 'string') text = JSON.stringify(text, null, 2);
      navigator.clipboard.writeText(text);
      alert("Copiado para a área de transferência!");
  };

  const handleLinkedInShare = () => {
      if (!generatedContent) return;
      let textToShare = "";
      if (activeTask === 'job_posting') {
          textToShare = `🚀 Estamos contratando: ${generatedContent.job_title}!\n\n📍 ${generatedContent.location} | ${generatedContent.work_model}\n\n${generatedContent.job_summary}\n\nPrincipais Responsabilidades:\n${generatedContent.responsibilities?.map((r: string) => `• ${r}`).join('\n')}\n\nInteressados? Saiba mais no link nos comentários! #vagas #oportunidade #${generatedContent.job_title.replace(/\s/g, '')}`;
      } else if (activeTask === 'job_summary_short') {
          textToShare = `${generatedContent.headline}\n\n${generatedContent.short_description}\n\n👇 ${generatedContent.cta}`;
      } else {
          textToShare = `Nova oportunidade para ${jobInfo.title}. Confira os detalhes!`;
      }
      navigator.clipboard.writeText(textToShare);
      window.open('https://www.linkedin.com/feed/?shareActive=true', '_blank');
      alert("Texto copiado! Cole no LinkedIn.");
  };

  // --- Renderers ---

  const renderScreeningResult = (data: any) => {
      const getScoreColor = (score: number | null) => {
          if (score === null) return 'text-neutral-400 bg-neutral-50 border-neutral-100';
          if (score >= 80) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
          if (score >= 50) return 'text-amber-600 bg-amber-50 border-amber-200';
          return 'text-red-600 bg-red-50 border-red-200';
      };

      return (
          <div className="space-y-6 animate-fadeIn">
              <div className="bg-neutral-50 p-6 rounded-2xl border border-neutral-200 flex flex-col md:flex-row justify-between gap-6">
                  <div>
                      <h3 className="font-bold text-xl text-neutral-800">{data.candidate_overview?.name || 'Candidato'}</h3>
                      <p className="text-sm text-neutral-500 font-medium">{data.candidate_overview?.current_role}</p>
                      <p className="text-xs text-neutral-400 mt-1">{data.candidate_overview?.email}</p>
                  </div>
                  <div className={`px-6 py-3 rounded-2xl border flex flex-col items-center justify-center min-w-[140px] shadow-sm ${
                      data.overall_fit?.classification === 'Alto' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                      data.overall_fit?.classification === 'Médio' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                      'bg-red-50 text-red-800 border-red-200'
                  }`}>
                      <span className="text-[10px] font-black uppercase tracking-widest">Aderência Global</span>
                      <span className="text-2xl font-black">{data.overall_fit?.classification || 'N/A'}</span>
                  </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white border border-neutral-100 p-6 rounded-2xl shadow-sm">
                      <div className="flex justify-between items-center mb-4">
                          <h4 className="font-bold text-neutral-800 flex items-center gap-2"><Briefcase className="w-5 h-5 text-brand-blue" /> Fit Técnico</h4>
                          <span className={`text-sm font-black px-3 py-1 rounded-full border ${getScoreColor(data.technical_match?.score)}`}>{data.technical_match?.score}%</span>
                      </div>
                      <p className="text-sm text-neutral-600 mb-4 italic leading-relaxed">"{data.technical_match?.analysis}"</p>
                      <div className="space-y-4">
                          <div>
                              <p className="text-[10px] font-black text-emerald-600 uppercase mb-2 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Pontos Fortes</p>
                              <div className="flex flex-wrap gap-2">
                                  {data.technical_match?.matched_requirements?.map((req: string, i: number) => (
                                      <span key={i} className="text-[11px] font-bold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg border border-emerald-100">{req}</span>
                                  ))}
                              </div>
                          </div>
                          <div>
                              <p className="text-[10px] font-black text-red-500 uppercase mb-2 flex items-center gap-1"><XCircle className="w-3 h-3"/> Gaps Identificados</p>
                              <div className="flex flex-wrap gap-2">
                                  {data.technical_match?.missing_requirements?.map((req: string, i: number) => (
                                      <span key={i} className="text-[11px] font-bold bg-red-50 text-red-700 px-2.5 py-1 rounded-lg border border-red-100">{req}</span>
                                  ))}
                              </div>
                          </div>
                      </div>
                  </div>

                  <div className="bg-white border border-neutral-100 p-6 rounded-2xl shadow-sm">
                      <div className="flex justify-between items-center mb-4">
                          <h4 className="font-bold text-neutral-800 flex items-center gap-2"><UserCheck className="w-5 h-5 text-brand-blue" /> Fit Comportamental</h4>
                          {data.behavioral_match?.score !== null && (
                              <span className={`text-sm font-black px-3 py-1 rounded-full border ${getScoreColor(data.behavioral_match?.score)}`}>{data.behavioral_match?.score}%</span>
                          )}
                      </div>
                      <p className="text-sm text-neutral-600 mb-4 italic leading-relaxed">"{data.behavioral_match?.analysis}"</p>
                      <div className="space-y-4">
                          <ul className="space-y-2">
                              {data.behavioral_match?.alignment_points?.map((point: string, i: number) => (
                                  <li key={i} className="flex gap-2 text-xs text-neutral-700"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> {point}</li>
                              ))}
                              {data.behavioral_match?.attention_points?.map((point: string, i: number) => (
                                  <li key={i} className="flex gap-2 text-xs text-neutral-700"><AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" /> {point}</li>
                              ))}
                          </ul>
                      </div>
                  </div>
              </div>

              <div className="bg-brand-blue p-6 rounded-2xl shadow-xl text-white">
                  <h4 className="font-bold text-lg mb-3 flex items-center gap-2 text-blue-200"><TrendingUp className="w-5 h-5" /> Recomendação de Próximo Passo</h4>
                  <div className="flex items-center gap-3 mb-4">
                      <span className="text-sm font-black bg-white/10 px-4 py-1.5 rounded-full border border-white/20">{data.recommendation?.next_step}</span>
                      <span className="text-xs text-blue-300 font-bold uppercase tracking-widest">Confiança: {((data.recommendation?.confidence_level || 0) * 100).toFixed(0)}%</span>
                  </div>
                  <p className="text-sm text-blue-50 leading-relaxed italic border-l-4 border-blue-400/50 pl-4">"{data.recommendation?.notes_for_recruiter}"</p>
              </div>
          </div>
      );
  };

  const renderJobPosting = (data: any) => (
      <div className="space-y-8 animate-fadeIn">
          <div className="border-b border-neutral-100 pb-6">
              <h3 className="text-3xl font-black text-brand-blue mb-3">{data.job_title}</h3>
              <div className="flex flex-wrap gap-4 text-sm font-bold text-neutral-400 uppercase tracking-widest">
                  <span className="flex items-center gap-2 bg-neutral-50 px-3 py-1.5 rounded-lg"><MapPin className="w-4 h-4" /> {data.location}</span>
                  <span className="flex items-center gap-2 bg-neutral-50 px-3 py-1.5 rounded-lg"><Briefcase className="w-4 h-4" /> {data.work_model}</span>
              </div>
          </div>
          
          <div className="bg-neutral-50/50 p-6 rounded-2xl border border-neutral-100">
              <h4 className="font-black text-neutral-800 text-sm uppercase tracking-widest mb-4">Resumo da Oportunidade</h4>
              <p className="text-neutral-600 leading-relaxed whitespace-pre-line">{data.job_summary}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                  <h4 className="font-black text-neutral-800 text-sm uppercase tracking-widest flex items-center gap-2"><List className="w-4 h-4 text-brand-blue" /> Atividades</h4>
                  <ul className="space-y-3">
                      {data.responsibilities?.map((item: string, i: number) => (
                          <li key={i} className="flex gap-3 text-sm text-neutral-600 leading-tight">
                              <span className="w-1.5 h-1.5 bg-brand-blue/30 rounded-full mt-1.5 shrink-0" /> {item}
                          </li>
                      ))}
                  </ul>
              </div>
              <div className="space-y-4">
                  <h4 className="font-black text-neutral-800 text-sm uppercase tracking-widest flex items-center gap-2"><CheckSquare className="w-4 h-4 text-brand-blue" /> Requisitos</h4>
                  <ul className="space-y-3">
                      {data.requirements?.map((item: string, i: number) => (
                          <li key={i} className="flex gap-3 text-sm text-neutral-600 leading-tight">
                              <span className="w-1.5 h-1.5 bg-emerald-500/30 rounded-full mt-1.5 shrink-0" /> {item}
                          </li>
                      ))}
                  </ul>
              </div>
          </div>
      </div>
  );

  const renderInterviewScript = (data: any) => (
      <div className="space-y-6 animate-fadeIn">
          {data.interview_script?.map((section: any, idx: number) => (
              <div key={idx} className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="px-6 py-4 bg-neutral-50 border-b border-neutral-200">
                      <h4 className="font-bold text-brand-blue flex items-center gap-2 uppercase text-xs tracking-widest">
                          <MessageSquare className="w-4 h-4" /> {section.topic}
                      </h4>
                  </div>
                  <div className="p-6 space-y-4">
                      {section.questions?.map((q: string, qIdx: number) => (
                          <div key={qIdx} className="flex gap-4 p-4 bg-neutral-50/50 rounded-xl border border-neutral-100 hover:border-brand-blue/20 transition-all">
                              <span className="text-lg font-black text-brand-blue/20 select-none">Q{qIdx+1}</span>
                              <p className="text-sm text-neutral-700 font-medium leading-relaxed">{q}</p>
                          </div>
                      ))}
                  </div>
              </div>
          ))}
      </div>
  );

  const renderScreeningQuestions = (data: any) => (
    <div className="space-y-6 animate-fadeIn">
        <div className="bg-brand-lightBlue/30 p-6 rounded-2xl border border-brand-blue/10">
            <h3 className="font-bold text-brand-blue text-lg flex items-center gap-2"><List className="w-5 h-5"/> Perguntas de Filtro (Qualificação)</h3>
            <p className="text-sm text-neutral-600 mt-1">Perguntas recomendadas para formulários iniciais (Gupy, LinkedIn, etc).</p>
        </div>
        <div className="grid grid-cols-1 gap-4">
            {data.questions?.map((q: any, i: number) => (
                <div key={i} className="bg-white border border-neutral-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Pergunta {i+1}</span>
                        <span className="text-[10px] font-black bg-brand-lightBlue text-brand-blue px-2 py-1 rounded-lg uppercase">{q.type === 'multiple_choice' ? 'Múltipla Escolha' : 'Texto Aberto'}</span>
                    </div>
                    <p className="text-sm font-bold text-neutral-800 mb-3">{q.question}</p>
                    <div className="flex items-start gap-2 bg-neutral-50 p-3 rounded-xl border border-neutral-100">
                        <HelpCircle className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-neutral-500 italic leading-relaxed">Objetivo: {q.purpose}</p>
                    </div>
                </div>
            ))}
        </div>
    </div>
  );

  const renderBehavioralAlignment = (data: any) => (
    <div className="space-y-8 animate-fadeIn">
        <div className="bg-blue-50 border border-blue-100 p-8 rounded-3xl relative overflow-hidden">
            <div className="relative z-10">
                <h3 className="text-xl font-black text-blue-900 mb-3 flex items-center gap-2"><UserCheck className="w-6 h-6"/> Perfil Ideal</h3>
                <p className="text-sm text-blue-800 leading-relaxed italic">"{data.ideal_profile_description}"</p>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-200/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white border border-neutral-100 p-6 rounded-2xl shadow-sm">
                {/* Fixed Error: Cannot find name 'Zap' */}
                <h4 className="font-black text-neutral-800 text-sm uppercase tracking-widest mb-4 flex items-center gap-2"><Zap className="w-4 h-4 text-amber-500" /> Traços de Performance</h4>
                <div className="flex flex-wrap gap-2">
                    {data.key_behavioral_traits?.map((trait: string, i: number) => (
                        <span key={i} className="px-3 py-1.5 bg-neutral-50 text-neutral-700 text-xs font-bold rounded-lg border border-neutral-200">{trait}</span>
                    ))}
                </div>
            </div>
            <div className="bg-white border border-neutral-100 p-6 rounded-2xl shadow-sm">
                {/* Fixed Error: Cannot find name 'Target' */}
                <h4 className="font-black text-neutral-800 text-sm uppercase tracking-widest mb-4 flex items-center gap-2"><Target className="w-4 h-4 text-brand-blue" /> Expectativas de Estilo</h4>
                <ul className="space-y-3">
                    {data.work_style_expectations?.map((exp: string, i: number) => (
                        <li key={i} className="flex gap-3 text-xs text-neutral-600 leading-tight">
                            <span className="w-1.5 h-1.5 bg-blue-500/20 rounded-full mt-1 shrink-0" /> {exp}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      <div className="flex items-center gap-4 mb-2">
          <div className="p-3 bg-brand-blue rounded-2xl text-white shadow-xl shadow-brand-blue/30 scale-110">
              <Sparkles className="w-6 h-6" />
          </div>
          <div>
              <h2 className="text-3xl font-black text-neutral-900 tracking-tight">Recrutamento & Seleção Copilot</h2>
              <p className="text-neutral-500 text-sm font-medium">IA especializada para criar processos de alta performance.</p>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* INPUTS PANEL */}
          <div className="lg:col-span-4 space-y-6">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-100">
                  <h3 className="font-black text-neutral-800 text-xs uppercase tracking-widest mb-6 flex items-center gap-2 border-b border-neutral-50 pb-4">
                      <Briefcase className="w-4 h-4 text-brand-blue" /> Configuração da Vaga
                  </h3>
                  
                  <div className="space-y-5">
                      <div>
                          <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5">Título do Cargo *</label>
                          <input 
                              type="text" 
                              value={jobInfo.title}
                              onChange={e => setJobInfo({...jobInfo, title: e.target.value})}
                              placeholder="Ex: Desenvolvedor Fullstack Sênior"
                              className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-bold text-neutral-800 focus:ring-4 focus:ring-brand-blue/5 focus:border-brand-blue outline-none transition-all placeholder:font-normal"
                          />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5">Área / Depto</label>
                              <input 
                                  type="text" 
                                  value={jobInfo.area}
                                  onChange={e => setJobInfo({...jobInfo, area: e.target.value})}
                                  placeholder="Ex: Engenharia"
                                  className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold focus:border-brand-blue outline-none transition-all"
                              />
                          </div>
                          <div>
                              <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5">Senioridade</label>
                              <select 
                                  value={jobInfo.seniority}
                                  onChange={e => setJobInfo({...jobInfo, seniority: e.target.value})}
                                  className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold outline-none cursor-pointer"
                              >
                                  <option>Júnior</option><option>Pleno</option><option>Sênior</option><option>Especialista</option><option>Diretoria</option>
                              </select>
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5">Modelo</label>
                              <select 
                                  value={jobInfo.work_model}
                                  onChange={e => setJobInfo({...jobInfo, work_model: e.target.value})}
                                  className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold outline-none cursor-pointer"
                              >
                                  <option>Híbrido</option><option>Remoto</option><option>Presencial</option>
                              </select>
                          </div>
                          <div>
                              <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5">Local</label>
                              <input 
                                  type="text" 
                                  value={jobInfo.location}
                                  onChange={e => setJobInfo({...jobInfo, location: e.target.value})}
                                  placeholder="Cidade/UF"
                                  className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold focus:border-brand-blue outline-none"
                              />
                          </div>
                      </div>

                      <div>
                          <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5">Requisitos Técnicos</label>
                          <textarea 
                              rows={4}
                              value={requirementsInput}
                              onChange={e => setRequirementsInput(e.target.value)}
                              placeholder="- Linguagem X&#10;- Experiência em Y"
                              className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:bg-white focus:border-brand-blue outline-none resize-none transition-all"
                          />
                      </div>

                      {activeTask === 'resume_screening' && (
                          <div className="bg-brand-blue/5 p-4 rounded-2xl border border-brand-blue/10 animate-slideDown">
                              <label className="block text-[10px] font-black text-brand-blue uppercase tracking-widest mb-2 flex items-center gap-2">
                                  <ClipboardList className="w-4 h-4"/> Texto do Currículo *
                              </label>
                              <textarea 
                                  rows={8}
                                  value={resumeTextInput}
                                  onChange={e => setResumeTextInput(e.target.value)}
                                  placeholder="Cole o texto bruto do currículo do candidato aqui..."
                                  className="w-full px-4 py-3 bg-white border border-neutral-200 rounded-xl text-[11px] focus:border-brand-blue outline-none resize-none shadow-inner"
                              />
                          </div>
                      )}
                  </div>
              </div>

              <button 
                  onClick={handleGenerate}
                  disabled={isLoading}
                  className="w-full py-4 bg-brand-blue hover:bg-brand-dark text-white font-black rounded-2xl shadow-xl shadow-brand-blue/20 transition-all flex items-center justify-center gap-3 disabled:opacity-70 transform hover:-translate-y-1 active:translate-y-0 text-sm uppercase tracking-widest"
              >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                  {isLoading ? 'Analisando...' : (activeTask === 'resume_screening' ? 'Triar Currículo' : 'Gerar com IA')}
              </button>

              {history.length > 0 && (
                  <div className="bg-white rounded-3xl shadow-sm border border-neutral-100 overflow-hidden">
                      <div className="px-6 py-4 border-b border-neutral-50 bg-neutral-50/50 flex justify-between items-center">
                          <h3 className="text-[10px] font-black text-neutral-500 uppercase tracking-widest flex items-center gap-2">
                              <History className="w-3.5 h-3.5" /> Histórico Recente
                          </h3>
                      </div>
                      <div className="divide-y divide-neutral-50 max-h-[300px] overflow-y-auto custom-scrollbar">
                          {history.map((item) => (
                              <div key={item.id} onClick={() => loadHistoryItem(item)} className="p-4 hover:bg-neutral-50 cursor-pointer group transition-colors">
                                  <div className="flex justify-between items-start mb-1">
                                      <span className="font-bold text-xs text-neutral-800 line-clamp-1">{item.jobTitle}</span>
                                      <button onClick={(e) => deleteHistoryItem(item.id, e)} className="text-neutral-300 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                                  </div>
                                  <div className="flex justify-between items-center">
                                      <span className="text-[9px] font-black uppercase text-brand-blue bg-brand-lightBlue px-2 py-0.5 rounded-full">{item.task.replace(/_/g, ' ')}</span>
                                      <span className="text-[9px] text-neutral-400 font-bold uppercase">{new Date(item.timestamp).toLocaleDateString()}</span>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              )}
          </div>

          {/* OUTPUT PANEL */}
          <div className="lg:col-span-8 flex flex-col min-h-[700px]">
              
              <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                  {[
                      { id: 'job_posting', label: 'Anúncio da Vaga', icon: FileText },
                      { id: 'resume_screening', label: 'Triagem / Match', icon: ClipboardList },
                      { id: 'interview_script', label: 'Roteiro de Entrevista', icon: MessageSquare },
                      { id: 'screening_questions', label: 'Qualificação (Gupy)', icon: List },
                      { id: 'behavioral_alignment', label: 'Aderência Comportamental', icon: UserCheck },
                      { id: 'job_summary_short', label: 'Post LinkedIn', icon: Globe },
                  ].map(task => (
                      <button
                          key={task.id}
                          onClick={() => { setActiveTask(task.id as RecruitmentTask); setGeneratedContent(null); }}
                          className={`
                              flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap
                              ${activeTask === task.id 
                                  ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20 ring-4 ring-brand-blue/5' 
                                  : 'bg-white border border-neutral-100 text-neutral-500 hover:bg-neutral-50'}
                          `}
                      >
                          <task.icon className="w-3.5 h-3.5" /> {task.label}
                      </button>
                  ))}
              </div>

              <div className="flex-1 bg-white rounded-[2.5rem] shadow-card border border-neutral-100 p-10 relative overflow-hidden">
                  {!generatedContent && !isLoading && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-300">
                          <div className="p-8 bg-neutral-50 rounded-full mb-6 border border-neutral-100 shadow-inner">
                              <Sparkles className="w-16 h-16 opacity-20" />
                          </div>
                          <p className="font-black text-lg uppercase tracking-widest text-neutral-400">Pronto para Analisar</p>
                          <p className="text-sm mt-2 max-w-xs text-center opacity-60">Preencha os requisitos e clique em gerar para que o Copilot realize o trabalho pesado.</p>
                      </div>
                  )}

                  {isLoading && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/95 z-20 backdrop-blur-md">
                          <div className="relative mb-8">
                             <div className="w-24 h-24 border-8 border-brand-lightBlue rounded-full"></div>
                             <div className="absolute top-0 left-0 w-24 h-24 border-8 border-brand-blue border-t-transparent rounded-full animate-spin"></div>
                             {/* Fixed Error: Cannot find name 'Brain' */}
                             <Brain className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 text-brand-blue" />
                          </div>
                          <p className="text-brand-blue text-xl font-black uppercase tracking-widest animate-pulse">Processando Inteligência...</p>
                          <p className="text-neutral-400 text-sm mt-3 font-medium">Cruzando evidências de carreira e benchmarks de performance.</p>
                      </div>
                  )}

                  {generatedContent && (
                      <div className="animate-fadeIn">
                          <div className="flex justify-end gap-3 mb-10 border-b border-neutral-50 pb-6">
                              {(activeTask === 'job_posting' || activeTask === 'job_summary_short') && (
                                  <button onClick={handleLinkedInShare} className="flex items-center gap-2 px-4 py-2.5 bg-[#0A66C2] hover:bg-[#004182] text-white rounded-xl transition-all text-xs font-black shadow-md uppercase tracking-wider"><Share2 className="w-4 h-4" /> LinkedIn</button>
                              )}
                              <button onClick={() => copyToClipboard(generatedContent)} className="flex items-center gap-2 px-4 py-2.5 bg-neutral-50 text-neutral-600 hover:bg-brand-blue hover:text-white rounded-xl transition-all text-xs font-black border border-neutral-100 uppercase tracking-wider"><Copy className="w-4 h-4" /> Copiar</button>
                          </div>

                          <div className="max-w-4xl mx-auto">
                              {activeTask === 'job_posting' && renderJobPosting(generatedContent)}
                              {activeTask === 'interview_script' && renderInterviewScript(generatedContent)}
                              {activeTask === 'resume_screening' && renderScreeningResult(generatedContent)}
                              {activeTask === 'screening_questions' && renderScreeningQuestions(generatedContent)}
                              {activeTask === 'behavioral_alignment' && renderBehavioralAlignment(generatedContent)}
                              
                              {activeTask === 'job_summary_short' && (
                                  <div className="space-y-6 animate-fadeIn">
                                      <div className="p-8 bg-gradient-to-br from-brand-blue to-brand-dark text-white rounded-[2rem] shadow-2xl relative overflow-hidden">
                                          <div className="relative z-10">
                                              <h3 className="text-2xl font-black mb-4 leading-tight">{generatedContent.headline}</h3>
                                              <p className="text-blue-100 text-lg leading-relaxed mb-8 opacity-90 whitespace-pre-line">{generatedContent.short_description}</p>
                                              <button className="bg-white text-brand-blue px-8 py-3 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl transform transition-all hover:scale-105">{generatedContent.cta}</button>
                                          </div>
                                          <Globe className="absolute -bottom-10 -right-10 w-48 h-48 opacity-10 text-white" />
                                      </div>
                                  </div>
                              )}
                          </div>
                      </div>
                  )}
              </div>
          </div>
      </div>
    </div>
  );
};

export default RecruitmentCopilotView;
