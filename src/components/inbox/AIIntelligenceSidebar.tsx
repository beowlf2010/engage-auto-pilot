import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Brain, TrendingUp, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAIIntelligence } from '@/hooks/useAIIntelligence';
import type { ConversationListItem } from '@/types/conversation';

interface Message {
  id: string;
  body: string;
  direction: 'in' | 'out';
  sent_at: string;
  read_at?: string;
  ai_generated?: boolean;
}

interface AIIntelligenceSidebarProps {
  conversation: ConversationListItem | null;
  messages: Message[];
  onInsertSuggestion: (text: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const AIIntelligenceSidebar: React.FC<AIIntelligenceSidebarProps> = ({
  conversation,
  messages,
  onInsertSuggestion,
  isCollapsed,
  onToggleCollapse
}) => {
  const { analysis, suggestions, isAnalyzing, isGeneratingSuggestions } = useAIIntelligence(
    conversation?.leadId || null,
    messages,
    conversation ? {
      id: conversation.leadId,
      name: conversation.leadName,
      vehicle_interest: conversation.vehicleInterest,
      status: conversation.status
    } : null
  );

  if (isCollapsed) {
    return (
      <div className="w-12 border-l border-border/30 bg-card/60 backdrop-blur-xl flex flex-col items-center py-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className="mb-4"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Brain className="h-5 w-5 text-primary mb-2" />
        {isAnalyzing && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="w-80 border-l border-border/30 bg-card/60 backdrop-blur-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">AI Intelligence</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={onToggleCollapse}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground text-center py-8">
          Select a conversation to see AI insights
        </p>
      </div>
    );
  }

  return (
    <div className="w-80 border-l border-border/30 bg-card/60 backdrop-blur-xl flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/30">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">AI Intelligence</h3>
          {isAnalyzing && <Loader2 className="h-4 w-4 animate-spin" />}
        </div>
        <Button variant="ghost" size="sm" onClick={onToggleCollapse}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No messages to analyze yet
          </p>
        ) : (
          <>
            {/* Lead Temperature & Stage */}
            {analysis && (
              <div className="space-y-3">
                <Card className="bg-card/40">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Lead Temperature
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold">{analysis.leadTemperature}</span>
                      <span className="text-sm text-muted-foreground">/100</span>
                    </div>
                    <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all" 
                        style={{ width: `${analysis.leadTemperature}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card/40">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Conversation Stage</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge variant="secondary" className="text-sm capitalize mb-2">
                      {(analysis.conversationStage || analysis.stage || 'discovery').replace('_', ' ')}
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      Urgency: <span className="font-medium capitalize">{analysis.urgencyLevel || analysis.urgency || 'medium'}</span>
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Buying Signals */}
            {analysis && analysis.buyingSignals && analysis.buyingSignals.length > 0 && (
              <Card className="bg-card/40">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Buying Signals</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {analysis.buyingSignals.slice(0, 3).map((signal, idx) => (
                      <div key={idx} className="text-sm p-2 rounded bg-muted/50">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge 
                            variant={signal.strength > 0.7 ? 'default' : 'outline'}
                            className="text-xs"
                          >
                            {signal.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {Math.round(signal.confidence * 100)}%
                          </span>
                        </div>
                        <p className="text-muted-foreground">"{signal.text}"</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* AI Response Suggestions */}
            {suggestions && suggestions.length > 0 && (
              <Card className="bg-card/40">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>Suggested Responses</span>
                    {isGeneratingSuggestions && <Loader2 className="h-3 w-3 animate-spin" />}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {suggestions.slice(0, 3).map((suggestion, idx) => (
                      <div key={idx} className="border rounded-lg p-3 hover:bg-muted/30 transition-colors">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <Badge variant="outline" className="text-xs">
                            {Math.round(suggestion.confidence * 100)}% match
                          </Badge>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="h-auto py-1 px-2 text-xs"
                            onClick={() => onInsertSuggestion(suggestion.message)}
                          >
                            Use
                          </Button>
                        </div>
                        <p className="text-sm mb-2">{suggestion.message}</p>
                        <p className="text-xs text-muted-foreground">
                          💡 {suggestion.reasoning}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {isAnalyzing && !analysis && (
              <div className="text-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Analyzing conversation...</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AIIntelligenceSidebar;
