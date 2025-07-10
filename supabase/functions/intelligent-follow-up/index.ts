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

interface FollowUpRequest {
  leadId: string;
  contextType?: 'post_conversation' | 'scheduled_check' | 'response_delay' | 're_engagement';
  includeInventory?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { leadId, contextType = 'scheduled_check', includeInventory = true }: FollowUpRequest = await req.json();

    console.log(`🤖 [FOLLOW-UP] Generating intelligent recommendations for lead: ${leadId}`);

    // Fetch lead data with AI context
    const { data: leadData, error: leadError } = await supabase
      .from('leads')
      .select(`
        *,
        phone_numbers(*),
        ai_conversation_context(*),
        ai_lead_scores(*)
      `)
      .eq('id', leadId)
      .single();

    if (leadError || !leadData) {
      throw new Error(`Lead not found: ${leadError?.message}`);
    }

    // Fetch recent conversations
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('lead_id', leadId)
      .order('sent_at', { ascending: false })
      .limit(10);

    if (convError) {
      console.warn(`⚠️ Could not fetch conversations: ${convError.message}`);
    }

    // Fetch relevant inventory if requested
    let relevantInventory = null;
    if (includeInventory && leadData.vehicle_interest) {
      const { data: inventory, error: invError } = await supabase
        .from('inventory')
        .select('make, model, year, price, mileage, exterior_color, stock_number, status')
        .ilike('make', `%${leadData.vehicle_interest.split(' ')[0] || ''}%`)
        .eq('status', 'available')
        .limit(5);

      if (!invError && inventory?.length) {
        relevantInventory = inventory;
      }
    }

    // Get current context
    const aiContext = leadData.ai_conversation_context?.[0];
    const leadScore = leadData.ai_lead_scores?.[0];
    const lastConversation = conversations?.[0];
    const daysSinceLastReply = leadData.last_reply_at 
      ? Math.floor((Date.now() - new Date(leadData.last_reply_at).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const analysisData = {
      lead: {
        id: leadData.id,
        source: leadData.source,
        status: leadData.status,
        vehicle_interest: leadData.vehicle_interest,
        ai_opt_in: leadData.ai_opt_in,
        days_since_created: Math.floor((Date.now() - new Date(leadData.created_at).getTime()) / (1000 * 60 * 60 * 24)),
        days_since_last_reply: daysSinceLastReply,
        location: `${leadData.city || ''}, ${leadData.state || ''}`.trim()
      },
      ai_context: aiContext ? {
        context_score: aiContext.context_score,
        key_topics: aiContext.key_topics,
        response_style: aiContext.response_style,
        conversation_summary: aiContext.conversation_summary
      } : null,
      lead_score: leadScore ? {
        overall_score: leadScore.score,
        engagement_level: leadScore.engagement_level,
        conversion_probability: leadScore.conversion_probability
      } : null,
      recent_conversations: conversations?.slice(0, 5).map(conv => ({
        direction: conv.direction,
        body: conv.body.substring(0, 200) + (conv.body.length > 200 ? '...' : ''),
        sent_at: conv.sent_at,
        ai_generated: conv.ai_generated
      })) || [],
      relevant_inventory: relevantInventory,
      context_type: contextType,
      analysis_timestamp: new Date().toISOString()
    };

    const prompt = `You are an advanced AI sales assistant specializing in intelligent follow-up recommendations for automotive sales. Analyze this lead and provide strategic follow-up recommendations.

LEAD ANALYSIS DATA:
${JSON.stringify(analysisData, null, 2)}

CONTEXT TYPE: ${contextType}

Based on this comprehensive analysis, provide intelligent follow-up recommendations. Consider:

1. TIMING OPTIMIZATION:
   - Best time to reach out based on response patterns
   - Optimal follow-up frequency
   - Urgency level indicators

2. PERSONALIZATION STRATEGY:
   - Communication style preferences
   - Interest-based messaging
   - Value proposition alignment

3. CONTENT RECOMMENDATIONS:
   - Specific talking points
   - Inventory to highlight
   - Questions to ask

4. NEXT BEST ACTIONS:
   - Prioritized action sequence
   - Channel optimization (call vs text vs email)
   - Escalation triggers

PROVIDE RESPONSE IN THIS EXACT JSON FORMAT:
{
  "recommendations": [
    {
      "id": "rec_1",
      "action_type": "call" | "text" | "email" | "appointment" | "inventory_share",
      "priority": "critical" | "high" | "medium" | "low",
      "timing": {
        "suggested_delay_hours": number,
        "optimal_time_of_day": "morning" | "afternoon" | "evening",
        "preferred_days": ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
      },
      "title": "brief action title",
      "description": "detailed action description",
      "suggested_content": "specific message/script suggestion",
      "expected_outcome": "what this action should achieve",
      "success_metrics": ["metric1", "metric2"]
    }
  ],
  "strategy_summary": {
    "approach": "consultative" | "urgent" | "nurturing" | "educational",
    "key_focus_areas": ["area1", "area2", "area3"],
    "risk_mitigation": ["risk1", "risk2"],
    "success_probability": number (0-100)
  },
  "personalization": {
    "communication_style": "professional" | "casual" | "friendly" | "direct",
    "key_interests": ["interest1", "interest2"],
    "pain_points": ["pain1", "pain2"],
    "motivators": ["motivator1", "motivator2"]
  },
  "inventory_recommendations": [
    {
      "stock_number": "string if specific vehicle",
      "reason": "why this vehicle matches",
      "highlight_features": ["feature1", "feature2"]
    }
  ],
  "escalation_triggers": [
    {
      "condition": "trigger condition",
      "action": "escalation action",
      "timeline": "when to escalate"
    }
  ],
  "confidence_level": number (0-100),
  "reasoning": "detailed explanation of strategy and recommendations"
}

Be strategic, personalized, and actionable. Focus on building genuine relationships while driving sales progression.`;

    console.log(`🧠 [FOLLOW-UP] Sending analysis to GPT-4.1...`);

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
            content: 'You are an expert automotive sales AI that provides strategic, personalized follow-up recommendations. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3, // Slightly higher for creative recommendations
        max_tokens: 2500
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const aiResponse = await response.json();
    const recommendations = JSON.parse(aiResponse.choices[0].message.content);

    console.log(`✅ [FOLLOW-UP] Generated ${recommendations.recommendations.length} recommendations`);

    // Store recommendations in the database
    const { error: storeError } = await supabase
      .from('ai_engagement_predictions')
      .insert({
        lead_id: leadId,
        prediction_type: 'follow_up_recommendations',
        confidence_level: recommendations.confidence_level / 100,
        recommended_actions: recommendations.recommendations,
        contributing_factors: {
          strategy_summary: recommendations.strategy_summary,
          personalization: recommendations.personalization,
          inventory_recommendations: recommendations.inventory_recommendations,
          escalation_triggers: recommendations.escalation_triggers,
          context_type: contextType,
          reasoning: recommendations.reasoning
        },
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      });

    if (storeError) {
      console.error(`❌ Error storing recommendations: ${storeError.message}`);
    }

    return new Response(JSON.stringify({
      success: true,
      lead_id: leadId,
      context_type: contextType,
      recommendations: recommendations,
      generated_at: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ [FOLLOW-UP] Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});