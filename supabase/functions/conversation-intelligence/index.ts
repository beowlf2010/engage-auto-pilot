import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leadId, messages, leadContext } = await req.json();
    
    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No messages provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Build conversation history for AI analysis
    const conversationText = messages.map((m: any) => 
      `${m.direction === 'in' ? 'Customer' : 'Salesperson'}: ${m.body}`
    ).join('\n');

    const systemPrompt = `You are an expert automotive sales AI analyzing customer conversations to detect buying signals and generate helpful response suggestions.

Analyze this conversation with ${leadContext.name || 'a customer'} who is interested in: ${leadContext.vehicleInterest || 'finding the right vehicle'}.
Current lead status: ${leadContext.status || 'new'}

Your task:
1. Detect buying signals (budget mentions, timeline urgency, feature requests, trade-in mentions, test drive requests)
2. Assess lead temperature (0-100 score)
3. Identify conversation stage (discovery, presentation, closing)
4. Generate 3-5 contextual response suggestions

Return ONLY valid JSON in this exact format:
{
  "analysis": {
    "leadTemperature": 75,
    "stage": "presentation",
    "buyingSignals": [
      {"type": "timeline", "strength": "high", "text": "need a car by next week", "confidence": 0.9}
    ],
    "urgency": "high"
  },
  "suggestions": [
    {
      "message": "Great! I can help you find the perfect vehicle by next week. Would you like to schedule a test drive tomorrow?",
      "confidence": 0.85,
      "reasoning": "Customer expressed timeline urgency, suggesting immediate next step",
      "responseType": "action_oriented"
    }
  ]
}`;

    console.log('🤖 Analyzing conversation for lead:', leadId);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Conversation:\n${conversationText}\n\nProvide analysis as JSON only.` }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    
    console.log('✅ AI Response received');

    // Parse JSON from AI response
    let analysisResult;
    try {
      // Try to extract JSON if response has extra text
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      analysisResult = JSON.parse(jsonMatch ? jsonMatch[0] : aiResponse);
    } catch (parseError) {
      console.error('❌ Failed to parse AI response:', aiResponse);
      throw new Error('Invalid AI response format');
    }

    // Ensure proper structure
    if (!analysisResult.analysis || !analysisResult.suggestions) {
      throw new Error('AI response missing required fields');
    }

    return new Response(
      JSON.stringify(analysisResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in conversation-intelligence:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        fallback: true 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
