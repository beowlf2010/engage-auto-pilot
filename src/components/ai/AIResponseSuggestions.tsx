
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Lightbulb, 
  Send, 
  Copy, 
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Brain,
  Target
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { AIResponseSuggestion } from '@/services/aiResponseIntelligence';

interface AIResponseSuggestionsProps {
  suggestions: AIResponseSuggestion[];
  onSelectSuggestion: (message: string) => void;
  onRefresh: () => Promise<void>;
  isLoading?: boolean;
}

const AIResponseSuggestions: React.FC<AIResponseSuggestionsProps> = ({
  suggestions,
  onSelectSuggestion,
  onRefresh,
  isLoading = false
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getResponseTypeIcon = (type: string) => {
    switch (type) {
      case 'discovery': return '🔍';
      case 'objection_handling': return '🛡️';
      case 'closing': return '🎯';
      case 'follow_up': return '📞';
      default: return '💬';
    }
  };

  const handleCopySuggestion = async (message: string) => {
    try {
      await navigator.clipboard.writeText(message);
      toast({
        title: "Copied!",
        description: "Response suggestion copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive"
      });
    }
  };

  if (suggestions.length === 0 && !isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Brain className="h-4 w-4" />
            AI Response Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <Lightbulb className="h-8 w-8 mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-500">No suggestions available</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onRefresh}
              className="mt-2"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Generate Suggestions
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Brain className="h-4 w-4" />
            AI Response Suggestions ({suggestions.length})
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
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
        <CardContent>
          <div className="space-y-3">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className={`border rounded-lg p-3 transition-all cursor-pointer hover:bg-gray-50 ${
                  selectedIndex === index ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                }`}
                onClick={() => setSelectedIndex(selectedIndex === index ? null : index)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{getResponseTypeIcon(suggestion.responseType)}</span>
                    <Badge variant="outline" className="text-xs">
                      {suggestion.responseType.replace('_', ' ')}
                    </Badge>
                    <Badge className={`text-xs ${getPriorityColor(suggestion.priority)}`}>
                      {suggestion.priority}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Target className="h-3 w-3 text-gray-400" />
                    <span className="text-xs text-gray-500">{Math.round(suggestion.confidence * 100)}%</span>
                  </div>
                </div>

                <p className="text-sm text-gray-800 mb-3 leading-relaxed">
                  {suggestion.message}
                </p>

                {selectedIndex === index && (
                  <div className="space-y-2 pt-2 border-t">
                    <p className="text-xs text-gray-600">
                      <strong>Reasoning:</strong> {suggestion.reasoning}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectSuggestion(suggestion.message);
                        }}
                        className="flex-1"
                      >
                        <Send className="h-3 w-3 mr-1" />
                        Use This Response
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopySuggestion(suggestion.message);
                        }}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-4">
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm text-gray-500">Generating suggestions...</span>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};

export default AIResponseSuggestions;
