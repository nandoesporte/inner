
import { supabase } from '../supabaseClient';
import { AssessmentLink } from '../types';

export const assessmentLinkService = {
  
  getAll: async (tenantId: string): Promise<AssessmentLink[]> => {
    const { data, error } = await supabase
      .from('assessment_links')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  create: async (link: Omit<AssessmentLink, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
      .from('assessment_links')
      .insert(link)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  update: async (id: string, updates: Partial<AssessmentLink>) => {
    const { data, error } = await supabase
      .from('assessment_links')
      .update({ ...updates, updated_at: new Date() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  delete: async (id: string) => {
    const { error } = await supabase
      .from('assessment_links')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Busca o link ativo para um tipo específico de avaliação.
   * Usado na geração de novos relatórios.
   */
  getActiveByType: async (tenantId: string, type: 'ADV' | 'IM_NR1' | 'PSA'): Promise<AssessmentLink | null> => {
    // Mapeia o tipo do select do formulário para o tipo salvo no banco
    let dbType = 'attributes';
    if (type === 'IM_NR1') dbType = 'nr1';
    if (type === 'PSA') dbType = 'psa';
    if (type === 'ADV') dbType = 'attributes';

    const { data, error } = await supabase
      .from('assessment_links')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('type', dbType)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Erro ao buscar link ativo:', error);
      return null;
    }
    return data;
  }
};