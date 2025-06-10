
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Parse the form data from Twilio
    const formData = await req.formData()
    const twilioData = Object.fromEntries(formData.entries())

    console.log('Received Twilio webhook:', twilioData)

    const {
      From: fromNumber,
      Body: messageBody,
      MessageSid: twilioMessageId,
      To: toNumber
    } = twilioData

    if (!fromNumber || !messageBody) {
      console.error('Missing required fields:', { fromNumber, messageBody })
      return new Response('Missing required fields', { status: 400, headers: corsHeaders })
    }

    // Normalize the phone number (remove +1 prefix for matching)
    const normalizedFrom = fromNumber.toString().replace(/^\+?1?/, '').replace(/\D/g, '')
    
    console.log('Looking for lead with phone number:', normalizedFrom)

    // Find the lead associated with this phone number
    const { data: phoneData, error: phoneError } = await supabase
      .from('phone_numbers')
      .select('lead_id, leads!inner(*)')
      .or(`number.ilike.%${normalizedFrom}%,number.ilike.%${fromNumber}%`)
      .limit(1)
      .single()

    if (phoneError || !phoneData) {
      console.error('No lead found for phone number:', normalizedFrom, phoneError)
      
      // Still return 200 to Twilio to avoid retries
      return new Response('Phone number not found in system', { 
        status: 200, 
        headers: corsHeaders 
      })
    }

    console.log('Found lead:', phoneData.lead_id)

    // Check if this message already exists (prevent duplicates)
    const { data: existingMessage } = await supabase
      .from('conversations')
      .select('id')
      .eq('twilio_message_id', twilioMessageId)
      .single()

    if (existingMessage) {
      console.log('Message already exists, skipping:', twilioMessageId)
      return new Response('Message already processed', { 
        status: 200, 
        headers: corsHeaders 
      })
    }

    // Insert the incoming message
    const { data: newMessage, error: insertError } = await supabase
      .from('conversations')
      .insert({
        lead_id: phoneData.lead_id,
        direction: 'in',
        body: messageBody.toString(),
        sent_at: new Date().toISOString(),
        sms_status: 'delivered',
        twilio_message_id: twilioMessageId.toString(),
        ai_generated: false
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting message:', insertError)
      return new Response('Database error', { status: 500, headers: corsHeaders })
    }

    console.log('Successfully processed incoming message:', newMessage.id)

    return new Response('Message processed successfully', { 
      status: 200, 
      headers: corsHeaders 
    })

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response('Internal server error', { 
      status: 500, 
      headers: corsHeaders 
    })
  }
})
