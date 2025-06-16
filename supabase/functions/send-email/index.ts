
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, html, text, from }: EmailRequest = await req.json();

    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ error: "Missing required fields (to, subject, html)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const postmarkApiKey = Deno.env.get("POSTMARK_API_KEY");
    if (!postmarkApiKey) {
      throw new Error("POSTMARK_API_KEY not configured");
    }

    // Use a default sender address if not provided
    const sender = from || "CRM <noreply@yourdomain.com>";

    const postmarkPayload = {
      From: sender,
      To: to,
      Subject: subject,
      HtmlBody: html,
      TextBody: text || "",
      MessageStream: "outbound"
    };

    const postmarkResponse = await fetch("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": postmarkApiKey
      },
      body: JSON.stringify(postmarkPayload)
    });

    if (!postmarkResponse.ok) {
      const errorData = await postmarkResponse.json();
      throw new Error(`Postmark API error: ${errorData.Message || 'Unknown error'}`);
    }

    const emailResponse = await postmarkResponse.json();

    console.log("Email sent successfully via Postmark:", emailResponse);

    return new Response(JSON.stringify({ success: true, result: emailResponse }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in send-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
