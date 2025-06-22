
import React, { useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, AlertTriangle, CheckCircle, Users, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { unknownMessageLearning } from '@/services/unknownMessageLearning';

interface EnhancedMessageWrapperProps {
  onMessageSent?: () => void;
  onLeadsRefresh?: () => void;
}

interface AIInsightsPanelProps {
  analysis: any;
  className?: string;
}

export const AIInsightsPanel: React.FC<AIInsightsPanelProps> = ({ analysis, className = "" }) => {
  if (!analysis) return null;

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'urgent': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'positive': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'opportunity': return <TrendingUp className="w-4 h-4 text-blue-500" />;
      default: return <Brain className="w-4 h-4 text-purple-500" />;
    }
  };

  return (
    <Card className={`bg-purple-50 border-purple-200 ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Brain className="w-4 h-4 text-purple-600" />
          AI Conversation Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {analysis.customerIntent && (
          <div>
            <div className="text-xs font-medium text-gray-600 mb-1">Customer Intent</div>
            <Badge variant="secondary" className="text-xs">
              {analysis.customerIntent}
            </Badge>
          </div>
        )}
        
        {analysis.leadTemperature && (
          <div>
            <div className="text-xs font-medium text-gray-600 mb-1">Lead Temperature</div>
            <div className="flex items-center gap-2">
              <div className="text-sm font-medium">{analysis.leadTemperature}%</div>
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-purple-500 h-2 rounded-full" 
                  style={{ width: `${analysis.leadTemperature}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {analysis.insights && analysis.insights.length > 0 && (
          <div>
            <div className="text-xs font-medium text-gray-600 mb-2">Key Insights</div>
            <div className="space-y-1">
              {analysis.insights.slice(0, 3).map((insight: any, index: number) => (
                <div key={index} className="flex items-start gap-2 text-xs">
                  {getInsightIcon(insight.type)}
                  <span className="text-gray-700">{insight.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {analysis.recommendations && analysis.recommendations.length > 0 && (
          <div>
            <div className="text-xs font-medium text-gray-600 mb-2">Recommendations</div>
            <div className="space-y-1">
              {analysis.recommendations.slice(0, 2).map((rec: any, index: number) => (
                <div key={index} className="text-xs text-purple-700 bg-purple-100 rounded px-2 py-1">
                  {rec}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-gray-500 mt-3 pt-2 border-t border-purple-200">
          <Users className="w-3 h-3" />
          AI Analysis • Updated just now
        </div>
      </CardContent>
    </Card>
  );
};

export const useEnhancedMessageWrapper = ({ onMessageSent, onLeadsRefresh }: EnhancedMessageWrapperProps) => {
  
  const sendEnhancedMessageWrapper = useCallback(async (
    leadId: string,
    messageContent: string,
    isTemplate?: boolean
  ) => {
    try {
      console.log('📤 [ENHANCED WRAPPER] Sending message:', messageContent);

      // Get recent conversation to check for unknown AI scenarios
      const { data: recentMessages } = await supabase
        .from('conversations')
        .select('*')
        .eq('lead_id', leadId)
        .order('sent_at', { ascending: false })
        .limit(10);

      // Check if the most recent customer message was unhandled by AI
      const customerMessages = recentMessages?.filter(msg => msg.direction === 'in') || [];
      const lastCustomerMessage = customerMessages[0];
      
      if (lastCustomerMessage) {
        // Check if AI failed to respond to this message
        const aiResponseAfter = recentMessages?.find(msg => 
          msg.direction === 'out' && 
          msg.ai_generated && 
          new Date(msg.sent_at) > new Date(lastCustomerMessage.sent_at)
        );

        // If no AI response exists, this human response is learning data
        if (!aiResponseAfter) {
          console.log('🧠 [ENHANCED WRAPPER] Capturing human response as learning data');
          
          await unknownMessageLearning.captureHumanResponse(
            leadId,
            lastCustomerMessage.body,
            messageContent,
            lastCustomerMessage.id
          );
        }
      }

      // Send the actual message
      await supabase.from('conversations').insert({
        lead_id: leadId,
        direction: 'out',
        body: messageContent,
        ai_generated: false
      });

      console.log('✅ [ENHANCED WRAPPER] Message sent successfully');
      
      if (onMessageSent) {
        onMessageSent();
      }
      
      if (onLeadsRefresh) {
        onLeadsRefresh();
      }

    } catch (error) {
      console.error('❌ [ENHANCED WRAPPER] Error sending message:', error);
      throw error;
    }
  }, [onMessageSent, onLeadsRefresh]);

  return {
    sendEnhancedMessageWrapper
  };
};
