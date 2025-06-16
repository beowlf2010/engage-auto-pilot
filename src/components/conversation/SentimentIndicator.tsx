
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Smile, Frown, Meh, TrendingUp, TrendingDown } from 'lucide-react';

interface SentimentIndicatorProps {
  sentimentScore: number;
  sentimentLabel: 'positive' | 'negative' | 'neutral';
  confidenceScore?: number;
  emotions?: string[];
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
}

const SentimentIndicator = ({ 
  sentimentScore, 
  sentimentLabel, 
  confidenceScore = 0,
  emotions = [],
  size = 'sm',
  showDetails = false 
}: SentimentIndicatorProps) => {
  const getSentimentIcon = () => {
    if (sentimentLabel === 'positive') {
      return <Smile className={`${size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-4 w-4' : 'h-5 w-5'}`} />;
    } else if (sentimentLabel === 'negative') {
      return <Frown className={`${size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-4 w-4' : 'h-5 w-5'}`} />;
    }
    return <Meh className={`${size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-4 w-4' : 'h-5 w-5'}`} />;
  };

  const getSentimentColor = () => {
    if (sentimentLabel === 'positive') return 'bg-green-100 text-green-800 border-green-200';
    if (sentimentLabel === 'negative') return 'bg-red-100 text-red-800 border-red-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getTrendIcon = () => {
    if (sentimentScore > 0.3) return <TrendingUp className="h-3 w-3 text-green-600" />;
    if (sentimentScore < -0.3) return <TrendingDown className="h-3 w-3 text-red-600" />;
    return null;
  };

  const formatScore = (score: number) => {
    if (score > 0) return `+${(score * 100).toFixed(0)}%`;
    return `${(score * 100).toFixed(0)}%`;
  };

  const indicator = (
    <Badge 
      variant="outline" 
      className={`${getSentimentColor()} flex items-center gap-1 ${
        size === 'sm' ? 'text-xs px-1.5 py-0.5' : 
        size === 'md' ? 'text-sm px-2 py-1' : 
        'text-base px-3 py-1.5'
      }`}
    >
      {getSentimentIcon()}
      <span className="capitalize">{sentimentLabel}</span>
      {showDetails && (
        <>
          <span className="text-xs opacity-75">
            ({formatScore(sentimentScore)})
          </span>
          {getTrendIcon()}
        </>
      )}
    </Badge>
  );

  if (!showDetails && (emotions.length > 0 || confidenceScore > 0)) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {indicator}
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-1">
              <div className="font-medium">
                Sentiment: {sentimentLabel} ({formatScore(sentimentScore)})
              </div>
              {confidenceScore > 0 && (
                <div className="text-xs">
                  Confidence: {(confidenceScore * 100).toFixed(0)}%
                </div>
              )}
              {emotions.length > 0 && (
                <div className="text-xs">
                  Emotions: {emotions.join(', ')}
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return indicator;
};

export default SentimentIndicator;
