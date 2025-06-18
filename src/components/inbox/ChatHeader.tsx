
import React from 'react';
import { CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Car, Bot, BarChart3 } from 'lucide-react';
import SentimentIndicator from '../conversation/SentimentIndicator';

interface ChatHeaderProps {
  selectedConversation: any;
  showAnalysis: boolean;
  showLeadContext: boolean;
  averageSentiment: number;
  onToggleAnalysis: () => void;
  onToggleLeadContext: () => void;
}

const ChatHeader = ({
  selectedConversation,
  showAnalysis,
  showLeadContext,
  averageSentiment,
  onToggleAnalysis,
  onToggleLeadContext
}: ChatHeaderProps) => {
  return (
    <CardHeader className="pb-3 border-b">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {selectedConversation.leadName}
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-slate-600 mt-1">
              <Car className="h-3 w-3" />
              <span>{selectedConversation.vehicleInterest}</span>
              {selectedConversation.aiOptIn && (
                <Badge variant="outline" className="ml-2 text-xs bg-purple-50 text-purple-700">
                  <Bot className="h-3 w-3 mr-1" />
                  AI Active
                </Badge>
              )}
              {averageSentiment !== 0 && (
                <SentimentIndicator
                  sentimentScore={averageSentiment}
                  sentimentLabel={
                    averageSentiment > 0.1 ? 'positive' : 
                    averageSentiment < -0.1 ? 'negative' : 'neutral'
                  }
                  showDetails={false}
                  size="sm"
                />
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleAnalysis}
            className={showAnalysis ? 'bg-blue-50 text-blue-700' : ''}
          >
            <BarChart3 className="h-4 w-4 mr-1" />
            Analysis
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleLeadContext}
          >
            {showLeadContext ? 'Hide' : 'Show'} Details
          </Button>
          {selectedConversation.unreadCount > 0 && (
            <Badge variant="destructive">
              {selectedConversation.unreadCount} unread
            </Badge>
          )}
        </div>
      </div>
    </CardHeader>
  );
};

export default ChatHeader;
