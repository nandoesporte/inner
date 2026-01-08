
// Helper to parse JSON if it comes as a string (common in Supabase)
export const safeJsonParse = (val: any) => {
    if (typeof val === 'string') {
        try {
            return JSON.parse(val);
        } catch (e) {
            console.warn("Failed to parse JSON field:", val);
            return null;
        }
    }
    return val;
};

export interface NormalizedReport {
    disc: { D: number; I: number; S: number; C: number };
    disc_full?: {
        natural?: any;
        adapted?: any;
        estilo_natural?: any;
        estilo_adaptado?: any;
        profile?: string;
        description?: string;
        [key: string]: any;
    };
    values: Record<string, {
        score: number;
        description?: string;
    }>;
    attributes: any[];
    scores: Record<string, number>;
    fit: number;
    rawDiscProfile?: any;
}

// Mapeia variações de português/inglês para chaves padrão internas
const canonicalizeValueKey = (rawKey: string): string => {
    if (!rawKey) return '';
    const k = rawKey.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    
    if (k.startsWith('estet') || k.startsWith('aesth')) return 'aesthetic';
    if (k.startsWith('econ')) return 'economic';
    if (k.startsWith('indiv')) return 'individualistic';
    if (k.startsWith('polit')) return 'political';
    if (k.startsWith('altru')) return 'altruistic';
    if (k.startsWith('regul')) return 'regulatory';
    if (k.startsWith('teor') || k.startsWith('theor')) return 'theoretical';
    
    return k; // Retorna original se não casar com padrões conhecidos
};

export function normalizeReport(raw: any): NormalizedReport | null {
    if (!raw) return null;

    const rawDisc = safeJsonParse(raw.disc || raw.disc_profile || raw.metadata?.disc || raw.metadata?.disc_profile);
    
    // Tratamento Robusto para Values: Tenta várias fontes e desembrulha wrappers
    let rawValues = safeJsonParse(raw.values_index || raw.values || raw.metadata?.values_index);
    if (rawValues && !Array.isArray(rawValues) && typeof rawValues === 'object') {
        // Se for um objeto contendo uma chave "values" ou "values_index" que é array, usa ela
        if (Array.isArray(rawValues.values)) rawValues = rawValues.values;
        else if (Array.isArray(rawValues.values_index)) rawValues = rawValues.values_index;
    }

    const rawAttributes = safeJsonParse(raw.attribute_index || raw.metadata?.attribute_index || raw.analysis?.attribute_index || []);
    
    // --- CORREÇÃO DE SCORES ZERADOS ---
    // Em vez de escolher UM campo, vamos fundir TODOS os possíveis campos de pontuação.
    // Isso resolve casos onde 'scores' está vazio {} mas 'dimensional_balance' tem dados.
    const combinedScores: Record<string, number> = {};

    const sources = [
        safeJsonParse(raw.scores),
        safeJsonParse(raw.dimensional_balance),
        safeJsonParse(raw.metadata?.dimensional_balance),
        safeJsonParse(raw.metadata?.scores),
        safeJsonParse(raw.competencies), // Legacy
        safeJsonParse(raw.metadata?.competencies),
        safeJsonParse(raw.metadata?.answers), // PSA Answers (NR1)
        safeJsonParse(raw.answers) // PSA Answers (Direct)
    ];

    sources.forEach(source => {
        if (source && typeof source === 'object' && !Array.isArray(source)) {
            Object.entries(source).forEach(([k, v]) => {
                const numVal = Number(v);
                if (!isNaN(numVal)) {
                    combinedScores[k] = numVal;
                }
            });
        }
    });

    // Fallback: Tenta extrair do array de attribute_index se ainda não tivermos scores
    if (Object.keys(combinedScores).length === 0 && Array.isArray(rawAttributes)) {
        rawAttributes.forEach((attr: any) => {
            if (attr.component && typeof attr.score === 'number') {
                combinedScores[attr.component] = attr.score;
            }
        });
    }
    
    // Normalize Fit Score
    const fit = typeof raw.fit_score === 'string' ? parseFloat(raw.fit_score) : (raw.fit_score || 0);

    // 1. DISC Normalization
    let disc = { D: 50, I: 50, S: 50, C: 50 }; // Default average
    
    if (rawDisc) {
        // Handle various structures (flat, nested natural, nested estilo_natural)
        const source = rawDisc.natural || rawDisc.estilo_natural || rawDisc;
        
        if (source && (source.D !== undefined || source.d !== undefined)) {
            disc = {
                D: Number(source.D ?? source.d ?? 50),
                I: Number(source.I ?? source.i ?? 50),
                S: Number(source.S ?? source.s ?? 50),
                C: Number(source.C ?? source.c ?? 50)
            };
        }
    }

    // 2. Values Normalization (Array -> Object Map with Canonical Keys)
    const valuesMap: NormalizedReport['values'] = {};

    if (Array.isArray(rawValues)) {
        // Case: [{value_name: "Estética", score: 36, description: "..."}, ...]
        rawValues.forEach((v: any) => {
            const rawKey = v.value_name || v.name || v.dimension || v.value; // v.value as key sometimes happens
            // Ensure rawKey is string
            if (typeof rawKey === 'string') {
                const key = canonicalizeValueKey(rawKey);
                if (key) {
                    valuesMap[key] = {
                        score: Number(v.score || v.val || v.value || 0), // v.value might be score if not key
                        description: v.description || null
                    };
                }
            }
        });
    } else if (typeof rawValues === 'object' && rawValues) {
        // Case: { "Estética": 36, ... } OR { "Estética": { score: 36 } }
        Object.entries(rawValues).forEach(([k, v]) => {
            const key = canonicalizeValueKey(k);
            if (typeof v === 'object' && v !== null) {
                 valuesMap[key] = {
                    score: Number((v as any).score || (v as any).value || 0),
                    description: (v as any).description || null
                 };
            } else {
                 valuesMap[key] = {
                    score: Number(v),
                    description: null
                 };
            }
        });
    }

    return {
        disc,
        disc_full: rawDisc,
        values: valuesMap,
        attributes: rawAttributes,
        scores: combinedScores, // Scores consolidados
        fit,
        rawDiscProfile: rawDisc 
    };
}
