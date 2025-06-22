
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, Heart, Frown, Smile } from 'lucide-react';

interface SentimentIndicatorProps {
  sentiment: 'positive' | 'negative' | 'neutral';
  score: number;
  confidence: number;
  emotions?: string[];
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
}

const SentimentIndicator: React.FC<SentimentIndicatorProps> = ({
  sentiment,
  score,
  confidence,
  emotions = [],
  size = 'md',
  showDetails = false
}) => {
  const getSentimentIcon = () => {
    switch (sentiment) {
      case 'positive':
        return <Smile className={`h-${size === 'sm' ? '3' : size === 'md' ? '4' : '5'} w-${size === 'sm' ? '3' : size === 'md' ? '4' : '5'} text-green-600`} />;
      case 'negative':
        return <Frown className={`h-${size === 'sm' ? '3' : size === 'md' ? '4' : '5'} w-${size === 'sm' ? '3' : size === 'md' ? '4' : '5'} text-red-600`} />;
      default:
        return <Minus className={`h-${size === 'sm' ? '3' : size === 'md' ? '4' : '5'} w-${size === 'sm' ? '3' : size === 'md' ? '4' : '5'} text-gray-600`} />;
    }
  };

  const getSentimentColor = () => {
    switch (sentiment) {
      case 'positive':
        return 'bg-green-100 text-green-800';
      case 'negative':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTrendIcon = () => {
    if (score > 0.2) return <TrendingUp className="h-3 w-3 text-green-600" />;
    if (score < -0.2) return <TrendingDown className="h-3 w-3 text-red-600" />;
    return <Minus className="h-3 w-3 text-gray-600" />;
  };

  const getEmotionIcon = (emotion: string) => {
    const emotionMap: Record<string, string> = {
      joy: '😊',
      excitement: '🎉',
      satisfaction: '😌',
      anger: '😠',
      frustration: '😤',
      disappointment: '😞',
      confusion: '😕',
      interest: '🤔',
      trust: '🤝',
      surprise: '😮'
    };
    return emotionMap[emotion.toLowerCase()] || '💭';
  };

  return (
    <div className={`flex items-center gap-2 ${size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base'}`}>
      <div className="flex items-center gap-1">
        {getSentimentIcon()}
        <Badge variant="outline" className={getSentimentColor()}>
          {sentiment}
        </Badge>
      </div>

      {showDetails && (
        <>
          <div className="flex items-center gap-1">
            {getTrendIcon()}
            <span className="text-xs text-gray-500">
              {(score * 100).toFixed(0)}%
            </span>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500">
              {(confidence * 100).toFixed(0)}% confident
            </span>
          </div>

          {emotions.length > 0 && (
            <div className="flex items-center gap-1">
              {emotions.slice(0, 3).map((emotion, index) => (
                <span
                  key={index}
                  className="text-xs"
                  title={emotion}
                >
                  {getEmotionIcon(emotion)}
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SentimentIndicator;
