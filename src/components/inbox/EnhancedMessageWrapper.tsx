
import React from 'react';
import { useEnhancedConversationAI } from '@/hooks/useEnhancedConversationAI';

interface UseEnhancedMessageWrapperProps {
  onMessageSent?: () => void;
  onLeadsRefresh?: () => void;
}

export const useEnhancedMessageWrapper = ({ onMessageSent, onLeadsRefresh }: UseEnhancedMessageWrapperProps) => {
  const { analyzeConversation, getResponseSuggestion, lastAnalysis } = useEnhancedConversationAI();

  const sendEnhancedMessageWrapper = async (leadId: string, message: string) => {
    try {
      console.log('📤 Sending enhanced message for lead:', leadId);
      
      // Trigger the original message sending logic
      if (onMessageSent) {
        onMessageSent();
      }

      // Trigger leads refresh
      if (onLeadsRefresh) {
        onLeadsRefresh();
      }

      console.log('✅ Enhanced message sent successfully');
    } catch (error) {
      console.error('❌ Error in enhanced message wrapper:', error);
      throw error;
    }
  };

  const analyzeCurrentConversation = async (
    leadId: string,
    conversationHistory: string,
    latestMessage: string,
    leadName: string,
    vehicleInterest: string
  ) => {
    return await analyzeConversation(leadId, conversationHistory, latestMessage, leadName, vehicleInterest);
  };

  return {
    sendEnhancedMessageWrapper,
    analyzeCurrentConversation,
    getResponseSuggestion,
    lastAnalysis
  };
};

// Component to display AI insights
export const AIInsightsPanel: React.FC<{
  analysis: any;
  className?: string;
}> = ({ analysis, className = '' }) => {
  if (!analysis) return null;

  return (
    <div className={`bg-purple-50 border border-purple-200 rounded-lg p-4 ${className}`}>
      <h4 className="font-semibold text-purple-800 mb-2">🤖 AI Insights</h4>
      
      <div className="space-y-2 text-sm">
        <div>
          <span className="font-medium">Lead Temperature:</span> 
          <span className={`ml-2 px-2 py-1 rounded text-xs ${
            analysis.leadTemperature > 80 ? 'bg-red-100 text-red-700' :
            analysis.leadTemperature > 60 ? 'bg-yellow-100 text-yellow-700' :
            'bg-green-100 text-green-700'
          }`}>
            {analysis.leadTemperature}%
          </span>
        </div>
        
        <div>
          <span className="font-medium">Stage:</span> 
          <span className="ml-2 capitalize">{analysis.conversationStage}</span>
        </div>

        {analysis.buyingSignals.length > 0 && (
          <div>
            <span className="font-medium">Buying Signals:</span>
            <ul className="ml-2 mt-1">
              {analysis.buyingSignals.slice(0, 2).map((signal: any, index: number) => (
                <li key={index} className="text-xs">
                  • {signal.type} ({Math.round(signal.strength * 100)}%)
                </li>
              ))}
            </ul>
          </div>
        )}

        {analysis.nextBestActions.length > 0 && (
          <div>
            <span className="font-medium">Suggested Actions:</span>
            <ul className="ml-2 mt-1">
              {analysis.nextBestActions.slice(0, 3).map((action: string, index: number) => (
                <li key={index} className="text-xs">
                  • {action}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
