
import { supabase } from '../supabaseClient';
import { PendingReport, AssessmentInvite, CandidateReport, AssessmentType } from '../types';
import { assessmentLinkService } from './assessmentLinkService';

// URL de Produção Oficial definida pelo usuário
const PRODUCTION_URL = "https://innermetrix-analytics-saas-879661972536.us-west1.run.app";

export const reportTrackingService = {
  
  // Legacy single invite creation (kept for backward compatibility if needed)
  createInvite: async (
    tenantId: string,
    data: {
      companyId: string;
      jobId?: string | null;
      candidateName: string;
      candidateEmail: string;
      assessmentType: AssessmentType;
    }
  ): Promise<{ success: boolean; data?: AssessmentInvite; error?: string }> => {
    // Wrapper for the batch function to keep logic centralized
    return reportTrackingService.createBatchInvite(tenantId, {
        companyId: data.companyId,
        jobId: data.jobId || undefined,
        assessmentTypes: [data.assessmentType],
        candidates: [{ name: data.candidateName, email: data.candidateEmail }]
    }).then(res => {
        if(res.success) return { success: true };
        return { success: false, error: res.error };
    });
  },

  createBatchInvite: async (
    tenantId: string,
    data: {
      companyId: string;
      jobId?: string;
      assessmentTypes: AssessmentType[];
      candidates: { name: string; email: string }[];
      includeResume?: boolean; // New optional parameter
    }
  ): Promise<{ success: boolean; sent?: number; error?: string }> => {
    try {
      // Captura a origem atual
      let currentOrigin = typeof window !== 'undefined' ? window.location.origin : PRODUCTION_URL;

      // SE estiver no ambiente de preview do Google (usercontent.goog) OU localhost, 
      // FORÇA a URL de produção para que o link no email funcione para o candidato.
      if (currentOrigin.includes("usercontent.goog") || currentOrigin.includes("localhost")) {
          currentOrigin = PRODUCTION_URL;
      }

      if (data.assessmentTypes.length === 0) {
          throw new Error("Selecione pelo menos um tipo de avaliação.");
      }

      const { data: responseData, error } = await supabase.functions.invoke('send-batch-invite', {
        body: {
          tenantId,
          companyId: data.companyId,
          jobId: data.jobId,
          assessmentTypes: data.assessmentTypes, // Passing array
          candidates: data.candidates,
          origin: currentOrigin,
          includeResume: data.includeResume // Passing to edge function
        }
      });

      if (error) throw error;
      if (responseData.error) throw new Error(responseData.error);

      return { success: true, sent: responseData.sent };

    } catch (error: any) {
      console.error('Erro no envio em lote:', error);
      return { success: false, error: error.message };
    }
  },

  fetchPendingReports: async (tenantId: string): Promise<PendingReport[]> => {
    // We select raw data and map it manually
    const { data, error } = await supabase
      .from('assessment_invites')
      .select(`
        *,
        companies (name),
        job_roles (title)
      `)
      .eq('tenant_id', tenantId)
      .neq('status', 'completed') // Show pending and in_progress
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar pendentes:', error);
      return [];
    }

    // Since we can't easily join the invite_assessments table via standard REST efficiently for list view without complex setup,
    // we assume the 'assessment_type' column in 'assessment_invites' acts as a primary label, 
    // OR we fetch the sub-assessments.
    // For performance, we'll try to fetch associated assessments.
    
    const inviteIds = data.map((d: any) => d.id);
    const { data: assessmentsData } = await supabase
        .from('invite_assessments')
        .select('invite_id, assessment_type, status')
        .in('invite_id', inviteIds);

    const assessmentsMap: Record<string, string[]> = {};
    if (assessmentsData) {
        assessmentsData.forEach((a: any) => {
            if (!assessmentsMap[a.invite_id]) assessmentsMap[a.invite_id] = [];
            assessmentsMap[a.invite_id].push(a.assessment_type);
        });
    }

    return data.map((item: any) => ({
      id: item.id,
      nonce: item.id, // Using ID as nonce for display
      company_id: item.company_id,
      company_name: item.companies?.name || 'Empresa desconhecida',
      job_id: item.job_role_id,
      job_title: item.job_roles?.title || 'Geral',
      candidate_name: item.candidate_name,
      candidate_email: item.candidate_email,
      assessment_type: assessmentsMap[item.id]?.length > 1 ? 'Multi' : (assessmentsMap[item.id]?.[0] as AssessmentType) || 'ADV',
      assessments_list: assessmentsMap[item.id] || [],
      link_sent_at: item.created_at,
      status: item.status,
      generated_link: item.generated_link || '', // Main link might be empty if multiple links
      created_at: item.created_at,
      batch_id: item.batch_id
    }));
  },

  deletePending: async (ids: string[]): Promise<{ success: boolean; error?: string }> => {
    try {
      // First delete sub-assessments due to FK constraints (if cascade is not set)
      await supabase.from('invite_assessments').delete().in('invite_id', ids);
      
      const { error } = await supabase
        .from('assessment_invites')
        .delete()
        .in('id', ids);

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error('Erro ao excluir pendentes:', error);
      return { success: false, error: error.message };
    }
  },

  sendResumeRequest: async (tenantId: string, inviteId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      let currentOrigin = typeof window !== 'undefined' ? window.location.origin : PRODUCTION_URL;
      
      if (currentOrigin.includes("usercontent.goog") || currentOrigin.includes("localhost")) {
          currentOrigin = PRODUCTION_URL;
      }
      
      const { data, error } = await supabase.functions.invoke('send-resume-invite', {
        body: { 
            tenantId, 
            inviteId,
            origin: currentOrigin 
        }
      });

      if (error) throw error;
      if (data && data.error) throw new Error(data.error);

      return { success: true };
    } catch (error: any) {
      console.error('Erro ao solicitar currículo:', error);
      return { success: false, error: error.message };
    }
  },

  ensureInviteForReport: async (tenantId: string, report: CandidateReport): Promise<{ success: boolean; inviteId?: string; error?: string }> => {
      try {
          const candidateEmail = (report.email || 
                                  report.metadata?.email || 
                                  report.metadata?.person?.email || 
                                  "").trim();

          if (!candidateEmail || !candidateEmail.includes("@")) {
              throw new Error("Relatório sem e-mail válido para vinculação.");
          }

          const inviteId = crypto.randomUUID();
          
          const { error: inviteError } = await supabase.from('assessment_invites').insert({
              id: inviteId,
              tenant_id: tenantId,
              company_id: report.company_id,
              job_role_id: report.role_id || report.job_id || report.job_role_id,
              candidate_name: report.name || report.candidate_name || report.full_name || candidateEmail,
              candidate_email: candidateEmail,
              status: 'completed',
              resume_token: crypto.randomUUID(),
          });

          if (inviteError) throw inviteError;

          // Create dummy assessment entry for historical report
          await supabase.from('invite_assessments').insert({
              invite_id: inviteId,
              assessment_type: 'ADV', // Default to ADV for existing reports
              token: crypto.randomUUID(),
              status: 'completed'
          });

          const { error: reportError } = await supabase.from('reports').update({
              invite_id: inviteId
          }).eq('id', report.id);

          if (reportError) {
              console.warn("Vínculo bidirecional falhou, mas convite foi criado.", reportError);
          }

          return { success: true, inviteId };

      } catch (error: any) {
          console.error("Erro ao criar convite retroativo:", error);
          return { success: false, error: error.message };
      }
  }
};