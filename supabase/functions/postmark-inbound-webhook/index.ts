
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PostmarkInboundPayload {
  From: string;
  FromName: string;
  To: string;
  Subject: string;
  HtmlBody?: string;
  TextBody?: string;
  MessageID: string;
  Date: string;
}

// Extract clean email from "Name <email@domain.com>" format or plain email
function extractEmail(emailString: string): string {
  const emailRegex = /<([^>]+)>/;
  const match = emailString.match(emailRegex);
  return match ? match[1] : emailString.trim();
}

// Extract name from "Name <email@domain.com>" format
function extractName(emailString: string, fallbackName?: string): { firstName: string; lastName: string } {
  // If we have a FromName field, use that
  if (fallbackName && fallbackName.trim()) {
    const nameParts = fallbackName.trim().split(' ');
    return {
      firstName: nameParts[0] || 'Unknown',
      lastName: nameParts.slice(1).join(' ') || 'Customer'
    };
  }

  // Try to extract from email format
  const nameMatch = emailString.match(/^([^<]+)</);
  if (nameMatch) {
    const fullName = nameMatch[1].trim().replace(/"/g, '');
    const nameParts = fullName.split(' ');
    return {
      firstName: nameParts[0] || 'Unknown',
      lastName: nameParts.slice(1).join(' ') || 'Customer'
    };
  }
  return { firstName: 'Unknown', lastName: 'Customer' };
}

// Generate auto-reply content
function generateAutoReply(leadName: string): string {
  return `
    <p>Dear ${leadName},</p>
    
    <p>Thank you for your email! We have received your message and will get back to you shortly.</p>
    
    <p>If you have any urgent questions about our vehicles or would like to schedule a test drive, please don't hesitate to call us.</p>
    
    <p>Best regards,<br>
    Your Sales Team</p>
  `;
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

    const payload: PostmarkInboundPayload = await req.json();
    console.log('Received inbound email from Postmark:', payload);

    // Extract clean sender email and name
    const senderEmail = extractEmail(payload.From);
    const senderName = extractName(payload.From, payload.FromName);
    
    console.log('Parsed sender:', { email: senderEmail, name: senderName });

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
    let leadFirstName = '';
    let isNewLead = false;

    if (leads && leads.length > 0) {
      leadId = leads[0].id;
      leadFirstName = leads[0].first_name;
      console.log(`Found existing lead: ${leads[0].first_name} ${leads[0].last_name} (${leadId})`);
    } else {
      // Create new lead for unknown email address
      console.log(`Creating new lead for email: ${senderEmail}`);
      
      const { data: newLead, error: createError } = await supabase
        .from('leads')
        .insert({
          first_name: senderName.firstName,
          last_name: senderName.lastName,
          email: senderEmail,
          vehicle_interest: 'General Inquiry',
          source: 'Inbound Email',
          status: 'new'
        })
        .select('id, first_name')
        .single();

      if (createError) {
        console.error('Error creating new lead:', createError);
        return new Response(JSON.stringify({ error: 'Failed to create lead' }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      leadId = newLead.id;
      leadFirstName = newLead.first_name;
      isNewLead = true;
      console.log(`Created new lead: ${newLead.first_name} (${leadId})`);
    }

    // Clean and parse email content
    let emailBody = payload.HtmlBody || payload.TextBody || '';
    
    // Remove quoted text and signatures for cleaner storage
    emailBody = emailBody
      .split(/On .* wrote:|-----Original Message-----|From:.*To:/)[0]
      .trim();

    // Store the inbound email conversation
    const { error: conversationError } = await supabase
      .from('email_conversations')
      .insert({
        lead_id: leadId,
        direction: 'in',
        subject: payload.Subject || 'No Subject',
        body: emailBody,
        sent_at: new Date(payload.Date || new Date()).toISOString(),
        email_status: 'delivered',
        resend_message_id: payload.MessageID
      });

    if (conversationError) {
      console.error('Error storing email conversation:', conversationError);
      return new Response(JSON.stringify({ error: 'Failed to store email' }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log('Email conversation stored successfully');

    // Send auto-reply (in background)
    const autoReplySubject = `Re: ${payload.Subject || 'Your inquiry'}`;
    const autoReplyContent = generateAutoReply(leadFirstName);

    // Schedule auto-reply as background task
    EdgeRuntime.waitUntil(
      supabase.functions.invoke('send-email', {
        body: {
          to: senderEmail,
          subject: autoReplySubject,
          html: autoReplyContent,
          leadId: leadId
        }
      }).then((response) => {
        if (response.error) {
          console.error('Auto-reply failed:', response.error);
        } else {
          console.log('Auto-reply sent successfully');
        }
      }).catch((error) => {
        console.error('Auto-reply error:', error);
      })
    );

    return new Response(JSON.stringify({ 
      success: true, 
      leadFound: !isNewLead,
      leadCreated: isNewLead,
      leadId: leadId,
      autoReplySent: true
    }), {
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
