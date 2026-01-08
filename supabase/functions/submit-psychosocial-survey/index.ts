
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(options: any, handler: (req: Request) => Promise<Response>): void;
};

const PORT = Number(Deno.env.get("PORT")) || 8080;

Deno.serve({ port: PORT }, async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { token, answers } = await req.json();

    if (!token || !answers) {
        return new Response(JSON.stringify({ success: false, error: "Missing required fields" }), {
            status: 200, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
    }

    const { data: invite, error: inviteError } = await supabase
        .from("assessment_invites")
        .select("id, tenant_id, company_id, job_role_id, candidate_name, candidate_email, survey_completed")
        .eq("survey_token", token)
        .single();

    if (inviteError || !invite) {
        return new Response(JSON.stringify({ success: false, error: "Invalid or expired token" }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
    }

    if (invite.survey_completed) {
        return new Response(JSON.stringify({ success: false, error: "Survey already submitted" }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
    }

    // Garante que o email não seja nulo (fallback para string vazia se necessário, embora improvável)
    const candidateEmail = invite.candidate_email || "";
    const candidateName = invite.candidate_name || "Candidato";

    const { error: insertError } = await supabase
        .from("reports")
        .insert({
            tenant_id: invite.tenant_id,
            invite_id: invite.id,
            company_id: invite.company_id,
            job_role_id: invite.job_role_id,
            full_name: candidateName,
            // Mapeia para ambos os campos comuns para evitar erro de coluna
            email: candidateEmail,
            candidate_email: candidateEmail, 
            status: 'completed',
            fit_score: 0, 
            scores: answers, 
            metadata: {
                source: 'psychosocial_survey',
                survey_type: 'NR1_PSA',
                answers: answers
            },
            pdf_url: '', 
            updated_at: new Date()
        });

    if (insertError) throw insertError;

    await supabase
        .from("assessment_invites")
        .update({ survey_completed: true })
        .eq("id", invite.id);

    return new Response(JSON.stringify({ success: true }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

  } catch (error: any) {
    console.error("Survey Submission Error:", error);
    // Return 200 so client gracefully handles the error message
    return new Response(JSON.stringify({ success: false, error: error.message }), { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});
