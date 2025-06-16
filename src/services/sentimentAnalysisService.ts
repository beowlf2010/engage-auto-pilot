
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export interface MessageSentiment {
  id: string;
  conversationId: string;
  sentimentScore: number;
  sentimentLabel: 'positive' | 'negative' | 'neutral';
  confidenceScore: number;
  emotions: string[];
  createdAt: string;
}

const isValidSentimentLabel = (label: string): label is 'positive' | 'negative' | 'neutral' => {
  return ['positive', 'negative', 'neutral'].includes(label);
};

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

    // Validate sentiment label
    const validatedSentimentLabel = isValidSentimentLabel(sentimentLabel) ? sentimentLabel : 'neutral';

    // Store sentiment in database
    const { data: sentimentData, error: sentimentError } = await supabase
      .from('message_sentiment')
      .insert({
        conversation_id: conversationId,
        sentiment_score: sentimentScore,
        sentiment_label: validatedSentimentLabel,
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
      sentimentLabel: validatedSentimentLabel,
      confidenceScore: sentimentData.confidence_score,
      emotions: parseJsonArray(sentimentData.emotions),
      createdAt: sentimentData.created_at
    };
  } catch (error) {
    console.error('Error in analyzeMessageSentiment:', error);
    return null;
  }
};

// Get message sentiment for conversations
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
      sentimentLabel: isValidSentimentLabel(item.sentiment_label) ? item.sentiment_label : 'neutral',
      confidenceScore: item.confidence_score,
      emotions: parseJsonArray(item.emotions),
      createdAt: item.created_at
    }));
  } catch (error) {
    console.error('Error getting message sentiments:', error);
    return [];
  }
};
