
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PRODUCTION_ORIGIN = "https://innermetrix-analytics-saas-879661972536.us-west1.run.app";

declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(options: any, handler: (req: Request) => Promise<Response>): void;
};

// Configuração de Porta Obrigatória para Cloud Run
const PORT = Number(Deno.env.get("PORT")) || 8080;

Deno.serve({ port: PORT }, async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { inviteId, tenantId, origin: clientOrigin } = body;

    if (!inviteId || !tenantId) throw new Error("Parâmetros inviteId ou tenantId ausentes");

    let origin = PRODUCTION_ORIGIN;
    
    if (clientOrigin && !clientOrigin.includes("usercontent.goog") && !clientOrigin.includes("localhost")) {
        origin = clientOrigin.replace(/\/+$/, "");
    }

    const { data: invite, error: fetchError } = await supabase
      .from("assessment_invites")
      .select("*")
      .eq("id", inviteId)
      .maybeSingle();

    if (fetchError || !invite) throw new Error("Convite não encontrado no banco de dados.");

    let mailTo = invite.candidate_email ? String(invite.candidate_email).trim() : null;
    let candidateName = invite.candidate_name || "Candidato";

    if (!mailTo || !mailTo.includes("@")) {
        const { data: linkedReport } = await supabase
            .from("reports")
            .select("email, full_name")
            .or(`invite_id.eq.${inviteId},id.eq.${inviteId}`)
            .maybeSingle();
        
        if (linkedReport && linkedReport.email) {
            mailTo = linkedReport.email.trim();
            if (linkedReport.full_name) candidateName = linkedReport.full_name;
            
            await supabase.from("assessment_invites").update({ 
                candidate_email: mailTo,
                candidate_name: candidateName 
            }).eq("id", inviteId);
        }
    }

    if (!mailTo || !mailTo.includes("@")) {
         throw new Error(`E-mail não localizado para o candidato.`);
    }

    let token = invite.resume_token;
    if (!token) {
        token = crypto.randomUUID();
        await supabase.from("assessment_invites").update({ resume_token: token }).eq("id", inviteId);
    }

    const { data: settings } = await supabase
        .from("tenant_settings")
        .select("resend_api_key, mail_from")
        .eq("tenant_id", tenantId)
        .maybeSingle();

    const resendKey = settings?.resend_api_key || Deno.env.get("RESEND_API_KEY");
    if (!resendKey) throw new Error("API Key do Resend não configurada.");

    let mailFrom = String(settings?.mail_from || Deno.env.get("MAIL_FROM") || "Pessoa Certa <pessoacerta@idealhub.com.br>");

    const formUrl = `${origin}/index.html?resume_token=${token}`;

    const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
        body: JSON.stringify({
            from: mailFrom,
            to: mailTo,
            subject: `Ação Necessária: Envio de Currículo - ${candidateName}`,
            html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; border: 1px solid #eee; border-radius: 12px;">
                <div style="text-align: center; margin-bottom: 30px;">
                   <h2 style="color: #002855;">Pessoa Certa Analytics</h2>
                </div>
                <p>Olá, <strong>${candidateName}</strong>,</p>
                <p>Para darmos continuidade ao seu processo seletivo, precisamos que você complete suas informações e anexe seu currículo atualizado em nossa plataforma.</p>
                <div style="text-align: center; margin: 40px 0;">
                    <a href="${formUrl}" style="background-color: #E93D25; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">Preencher meu Currículo</a>
                </div>
                <p style="font-size: 12px; color: #888; text-align: center;">Se o botão não funcionar, copie este link: <br/> ${formUrl}</p>
            </div>
            `
        })
    });

    if (!res.ok) {
        throw new Error(`Resend Error: ${await res.text()}`);
    }

    await supabase.from("assessment_invites").update({ 
        resume_sent: true, 
        resume_sent_at: new Date().toISOString() 
    }).eq("id", inviteId);

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: any) {
    console.error("Send Resume Invite Error:", error.message);
    return new Response(JSON.stringify({ success: false, error: error.message }), { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});
