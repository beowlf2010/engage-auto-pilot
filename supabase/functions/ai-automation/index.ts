
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

    console.log('Starting enhanced Finn AI automation job...')

    // Resume any paused sequences that should resume
    await resumePausedSequences(supabase)

    // Get leads ready for AI messages using the enhanced system
    const { data: readyLeads, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .eq('ai_opt_in', true)
      .eq('ai_sequence_paused', false)
      .not('next_ai_send_at', 'is', null)
      .lte('next_ai_send_at', new Date().toISOString())
      .limit(10)

    if (leadsError) {
      console.error('Error fetching ready leads:', leadsError)
      throw leadsError
    }

    console.log(`Found ${readyLeads?.length || 0} leads ready for enhanced AI messages`)

    // Process each lead with enhanced AI
    for (const lead of readyLeads || []) {
      try {
        const message = await generateEnhancedAIMessage(supabase, lead.id)
        
        if (message) {
          // Send the AI-generated message via Twilio
          const twilioResponse = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${Deno.env.get('TWILIO_ACCOUNT_SID')}/Messages.json`, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${btoa(`${Deno.env.get('TWILIO_ACCOUNT_SID')}:${Deno.env.get('TWILIO_AUTH_TOKEN')}`)}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              From: Deno.env.get('TWILIO_PHONE_NUMBER') || '',
              To: lead.phone,
              Body: message
            })
          })

          if (!twilioResponse.ok) {
            console.error(`Twilio error for lead ${lead.id}:`, await twilioResponse.text())
            continue
          }

          const twilioData = await twilioResponse.json()
          console.log(`Sent enhanced AI SMS to ${lead.first_name}: ${twilioData.sid}`)

          // Save the message to the database
          const { error: messageError } = await supabase
            .from('conversations')
            .insert({
              lead_id: lead.id,
              body: message,
              direction: 'out',
              sent_at: new Date().toISOString(),
              ai_generated: true,
              twilio_message_id: twilioData.sid,
              sms_status: 'sent'
            })

          if (messageError) {
            console.error('Error saving message:', messageError)
          }

          // Update message count and schedule next message
          const currentCount = lead.ai_messages_sent || 0
          await supabase
            .from('leads')
            .update({
              ai_messages_sent: currentCount + 1
            })
            .eq('id', lead.id)

          // Schedule next message using enhanced logic
          await scheduleNextEnhancedMessage(supabase, lead.id)

          console.log(`Successfully processed enhanced message for ${lead.first_name} ${lead.last_name}`)

        } else {
          // No more messages, pause sequence
          await supabase
            .from('leads')
            .update({
              next_ai_send_at: null,
              ai_sequence_paused: true,
              ai_pause_reason: 'sequence_completed'
            })
            .eq('id', lead.id)
        }

      } catch (error) {
        console.error(`Error processing enhanced message for lead ${lead.id}:`, error)
      }
    }

    // Check for behavioral triggers
    await processBehavioralTriggers(supabase)

    // Update inventory-based triggers
    await processInventoryTriggers(supabase)

    // Update daily KPIs
    const { error: kpiError } = await supabase.rpc('update_daily_kpis')
    if (kpiError) {
      console.error('Error updating KPIs:', kpiError)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: readyLeads?.length || 0,
        message: 'Enhanced Finn AI automation completed successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Enhanced AI automation error:', error)
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

// Enhanced AI message generation using advanced templates and personalization
async function generateEnhancedAIMessage(supabase: any, leadId: string): Promise<string | null> {
  try {
    // Get lead data with behavioral patterns
    const { data: lead } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single()

    if (!lead) return null

    // Get lead's response patterns for personalization
    const { data: patterns } = await supabase
      .from('lead_response_patterns')
      .select('*')
      .eq('lead_id', leadId)
      .single()

    // Get conversation memory for context
    const { data: memory } = await supabase
      .from('conversation_memory')
      .select('*')
      .eq('lead_id', leadId)
      .order('confidence', { ascending: false })
      .limit(5)

    // Get matching inventory with current market data
    const matchingInventory = await getEnhancedInventoryMatches(supabase, leadId)

    // Select best template based on performance and lead patterns
    const template = await selectOptimalTemplate(supabase, lead.ai_stage || 'day_1_morning', leadId, patterns)
    
    if (!template) return null

    // Generate market intelligence context
    const marketContext = await getMarketIntelligence(supabase, lead.vehicle_interest)

    // Build personalized message using OpenAI with enhanced context
    const personalizedMessage = await generatePersonalizedMessage(
      lead,
      template,
      memory || [],
      matchingInventory,
      marketContext,
      patterns
    )

    // Track message analytics
    await supabase
      .from('ai_message_analytics')
      .insert({
        lead_id: leadId,
        template_id: template.id,
        message_content: personalizedMessage,
        message_stage: lead.ai_stage,
        day_of_week: new Date().getDay(),
        hour_of_day: new Date().getHours(),
        inventory_mentioned: matchingInventory.length > 0 ? matchingInventory.slice(0, 3) : null
      })

    return personalizedMessage

  } catch (error) {
    console.error('Error generating enhanced AI message:', error)
    return null
  }
}

// Get enhanced inventory matches with market intelligence
async function getEnhancedInventoryMatches(supabase: any, leadId: string) {
  const { data: matches } = await supabase.rpc('find_matching_inventory', { p_lead_id: leadId })
  
  // Add market intelligence to matches
  for (const match of matches || []) {
    // Add days on lot calculation
    const { data: inventory } = await supabase
      .from('inventory')
      .select('created_at, price')
      .eq('id', match.inventory_id)
      .single()
    
    if (inventory) {
      const daysOnLot = Math.floor((new Date().getTime() - new Date(inventory.created_at).getTime()) / (1000 * 60 * 60 * 24))
      match.days_on_lot = daysOnLot
      match.urgency_level = daysOnLot > 60 ? 'high' : daysOnLot > 30 ? 'medium' : 'low'
    }
  }
  
  return matches || []
}

// Select optimal template based on performance and lead behavior
async function selectOptimalTemplate(supabase: any, stage: string, leadId: string, patterns: any) {
  const { data: templates } = await supabase
    .from('ai_message_templates')
    .select('*')
    .eq('stage', stage)
    .eq('is_active', true)
    .order('response_rate', { ascending: false })

  if (!templates || templates.length === 0) return null

  // Use behavioral patterns to select best template
  if (patterns?.preferred_content_types?.length > 0) {
    const preferredTemplate = templates.find(t => 
      patterns.preferred_content_types.includes(t.variant_name)
    )
    if (preferredTemplate) return preferredTemplate
  }

  // A/B testing logic - favor high performers but explore others
  const totalSent = templates.reduce((sum: number, t: any) => sum + t.total_sent, 0)
  
  if (totalSent < 100) {
    return templates[Math.floor(Math.random() * templates.length)]
  }

  const rand = Math.random()
  if (rand < 0.8) {
    return templates[Math.floor(Math.random() * Math.min(2, templates.length))]
  } else {
    return templates[Math.floor(Math.random() * templates.length)]
  }
}

// Generate personalized message using OpenAI with enhanced context
async function generatePersonalizedMessage(lead: any, template: any, memory: any[], inventory: any[], marketContext: any, patterns: any): Promise<string> {
  const memoryContext = memory.map(m => m.content).join('. ')
  const inventoryContext = inventory.length > 0 ? 
    `Available: ${inventory[0].year} ${inventory[0].make} ${inventory[0].model} at $${inventory[0].price?.toLocaleString()} (${inventory[0].urgency_level} urgency)` : 
    'Various vehicles available'

  const personalityProfile = patterns ? 
    `Communication style: ${patterns.best_response_hours?.length > 2 ? 'frequent responder' : 'selective responder'}` : 
    'Standard approach'

  const prompt = `You are Finn, an expert car sales AI. Generate a personalized follow-up message.

Lead Info: ${lead.first_name} ${lead.last_name}, interested in ${lead.vehicle_interest}
Template: ${template.template}
Memory: ${memoryContext || 'First interaction'}
Inventory: ${inventoryContext}
Market Context: ${marketContext}
Personality: ${personalityProfile}

Requirements:
- Keep under 160 characters for SMS
- Be conversational and helpful
- Include specific vehicle details if relevant
- Add urgency if inventory shows high urgency level
- Match the lead's communication style
- Don't be pushy, be consultative

Generate a personalized message:`

  try {
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 100,
        temperature: 0.7
      })
    })

    if (!openaiResponse.ok) {
      throw new Error('OpenAI API error')
    }

    const openaiData = await openaiResponse.json()
    return openaiData.choices[0]?.message?.content || template.template
  } catch (error) {
    console.error('Error generating personalized message:', error)
    return template.template.replace(/{firstName}/g, lead.first_name)
  }
}

// Get market intelligence for context
async function getMarketIntelligence(supabase: any, vehicleInterest: string): Promise<string> {
  try {
    // Get recent inventory trends
    const { data: trends } = await supabase
      .from('inventory')
      .select('make, model, price, status, days_in_inventory')
      .ilike('make', `%${vehicleInterest?.split(' ')[0] || ''}%`)
      .order('created_at', { ascending: false })
      .limit(20)

    if (!trends || trends.length === 0) return 'Market is active'

    const avgPrice = trends.reduce((sum: number, item: any) => sum + (item.price || 0), 0) / trends.length
    const soldCount = trends.filter((item: any) => item.status === 'sold').length
    const avgDays = trends.filter((item: any) => item.days_in_inventory).reduce((sum: number, item: any) => sum + item.days_in_inventory, 0) / trends.length

    if (soldCount > trends.length * 0.6) {
      return `High demand market - ${soldCount}/${trends.length} recently sold`
    } else if (avgDays > 45) {
      return `Buyer's market - inventory moving slowly`
    } else {
      return `Balanced market - avg $${avgPrice.toLocaleString()}`
    }
  } catch (error) {
    console.error('Error getting market intelligence:', error)
    return 'Market is active'
  }
}

// Schedule next message using enhanced logic
async function scheduleNextEnhancedMessage(supabase: any, leadId: string) {
  // Get schedule configurations
  const { data: scheduleConfigs } = await supabase
    .from('ai_schedule_config')
    .select('*')
    .eq('is_active', true)
    .order('day_offset', { ascending: true })

  // Get lead creation date to determine stage
  const { data: lead } = await supabase
    .from('leads')
    .select('created_at, ai_stage')
    .eq('id', leadId)
    .single()

  if (!lead || !scheduleConfigs) return

  const daysSinceCreated = Math.floor((new Date().getTime() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24))
  
  // Find next applicable stage
  const nextConfig = scheduleConfigs.find((config: any) => {
    if (config.stage_name.startsWith('day_1')) return daysSinceCreated === 0
    if (config.stage_name.startsWith('week_1')) return daysSinceCreated >= 1 && daysSinceCreated <= 7
    if (config.stage_name.startsWith('week_2')) return daysSinceCreated >= 8 && daysSinceCreated <= 14
    if (config.stage_name.startsWith('month_2')) return daysSinceCreated >= 15 && daysSinceCreated <= 45
    if (config.stage_name.startsWith('month_3')) return daysSinceCreated >= 46 && daysSinceCreated <= 90
    return false
  })

  if (nextConfig) {
    // Calculate optimal send time based on lead patterns
    const { data: patterns } = await supabase
      .from('lead_response_patterns')
      .select('best_response_hours')
      .eq('lead_id', leadId)
      .single()

    const preferredHours = patterns?.best_response_hours || nextConfig.preferred_hours
    const nextHour = preferredHours[Math.floor(Math.random() * preferredHours.length)]
    
    const nextSendTime = new Date()
    nextSendTime.setDate(nextSendTime.getDate() + 1)
    nextSendTime.setHours(nextHour, 0, 0, 0)

    await supabase
      .from('leads')
      .update({
        next_ai_send_at: nextSendTime.toISOString(),
        ai_stage: nextConfig.stage_name
      })
      .eq('id', leadId)
  }
}

// Process behavioral triggers
async function processBehavioralTriggers(supabase: any) {
  try {
    // Find leads with recent activity that should trigger messages
    const { data: activeBehaviors } = await supabase
      .from('lead_behavior_triggers')
      .select('*, leads(*)')
      .eq('is_processed', false)
      .lte('trigger_time', new Date().toISOString())

    for (const behavior of activeBehaviors || []) {
      if (behavior.leads?.ai_opt_in && !behavior.leads?.ai_sequence_paused) {
        // Generate trigger-specific message
        const message = await generateTriggerMessage(supabase, behavior)
        
        if (message) {
          // Send immediate message
          const twilioResponse = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${Deno.env.get('TWILIO_ACCOUNT_SID')}/Messages.json`, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${btoa(`${Deno.env.get('TWILIO_ACCOUNT_SID')}:${Deno.env.get('TWILIO_AUTH_TOKEN')}`)}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              From: Deno.env.get('TWILIO_PHONE_NUMBER') || '',
              To: behavior.leads.phone,
              Body: message
            })
          })

          if (twilioResponse.ok) {
            const twilioData = await twilioResponse.json()
            
            // Save message
            await supabase
              .from('conversations')
              .insert({
                lead_id: behavior.lead_id,
                body: message,
                direction: 'out',
                sent_at: new Date().toISOString(),
                ai_generated: true,
                twilio_message_id: twilioData.sid,
                sms_status: 'sent'
              })

            console.log(`Sent behavioral trigger message to ${behavior.leads.first_name}`)
          }
        }

        // Mark trigger as processed
        await supabase
          .from('lead_behavior_triggers')
          .update({ is_processed: true })
          .eq('id', behavior.id)
      }
    }
  } catch (error) {
    console.error('Error processing behavioral triggers:', error)
  }
}

// Generate trigger-specific messages
async function generateTriggerMessage(supabase: any, behavior: any): Promise<string | null> {
  const triggerMessages = {
    'website_visit': `Hi ${behavior.leads.first_name}! I noticed you were looking at vehicles online. Found anything interesting?`,
    'price_drop': `Great news ${behavior.leads.first_name}! The price just dropped on that ${behavior.trigger_data.vehicle} you were interested in.`,
    'new_inventory': `Hi ${behavior.leads.first_name}! Just got a ${behavior.trigger_data.vehicle} that matches what you're looking for. Want to see it?`,
    'abandoned_cart': `Hi ${behavior.leads.first_name}! You were looking at financing options. Any questions I can help answer?`
  }

  return triggerMessages[behavior.trigger_type] || `Hi ${behavior.leads.first_name}! Just wanted to follow up with you.`
}

// Process inventory-based triggers
async function processInventoryTriggers(supabase: any) {
  try {
    // Find recent inventory changes that should trigger messages
    const { data: recentInventory } = await supabase
      .from('inventory')
      .select('*')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
      .eq('status', 'available')

    for (const vehicle of recentInventory || []) {
      // Find leads interested in similar vehicles
      const { data: interestedLeads } = await supabase
        .from('leads')
        .select('*')
        .eq('ai_opt_in', true)
        .eq('ai_sequence_paused', false)
        .or(`vehicle_interest.ilike.%${vehicle.make}%,vehicle_interest.ilike.%${vehicle.model}%`)
        .limit(5)

      for (const lead of interestedLeads || []) {
        // Check if we haven't messaged them about new inventory recently
        const { data: recentMessages } = await supabase
          .from('conversations')
          .select('id')
          .eq('lead_id', lead.id)
          .eq('direction', 'out')
          .gte('sent_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
          .ilike('body', '%just got%')

        if (!recentMessages || recentMessages.length === 0) {
          const message = `Hi ${lead.first_name}! Just got a ${vehicle.year} ${vehicle.make} ${vehicle.model} that matches your interests. Want to take a look?`
          
          // Send inventory alert
          const twilioResponse = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${Deno.env.get('TWILIO_ACCOUNT_SID')}/Messages.json`, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${btoa(`${Deno.env.get('TWILIO_ACCOUNT_SID')}:${Deno.env.get('TWILIO_AUTH_TOKEN')}`)}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              From: Deno.env.get('TWILIO_PHONE_NUMBER') || '',
              To: lead.phone,
              Body: message
            })
          })

          if (twilioResponse.ok) {
            const twilioData = await twilioResponse.json()
            
            await supabase
              .from('conversations')
              .insert({
                lead_id: lead.id,
                body: message,
                direction: 'out',
                sent_at: new Date().toISOString(),
                ai_generated: true,
                twilio_message_id: twilioData.sid,
                sms_status: 'sent'
              })

            console.log(`Sent inventory alert to ${lead.first_name} about ${vehicle.make} ${vehicle.model}`)
          }
        }
      }
    }
  } catch (error) {
    console.error('Error processing inventory triggers:', error)
  }
}

// Resume paused sequences that should resume
async function resumePausedSequences(supabase: any) {
  try {
    const now = new Date()
    
    const { data: leadsToResume } = await supabase
      .from('leads')
      .select('id')
      .eq('ai_opt_in', true)
      .eq('ai_sequence_paused', true)
      .not('ai_resume_at', 'is', null)
      .lte('ai_resume_at', now.toISOString())

    for (const lead of leadsToResume || []) {
      await supabase
        .from('leads')
        .update({
          ai_sequence_paused: false,
          ai_pause_reason: null,
          ai_resume_at: null
        })
        .eq('id', lead.id)

      await scheduleNextEnhancedMessage(supabase, lead.id)
    }
  } catch (error) {
    console.error('Error resuming paused sequences:', error)
  }
}
