
import { GoogleGenAI, Type } from "@google/genai";
import { CandidateReport, CandidateResume, ComparisonItem } from "../types";

const ai = new GoogleGenAI({ apiKey: 'AIzaSyDW_RAzs9nFPAjKDvH4w9Bq9sk6KgWWtaQ' });

const COPILOT_SYSTEM_PROMPT = `
Você é o MOTOR DE SÍNTESE ESTRATÉGICA da plataforma Pessoa Certa Analytics.
Sua missão é realizar a "Triangulação de Contratação".

VOCÊ RECEBERÁ UM "FIT SCORE" CALCULADO E UMA LISTA DE "GAPS" (Comparação Candidato x Vaga).
REGRA DE OURO (COERÊNCIA):
1. Se o 'fit_score' for ALTO (> 75), sua síntese DEVE ser majoritariamente POSITIVA. Não invente riscos se a matemática diz que há aderência.
2. Se o 'fit_score' for BAIXO (< 60), explique o porquê baseando-se nos GAPS CRÍTICOS fornecidos.
3. Se um atributo do candidato for baixo (ex: 2.0), mas o 'status' no gap for 'aligned' (porque a vaga exige baixo), ISSO É UM PONTO FORTE, não um risco.

FONTES DE ENTRADA:
1. ARQUIVO PDF (Obrigatório): Extraia senioridade e hard skills.
2. DNA COMPORTAMENTAL & GAPS: Use a lista de 'comparison_gaps' para saber se o perfil atende ao cargo.
3. FIT SCORE: O veredito matemático que guia seu tom.

DIRETRIZES DE ANÁLISE:
- Gere o campo 'three_pillar_synthesis' com 3 parágrafos:
  * P1: Match Comportamental (Analise os Gaps: Onde ele atende? Onde excede?).
  * P2: Validação Técnica (Baseado no PDF vs Cargo).
  * P3: Recomendação Final (Coerente com o Fit Score: Contratar, Desenvolver ou Risco).

Seja executivo, direto e coerente com os números.
`;

export interface PredictiveInsightResult {
  risk_level: "Baixo" | "Médio" | "Alto";
  signals: Array<{
    signal: string;
    based_on: string;
  }>;
  recommendations: string[];
  three_pillar_synthesis: string; 
}

export const copilotService = {
  async generatePredictiveInsights(
    report: CandidateReport, 
    resume?: CandidateResume | null, 
    jobTitle?: string,
    pdfBase64?: string,
    comparisonItems?: ComparisonItem[] // Novo parâmetro para contexto de gaps
  ): Promise<PredictiveInsightResult> {
    
    // Prepara resumo dos Gaps para a IA entender o contexto relativo
    const gapsContext = comparisonItems?.map(i => ({
        attribute: i.label,
        candidate_score: i.candidate_score,
        target_score: i.benchmark_score,
        status: i.status, // 'aligned', 'critical', 'moderate'
        interpretation: i.status === 'aligned' ? 'Adequado ao cargo' : i.delta < 0 ? 'Abaixo do exigido' : 'Acima do exigido'
    })) || [];

    const userPayload = {
        task: "deep_triangulation_with_gaps",
        job_role: jobTitle || report.role || "Geral",
        calculated_fit_score: report.fit_score || 0,
        
        // Dados fundamentais
        candidate_dna: {
            attributes: report.attribute_index || report.metadata?.analysis?.attribute_index || [],
            scores: report.scores || report.metadata?.scores || {}
        },
        
        // O contexto mais importante: A comparação relativa
        comparison_gaps: gapsContext,

        context_data: resume ? {
            summary: resume.professional_summary,
            experience: resume.experience
        } : null
    };

    const parts: any[] = [{ text: JSON.stringify(userPayload) }];

    if (pdfBase64) {
        parts.push({
            inlineData: {
                mimeType: "application/pdf",
                data: pdfBase64
            }
        });
    }

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        risk_level: { type: Type.STRING, enum: ["Baixo", "Médio", "Alto"] },
        three_pillar_synthesis: { 
            type: Type.STRING, 
            description: "Análise coerente com o Fit Score e Gaps identificados." 
        },
        signals: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              signal: { type: Type.STRING },
              based_on: { type: Type.STRING, description: "PDF, DNA ou Gaps" }
            },
            required: ["signal", "based_on"]
          }
        },
        recommendations: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      },
      required: ["risk_level", "signals", "recommendations", "three_pillar_synthesis"]
    };

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: {
          parts: parts
        },
        config: {
          systemInstruction: COPILOT_SYSTEM_PROMPT,
          responseMimeType: "application/json",
          responseSchema: responseSchema,
          temperature: 0.1, // Baixa temperatura para seguir a lógica matemática
        }
      });

      return JSON.parse(response.text || "{}") as PredictiveInsightResult;

    } catch (error) {
      console.error("AI Triangulation Error:", error);
      throw new Error("Falha na análise tridimensional do perfil.");
    }
  }
};
