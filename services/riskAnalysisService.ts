
import { PsychosocialAnalysisResult, PsychosocialRiskType } from '../types';
import { INNERMETRIX_ATTRIBUTES, PSYCHOSOCIAL_SURVEY_DATA } from '../constants';

/**
 * SERVIÇO PSICOMÉTRICO V6.9
 * Motor resiliente para extração de scores Innermetrix e Cálculo de Riscos.
 */

interface RiskResult {
  score: number;       
  label: string;       
  color: string;       
  criticalGaps: string[]; 
}

export interface CombinedRiskResult {
    risk_percentage: number; // 0 a 100 (Quanto maior, pior)
    level: 'Muito Baixo' | 'Baixo' | 'Moderado' | 'Alto' | 'Crítico';
    color: string;
    details: {
        psa_risk: number | null;
        nr1_risk: number | null;
        sources_used: string[];
    }
}

// Mapa exaustivo de sinônimos para chaves de banco de dados
// Chaves devem bater EXATAMENTE com INNERMETRIX_ATTRIBUTES
export const SYNONYM_MAP: Record<string, string[]> = {
    'Empatia': ['empathy', 'empatia', 'social', 'interpessoal', 'interpersonal', 'capacidade interpessoal', 'capacidade_interpessoal'],
    'Pensamento Prático': ['practical_thinking', 'pensamento_pratico', 'pratico', 'p. pratico', 'p_pratico', 'resultados', 'execucao', 'execution', 'foco em resultados', 'practical thinking'],
    'Pensamento Sistêmico': ['systems_judgment', 'sistemic_judgment', 'sistemico', 'p. sistemico', 'p_sistemico', 'julgamento de sistemas', 'pensamento sistemico', 'teorico', 'theoretical', 'systems judgment', 'visao estrategica'],
    'Autoestima': ['self_esteem_self_control', 'autoestima', 'self_esteem', 'controle_interno', 'auto-estima', 'self esteem', 'auto controle', 'auto_controle'],
    'Consciência de Função': ['functional_awareness', 'consciencia_funcao', 'funcao', 'papel_social', 'role_awareness', 'role', 'consciencia de funcao', 'sentido de dever', 'consciencia de papel'],
    'Auto-Direção': ['self_direction', 'autodirecao', 'direcao', 'direcao_futura', 'self-direction', 'self direction', 'autonomia', 'proatividade']
};

/**
 * Normalização agressiva para comparação de chaves.
 * Remove TUDO que não for letra ou número.
 */
const aggressiveNormalize = (s: string): string => {
    if (!s) return "";
    return s.toString().toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "")
        .trim();
};

/**
 * Busca um valor numérico em um mapa de scores.
 */
export const getScoreFromMap = (attribute: string, scores: any): number | undefined => {
    if (!scores) return undefined;
    
    const targetKey = aggressiveNormalize(attribute);
    const synonyms = SYNONYM_MAP[attribute] || [];
    const targetKeys = [targetKey, ...synonyms.map(aggressiveNormalize)];

    // CASO A: Scores é um Array (Comum em exportações complexas de IA)
    if (Array.isArray(scores)) {
        const found = scores.find(item => {
            const keyCandidate = item.component || item.attribute || item.name || item.componente;
            return keyCandidate && targetKeys.includes(aggressiveNormalize(keyCandidate));
        });
        return (found && typeof found.score === 'number') ? found.score : undefined;
    }

    // CASO B: Scores é um Objeto Plano
    if (typeof scores === 'object') {
        const candidateKeys = Object.keys(scores);
        
        // 1. Tenta Match Direto (sem normalizar o banco, apenas o alvo)
        if (scores[attribute] !== undefined && typeof scores[attribute] === 'number') return scores[attribute];

        // 2. Tenta match normalizado nas chaves
        for (const tk of targetKeys) {
            const match = candidateKeys.find(k => aggressiveNormalize(k) === tk);
            if (match && typeof scores[match] === 'number') return scores[match];
        }
        
        // 3. Tenta busca parcial (ex: "empathy_score" contém "empathy")
        const partialMatch = candidateKeys.find(k => {
            const normK = aggressiveNormalize(k);
            return targetKeys.some(tk => normK.includes(tk) || tk.includes(normK));
        });
        if (partialMatch && typeof scores[partialMatch] === 'number') return scores[partialMatch];
    }

    return undefined;
};

