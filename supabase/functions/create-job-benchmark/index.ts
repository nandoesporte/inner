import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleGenAI, Type } from "https://esm.sh/@google/genai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (req: Request) => Promise<Response>): void;
};

const COGNITIVE_WEIGHTS = {
  pensamento_pratico: 1.0,
  julgamento_sistemas: 1.0,
  empatia: 0.8,
  autodirecao: 0.9,
  consciencia_funcao: 1.1,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !GEMINI_API_KEY) {
      throw new Error(
        "ENV ausente: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY ou GEMINI_API_KEY"
      );
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    let body: any;
    try {
      body = await req.json();
    } catch {
      throw new Error("Body inválido. Esperado JSON.");
    }

    const { company_id, job_title, job_description } = body;

    if (!company_id || !job_title) {
      throw new Error("Parâmetros obrigatórios: company_id, job_title");
    }

    const systemInstruction = `
Você é um especialista em Axiologia Formal (Robert S. Hartman) e Engenharia de Cargos.

Sua tarefa é criar um BENCHMARK DE CARGO (job benchmark),
não um perfil de pessoa.

Analise apenas a estrutura de decisão exigida pela função,
não personalidade, não comportamento individual.
`;

    const userPrompt = `
Cargo: ${job_title}

Descrição:
${job_description || "Descrição padrão de mercado para esta função."}

Gere a estrutura decisória ideal para alta performance neste cargo.
`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        decisions: {
          type: Type.OBJECT,
          properties: {
            people_focus: { type: Type.INTEGER },
            task_focus: { type: Type.INTEGER },
            system_focus: { type: Type.INTEGER },
            self_direction: { type: Type.INTEGER },
            role_clarity: { type: Type.INTEGER },
          },
          required: [
            "people_focus",
            "task_focus",
            "system_focus",
            "self_direction",
            "role_clarity",
          ],
        },
        values: {
          type: Type.OBJECT,
          properties: {
            senso_missao: { type: Type.STRING, enum: ["baixo", "medio", "alto"] },
            status_reconhecimento: {
              type: Type.STRING,
              enum: ["baixo", "medio", "alto"],
            },
            recompensa_material: {
              type: Type.STRING,
              enum: ["baixo", "medio", "alto"],
            },
            pertencimento: { type: Type.STRING, enum: ["baixo", "medio", "alto"] },
            autoaperfeicoamento: {
              type: Type.STRING,
              enum: ["baixo", "medio", "alto"],
            },
          },
          required: [
            "senso_missao",
            "status_reconhecimento",
            "recompensa_material",
            "pertencimento",
            "autoaperfeicoamento",
          ],
        },
        disc_hint: {
          type: Type.OBJECT,
          properties: {
            D: { type: Type.INTEGER },
            I: { type: Type.INTEGER },
            S: { type: Type.INTEGER },
            C: { type: Type.INTEGER },
          },
          required: ["D", "I", "S", "C"],
        },
      },
      required: ["decisions", "values", "disc_hint"],
    };

    // Use gemini-3-flash-preview per guidelines
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          role: "user",
          parts: [{ text: userPrompt }],
        },
      ],
      config: {
        systemInstruction,
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema,
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("Resposta vazia da IA");
    }

    const aiResponse = JSON.parse(text);

    const range = (value: number, weight: number): [number, number] => {
      const tolerance = 10 / weight;
      return [
        Math.max(0, Math.round(value - tolerance)),
        Math.min(100, Math.round(value + tolerance)),
      ];
    };

    const attribute_ranges = {
      empatia: range(aiResponse.decisions.people_focus, COGNITIVE_WEIGHTS.empatia),
      pensamento_pratico: range(
        aiResponse.decisions.task_focus,
        COGNITIVE_WEIGHTS.pensamento_pratico
      ),
      julgamento_sistemas: range(
        aiResponse.decisions.system_focus,
        COGNITIVE_WEIGHTS.julgamento_sistemas
      ),
      autodirecao: range(
        aiResponse.decisions.self_direction,
        COGNITIVE_WEIGHTS.autodirecao
      ),
      consciencia_funcao: range(
        aiResponse.decisions.role_clarity,
        COGNITIVE_WEIGHTS.consciencia_funcao
      ),
    };

    try {
      await supabase.from("job_benchmarks").insert({
        company_id,
        job_title,
        decision_profile: aiResponse.decisions,
        attribute_ranges,
        value_preferences: aiResponse.values,
        disc_preferences: aiResponse.disc_hint,
        created_at: new Date().toISOString(),
      });
    } catch (dbErr) {
      console.warn("Aviso: erro ao salvar job_benchmarks", dbErr);
    }

    return new Response(
      JSON.stringify({
        job_title,
        attribute_ranges,
        value_preferences: aiResponse.values,
        disc_preferences: aiResponse.disc_hint,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (err: any) {
    console.error("Erro create-job-benchmark:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Erro desconhecido" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});