
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface ProcessingResult {
  processed: number
  successful: number
  failed: number
  errors: string[]
  queueSize: number
  processingTime: number
}

interface AIAutomationSettings {
  daily_message_limit_per_lead: number
  business_hours_start: number
  business_hours_end: number
  automation_enabled: boolean
  max_concurrent_sends: number
  batch_size: number
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const startTime = Date.now()
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    console.log('🚀 [AI-AUTOMATION] Enhanced automation started')

    // Get automation settings with improved defaults
    const { data: settings } = await supabase
      .from('ai_automation_settings')
      .select('setting_key, setting_value')

    const settingsMap: Partial<AIAutomationSettings> = {}
    settings?.forEach(setting => {
      settingsMap[setting.setting_key as keyof AIAutomationSettings] = 
        typeof setting.setting_value === 'string' 
          ? JSON.parse(setting.setting_value) 
          : setting.setting_value
    })

    // Enhanced default settings for better performance
    const config: AIAutomationSettings = {
      daily_message_limit_per_lead: settingsMap.daily_message_limit_per_lead || 8, // Increased from 5
      business_hours_start: settingsMap.business_hours_start || 8,
      business_hours_end: settingsMap.business_hours_end || 20,
      automation_enabled: settingsMap.automation_enabled !== false,
      max_concurrent_sends: settingsMap.max_concurrent_sends || 10, // New setting
      batch_size: settingsMap.batch_size || 100 // Increased from 50
    }