export const riskAnalysisService = {
  
  /**
   * Calcula o Índice de Risco Unificado (NR-01 + PSA)
   * Substitui o Fit Cultural no painel de Riscos.
   * 0% = Seguro | 100% = Risco Extremo
   */
  calculateCombinedRiskIndex: (scores: any): CombinedRiskResult => {
      let totalRiskSum = 0;
      let componentsCount = 0;
      const details = { psa_risk: null as number | null, nr1_risk: null as number | null, sources_used: [] as string[] };

      // 1. CÁLCULO RISCO NR-1 (Base 0-10)
      // Regra Inversa: 
      // Score <= 4.0 (Risco Alto) -> Risk % >= 60%
      // Score 8.1+ (Risco Mto Baixo) -> Risk % <= 19%
      let nr1Sum = 0;
      let nr1Count = 0;
      const nr1Attributes = INNERMETRIX_ATTRIBUTES;
      
      nr1Attributes.forEach(attr => {
          const val = getScoreFromMap(attr, scores);
          if (val !== undefined) {
              nr1Sum += val;
              nr1Count++;
          }
      });

      if (nr1Count > 0) {
          const avgNr1 = nr1Sum / nr1Count; // 0 a 10
          // Fórmula de Risco Inverso: (10 - Nota) * 10
          // Ex: Nota 3 -> (10-3)*10 = 70% Risco
          // Ex: Nota 9 -> (10-9)*10 = 10% Risco
          const riskNr1 = Math.max(0, Math.min(100, (10 - avgNr1) * 10));
          
          details.nr1_risk = riskNr1;
          details.sources_used.push('NR-1 (Innermetrix)');
          totalRiskSum += riskNr1;
          componentsCount++;
      }

      // 2. CÁLCULO RISCO PSA (Base 0-5)
      // Regra:
      // 0-1: Baixo Desempenho (Risco Extremo) -> Risk 80-100%
      // 4-5: Excelente (Risco Baixo) -> Risk 0-20%
      let psaSum = 0;
      let psaCount = 0;
      
      PSYCHOSOCIAL_SURVEY_DATA.dimensions.forEach(dim => {
          dim.questions.forEach((_, idx) => {
              const key = `${dim.id}-${idx}`;
              if (scores[key] !== undefined) {
                  psaSum += Number(scores[key]);
                  psaCount++;
              }
          });
      });

      if (psaCount > 0) {
          const avgPsa = psaSum / psaCount; // 0 a 5
          // Fórmula de Risco Inverso: (5 - Nota) * 20
          // Ex: Nota 1 -> (5-1)*20 = 80% Risco
          // Ex: Nota 4.5 -> (5-4.5)*20 = 10% Risco
          const riskPsa = Math.max(0, Math.min(100, (5 - avgPsa) * 20));
          
          details.psa_risk = riskPsa;
          details.sources_used.push('PSA (Pesquisa Psicossocial)');
          totalRiskSum += riskPsa;
          componentsCount++;
      }

      // 3. CONSOLIDAÇÃO
      const finalRisk = componentsCount > 0 ? Math.round(totalRiskSum / componentsCount) : 0;
      
      let level: CombinedRiskResult['level'] = 'Muito Baixo';
      let color = 'text-emerald-600';

      if (finalRisk >= 60) { // Equivalente a nota < 4.0 no NR1
          level = 'Crítico';
          color = 'text-red-600';
      } else if (finalRisk >= 40) { // Equivalente a nota < 6.0 no NR1
          level = 'Alto';
          color = 'text-orange-600';
      } else if (finalRisk >= 20) { // Equivalente a nota < 8.0 no NR1
          level = 'Moderado';
          color = 'text-amber-600';
      } else {
          level = 'Baixo'; // Equivalente a nota > 8.0
          color = 'text-emerald-600';
      }

      return {
          risk_percentage: finalRisk,
          level,
          color,
          details
      };
  },

  calculateScientificRisk: (
    candidateScores: any,
    benchmarkScores: any,
    averageFit: number = 70
  ): RiskResult => {
    let S = 0;
    const criticalGaps: string[] = [];
    
    const getWeight = (attr: string): number => {
        const n = aggressiveNormalize(attr);
        if (n.includes('pratico') || n.includes('direcao') || n.includes('funcao')) return 3;
        return 2;
    };

    const fitModulator = (100 - (averageFit || 70)) / 50; 
    S += fitModulator;

    const attributes = INNERMETRIX_ATTRIBUTES;

    for (const attribute of attributes) {
      const ideal = getScoreFromMap(attribute, benchmarkScores) ?? 5.0;
      const real = getScoreFromMap(attribute, candidateScores) ?? 0;

      if (real < ideal && ideal > 0) {
        const gap_d = (ideal - real) / ideal;
        const weight_d = getWeight(attribute);
        S += (gap_d * weight_d);

        if (gap_d >= 0.40) {
            criticalGaps.push(attribute);
        }
      }
    }

    const lambda = 0.35;
    const riskIndex = 1 - Math.exp(-(lambda * S));
    const riskScore = Math.round(riskIndex * 100);

    let label = 'BAIXO';
    let color = 'text-emerald-600 bg-emerald-50 border-emerald-100';

    if (riskScore >= 60) {
        label = 'CRÍTICO';
        color = 'text-red-600 bg-red-50 border-red-200';
    } else if (riskScore >= 30) {
        label = 'MODERADO';
        color = 'text-amber-600 bg-amber-50 border-amber-200';
    }

    return { score: riskScore, label, color, criticalGaps };
  },

  calculatePsychosocialRisks: (scores: any): PsychosocialAnalysisResult => {
      const risks: PsychosocialRiskType[] = [];
      
      const func = getScoreFromMap('Consciência de Função', scores) ?? 0;
      const autoEstima = getScoreFromMap('Autoestima', scores) ?? 0;
      const pratico = getScoreFromMap('Pensamento Prático', scores) ?? 0;
      const autoDirecao = getScoreFromMap('Auto-Direção', scores) ?? 0;
      const empatia = getScoreFromMap('Empatia', scores) ?? 0;
      const sistemas = getScoreFromMap('Pensamento Sistêmico', scores) ?? 0;

      if (func > 8.0 && autoEstima < 4.0 && pratico < 4.5) risks.push('Burnout');
      if (autoEstima < 4.0 && autoDirecao < 4.0) risks.push('Assedio_Vitima');
      if (autoDirecao > 8.0 && empatia < 3.5) risks.push('Assedio_Agressor');
      if (pratico < 4.0 && sistemas > 8.0) risks.push('Procrastinacao');
      if (sistemas < 3.5 && pratico > 8.0) risks.push('Decisao_Impulsiva');
      if (empatia < 4.0 && autoDirecao > 7.5) risks.push('Conflito');

      let riskLevel: 'Baixo' | 'Moderado' | 'Alto' = 'Baixo';
      if (risks.length >= 3 || risks.includes('Burnout')) riskLevel = 'Alto';
      else if (risks.length >= 1) riskLevel = 'Moderado';

      return { riskLevel, detectedRisks: risks };
  }
};
