
import { GoogleGenAI, Type } from "https://esm.sh/@google/genai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(options: any, handler: (req: Request) => Promise<Response>): void;
};

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    overall_summary: { type: Type.STRING },
    psychosocial_risk_level: { type: Type.STRING },
    dimensional_balance: {
      type: Type.OBJECT,
      properties: {
        empathy: { type: Type.NUMBER },
        practical_thinking: { type: Type.NUMBER },
        systems_judgment: { type: Type.NUMBER },
        self_esteem_self_control: { type: Type.NUMBER },
        functional_awareness: { type: Type.NUMBER },
        self_direction: { type: Type.NUMBER },
      },
      required: ["empathy", "practical_thinking", "systems_judgment", "self_esteem_self_control", "functional_awareness", "self_direction"]
    },
    attribute_index: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING },
          component: { type: Type.STRING },
          score: { type: Type.NUMBER },
          score_description: { type: Type.STRING },
          analysis: { type: Type.STRING },
        },
        required: ["category", "component", "score", "score_description", "analysis"]
      }
    },
    main_attributes_list: {
      type: Type.ARRAY,
      description: "Lista completa de todos os atributos encontrados na seção 'Lista de Atributos Principais' ou 'Attribute Index'. Deve conter TODOS os ~78 itens.",
      items: {
        type: Type.OBJECT,
        properties: {
          attribute: { type: Type.STRING },
          score: { type: Type.NUMBER },
        },
        required: ["attribute", "score"]
      }
    }
  },
  required: ["overall_summary", "psychosocial_risk_level", "dimensional_balance", "attribute_index", "main_attributes_list"]
};

function calculateFitScoreInternal(balance: any, index: any[]): number {
    try {
        if (!balance || !index || !Array.isArray(index)) return 0;
        const dimensions = Object.values(balance).filter((v) => typeof v === 'number') as number[];
        if (dimensions.length === 0) return 0;
        const avgDimensions = dimensions.reduce((a, b) => a + b, 0) / dimensions.length;
        const criticalCount = index.filter((i: any) => i.score < 4).length;
        const strongCount = index.filter((i: any) => i.score >= 7).length;
        let fit = (avgDimensions * 10) + (strongCount * 0.5) - (criticalCount * 2);
        return Math.max(0, Math.min(100, Math.round(fit)));
    } catch (e) {
        console.error("Erro no cálculo interno do Fit Score", e);
        return 0;
    }
}

const PORT = Number(Deno.env.get("PORT")) || 8080;

Deno.serve({ port: PORT }, async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { extracted_text, ai_prompt } = await req.json();

    if (!extracted_text || extracted_text.trim().length < 100) {
      throw new Error("Texto extraído inválido ou vazio.");
    }
    
    const apiKey = Deno.env.get("API_KEY") || "AIzaSyDW_RAzs9nFPAjKDvH4w9Bq9sk6KgWWtaQ";
    const ai = new GoogleGenAI({ apiKey: apiKey });
    
    const systemPrompt = `
      ${ai_prompt || "Você é um especialista em análise Innermetrix."}
      
      INSTRUÇÃO CRÍTICA PARA 'main_attributes_list':
      Você DEVE extrair TODOS os itens listados na seção "Lista de Atributos Principais" ou "Attribute Index List".
      Geralmente aparecem no formato: "Nome do Atributo (Score)". Exemplo: "Avaliar Pessoas (9.3)".
      NÃO RESUMA. Se houver 78 atributos no texto, retorne os 78 objetos no array 'main_attributes_list'.
      
      Para 'attribute_index', foque nas categorias principais detalhadas (com análise de texto).
      Para 'dimensional_balance', extraia os 6 scores axiais principais.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        role: 'user',
        parts: [
            { text: `CONTEXTO DO CANDIDATO:\n\n${extracted_text}` },
            { text: "Analise o texto e gere o JSON conforme schema, garantindo a extração COMPLETA da lista de atributos principais." }
        ]
      },
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.0, 
      }
    });

    const aiData = JSON.parse(response.text || "{}");
    const calculatedScore = calculateFitScoreInternal(aiData.dimensional_balance, aiData.attribute_index);
    aiData.fit_score = calculatedScore;

    return new Response(JSON.stringify(aiData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error: any) {
    console.error("Erro na Edge Function:", error);
    return new Response(JSON.stringify({ 
        error: "Falha na análise de IA", 
        message: error.message || JSON.stringify(error)
    }), {
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
