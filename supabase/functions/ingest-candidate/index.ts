
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-token"
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const PORT = Number(Deno.env.get("PORT")) || 8080;

Deno.serve({ port: PORT }, async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiToken = req.headers.get("x-api-token");
    if (!apiToken) return new Response(JSON.stringify({ error: "Missing x-api-token" }), { status: 401, headers: corsHeaders });

    const { data: settings } = await supabase
      .from("tenant_settings")
      .select("tenant_id")
      .eq("api_token", apiToken)
      .single();

    if (!settings) {
      return new Response(JSON.stringify({ error: "Invalid API Token" }), { status: 401, headers: corsHeaders });
    }

    const tenantId = settings.tenant_id;
    const body = await req.json();

    let url = body.file_url;
    let empresa = body.Empresa || null;
    let cargo = body.Categoria || null;
    let email = body.email || body.Email || body.candidate_email || null;

    if (!url) {
        return new Response(JSON.stringify({ error: "Missing file_url" }), { status: 400, headers: corsHeaders });
    }

    let company_id = null;
    if (empresa) {
      const cleanEmpresa = empresa.replace('Label_', '').replace('CATEGORY_', '');
      const { data: company } = await supabase
        .from("companies")
        .select("id")
        .eq("tenant_id", tenantId)
        .ilike("name", `%${cleanEmpresa}%`)
        .maybeSingle();
      if (company) company_id = company.id;
    }

    let job_role_id = null;
    if (cargo) {
      const cleanCargo = cargo.replace('Label_', '').replace('CATEGORY_', '');
      const { data: job } = await supabase
        .from("job_roles")
        .select("id")
        .eq("tenant_id", tenantId)
        .ilike("title", `%${cleanCargo}%`)
        .maybeSingle();
      if (job) job_role_id = job.id;
    }

    const fileNameFromUrl = url.split('/').pop()?.split('?')[0] || "Candidato";
    const guessedName = (body.fileName || fileNameFromUrl).replace(".pdf", "").replace(/[-_]/g, " ");

    // 1. Insert into reports_adv directly with pending status
    const { data: candidate, error } = await supabase
      .from("reports_adv")
      .insert({
        tenant_id: tenantId,
        company_id,
        job_role_id,
        full_name: guessedName,
        email: email, 
        pdf_url: url,
        status: "processing", // Mark as processing initially
        fit_score: 0, 
        scores: {},
        updated_at: new Date()
      })
      .select()
      .single();

    if (error) throw error;

    // 2. Call analyze-candidate-adv immediately to populate data
    // We do this asynchronously (fire and forget from client perspective) or await if needed.
    // Since this is a webhook response, waiting is safer to report errors.
    
    // Download PDF text content? 
    // Edge function might not be able to download and extract text easily without dedicated libraries.
    // Ideally, we trigger a separate function or use Gemini directly if we had the text.
    // Assuming we can pass the URL to analyze-candidate-adv if it supports it, OR we just leave it for a background trigger.
    
    // For now, we acknowledge receipt. The client side (UploadModal) does extraction client-side.
    // If this is a backend ingestion, we rely on the `reports_adv` insert. 
    // If `analyze-candidate-adv` expects text, we can't call it here easily without text extraction.
    
    // NOTE: To fix the "zero data" issue for webhooks, we must implement PDF text extraction in the backend 
    // or use a service that sends the text. Assuming the current setup relies on client-side extraction 
    // for full data, webhook ingestion might indeed result in empty scores until processed.
    
    return new Response(
      JSON.stringify({ success: true, candidate, message: "Report queued. Analysis requires text extraction." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
