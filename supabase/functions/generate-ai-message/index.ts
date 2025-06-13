
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { leadId, stage = 'initial', context = {} } = await req.json();

    // Get lead information
    const { data: lead } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (!lead) {
      throw new Error('Lead not found');
    }

    // Get conversation history
    const { data: conversations } = await supabase
      .from('conversations')
      .select('body, direction, sent_at')
      .eq('lead_id', leadId)
      .order('sent_at', { ascending: false })
      .limit(10);

    // Get recent AI message history to avoid repetition
    const { data: messageHistory } = await supabase
      .from('ai_message_history')
      .select('message_content')
      .eq('lead_id', leadId)
      .order('sent_at', { ascending: false })
      .limit(5);

    // Get conversation context
    const { data: conversationContext } = await supabase
      .from('ai_conversation_context')
      .select('*')
      .eq('lead_id', leadId)
      .maybeSingle();

    // Get matching inventory
    const { data: matchingInventory } = await supabase.rpc('find_matching_inventory', { 
      p_lead_id: leadId 
    });

    // Get market insights
    const marketContext = await getMarketInsights(lead.vehicle_interest);

    // Build AI prompt
    const systemPrompt = buildSystemPrompt(lead, stage, conversationContext);
    const userPrompt = buildUserPrompt(
      lead, 
      conversations || [], 
      messageHistory || [], 
      matchingInventory || [],
      marketContext,
      context
    );

    // Generate message with OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 200,
      }),
    });

    const aiResponse = await response.json();
    const generatedMessage = aiResponse.choices[0].message.content;

    // Check for message uniqueness
    const messageHash = await generateMessageHash(generatedMessage);
    const isUnique = await checkMessageUniqueness(supabase, leadId, messageHash, generatedMessage);

    if (!isUnique) {
      // Regenerate with higher temperature for more variation
      const retryResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt + '\n\nIMPORTANT: Generate a completely different message approach than previous attempts.' },
            { role: 'user', content: userPrompt }
          ],
          temperature: 1.0,
          max_tokens: 200,
        }),
      });

      const retryAiResponse = await retryResponse.json();
      const retryMessage = retryAiResponse.choices[0].message.content;
      const retryHash = await generateMessageHash(retryMessage);
      
      // Store the unique message
      await storeMessageHistory(supabase, leadId, retryMessage, retryHash, context);
      return new Response(JSON.stringify({ message: retryMessage, generated: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Store the message history
    await storeMessageHistory(supabase, leadId, generatedMessage, messageHash, context);

    // Update conversation context
    await updateConversationContext(supabase, leadId, generatedMessage, lead, conversations || []);

    return new Response(JSON.stringify({ message: generatedMessage, generated: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating AI message:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function buildSystemPrompt(lead: any, stage: string, context: any): string {
  return `You are a professional automotive sales assistant. Your goal is to nurture leads and guide them toward visiting the dealership.

IMPORTANT RULES:
- Keep messages under 160 characters for SMS
- Be conversational and personable, not salesy
- Never repeat similar content from previous messages
- Use the lead's name naturally
- Focus on value and benefits
- Create urgency when appropriate
- Always end with a clear call to action

Lead Information:
- Name: ${lead.first_name} ${lead.last_name}
- Vehicle Interest: ${lead.vehicle_interest}
- Stage: ${stage}
- Messages sent: ${lead.ai_messages_sent || 0}

${context?.conversation_summary ? `Previous conversation context: ${context.conversation_summary}` : ''}
${context?.response_style ? `Preferred response style: ${context.response_style}` : ''}

Generate a unique, personalized message that feels natural and engaging.`;
}

function buildUserPrompt(
  lead: any, 
  conversations: any[], 
  messageHistory: any[], 
  inventory: any[], 
  marketContext: string,
  context: any
): string {
  let prompt = `Generate a unique message for ${lead.first_name} about ${lead.vehicle_interest}.

CONVERSATION HISTORY (last 10 messages):
${conversations.map(c => `${c.direction === 'in' ? 'Lead' : 'You'}: ${c.body}`).join('\n')}

PREVIOUS AI MESSAGES TO AVOID REPEATING:
${messageHistory.map(m => `- ${m.message_content}`).join('\n')}

${inventory.length > 0 ? `MATCHING INVENTORY:
${inventory.slice(0, 3).map(v => `${v.year} ${v.make} ${v.model} - $${v.price?.toLocaleString()}`).join('\n')}` : ''}

${marketContext ? `MARKET CONTEXT: ${marketContext}` : ''}

${context.urgency_factor ? `URGENCY: ${context.urgency_factor}` : ''}

Generate a completely unique message that:
1. Doesn't repeat any previous message content
2. Feels personal and relevant
3. Provides value or new information
4. Encourages engagement
5. Is under 160 characters`;

  return prompt;
}

async function getMarketInsights(vehicleInterest: string): Promise<string> {
  // Simple market context - could be enhanced with real market data
  const month = new Date().getMonth();
  if (month >= 9 && month <= 11) {
    return "Year-end clearance pricing in effect";
  } else if (month >= 2 && month <= 4) {
    return "Spring car buying season - best selection available";
  }
  return "";
}

async function generateMessageHash(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message.toLowerCase().replace(/\s+/g, ' ').trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function checkMessageUniqueness(
  supabase: any, 
  leadId: string, 
  messageHash: string, 
  message: string
): Promise<boolean> {
  // Check if identical hash exists
  const { data: existingHash } = await supabase
    .from('ai_message_history')
    .select('id')
    .eq('lead_id', leadId)
    .eq('message_hash', messageHash)
    .maybeSingle();

  if (existingHash) return false;

  // Check for similar messages using simple similarity
  const { data: recentMessages } = await supabase
    .from('ai_message_history')
    .select('message_content')
    .eq('lead_id', leadId)
    .order('sent_at', { ascending: false })
    .limit(5);

  if (recentMessages) {
    for (const recent of recentMessages) {
      const similarity = calculateSimilarity(message, recent.message_content);
      if (similarity > 0.8) return false;
    }
  }

  return true;
}

function calculateSimilarity(str1: string, str2: string): number {
  const words1 = str1.toLowerCase().split(/\s+/);
  const words2 = str2.toLowerCase().split(/\s+/);
  const intersection = words1.filter(word => words2.includes(word));
  const union = [...new Set([...words1, ...words2])];
  return intersection.length / union.length;
}

async function storeMessageHistory(
  supabase: any, 
  leadId: string, 
  message: string, 
  messageHash: string, 
  context: any
): Promise<void> {
  await supabase
    .from('ai_message_history')
    .insert({
      lead_id: leadId,
      message_content: message,
      message_hash: messageHash,
      context_data: context
    });
}

async function updateConversationContext(
  supabase: any, 
  leadId: string, 
  message: string, 
  lead: any, 
  conversations: any[]
): Promise<void> {
  // Simple context building - could be enhanced with more sophisticated analysis
  const keyTopics = [lead.vehicle_interest];
  if (message.toLowerCase().includes('financing')) keyTopics.push('financing');
  if (message.toLowerCase().includes('trade')) keyTopics.push('trade-in');

  const hasResponded = conversations.some(c => c.direction === 'in');
  const responseStyle = hasResponded ? 'engaged' : 'initial_outreach';

  await supabase
    .from('ai_conversation_context')
    .upsert({
      lead_id: leadId,
      conversation_summary: `Lead interested in ${lead.vehicle_interest}. ${conversations.length} total messages exchanged.`,
      key_topics: keyTopics,
      lead_preferences: {
        vehicle_interest: lead.vehicle_interest,
        has_responded: hasResponded
      },
      response_style: responseStyle,
      last_interaction_type: 'ai_message',
      context_score: Math.min(conversations.length * 10, 100)
    });
}
