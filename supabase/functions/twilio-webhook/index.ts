import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const messageSid = webhookData.MessageSid
    const messageStatus = webhookData.MessageStatus
    const errorCode = webhookData.ErrorCode
    const errorMessage = webhookData.ErrorMessage

    if (!messageSid) {
      console.log('⚠️ No MessageSid in webhook, skipping');
      return new Response('OK', { status: 200, headers: corsHeaders })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

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

    console.log('✅ Webhook processed successfully');
    return new Response('OK', { status: 200, headers: corsHeaders })

  } catch (error) {
    console.error('💥 Error in twilio-webhook:', error);
    return new Response('OK', { status: 200, headers: corsHeaders })
  }
})