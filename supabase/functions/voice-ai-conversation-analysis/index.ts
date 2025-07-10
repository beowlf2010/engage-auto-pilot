import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js@2';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CONVERSATION_ANALYSIS_PROMPT = `
You are an expert sales conversation analyst. Analyze this sales call transcript and provide detailed insights.

Return your analysis as a JSON object with this exact structure:
{
  "sentiment_score": number between -1 and 1,
  "emotion_detected": "string (happy, frustrated, excited, concerned, etc.)",
  "intent_detected": "string (buying, researching, price_shopping, etc.)",
  "topics_discussed": ["topic1", "topic2", "topic3"],
  "objections_raised": [
    {"text": "specific objection", "confidence": 0.9, "type": "price|feature|timing|trust"}
  ],
  "buying_signals": [
    {"text": "specific buying signal", "confidence": 0.8, "strength": "strong|medium|weak"}
  ],
  "next_actions": [
    {"action": "specific action", "priority": "high|medium|low", "timeline": "immediate|week|month"}
  ],
  "conversation_summary": "2-3 sentence summary",
  "ai_recommendations": "specific recommendations for follow-up",
  "quality_score": number between 0 and 1,
  "talk_time_ratio": number between 0 and 1 (0 = customer talked more, 1 = sales rep talked more),
  "engagement_level": "low|medium|high",
  "call_outcome_prediction": "likely_sale|follow_up_needed|not_interested|undecided",
  "confidence_score": number between 0 and 1
}

Focus on:
- Identifying genuine buying signals vs casual interest
- Detecting specific objections that need addressing
- Measuring customer engagement and sentiment
- Providing actionable next steps
- Evaluating conversation quality and sales technique

Transcript:
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const supabase = createClient(supabaseUrl!, supabaseKey!);
    
    const { transcriptId, callLogId, leadId } = await req.json();

    console.log('🤖 [CONVERSATION AI] Starting analysis for transcript:', transcriptId);

    // Get transcript data
    const { data: transcript, error: transcriptError } = await supabase
      .from('call_transcriptions')
      .select('*')
      .eq('id', transcriptId)
      .single();

    if (transcriptError || !transcript) {
      throw new Error(`Failed to get transcript: ${transcriptError?.message}`);
    }

    if (!transcript.transcript_text) {
      throw new Error('No transcript text available for analysis');
    }

    console.log('📝 Analyzing transcript with AI...');

    // Call OpenAI for conversation analysis
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: CONVERSATION_ANALYSIS_PROMPT 
          },
          { 
            role: 'user', 
            content: transcript.transcript_text 
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const analysis = JSON.parse(data.choices[0].message.content);

    console.log('✅ AI analysis completed:', {
      sentiment: analysis.sentiment_score,
      engagement: analysis.engagement_level,
      buyingSignals: analysis.buying_signals?.length || 0,
      objections: analysis.objections_raised?.length || 0
    });

    // Save analysis to database
    const { data: analysisRecord, error: analysisError } = await supabase
      .from('call_conversation_analysis')
      .insert({
        call_log_id: callLogId,
        lead_id: leadId,
        transcript_id: transcriptId,
        sentiment_score: analysis.sentiment_score,
        emotion_detected: analysis.emotion_detected,
        intent_detected: analysis.intent_detected,
        topics_discussed: analysis.topics_discussed,
        objections_raised: analysis.objections_raised,
        buying_signals: analysis.buying_signals,
        next_actions: analysis.next_actions,
        conversation_summary: analysis.conversation_summary,
        ai_recommendations: analysis.ai_recommendations,
        quality_score: analysis.quality_score,
        talk_time_ratio: analysis.talk_time_ratio,
        engagement_level: analysis.engagement_level,
        call_outcome_prediction: analysis.call_outcome_prediction,
        confidence_score: analysis.confidence_score
      })
      .select()
      .single();

    if (analysisError) {
      throw new Error(`Failed to save analysis: ${analysisError.message}`);
    }

    // Update transcript status
    await supabase
      .from('call_transcriptions')
      .update({
        ai_analysis_status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', transcriptId);

    // Generate AI notification for high-priority insights
    if (analysis.buying_signals?.length > 0 || analysis.engagement_level === 'high') {
      await supabase
        .from('ai_notifications')
        .insert({
          lead_id: leadId,
          notification_type: 'call_insights_ready',
          title: 'Call Analysis Complete - Action Required',
          message: `Call analysis shows ${analysis.buying_signals?.length || 0} buying signals and ${analysis.engagement_level} engagement. ${analysis.ai_recommendations}`,
          urgency_level: analysis.buying_signals?.length > 0 ? 'high' : 'medium',
          ai_confidence: analysis.confidence_score,
          metadata: {
            call_log_id: callLogId,
            transcript_id: transcriptId,
            analysis_id: analysisRecord.id,
            key_insights: {
              buying_signals: analysis.buying_signals?.length || 0,
              objections: analysis.objections_raised?.length || 0,
              sentiment: analysis.sentiment_score,
              engagement: analysis.engagement_level
            }
          }
        });
    }

    console.log('✅ Analysis saved and notifications created');

    return new Response(JSON.stringify({
      success: true,
      analysisId: analysisRecord.id,
      analysis: analysis,
      insights: {
        buyingSignals: analysis.buying_signals?.length || 0,
        objections: analysis.objections_raised?.length || 0,
        sentiment: analysis.sentiment_score,
        engagement: analysis.engagement_level,
        qualityScore: analysis.quality_score
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ [CONVERSATION AI] Analysis error:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Failed to analyze conversation',
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});