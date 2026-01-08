
import React, { useState, useEffect } from 'react';
import { Menu, X, LayoutDashboard, Users, FileText, Settings, Shield, Briefcase, Bell, HelpCircle, ChevronRight, LogOut, Brain, Activity, Building, TrendingUp, UserPlus, GitPullRequest } from 'lucide-react';
import { UserRole } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activePage: string;
  onNavigate: (page: string) => void;
  userRole: UserRole;
  onLogout: () => void;
  logoUrl?: string; // Nova prop para logo customizado
  onNewReport?: () => void;
}

// Logo SVG Padrão (Fallback)
const DefaultLogo: React.FC<{ className?: string, textClassName?: string }> = ({ className = "w-8 h-8", textClassName = "text-neutral-900" }) => (
  <div className="flex items-center gap-3">
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Círculo do Alvo */}
      <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="3" className="text-neutral-900"/>
      
      {/* Miras do Alvo */}
      <line x1="50" y1="0" x2="50" y2="15" stroke="currentColor" strokeWidth="3" className="text-neutral-900"/>
      <line x1="50" y1="85" x2="50" y2="100" stroke="currentColor" strokeWidth="3" className="text-neutral-900"/>
      <line x1="0" y1="50" x2="15" y2="50" stroke="currentColor" strokeWidth="3" className="text-neutral-900"/>
      <line x1="85" y1="50" x2="100" y2="50" stroke="currentColor" strokeWidth="3" className="text-neutral-900"/>
      
      {/* Letras PC Entrelaçadas em Vermelho */}
      <g transform="translate(22, 22) scale(0.56)">
        {/* P */}
        <path d="M10 0 H 60 C 85 0 85 50 60 50 H 35 V 100 H 10 V 0 Z M 35 20 V 35 H 55 C 65 35 65 20 55 20 H 35 Z" fill="#E93D25" />
        {/* C - Estilizado abaixo/ao lado */}
        <path d="M 40 60 L 65 60 L 65 80 L 40 80 L 40 90 L 90 90 L 90 65 L 110 65 L 110 100 C 110 115 100 115 90 115 L 30 115 C 10 115 10 95 10 90 L 10 60 Z" fill="#E93D25" opacity="0.95" />
      </g>
    </svg>
    <div className={`flex flex-col leading-none justify-center ${textClassName}`}>
      <span className="font-bold text-base tracking-widest uppercase font-sans whitespace-nowrap">Pessoa Certa</span>
    </div>
  </div>
);

