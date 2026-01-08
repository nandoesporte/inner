import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
// Removed Session import due to export errors; using any in props
import { User, Building, Mail, Shield, Save, Loader2, CreditCard, CheckCircle2, Webhook, Copy, Key, Palette, Image as ImageIcon, Type } from 'lucide-react';
import { UserRole, TenantSettings } from '../types';
import { candidateImportService } from '../services/candidateImportService';

interface SettingsViewProps {
  // Using any to bypass Session export issues
  session: any;
  userRole: UserRole;
  tenantId?: string;
  // Callback para atualizar o estado global do App quando as configurações mudarem
  onSettingsChange?: (newSettings: TenantSettings) => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ session, userRole, tenantId, onSettingsChange }) => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'billing' | 'api' | 'branding'>('profile');
  const [successMsg, setSuccessMsg] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  
  // Branding State
  const [brandingSettings, setBrandingSettings] = useState<TenantSettings>({
    logo_url: '',
    login_title: 'Bem-vindo de volta!',
    login_subtitle: 'Acesse sua conta para gerenciar avaliações.',
    login_cover_title: 'PESSOA CERTA',
    login_cover_subtitle: 'Para todas as empresas que valorizam gente de verdade'
  });

  // Webhook Configs
  const webhookConfig = tenantId ? candidateImportService.getWebhookConfig(tenantId) : null;

  useEffect(() => {
    if (session?.user) {
      setEmail(session.user.email || '');
      fetchProfile();
      // Em produção, buscaríamos as configurações salvas do tenant aqui
      // fetchTenantSettings(tenantId);
    }
  }, [session, tenantId]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name') 
        .eq('id', session.user.id)
        .single();

      if (data) {
        setName(data.full_name || '');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleUpdateProfile = async () => {
    setLoading(true);
    setSuccessMsg('');
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: name, updated_at: new Date() })
        .eq('id', session.user.id);

      if (error) throw error;
      setSuccessMsg('Perfil atualizado com sucesso!');
      
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Erro ao atualizar perfil.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBranding = async () => {
    setLoading(true);
    // Simulação de persistência (em produção salvaríamos numa tabela 'tenants' ou 'tenant_settings')
    try {
        await new Promise(resolve => setTimeout(resolve, 800)); // Fake API call
        
        // Atualiza estado global do App para refletir mudanças imediatamente
        if (onSettingsChange) {
            onSettingsChange(brandingSettings);
        }

        setSuccessMsg('Personalização salva com sucesso!');
        setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e) {
        alert('Erro ao salvar configurações');
    } finally {
        setLoading(false);
    }
  };

  const CopyField = ({ label, value }: { label: string, value: string }) => (
    <div className="space-y-1">
      <label className="text-xs font-bold text-neutral-500 uppercase">{label}</label>
      <div className="flex gap-2">
        <code className="flex-1 bg-neutral-100 border border-neutral-200 p-2 rounded text-sm text-neutral-700 font-mono truncate">
          {value}
        </code>
        <button 
          onClick={() => navigator.clipboard.writeText(value)}
          className="p-2 text-neutral-500 hover:text-brand-blue hover:bg-brand-lightBlue rounded border border-neutral-200 transition-colors"
          title="Copiar"
        >
          <Copy className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-neutral-800">Configurações</h2>
        <p className="text-neutral-500">Gerencie suas preferências, assinatura e integrações.</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neutral-200 overflow-x-auto">
         <button 
           onClick={() => setActiveTab('profile')}
           className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'profile' ? 'border-brand-blue text-brand-blue' : 'border-transparent text-neutral-500 hover:text-neutral-700'}`}
         >
            Perfil
         </button>
         <button 
           onClick={() => setActiveTab('branding')}
           className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'branding' ? 'border-brand-blue text-brand-blue' : 'border-transparent text-neutral-500 hover:text-neutral-700'}`}
         >
            Personalização
         </button>
         <button 
           onClick={() => setActiveTab('billing')}
           className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'billing' ? 'border-brand-blue text-brand-blue' : 'border-transparent text-neutral-500 hover:text-neutral-700'}`}
         >
            Empresa & Faturamento
         </button>
         <button 
           onClick={() => setActiveTab('api')}
           className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'api' ? 'border-brand-blue text-brand-blue' : 'border-transparent text-neutral-500 hover:text-neutral-700'}`}
         >
            API & Integrações
         </button>
      </div>

      <div className="py-2">
        {/* TAB: PROFILE */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden animate-fadeIn">
             <div className="px-6 py-4 border-b border-neutral-100 bg-neutral-50/50">
               <h3 className="font-semibold text-neutral-800 flex items-center gap-2"><User className="w-5 h-5 text-brand-blue" /> Meu Perfil</h3>
             </div>
             <div className="p-8 space-y-6">
               <div className="flex flex-col md:flex-row gap-6">
                 <div className="flex-shrink-0 flex flex-col items-center gap-3">
                   <div className="w-24 h-24 rounded-full bg-brand-lightBlue flex items-center justify-center text-3xl font-bold text-brand-blue border-4 border-white shadow-sm">
                     {name ? name.substring(0, 2).toUpperCase() : email.substring(0, 2).toUpperCase()}
                   </div>
                 </div>
                 <div className="flex-1 space-y-4">
                   <div className="space-y-2">
                     <label className="text-sm font-medium text-neutral-700">Nome Completo</label>
                     <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none" />
                   </div>
                   <div className="space-y-2">
                     <label className="text-sm font-medium text-neutral-700">E-mail</label>
                     <input type="email" value={email} disabled className="w-full px-4 py-2 border border-neutral-200 bg-neutral-50 text-neutral-500 rounded-lg cursor-not-allowed" />
                   </div>
                   <div className="pt-2 flex items-center gap-4">
                     <button onClick={handleUpdateProfile} disabled={loading} className="flex items-center gap-2 px-6 py-2 bg-brand-blue hover:bg-brand-dark text-white rounded-lg font-medium shadow-sm transition-all disabled:opacity-70">
                       {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar
                     </button>
                     {successMsg && <span className="text-sm text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> {successMsg}</span>}
                   </div>
                 </div>
               </div>
             </div>
          </div>
        )}

        {/* TAB: BRANDING (CUSTOMIZATION) */}
        {activeTab === 'branding' && (
            <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden animate-fadeIn">
                <div className="px-6 py-4 border-b border-neutral-100 bg-neutral-50/50">
                    <h3 className="font-semibold text-neutral-800 flex items-center gap-2"><Palette className="w-5 h-5 text-brand-blue" /> Marca & Login</h3>
                </div>
                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <h4 className="font-bold text-neutral-700 border-b pb-2 flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Logotipo do Sistema</h4>
                        <div className="space-y-3">
                            <label className="text-sm font-medium text-neutral-600">URL do Logo (Recomendado: PNG Transparente)</label>
                            <input 
                                type="text" 
                                placeholder="https://exemplo.com/logo.png"
                                value={brandingSettings.logo_url}
                                onChange={(e) => setBrandingSettings({...brandingSettings, logo_url: e.target.value})}
                                className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none"
                            />
                            <p className="text-xs text-neutral-400">Deixe em branco para usar o logo padrão (Alvo PC).</p>
                        </div>

                        <div className="mt-4 p-4 bg-neutral-50 rounded-lg border border-dashed border-neutral-300 flex items-center justify-center min-h-[100px]">
                            {brandingSettings.logo_url ? (
                                <img src={brandingSettings.logo_url} alt="Preview Logo" className="max-h-16 max-w-full object-contain" />
                            ) : (
                                <span className="text-sm text-neutral-400">Preview do Logo (Padrão Ativo)</span>
                            )}
                        </div>
                    </div>

                    <div className="space-y-6">
                        <h4 className="font-bold text-neutral-700 border-b pb-2 flex items-center gap-2"><Type className="w-4 h-4" /> Textos da Tela de Login</h4>
                        
                        <div className="space-y-3">
                            <label className="text-sm font-medium text-neutral-600">Título de Boas-vindas</label>
                            <input 
                                type="text" 
                                value={brandingSettings.login_title}
                                onChange={(e) => setBrandingSettings({...brandingSettings, login_title: e.target.value})}
                                className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none"
                            />
                        </div>

                        <div className="space-y-3">
                            <label className="text-sm font-medium text-neutral-600">Subtítulo (Instrução)</label>
                            <input 
                                type="text" 
                                value={brandingSettings.login_subtitle}
                                onChange={(e) => setBrandingSettings({...brandingSettings, login_subtitle: e.target.value})}
                                className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none"
                            />
                        </div>

                        <div className="space-y-3">
                            <label className="text-sm font-medium text-neutral-600">Título da Capa (Imagem Lateral)</label>
                            <input 
                                type="text" 
                                value={brandingSettings.login_cover_title}
                                onChange={(e) => setBrandingSettings({...brandingSettings, login_cover_title: e.target.value})}
                                className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none"
                            />
                        </div>
                         <div className="space-y-3">
                            <label className="text-sm font-medium text-neutral-600">Subtítulo da Capa</label>
                            <input 
                                type="text" 
                                value={brandingSettings.login_cover_subtitle}
                                onChange={(e) => setBrandingSettings({...brandingSettings, login_cover_subtitle: e.target.value})}
                                className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none"
                            />
                        </div>
                    </div>

                    <div className="md:col-span-2 pt-4 flex justify-end gap-4 border-t border-neutral-100">
                         <button 
                            onClick={handleSaveBranding} 
                            disabled={loading} 
                            className="flex items-center gap-2 px-6 py-2 bg-brand-blue hover:bg-brand-dark text-white rounded-lg font-medium shadow-sm transition-all disabled:opacity-70"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar Alterações
                        </button>
                    </div>
                     {successMsg && <div className="md:col-span-2 text-center text-sm text-emerald-600 flex justify-center items-center gap-1"><CheckCircle2 className="w-4 h-4" /> {successMsg}</div>}
                </div>
            </div>
        )}

        {/* TAB: BILLING */}
        {activeTab === 'billing' && (
          <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden animate-fadeIn">
            <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
              <h3 className="font-semibold text-neutral-800 flex items-center gap-2"><Building className="w-5 h-5 text-brand-blue" /> Dados da Empresa</h3>
              <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded uppercase">Ativo</span>
            </div>
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-4">
                  <CopyField label="Tenant ID" value={tenantId || '...'} />
                  <div>
                    <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Plano Atual</label>
                    <div className="mt-2 flex items-center gap-3">
                       <span className="text-2xl font-bold text-neutral-900">Growth</span>
                       <span className="text-sm text-neutral-500">R$ 999/mês</span>
                    </div>
                  </div>
               </div>
               <div className="bg-brand-lightBlue rounded-xl p-6 border border-brand-blue/10">
                  <div className="flex items-start gap-3">
                     <div className="p-2 bg-white rounded-lg shadow-sm text-brand-blue"><CreditCard className="w-6 h-6" /></div>
                     <div>
                        <h4 className="font-bold text-neutral-800">Método de Pagamento</h4>
                        <p className="text-sm text-neutral-500 mt-1">Visa final 4242</p>
                        <button className="text-sm text-brand-blue font-bold mt-3 hover:underline">Gerenciar no Stripe</button>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        )}

        {/* TAB: API & INTEGRAÇÕES */}
        {activeTab === 'api' && webhookConfig && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
               <div className="px-6 py-4 border-b border-neutral-100 bg-neutral-50/50">
                 <h3 className="font-semibold text-neutral-800 flex items-center gap-2"><Webhook className="w-5 h-5 text-purple-600" /> Webhook de Ingestão</h3>
               </div>
               <div className="p-8 space-y-6">
                  <p className="text-sm text-neutral-600">
                    Utilize este endpoint para enviar PDFs automaticamente a partir de outros sistemas (Zapier, n8n, Make).
                    Envie um POST com o arquivo no formato <code>multipart/form-data</code> campo <code>file</code>.
                  </p>
                  <CopyField label="Endpoint URL (POST)" value={webhookConfig.url} />
                  <div className="flex items-start gap-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                     <Key className="w-5 h-5 flex-shrink-0 mt-0.5" />
                     <div>
                        <strong>Autenticação Necessária:</strong><br/>
                        Adicione o header <code>x-api-token</code> com o valor abaixo em suas requisições.
                     </div>
                  </div>
                  <CopyField label="API Token" value={webhookConfig.token} />
               </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
               <div className="px-6 py-4 border-b border-neutral-100 bg-neutral-50/50">
                 <h3 className="font-semibold text-neutral-800 flex items-center gap-2"><Mail className="w-5 h-5 text-brand-accent" /> Ingestão via E-mail</h3>
               </div>
               <div className="p-8">
                  <p className="text-sm text-neutral-600 mb-4">
                    Encaminhe currículos em PDF diretamente para o endereço abaixo. Eles serão processados e adicionados ao painel automaticamente.
                  </p>
                  <CopyField label="Endereço de Ingestão" value={webhookConfig.email} />
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsView;