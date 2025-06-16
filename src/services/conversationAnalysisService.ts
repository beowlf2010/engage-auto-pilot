
import { supabase } from '@/integrations/supabase/client';

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

export interface MessageSentiment {
  id: string;
  conversationId: string;
  sentimentScore: number; // -1.0 to 1.0
  sentimentLabel: 'positive' | 'negative' | 'neutral';
  confidenceScore: number; // 0.0 to 1.0
  emotions: string[];
  createdAt: string;
}

export interface ResponseSuggestion {
  id: string;
  leadId: string;
  suggestionText: string;
  contextType: string;
  confidenceScore: number;
  usageCount: number;
  successCount: number;
  createdAt: string;
}

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
      keyPoints: summaryData.key_points,
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

// Analyze message sentiment
export const analyzeMessageSentiment = async (conversationId: string, messageBody: string): Promise<MessageSentiment | null> => {
  try {
    const { data: aiResponse, error: aiError } = await supabase.functions.invoke('analyze-conversation', {
      body: {
        action: 'sentiment',
        message: messageBody
      }
    });

    if (aiError) {
      console.error('Error analyzing sentiment:', aiError);
      return null;
    }

    const { sentimentScore, sentimentLabel, confidenceScore, emotions } = aiResponse;

    // Store sentiment in database
    const { data: sentimentData, error: sentimentError } = await supabase
      .from('message_sentiment')
      .insert({
        conversation_id: conversationId,
        sentiment_score: sentimentScore,
        sentiment_label: sentimentLabel,
        confidence_score: confidenceScore,
        emotions: emotions
      })
      .select()
      .single();

    if (sentimentError) {
      console.error('Error storing sentiment:', sentimentError);
      return null;
    }

    return {
      id: sentimentData.id,
      conversationId: sentimentData.conversation_id,
      sentimentScore: sentimentData.sentiment_score,
      sentimentLabel: sentimentData.sentiment_label,
      confidenceScore: sentimentData.confidence_score,
      emotions: sentimentData.emotions,
      createdAt: sentimentData.created_at
    };
  } catch (error) {
    console.error('Error in analyzeMessageSentiment:', error);
    return null;
  }
};

// Generate response suggestions
export const generateResponseSuggestions = async (leadId: string): Promise<ResponseSuggestion[]> => {
  try {
    // Get recent messages and lead context
    const { data: messages, error: messagesError } = await supabase
      .from('conversations')
      .select('*')
      .eq('lead_id', leadId)
      .order('sent_at', { ascending: false })
      .limit(10);

    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (messagesError || leadError || !messages || !lead) {
      console.error('Error fetching data:', messagesError || leadError);
      return [];
    }

    // Call AI service to generate suggestions
    const { data: aiResponse, error: aiError } = await supabase.functions.invoke('analyze-conversation', {
      body: {
        action: 'suggestions',
        messages: messages.map(msg => ({
          direction: msg.direction,
          body: msg.body,
          sentAt: msg.sent_at
        })),
        leadContext: {
          firstName: lead.first_name,
          vehicleInterest: lead.vehicle_interest,
          status: lead.status
        }
      }
    });

    if (aiError) {
      console.error('Error generating suggestions:', aiError);
      return [];
    }

    const suggestions = aiResponse.suggestions || [];

    // Store suggestions in database
    const suggestionPromises = suggestions.map(async (suggestion: any) => {
      const { data, error } = await supabase
        .from('response_suggestions')
        .insert({
          lead_id: leadId,
          suggestion_text: suggestion.text,
          context_type: suggestion.contextType,
          confidence_score: suggestion.confidence
        })
        .select()
        .single();

      if (error) {
        console.error('Error storing suggestion:', error);
        return null;
      }

      return {
        id: data.id,
        leadId: data.lead_id,
        suggestionText: data.suggestion_text,
        contextType: data.context_type,
        confidenceScore: data.confidence_score,
        usageCount: data.usage_count,
        successCount: data.success_count,
        createdAt: data.created_at
      };
    });

    const results = await Promise.all(suggestionPromises);
    return results.filter(Boolean) as ResponseSuggestion[];
  } catch (error) {
    console.error('Error in generateResponseSuggestions:', error);
    return [];
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
      keyPoints: data.key_points,
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

// Get message sentiment for a conversation
export const getMessageSentiments = async (conversationIds: string[]): Promise<MessageSentiment[]> => {
  try {
    const { data, error } = await supabase
      .from('message_sentiment')
      .select('*')
      .in('conversation_id', conversationIds)
      .order('created_at', { ascending: false });

    if (error || !data) {
      return [];
    }

    return data.map(item => ({
      id: item.id,
      conversationId: item.conversation_id,
      sentimentScore: item.sentiment_score,
      sentimentLabel: item.sentiment_label,
      confidenceScore: item.confidence_score,
      emotions: item.emotions,
      createdAt: item.created_at
    }));
  } catch (error) {
    console.error('Error getting message sentiments:', error);
    return [];
  }
};
