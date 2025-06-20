
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  vehicle_interest: string;
  ai_opt_in: boolean;
  ai_sequence_paused: boolean;
  ai_stage: string;
  ai_messages_sent: number;
  next_ai_send_at: string;
}

interface MessageTemplate {
  id: string;
  stage: string;
  template: string;
  variant_name: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🤖 [AI-AUTOMATION] Starting AI automation process...');
    
    const { automated = false } = await req.json().catch(() => ({ automated: false }));
    
    // Get current timestamp for due message checking
    const now = new Date().toISOString();
    console.log(`⏰ [AI-AUTOMATION] Current time: ${now}`);

    // 1. Get leads that are due for AI messages
    const { data: dueLeads, error: leadsError } = await supabase
      .from('leads')
      .select(`
        id,
        first_name,
        last_name,
        phone,
        vehicle_interest,
        ai_opt_in,
        ai_sequence_paused,
        ai_stage,
        ai_messages_sent,
        next_ai_send_at
      `)
      .eq('ai_opt_in', true)
      .eq('ai_sequence_paused', false)
      .not('next_ai_send_at', 'is', null)
      .lt('next_ai_send_at', now)
      .limit(20);

    if (leadsError) {
      console.error('❌ [AI-AUTOMATION] Error fetching due leads:', leadsError);
      throw leadsError;
    }

    console.log(`📋 [AI-AUTOMATION] Found ${dueLeads?.length || 0} leads due for messages`);

