
import { KPI, RadarDataPoint, CandidateReport, BillingPlan, Company, ScatterDataPoint, RetentionDataPoint, PsychosocialSurveyData } from './types';
import { Users, FileText, Activity, Target, DollarSign, Building } from 'lucide-react';

// --- Atributos Oficiais Innermetrix ---
export const INNERMETRIX_ATTRIBUTES = [
  'Empatia',
  'Pensamento Prático',
  'Pensamento Sistêmico',
  'Autoestima',
  'Consciência de Função',
  'Auto-Direção'
];

// --- Benchmarks Pré-Definidos (Biblioteca Oficial Innermetrix) ---
// Ranges mantidos em escala 0-10 para consistência com literatura, convertidos na UI
export const PRESET_BENCHMARKS = [
  { 
    title: "Administrativos", 
    industry: "Geral", 
    scores: { "Empatia": 8.0, "Pensamento Prático": 7.0, "Pensamento Sistêmico": 7.0 },
    ranges: { "Empatia": [7.5, 8.5], "Pensamento Prático": [6.5, 7.5], "Pensamento Sistêmico": [6.5, 7.5] },
    disc: { D: 30, I: 45, S: 75, C: 80 }
  },
  { 
    title: "Agente de Compradores", 
    industry: "Imobiliária", 
    scores: { "Empatia": 7.5, "Pensamento Prático": 9.0, "Pensamento Sistêmico": 6.0 },
    ranges: { "Empatia": [7.0, 8.0], "Pensamento Prático": [8.5, 9.5], "Pensamento Sistêmico": [5.5, 6.5] },
    disc: { D: 65, I: 85, S: 50, C: 30 }
  },
  { 
    title: "Agente de Compradores (Hunter)", 
    industry: "Imobiliária", 
    scores: { "Empatia": 7.0, "Pensamento Prático": 6.5, "Pensamento Sistêmico": 8.5 },
    ranges: { "Empatia": [6.5, 7.5], "Pensamento Prático": [6.0, 7.0], "Pensamento Sistêmico": [8.0, 9.0] },
    disc: { D: 75, I: 82, S: 40, C: 30 }
  },
  { 
    title: "Agente de Listagem", 
    industry: "Imobiliária", 
    scores: { "Empatia": 7.0, "Pensamento Prático": 8.0, "Pensamento Sistêmico": 7.5 },
    ranges: { "Empatia": [6.5, 7.5], "Pensamento Prático": [7.5, 8.5], "Pensamento Sistêmico": [7.0, 8.0] },
    disc: { D: 90, I: 80, S: 45, C: 30 }
  },
  { 
    title: "Agente de Locação", 
    industry: "Imobiliária", 
    scores: { "Empatia": 7.5, "Pensamento Prático": 9.0, "Pensamento Sistêmico": 7.8 },
    ranges: { "Empatia": [7.0, 8.0], "Pensamento Prático": [8.5, 9.5], "Pensamento Sistêmico": [7.0, 8.5] },
    disc: { D: 30, I: 50, S: 85, C: 90 }
  },
  { 
    title: "Agente de Vendas Imobiliárias", 
    industry: "Imobiliária", 
    scores: { "Empatia": 7.0, "Pensamento Prático": 8.0, "Pensamento Sistêmico": 7.0 },
    ranges: { "Empatia": [6.5, 7.5], "Pensamento Prático": [7.5, 8.5], "Pensamento Sistêmico": [6.5, 7.5] },
    disc: { D: 52, I: 81, S: 58, C: 20 }
  },
  { 
    title: "Analista de Impostos", 
    industry: "Finanças", 
    scores: { "Empatia": 7.0, "Pensamento Prático": 8.0, "Pensamento Sistêmico": 7.0 },
    ranges: { "Empatia": [6.5, 7.5], "Pensamento Prático": [7.5, 8.5], "Pensamento Sistêmico": [6.5, 7.5] },
    disc: { D: 35, I: 46, S: 77, C: 83 }
  },
  { 
    title: "Analista Financeiro", 
    industry: "Finanças", 
    scores: { "Empatia": 7.0, "Pensamento Prático": 8.0, "Pensamento Sistêmico": 8.0 },
    ranges: { "Empatia": [6.5, 7.5], "Pensamento Prático": [7.0, 9.0], "Pensamento Sistêmico": [7.0, 9.0] },
    disc: { D: 30, I: 40, S: 70, C: 80 }
  },
  { 
    title: "Assistente Administrativo", 
    industry: "Geral", 
    scores: { "Empatia": 7.9, "Pensamento Prático": 8.4, "Pensamento Sistêmico": 8.5 },
    ranges: { "Empatia": [7.4, 8.4], "Pensamento Prático": [8.0, 8.8], "Pensamento Sistêmico": [8.0, 9.0] },
    disc: { D: 75, I: 75, S: 35, C: 85 }
  },
  { 
    title: "Assistente de Transações", 
    industry: "Geral", 
    scores: { "Empatia": 8.2, "Pensamento Prático": 8.2, "Pensamento Sistêmico": 8.2 },
    ranges: { "Empatia": [7.5, 9.0], "Pensamento Prático": [7.5, 9.0], "Pensamento Sistêmico": [7.5, 9.0] },
    disc: { D: 30, I: 45, S: 75, C: 80 }
  },
  { 
    title: "Atendimento ao Cliente", 
    industry: "Geral", 
    scores: { "Empatia": 8.5, "Pensamento Prático": 7.5, "Pensamento Sistêmico": 7.0 },
    ranges: { "Empatia": [8.0, 9.0], "Pensamento Prático": [7.0, 8.0], "Pensamento Sistêmico": [6.5, 7.5] },
    disc: { D: 30, I: 75, S: 75, C: 45 }
  },
  { 
    title: "Coordenador de Marketing / Social Media", 
    industry: "Marketing", 
    scores: { "Empatia": 8.0, "Pensamento Prático": 8.6, "Pensamento Sistêmico": 8.1 },
    ranges: { "Empatia": [7.5, 8.5], "Pensamento Prático": [8.25, 9.0], "Pensamento Sistêmico": [7.75, 8.5] },
    disc: { D: 42, I: 46, S: 63, C: 70 }
  },
  { 
    title: "Contador", 
    industry: "Finanças", 
    scores: { "Empatia": 7.3, "Pensamento Prático": 8.5, "Pensamento Sistêmico": 7.8 },
    ranges: { "Empatia": [6.8, 7.8], "Pensamento Prático": [8.0, 9.0], "Pensamento Sistêmico": [7.3, 8.3] },
    disc: { D: 45, I: 25, S: 55, C: 83 }
  },
  { 
    title: "Diretor Administrativo / Gerente", 
    industry: "Gestão", 
    scores: { "Empatia": 7.9, "Pensamento Prático": 8.4, "Pensamento Sistêmico": 8.5 },
    ranges: { "Empatia": [7.4, 8.4], "Pensamento Prático": [8.0, 8.8], "Pensamento Sistêmico": [8.0, 9.0] },
    disc: { D: 75, I: 39, S: 58, C: 85 }
  },
  { 
    title: "Diretor Geral", 
    industry: "Gestão", 
    scores: { "Empatia": 7.9, "Pensamento Prático": 8.4, "Pensamento Sistêmico": 8.5 },
    ranges: { "Empatia": [7.4, 8.4], "Pensamento Prático": [8.0, 8.8], "Pensamento Sistêmico": [8.0, 9.0] },
    disc: { D: 75, I: 75, S: 35, C: 85 }
  },
  { 
    title: "Engenheiro de Software", 
    industry: "Tecnologia", 
    scores: { "Empatia": 7.7, "Pensamento Prático": 8.5, "Pensamento Sistêmico": 7.5 },
    ranges: { "Empatia": [7.2, 8.2], "Pensamento Prático": [8.0, 9.0], "Pensamento Sistêmico": [6.5, 8.5] },
    disc: { D: 42, I: 51, S: 65, C: 77 }
  },
  { 
    title: "Gerente de Compras", 
    industry: "Geral", 
    scores: { "Empatia": 6.5, "Pensamento Prático": 7.5, "Pensamento Sistêmico": 8.5 },
    ranges: { "Empatia": [6.0, 7.0], "Pensamento Prático": [7.0, 8.0], "Pensamento Sistêmico": [8.0, 9.0] },
    disc: { D: 30, I: 50, S: 65, C: 80 }
  },
  { 
    title: "Gerente de RH", 
    industry: "Recursos Humanos", 
    scores: { "Empatia": 6.5, "Pensamento Prático": 7.5, "Pensamento Sistêmico": 8.5 },
    ranges: { "Empatia": [6.0, 7.0], "Pensamento Prático": [7.0, 8.0], "Pensamento Sistêmico": [8.0, 9.0] },
    disc: { D: 45, I: 40, S: 60, C: 70 }
  },
  { 
    title: "Gerente de Vendas", 
    industry: "Vendas", 
    scores: { "Empatia": 8.0, "Pensamento Prático": 8.6, "Pensamento Sistêmico": 8.1 },
    ranges: { "Empatia": [7.5, 8.5], "Pensamento Prático": [8.25, 9.0], "Pensamento Sistêmico": [7.75, 8.5] },
    disc: { D: 90, I: 75, S: 20, C: 50 }
  },
  { 
    title: "Gerente Executivo/Geral", 
    industry: "Gestão", 
    scores: { "Empatia": 7.9, "Pensamento Prático": 8.5, "Pensamento Sistêmico": 8.4 },
    ranges: { "Empatia": [7.4, 8.4], "Pensamento Prático": [8.0, 9.0], "Pensamento Sistêmico": [8.0, 8.8] },
    disc: { D: 75, I: 75, S: 35, C: 85 }
  },
  { 
    title: "Marketing de Conteúdo", 
    industry: "Marketing", 
    scores: { "Empatia": 7.5, "Pensamento Prático": 7.7, "Pensamento Sistêmico": 9.0 },
    ranges: { "Empatia": [7.0, 8.0], "Pensamento Prático": [7.0, 8.5], "Pensamento Sistêmico": [8.5, 9.5] },
    disc: { D: 30, I: 50, S: 80, C: 90 }
  },
  { 
    title: "Supervisor", 
    industry: "Gestão", 
    scores: { "Empatia": 7.9, "Pensamento Prático": 7.5, "Pensamento Sistêmico": 7.5 },
    ranges: { "Empatia": [7.4, 8.4], "Pensamento Prático": [7.0, 8.0], "Pensamento Sistêmico": [7.0, 8.0] },
    disc: { D: 75, I: 55, S: 35, C: 75 }
  },
  { 
    title: "Vendas Externas (Hunter)", 
    industry: "Vendas", 
    scores: { "Empatia": 7.0, "Pensamento Prático": 8.0, "Pensamento Sistêmico": 6.0 },
    ranges: { "Empatia": [6.5, 7.5], "Pensamento Prático": [7.5, 8.5], "Pensamento Sistêmico": [5.5, 6.5] },
    disc: { D: 90, I: 90, S: 25, C: 20 }
  },
  { 
    title: "Vendas Internas (Expansão)", 
    industry: "Vendas", 
    scores: { "Empatia": 7.0, "Pensamento Prático": 8.0, "Pensamento Sistêmico": 7.0 },
    ranges: { "Empatia": [6.5, 7.5], "Pensamento Prático": [7.5, 8.5], "Pensamento Sistêmico": [6.5, 7.5] },
    disc: { D: 52, I: 81, S: 58, C: 20 }
  },
  { 
    title: "Vendas Internas (Manutenção)", 
    industry: "Vendas", 
    scores: { "Empatia": 8.0, "Pensamento Prático": 8.0, "Pensamento Sistêmico": 6.0 },
    ranges: { "Empatia": [7.5, 8.5], "Pensamento Prático": [7.5, 8.5], "Pensamento Sistêmico": [5.5, 6.5] },
    disc: { D: 25, I: 85, S: 85, C: 45 }
  },
  { 
    title: "Vendas no Varejo", 
    industry: "Varejo", 
    scores: { "Empatia": 8.0, "Pensamento Prático": 8.0, "Pensamento Sistêmico": 6.0 },
    ranges: { "Empatia": [7.5, 8.5], "Pensamento Prático": [7.5, 8.5], "Pensamento Sistêmico": [5.5, 6.5] },
    disc: { D: 30, I: 75, S: 80, C: 50 }
  },
  { 
    title: "Vendedor de Imóveis Novos", 
    industry: "Imobiliária", 
    scores: { "Empatia": 8.2, "Pensamento Prático": 7.5, "Pensamento Sistêmico": 8.5 },
    ranges: { "Empatia": [7.7, 8.7], "Pensamento Prático": [7.0, 8.0], "Pensamento Sistêmico": [8.0, 9.0] },
    disc: { D: 60, I: 70, S: 60, C: 30 }
  }
];

