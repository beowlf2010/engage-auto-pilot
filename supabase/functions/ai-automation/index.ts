
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Starting AI automation job...')

    // Get leads ready for AI messages
    const { data: readyLeads, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .eq('ai_opt_in', true)
      .eq('ai_stage', 'approved')
      .lt('next_ai_send_at', new Date().toISOString())

    if (leadsError) {
      console.error('Error fetching ready leads:', leadsError)
      throw leadsError
    }

    console.log(`Found ${readyLeads?.length || 0} leads ready for AI messages`)

    // Process each lead
    for (const lead of readyLeads || []) {
      try {
        // Generate AI message using OpenAI
        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: 'You are a helpful car sales follow-up bot. Write brief, friendly, and professional follow-up messages.'
              },
              {
                role: 'user',
                content: `Write a brief friendly follow-up message to ${lead.first_name} about their vehicle interest in ${lead.vehicle_interest || 'a vehicle'}. Keep it under 160 characters and include a call to action.`
              }
            ],
            max_tokens: 100,
            temperature: 0.7
          })
        })

        if (!openaiResponse.ok) {
          console.error(`OpenAI API error for lead ${lead.id}:`, await openaiResponse.text())
          continue
        }

        const openaiData = await openaiResponse.json()
        const aiMessage = openaiData.choices[0]?.message?.content

        if (!aiMessage) {
          console.error(`No AI message generated for lead ${lead.id}`)
          continue
        }

        console.log(`Generated AI message for ${lead.first_name}: ${aiMessage}`)

        // Send the message via Twilio
        const twilioResponse = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${Deno.env.get('TWILIO_ACCOUNT_SID')}/Messages.json`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${btoa(`${Deno.env.get('TWILIO_ACCOUNT_SID')}:${Deno.env.get('TWILIO_AUTH_TOKEN')}`)}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            From: Deno.env.get('TWILIO_PHONE_NUMBER') || '',
            To: lead.phone,
            Body: aiMessage
          })
        })

        if (!twilioResponse.ok) {
          console.error(`Twilio error for lead ${lead.id}:`, await twilioResponse.text())
          continue
        }

        const twilioData = await twilioResponse.json()
        console.log(`Sent SMS to ${lead.first_name}: ${twilioData.sid}`)

        // Save the message to the database
        const { error: messageError } = await supabase
          .from('conversations')
          .insert({
            lead_id: lead.id,
            body: aiMessage,
            direction: 'out',
            sent_at: new Date().toISOString(),
            ai_generated: true,
            twilio_message_id: twilioData.sid,
            sms_status: 'sent'
          })

        if (messageError) {
          console.error('Error saving message:', messageError)
        }

        // Schedule next touch (update lead)
        const nextSendAt = new Date()
        nextSendAt.setDate(nextSendAt.getDate() + 1) // Next day

        const { error: updateError } = await supabase
          .from('leads')
          .update({
            next_ai_send_at: nextSendAt.toISOString(),
            ai_stage: 'scheduled'
          })
          .eq('id', lead.id)

        if (updateError) {
          console.error('Error updating lead:', updateError)
        }

        console.log(`Successfully processed lead ${lead.first_name} ${lead.last_name}`)

      } catch (error) {
        console.error(`Error processing lead ${lead.id}:`, error)
      }
    }

    // Update daily KPIs
    const { error: kpiError } = await supabase.rpc('update_daily_kpis')
    if (kpiError) {
      console.error('Error updating KPIs:', kpiError)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: readyLeads?.length || 0,
        message: 'AI automation completed successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('AI automation error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
