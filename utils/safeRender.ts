/**
 * RENDERIZAÇÃO SEGURA (Prevenção de Erro #31)
 * Garante que apenas primitivos válidos cheguem ao JSX.
 */
export function safeValue(value: any): string | number {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value;
  
  // Se for um objeto, array ou qualquer outro tipo não renderizável,
  // retornamos um fallback para evitar quebra do React.
  return '—';
}
