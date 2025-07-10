import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IntelligenceRequest {
  leadId: string;
  operations: ('churn_analysis' | 'inventory_matching' | 'message_generation' | 'notifications')[];
  context?: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { leadId, operations, context = {} }: IntelligenceRequest = await req.json();

    console.log(`🧠 [AI-INTELLIGENCE-HUB] Processing operations: ${operations.join(', ')} for lead: ${leadId}`);

    // Get comprehensive lead data
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select(`
        *,
        phone_numbers(*),
        conversations(*),
        ai_conversation_context(*),
        ai_lead_scores(*)
      `)
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      throw new Error(`Lead not found: ${leadError?.message}`);
    }

    // Get inventory data for matching
    const { data: inventory } = await supabase
      .from('inventory')
      .select('*')
      .eq('status', 'available')
      .limit(50);

    const results: any = {};

    // Process each operation
    for (const operation of operations) {
      switch (operation) {
        case 'churn_analysis':
          results.churnAnalysis = await performChurnAnalysis(lead, supabase);
          break;
        case 'inventory_matching':
          results.inventoryMatching = await performInventoryMatching(lead, inventory || [], supabase);
          break;
        case 'message_generation':
          results.messageGeneration = await generatePersonalizedMessage(lead, context, supabase);
          break;
        case 'notifications':
          results.notifications = await generateAINotifications(lead, supabase);
          break;
      }
    }

    console.log(`✅ [AI-INTELLIGENCE-HUB] Completed all operations for lead: ${leadId}`);

    return new Response(JSON.stringify({
      success: true,
      leadId,
      results,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ [AI-INTELLIGENCE-HUB] Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function performChurnAnalysis(lead: any, supabase: any) {
  const analysisData = {
    lead: {
      id: lead.id,
      created_at: lead.created_at,
      last_reply_at: lead.last_reply_at,
      status: lead.status,
      ai_opt_in: lead.ai_opt_in
    },
    conversations: lead.conversations?.map((c: any) => ({
      direction: c.direction,
      sent_at: c.sent_at,
      body: c.body
    })) || [],
    engagement_metrics: {
      days_since_creation: Math.floor((Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24)),
      days_since_last_reply: lead.last_reply_at ? Math.floor((Date.now() - new Date(lead.last_reply_at).getTime()) / (1000 * 60 * 60 * 24)) : null,
      total_conversations: lead.conversations?.length || 0,
      response_rate: calculateResponseRate(lead.conversations || [])
    }
  };

  const prompt = `Analyze this lead's churn risk based on their engagement patterns:

${JSON.stringify(analysisData, null, 2)}

Provide a comprehensive churn analysis in this exact JSON format:
{
  "churn_probability": number (0.0-1.0),
  "risk_level": "critical" | "high" | "medium" | "low",
  "contributing_factors": [
    "specific factor 1",
    "specific factor 2"
  ],
  "recommended_interventions": [
    {
      "action": "specific action description",
      "priority": "critical" | "high" | "medium" | "low",
      "timing": "immediate" | "within_24h" | "within_week"
    }
  ],
  "prediction_confidence": number (0.0-1.0),
  "days_until_predicted_churn": number or null,
  "last_engagement_score": number (0.0-1.0),
  "key_insights": [
    "insight 1",
    "insight 2"
  ]
}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4.1-2025-04-14',
      messages: [
        {
          role: 'system',
          content: 'You are an expert automotive sales AI specializing in churn prediction. Provide precise, data-driven analysis.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 1500
    }),
  });

  const aiResponse = await response.json();
  const analysis = JSON.parse(aiResponse.choices[0].message.content);

  // Store churn prediction
  await supabase
    .from('ai_churn_predictions')
    .upsert({
      lead_id: lead.id,
      churn_probability: analysis.churn_probability,
      risk_level: analysis.risk_level,
      contributing_factors: analysis.contributing_factors,
      recommended_interventions: analysis.recommended_interventions,
      prediction_confidence: analysis.prediction_confidence,
      days_until_predicted_churn: analysis.days_until_predicted_churn,
      last_engagement_score: analysis.last_engagement_score,
      updated_at: new Date().toISOString()
    });

  // Create notification if high risk
  if (analysis.risk_level === 'critical' || analysis.risk_level === 'high') {
    await supabase
      .from('ai_notifications')
      .insert({
        lead_id: lead.id,
        notification_type: 'churn_risk',
        title: `${analysis.risk_level.toUpperCase()} Churn Risk Detected`,
        message: `Lead shows ${(analysis.churn_probability * 100).toFixed(1)}% probability of churning. ${analysis.contributing_factors[0] || 'Immediate intervention recommended.'}`,
        urgency_level: analysis.risk_level,
        ai_confidence: analysis.prediction_confidence,
        metadata: { 
          churn_probability: analysis.churn_probability,
          key_factors: analysis.contributing_factors.slice(0, 3)
        }
      });
  }

  return analysis;
}

async function performInventoryMatching(lead: any, inventory: any[], supabase: any) {
  const leadProfile = {
    id: lead.id,
    vehicle_interest: lead.vehicle_interest,
    conversations: lead.conversations?.map((c: any) => c.body).join(' ') || '',
    source: lead.source,
    location: `${lead.city || ''}, ${lead.state || ''}`.trim()
  };

  const vehicles = inventory.map(v => ({
    id: v.id,
    make: v.make,
    model: v.model,
    year: v.year,
    price: v.price,
    mileage: v.mileage,
    body_style: v.body_style,
    condition: v.condition,
    features: v.features || []
  }));

  const prompt = `Match this automotive lead with the most suitable vehicles from our inventory:

LEAD PROFILE:
${JSON.stringify(leadProfile, null, 2)}

AVAILABLE INVENTORY:
${JSON.stringify(vehicles.slice(0, 20), null, 2)}

Provide vehicle matching analysis in this exact JSON format:
{
  "matches": [
    {
      "inventory_id": "uuid",
      "match_score": number (0.0-1.0),
      "match_reasons": [
        "specific reason 1",
        "specific reason 2"
      ],
      "personalized_pitch": "compelling pitch text",
      "confidence_level": number (0.0-1.0),
      "vehicle_highlights": [
        "highlight 1",
        "highlight 2"
      ],
      "pricing_strategy": {
        "approach": "value" | "competitive" | "premium",
        "key_points": ["point 1", "point 2"]
      },
      "match_type": "preference" | "budget" | "lifestyle" | "trade_match"
    }
  ],
  "lead_preferences": {
    "price_range": {"min": number, "max": number},
    "preferred_features": ["feature1", "feature2"],
    "style_preference": "text",
    "usage_pattern": "text"
  }
}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4.1-2025-04-14',
      messages: [
        {
          role: 'system',
          content: 'You are an expert automotive sales AI that matches leads with perfect vehicles based on their preferences, budget, and communication patterns.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.2,
      max_tokens: 2000
    }),
  });

  const aiResponse = await response.json();
  const analysis = JSON.parse(aiResponse.choices[0].message.content);

  // Store inventory matches
  for (const [index, match] of analysis.matches.entries()) {
    await supabase
      .from('ai_inventory_matches')
      .upsert({
        lead_id: lead.id,
        inventory_id: match.inventory_id,
        match_score: match.match_score,
        match_reasons: match.match_reasons,
        personalized_pitch: match.personalized_pitch,
        confidence_level: match.confidence_level,
        lead_preferences: analysis.lead_preferences,
        vehicle_highlights: match.vehicle_highlights,
        pricing_strategy: match.pricing_strategy,
        presentation_order: index + 1,
        match_type: match.match_type,
        updated_at: new Date().toISOString()
      });
  }

  // Create notification for high-quality matches
  const topMatches = analysis.matches.filter((m: any) => m.match_score > 0.8);
  if (topMatches.length > 0) {
    await supabase
      .from('ai_notifications')
      .insert({
        lead_id: lead.id,
        notification_type: 'inventory_match',
        title: `${topMatches.length} Perfect Vehicle Match${topMatches.length > 1 ? 'es' : ''} Found`,
        message: `AI found ${topMatches.length} highly compatible vehicle${topMatches.length > 1 ? 's' : ''} for this lead. Top match: ${topMatches[0].match_score * 100}% compatibility.`,
        urgency_level: topMatches[0].match_score > 0.9 ? 'high' : 'medium',
        ai_confidence: topMatches[0].confidence_level,
        metadata: { 
          match_count: topMatches.length,
          top_score: topMatches[0].match_score
        }
      });
  }

  return analysis;
}

async function generatePersonalizedMessage(lead: any, context: any, supabase: any) {
  const messageContext = {
    lead: {
      first_name: lead.first_name,
      vehicle_interest: lead.vehicle_interest,
      source: lead.source,
      last_conversation: lead.conversations?.[lead.conversations?.length - 1]?.body || '',
      conversation_history: lead.conversations?.slice(-5) || []
    },
    context: context,
    timestamp: new Date().toISOString()
  };

  const prompt = `Generate a personalized follow-up message for this automotive lead:

${JSON.stringify(messageContext, null, 2)}

Generate appropriate message(s) in this exact JSON format:
{
  "messages": [
    {
      "message_type": "follow_up" | "inventory_match" | "churn_prevention" | "engagement",
      "generated_content": "personalized message text",
      "tone_style": "professional" | "casual" | "urgent" | "warm",
      "personalization_factors": {
        "name_usage": "how name is used",
        "reference_points": ["specific references"],
        "tone_reasoning": "why this tone"
      },
      "ai_confidence": number (0.0-1.0),
      "template_used": "template name or null"
    }
  ],
  "strategy_summary": "overall messaging strategy explanation"
}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4.1-2025-04-14',
      messages: [
        {
          role: 'system',
          content: 'You are an expert automotive sales communication specialist. Create compelling, personalized messages that drive engagement and conversions.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1500
    }),
  });

  const aiResponse = await response.json();
  const analysis = JSON.parse(aiResponse.choices[0].message.content);

  // Store generated messages
  for (const message of analysis.messages) {
    await supabase
      .from('ai_generated_messages')
      .insert({
        lead_id: lead.id,
        message_type: message.message_type,
        generated_content: message.generated_content,
        personalization_factors: message.personalization_factors,
        tone_style: message.tone_style,
        ai_confidence: message.ai_confidence,
        template_used: message.template_used
      });
  }

  return analysis;
}

async function generateAINotifications(lead: any, supabase: any) {
  // Check for various notification triggers
  const notifications = [];

  // High lead score notification
  const latestScore = lead.ai_lead_scores?.[0];
  if (latestScore && latestScore.score > 80) {
    notifications.push({
      notification_type: 'high_score',
      title: 'High-Value Lead Detected',
      message: `This lead scored ${latestScore.score}/100 on our AI analysis. Immediate attention recommended.`,
      urgency_level: 'high',
      ai_confidence: 0.9
    });
  }

  // Engagement opportunity
  const daysSinceLastReply = lead.last_reply_at ? 
    Math.floor((Date.now() - new Date(lead.last_reply_at).getTime()) / (1000 * 60 * 60 * 24)) : null;

  if (daysSinceLastReply && daysSinceLastReply >= 3 && daysSinceLastReply <= 7) {
    notifications.push({
      notification_type: 'engagement_opportunity',
      title: 'Re-engagement Window Open',
      message: `Lead hasn't responded in ${daysSinceLastReply} days. Optimal time for strategic follow-up.`,
      urgency_level: 'medium',
      ai_confidence: 0.8
    });
  }

  // Store notifications
  for (const notification of notifications) {
    await supabase
      .from('ai_notifications')
      .insert({
        lead_id: lead.id,
        ...notification
      });
  }

  return { notifications_created: notifications.length, notifications };
}

function calculateResponseRate(conversations: any[]): number {
  const outgoing = conversations.filter(c => c.direction === 'out').length;
  const incoming = conversations.filter(c => c.direction === 'in').length;
  return outgoing > 0 ? incoming / outgoing : 0;
}