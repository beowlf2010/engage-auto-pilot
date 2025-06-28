
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  Bot,
  Zap,
  TrendingUp, 
  MessageSquare,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import IntelligentAIPanel from './IntelligentAIPanel';
import AIInsightsPanel from '../ai/AIInsightsPanel';
import AIResponseSuggestions from '../ai/AIResponseSuggestions';
import { useAIResponseSuggestions } from '@/hooks/useAIResponseSuggestions';

interface InboxAIPanelProps {
  conversation: any;
  messages: any[];
  onSendMessage: (message: string) => Promise<void>;
  className?: string;
}

const InboxAIPanel: React.FC<InboxAIPanelProps> = ({
  conversation,
  messages,
  onSendMessage,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState('assistant');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const {
    suggestions,
    isLoading: suggestionsLoading,
    generateSuggestions
  } = useAIResponseSuggestions({
    leadId: conversation?.leadId,
    messages
  });

  const handleSuggestionSelect = async (message: string) => {
    await onSendMessage(message);
    // Refresh suggestions after sending
    if (conversation?.leadId) {
      generateSuggestions();
    }
  };

  if (!conversation) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <Bot className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Select a conversation to view AI assistance</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            AI Assistant
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>

      {!isCollapsed && (
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 mx-4 mb-4">
              <TabsTrigger value="assistant" className="text-xs">
                <Bot className="h-3 w-3 mr-1" />
                Assistant
              </TabsTrigger>
              <TabsTrigger value="insights" className="text-xs">
                <TrendingUp className="h-3 w-3 mr-1" />
                Insights
              </TabsTrigger>
              <TabsTrigger value="suggestions" className="text-xs">
                <Zap className="h-3 w-3 mr-1" />
                Suggest
              </TabsTrigger>
            </TabsList>

            <div className="px-4 pb-4">
              <TabsContent value="assistant" className="mt-0">
                <IntelligentAIPanel
                  conversation={conversation}
                  messages={messages}
                  onSendMessage={onSendMessage}
                  canReply={true}
                  isCollapsed={false}
                />
              </TabsContent>

              <TabsContent value="insights" className="mt-0">
                <AIInsightsPanel
                  leadId={conversation.leadId}
                  conversation={conversation}
                  messages={messages}
                  className="border-0 shadow-none p-0"
                />
              </TabsContent>

              <TabsContent value="suggestions" className="mt-0">
                <AIResponseSuggestions
                  suggestions={suggestions}
                  onSelectSuggestion={handleSuggestionSelect}
                  onRefresh={generateSuggestions}
                  isLoading={suggestionsLoading}
                />
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      )}
    </Card>
  );
};

export default InboxAIPanel;