    if (!config.automation_enabled) {
      console.log('⏸️ [AI-AUTOMATION] Automation is disabled')
      return new Response(JSON.stringify({ 
        message: 'AI automation is disabled',
        processed: 0,
        successful: 0,
        failed: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Clean up bad vehicle data first
    console.log('🧹 [AI-AUTOMATION] Cleaning up bad vehicle data...')
    const { count: cleanedCount } = await supabase
      .from('leads')
      .update({ 
        vehicle_interest: 'finding the right vehicle for your needs',
        updated_at: new Date().toISOString()
      })
      .or('vehicle_interest.ilike.%Unknown%,vehicle_interest.is.null,vehicle_interest.eq.')
      .eq('ai_opt_in', true)

    if (cleanedCount && cleanedCount > 0) {
      console.log(`✅ [AI-AUTOMATION] Cleaned ${cleanedCount} leads with bad vehicle data`)
    }

    // Get leads with intelligent prioritization
    const { data: dueLeads, error: leadsError } = await supabase
      .from('leads')
      .select(`
        id, first_name, last_name, vehicle_interest, message_intensity,
        ai_messages_sent, ai_stage, next_ai_send_at, created_at,
        phone_numbers!inner(number, is_primary)
      `)
      .eq('ai_opt_in', true)
      .eq('ai_sequence_paused', false)
      .not('next_ai_send_at', 'is', null)
      .lte('next_ai_send_at', new Date().toISOString())
      .not('vehicle_interest', 'ilike', '%Unknown%')
      .not('vehicle_interest', 'is', null)
      .neq('vehicle_interest', '')
      .order('next_ai_send_at', { ascending: true }) // Oldest overdue first
      .order('created_at', { ascending: false }) // Then newest leads
      .limit(config.batch_size)

    if (leadsError) {
      throw new Error(`Failed to fetch leads: ${leadsError.message}`)
    }

    if (!dueLeads || dueLeads.length === 0) {
      console.log('📭 [AI-AUTOMATION] No leads due for messaging')
      return new Response(JSON.stringify({
        message: 'No leads due for messaging',
        processed: 0,
        successful: 0,
        failed: 0,
        queueSize: 0,
        processingTime: Date.now() - startTime
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`📬 [AI-AUTOMATION] Processing ${dueLeads.length} leads due for messaging`)

    // Check daily message limits for each lead
    const today = new Date().toISOString().split('T')[0]
    const { data: todayMessages } = await supabase
      .from('conversations')
      .select('lead_id')
      .eq('ai_generated', true)
      .gte('sent_at', `${today}T00:00:00.000Z`)
      .lte('sent_at', `${today}T23:59:59.999Z`)

    const dailyMessageCounts = todayMessages?.reduce((acc, msg) => {
      acc[msg.lead_id] = (acc[msg.lead_id] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    // Process leads with parallel batching for better performance
    const results: ProcessingResult = {
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [],
      queueSize: dueLeads.length,
      processingTime: 0
    }

    // Process in smaller parallel batches to avoid overwhelming the system
    const batchSize = Math.min(config.max_concurrent_sends, 5)
    for (let i = 0; i < dueLeads.length; i += batchSize) {
      const batch = dueLeads.slice(i, i + batchSize)
      
      const batchPromises = batch.map(async (lead) => {
        return processLeadMessage(lead, supabase, config, dailyMessageCounts)
      })

      const batchResults = await Promise.allSettled(batchPromises)
      
      batchResults.forEach((result, index) => {
        results.processed++
        
        if (result.status === 'fulfilled' && result.value) {
          results.successful++
          console.log(`✅ [AI-AUTOMATION] Successfully processed lead ${batch[index].id}`)
        } else {
          results.failed++
          const error = result.status === 'rejected' ? result.reason.message : 'Unknown error'
          results.errors.push(`Lead ${batch[index].id}: ${error}`)
          console.error(`❌ [AI-AUTOMATION] Failed to process lead ${batch[index].id}: ${error}`)
        }
      })

      // Small delay between batches to avoid rate limiting
      if (i + batchSize < dueLeads.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    results.processingTime = Date.now() - startTime

    // Log automation run
    await supabase
      .from('ai_automation_runs')
      .insert({
        source: 'enhanced_cron',
        processed_leads: results.processed,
        successful_sends: results.successful,
        failed_sends: results.failed,
        error_details: results.errors.length > 0 ? { errors: results.errors } : null,
        status: results.failed === 0 ? 'completed' : 'completed_with_errors',
        completed_at: new Date().toISOString()
      })

    console.log(`🎯 [AI-AUTOMATION] Enhanced processing complete: ${results.successful}/${results.processed} successful in ${results.processingTime}ms`)

    return new Response(JSON.stringify({
      message: `Enhanced AI automation completed: ${results.successful}/${results.processed} successful`,
      ...results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ [AI-AUTOMATION] Critical error:', error)
    
    // Log failed run
    await supabase
      .from('ai_automation_runs')
      .insert({
        source: 'enhanced_cron',
        processed_leads: 0,
        successful_sends: 0,
        failed_sends: 0,
        error_details: { error: error.message },
        status: 'failed',
        completed_at: new Date().toISOString()
      })

    return new Response(JSON.stringify({
      error: 'AI automation failed',
      message: error.message,
      processed: 0,
      successful: 0,
      failed: 0
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

async function processLeadMessage(
  lead: any, 
  supabase: any, 
  config: AIAutomationSettings,
  dailyMessageCounts: Record<string, number>
): Promise<boolean> {
  const messagesSentToday = dailyMessageCounts[lead.id] || 0
  
  if (messagesSentToday >= config.daily_message_limit_per_lead) {
    console.log(`⏭️ [AI-AUTOMATION] Skipping lead ${lead.id} - daily limit reached (${messagesSentToday}/${config.daily_message_limit_per_lead})`)
    return false
  }

  const primaryPhone = lead.phone_numbers?.find((p: any) => p.is_primary)?.number || 
                     lead.phone_numbers?.[0]?.number

  if (!primaryPhone) {
    console.warn(`⚠️ [AI-AUTOMATION] Skipping lead ${lead.id} - no phone number`)
    return false
  }

  console.log(`👤 [AI-AUTOMATION] Processing lead: ${lead.first_name} ${lead.last_name} (${lead.vehicle_interest}) - Intensity: ${lead.message_intensity} - Messages: ${lead.ai_messages_sent || 0}`)

  // Generate AI message with enhanced prompting
  const messageStage = determineMessageStage(lead.ai_messages_sent || 0, lead.message_intensity)
  const aiMessage = await generateEnhancedAIMessage(lead, messageStage, supabase)

  if (!aiMessage) {
    throw new Error('Failed to generate AI message')
  }

  // Send the message
  const success = await sendMessage(lead, aiMessage, primaryPhone, supabase)
  
  if (success) {
    // Update lead with next send time using improved scheduling
    await updateLeadSchedule(lead, config, supabase)
  }

  return success
}

function determineMessageStage(messagesSent: number, intensity: string): string {
  if (messagesSent === 0) return 'initial_contact'
  
  switch (intensity) {
    case 'super_aggressive':
    case 'aggressive':
      if (messagesSent < 3) return 'aggressive_follow_up'
      if (messagesSent < 6) return 'value_proposition'
      return 'aggressive_maintenance'
    
    case 'gentle':
    default:
      if (messagesSent < 2) return 'gentle_introduction'
      if (messagesSent < 4) return 'gentle_follow_up'
      return 'gentle_maintenance'
  }
}

async function generateEnhancedAIMessage(lead: any, stage: string, supabase: any): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke('generate-ai-message', {
      body: {
        leadId: lead.id,
        leadName: `${lead.first_name} ${lead.last_name}`,
        vehicleInterest: lead.vehicle_interest,
        stage,
        intensity: lead.message_intensity || 'gentle',
        messagesSent: lead.ai_messages_sent || 0,
        enhanced: true // Flag for better message generation
      }
    })

    if (error) {
      console.error('❌ [AI-AUTOMATION] AI message generation error:', error)
      return null
    }

    return data?.message || null
  } catch (error) {
    console.error('❌ [AI-AUTOMATION] Exception in AI message generation:', error)
    return null
  }
}

async function sendMessage(lead: any, message: string, phoneNumber: string, supabase: any): Promise<boolean> {
  try {
    // Create conversation record first
    const { data: conversationData, error: conversationError } = await supabase
      .from('conversations')
      .insert({
        lead_id: lead.id,
        body: message,
        direction: 'out',
        ai_generated: true,
        sent_at: new Date().toISOString()
      })
      .select('id')
      .single()

    if (conversationError) {
      throw new Error(`Failed to create conversation: ${conversationError.message}`)
    }

    console.log(`📤 [AI-AUTOMATION] Sending ${lead.message_intensity || 'gentle'} message to ${lead.first_name}: "${message}"`)
    console.log(`📱 [AI-AUTOMATION] Sending SMS to ${phoneNumber}: "${message}"`)

    // Send SMS via edge function
    const { data: smsData, error: smsError } = await supabase.functions.invoke('send-sms', {
      body: {
        to: phoneNumber,
        body: message,
        conversationId: conversationData.id
      }
    })

    if (smsError) {
      throw new Error(`SMS sending failed: ${smsError.message}`)
    }

    console.log(`✅ [AI-AUTOMATION] SMS sent successfully to ${phoneNumber}`)
    return true

  } catch (error) {
    console.error(`❌ [AI-AUTOMATION] Error sending message:`, error)
    return false
  }
}

async function updateLeadSchedule(lead: any, config: AIAutomationSettings, supabase: any): Promise<void> {
  const messagesSent = (lead.ai_messages_sent || 0) + 1
  const intensity = lead.message_intensity || 'gentle'
  
  // Calculate next send time with improved logic
  let hoursToAdd = 24 // Default gentle interval

  switch (intensity) {
    case 'super_aggressive':
      if (messagesSent < 3) {
        hoursToAdd = 2 + Math.random() * 2 // 2-4 hours for first few
      } else if (messagesSent < 6) {
        hoursToAdd = 4 + Math.random() * 4 // 4-8 hours
      } else {
        hoursToAdd = 12 + Math.random() * 12 // 12-24 hours
      }
      break
    
    case 'aggressive':
      if (messagesSent < 3) {
        hoursToAdd = 4 + Math.random() * 4 // 4-8 hours
      } else {
        hoursToAdd = 8 + Math.random() * 8 // 8-16 hours
      }
      break
    
    case 'gentle':
    default:
      if (messagesSent < 2) {
        hoursToAdd = 24 + Math.random() * 12 // 24-36 hours
      } else {
        hoursToAdd = 48 + Math.random() * 24 // 2-3 days
      }
      break
  }

  const nextSendTime = new Date(Date.now() + (hoursToAdd * 60 * 60 * 1000))
  
  // Ensure message is sent during business hours
  const hour = nextSendTime.getHours()
  if (hour < config.business_hours_start) {
    nextSendTime.setHours(config.business_hours_start, 0, 0, 0)
  } else if (hour >= config.business_hours_end) {
    nextSendTime.setDate(nextSendTime.getDate() + 1)
    nextSendTime.setHours(config.business_hours_start, 0, 0, 0)
  }

  const stage = determineMessageStage(messagesSent, intensity)

  const { error: updateError } = await supabase
    .from('leads')
    .update({
      ai_messages_sent: messagesSent,
      next_ai_send_at: nextSendTime.toISOString(),
      ai_stage: stage,
      message_intensity: intensity,
      updated_at: new Date().toISOString()
    })
    .eq('id', lead.id)

  if (updateError) {
    console.error(`❌ [AI-AUTOMATION] Failed to update lead ${lead.id}:`, updateError)
  } else {
    console.log(`✅ Updated lead ${lead.id}: messages=${messagesSent}, next_send=${nextSendTime.toISOString()}, stage=${stage}, intensity=${intensity}`)
  }
}
