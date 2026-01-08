
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

    const { 
        token, 
        phone, 
        linkedin_url,
        professional_summary, 
        experience, 
        education, 
        resume_file_path, 
        lgpd_consent 
    } = await req.json();

    if (!token || !resume_file_path || !lgpd_consent) {
        throw new Error("Missing required fields");
    }

    const { data: invite, error: inviteError } = await supabase
        .from("assessment_invites")
        .select("id, tenant_id, candidate_name, candidate_email, resume_completed")
        .eq("resume_token", token)
        .single();

    if (inviteError || !invite) throw new Error("Invalid or expired token");
    if (invite.resume_completed) throw new Error("Resume already submitted");

    const { data: { publicUrl } } = supabase.storage.from("resumes").getPublicUrl(resume_file_path);

    const { error: insertError } = await supabase
        .from("candidate_resumes")
        .insert({
            invite_id: invite.id,
            tenant_id: invite.tenant_id,
            name: invite.candidate_name,
            email: invite.candidate_email,
            phone,
            linkedin_url,
            professional_summary,
            experience,
            education,
            resume_file_url: publicUrl,
            lgpd_consent
        });

    if (insertError) throw insertError;

    await supabase
        .from("assessment_invites")
        .update({ resume_completed: true })
        .eq("id", invite.id);

    return new Response(JSON.stringify({ success: true }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

  } catch (error: any) {
    console.error("Submission Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
