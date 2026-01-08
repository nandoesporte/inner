import { GoogleGenAI, Type } from "https://esm.sh/@google/genai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (req: Request) => Promise<Response>): void;
};

/* ======================================================
   PARSERS DETERMINÍSTICOS (SEM IA / SEM INFERÊNCIA)
====================================================== */

/* -------- DISC -------- */
function extractDISCFromText(text: string) {
  if (!text) return null;

  const naturalMatch = text.match(
    /DISC\s+Natural.*?D[:=]\s*(\d{1,3}).*?I[:=]\s*(\d{1,3}).*?S[:=]\s*(\d{1,3}).*?C[:=]\s*(\d{1,3})/is
  );

  const adaptedMatch = text.match(
    /DISC\s+Adaptado.*?D[:=]\s*(\d{1,3}).*?I[:=]\s*(\d{1,3}).*?S[:=]\s*(\d{1,3}).*?C[:=]\s*(\d{1,3})/is
  );

  const parse = (m: RegExpMatchArray | null) =>
    m
      ? {
          D: Number(m[1]),
          I: Number(m[2]),
          S: Number(m[3]),
          C: Number(m[4]),
        }
      : null;

  const natural = parse(naturalMatch);
  const adapted = parse(adaptedMatch);

  if (!natural && !adapted) return null;

  const base = natural || adapted!;
  const profile = Object.entries(base)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([k]) => k)
    .join("");

  return {
    natural,
    adapted,
    profile,
    description: null,
  };
}

/* -------- VALUES -------- */
function extractValuesFromText(text: string) {
  if (!text) return [];

  const values = [
    "Econômico",
    "Teórico",
    "Político",
    "Altruísta",
    "Estético",
    "Individualista",
    "Regulador",
  ];

  const results: any[] = [];

  for (const v of values) {
    const regex = new RegExp(`${v}\\s*\\(\\s*(\\d{1,3})\\s*\\)`, "i");
    const match = text.match(regex);

    if (match) {
      results.push({
        value_name: v,
        score: Number(match[1]),
        description: null,
      });
    }
  }

  return results;
}

/* ======================================================
   RESPONSE SCHEMA — ADV
====================================================== */
const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    overall_summary: { type: Type.STRING },
    psychosocial_risk_level: { type: Type.STRING },
    report_key: { type: Type.STRING },
    vo_number: { type: Type.STRING },

    dimensional_balance: {
      type: Type.OBJECT,
      additionalProperties: false,
      properties: {
        empathy: { type: Type.NUMBER },
        practical_thinking: { type: Type.NUMBER },
        systems_judgment: { type: Type.NUMBER },
        self_esteem_self_control: { type: Type.NUMBER },
        functional_awareness: { type: Type.NUMBER },
        self_direction: { type: Type.NUMBER },
      },
    },

    values_index: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          value_name: { type: Type.STRING },
          score: { type: Type.NUMBER },
          description: { type: Type.STRING },
        },
      },
    },

    disc_profile: {
      type: Type.OBJECT,
      properties: {
        natural: { type: Type.OBJECT },
        adapted: { type: Type.OBJECT },
        profile: { type: Type.STRING },
        description: { type: Type.STRING },
      },
    },

    attribute_index: { type: Type.ARRAY },
    main_attributes_list: { type: Type.ARRAY },
  },
};

/* ======================================================
   EDGE FUNCTION — ANALYZE_ADV
====================================================== */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  try {
    const { extracted_text, ai_prompt } = await req.json();

    if (!extracted_text || extracted_text.length < 500) {
      throw new Error("Texto extraído inválido.");
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) throw new Error("GEMINI_API_KEY ausente.");

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: "user", parts: [{ text: extracted_text }] }],
      config: {
        systemInstruction: ai_prompt,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.1,
      },
    });

    const aiData = JSON.parse(response.text || "{}");

    /* ===== FALLBACKS DETERMINÍSTICOS ===== */
    if (!aiData.disc_profile) {
      aiData.disc_profile = extractDISCFromText(extracted_text);
    }

    if (!aiData.values_index || aiData.values_index.length === 0) {
      aiData.values_index = extractValuesFromText(extracted_text);
    }

    aiData.domain = "psychometric";
    aiData.report_type = "adv";

    return new Response(JSON.stringify(aiData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        error: "Falha na análise ADV",
        message: error.message,
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});
