
import { ComparisonItem } from '../types';
import { NormalizedReport } from './normalizeReport';
import { getScoreFromMap, SYNONYM_MAP } from '../services/riskAnalysisService';

/**
 * UTILS DE COMPARAÇÃO UNIFICADA
 * Normaliza Attributes, DISC e Values para uma escala comum (0-100)
 * para permitir análise de aderência (fit) consolidada.
 */

// 1. Attribute Index Comparison
export function buildAttributeComparison(
  normalized: NormalizedReport,
  benchmarks: any
): ComparisonItem[] {
  const attributeKeys = Object.keys(SYNONYM_MAP); // Chaves oficiais (Empatia, etc)

  return attributeKeys.map(key => {
    const rawCand = getScoreFromMap(key, normalized.scores) ?? 0;
    const rawBench = getScoreFromMap(key, benchmarks) ?? 5.5; // Default médio

    const cand100 = rawCand * 10;
    const bench100 = rawBench * 10;
    const diff = cand100 - bench100;

    let fit = 100 - Math.abs(diff); // Linear fit: distância direta
    if (fit < 0) fit = 0;

    // Helper de status
    let status: ComparisonItem['status'] = 'aligned';
    if (diff < -20) status = 'critical';
    else if (diff < -10) status = 'moderate';
    else if (diff > 20) status = 'surplus';

    return {
      domain: 'attribute',
      key,
      label: key,
      candidate_score: cand100,
      benchmark_score: bench100,
      delta: diff,
      fit,
      status
    };
  });
}

// 2. DISC Comparison
export function buildDiscComparison(
  normalized: NormalizedReport,
  benchDisc: any
): ComparisonItem[] {
  // Se não houver benchmark de DISC, assumimos 50 (Neutro)
  const safeBench = benchDisc || { D: 50, I: 50, S: 50, C: 50 };

  return ['D', 'I', 'S', 'C'].map(k => {
    // Disc já vem 0-100 na normalização
    const cand = normalized.disc[k as keyof typeof normalized.disc] || 50;
    const bench = Number(safeBench[k] || 50);
    const diff = cand - bench;

    // DISC Fit: Tolerância maior.
    // Diferença de até 15 pontos é considerada irrelevante (Fit 100)
    let fit = 0;
    const absDiff = Math.abs(diff);
    if (absDiff <= 15) fit = 100;
    else fit = Math.max(0, 100 - (absDiff - 15) * 2); // Penaliza o excedente

    let status: ComparisonItem['status'] = 'aligned';
    if (absDiff > 30) status = 'critical';
    else if (absDiff > 15) status = 'moderate';

    return {
      domain: 'disc',
      key: k,
      label: `Fator ${k}`,
      candidate_score: cand,
      benchmark_score: bench,
      delta: diff,
      fit,
      status
    };
  });
}

// 3. Values Comparison
function valueBenchmarkToNumber(level: string | number): number {
  if (typeof level === 'number') {
      // Se for <= 10, assume escala 0-10 e converte. Se > 10, assume 0-100.
      return level <= 10 ? level * 10 : level;
  }
  
  const l = (level || '').toLowerCase();
  if (l.includes('alto') || l.includes('high')) return 85;
  if (l.includes('baixo') || l.includes('low')) return 15;
  return 50; // médio/neutro
}

export function buildValuesComparison(
  normalized: NormalizedReport,
  benchValues: any
): ComparisonItem[] {
  
  // Mapa de chaves normalizadas para labels
  const valueMap: Record<string, string> = {
    'aesthetic': 'Estética',
    'economic': 'Econômica',
    'individualistic': 'Individualista',
    'political': 'Política',
    'altruistic': 'Altruísta',
    'regulatory': 'Reguladora',
    'theoretical': 'Teórica'
  };

  const safeBench = benchValues || {};

  return Object.entries(valueMap).map(([key, label]) => {
    // normalized.values[key] retorna objeto { score: number, description... }
    const candObj = normalized.values[key];
    
    // CORREÇÃO CRÍTICA:
    // Se o score for > 10 (ex: 99), assume que já é escala 0-100 e NÃO multiplica.
    // Se for <= 10 (ex: 8.5), multiplica por 10.
    let cand = 0;
    if (candObj && typeof candObj.score === 'number') {
        cand = candObj.score > 10 ? candObj.score : candObj.score * 10;
    }

    // Tenta encontrar benchmark pela chave em inglês ou label em português
    const rawBench = safeBench[key] || safeBench[label] || 'medio';
    const bench = valueBenchmarkToNumber(rawBench);

    const diff = Math.abs(cand - bench);
    
    // Regra de Aderência Cultural (Fit por faixas)
    let fit = 0;
    let status: ComparisonItem['status'] = 'aligned';

    if (diff <= 20) {
        fit = 100;
        status = 'aligned';
    } else if (diff <= 35) {
        fit = 65;
        status = 'moderate';
    } else {
        fit = 20;
        status = 'critical';
    }

    return {
      domain: 'value',
      key,
      label,
      candidate_score: cand,
      benchmark_score: bench,
      delta: cand - bench, // Delta real para saber se é acima/abaixo
      fit,
      status
    };
  });
}

// 4. Aggregator
export function buildFullComparison(
    normalized: NormalizedReport | null, 
    role: any
): ComparisonItem[] {
    if (!normalized || !role) return [];

    const attrItems = buildAttributeComparison(normalized, role.benchmarks);
    const discItems = buildDiscComparison(normalized, role.metadata?.disc_preferences);
    const valueItems = buildValuesComparison(normalized, role.metadata?.value_preferences);

    return [...attrItems, ...discItems, ...valueItems];
}
