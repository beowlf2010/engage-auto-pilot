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
  message_intensity: string;
  created_at: string;
  ai_enabled_at: string;
}

interface MessageTemplate {
  id: string;
  stage: string;
  template: string;
  variant_name: string;
}

// Name formatting utilities (copied from frontend)
const formatProperName = (name: string): string => {
  if (!name || typeof name !== 'string') return '';
  
  const trimmed = name.trim();
  if (!trimmed) return '';
  
  return trimmed
    .split(' ')
    .map(part => formatNamePart(part))
    .join(' ');
};

const formatNamePart = (part: string): string => {
  if (!part) return '';
  
  const lower = part.toLowerCase();
  
  if (lower.includes('-')) {
    return lower
      .split('-')
      .map(segment => capitalizeSegment(segment))
      .join('-');
  }
  
  if (lower.includes("'")) {
    return lower
      .split("'")
      .map((segment, index) => {
        if (index === 0) return capitalizeSegment(segment);
        return capitalizeSegment(segment);
      })
      .join("'");
  }
  
  if (lower.startsWith('mc') && lower.length > 2) {
    return 'Mc' + capitalizeSegment(lower.slice(2));
  }
  
  if (lower.startsWith('mac') && lower.length > 3) {
    return 'Mac' + capitalizeSegment(lower.slice(3));
  }
  
  return capitalizeSegment(lower);
};

