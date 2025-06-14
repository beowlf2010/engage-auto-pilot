
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InboundEmailPayload {
  to: string;
  from: string;
  subject: string;
  html?: string;
  text?: string;
  message_id: string;
  date: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload: InboundEmailPayload = await req.json();
    console.log('Received inbound email:', payload);

    // Extract sender email
    const senderEmail = payload.from;
    
    // Try to find a lead by email
    const { data: leads, error: leadError } = await supabase
      .from('leads')
      .select('id, first_name, last_name')
      .or(`email.eq.${senderEmail},email_alt.eq.${senderEmail}`)
      .limit(1);

    if (leadError) {
      console.error('Error finding lead:', leadError);
      return new Response(JSON.stringify({ error: 'Failed to find lead' }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    let leadId = null;
    if (leads && leads.length > 0) {
      leadId = leads[0].id;
      console.log(`Found lead: ${leads[0].first_name} ${leads[0].last_name} (${leadId})`);
    } else {
      console.log(`No lead found for email: ${senderEmail}`);
      // You could create a new lead here if desired
    }

    // Store the inbound email conversation
    if (leadId) {
      const { error: conversationError } = await supabase
        .from('email_conversations')
        .insert({
          lead_id: leadId,
          direction: 'in',
          subject: payload.subject || 'No Subject',
          body: payload.html || payload.text || '',
          sent_at: new Date(payload.date || new Date()).toISOString(),
          email_status: 'delivered',
          resend_message_id: payload.message_id
        });

      if (conversationError) {
        console.error('Error storing email conversation:', conversationError);
        return new Response(JSON.stringify({ error: 'Failed to store email' }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      console.log('Email conversation stored successfully');
    }

    return new Response(JSON.stringify({ success: true, leadFound: !!leadId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error: any) {
    console.error('Error processing inbound email:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
