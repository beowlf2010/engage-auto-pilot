
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ConversationMessage {
  body: string;
  direction: 'in' | 'out';
  sentAt: string;
  aiGenerated: boolean;
}

interface ConversationHistoryProps {
  conversationHistory: ConversationMessage[];
  formatTime: (timestamp: string) => string;
}

const ConversationHistory = ({ conversationHistory, formatTime }: ConversationHistoryProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Recent Conversation</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {conversationHistory.map((msg, index) => (
            <div
              key={index}
              className={`p-2 rounded text-sm ${
                msg.direction === 'in'
                  ? 'bg-blue-50 border-l-2 border-blue-500'
                  : 'bg-gray-50 border-l-2 border-gray-500'
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-medium text-xs">
                  {msg.direction === 'in' ? 'Customer' : msg.aiGenerated ? 'AI' : 'Manual'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatTime(msg.sentAt)}
                </span>
              </div>
              <p>{msg.body}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ConversationHistory;