const capitalizeSegment = (segment: string): string => {
  if (!segment) return '';
  return segment.charAt(0).toUpperCase() + segment.slice(1);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🤖 [AI-AUTOMATION] Starting unified AI automation process...');
    
    const { automated = false } = await req.json().catch(() => ({ automated: false }));
    
    // Get current timestamp for due message checking
    const now = new Date().toISOString();
    console.log(`⏰ [AI-AUTOMATION] Current time: ${now}`);

    // 1. Auto-pause sequences when leads reply (last 5 minutes)
    await pauseSequencesForRepliedLeads();

    // 2. Set new uncontacted leads to super aggressive mode for first day
    await setNewLeadsToSuperAggressive();

    // 3. Get leads that are due for AI messages OR new leads needing first contact
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
        next_ai_send_at,
        message_intensity,
        created_at,
        ai_enabled_at
      `)
      .eq('ai_opt_in', true)
      .eq('ai_sequence_paused', false)
      .or(`next_ai_send_at.lt.${now},and(ai_messages_sent.is.null,next_ai_send_at.is.null),and(ai_messages_sent.eq.0,next_ai_send_at.is.null)`)
      .limit(30);

    if (leadsError) {
      console.error('❌ [AI-AUTOMATION] Error fetching leads:', leadsError);
      throw leadsError;
    }

    console.log(`📋 [AI-AUTOMATION] Found ${dueLeads?.length || 0} leads for processing`);

    if (!dueLeads || dueLeads.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No leads due for AI messages at this time',
        processed: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Get available message templates
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

    // 5. Process each lead
    for (const lead of dueLeads) {
      try {
        // Format lead name properly
        const formattedFirstName = formatProperName(lead.first_name);
        const formattedLastName = formatProperName(lead.last_name);
        
        const intensity = lead.message_intensity || 'gentle';
        const messagesSent = lead.ai_messages_sent || 0;
        const isSuperAggressive = intensity === 'super_aggressive';
        
        console.log(`👤 [AI-AUTOMATION] Processing lead: ${formattedFirstName} ${formattedLastName} (${lead.vehicle_interest}) - Intensity: ${intensity} - Messages: ${messagesSent}`);
        
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

        // Skip leads with unknown vehicle interest
        if (!lead.vehicle_interest || 
            lead.vehicle_interest.toLowerCase().includes('unknown') ||
            lead.vehicle_interest.trim() === '') {
          console.warn(`⚠️ [AI-AUTOMATION] Skipping lead with unknown vehicle interest: ${formattedFirstName}`);
          results.push({ leadId: lead.id, success: false, error: 'Unknown vehicle interest' });
          continue;
        }

        // 6. Generate AI message based on intensity and first-day logic
        const message = await generateAIMessage(lead, templates);
        if (!message) {
          console.warn(`⚠️ [AI-AUTOMATION] No message generated for lead ${lead.id}`);
          results.push({ leadId: lead.id, success: false, error: 'Failed to generate message' });
          continue;
        }

        // Additional validation to ensure no "Unknown" vehicles in message
        if (message.includes('Unknown') || message.toLowerCase().includes('unknown')) {
          console.warn(`⚠️ [AI-AUTOMATION] Skipping message with unknown vehicle for ${formattedFirstName}`);
          results.push({ leadId: lead.id, success: false, error: 'Message contains unknown vehicle' });
          continue;
        }

        console.log(`📤 [AI-AUTOMATION] Sending ${intensity} message to ${formattedFirstName}: "${message}"`);

        // 7. Send the message via SMS
        const messageResult = await sendSMSMessage(lead.phone, message, lead.id);
        
        if (messageResult.success) {
          // 8. Update lead's AI tracking with super aggressive timing
          await updateLeadAfterMessage(lead);

          console.log(`✅ [AI-AUTOMATION] Successfully processed lead ${lead.id}`);
          results.push({ leadId: lead.id, success: true, message });
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

// Auto-pause AI sequences when leads reply
async function pauseSequencesForRepliedLeads() {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  
  const { data: recentReplies } = await supabase
    .from('conversations')
    .select('lead_id, sent_at')
    .eq('direction', 'in')
    .gte('sent_at', fiveMinutesAgo)
    .order('sent_at', { ascending: false });

  if (recentReplies && recentReplies.length > 0) {
    const leadIds = [...new Set(recentReplies.map(r => r.lead_id))];
    
    await supabase
      .from('leads')
      .update({
        ai_sequence_paused: true,
        ai_pause_reason: 'Customer replied - human review needed',
        next_ai_send_at: null
      })
      .in('id', leadIds)
      .eq('ai_opt_in', true)
      .eq('ai_sequence_paused', false);

    console.log(`⏸️ [AI-AUTOMATION] Auto-paused ${leadIds.length} sequences due to replies`);
  }
}

// Set new uncontacted leads to super aggressive mode for first day
async function setNewLeadsToSuperAggressive() {
  const now = new Date();
  const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000).toISOString();
  
  // Set leads that were just enabled for AI to super aggressive
  await supabase
    .from('leads')
    .update({ message_intensity: 'super_aggressive' })
    .eq('ai_opt_in', true)
    .eq('ai_sequence_paused', false)
    .or('ai_messages_sent.is.null,ai_messages_sent.eq.0')
    .gte('ai_enabled_at', thirtyMinutesAgo);

  console.log(`🔥 [AI-AUTOMATION] Set recently enabled leads to super aggressive mode`);
}

// Generate AI message for a lead based on intensity and first-day logic
async function generateAIMessage(lead: Lead, templates: MessageTemplate[]): Promise<string | null> {
  try {
    const messagesSent = lead.ai_messages_sent || 0;
    const isSuperAggressive = lead.message_intensity === 'super_aggressive';
    const isAggressive = lead.message_intensity === 'aggressive';
    const isNewLead = messagesSent === 0;
    
    let message: string;
    
    if (isSuperAggressive) {
      message = generateSuperAggressiveMessage(lead, messagesSent);
    } else if (isAggressive) {
      message = generateAggressiveMessage(lead, messagesSent);
    } else {
      message = generateGentleMessage(lead, messagesSent);
    }

    // If OpenAI is available and message is substantial, enhance it
    if (openAIApiKey && message.length > 50 && !isNewLead) {
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

// Generate super aggressive messages for first-day contact (3 messages in first day)
function generateSuperAggressiveMessage(lead: Lead, messagesSent: number): string {
  const vehicleInterest = lead.vehicle_interest || 'a vehicle';
  const firstName = formatProperName(lead.first_name) || 'there';
  
  const firstDayTemplates = [
    // Message 1 (immediate, within 30 minutes)
    `Hi ${firstName}! I'm Finn with Jason Pilger Chevrolet. I see you're interested in ${vehicleInterest} - I've got some exciting options to show you! When would be a good time to chat?`,
    
    // Message 2 (2-3 hours later)
    `${firstName}, just wanted to follow up on the ${vehicleInterest}. We actually have a few that just came in that I think you'd love. Are you available for a quick call to go over the details?`,
    
    // Message 3 (4-6 hours after message 2)
    `Hi ${firstName}! Don't want you to miss out on the perfect ${vehicleInterest}. These are moving fast today. Can we set up a time to take a look? Even a quick 15-minute visit could save you thousands!`
  ];
  
  // Cycle through first day templates, then fall back to regular aggressive
  const templateIndex = messagesSent < firstDayTemplates.length ? messagesSent : (messagesSent % 3);
  return firstDayTemplates[templateIndex] || generateAggressiveMessage(lead, messagesSent);
}

