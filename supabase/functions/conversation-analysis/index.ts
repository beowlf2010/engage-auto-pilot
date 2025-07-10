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

interface ConversationAnalysisRequest {
  leadId: string;
  conversationId?: string;
  analysisType?: 'real_time' | 'full_history' | 'recent_window';
  includeRecommendations?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { 
      leadId, 
      conversationId, 
      analysisType = 'recent_window',
      includeRecommendations = true 
    }: ConversationAnalysisRequest = await req.json();

    console.log(`📊 [CONV-ANALYSIS] Starting ${analysisType} analysis for lead: ${leadId}`);

    // Fetch lead data
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      throw new Error(`Lead not found: ${leadError?.message}`);
    }

    // Fetch conversations based on analysis type
    let conversationQuery = supabase
      .from('conversations')
      .select('*')
      .eq('lead_id', leadId)
      .order('sent_at', { ascending: true });

    if (conversationId) {
      conversationQuery = conversationQuery.eq('id', conversationId);
    } else if (analysisType === 'recent_window') {
      // Last 24 hours or last 20 messages
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      conversationQuery = conversationQuery
        .gte('sent_at', yesterday)
        .limit(20);
    } else if (analysisType === 'full_history') {
      conversationQuery = conversationQuery.limit(100);
    }

    const { data: conversations, error: convError } = await conversationQuery;

    if (convError) {
      throw new Error(`Error fetching conversations: ${convError.message}`);
    }

    if (!conversations || conversations.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        lead_id: leadId,
        analysis: {
          message: 'No conversations found for analysis',
          conversation_count: 0
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prepare conversation data for analysis
    const conversationData = {
      lead: {
        id: lead.id,
        vehicle_interest: lead.vehicle_interest,
        source: lead.source,
        status: lead.status,
        created_at: lead.created_at,
        location: `${lead.city || ''}, ${lead.state || ''}`.trim()
      },
      conversations: conversations.map(conv => ({
        id: conv.id,
        direction: conv.direction,
        body: conv.body,
        sent_at: conv.sent_at,
        ai_generated: conv.ai_generated || false,
        timestamp_relative: Math.floor((Date.now() - new Date(conv.sent_at).getTime()) / (1000 * 60))
      })),
      analysis_type: analysisType,
      total_messages: conversations.length,
      analysis_timestamp: new Date().toISOString()
    };

    const prompt = `You are an advanced AI conversation analyst specializing in automotive sales. Analyze this conversation data and provide comprehensive insights.

CONVERSATION DATA:
${JSON.stringify(conversationData, null, 2)}

Perform deep conversation analysis focusing on:

1. SENTIMENT ANALYSIS:
   - Overall emotional tone progression
   - Customer satisfaction indicators
   - Frustration or concern signals
   - Engagement enthusiasm levels

2. INTENT DETECTION:
   - Primary purchase intent strength
   - Secondary motivations
   - Decision timeline indicators
   - Budget/financing signals

3. CONVERSATION QUALITY:
   - Communication effectiveness
   - Response quality and relevance
   - Information gathering success
   - Relationship building progress

4. BEHAVIORAL PATTERNS:
   - Response timing patterns
   - Message length and detail
   - Question asking frequency
   - Initiative taking behaviors

5. BUYING SIGNALS:
   - Explicit purchase indicators
   - Implicit readiness signals
   - Urgency markers
   - Commitment level indicators

PROVIDE RESPONSE IN THIS EXACT JSON FORMAT:
{
  "sentiment_analysis": {
    "overall_sentiment": "very_positive" | "positive" | "neutral" | "negative" | "very_negative",
    "sentiment_progression": [
      {
        "message_range": "1-5",
        "sentiment": "positive",
        "confidence": number (0-100)
      }
    ],
    "emotional_indicators": {
      "enthusiasm": number (0-100),
      "frustration": number (0-100),
      "satisfaction": number (0-100),
      "trust": number (0-100)
    }
  },
  "intent_analysis": {
    "primary_intent": "immediate_purchase" | "researching" | "price_comparison" | "information_gathering" | "browsing",
    "intent_strength": number (0-100),
    "timeline_indicators": {
      "urgency_level": "immediate" | "within_week" | "within_month" | "undefined",
      "decision_readiness": number (0-100)
    },
    "budget_signals": {
      "budget_mentioned": boolean,
      "financing_interest": boolean,
      "price_sensitivity": "low" | "medium" | "high"
    }
  },
  "conversation_quality": {
    "overall_quality": number (0-100),
    "communication_effectiveness": number (0-100),
    "information_gathering": number (0-100),
    "relationship_building": number (0-100),
    "areas_for_improvement": ["area1", "area2"]
  },
  "behavioral_patterns": {
    "response_consistency": number (0-100),
    "engagement_level": number (0-100),
    "initiative_taking": number (0-100),
    "detail_sharing": number (0-100)
  },
  "buying_signals": {
    "explicit_signals": ["signal1", "signal2"],
    "implicit_signals": ["signal1", "signal2"],
    "readiness_score": number (0-100),
    "conversion_probability": number (0-100)
  },
  "key_topics": [
    {
      "topic": "topic name",
      "frequency": number,
      "sentiment": "positive" | "neutral" | "negative",
      "importance": "high" | "medium" | "low"
    }
  ],
  "conversation_summary": "comprehensive summary of the conversation flow and key points",
  "recommendations": [
    {
      "type": "immediate_action" | "follow_up" | "strategy_adjustment",
      "priority": "critical" | "high" | "medium" | "low",
      "action": "specific recommendation",
      "reasoning": "why this is recommended"
    }
  ],
  "next_conversation_strategy": {
    "recommended_approach": "consultative" | "urgent" | "educational" | "closing",
    "key_focus_areas": ["area1", "area2"],
    "questions_to_ask": ["question1", "question2"],
    "information_to_gather": ["info1", "info2"]
  },
  "risk_factors": ["risk1", "risk2"],
  "opportunities": ["opportunity1", "opportunity2"],
  "confidence_level": number (0-100),
  "analysis_notes": "detailed analytical notes and reasoning"
}

Be thorough, insightful, and actionable. Focus on patterns that indicate sales progression opportunities.`;

    console.log(`🧠 [CONV-ANALYSIS] Sending to GPT-4.1 for analysis...`);

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
            content: 'You are an expert automotive sales conversation analyst that provides deep, actionable insights. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2, // Low temperature for analytical consistency
        max_tokens: 3000
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const aiResponse = await response.json();
    const analysis = JSON.parse(aiResponse.choices[0].message.content);

    console.log(`✅ [CONV-ANALYSIS] Analysis complete. Quality score: ${analysis.conversation_quality.overall_quality}`);

    // Store conversation notes
    if (analysis.conversation_summary) {
      const { error: notesError } = await supabase
        .from('ai_conversation_notes')
        .insert({
          lead_id: leadId,
          conversation_id: conversationId || null,
          note_type: 'ai_analysis_summary',
          note_content: analysis.conversation_summary,
          vehicles_discussed: analysis.key_topics
            ?.filter(topic => topic.topic.toLowerCase().includes('vehicle') || topic.topic.toLowerCase().includes('car'))
            ?.map(topic => ({ topic: topic.topic, sentiment: topic.sentiment })) || []
        });

      if (notesError) {
        console.error(`❌ Error storing conversation notes: ${notesError.message}`);
      }
    }

    // Update conversation context
    const contextUpdate = {
      lead_id: leadId,
      conversation_summary: analysis.conversation_summary,
      key_topics: analysis.key_topics?.map(t => t.topic) || [],
      response_style: analysis.next_conversation_strategy.recommended_approach,
      last_interaction_type: analysisType,
      context_score: analysis.conversation_quality.overall_quality,
      lead_preferences: {
        communication_style: analysis.next_conversation_strategy.recommended_approach,
        identified_interests: analysis.key_topics?.filter(t => t.importance === 'high').map(t => t.topic) || [],
        sentiment_profile: analysis.sentiment_analysis.emotional_indicators,
        buying_readiness: analysis.buying_signals.readiness_score
      },
      updated_at: new Date().toISOString()
    };

    const { error: contextError } = await supabase
      .from('ai_conversation_context')
      .upsert(contextUpdate);

    if (contextError) {
      console.error(`❌ Error updating conversation context: ${contextError.message}`);
    }

    return new Response(JSON.stringify({
      success: true,
      lead_id: leadId,
      conversation_id: conversationId,
      analysis_type: analysisType,
      analysis: analysis,
      analyzed_messages: conversations.length,
      generated_at: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ [CONV-ANALYSIS] Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});