const Layout: React.FC<LayoutProps> = ({ children, activePage, onNavigate, userRole, onLogout, logoUrl, onNewReport }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  useEffect(() => {
    // Define a hora atual formatada
    const now = new Date();
    setLastUpdate(`Hoje, ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`);
  }, []); // Executa apenas na montagem (simulando "último fetch")

  const NavItem = ({ id, icon: Icon, label }: { id: string; icon: any; label: string }) => {
    const isActive = activePage === id;
    return (
      <button
        onClick={() => {
          onNavigate(id);
          setIsSidebarOpen(false);
        }}
        className={`group flex items-center justify-between w-full px-4 py-3 mb-1 rounded-r-full mr-4 transition-all duration-200 text-sm font-medium border-l-4 ${
          isActive
            ? 'border-brand-blue bg-brand-lightBlue text-brand-textBlue'
            : 'border-transparent text-neutral-500 hover:bg-neutral-50 hover:text-brand-blue'
        }`}
      >
        <div className="flex items-center">
          <Icon className={`w-5 h-5 mr-3 transition-colors ${isActive ? 'text-brand-blue' : 'text-neutral-400 group-hover:text-brand-blue'}`} />
          {label}
        </div>
        {isActive && <ChevronRight className="w-4 h-4 text-brand-blue opacity-50" />}
      </button>
    );
  };

  const RenderLogo = () => {
    if (logoUrl) {
      return (
        <img 
            src={logoUrl} 
            alt="System Logo" 
            className="h-10 w-auto object-contain max-w-[180px]" 
        />
      );
    }
    return <DefaultLogo className="w-10 h-10" />;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row font-sans">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-neutral-200 p-4 flex justify-between items-center sticky top-0 z-20">
        <div className="h-8 flex items-center"><RenderLogo /></div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
          {isSidebarOpen ? <X className="text-neutral-600" /> : <Menu className="text-neutral-600" />}
        </button>
      </div>

      {/* Sidebar Overlay (Mobile) */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Estilo Clean White */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-neutral-100 shadow-sm transform transition-transform duration-200 ease-in-out flex flex-col
        md:relative md:transform-none
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 flex items-center justify-center md:justify-start min-h-[88px]">
           <RenderLogo />
        </div>

        <div className="flex-1 py-4 overflow-y-auto">
          <div className="mb-6">
             <div className="px-6 mb-2 text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Gestão de Talentos</div>
             <NavItem id="dashboard" icon={LayoutDashboard} label="Visão Geral" />
             <NavItem id="reports" icon={FileText} label="Relatórios" />
             <NavItem id="companies" icon={Building} label="Empresas" />
             <NavItem id="jobs" icon={Briefcase} label="Cargos & Benchmarks" />
             <NavItem id="compare" icon={Users} label="Comparação" />
             <NavItem id="multi-compare" icon={UserPlus} label="Multi-Comparação" />
             <NavItem id="succession" icon={GitPullRequest} label="Sucessão" />
             <NavItem id="performance" icon={TrendingUp} label="Gestão de Performance" />
             <NavItem id="predictive" icon={Brain} label="Analytics Preditivo" />
             <NavItem id="risk-management" icon={Activity} label="Gestão de Riscos (NR-1)" />
          </div>

          {(userRole === 'MASTER_ADMIN' || userRole === 'COMPANY_ADMIN') && (
            <div>
              <div className="px-6 mb-2 text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Administração</div>
              {userRole === 'MASTER_ADMIN' && (
                <NavItem id="master-admin" icon={Shield} label="Master Admin" />
              )}
              <NavItem id="settings" icon={Settings} label="Configurações" />
            </div>
          )}
        </div>

        <div className="p-4 border-t border-neutral-100">
           {/* Botão Sair */}
           <button onClick={onLogout} className="flex items-center w-full px-4 py-2 text-sm text-neutral-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium">
             <LogOut className="w-4 h-4 mr-3" />
             Sair
           </button>
           
           {/* Imagem Innermetrix Restaurada (URL) */}
           <div className="mt-8 flex flex-col items-center">
             <span className="text-[10px] font-bold text-neutral-300 uppercase tracking-widest mb-3">Powered by</span>
             <img 
               src="https://innermetrix.com.br/wp-content/uploads/2023/06/Innermetrix-Brazil-logo.png" 
               alt="Innermetrix Brasil" 
               className="w-28 opacity-70 hover:opacity-100 transition-opacity"
             />
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative bg-[#F8FAFC]">
        {/* Floating Help Button */}
        <div className="absolute top-24 left-6 z-0 pointer-events-none hidden lg:block">
            <button className="pointer-events-auto bg-brand-lightBlue p-2 rounded-full shadow-sm text-brand-blue hover:bg-brand-blue hover:text-white transition-colors" title="Ajuda">
                <HelpCircle className="w-5 h-5" />
            </button>
        </div>

        {/* Desktop Header Clean */}
        <header className="bg-white/80 backdrop-blur-md border-b border-neutral-200/60 py-3 px-8 md:px-12 hidden md:flex justify-between items-center sticky top-0 z-10">
          <div className="flex items-center text-sm text-neutral-500">
            <span>Home</span>
            <ChevronRight className="w-4 h-4 mx-2 text-neutral-300" />
            <span className="font-semibold text-brand-blue capitalize">{activePage.replace(/-/g, ' ')}</span>
          </div>
          
          <div className="flex items-center gap-6">
             <div className="text-right hidden lg:block">
                <p className="text-xs text-neutral-400">Última atualização</p>
                <p className="text-xs font-semibold text-neutral-600">{lastUpdate}</p>
             </div>
             <div className="h-8 w-px bg-neutral-200 hidden lg:block"></div>
             
             <button className="text-neutral-400 hover:text-brand-blue transition-colors relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-0 right-0 w-2 h-2 bg-primary rounded-full border-2 border-white"></span>
             </button>
             
             <div className="flex items-center gap-3 pl-2 border-l border-transparent">
                <div className="w-9 h-9 bg-brand-blue rounded-full flex items-center justify-center text-white text-sm font-bold border-2 border-white shadow-md">
                    AD
                </div>
             </div>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-auto p-6 md:p-12">
            <div className="max-w-7xl mx-auto">
                {children}
            </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;
