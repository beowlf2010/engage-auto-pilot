
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
    // Get all messages for the lead
    const { data: messages, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('lead_id', leadId)
      .order('sent_at', { ascending: true });

    if (error || !messages || messages.length === 0) {
      console.error('Error fetching messages:', error);
      return null;
    }

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
      console.error('Error generating summary:', aiError);
      return null;
    }

    const { summary, keyPoints } = aiResponse;

    // Store or update summary in database
    const { data: summaryData, error: summaryError } = await supabase
      .from('conversation_summaries')
      .upsert({
        lead_id: leadId,
        summary_text: summary,
        key_points: keyPoints,
        message_count: messages.length,
        last_message_at: messages[messages.length - 1].sent_at,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'lead_id'
      })
      .select()
      .single();

    if (summaryError) {
      console.error('Error storing summary:', summaryError);
      return null;
    }

    return {
      id: summaryData.id,
      leadId: summaryData.lead_id,
      summaryText: summaryData.summary_text,
      keyPoints: parseJsonArray(summaryData.key_points),
      messageCount: summaryData.message_count,
      lastMessageAt: summaryData.last_message_at,
      createdAt: summaryData.created_at,
      updatedAt: summaryData.updated_at
    };
  } catch (error) {
    console.error('Error in generateConversationSummary:', error);
    return null;
  }
};

// Get existing conversation summary
export const getConversationSummary = async (leadId: string): Promise<ConversationSummary | null> => {
  try {
    const { data, error } = await supabase
      .from('conversation_summaries')
      .select('*')
      .eq('lead_id', leadId)
      .single();

    if (error || !data) {
      return null;
    }

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
    console.error('Error getting conversation summary:', error);
    return null;
  }
};
