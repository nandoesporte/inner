
import React, { useState, useEffect } from 'react';
import { supabase, supabaseUrl } from '../../supabaseClient';
import { Loader2, UploadCloud, CheckCircle2, FileText, User, Lock, Briefcase, GraduationCap, Linkedin, Phone, AlertCircle, RefreshCw, ServerCrash, Settings, Database } from 'lucide-react';

interface ResumeFormProps {
  token: string;
}

const ResumeForm: React.FC<ResumeFormProps> = ({ token }) => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSystemError, setIsSystemError] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('');
  
  // Data from Invite
  const [candidateData, setCandidateData] = useState<{name: string, email: string} | null>(null);

  // Form Fields
  const [phone, setPhone] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [summary, setSummary] = useState('');
  const [experience, setExperience] = useState('');
  const [education, setEducation] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    if (token) {
        validateToken();
    }
  }, [token]);

  const validateToken = async () => {
    setLoading(true);
    setError(null);
    setIsSystemError(false);
    
    try {
      // Teste de conexão simples antes de buscar o token
      const { status, error: healthError } = await supabase.from('companies').select('count', { count: 'exact', head: true });
      
      if (healthError && status === 503) {
          throw new Error(`Serviço Indisponível (503). O projeto Supabase '${supabaseUrl}' parece estar pausado.`);
      }

      // Busca o convite pelo token do currículo
      const { data, error: dbError } = await supabase
        .from('assessment_invites')
        .select('candidate_name, candidate_email, resume_completed')
        .eq('resume_token', token)
        .maybeSingle();

      if (dbError) throw dbError;
      
      if (!data) {
          throw new Error('Link de formulário inválido, expirado ou já utilizado.');
      }

      if (data.resume_completed) {
          setSubmitted(true);
          return;
      }

      setCandidateData({
          name: data.candidate_name,
          email: data.candidate_email
      });
    } catch (err: any) {
      console.error("Erro na validação:", err);
      const msg = err.message || '';
      setDebugInfo(`Proj: ${supabaseUrl} | Code: ${err.code || 'N/A'} | Status: ${err.status || 'N/A'}`);

      if (msg.includes("service you requested is not available") || err.code === 503 || err.status === 503) {
          setError("O banco de dados não está respondendo. Verifique se o projeto no Supabase está 'Active' (verde) e não 'Paused'.");
          setIsSystemError(true);
      } else if (msg.includes("Failed to fetch")) {
          setError("Erro de conexão de rede. Verifique sua internet.");
          setIsSystemError(true);
      } else {
          setError(msg || 'Não foi possível validar seu acesso.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const selectedFile = e.target.files[0];
        if (selectedFile.size > 5 * 1024 * 1024) { 
            alert('Arquivo muito grande (Máx 5MB)');
            return;
        }
        if (selectedFile.type !== 'application/pdf') {
            alert('Apenas arquivos PDF são permitidos');
            return;
        }
        setFile(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !consent) {
        alert('Por favor, anexe seu currículo e aceite os termos da LGPD.');
        return;
    }
    setSubmitting(true);

    try {
        const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
        const filePath = `${token}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
            .from('resumes')
            .upload(filePath, file, { cacheControl: '3600', upsert: true });

        if (uploadError) throw uploadError;

        const { data, error: fnError } = await supabase.functions.invoke('submit-resume', {
            body: {
                token,
                phone,
                linkedin_url: linkedin,
                professional_summary: summary,
                experience,
                education,
                resume_file_path: filePath,
                lgpd_consent: consent
            }
        });

        if (fnError) throw fnError;
        if (data && data.error) throw new Error(data.error);

        setSubmitted(true);

    } catch (err: any) {
        console.error("Erro envio:", err);
        alert('Erro ao enviar: ' + (err.message || 'Tente novamente.'));
    } finally {
        setSubmitting(false);
    }
  };

  if (loading) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC]">
              <Loader2 className="w-10 h-10 text-brand-blue animate-spin mb-4" />
              <p className="text-neutral-500 font-medium animate-pulse">Conectando ao ambiente seguro...</p>
          </div>
      );
  }

  if (error) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4">
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-neutral-200 text-center max-w-md animate-fadeIn">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isSystemError ? 'bg-amber-50' : 'bg-red-50'}`}>
                      {isSystemError ? <ServerCrash className="w-8 h-8 text-amber-500" /> : <AlertCircle className="w-8 h-8 text-red-500" />}
                  </div>
                  <h2 className="text-xl font-bold text-neutral-800 mb-2">{isSystemError ? 'Serviço Indisponível' : 'Erro de Acesso'}</h2>
                  <p className="text-neutral-600 mb-6 text-sm leading-relaxed">{error}</p>
                  
                  {isSystemError && (
                      <div className="bg-neutral-100 p-3 rounded-lg text-[10px] font-mono text-neutral-500 mb-6 text-left break-all border border-neutral-200">
                          <strong>Diagnóstico Técnico:</strong><br/>
                          {debugInfo}
                      </div>
                  )}

                  <button onClick={() => window.location.reload()} className="flex items-center justify-center gap-2 w-full py-3 bg-brand-blue hover:bg-brand-dark text-white font-bold rounded-xl transition-all shadow-lg shadow-brand-blue/20">
                      <RefreshCw className="w-4 h-4" /> Tentar Novamente
                  </button>
              </div>
          </div>
      );
  }

  if (submitted) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4">
              <div className="bg-white p-10 rounded-2xl shadow-lg border border-emerald-100 text-center max-w-md animate-fadeIn">
                  <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-neutral-800 mb-2">Currículo Recebido!</h2>
                  <p className="text-neutral-500 leading-relaxed">
                      Obrigado{candidateData ? `, ${candidateData.name.split(' ')[0]}` : ''}. Seus dados foram salvos com segurança.
                  </p>
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-12 px-4 font-sans">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-neutral-100 animate-fadeIn">
        <div className="bg-[#002855] px-8 py-10 text-white text-center relative overflow-hidden">
            <div className="relative z-10">
                <h1 className="text-2xl font-bold mb-2">Complemento de Perfil</h1>
                <p className="text-blue-100 text-sm opacity-90">Olá, {candidateData?.name}.</p>
            </div>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-8">
            <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-brand-blue border border-neutral-100 shadow-sm"><User className="w-6 h-6" /></div>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-neutral-800 truncate">{candidateData?.name}</p>
                    <p className="text-xs text-neutral-500 truncate">{candidateData?.email}</p>
                </div>
                <div className="hidden sm:flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded font-bold uppercase tracking-wider"><Lock className="w-3 h-3" /> Seguro</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-sm font-bold text-neutral-700 flex items-center gap-2"><Phone className="w-4 h-4 text-brand-blue" /> Telefone / WhatsApp *</label>
                    <input required type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(11) 99999-9999" className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-blue/20 outline-none" />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-bold text-neutral-700 flex items-center gap-2"><Linkedin className="w-4 h-4 text-brand-blue" /> LinkedIn</label>
                    <input type="url" value={linkedin} onChange={e => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/..." className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-blue/20 outline-none" />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-bold text-neutral-700 flex items-center gap-2"><FileText className="w-4 h-4 text-brand-blue" /> Resumo Profissional *</label>
                <textarea required rows={4} value={summary} onChange={e => setSummary(e.target.value)} className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-blue/20 outline-none resize-none" />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-bold text-neutral-700 flex items-center gap-2"><Briefcase className="w-4 h-4 text-brand-blue" /> Experiência Recente *</label>
                <textarea required rows={3} value={experience} onChange={e => setExperience(e.target.value)} className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-blue/20 outline-none resize-none" />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-bold text-neutral-700 flex items-center gap-2"><GraduationCap className="w-4 h-4 text-brand-blue" /> Formação *</label>
                <textarea required rows={2} value={education} onChange={e => setEducation(e.target.value)} className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-blue/20 outline-none resize-none" />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-bold text-neutral-700">Currículo em PDF (Máx 5MB) *</label>
                <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer relative ${file ? 'border-emerald-400 bg-emerald-50' : 'border-neutral-300 hover:border-brand-blue hover:bg-neutral-50'}`}>
                    <input required type="file" accept="application/pdf" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    <div className="flex flex-col items-center justify-center pointer-events-none">
                        {file ? (
                            <>
                                <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-2" />
                                <p className="font-bold text-emerald-800">{file.name}</p>
                            </>
                        ) : (
                            <>
                                <UploadCloud className="w-12 h-12 text-neutral-400 mb-2" />
                                <p className="font-bold text-neutral-600">Clique ou arraste seu PDF aqui</p>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                <input required type="checkbox" id="consent" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-1 w-4 h-4 text-brand-blue rounded border-gray-300 focus:ring-brand-blue cursor-pointer" />
                <label htmlFor="consent" className="text-xs text-neutral-600 leading-relaxed cursor-pointer select-none">
                    Concordo em fornecer meus dados pessoais e profissionais para fins exclusivos de recrutamento e seleção, em conformidade com a LGPD.
                </label>
            </div>

            <button type="submit" disabled={submitting || !file || !consent} className="w-full py-4 bg-brand-blue hover:bg-brand-dark text-white font-bold rounded-xl shadow-lg shadow-brand-blue/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Finalizar e Enviar</span>}
            </button>
        </form>
      </div>
    </div>
  );
};

export default ResumeForm;
