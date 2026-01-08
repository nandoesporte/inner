
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(options: any, handler: (req: Request) => Promise<Response>): void;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// URL DE PRODUÇÃO FIXA
const PRODUCTION_ORIGIN = "https://innermetrix-analytics-saas-879661972536.us-west1.run.app";

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
    const { tenantId, companyId, jobId, assessmentTypes, candidates, origin: clientOrigin, includeResume = true } = body;

    let origin = PRODUCTION_ORIGIN;
    
    if (clientOrigin && !clientOrigin.includes("usercontent.goog") && !clientOrigin.includes("localhost")) {
        origin = clientOrigin.replace(/\/+$/, "");
    }

    if (!tenantId || !companyId || !assessmentTypes || !Array.isArray(assessmentTypes) || assessmentTypes.length === 0 || !candidates) {
      throw new Error("Parâmetros obrigatórios ausentes ou inválidos.");
    }

    const { data: tenantSettings } = await supabase
      .from("tenant_settings")
      .select("resend_api_key, mail_from")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    const resendKey = tenantSettings?.resend_api_key || Deno.env.get("RESEND_API_KEY");
    if (!resendKey) throw new Error("API Key do Resend não configurada.");

    let mailFrom = String(tenantSettings?.mail_from || Deno.env.get("MAIL_FROM") || "Pessoa Certa <pessoacerta@idealhub.com.br>");

    // Fetch base links for external assessments
    const { data: assessmentLinks } = await supabase
        .from("assessment_links")
        .select("type, url")
        .eq("tenant_id", tenantId)
        .eq("is_active", true);

    const getBaseUrl = (type: string) => {
        let dbType = type === 'ADV' ? 'attributes' : type === 'IM_NR1' ? 'nr1' : 'psa';
        const found = assessmentLinks?.find((l: any) => l.type === dbType);
        return found ? found.url : `${origin}/index.html`; // Default internal if not found
    };

    const invitesPromises = candidates.map(async (c: any) => {
      const inviteId = crypto.randomUUID();
      const surveyToken = crypto.randomUUID(); // For PSA if selected
      const candidateName = String(c.name || "Candidato");
      
      let resumeToken = null;
      let resumeLink = null;

      if (includeResume) {
          resumeToken = crypto.randomUUID();
          resumeLink = `${origin}/index.html?resume_token=${resumeToken}`;
      }
      
      // Create Main Invite
      const inviteData = {
        id: inviteId,
        tenant_id: tenantId,
        company_id: companyId,
        job_role_id: jobId || null,
        candidate_name: candidateName,
        candidate_email: String(c.email || "").trim(),
        // Just store the first type or 'Multi' for legacy compatibility in table view
        assessment_type: assessmentTypes[0], 
        resume_token: resumeToken,
        survey_token: surveyToken, // PSA Token attached to main invite for simplicity
        nonce: crypto.randomUUID(),
        status: "pending",
        generated_link: "" // Will be populated if single link, else empty
      };

      await supabase.from("assessment_invites").insert(inviteData);

      // Process Assessments
      const generatedLinks: { type: string, url: string, label: string }[] = [];

      for (const type of assessmentTypes) {
          const subToken = crypto.randomUUID();
          let link = "";
          let label = "";

          if (type === 'PSA') {
              link = `${origin}/index.html?survey_token=${surveyToken}`;
              label = "Avaliação Psicossocial (PSA)";
          } else {
              const base = getBaseUrl(type);
              try {
                  const urlObj = new URL(base);
                  // Ensure params for tracking
                  urlObj.searchParams.set("invite_id", inviteId); 
                  urlObj.searchParams.set("fullname", candidateName);
                  // External systems often require specific params, assuming standard Innermetrix pattern or similar
                  link = urlObj.toString();
              } catch {
                  link = base;
              }
              label = type === 'ADV' ? "Avaliação de Liderança (Attribute Index)" : "Avaliação de Recrutamento (NR1)";
          }

          generatedLinks.push({ type, url: link, label });

          // Record sub-assessment
          await supabase.from("invite_assessments").insert({
              invite_id: inviteId,
              assessment_type: type,
              token: subToken, // Tracking token if needed
              status: 'pending'
          });
      }

      return {
          email: inviteData.candidate_email,
          name: inviteData.candidate_name,
          links: generatedLinks,
          resumeLink
      };
    });

    const emailPayloads = await Promise.all(invitesPromises);

    // Send Emails
    const emailPromises = emailPayloads.map(async (payload) => {
        if (!payload.email || !payload.email.includes("@")) return;

        const linksHtml = payload.links.map(l => `
            <div style="margin-bottom: 12px;">
                <a href="${l.url}" style="display: block; background:#f3f4f6; color:#002855; padding:12px 16px; text-decoration:none; border-radius:8px; font-weight:bold; border: 1px solid #e5e7eb;">
                   👉 ${l.label}
                </a>
            </div>
        `).join('');

        let resumeSection = '';
        if (payload.resumeLink) {
            resumeSection = `
            <div style="margin:24px 0; border-left: 4px solid #002855; padding-left: 16px;">
              <h3 style="margin:0 0 12px 0; color:#002855; font-size: 16px;">2. Envio de Currículo</h3>
              <a href="${payload.resumeLink}" style="background:#002855;color:#ffffff;padding:12px 20px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block;">
                 Enviar Currículo
              </a>
            </div>`;
        }

        const htmlContent = `
<div style="font-family:sans-serif;max-width:600px;margin:auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
  <div style="background:#002855;padding:24px;text-align:center;"><h1 style="color:#ffffff;font-size:20px;margin:0;">Pessoa Certa Analytics</h1></div>
  <div style="padding:32px;background:#ffffff;">
    <p>Olá, <strong>${payload.name}</strong>.</p>
    <p>Você foi convidado(a) a participar das seguintes etapas do nosso processo seletivo:</p>
    
    <div style="margin:24px 0; border-left: 4px solid #E93D25; padding-left: 16px;">
      <h3 style="margin:0 0 12px 0; color:#002855; font-size: 16px;">1. Avaliações Obrigatórias</h3>
      ${linksHtml}
    </div>

    ${resumeSection}
    
    <p style="font-size:12px; color:#6b7280; margin-top: 32px;">Tempo estimado total: ~25 minutos. Você pode responder no seu próprio ritmo.</p>
  </div>
  <div style="background:#f9fafb;padding:16px;text-align:center;font-size:11px;color:#9ca3af;">Pessoa Certa Analytics • Powered by Innermetrix</div>
</div>`;

        const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
            body: JSON.stringify({
                from: mailFrom,
                to: payload.email,
                subject: `Convite: Etapas de Avaliação${payload.resumeLink ? ' e Currículo' : ''} - ${payload.name}`,
                html: htmlContent
            }),
        });
        if (!res.ok) console.error(`Resend Error: ${await res.text()}`);
    });

    await Promise.all(emailPromises);

    return new Response(JSON.stringify({ success: true, sent: candidates.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 200, 
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});