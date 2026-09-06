import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const OUTCOME_MAP: Record<string, string> = {
  "1": "Employed",
  "2": "Self-Employed",
  "3": "Unemployed",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // Accept either { trainee_id, reply_code, phone_number } (mock)
    // or a WhatsApp-style payload { From, Body } where Body is '1'/'2'/'3'
    let traineeId: string | undefined = body.trainee_id;
    const replyCode: string | undefined = body.reply_code ?? body.Body;
    const phoneNumber: string | undefined = body.phone_number ?? body.From;

    // If no trainee_id provided but phone_number is, look up the trainee
    if (!traineeId && phoneNumber) {
      const { data } = await supabase
        .from("trainees")
        .select("id")
        .eq("phone_number", phoneNumber)
        .maybeSingle();
      traineeId = data?.id;
    }

    if (!traineeId) {
      return new Response(
        JSON.stringify({ error: "Could not identify trainee. Provide trainee_id or a matching phone_number." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!replyCode || !OUTCOME_MAP[replyCode.trim()]) {
      return new Response(
        JSON.stringify({ error: `Invalid reply code '${replyCode}'. Expected '1', '2', or '3'.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const outcome = OUTCOME_MAP[replyCode.trim()];

    // Update the trainee's employment_outcome
    const { error: updateError } = await supabase
      .from("trainees")
      .update({ employment_outcome: outcome })
      .eq("id", traineeId);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Log the reply in whatsapp_survey_replies
    const { error: logError } = await supabase
      .from("whatsapp_survey_replies")
      .insert({
        trainee_id: traineeId,
        reply_code: replyCode.trim(),
        outcome,
        phone_number: phoneNumber ?? null,
        received_at: new Date().toISOString(),
      });

    if (logError) {
      return new Response(
        JSON.stringify({ error: logError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Insert a timeline event for the outcome
    await supabase.from("timeline_events").insert({
      trainee_id: traineeId,
      event_type: "WhatsApp Survey",
      event_date: new Date().toISOString().split("T")[0],
      title: `WhatsApp Survey Reply: ${outcome}`,
      description: `Trainee reported employment outcome '${outcome}' via WhatsApp survey (reply: ${replyCode.trim()}).`,
    });

    return new Response(
      JSON.stringify({ success: true, trainee_id: traineeId, outcome }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