    if (!dueLeads || dueLeads.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No leads due for AI messages at this time',
        processed: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Get available message templates
    const { data: templates, error: templatesError } = await supabase
      .from('ai_message_templates')
      .select('*')
      .eq('is_active', true);

    if (templatesError) {
      console.error('❌ [AI-AUTOMATION] Error fetching templates:', templatesError);
      throw templatesError;
    }

    console.log(`📝 [AI-AUTOMATION] Found ${templates?.length || 0} active templates`);

    const results = [];

    // 3. Process each due lead
    for (const lead of dueLeads) {
      try {
        console.log(`👤 [AI-AUTOMATION] Processing lead: ${lead.first_name} ${lead.last_name} (${lead.vehicle_interest})`);
        
        // Skip if no phone number
        if (!lead.phone) {
          console.warn(`⚠️ [AI-AUTOMATION] Skipping lead ${lead.id} - no phone number`);
          
          // Try to get phone from phone_numbers table
          const { data: phoneData } = await supabase
            .from('phone_numbers')
            .select('number')
            .eq('lead_id', lead.id)
            .eq('is_primary', true)
            .maybeSingle();

          if (phoneData) {
            // Update the lead with the phone number
            await supabase
              .from('leads')
              .update({ phone: phoneData.number })
              .eq('id', lead.id);
            
            lead.phone = phoneData.number;
            console.log(`📱 [AI-AUTOMATION] Updated phone for lead ${lead.id}: ${phoneData.number}`);
          } else {
            results.push({ leadId: lead.id, success: false, error: 'No phone number found' });
            continue;
          }
        }

        // 4. Generate AI message
        const message = await generateAIMessage(lead, templates);
        if (!message) {
          console.warn(`⚠️ [AI-AUTOMATION] No message generated for lead ${lead.id}`);
          results.push({ leadId: lead.id, success: false, error: 'Failed to generate message' });
          continue;
        }

        console.log(`📤 [AI-AUTOMATION] Generated message for ${lead.first_name}: "${message}"`);

        // 5. Send the message via SMS
        const messageResult = await sendSMSMessage(lead.phone, message, lead.id);
        
        if (messageResult.success) {
          // 6. Update lead's AI tracking
          const nextStage = getNextAIStage(lead.ai_stage, lead.ai_messages_sent || 0);
          const nextSendTime = calculateNextSendTime(nextStage);

          await supabase
            .from('leads')
            .update({
              ai_messages_sent: (lead.ai_messages_sent || 0) + 1,
              ai_stage: nextStage,
              next_ai_send_at: nextSendTime,
              ai_last_message_stage: lead.ai_stage
            })
            .eq('id', lead.id);

          console.log(`✅ [AI-AUTOMATION] Successfully processed lead ${lead.id}. Next stage: ${nextStage}, Next send: ${nextSendTime}`);
          results.push({ leadId: lead.id, success: true, message, nextStage, nextSendTime });
        } else {
          console.error(`❌ [AI-AUTOMATION] Failed to send message to lead ${lead.id}:`, messageResult.error);
          results.push({ leadId: lead.id, success: false, error: messageResult.error });
        }

        // Add delay between messages to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error(`❌ [AI-AUTOMATION] Error processing lead ${lead.id}:`, error);
        results.push({ leadId: lead.id, success: false, error: error.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`🎯 [AI-AUTOMATION] Completed processing. Success: ${successCount}/${results.length}`);

    return new Response(JSON.stringify({
      success: true,
      processed: results.length,
      successful: successCount,
      failed: results.length - successCount,
      results: results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ [AI-AUTOMATION] Critical error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Generate AI message for a lead
async function generateAIMessage(lead: Lead, templates: MessageTemplate[]): Promise<string | null> {
  try {
    // Find appropriate template based on AI stage
    const currentStage = lead.ai_stage || 'initial';
    let template = templates.find(t => t.stage === currentStage);
    
    // Fallback to initial template if stage not found
    if (!template) {
      template = templates.find(t => t.stage === 'initial') || templates[0];
    }
    
    if (!template) {
      console.error('No templates available');
      return null;
    }

    // Replace template variables
    let message = template.template;
    message = message.replace(/\{\{firstName\}\}/g, lead.first_name || 'there');
    message = message.replace(/\{\{lastName\}\}/g, lead.last_name || '');
    message = message.replace(/\{\{vehicleInterest\}\}/g, lead.vehicle_interest || 'a vehicle');

    // If OpenAI is available, enhance the message
    if (openAIApiKey && message.length > 50) {
      try {
        const enhancedMessage = await enhanceMessageWithAI(message, lead);
        return enhancedMessage || message;
      } catch (aiError) {
        console.warn('AI enhancement failed, using template:', aiError);
        return message;
      }
    }

    return message;
  } catch (error) {
    console.error('Error generating AI message:', error);
    return null;
  }
}

// Enhance message with OpenAI
async function enhanceMessageWithAI(baseMessage: string, lead: Lead): Promise<string | null> {
  try {
    if (!openAIApiKey) return null;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are Finn, a friendly AI assistant for Jason Pilger Chevrolet. Enhance the following message to be more personalized and engaging while keeping it professional and conversational. The message should be warm, helpful, and focused on the customer's vehicle interest. Keep it under 160 characters for SMS. Do not change the core message intent.`
          },
          {
            role: 'user',
            content: `Enhance this message for ${lead.first_name} who is interested in ${lead.vehicle_interest}:\n\n${baseMessage}`
          }
        ],
        max_tokens: 100,
        temperature: 0.7
      }),
    });

    if (!response.ok) {
      console.warn('OpenAI API request failed:', response.status);
      return null;
    }

    const data = await response.json();
    return data.choices[0]?.message?.content?.trim() || null;
  } catch (error) {
    console.error('Error enhancing message with AI:', error);
    return null;
  }
}

// Send SMS message
async function sendSMSMessage(phone: string, message: string, leadId: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`📱 [AI-AUTOMATION] Sending SMS to ${phone}: "${message}"`);

    // Create conversation record
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .insert({
        lead_id: leadId,
        body: message,
        direction: 'out',
        sent_at: new Date().toISOString(),
        ai_generated: true,
        sms_status: 'pending'
      })
      .select()
      .single();

    if (conversationError) {
      throw new Error(`Failed to create conversation: ${conversationError.message}`);
    }

    // Send SMS via send-sms function
    const { data: smsResult, error: smsError } = await supabase.functions.invoke('send-sms', {
      body: {
        to: phone,
        body: message,
        conversationId: conversation.id
      }
    });

    if (smsError || !smsResult?.success) {
      // Update conversation with error
      await supabase
        .from('conversations')
        .update({ 
          sms_status: 'failed',
          sms_error: smsResult?.error || smsError?.message || 'SMS sending failed'
        })
        .eq('id', conversation.id);
      
      throw new Error(smsResult?.error || smsError?.message || 'SMS sending failed');
    }

    // Update conversation with success
    await supabase
      .from('conversations')
      .update({
        sms_status: 'sent',
        twilio_message_id: smsResult.telnyxMessageId || smsResult.messageSid
      })
      .eq('id', conversation.id);

    console.log(`✅ [AI-AUTOMATION] SMS sent successfully to ${phone}`);
    return { success: true };

  } catch (error) {
    console.error(`❌ [AI-AUTOMATION] SMS sending failed:`, error);
    return { success: false, error: error.message };
  }
}

// Determine next AI stage based on current stage and message count
function getNextAIStage(currentStage: string, messageCount: number): string {
  switch (currentStage) {
    case 'initial':
      return messageCount < 3 ? 'follow_up' : 'engagement';
    case 'follow_up':
      return messageCount < 5 ? 'engagement' : 'nurture';
    case 'engagement':
      return messageCount < 8 ? 'nurture' : 'closing';
    case 'nurture':
      return messageCount < 12 ? 'closing' : 'long_term_follow_up';
    case 'closing':
      return 'long_term_follow_up';
    default:
      return 'follow_up';
  }
}

// Calculate next send time based on stage
function calculateNextSendTime(stage: string): string {
  const now = new Date();
  let hoursToAdd = 24; // Default 24 hours

  switch (stage) {
    case 'initial':
    case 'follow_up':
      hoursToAdd = 24; // 1 day
      break;
    case 'engagement':
      hoursToAdd = 48; // 2 days
      break;
    case 'nurture':
      hoursToAdd = 72; // 3 days
      break;
    case 'closing':
      hoursToAdd = 96; // 4 days
      break;
    case 'long_term_follow_up':
      hoursToAdd = 168; // 1 week
      break;
  }

  now.setHours(now.getHours() + hoursToAdd);
  return now.toISOString();
}
