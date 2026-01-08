
import { supabase } from '../supabaseClient';
import { GoogleGenAI, Type } from "@google/genai";

// Initialize Gemini Client with provided key
const ai = new GoogleGenAI({ apiKey: 'AIzaSyDW_RAzs9nFPAjKDvH4w9Bq9sk6KgWWtaQ' });

// --- Interface Definitions ---

export interface CompetencyAnalysis {
  name: string;
  classification: 'Forte' | 'Adequado' | 'Em desenvolvimento';
  explanation: string;
}

export interface InnermetrixAnalysis {
  executiveSummary: string;
  management_summary?: string; 
  strengths: string[];
  risks: string[];
  recommendations: {
    development: string[];
    application?: string[];
  };
  contextual_analysis?: {
      teamwork: string;
      leadership: string;
      adaptability: string;
  };
  hiring_questions?: string[];
  psychosocial_risk_level?: string;
  interactive_attributes?: any[]; 
  cargo?: string; // Campo vital para o contexto
}

export interface InnermetrixReport {
  person: {
    name: string;
    cargo: string;
    empresa: string;
    email?: string;
  };
  // Identificadores
  report_key?: string;
  vo_number?: string;
  
  analysis: InnermetrixAnalysis;
  competencies: Record<string, number>;
  dimensions: Record<string, number>;
  fitScore?: number;
  // Campos avançados mapeados
  dimensional_balance?: any;
  attribute_index?: any[];
  main_attributes_list?: any[];
  disc?: any;
  values_index?: any;
}

const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const normalizeScores = (rawScores: Record<string, number>): Record<string, number> => {
    const normalized: Record<string, number> = {};
    const keyMap: Record<string, string> = {
        'empatia': 'Empatia', 'empathy': 'Empatia', 'social': 'Empatia',
        'pensamento prático': 'Pensamento Prático', 'prático': 'Pensamento Prático', 'practical thinking': 'Pensamento Prático', 'resultados': 'Pensamento Prático',
        'julgamento de sistemas': 'Pensamento Sistêmico', 'sistêmico': 'Pensamento Sistêmico', 'systems judgment': 'Pensamento Sistêmico', 'teórico': 'Pensamento Sistêmico', 'pensamento sistêmico': 'Pensamento Sistêmico',
        'autoestima': 'Autoestima', 'auto estima': 'Autoestima', 'self esteem': 'Autoestima', 'valor próprio': 'Autoestima',
        'consciência de função': 'Consciência de Função', 'função': 'Consciência de Função', 'role awareness': 'Consciência de Função', 'papel social': 'Consciência de Função',
        'auto-direção': 'Auto-Direção', 'autodirecao': 'Auto-Direção', 'auto direção': 'Auto-Direção', 'self direction': 'Auto-Direção', 'direção futura': 'Auto-Direção'
    };

    Object.entries(rawScores).forEach(([key, val]) => {
        const lowerKey = key.toLowerCase().trim();
        const matchedKey = Object.keys(keyMap).find(k => lowerKey.includes(k));
        if (matchedKey) normalized[keyMap[matchedKey]] = val;
        else normalized[key] = val;
    });
    return normalized;
};

const extractDataWithGemini = async (input: File | string, candidateNameHint?: string): Promise<InnermetrixReport> => {
  let parts: any[] = [];
  if (typeof input === 'string') parts = [{ text: `Analise este conteúdo: \n\n ${input.substring(0, 50000)}` }];
  else if (input instanceof File) {
     const base64Data = await fileToGenerativePart(input);
     parts = [{ inlineData: { mimeType: input.type, data: base64Data } }];
  }

  const systemInstruction = `
Você é um analista sênior de RH especialista em Innermetrix.

EXTRAÇÃO OBRIGATÓRIA DE DADOS NUMÉRICOS:
1. Identifique o 'Dimensional Balance' (Equilíbrio Dimensional) - 6 notas de 0 a 10.
   - External: Empathy, Practical Thinking, Systems Judgment
   - Internal: Self Esteem, Role Awareness, Self Direction
2. Identifique o DISC - 4 notas de 0 a 100.
3. Identifique o Values Index (Valores) - 7 notas de 0 a 10.

SE O ARQUIVO FOR UM PDF:
- Procure por tabelas ou gráficos de barras contendo números.
- Os valores do Dimensional Balance geralmente estão na página 3 ou 4.
- Os valores do DISC estão na seção "Estilo Comportamental".
- Os valores de Values estão na seção "Motivadores".

Retorne JSON estrito. Se um valor não for encontrado, tente estimar pelo contexto visual (gráfico) ou use 5.0 (neutro) apenas em último caso.
  `;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      person: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          cargo: { type: Type.STRING },
          empresa: { type: Type.STRING },
          email: { type: Type.STRING }
        },
        required: ["name", "cargo"]
      },
      identifiers: {
        type: Type.OBJECT,
        properties: {
            report_key: { type: Type.STRING },
            vo_number: { type: Type.STRING }
        }
      },
      fit_score: { type: Type.NUMBER },
      competencies: { type: Type.OBJECT },
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
      disc: {
          type: Type.OBJECT,
          properties: {
            D: { type: Type.NUMBER },
            I: { type: Type.NUMBER },
            S: { type: Type.NUMBER },
            C: { type: Type.NUMBER },
          }
      },
      values_index: {
          type: Type.OBJECT,
          properties: {
            aesthetic: { type: Type.NUMBER },
            economic: { type: Type.NUMBER },
            individualistic: { type: Type.NUMBER },
            political: { type: Type.NUMBER },
            altruistic: { type: Type.NUMBER },
            regulatory: { type: Type.NUMBER },
            theoretical: { type: Type.NUMBER },
          }
      },
      analysis: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          cargo: { type: Type.STRING },
          strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
          risks: { type: Type.ARRAY, items: { type: Type.STRING } },
          recommendations: { type: Type.OBJECT },
          psychosocial_risk_level: { type: Type.STRING }
        }
      }
    },
    required: ["person", "competencies", "dimensional_balance", "disc", "values_index", "analysis", "fit_score"]
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        role: 'user',
        parts: [...parts, { text: 'Realize a extração numérica precisa. Para "dimensional_balance", use os valores exatos (ex: 7.4, 8.2). Para DISC, use valores inteiros (0-100).' }]
      },
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.0,
      }
    });

    const data = JSON.parse(response.text || "{}");
    const normalizedScores = normalizeScores(data.competencies || {});
    
    // Ensure dimensional_balance is populated, even if from flat scores
    let dimBalance = data.dimensional_balance;
    if (!dimBalance || Object.keys(dimBalance).length === 0) {
        dimBalance = {
            empathy: normalizedScores['Empatia'] || 5,
            practical_thinking: normalizedScores['Pensamento Prático'] || 5,
            systems_judgment: normalizedScores['Pensamento Sistêmico'] || 5,
            self_esteem_self_control: normalizedScores['Autoestima'] || 5,
            functional_awareness: normalizedScores['Consciência de Função'] || 5,
            self_direction: normalizedScores['Auto-Direção'] || 5
        };
    }

    return {
        person: data.person,
        report_key: data.identifiers?.report_key,
        vo_number: data.identifiers?.vo_number,
        fitScore: data.fit_score || 0,
        competencies: normalizedScores, 
        dimensions: normalizedScores,
        dimensional_balance: dimBalance,
        disc: data.disc,
        values_index: data.values_index,
        analysis: {
            ...data.analysis,
            executiveSummary: data.analysis.summary,
            cargo: data.analysis.cargo || data.person.cargo
        } as any
    };
  } catch (error) {
    console.error("Gemini Extraction Error:", error);
    throw new Error("Falha na análise. Verifique se o arquivo é um relatório Innermetrix válido.");
  }
};