// --- Dados da Pesquisa Psicossocial (NR-1) ---
export const PSYCHOSOCIAL_SURVEY_DATA: PsychosocialSurveyData = {
  scale: {
    1: "Discordo totalmente",
    2: "Discordo",
    3: "Neutro",
    4: "Concordo",
    5: "Concordo totalmente"
  },
  dimensions: [
    {
      id: 1,
      title: "TRABALHO",
      questions: [
        "As exigências de trabalho vindas de colegas e superiores são possíveis de conciliar.",
        "Tenho prazos compatíveis de cumprir.",
        "A minha intensidade de trabalho é adequada.",
        "Quando tenho muitas tarefas, consigo adaptar meu tempo para entregar todas como gostaria.",
        "Posso fazer pausas suficientes durante o trabalho.",
        "Não recebo pressão para trabalhar em horários diferentes do habitual.",
        "Tenho tempo adequado para fazer minhas tarefas.",
        "Recebo informações e suporte necessários para meu trabalho.",
        "Eu sei fazer o meu trabalho.",
        "Minhas tarefas e responsabilidades estão claras.",
        "Os objetivos e metas para o meu setor são claros para mim.",
        "Entendo como meu trabalho contribui para os objetivos da empresa."
      ]
    },
    {
      id: 2,
      title: "RELACIONAMENTO COM COLEGAS",
      questions: [
        "As pessoas com quem trabalho falam ou se comportam comigo de forma profissional e amigável.",
        "Não existem conflitos entre os colegas.",
        "Não sinto que sou perseguido no trabalho.",
        "As relações de trabalho são equilibradas.",
        "Quando o trabalho se torna difícil, posso contar com ajuda dos colegas.",
        "Meus colegas me ajudam e me apoiam quando necessário.",
        "No trabalho, meus colegas demonstram respeito por mim.",
        "Os colegas estão disponíveis para ouvir meus problemas de trabalho."
      ]
    },
    {
      id: 3,
      title: "GESTÃO DE TEMPO",
      questions: [
        "Posso decidir quando fazer uma pausa.",
        "Minha opinião sobre a velocidade do meu trabalho é considerada.",
        "Tenho liberdade para decidir o que fazer no meu trabalho.",
        "Tenho liberdade para escolher como fazer meu trabalho.",
        "Minhas sugestões sobre como executar o trabalho são consideradas.",
        "Meu horário de trabalho pode ser flexível.",
        "As pausas programadas são possíveis de cumprir."
      ]
    },
    {
      id: 4,
      title: "LIDERANÇA, GESTÃO E RH",
      questions: [
        "Posso confiar no meu líder quando tenho problemas no trabalho.",
        "Quando algo me incomoda no trabalho, posso conversar com meu superior direto.",
        "Tenho apoio para lidar com as demandas emocionais no trabalho.",
        "Meu líder me incentiva no trabalho.",
        "Tenho acesso a pessoas que podem me ajudar em relação ao trabalho.",
        "Tenho oportunidades para pedir explicações ao superior direto sobre as mudanças no trabalho."
      ]
    },
    {
      id: 5,
      title: "COMUNICAÇÃO",
      questions: [
        "As mudanças no trabalho são bem comunicadas.",
        "Quando há mudanças, consigo realizar meu trabalho com o mesmo empenho.",
        "Meu superior tem o tom adequado ao fazer comunicados.",
        "Tenho reuniões recorrentes de feedback sobre o meu trabalho.",
        "A comunicação entre os colaboradores é clara e assertiva."
      ]
    }
  ],
  legend: {
    "0-1": "Baixo Desempenho (Atenção imediata requerida)",
    "1-2": "Abaixo da média (Urgente atenção)",
    "2-3": "Bom (Alta prioridade – precisa ser mais pesquisado)",
    "3-4": "Muito bom (Forte desempenho – conduzir para o próximo nível)",
    "4-5": "Excelente (Área de utilidade e vantagem competitiva – reforço e recompensa)"
  }
};