// Generate aggressive messages for uncontacted leads
function generateAggressiveMessage(lead: Lead, messagesSent: number): string {
  const vehicleInterest = lead.vehicle_interest || 'a vehicle';
  const firstName = formatProperName(lead.first_name) || 'there';
  
  const templates = [
    `Hi ${firstName}! I see you're interested in ${vehicleInterest}. We have some great options available right now. When can you come take a look?`,
    `${firstName}, that ${vehicleInterest} won't last long! We've had several people ask about it today. Want to secure it with a quick visit?`,
    `Hey ${firstName}! Great news - we have special financing available on ${vehicleInterest} this week. Interested in learning more?`,
    `${firstName}, this might be your final opportunity on the ${vehicleInterest}. Don't miss out! Available for a quick call today?`,
    `Hi ${firstName}! Last chance - the ${vehicleInterest} you inquired about is being considered by another customer. Still interested?`
  ];
  
  const templateIndex = messagesSent % templates.length;
  return templates[templateIndex];
}

// Generate gentle messages for engaged leads
function generateGentleMessage(lead: Lead, messagesSent: number): string {
  const vehicleInterest = lead.vehicle_interest || 'a vehicle';
  const firstName = formatProperName(lead.first_name) || 'there';
  
  const templates = [
    `Hi ${firstName}, hope you're doing well! Still thinking about ${vehicleInterest}? Happy to answer any questions.`,
    `${firstName}, just wanted to follow up on ${vehicleInterest}. Any questions I can help with?`,
    `Hi ${firstName}, hope you found what you were looking for! If you're still interested in ${vehicleInterest}, we're here to help.`
  ];
  
  const templateIndex = messagesSent % templates.length;
  return templates[templateIndex];
}

