
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FileText, RefreshCw, ChevronDown, ChevronUp, Clock, MessageSquare } from 'lucide-react';
import { generateConversationSummary, getConversationSummary, ConversationSummary } from '@/services/conversationAnalysisService';
import { formatDistanceToNow } from 'date-fns';

interface ConversationSummaryPanelProps {
  leadId: string;
  messageCount: number;
  onSummaryUpdate?: () => void;
}

const ConversationSummaryPanel = ({ leadId, messageCount, onSummaryUpdate }: ConversationSummaryPanelProps) => {
  const [summary, setSummary] = useState<ConversationSummary | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    loadExistingSummary();
  }, [leadId]);

  const loadExistingSummary = async () => {
    setIsLoading(true);
    try {
      const existingSummary = await getConversationSummary(leadId);
      setSummary(existingSummary);
    } catch (error) {
      console.error('Error loading summary:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateSummary = async () => {
    setIsGenerating(true);
    try {
      const newSummary = await generateConversationSummary(leadId);
      if (newSummary) {
        setSummary(newSummary);
        onSummaryUpdate?.();
      }
    } catch (error) {
      console.error('Error generating summary:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const shouldShowGenerateButton = !summary || (summary.messageCount < messageCount);

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <FileText className="h-4 w-4" />
            Conversation Summary
            {summary && (
              <Badge variant="outline" className="ml-2">
                {summary.messageCount} messages
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {shouldShowGenerateButton && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateSummary}
                disabled={isGenerating}
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${isGenerating ? 'animate-spin' : ''}`} />
                {isGenerating ? 'Generating...' : 'Update Summary'}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm text-slate-600">Loading summary...</span>
            </div>
          ) : summary ? (
            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-medium mb-2">Summary</h4>
                <p className="text-sm text-slate-700 leading-relaxed">{summary.summaryText}</p>
              </div>

              {summary.keyPoints && summary.keyPoints.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-medium mb-2">Key Points</h4>
                    <ul className="space-y-1">
                      {summary.keyPoints.map((point, index) => (
                        <li key={index} className="text-sm text-slate-700 flex items-start">
                          <span className="w-1 h-1 bg-slate-400 rounded-full mt-2 mr-2 flex-shrink-0" />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}

              <Separator />
              <div className="flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    {summary.messageCount} messages analyzed
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Updated {formatDistanceToNow(new Date(summary.updatedAt), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <FileText className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500 mb-3">No summary available yet</p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateSummary}
                disabled={isGenerating}
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${isGenerating ? 'animate-spin' : ''}`} />
                Generate Summary
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};

export default ConversationSummaryPanel;