// --- Design Tokens ---
export const TOKENS = {
  colors: {
    primary: '#E93D25', // Pessoa Certa Red
    secondary: '#06B6D4', // Azul Piscina
    background: '#F8FAFC',
    surface: '#FFFFFF',
    textMain: '#1e293b',
    textMuted: '#64748B',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
  },
  borderRadius: {
    card: '0.75rem', 
    button: '0.5rem', 
  },
  spacing: {
    pagePadding: '2rem',
    cardPadding: '1.5rem',
  }
};

// --- Mock Data ---

export const MOCK_KPIS: KPI[] = [
  { id: '1', label: 'Total de Avaliados', value: '1,248', trend: 12.5, trendLabel: 'vs mês anterior', icon: 'users' },
  { id: '2', label: 'Relatórios Gerados', value: '856', trend: 5.2, trendLabel: 'vs mês anterior', icon: 'file' },
  { id: '3', label: 'Empresas Ativas', value: '12', trend: 2, trendLabel: 'novas este mês', icon: 'building' },
  { id: '4', label: 'Média de Fit', value: '78%', trend: -2.1, trendLabel: 'estável', icon: 'activity' },
];

export const MOCK_RADAR_DATA: RadarDataPoint[] = INNERMETRIX_ATTRIBUTES.map(attr => ({
  attribute: attr,
  candidate: 7.0,
  benchmark: 7.0,
  fullMark: 10
}));

