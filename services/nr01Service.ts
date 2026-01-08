
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: 'AIzaSyDW_RAzs9nFPAjKDvH4w9Bq9sk6KgWWtaQ' });

export interface NR01Classification {
  psychosocial_risk_level: "Baixo" | "Médio" | "Alto";
  rule_applied: string;
  dimensions_below_threshold: string[];
}

export const nr01Service = {
  /**
   * Executa a classificação NR-01 baseada estritamente no Equilíbrio Dimensional.
   * Não realiza análise clínica ou de saúde mental.
   */
  classifyRisk: async (dimensionalBalance: any): Promise<NR01Classification> => {
    const systemInstruction = `
Você é um classificador organizacional para NR-01 / GRO / PGR.

IMPORTANTE:
- Esta análise NÃO é clínica.
- NÃO avalia saúde mental.
- NÃO cria diagnósticos.
- Atua apenas como indicador preventivo organizacional.

Classifique o risco psicossocial ocupacional APENAS com base nas regras numéricas fornecidas.
`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        psychosocial_risk_level: { type: Type.STRING, enum: ["Baixo", "Médio", "Alto"] },
        rule_applied: { type: Type.STRING },
        dimensions_below_threshold: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["psychosocial_risk_level", "rule_applied", "dimensions_below_threshold"]
    };

    const prompt = {
      dimensional_balance: dimensionalBalance,
      rules: {
        threshold: 6.0,
        low: "todas >= threshold",
        medium: "1 ou 2 < threshold",
        high: "3 ou mais < threshold"
      }
    };

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ text: JSON.stringify(prompt) }],
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema,
          temperature: 0.1
        }
      });

      return JSON.parse(response.text || "{}") as NR01Classification;
    } catch (error) {
      console.error("NR-01 Service Error:", error);
      // Fallback determinístico caso a API falhe
      return nr01Service.calculateFallback(dimensionalBalance);
    }
  },

  calculateFallback: (balance: any): NR01Classification => {
    const dims = [
      { key: 'empathy', label: 'Empatia' },
      { key: 'practical_thinking', label: 'Pensamento Prático' },
      { key: 'systems_judgment', label: 'Pensamento Sistêmico' },
      { key: 'self_esteem_self_control', label: 'Autoestima' },
      { key: 'functional_awareness', label: 'Consciência de Função' },
      { key: 'self_direction', label: 'Auto-Direção' }
    ];

    const below: string[] = [];
    dims.forEach(d => {
      const val = balance[d.key] || balance[d.label] || 0;
      if (val < 6.0) below.push(d.key);
    });

    let level: "Baixo" | "Médio" | "Alto" = "Baixo";
    if (below.length >= 3) level = "Alto";
    else if (below.length >= 1) level = "Médio";

    return {
      psychosocial_risk_level: level,
      rule_applied: "nr01_deterministic_fallback_v1",
      dimensions_below_threshold: below
    };
  }
};
