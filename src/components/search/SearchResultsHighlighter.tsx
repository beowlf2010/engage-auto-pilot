
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, MessageSquare, Tag, AlertCircle, User } from 'lucide-react';
import { sanitizeSearchHighlight } from '@/utils/sanitization';

interface SearchResult {
  messageId: string;
  leadId: string;
  content: string;
  timestamp: Date;
  direction: 'in' | 'out';
  relevanceScore: number;
  highlightedContent: string;
  matchedTerms: string[];
  categorization?: {
    primaryCategory: string;
    confidence: number;
    intent: string;
    sentiment: string;
    urgency: 'low' | 'medium' | 'high' | 'urgent';
    actionRequired: boolean;
    tags: string[];
  };
  thread?: {
    threadId: string;
    subject: string;
    messageCount: number;
  };
}

interface SearchResultsHighlighterProps {
  results: SearchResult[];
  onResultClick?: (result: SearchResult) => void;
  onThreadClick?: (threadId: string) => void;
  compact?: boolean;
}

const SearchResultsHighlighter: React.FC<SearchResultsHighlighterProps> = ({
  results,
  onResultClick,
  onThreadClick,
  compact = false
}) => {
  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Recent';
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return '😊';
      case 'negative': return '😞';
      default: return '😐';
    }
  };

  if (results.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>No messages found</p>
        <p className="text-sm">Try adjusting your search terms or filters</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {results.map((result) => (
        <Card
          key={result.messageId}
          className={`hover:shadow-md transition-shadow cursor-pointer ${
            result.categorization?.urgency === 'urgent' ? 'border-red-200 bg-red-50' : ''
          }`}
          onClick={() => onResultClick?.(result)}
        >
          <CardContent className={compact ? "p-3" : "p-4"}>
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={result.direction === 'in' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {result.direction === 'in' ? 'Incoming' : 'Outgoing'}
                  </Badge>
                  
                  {result.categorization && (
                    <Badge 
                      variant="outline"
                      className={`text-xs ${getUrgencyColor(result.categorization.urgency)}`}
                    >
                      {result.categorization.urgency}
                    </Badge>
                  )}
                  
                  {result.categorization?.actionRequired && (
                    <Badge variant="destructive" className="text-xs">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Action Required
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Clock className="h-3 w-3" />
                  {formatTimestamp(result.timestamp)}
                  
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    {Math.round(result.relevanceScore * 100)}% match
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="space-y-2">
                <div 
                  className={`${compact ? 'text-sm' : 'text-base'} leading-relaxed`}
                  dangerouslySetInnerHTML={{ __html: sanitizeSearchHighlight(result.highlightedContent) }}
                />
                
                {/* Matched Terms */}
                {result.matchedTerms.length > 0 && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-gray-500">Matched:</span>
                    {result.matchedTerms.map((term, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {term}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Metadata */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <div className="flex items-center gap-3 text-xs text-gray-600">
                  {/* Thread Info */}
                  {result.thread && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onThreadClick?.(result.thread!.threadId);
                      }}
                      className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                    >
                      <MessageSquare className="h-3 w-3" />
                      {result.thread.subject} ({result.thread.messageCount} msgs)
                    </button>
                  )}
                  
                  {/* Lead Info */}
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    Lead {result.leadId.slice(0, 8)}...
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Sentiment */}
                  {result.categorization?.sentiment && (
                    <span className="text-sm">
                      {getSentimentIcon(result.categorization.sentiment)}
                    </span>
                  )}
                  
                  {/* Category Tags */}
                  {result.categorization?.tags.slice(0, 2).map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      <Tag className="h-2 w-2 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                  
                  {result.categorization?.tags.length > 2 && (
                    <Badge variant="outline" className="text-xs">
                      +{result.categorization.tags.length - 2} more
                    </Badge>
                  )}
                </div>
              </div>

              {/* Category Info */}
              {result.categorization && !compact && (
                <div className="bg-gray-50 p-2 rounded text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      Category: {result.categorization.primaryCategory.replace('_', ' ')}
                    </span>
                    <span>
                      Intent: {result.categorization.intent}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-gray-600">
                    <span>
                      Confidence: {Math.round(result.categorization.confidence * 100)}%
                    </span>
                    <span>
                      Sentiment: {result.categorization.sentiment}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default SearchResultsHighlighter;
