
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Lightbulb, RefreshCw, Send, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { generateResponseSuggestions, ResponseSuggestion } from '@/services/conversationAnalysisService';
import { toast } from '@/hooks/use-toast';

interface ResponseSuggestionsPanelProps {
  leadId: string;
  onSelectSuggestion: (suggestion: string) => void;
  isVisible?: boolean;
}

const ResponseSuggestionsPanel = ({ 
  leadId, 
  onSelectSuggestion, 
  isVisible = true 
}: ResponseSuggestionsPanelProps) => {
  const [suggestions, setSuggestions] = useState<ResponseSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (isVisible && leadId) {
      loadSuggestions();
    }
  }, [leadId, isVisible]);

  const loadSuggestions = async () => {
    setIsLoading(true);
    try {
      const newSuggestions = await generateResponseSuggestions(leadId);
      setSuggestions(newSuggestions);
    } catch (error) {
      console.error('Error loading suggestions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopySuggestion = (suggestion: string) => {
    navigator.clipboard.writeText(suggestion);
    toast({
      title: "Copied to clipboard",
      description: "The suggestion has been copied to your clipboard",
    });
  };

  const getContextTypeColor = (contextType: string) => {
    const colors: Record<string, string> = {
      greeting: 'bg-blue-100 text-blue-800',
      follow_up: 'bg-green-100 text-green-800',
      pricing: 'bg-yellow-100 text-yellow-800',
      scheduling: 'bg-purple-100 text-purple-800',
      objection_handling: 'bg-red-100 text-red-800',
      general: 'bg-gray-100 text-gray-800'
    };
    return colors[contextType] || colors.general;
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (!isVisible) return null;

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Lightbulb className="h-4 w-4" />
            Response Suggestions
            {suggestions.length > 0 && (
              <Badge variant="outline" className="ml-2">
                {suggestions.length} suggestions
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadSuggestions}
              disabled={isLoading}
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
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
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm text-slate-600">Generating suggestions...</span>
            </div>
          ) : suggestions.length > 0 ? (
            <div className="space-y-3">
              {suggestions.map((suggestion, index) => (
                <div key={suggestion.id} className="border rounded-lg p-3 hover:bg-slate-50">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="outline" 
                        className={getContextTypeColor(suggestion.contextType)}
                      >
                        {suggestion.contextType.replace('_', ' ')}
                      </Badge>
                      <span className={`text-xs font-medium ${getConfidenceColor(suggestion.confidenceScore)}`}>
                        {(suggestion.confidenceScore * 100).toFixed(0)}% confidence
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-slate-700 mb-3 leading-relaxed">
                    {suggestion.suggestionText}
                  </p>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onSelectSuggestion(suggestion.suggestionText)}
                      className="flex-1"
                    >
                      <Send className="h-3 w-3 mr-1" />
                      Use This Response
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopySuggestion(suggestion.suggestionText)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <Lightbulb className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500 mb-3">No suggestions available</p>
              <Button
                variant="outline"
                size="sm"
                onClick={loadSuggestions}
                disabled={isLoading}
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                Generate Suggestions
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};

export default ResponseSuggestionsPanel;