export const candidateImportService = {
  getWebhookConfig: (tenantId: string) => ({
      url: `https://nxccuamwkcqcpghlvirj.supabase.co/functions/v1/ingest-candidate`,
      email: `ingest+${tenantId}@pessoacerta.idealhub.com.br`,
      token: `sk_live_${tenantId.substring(0,8)}...`
  }),
  processManualUpload: async (file: File, tenantId: string, roleId?: string): Promise<{ success: boolean; error?: string; data?: any }> => {
    try {
      const extractedData = await extractDataWithGemini(file, file.name.replace('.pdf', ''));
      
      // Upload do PDF para o Storage
      const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
      const filePath = `manual_uploads/${tenantId}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('reports')
        .upload(filePath, file);

      if (uploadError) console.warn("Falha ao salvar arquivo PDF no storage, mas prosseguindo com dados:", uploadError);
      
      const { data: { publicUrl } } = supabase.storage.from('reports').getPublicUrl(filePath);

      // PAYLOAD PARA REPORTS_ADV (Tabela Nova)
      const payload = {
        tenant_id: tenantId,
        job_role_id: roleId || null,
        full_name: extractedData.person.name,
        email: extractedData.person.email || `temp_${Date.now()}@placeholder.com`,
        status: 'completed',
        fit_score: extractedData.fitScore || 0,
        
        // Identificadores
        report_key: extractedData.report_key,
        vo_number: extractedData.vo_number,

        // Mapeamento para a nova estrutura ADV
        dimensional_balance: extractedData.dimensional_balance,
        disc: extractedData.disc,
        values_index: extractedData.values_index,
        
        // Fallback robusto para scores
        scores: { ...extractedData.competencies, ...extractedData.dimensional_balance }, 
        
        overall_summary: extractedData.analysis.executiveSummary,
        psychosocial_risk_level: extractedData.analysis.psychosocial_risk_level,
        
        // Domínio Psicométrico
        domain: 'psychometric',
        report_type: 'adv',

        metadata: {
            person: extractedData.person, 
            analysis: extractedData.analysis, 
            imported_at: new Date().toISOString(),
            source: 'manual_upload'
        },
        pdf_url: publicUrl,
        updated_at: new Date()
      };

      // Insere na tabela nova
      const { data, error } = await supabase.from('reports_adv').insert(payload).select().single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },
  processUrlUpload: async (url: string, candidateName: string, tenantId: string, roleId?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const extractedData = await extractDataWithGemini(`Relatório em: ${url}`, candidateName);
      
      const payload = {
        tenant_id: tenantId,
        job_role_id: roleId || null,
        full_name: candidateName || extractedData.person.name,
        email: extractedData.person.email || `temp_url_${Date.now()}@placeholder.com`,
        status: 'completed',
        fit_score: extractedData.fitScore || 0,
        
        report_key: extractedData.report_key,
        vo_number: extractedData.vo_number,

        dimensional_balance: extractedData.dimensional_balance,
        disc: extractedData.disc,
        values_index: extractedData.values_index,

        scores: { ...extractedData.competencies, ...extractedData.dimensional_balance },
        overall_summary: extractedData.analysis.executiveSummary,
        
        domain: 'psychometric',
        report_type: 'adv',

        metadata: { 
            person: extractedData.person, 
            analysis: extractedData.analysis, 
            source: 'url_import' 
        },
        pdf_url: url,
        updated_at: new Date()
      };

      const { error } = await supabase.from('reports_adv').insert(payload);
      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
};
