
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Loader2, Mail, Lock, AlertCircle, ArrowRight } from 'lucide-react';
import { TenantSettings } from '../types';
import BrandLogo from './BrandLogo';

interface AuthViewProps {
  onLoginSuccess?: () => void;
  settings?: TenantSettings;
}

const AuthView: React.FC<AuthViewProps> = ({ onLoginSuccess, settings }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: authError } = await (supabase.auth as any).signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;
      if (onLoginSuccess) onLoginSuccess();
    } catch (err: any) {
      console.error('Erro de login:', err);
      setError(err.message || 'Credenciais inválidas. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center login-gradient p-4 font-sans">
      <div className="max-w-4xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row animate-fadeIn">
        
        {/* Lado Esquerdo: Branding/Cover */}
        <div className="md:w-1/2 bg-brand-blue p-12 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center mb-12">
               <BrandLogo 
                url={settings?.logo_url || "https://nxccuamwkcqcpghlvirj.supabase.co/storage/v1/object/public/reports/pessoacerta.png"} 
                variant="white" 
                size="lg" 
               />
            </div>
            
            <h1 className="text-4xl font-extrabold leading-tight mb-6">
              {settings?.login_cover_title || "Analytics de Alta Performance"}
            </h1>
            <p className="text-blue-100 text-lg opacity-80 leading-relaxed">
              {settings?.login_cover_subtitle || "Decisões baseadas em dados para recrutamento, sucessão e gestão de riscos corporativos."}
            </p>
          </div>

          <div className="relative z-10 pt-12">
             <div className="flex items-center gap-2 text-xs font-bold text-blue-300 uppercase tracking-widest">
                <span className="w-8 h-px bg-blue-300/30"></span>
                Powered by Innermetrix
             </div>
          </div>

          <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
          <div className="absolute top-20 -left-20 w-40 h-40 bg-primary/20 rounded-full blur-2xl"></div>
        </div>

        {/* Lado Direito: Formulário */}
        <div className="md:w-1/2 p-12 flex flex-col justify-center bg-white">
          <div className="mb-10 text-center md:text-left">
            <h2 className="text-2xl font-bold text-neutral-900 mb-2">
                {settings?.login_title || "Bem-vindo"}
            </h2>
            <p className="text-neutral-500 text-sm font-medium">
                {settings?.login_subtitle || "Acesse sua conta para gerenciar avaliações."}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 animate-slideDown">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700 font-medium leading-relaxed">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider ml-1">E-mail</label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 group-focus-within:text-brand-blue transition-colors" />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue/10 focus:border-brand-blue outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Senha</label>
                <button type="button" className="text-[10px] font-bold text-brand-blue hover:underline uppercase tracking-tighter">Esqueceu?</button>
              </div>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 group-focus-within:text-brand-blue transition-colors" />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue/10 focus:border-brand-blue outline-none transition-all"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-brand-blue hover:bg-brand-dark text-white font-bold rounded-xl shadow-lg shadow-brand-blue/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 flex items-center justify-center gap-2 mt-4"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Entrando...</span>
                </>
              ) : (
                <>
                  <span>Acessar Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-12 pt-8 border-t border-neutral-100 text-center">
             <p className="text-[10px] text-neutral-400 uppercase font-bold tracking-widest">
                Ambiente de Gestão de Talentos
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthView;
