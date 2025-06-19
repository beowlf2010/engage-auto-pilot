
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export interface ConversationSummary {
  id: string;
  leadId: string;
  summaryText: string;
  keyPoints: string[];
  messageCount: number;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
}

const parseJsonArray = (jsonValue: Json | null | undefined): string[] => {
  if (Array.isArray(jsonValue)) return jsonValue.filter((item): item is string => typeof item === 'string');
  if (typeof jsonValue === 'string') {
    try {
      const parsed = JSON.parse(jsonValue);
      return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
    } catch {
      return [];
    }
  }
  return [];
};

// Generate conversation summary using AI
export const generateConversationSummary = async (leadId: string): Promise<ConversationSummary | null> => {
  try {
    console.log(`📊 [CONVERSATION SUMMARY] Generating summary for lead ${leadId}`);

    // Get all messages for the lead
    const { data: messages, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('lead_id', leadId)
      .order('sent_at', { ascending: true });

    if (error || !messages || messages.length === 0) {
      console.error('❌ [CONVERSATION SUMMARY] Error fetching messages:', error);
      return null;
    }

    console.log(`📝 [CONVERSATION SUMMARY] Found ${messages.length} messages to analyze`);

    // Call AI service to generate summary
    const { data: aiResponse, error: aiError } = await supabase.functions.invoke('analyze-conversation', {
      body: {
        action: 'summarize',
        messages: messages.map(msg => ({
          direction: msg.direction,
          body: msg.body,
          sentAt: msg.sent_at
        }))
      }
    });

    if (aiError) {
      console.error('❌ [CONVERSATION SUMMARY] Error generating summary:', aiError);
      return null;
    }

    const { summary, keyPoints } = aiResponse;
    console.log(`✨ [CONVERSATION SUMMARY] AI generated summary: "${summary?.substring(0, 50)}..."`);

    // Check if summary already exists for this lead
    const { data: existingSummary } = await supabase
      .from('conversation_summaries')
      .select('*')
      .eq('lead_id', leadId)
      .single();

    const summaryData = {
      lead_id: leadId,
      summary_text: summary,
      key_points: keyPoints,
      message_count: messages.length,
      last_message_at: messages[messages.length - 1].sent_at,
      updated_at: new Date().toISOString()
    };

    let result;

    if (existingSummary) {
      // Update existing summary
      console.log(`🔄 [CONVERSATION SUMMARY] Updating existing summary for lead ${leadId}`);
      const { data, error: updateError } = await supabase
        .from('conversation_summaries')
        .update(summaryData)
        .eq('lead_id', leadId)
        .select()
        .single();

      if (updateError) {
        console.error('❌ [CONVERSATION SUMMARY] Error updating summary:', updateError);
        return null;
      }
      result = data;
    } else {
      // Create new summary
      console.log(`✨ [CONVERSATION SUMMARY] Creating new summary for lead ${leadId}`);
      const { data, error: insertError } = await supabase
        .from('conversation_summaries')
        .insert({
          ...summaryData,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ [CONVERSATION SUMMARY] Error creating summary:', insertError);
        return null;
      }
      result = data;
    }

    console.log(`✅ [CONVERSATION SUMMARY] Successfully saved summary for lead ${leadId}`);

    return {
      id: result.id,
      leadId: result.lead_id,
      summaryText: result.summary_text,
      keyPoints: parseJsonArray(result.key_points),
      messageCount: result.message_count,
      lastMessageAt: result.last_message_at,
      createdAt: result.created_at,
      updatedAt: result.updated_at
    };
  } catch (error) {
    console.error('❌ [CONVERSATION SUMMARY] Error in generateConversationSummary:', error);
    return null;
  }
};

// Get existing conversation summary
export const getConversationSummary = async (leadId: string): Promise<ConversationSummary | null> => {
  try {
    console.log(`📖 [CONVERSATION SUMMARY] Getting existing summary for lead ${leadId}`);

    const { data, error } = await supabase
      .from('conversation_summaries')
      .select('*')
      .eq('lead_id', leadId)
      .single();

    if (error || !data) {
      console.log(`ℹ️ [CONVERSATION SUMMARY] No existing summary found for lead ${leadId}`);
      return null;
    }

    console.log(`✅ [CONVERSATION SUMMARY] Found existing summary for lead ${leadId}`);

    return {
      id: data.id,
      leadId: data.lead_id,
      summaryText: data.summary_text,
      keyPoints: parseJsonArray(data.key_points),
      messageCount: data.message_count,
      lastMessageAt: data.last_message_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  } catch (error) {
    console.error('❌ [CONVERSATION SUMMARY] Error getting conversation summary:', error);
    return null;
  }
};
