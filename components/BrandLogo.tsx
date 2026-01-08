
import React from 'react';

interface BrandLogoProps {
  url?: string;
  className?: string;
  variant?: 'default' | 'white' | 'dark';
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const BrandLogo: React.FC<BrandLogoProps> = ({ 
  url, 
  className = "", 
  variant = 'default', 
  showText = true,
  size = 'md' 
}) => {
  
  const sizeClasses = {
    sm: 'h-6',
    md: 'h-10',
    lg: 'h-14',
    xl: 'h-20'
  };

  const textClasses = {
    default: 'text-brand-textBlue',
    white: 'text-white',
    dark: 'text-neutral-900'
  };

  // Cores para versão vetorial (SVG)
  const iconColor = variant === 'white' ? '#FFFFFF' : '#E93D25';
  const strokeColor = variant === 'white' ? '#FFFFFF' : '#002855';

  // Se houver uma URL válida, renderiza a imagem
  // Aplicamos filtro de brilho/inversão se a variante for 'white' para forçar a cor branca
  if (url && url !== '' && url !== 'null') {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <img 
          src={url} 
          alt="Logo" 
          className={`
            ${sizeClasses[size]} w-auto object-contain block max-w-[220px] transition-all duration-300
            ${variant === 'white' ? 'brightness-0 invert' : ''}
          `}
          onError={(e) => {
            // Só esconde se realmente falhar o carregamento após o mount
            if (url) (e.target as HTMLImageElement).style.opacity = '0';
          }}
        />
      </div>
    );
  }

  // Fallback para Logo Vetorial (SVG de alta fidelidade)
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg 
        viewBox="0 0 100 100" 
        className={`${sizeClasses[size]} w-auto aspect-square overflow-visible`} 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="50" cy="50" r="45" stroke={strokeColor} strokeWidth="5" />
        <line x1="50" y1="0" x2="50" y2="18" stroke={strokeColor} strokeWidth="5" strokeLinecap="round" />
        <line x1="50" y1="82" x2="50" y2="100" stroke={strokeColor} strokeWidth="5" strokeLinecap="round" />
        <line x1="0" y1="50" x2="18" y2="50" stroke={strokeColor} strokeWidth="5" strokeLinecap="round" />
        <line x1="82" y1="50" x2="100" y2="50" stroke={strokeColor} strokeWidth="5" strokeLinecap="round" />
        
        <g transform="translate(23, 23) scale(0.54)">
          <path d="M10 0 H 60 C 85 0 85 50 60 50 H 35 V 100 H 10 V 0 Z M 35 20 V 35 H 55 C 65 35 65 20 55 20 H 35 Z" fill={iconColor} />
          <path d="M 40 60 L 65 60 L 65 80 L 40 80 L 40 90 L 90 90 L 90 65 L 110 65 L 110 100 C 110 115 100 115 90 115 L 30 115 C 10 115 10 95 10 90 L 10 60 Z" fill={iconColor} opacity={variant === 'white' ? '0.85' : '0.95'} />
        </g>
      </svg>
      
      {showText && (
        <div className={`flex flex-col leading-none font-sans ${textClasses[variant]}`}>
          <span className="font-black text-base tracking-[0.1em] uppercase whitespace-nowrap">Pessoa Certa</span>
          <span className={`text-[8px] font-bold uppercase tracking-[0.3em] opacity-70 ${variant === 'white' ? 'text-white' : 'text-brand-blue'}`}>Analytics</span>
        </div>
      )}
    </div>
  );
};

export default BrandLogo;
