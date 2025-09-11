import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper function to normalize phone numbers
function normalizePhoneNumber(phone: string): string {
  // Remove all non-digits and add +1 if not present
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  return `+${digits}`;
}

// Helper function to find or create lead by phone number
async function findOrCreateLead(supabase: any, phoneNumber: string) {
  const normalizedPhone = normalizePhoneNumber(phoneNumber);
  
  console.log(`🔍 Looking for lead with phone: ${normalizedPhone}`);
  
  // First, try to find existing lead by phone number
  const { data: phoneNumbers, error: phoneError } = await supabase
    .from('phone_numbers')
    .select('lead_id, leads!inner(id, first_name, last_name)')
    .eq('number', normalizedPhone)
    .limit(1);

  if (phoneError) {
    console.error('❌ Error finding phone number:', phoneError);
    throw phoneError;
  }

  if (phoneNumbers && phoneNumbers.length > 0) {
    const leadData = phoneNumbers[0].leads;
    console.log(`✅ Found existing lead: ${leadData.id} (${leadData.first_name} ${leadData.last_name})`);
    return leadData.id;
  }

  // No existing lead found, create a new one
  console.log(`📝 Creating new lead for phone: ${normalizedPhone}`);
  
  const { data: newLead, error: leadError } = await supabase
    .from('leads')
    .insert({
      first_name: 'Unknown',
      last_name: 'Caller',
      source: 'Inbound SMS',
      status: 'new',
      lead_status_type_name: 'New',
      lead_type_name: 'Inbound',
      lead_source_name: 'SMS',
      vehicle_interest: 'finding the right vehicle for your needs'
    })
    .select('id')
    .single();

  if (leadError) {
    console.error('❌ Error creating lead:', leadError);
    throw leadError;
  }

  // Add phone number to the new lead
  const { error: phoneInsertError } = await supabase
    .from('phone_numbers')
    .insert({
      lead_id: newLead.id,
      number: normalizedPhone,
      type: 'mobile',
      priority: 1,
      status: 'active',
      is_primary: true
    });

  if (phoneInsertError) {
    console.error('❌ Error adding phone number to lead:', phoneInsertError);
    // Don't throw here, lead was created successfully
  }

  console.log(`✅ Created new lead: ${newLead.id} for phone: ${normalizedPhone}`);
  return newLead.id;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('=== TWILIO WEBHOOK START ===');
    
    // Parse form-encoded webhook data from Twilio
    const formData = await req.formData()
    const webhookData: Record<string, string> = {}
    
    for (const [key, value] of formData.entries()) {
      webhookData[key] = value.toString()
    }

    console.log('📥 Twilio webhook received:', JSON.stringify(webhookData, null, 2));

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Determine webhook type: inbound message vs status update
    const messageSid = webhookData.MessageSid;
    const messageStatus = webhookData.MessageStatus;
    const messageBody = webhookData.Body;
    const fromNumber = webhookData.From;
    const toNumber = webhookData.To;

    if (!messageSid) {
      console.log('⚠️ No MessageSid in webhook, skipping');
      return new Response('OK', { status: 200, headers: corsHeaders })
    }

    // Check if this is an inbound message (has Body and From fields)
    if (messageBody && fromNumber && toNumber) {
      console.log(`📱 Processing INBOUND message from ${fromNumber} to ${toNumber}`);
      console.log(`📝 Message body: "${messageBody}"`);

      // Check for STOP/opt-out keywords before processing
      const stopKeywords = ['STOP', 'UNSUBSCRIBE', 'QUIT', 'CANCEL', 'END', 'OPTOUT', 'OPT-OUT'];
      const isOptOutMessage = stopKeywords.some(keyword => 
        messageBody.toUpperCase().trim() === keyword
      );

      if (isOptOutMessage) {
        const detectedKeyword = stopKeywords.find(keyword => 
          messageBody.toUpperCase().trim() === keyword
        ) || 'STOP';
        
        console.log(`🚫 [COMPLIANCE] STOP message detected from ${fromNumber}: "${messageBody}"`);
        
        try {
          // Find or create lead first to get lead ID
          const leadId = await findOrCreateLead(supabase, fromNumber);

          // Add to suppression list with lead ID
          await supabase
            .from('compliance_suppression_list')
            .insert({
              contact: normalizePhoneNumber(fromNumber),
              type: 'sms',
              reason: 'Customer opt-out via SMS',
              details: `Customer sent: "${messageBody}" (keyword: ${detectedKeyword})`,
              lead_id: leadId
            });

          console.log(`✅ [COMPLIANCE] Added ${fromNumber} to suppression list`);

          // Pause AI automation for this lead
          await supabase
            .from('leads')
            .update({
              ai_opt_in: false,
              ai_sequence_paused: true,
              ai_pause_reason: 'Customer opted out via STOP message',
              next_ai_send_at: null,
              status: 'opted_out',
              updated_at: new Date().toISOString()
            })
            .eq('id', leadId);

          // Log the opt-out audit trail
          await supabase
            .from('lead_consent_audit')
            .insert({
              lead_id: leadId,
              event_type: 'opt-out',
              channel: 'sms',
              event_metadata: { 
                reason: 'STOP message received', 
                message_body: messageBody,
                phone_number: fromNumber,
                keyword: detectedKeyword
              },
              performed_by: null
            });

          // Create conversation record for the STOP message
          await supabase
            .from('conversations')
            .insert({
              lead_id: leadId,
              body: messageBody,
              direction: 'in',
              sent_at: new Date().toISOString(),
              twilio_message_id: messageSid,
              sms_status: 'received',
              ai_generated: false
            });

          console.log('✅ [COMPLIANCE] STOP message processed successfully - NO AUTO-REPLY SENT');
          return new Response('OK', { status: 200, headers: corsHeaders });

        } catch (error) {
          console.error('❌ [COMPLIANCE] Error processing STOP message:', error);
          // Still return OK to Twilio to prevent retries
          return new Response('OK', { status: 200, headers: corsHeaders });
        }
      }

      try {
        // Find or create lead for the sender
        const leadId = await findOrCreateLead(supabase, fromNumber);

        // Create conversation record for inbound message
        const { data: conversation, error: conversationError } = await supabase
          .from('conversations')
          .insert({
            lead_id: leadId,
            body: messageBody,
            direction: 'in',
            sent_at: new Date().toISOString(),
            twilio_message_id: messageSid,
            sms_status: 'received',
            ai_generated: false
          })
          .select('id')
          .single();

        if (conversationError) {
          console.error('❌ Error creating inbound conversation:', conversationError);
          console.error('❌ Conversation error details:', JSON.stringify(conversationError, null, 2));
          return new Response('OK', { status: 200, headers: corsHeaders })
        }

        console.log(`✅ Created inbound conversation: ${conversation.id} for lead: ${leadId}`);
        
        // Update lead's last reply timestamp
        await supabase
          .from('leads')
          .update({ 
            last_reply_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', leadId);

        console.log('✅ Inbound message processed successfully - NO AUTO-REPLY SENT');
        console.log('🚫 IMPORTANT: If you see "OK" replies, they are NOT from this function');
        
        // Return empty TwiML to ensure NO automatic response
        return new Response(
          '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
          { 
            status: 200, 
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'text/xml' 
            } 
          }
        )

      } catch (error) {
        console.error('💥 Error processing inbound message:', error);
        return new Response('OK', { status: 200, headers: corsHeaders })
      }
    }

    // This is a status update webhook - handle existing logic
    if (messageStatus) {
      console.log(`📊 Processing STATUS UPDATE for MessageSid: ${messageSid}, Status: ${messageStatus}`);

      const errorCode = webhookData.ErrorCode;
      const errorMessage = webhookData.ErrorMessage;

      // Find conversation record by Twilio message SID
      const { data: conversations, error: findError } = await supabase
        .from('conversations')
        .select('id, lead_id, sms_status')
        .eq('twilio_message_id', messageSid)

      if (findError) {
        console.error('❌ Error finding conversation:', findError);
        return new Response('OK', { status: 200, headers: corsHeaders })
      }

      if (!conversations || conversations.length === 0) {
        console.log('⚠️ No conversation found for MessageSid:', messageSid);
        return new Response('OK', { status: 200, headers: corsHeaders })
      }

      const conversation = conversations[0]
      console.log(`📧 Updating conversation ${conversation.id} status from ${conversation.sms_status} to ${messageStatus}`);

      // Update conversation with delivery status
      const updateData: any = {
        sms_status: messageStatus,
        delivery_status_updated_at: new Date().toISOString()
      }

      // Add error information if present
      if (errorCode) {
        updateData.sms_error_code = errorCode
      }
      if (errorMessage) {
        updateData.sms_error_message = errorMessage
      }

      const { error: updateError } = await supabase
        .from('conversations')
        .update(updateData)
        .eq('id', conversation.id)

      if (updateError) {
        console.error('❌ Error updating conversation:', updateError);
        return new Response('OK', { status: 200, headers: corsHeaders })
      }

      // Log delivery status for monitoring
      const isSuccess = ['delivered', 'sent'].includes(messageStatus?.toLowerCase())
      const isFailure = ['failed', 'undelivered'].includes(messageStatus?.toLowerCase())

      if (isSuccess) {
        console.log('✅ SMS delivery confirmed:', messageSid);
      } else if (isFailure) {
        console.log('❌ SMS delivery failed:', {
          messageSid,
          status: messageStatus,
          errorCode,
          errorMessage
        });
      }

      console.log('✅ Status update processed successfully');
      return new Response('OK', { status: 200, headers: corsHeaders })
    }

    // Unknown webhook type
    console.log('⚠️ Unknown webhook type - neither inbound message nor status update');
    return new Response('OK', { status: 200, headers: corsHeaders })

  } catch (error) {
    console.error('💥 Error in twilio-webhook:', error);
    return new Response('OK', { status: 200, headers: corsHeaders })
  }
})