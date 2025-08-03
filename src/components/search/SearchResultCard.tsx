import React from 'react';
import { User, MessageSquare, Car, Calendar, ExternalLink, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { SearchResult } from './UnifiedSearchProvider';
import { safeHighlightText } from '@/utils/securityMiddleware';

interface SearchResultCardProps {
  result: SearchResult;
  onSelect: (result: SearchResult) => void;
  searchTerm: string;
}

export const SearchResultCard: React.FC<SearchResultCardProps> = ({
  result,
  onSelect,
  searchTerm,
}) => {
  const getTypeIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'lead':
        return <User className="h-4 w-4" />;
      case 'conversation':
        return <MessageSquare className="h-4 w-4" />;
      case 'inventory':
        return <Car className="h-4 w-4" />;
      case 'appointment':
        return <Calendar className="h-4 w-4" />;
      default:
        return <Star className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: SearchResult['type']) => {
    const colors = {
      lead: 'text-blue-600 bg-blue-50',
      conversation: 'text-green-600 bg-green-50',
      inventory: 'text-purple-600 bg-purple-50',
      appointment: 'text-orange-600 bg-orange-50',
    };
    return colors[type] || 'text-gray-600 bg-gray-50';
  };

  const highlightText = (text: string, searchTerm: string) => {
    return safeHighlightText(text, searchTerm);
  };

  const formatResultType = (type: SearchResult['type']) => {
    const labels = {
      lead: 'Lead',
      conversation: 'Message',
      inventory: 'Vehicle',
      appointment: 'Appointment',
    };
    return labels[type] || type;
  };

  return (
    <div
      onClick={() => onSelect(result)}
      className="p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:bg-muted/50 hover:border-primary/20 group"
    >
      <div className="flex items-start gap-3">
        {/* Type Icon */}
        <div className={`p-2 rounded-full ${getTypeColor(result.type)}`}>
          {getTypeIcon(result.type)}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              {/* Title */}
              <h4 
                className="font-medium text-sm truncate group-hover:text-primary transition-colors"
                dangerouslySetInnerHTML={{ 
                  __html: highlightText(result.title, searchTerm) 
                }}
              />
              
              {/* Subtitle */}
              {result.subtitle && (
                <p 
                  className="text-xs text-muted-foreground mt-0.5"
                  dangerouslySetInnerHTML={{ 
                    __html: highlightText(result.subtitle, searchTerm) 
                  }}
                />
              )}
            </div>
            
            {/* Type Badge */}
            <Badge variant="secondary" className="text-xs flex-shrink-0">
              {formatResultType(result.type)}
            </Badge>
          </div>
          
          {/* Description */}
          {result.description && (
            <p 
              className="text-xs text-muted-foreground mt-1 line-clamp-2"
              dangerouslySetInnerHTML={{ 
                __html: highlightText(result.description, searchTerm) 
              }}
            />
          )}
          
          {/* Highlights */}
          {result.highlight && result.highlight.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {result.highlight.slice(0, 3).map((highlight, index) => (
                <Badge key={index} variant="outline" className="text-xs bg-yellow-50 border-yellow-200">
                  {highlight}
                </Badge>
              ))}
            </div>
          )}
          
          {/* Metadata */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {result.metadata && Object.entries(result.metadata).slice(0, 2).map(([key, value]) => (
                <span key={key} className="flex items-center gap-1">
                  <span className="capitalize">{key}:</span>
                  <span className="font-medium">{String(value)}</span>
                </span>
              ))}
            </div>
            
            {/* Score indicator */}
            {result.score && result.score > 5 && (
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 text-yellow-500 fill-current" />
                <span className="text-xs text-muted-foreground">
                  {Math.round(result.score)}% match
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* External link indicator */}
        <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
};