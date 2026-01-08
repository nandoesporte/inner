
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: 'AIzaSyDW_RAzs9nFPAjKDvH4w9Bq9sk6KgWWtaQ' });

const RECRUITMENT_SYSTEM_PROMPT = `
Você é o COPILOT DE RECRUTAMENTO E SELEÇÃO de uma plataforma corporativa de RH e People Analytics (Pessoa Certa).

Sua missão é gerar conteúdos de alta qualidade para processos seletivos baseando-se estritamente nos dados fornecidos.

DIRETRIZES TÉCNICAS:
- Use linguagem profissional, inclusiva e empática.
- Nunca invente benefícios ou salários se não forem informados.
- Se um requisito não estiver claro, trate-o como "a validar durante o processo".
- Siga rigorosamente o schema JSON solicitado.
`;

export type RecruitmentTask = 'job_posting' | 'job_summary_short' | 'behavioral_alignment' | 'screening_questions' | 'interview_script' | 'resume_screening';

export interface RecruitmentPayload {
  task: RecruitmentTask;
  job_info: {
    title: string;
    area: string;
    seniority: string;
    work_model: string;
    location: string;
    company_context?: string;
  };
  requirements: string[];
  behavioral_profile?: string;
  resume_text?: string;
}

export const recruitmentService = {
  async generateContent(payload: RecruitmentPayload): Promise<any> {
    let responseSchema;
    let specificInstruction = "";
    let selectedModel = 'gemini-3-flash-preview'; // Padrão para tarefas simples

    switch (payload.task) {
        case 'job_posting':
            responseSchema = {
                type: Type.OBJECT,
                properties: {
                    job_title: { type: Type.STRING },
                    job_summary: { type: Type.STRING },
                    responsibilities: { type: Type.ARRAY, items: { type: Type.STRING } },
                    requirements: { type: Type.ARRAY, items: { type: Type.STRING } },
                    behavioral_profile: { type: Type.STRING },
                    work_model: { type: Type.STRING },
                    location: { type: Type.STRING },
                    application_process: { type: Type.STRING }
                },
                required: ["job_title", "job_summary", "responsibilities", "requirements", "behavioral_profile", "work_model", "location", "application_process"]
            };
            break;
        case 'job_summary_short':
            responseSchema = {
                type: Type.OBJECT,
                properties: {
                    headline: { type: Type.STRING },
                    short_description: { type: Type.STRING },
                    cta: { type: Type.STRING }
                },
                required: ["headline", "short_description", "cta"]
            };
            break;
        case 'behavioral_alignment':
            responseSchema = {
                type: Type.OBJECT,
                properties: {
                    ideal_profile_description: { type: Type.STRING },
                    key_behavioral_traits: { type: Type.ARRAY, items: { type: Type.STRING } },
                    work_style_expectations: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["ideal_profile_description", "key_behavioral_traits", "work_style_expectations"]
            };
            break;
        case 'screening_questions':
            responseSchema = {
                type: Type.OBJECT,
                properties: {
                    questions: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                question: { type: Type.STRING },
                                type: { type: Type.STRING, enum: ["multiple_choice", "open_text"] },
                                purpose: { type: Type.STRING }
                            },
                            required: ["question", "type", "purpose"]
                        }
                    }
                },
                required: ["questions"]
            };
            break;
        case 'interview_script':
            selectedModel = 'gemini-3-pro-preview'; // Tarefa mais complexa de raciocínio
            responseSchema = {
                type: Type.OBJECT,
                properties: {
                    interview_script: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                topic: { type: Type.STRING },
                                questions: { type: Type.ARRAY, items: { type: Type.STRING } }
                            },
                            required: ["topic", "questions"]
                        }
                    }
                },
                required: ["interview_script"]
            };
            break;
        case 'resume_screening':
            selectedModel = 'gemini-3-pro-preview'; // Tarefa complexa de análise cruzada
            specificInstruction = `
            Execute a tarefa 'resume_screening'. 
            Analise o currículo fornecido contra os requisitos da vaga.
            Atribua scores reais baseados em evidências. 
            Se não houver dados comportamentais do candidato, o 'behavioral_match.score' deve ser null.
            `;
            responseSchema = {
                type: Type.OBJECT,
                properties: {
                    candidate_overview: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            email: { type: Type.STRING },
                            current_role: { type: Type.STRING },
                            experience_summary: { type: Type.STRING }
                        },
                        required: ["name", "email", "current_role", "experience_summary"]
                    },
                    technical_match: {
                        type: Type.OBJECT,
                        properties: {
                            score: { type: Type.NUMBER },
                            analysis: { type: Type.STRING },
                            matched_requirements: { type: Type.ARRAY, items: { type: Type.STRING } },
                            missing_requirements: { type: Type.ARRAY, items: { type: Type.STRING } }
                        },
                        required: ["score", "analysis", "matched_requirements", "missing_requirements"]
                    },
                    behavioral_match: {
                        type: Type.OBJECT,
                        properties: {
                            score: { type: Type.NUMBER, nullable: true },
                            analysis: { type: Type.STRING },
                            alignment_points: { type: Type.ARRAY, items: { type: Type.STRING } },
                            attention_points: { type: Type.ARRAY, items: { type: Type.STRING } }
                        },
                        required: ["analysis", "alignment_points", "attention_points"]
                    },
                    overall_fit: {
                        type: Type.OBJECT,
                        properties: {
                            classification: { type: Type.STRING, enum: ["Alto", "Médio", "Baixo"] },
                            justification: { type: Type.STRING }
                        },
                        required: ["classification", "justification"]
                    },
                    recommendation: {
                        type: Type.OBJECT,
                        properties: {
                            next_step: { type: Type.STRING, enum: ["Avançar para entrevista", "Manter em banco", "Não avançar"] },
                            confidence_level: { type: Type.NUMBER },
                            notes_for_recruiter: { type: Type.STRING }
                        },
                        required: ["next_step", "confidence_level", "notes_for_recruiter"]
                    }
                },
                required: ["candidate_overview", "technical_match", "behavioral_match", "overall_fit", "recommendation"]
            };
            break;
        default:
            throw new Error("Task not supported");
    }

    try {
      const response = await ai.models.generateContent({
        model: selectedModel,
        contents: {
          parts: [{ text: JSON.stringify(payload) }]
        },
        config: {
          systemInstruction: RECRUITMENT_SYSTEM_PROMPT + specificInstruction,
          responseMimeType: "application/json",
          responseSchema: responseSchema,
          temperature: payload.task === 'resume_screening' ? 0.1 : 0.3,
        }
      });

      return JSON.parse(response.text || "{}");
    } catch (error) {
      console.error("Recruitment Copilot Error:", error);
      throw new Error("Falha na comunicação com o Copilot.");
    }
  }
};
