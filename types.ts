
export type UserRole = 'MASTER_ADMIN' | 'COMPANY_ADMIN' | 'STANDARD_USER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  tenant_id?: string;
}

export interface KPI {
  id: string;
  label: string;
  value: string | number;
  trend: number;
  trendLabel: string;
  icon: 'users' | 'file' | 'activity' | 'dollar' | 'target' | 'building' | 'brain' | 'chart';
}

export interface RadarDataPoint {
  attribute: string;
  candidate: number;     
  benchmark: number;     
  technical?: number;    
  candidateB?: number;   
  fullMark: number;
}

export interface ComparisonItem {
  domain: 'attribute' | 'disc' | 'value';
  key: string;                 // ex: "Empatia", "D", "Econômico"
  label: string;               // label amigável
  candidate_score: number;     // SEMPRE 0–100
  benchmark_score: number;     // SEMPRE 0–100
  delta: number;               // candidate - benchmark
  fit: number;                 // 0–100 (Score de aderência calculado)
  status?: 'critical' | 'moderate' | 'aligned' | 'surplus'; // Helper visual
}

export interface OrganizationalFitResult {
  fit_cargo_percent: number;
  dimensions_used: number;
  calculation_valid: boolean;
  gap_by_dimension: Record<string, number>;
}

export interface Company {
  id: string;
  name: string;
  created_at: string;
  role_count?: number;
  report_count?: number;
}

export interface CVEvidence {
  competency: string;
  snippet: string;
  type: 'positive' | 'negative' | 'neutral';
  impact: 'high' | 'medium' | 'low';
}

export interface CandidateResume {
  id: string;
  phone: string;
  linkedin_url: string;
  professional_summary: string;
  experience: string;
  education: string;
  technical_skills?: string[];
  evidence_snippets?: CVEvidence[]; 
  total_experience_years?: number; 
  relevant_experience_years?: number; 
  resume_file_url: string;
  created_at: string;
}

export interface AttributeIndexItem {
  category: string;
  component: string;
  score: number;
  score_description: string;
  analysis: string;
}

export interface DimensionalBalance {
  empathy: number;
  practical_thinking: number;
  systems_judgment: number;
  self_esteem_self_control: number;
  functional_awareness: number;
  self_direction: number;
}

export interface MainAttributeItem {
  attribute: string;
  score: number;
}

export interface InnermetrixAnalysis {
  overall_summary?: string;
  psychosocial_risk_level?: string;
  dimensional_balance?: DimensionalBalance;
  attribute_index?: AttributeIndexItem[];
  main_attributes_list?: MainAttributeItem[];
  summary?: string;
  management_summary?: string;
  executiveSummary?: string;
  strengths?: string[];
  risks?: string[];
  recommendations?: any;
  contextual_analysis?: any;
  hiring_questions?: string[];
  interactive_attributes?: any[];
}

// Interfaces específicas para os novos formatos de dados
export interface DiscProfile {
  natural: { D: number; I: number; S: number; C: number };
  adapted: { D: number; I: number; S: number; C: number };
  profile?: string;
  description?: string;
}

export interface ValueItem {
  value_name: string;
  score: number;
  description?: string;
}

export interface CandidateReport {
  id: string;
  email: string;
  name?: string;
  candidate_name?: string;
  full_name?: string;
  company_id: string | null;
  role_id: string | null;
  job_id?: string | null;
  job_role_id?: string | null;
  invite_id?: string | null;
  company_name?: string;
  role?: string; 
  job_title?: string;
  report_key?: string;
  vo_number?: string;
  pdf_url: string;
  status: 'processing' | 'completed' | 'error';
  date: string;
  created_at?: string;
  score: number;
  fit_score?: number | null;
  scores?: Record<string, number>;
  overall_summary?: string | null;
  psychosocial_risk_level?: string | null;
  dimensional_balance?: DimensionalBalance | null;
  attribute_index?: AttributeIndexItem[] | null;
  main_attributes_list?: MainAttributeItem[] | null;
  source?: string;
  analysis?: InnermetrixAnalysis;
  metadata?: any;
  resume_sent?: boolean;
  resume_completed?: boolean;
  // Architecture Domains
  domain?: 'psychometric' | 'nr1' | 'performance' | string;
  report_type?: 'adv' | 'ima' | 'disc' | 'nr1_psychosocial' | string;
  