export const MOCK_SCATTER_DATA: ScatterDataPoint[] = Array.from({ length: 50 }, (_, i) => {
  const baseFit = 40 + Math.random() * 60;
  const noise = (Math.random() - 0.5) * 20;
  let performance = baseFit + noise;
  performance = Math.max(0, Math.min(100, performance));
  return {
    x: Math.round(baseFit),
    y: Math.round(performance),
    name: `Colaborador ${i + 1}`,
    status: Math.random() > 0.8 ? 'terminated' : 'active'
  };
});

export const MOCK_RETENTION_DATA: RetentionDataPoint[] = [
  { month: 0, highFitRetention: 100, lowFitRetention: 100 },
  { month: 3, highFitRetention: 98, lowFitRetention: 85 },
  { month: 6, highFitRetention: 95, lowFitRetention: 72 },
  { month: 9, highFitRetention: 92, lowFitRetention: 60 },
  { month: 12, highFitRetention: 89, lowFitRetention: 45 },
  { month: 18, highFitRetention: 85, lowFitRetention: 30 },
];

export const MOCK_COMPANIES: Company[] = [
  { id: 'c1', name: 'Tech Solutions Inc.', created_at: '2023-01-15', role_count: 5, report_count: 42 },
  { id: 'c2', name: 'Grupo Varejo Brasil', created_at: '2023-03-10', role_count: 8, report_count: 156 },
  { id: 'c3', name: 'Logística Fast', created_at: '2023-06-22', role_count: 3, report_count: 24 },
];

