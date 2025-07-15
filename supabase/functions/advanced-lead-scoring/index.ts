import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LeadScoringRequest {
  leadId: string;
  includeHistory?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get OpenAI API key from settings table
    const { data: openAIKeySetting } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'OPENAI_API_KEY')
      .maybeSingle();

    if (!openAIKeySetting?.value) {
      throw new Error('OpenAI API key not configured in settings');
    }

    const openAIApiKey = openAIKeySetting.value;
    const { leadId, includeHistory = true }: LeadScoringRequest = await req.json();

    console.log(`🧠 [LEAD-SCORING] Starting advanced analysis for lead: ${leadId}`);

    // Fetch comprehensive lead data
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select(`
        *,
        phone_numbers(*)
      `)
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      throw new Error(`Lead not found: ${leadError?.message}`);
    }

    // Fetch conversation history
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('lead_id', leadId)
      .order('sent_at', { ascending: true });

    if (convError) {
      console.warn(`⚠️ Could not fetch conversations: ${convError.message}`);
    }

    // Fetch historical AI data
    const { data: aiContext, error: aiError } = await supabase
      .from('ai_conversation_context')
      .select('*')
      .eq('lead_id', leadId)
      .single();

    if (aiError && aiError.code !== 'PGRST116') {
      console.warn(`⚠️ Could not fetch AI context: ${aiError.message}`);
    }

    // Prepare comprehensive analysis data
    const analysisData = {
      lead: {
        id: lead.id,
        created_at: lead.created_at,
        source: lead.source,
        status: lead.status,
        vehicle_interest: lead.vehicle_interest,
        last_reply_at: lead.last_reply_at,
        ai_opt_in: lead.ai_opt_in,
        has_trade_vehicle: lead.has_trade_vehicle,
        demographics: {
          location: `${lead.city || ''}, ${lead.state || ''}`.trim().replace(/^,\s*/, ''),
          contact_methods: lead.phone_numbers?.length || 0
        }
      },
      conversations: conversations?.map(conv => ({
        direction: conv.direction,
        body: conv.body,
        sent_at: conv.sent_at,
        ai_generated: conv.ai_generated
      })) || [],
      existing_context: aiContext ? {
        context_score: aiContext.context_score,
        key_topics: aiContext.key_topics,
        response_style: aiContext.response_style,
        conversation_summary: aiContext.conversation_summary
      } : null,
      analysis_timestamp: new Date().toISOString()
    };

    // Create advanced AI prompt for lead scoring
    const prompt = `You are an advanced AI lead scoring system for automotive sales. Analyze this lead comprehensively and provide a sophisticated scoring analysis.

LEAD DATA:
${JSON.stringify(analysisData, null, 2)}

SCORING FRAMEWORK:
Analyze across these key dimensions (0-100 scale each):

1. ENGAGEMENT SCORE (0-100):
   - Response frequency and timing patterns
   - Message quality and depth
   - Sustained conversation vs one-off responses
   - Initiative taken in communication

2. INTENT STRENGTH (0-100):
   - Specific vehicle interest and details mentioned
   - Timeline urgency indicators
   - Financial readiness signals
   - Decision-making authority

3. CONVERSION PROBABILITY (0-100):
   - Historical pattern matching
   - Behavioral buying signals
   - Objection handling success
   - Next step progression

4. RISK FACTORS (0-100, lower is better):
   - Communication gaps or delays
   - Price sensitivity indicators
   - Competitive shopping signals
   - Indecision patterns

PROVIDE RESPONSE IN THIS EXACT JSON FORMAT:
{
  "overall_score": number (0-100),
  "component_scores": {
    "engagement": number,
    "intent_strength": number,
    "conversion_probability": number,
    "risk_factors": number
  },
  "lead_temperature": number (0-100),
  "urgency_level": "critical" | "high" | "medium" | "low",
  "conversion_timeline": "immediate" | "short_term" | "medium_term" | "long_term",
  "key_insights": [
    "string insight 1",
    "string insight 2",
    "string insight 3"
  ],
  "risk_factors": [
    "string risk factor 1",
    "string risk factor 2"
  ],
  "opportunities": [
    "string opportunity 1",
    "string opportunity 2"
  ],
  "recommended_actions": [
    {
      "action": "string action description",
      "priority": "critical" | "high" | "medium" | "low",
      "timing": "immediate" | "within_hour" | "within_day" | "within_week"
    }
  ],
  "confidence_level": number (0-100),
  "reasoning": "detailed explanation of scoring logic and key factors"
}

Be precise, analytical, and actionable. Focus on data-driven insights that will help sales teams prioritize and optimize their approach.`;

    console.log(`🤖 [LEAD-SCORING] Sending analysis to GPT-4.1...`);

    // Call OpenAI with advanced prompt
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
            content: 'You are an expert automotive sales AI that provides precise, data-driven lead scoring analysis. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1, // Low temperature for consistency
        max_tokens: 2000
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const aiResponse = await response.json();
    const analysis = JSON.parse(aiResponse.choices[0].message.content);

    console.log(`✅ [LEAD-SCORING] Analysis complete. Score: ${analysis.overall_score}`);

    // Store the AI lead score
    const { error: scoreError } = await supabase
      .from('ai_lead_scores')
      .upsert({
        lead_id: leadId,
        score: analysis.overall_score,
        engagement_level: analysis.urgency_level,
        conversion_probability: analysis.component_scores.conversion_probability / 100,
        score_factors: {
          component_scores: analysis.component_scores,
          lead_temperature: analysis.lead_temperature,
          urgency_level: analysis.urgency_level,
          conversion_timeline: analysis.conversion_timeline,
          confidence_level: analysis.confidence_level,
          reasoning: analysis.reasoning
        },
        last_scored_at: new Date().toISOString()
      });

    if (scoreError) {
      console.error(`❌ Error storing score: ${scoreError.message}`);
    }

    // Update or create conversation context
    const contextUpdate = {
      lead_id: leadId,
      context_score: analysis.overall_score,
      key_topics: analysis.key_insights,
      conversation_summary: analysis.reasoning,
      response_style: analysis.urgency_level,
      updated_at: new Date().toISOString()
    };

    const { error: contextError } = await supabase
      .from('ai_conversation_context')
      .upsert(contextUpdate);

    if (contextError) {
      console.error(`❌ Error updating context: ${contextError.message}`);
    }

    return new Response(JSON.stringify({
      success: true,
      lead_id: leadId,
      analysis: analysis,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ [LEAD-SCORING] Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});