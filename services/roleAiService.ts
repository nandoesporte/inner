
import { GoogleGenAI, Type } from "@google/genai";

// Inicializa o cliente Gemini com a chave fornecida
const ai = new GoogleGenAI({ apiKey: 'AIzaSyDW_RAzs9nFPAjKDvH4w9Bq9sk6KgWWtaQ' });

export const roleAiService = {
  /**
   * Gera benchmarks comportamentais (0-10) para um cargo específico usando IA.
   * @param roleTitle O título do cargo (ex: "Gerente de Vendas")
   * @param attributes Lista de atributos disponíveis no sistema (ex: ['Empatia', 'Auto-Direção'])
   */
  suggestBenchmarks: async (roleTitle: string, attributes: string[]): Promise<Record<string, number>> => {
    
    // Schema de resposta estrito para garantir que a IA retorne apenas números válidos
    const responseSchema = {
      type: Type.OBJECT,
      properties: attributes.reduce((acc, attr) => {
        acc[attr] = { type: Type.NUMBER, description: `Score de 0.0 a 10.0 para ${attr}` };
        return acc;
      }, {} as Record<string, any>),
      required: attributes
    };

    const prompt = `
      Atue como um especialista sênior em Recursos Humanos, Psicologia Organizacional e metodologia Innermetrix.
      
      Tarefa: Definir o "Job Benchmark" (Perfil Ideal) para o cargo: "${roleTitle}".
      
      Para cada um dos atributos listados abaixo, defina uma pontuação ideal de 0.0 a 10.0 que represente o nível de exigência dessa competência para alta performance neste cargo específico.
      
      Atributos: ${attributes.join(', ')}.
      
      Use lógica de negócios real. Exemplo: Um cargo de 'Vendas' deve ter alto 'Pensamento Prático' e 'Auto-Direção'. Um cargo de 'Enfermagem' deve ter alta 'Empatia'.
    `;

    try {
      /* Update model name to gemini-3-flash-preview as per guidelines */
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [{ text: prompt }]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: responseSchema,
          temperature: 0.3 // Baixa temperatura para respostas mais consistentes e profissionais
        }
      });

      const jsonResponse = JSON.parse(response.text || "{}");
      return jsonResponse;

    } catch (error) {
      console.error("Erro ao gerar benchmarks com IA:", error);
      // Em caso de erro, retorna objeto vazio para tratamento no frontend
      return {};
    }
  }
};