// Enhance message with OpenAI
async function enhanceMessageWithAI(baseMessage: string, lead: Lead): Promise<string | null> {
  try {
    if (!openAIApiKey) return null;

    const formattedFirstName = formatProperName(lead.first_name);

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
            content: `Enhance this message for ${formattedFirstName} who is interested in ${lead.vehicle_interest}:\n\n${baseMessage}`
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

// Update lead after sending message with super aggressive timing
async function updateLeadAfterMessage(lead: Lead): Promise<void> {
  try {
    const messagesSent = (lead.ai_messages_sent || 0) + 1;
    const isSuperAggressive = lead.message_intensity === 'super_aggressive';
    const isAggressive = lead.message_intensity === 'aggressive';
    
    // Calculate next send time based on intensity and first-day logic
    const nextSendAt = calculateNextSendTime(isSuperAggressive, isAggressive, messagesSent);
    const nextStage = getNextAIStage(lead.ai_stage, messagesSent, isSuperAggressive || isAggressive);

    // Switch from super aggressive to regular aggressive after 3 messages
    let newIntensity = lead.message_intensity;
    if (isSuperAggressive && messagesSent >= 3) {
      newIntensity = 'aggressive';
      console.log(`🔄 [AI-AUTOMATION] Switching lead ${lead.id} from super_aggressive to aggressive after 3 messages`);
    }

    const { error } = await supabase
      .from('leads')
      .update({
        ai_messages_sent: messagesSent,
        next_ai_send_at: nextSendAt,
        ai_stage: nextStage,
        ai_last_message_stage: lead.ai_stage,
        message_intensity: newIntensity
      })
      .eq('id', lead.id);

    if (error) {
      console.error(`Error updating lead ${lead.id} after message:`, error);
    } else {
      console.log(`✅ Updated lead ${lead.id}: messages=${messagesSent}, next_send=${nextSendAt}, stage=${nextStage}, intensity=${newIntensity}`);
    }

  } catch (error) {
    console.error(`Error in updateLeadAfterMessage for lead ${lead.id}:`, error);
  }
}

// Calculate next send time with super aggressive first-day timing
function calculateNextSendTime(isSuperAggressive: boolean, isAggressive: boolean, messagesSent: number): string {
  const now = new Date();
  
  // Central Time business hours (8 AM - 8 PM for super aggressive, 8 AM - 7 PM for others)
  const centralOffset = 6; // UTC-6 for Central Standard Time
  const businessStart = 8; // 8 AM Central
  const businessEnd = isSuperAggressive ? 20 : 19; // 8 PM for super aggressive, 7 PM for others
  
  let hoursToAdd: number;
  
  if (isSuperAggressive && messagesSent <= 3) {
    // Super aggressive first-day timing
    if (messagesSent === 1) {
      hoursToAdd = 2 + Math.random() * 1; // 2-3 hours after first message
    } else if (messagesSent === 2) {
      hoursToAdd = 4 + Math.random() * 2; // 4-6 hours after second message
    } else {
      hoursToAdd = 24 + Math.random() * 24; // Switch to regular timing after 3 messages
    }
  } else if (isAggressive) {
    // Regular aggressive: 2-4 hours between messages
    hoursToAdd = 2 + Math.random() * 2;
  } else {
    // Gentle: 24-48 hours between messages
    hoursToAdd = 24 + Math.random() * 24;
  }
  
  const nextSendAt = new Date(now.getTime() + (hoursToAdd * 60 * 60 * 1000));
  
  // For super aggressive first-day messages, be more flexible with business hours
  if (isSuperAggressive && messagesSent <= 3) {
    const centralHour = (nextSendAt.getUTCHours() - centralOffset + 24) % 24;
    
    // Only pause overnight (8 PM - 8 AM)
    if (centralHour >= businessEnd || centralHour < businessStart) {
      // If it's after 8 PM, schedule for 8 AM next day
      // If it's before 8 AM, schedule for 8 AM same day
      if (centralHour >= businessEnd) {
        nextSendAt.setDate(nextSendAt.getDate() + 1);
      }
      nextSendAt.setUTCHours((businessStart + centralOffset) % 24, 0, 0, 0);
    }
  } else {
    // Apply regular business hours for non-super-aggressive messages
    const centralHour = (nextSendAt.getUTCHours() - centralOffset + 24) % 24;
    
    if (centralHour < businessStart) {
      nextSendAt.setUTCHours((businessStart + centralOffset) % 24, 0, 0, 0);
    } else if (centralHour >= businessEnd) {
      nextSendAt.setDate(nextSendAt.getDate() + 1);
      nextSendAt.setUTCHours((businessStart + centralOffset) % 24, 0, 0, 0);
    }
  }
  
  return nextSendAt.toISOString();
}

// Determine next AI stage based on current stage, message count, and intensity
function getNextAIStage(currentStage: string, messageCount: number, isSuperAggressive: boolean): string {
  if (isSuperAggressive) {
    if (messageCount <= 2) return 'super_aggressive_initial';
    if (messageCount <= 5) return 'super_aggressive_urgency';
    if (messageCount <= 8) return 'super_aggressive_deals';
    return 'super_aggressive_final';
  } else {
    if (messageCount <= 2) return 'gentle_follow_up';
    if (messageCount <= 4) return 'gentle_nurture';
    return 'gentle_maintenance';
  }
}