  // Advanced Insights Fields (Suporte a múltiplos formatos)
  disc?: { D: number; I: number; S: number; C: number; profile?: string } | DiscProfile;
  disc_profile?: DiscProfile; // Coluna dedicada no DB novo
  values_index?: { [key: string]: number } | ValueItem[]; // Suporte híbrido (Legacy Object ou New Array)
}

export type PerformanceQuadrant = 'Estrela' | 'Potencial' | 'Risco' | 'Desalinhado';

export interface PerformanceReviewData {
  report_id: string;
  employee_name: string;
  role: string;
  fit_score: number;
  performance_score: number;
  last_review_date?: string;
  quadrant: PerformanceQuadrant;
}

export type AssessmentType = 'ADV' | 'IM_NR1' | 'PSA';

export interface AssessmentInvite {
  id: string;
  tenant_id: string;
  company_id: string;
  job_role_id?: string | null;
  candidate_name: string;
  candidate_email: string;
  // Legacy support for single type, but moving towards invite_assessments table
  assessment_type?: AssessmentType; 
  status: 'pending' | 'sent' | 'completed';
  created_at: string;
  completed_at?: string;
  resume_token?: string;
  resume_sent?: boolean;
  resume_completed?: boolean;
}

export interface InviteAssessment {
  id: string;
  invite_id: string;
  assessment_type: AssessmentType;
  token: string;
  status: 'pending' | 'completed';
  created_at: string;
}

export interface JobRole {
  id: string;
  company_id?: string;
  title: string;
  active?: boolean;
  benchmarks?: Record<string, number>;
  metadata?: any;
}

export interface TenantSettings {
  logo_url?: string;
  login_title?: string;
  login_subtitle?: string;
  login_cover_title?: string;
  login_cover_subtitle?: string;
  api_token?: string;
  resend_api_key?: string;
  mail_from?: string;
}

export interface AssessmentLink {
  id: string;
  tenant_id: string;
  name: string;
  type: 'attributes' | 'nr1' | 'psa';
  url: string;
  is_active: boolean;
  created_at?: string;
}

export interface BillingPlan {
  id: string;
  name: string;
  price: number;
  interval: 'month' | 'year';
  active: boolean;
  features: string[];
}

export interface ScatterDataPoint {
  x: number;
  y: number;
  name: string;
  status: 'active' | 'terminated';
}

export interface RetentionDataPoint {
  month: number;
  highFitRetention: number;
  lowFitRetention: number;
}

export interface PendingReport {
  id: string;
  nonce: string;
  company_id: string;
  company_name: string;
  job_id: string | null;
  job_title: string;
  candidate_name: string;
  candidate_email: string;
  assessment_type: AssessmentType | 'Multi';
  assessments_list?: string[]; // New: list of types in this invite
  link_sent_at: string;
  status: string;
  generated_link: string;
  created_at: string;
  batch_id?: string | null;
}

export type PsychosocialRiskType = 
  | 'Burnout' 
  | 'Assedio_Vitima' 
  | 'Assedio_Agressor' 
  | 'Procrastinacao' 
  | 'Decisao_Impulsiva' 
  | 'Conflito' 
  | 'Isolamento' 
  | 'Desmotivacao' 
  | 'Rigidez';

export interface PsychosocialAnalysisResult {
  riskLevel: 'Baixo' | 'Moderado' | 'Alto';
  detectedRisks: PsychosocialRiskType[];
}

export interface PsychosocialSurveyDimension {
  id: number;
  title: string;
  questions: string[];
}

export interface PsychosocialSurveyData {
  dimensions: PsychosocialSurveyDimension[];
  scale: Record<number, string>;
  legend: Record<string, string>;
}