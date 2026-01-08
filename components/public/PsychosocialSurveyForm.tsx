
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Loader2, CheckCircle2, AlertCircle, ShieldCheck, RefreshCw, ServerCrash, Settings } from 'lucide-react';
import { PSYCHOSOCIAL_SURVEY_DATA } from '../../constants';

interface PsychosocialSurveyFormProps {
  token: string;
}

const PsychosocialSurveyForm: React.FC<PsychosocialSurveyFormProps> = ({ token }) => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSystemError, setIsSystemError] = useState(false);
  const [isConfigError, setIsConfigError] = useState(false);
  
  const [candidateData, setCandidateData] = useState<{name: string, email: string} | null>(null);
  
  // Estado das respostas: { "dimensionId-questionIndex": score }
  const [answers, setAnswers] = useState<Record<string, number>>({});
  
  useEffect(() => {
    if (token) {
        validateToken();
    }
  }, [token]);

  const validateToken = async () => {
    setLoading(true);
    setError(null);
    setIsSystemError(false);
    setIsConfigError(false);

    try {
      const { data, error: dbError } = await supabase
        .from('assessment_invites')
        .select('candidate_name, candidate_email, survey_completed')
        .eq('survey_token', token)
        .maybeSingle();

      if (dbError) throw dbError;
      
      if (!data) {
          // Token não encontrado -> Redireciona para Link Expirado/Inválido
          window.location.href = '/link-expirado';
          return;
      }

      if (data.survey_completed) {
          // Já completado -> Redireciona para Link Expirado/Concluído
          window.location.href = '/link-expirado';
          return;
      }

      setCandidateData({
          name: data.candidate_name,
          email: data.candidate_email
      });
    } catch (err: any) {
      console.error("Erro na validação do token:", err);
      const msg = err.message || '';

      // Detecção de erro de infraestrutura ou URL errada
      if (
          msg.includes("service you requested is not available") || 
          msg.includes("upstream connect error") ||
          err.code === 503 || 
          err.code === 500
      ) {
          setError("Falha de conexão com o banco de dados. O serviço pode estar pausado ou instável.");
          setIsConfigError(true);
          setIsSystemError(true);
      } else if (msg.includes("Failed to fetch")) {
          setError("Erro de rede. Verifique sua conexão ou status do serviço.");
          setIsSystemError(true);
      } else {
          // Erro genérico
          setError(msg || 'Não foi possível validar seu acesso.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (dimId: number, qIdx: number, value: number) => {
      setAnswers(prev => ({
          ...prev,
          [`${dimId}-${qIdx}`]: value
      }));
  };

  const calculateProgress = () => {
      let totalQuestions = 0;
      PSYCHOSOCIAL_SURVEY_DATA.dimensions.forEach(d => totalQuestions += d.questions.length);
      const answered = Object.keys(answers).length;
      return Math.round((answered / totalQuestions) * 100);
  };

  const handleSubmit = async () => {
      let totalQuestions = 0;
      PSYCHOSOCIAL_SURVEY_DATA.dimensions.forEach(d => totalQuestions += d.questions.length);
      
      if (Object.keys(answers).length < totalQuestions) {
          alert("Por favor, responda todas as perguntas antes de finalizar.");
          return;
      }

      setSubmitting(true);
      try {
          const { data, error: fnError } = await supabase.functions.invoke('submit-psychosocial-survey', {
              body: {
                  token,
                  answers
              }
          });

          if (fnError) throw fnError;
          if (data && data.error) throw new Error(data.error);

          setSubmitted(true);
      } catch (err: any) {
          console.error("Erro no envio:", err);
          alert('Erro ao enviar avaliação: ' + (err.message || 'Tente novamente.'));
      } finally {
          setSubmitting(false);
      }
  };

  if (loading) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC]">
              <Loader2 className="w-10 h-10 text-brand-blue animate-spin mb-4" />
              <p className="text-neutral-500 font-medium animate-pulse">Carregando avaliação segura...</p>
          </div>
      );
  }

  if (error) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4">
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-neutral-200 text-center max-w-md animate-fadeIn">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isSystemError ? 'bg-amber-50' : 'bg-red-50'}`}>
                      {isConfigError ? <Settings className="w-8 h-8 text-amber-600" /> : isSystemError ? <ServerCrash className="w-8 h-8 text-amber-500" /> : <AlertCircle className="w-8 h-8 text-red-500" />}
                  </div>
                  <h2 className="text-xl font-bold text-neutral-800 mb-2">{isConfigError ? 'Verifique a Configuração' : (isSystemError ? 'Instabilidade' : 'Acesso Negado')}</h2>
                  <p className="text-neutral-600 mb-8 text-sm leading-relaxed">{error}</p>
                  <button 
                    onClick={() => window.location.reload()}
                    className="flex items-center justify-center gap-2 w-full py-3 bg-brand-blue hover:bg-brand-dark text-white font-bold rounded-xl transition-all shadow-lg shadow-brand-blue/20"
                  >
                      <RefreshCw className="w-4 h-4" /> Tentar Novamente
                  </button>
              </div>
          </div>
      );
  }

  if (submitted) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4">
              <div className="bg-white p-12 rounded-3xl shadow-lg border border-emerald-100 text-center max-w-lg animate-fadeIn">
                  <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCircle2 className="w-12 h-12 text-emerald-600" />
                  </div>
                  <h2 className="text-3xl font-black text-neutral-800 mb-4">Avaliação Concluída!</h2>
                  <p className="text-neutral-600 leading-relaxed text-lg">
                      Obrigado, <strong>{candidateData?.name.split(' ')[0]}</strong>. Suas respostas foram registradas com segurança e confidencialidade.
                  </p>
                  <div className="mt-8 p-4 bg-neutral-50 rounded-xl border border-neutral-200 text-xs text-neutral-500">
                      Esta janela pode ser fechada agora.
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans pb-20">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
              <div>
                  <h1 className="text-lg font-black text-brand-blue uppercase tracking-wider">Avaliação de Riscos Psicossociais</h1>
                  <p className="text-xs text-neutral-500 font-medium">Ambiente de Trabalho • Confidencial</p>
              </div>
              <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold text-neutral-700">{candidateData?.name}</p>
                  <div className="flex items-center justify-end gap-2 mt-1">
                      <div className="w-32 h-2 bg-neutral-100 rounded-full overflow-hidden">
                          <div className="h-full bg-brand-blue transition-all duration-500" style={{ width: `${calculateProgress()}%` }}></div>
                      </div>
                      <span className="text-[10px] font-bold text-neutral-400">{calculateProgress()}%</span>
                  </div>
              </div>
          </div>
      </header>

      <div className="max-w-3xl mx-auto p-6 space-y-8 mt-4">
          
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 flex gap-4">
              <ShieldCheck className="w-8 h-8 text-brand-blue shrink-0" />
              <div className="space-y-2">
                  <h3 className="font-bold text-brand-blue text-sm uppercase">Orientações Importantes</h3>
                  <ul className="text-xs text-blue-900 space-y-1 list-disc pl-4 opacity-80">
                      <li>Esta avaliação tem caráter <strong>PREVENTIVO</strong>, não diagnóstico.</li>
                      <li>Suas respostas são confidenciais e analisadas de forma coletiva.</li>
                      <li>Seja sincero: não existem respostas certas ou erradas.</li>
                  </ul>
              </div>
          </div>

          <div className="space-y-12">
              {PSYCHOSOCIAL_SURVEY_DATA.dimensions.map((dim) => (
                  <div key={dim.id} className="bg-white rounded-3xl shadow-sm border border-neutral-100 overflow-hidden animate-slideDown">
                      <div className="bg-brand-blue/5 border-b border-brand-blue/10 px-8 py-6">
                          <h2 className="font-black text-brand-blue text-lg uppercase tracking-widest flex items-center gap-3">
                              <span className="w-8 h-8 bg-brand-blue text-white rounded-lg flex items-center justify-center text-sm shadow-sm">{dim.id}</span>
                              {dim.title}
                          </h2>
                      </div>
                      <div className="p-8 space-y-10">
                          {dim.questions.map((question, qIdx) => (
                              <div key={qIdx} className="space-y-4">
                                  <p className="font-bold text-neutral-800 text-sm leading-relaxed">{question}</p>
                                  <div className="grid grid-cols-5 gap-2 sm:gap-4">
                                      {[1, 2, 3, 4, 5].map((val) => (
                                          <button
                                              key={val}
                                              onClick={() => handleAnswer(dim.id, qIdx, val)}
                                              className={`
                                                  flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all group
                                                  ${answers[`${dim.id}-${qIdx}`] === val 
                                                      ? 'border-brand-blue bg-brand-lightBlue/30 text-brand-blue shadow-md scale-105' 
                                                      : 'border-neutral-100 bg-neutral-50 text-neutral-400 hover:border-brand-blue/30 hover:bg-white'}
                                              `}
                                          >
                                              <span className={`text-lg font-black mb-1 ${answers[`${dim.id}-${qIdx}`] === val ? 'scale-110' : ''}`}>{val}</span>
                                              <span className="text-[9px] font-bold uppercase text-center leading-tight opacity-70 hidden sm:block">
                                                  {PSYCHOSOCIAL_SURVEY_DATA.scale[val]}
                                              </span>
                                          </button>
                                      ))}
                                  </div>
                                  <div className="flex justify-between px-2 sm:hidden text-[9px] font-bold text-neutral-400 uppercase tracking-wider">
                                      <span>Discordo</span>
                                      <span>Concordo</span>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              ))}
          </div>

          <div className="sticky bottom-4 z-40 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-neutral-200 flex justify-between items-center">
              <div className="text-xs font-medium text-neutral-500 hidden sm:block">
                  {Object.keys(answers).length} de {PSYCHOSOCIAL_SURVEY_DATA.dimensions.reduce((acc, d) => acc + d.questions.length, 0)} respondidas
              </div>
              <button 
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full sm:w-auto px-8 py-4 bg-brand-blue hover:bg-brand-dark text-white font-black uppercase tracking-widest rounded-xl shadow-lg transition-all transform active:scale-95 disabled:opacity-70 disabled:transform-none flex items-center justify-center gap-3"
              >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                  {submitting ? 'Enviando...' : 'Finalizar Avaliação'}
              </button>
          </div>

      </div>
    </div>
  );
};

export default PsychosocialSurveyForm;