const MOCK_ANALYSIS_V5 = {
    overall_summary: "A candidata demonstra um perfil executivo robusto...",
    psychosocial_risk_level: "Baixo",
    dimensional_balance: {
        empathy: 6.5,
        practical_thinking: 9.2,
        systems_judgment: 8.8,
        self_esteem_self_control: 7.5,
        functional_awareness: 8.0,
        self_direction: 9.5
    },
    attribute_index: INNERMETRIX_ATTRIBUTES.map(attr => ({
        category: "Psicometria",
        component: attr,
        score: 7.0,
        score_description: "Adequado",
        analysis: "Análise comportamental baseada em DNA Innermetrix."
    })),
    main_attributes_list: []
};

export const MOCK_REPORTS: CandidateReport[] = [
  { 
      id: '1', 
      name: 'Ana Silva', 
      email: 'ana.silva@email.com', 
      role: 'Gerente de Vendas', 
      company_id: 'c1', 
      role_id: 'r1', 
      company_name: 'Tech Solutions Inc.', 
      score: 92, 
      status: 'completed', 
      date: '2023-10-25', 
      pdf_url: '#', 
      report_key: 'RPT-001', 
      vo_number: 'VO-1001',
      analysis: MOCK_ANALYSIS_V5 as any,
      scores: { 'Empatia': 6.5, 'Pensamento Prático': 9.2, 'Pensamento Sistêmico': 8.8 }
  }
];

export const MOCK_BILLING: BillingPlan[] = [
  { id: 'basic', name: 'Starter', price: 499, interval: 'month', active: true, features: ['Até 5 empresas', 'Relatórios básicos'] },
  { id: 'pro', name: 'Growth', price: 999, interval: 'month', active: false, features: ['Empresas ilimitadas', 'Comparação de Cargos', 'API Access'] },
];

export const COPY = {
  upload: {
    idle: "Arraste e solte seu PDF aqui ou clique para selecionar",
    processing: "Processando seus dados...",
    success: "Relatório gerado com sucesso!",
    error: "Erro ao ler o arquivo. Verifique se é um PDF válido.",
    button: "Upload de Relatório"
  },
  empty: {
    reports: "Nenhum relatório encontrado. Comece fazendo upload.",
  }
};
