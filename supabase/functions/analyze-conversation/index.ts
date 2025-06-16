
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { action, ...payload } = await req.json();

    console.log('Analyzing conversation with action:', action);

    let result;
    switch (action) {
      case 'summarize':
        result = await summarizeConversation(payload.messages);
        break;
      case 'sentiment':
        result = await analyzeSentiment(payload.message);
        break;
      case 'suggestions':
        result = await generateSuggestions(payload.messages, payload.leadContext);
        break;
      case 'compliance_check':
        result = await checkCompliance(payload.message, payload.ruleType);
        break;
      case 'quality_score':
        result = await analyzeQuality(payload.messages, payload.sentiments);
        break;
      case 'training_recommendations':
        result = await generateTrainingRecommendations(payload.qualityScores, payload.violations, payload.salespersonId);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in analyze-conversation function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function summarizeConversation(messages: any[]) {
  if (!openAIApiKey) {
    return { summary: 'OpenAI API key not configured', keyPoints: [] };
  }

  const conversationText = messages.map(msg => 
    `${msg.direction === 'in' ? 'Customer' : 'Salesperson'}: ${msg.body}`
  ).join('\n');

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
          content: `You are analyzing automotive sales conversations. Provide a concise summary and extract key points. Return a JSON object with 'summary' (string) and 'keyPoints' (array of strings).`
        },
        {
          role: 'user',
          content: `Analyze this conversation:\n\n${conversationText}`
        }
      ],
      response_format: { type: "json_object" }
    }),
  });

  const data = await response.json();
  const result = JSON.parse(data.choices[0].message.content);
  
  return {
    summary: result.summary || 'Unable to generate summary',
    keyPoints: result.keyPoints || []
  };
}

async function analyzeSentiment(message: string) {
  if (!openAIApiKey) {
    return { sentimentScore: 0, sentimentLabel: 'neutral', confidenceScore: 0.5, emotions: [] };
  }

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
          content: `Analyze the sentiment of this message. Return JSON with: sentimentScore (-1.0 to 1.0), sentimentLabel ('positive', 'negative', or 'neutral'), confidenceScore (0.0 to 1.0), and emotions (array of strings).`
        },
        {
          role: 'user',
          content: message
        }
      ],
      response_format: { type: "json_object" }
    }),
  });

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

async function generateSuggestions(messages: any[], leadContext: any) {
  if (!openAIApiKey) {
    return { suggestions: [] };
  }

  const conversationText = messages.slice(-5).map(msg => 
    `${msg.direction === 'in' ? 'Customer' : 'Salesperson'}: ${msg.body}`
  ).join('\n');

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
          content: `You are an automotive sales coach. Based on the conversation and lead context, suggest 2-3 appropriate response messages. Return JSON with 'suggestions' array containing objects with 'text', 'contextType', and 'confidence' fields.`
        },
        {
          role: 'user',
          content: `Lead: ${leadContext.firstName}, interested in: ${leadContext.vehicleInterest}, status: ${leadContext.status}\n\nRecent conversation:\n${conversationText}\n\nGenerate appropriate response suggestions.`
        }
      ],
      response_format: { type: "json_object" }
    }),
  });

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

async function checkCompliance(message: string, ruleType: string) {
  if (!openAIApiKey) {
    return { violation: false, detectedContent: '' };
  }

  const complianceRules = {
    'TCPA Violation Keywords': 'Check for TCPA violations like automated dialing, robocalls, or pre-recorded messages',
    'Do Not Call Violation': 'Check for do not call list violations or ignoring opt-out requests',
    'Inappropriate Language': 'Check for unprofessional, offensive, or inappropriate language',
    'Pressure Tactics': 'Check for high-pressure sales tactics, manipulation, or coercion',
    'Misleading Claims': 'Check for false or misleading claims about vehicles, pricing, or financing'
  };

  const ruleDescription = complianceRules[ruleType as keyof typeof complianceRules] || 'Check for compliance violations';

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
          content: `You are a compliance monitor for automotive sales. ${ruleDescription}. Return JSON with 'violation' (boolean) and 'detectedContent' (string with specific problematic text if violation found).`
        },
        {
          role: 'user',
          content: message
        }
      ],
      response_format: { type: "json_object" }
    }),
  });

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

async function analyzeQuality(messages: any[], sentiments: any[]) {
  if (!openAIApiKey) {
    return { 
      professionalismScore: 5.0, 
      engagementScore: 5.0, 
      closeAttemptScore: 5.0,
      qualityFactors: [],
      improvementAreas: []
    };
  }

  const conversationText = messages.map(msg => 
    `${msg.direction === 'in' ? 'Customer' : 'Salesperson'}: ${msg.body}`
  ).join('\n');

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
          content: `Analyze this automotive sales conversation for quality. Rate professionalism (0-10), engagement (0-10), and close attempts (0-10). Return JSON with these scores plus 'qualityFactors' and 'improvementAreas' arrays.`
        },
        {
          role: 'user',
          content: conversationText
        }
      ],
      response_format: { type: "json_object" }
    }),
  });

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

async function generateTrainingRecommendations(qualityScores: any[], violations: any[], salespersonId: string) {
  if (!openAIApiKey) {
    return { recommendations: [] };
  }

  const analysisData = {
    averageScore: qualityScores.length > 0 ? qualityScores.reduce((sum, score) => sum + score.overall_score, 0) / qualityScores.length : 0,
    weakAreas: qualityScores.flatMap(score => score.improvement_areas || []),
    violationTypes: violations.map(v => v.violation_type),
    recentViolations: violations.length
  };

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
          content: `Generate personalized training recommendations for an automotive salesperson based on their performance data. Return JSON with 'recommendations' array containing objects with 'type', 'title', 'description', 'priority' ('low', 'medium', 'high'), 'skillsFocus' array, and optional 'dueDate'.`
        },
        {
          role: 'user',
          content: `Performance analysis: ${JSON.stringify(analysisData)}`
        }
      ],
      response_format: { type: "json_object" }
    }),
  });

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}
