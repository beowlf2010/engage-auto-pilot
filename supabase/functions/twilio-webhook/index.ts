
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const formData = await req.formData()
    const from = formData.get('From') as string
    const body = formData.get('Body') as string
    const messageId = formData.get('MessageSid') as string

    console.log('Received SMS from:', from, 'Body:', body)

    // Normalize the phone number
    const normalizedPhone = from.replace(/[^\d]/g, '')
    const formattedPhone = normalizedPhone.length === 10 ? `+1${normalizedPhone}` : `+${normalizedPhone}`

    // Find the lead by phone number
    const { data: phoneData, error: phoneError } = await supabase
      .from('phone_numbers')
      .select('lead_id')
      .eq('number', formattedPhone)
      .single()

    if (phoneError || !phoneData) {
      console.log('No lead found for phone number:', formattedPhone)
      return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' }
      })
    }

    // Store the incoming message
    const { error: msgError } = await supabase
      .from('conversations')
      .insert({
        lead_id: phoneData.lead_id,
        direction: 'in',
        body: body,
        sent_at: new Date().toISOString(),
        twilio_message_id: messageId
      })

    if (msgError) {
      console.error('Error storing message:', msgError)
      return new Response('Error', { status: 500, headers: corsHeaders })
    }

    // Extract and store memory from the incoming message
    await extractAndStoreMemory(phoneData.lead_id, body, 'in')

    console.log('Message stored successfully')

    return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' }
    })

  } catch (error) {
    console.error('Error processing webhook:', error)
    return new Response('Error', { status: 500, headers: corsHeaders })
  }
})

// Memory extraction function (simplified version)
async function extractAndStoreMemory(leadId: string, messageBody: string, direction: 'in' | 'out') {
  if (direction !== 'in') return;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const memories = [];
    const lowerMessage = messageBody.toLowerCase();

    // Extract preferences
    if (lowerMessage.includes('budget') || lowerMessage.includes('price') || lowerMessage.includes('afford')) {
      memories.push({
        lead_id: leadId,
        content: `Budget concerns mentioned in: "${messageBody}"`,
        memory_type: 'preference',
        confidence: 0.7
      });
    }

    if (lowerMessage.includes('financing') || lowerMessage.includes('payment') || lowerMessage.includes('loan')) {
      memories.push({
        lead_id: leadId,
        content: 'Interested in financing options',
        memory_type: 'preference',
        confidence: 0.8
      });
    }

    if (lowerMessage.includes('test drive') || lowerMessage.includes('see the car') || lowerMessage.includes('visit')) {
      memories.push({
        lead_id: leadId,
        content: 'Interested in test driving',
        memory_type: 'preference',
        confidence: 0.9
      });
    }

    // Store memories
    for (const memory of memories) {
      await supabase
        .from('conversation_memory')
        .insert(memory);
    }
  } catch (error) {
    console.error('Error storing conversation memory:', error);
  }
}
