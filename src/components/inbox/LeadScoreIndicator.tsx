
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, Brain } from 'lucide-react';

interface LeadScoreIndicatorProps {
  score: number;
  trend?: 'up' | 'down' | 'stable';
  showAI?: boolean;
  size?: 'sm' | 'md';
}

const LeadScoreIndicator = ({ 
  score, 
  trend = 'stable', 
  showAI = false,
  size = 'sm'
}: LeadScoreIndicatorProps) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'High';
    if (score >= 60) return 'Medium';
    if (score >= 40) return 'Low';
    return 'Very Low';
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-3 h-3" />;
      case 'down': return <TrendingDown className="w-3 h-3" />;
      default: return <Minus className="w-3 h-3" />;
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Badge 
        variant="secondary" 
        className={`text-white ${getScoreColor(score)} ${size === 'md' ? 'px-3 py-1' : 'px-2 py-0.5'}`}
      >
        <span className={size === 'md' ? 'text-sm font-medium' : 'text-xs'}>
          {score}% {getScoreLabel(score)}
        </span>
      </Badge>
      
      {trend !== 'stable' && (
        <div className={`${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
          {getTrendIcon()}
        </div>
      )}
      
      {showAI && (
        <div title="AI-powered prediction">
          <Brain className="w-3 h-3 text-blue-600" />
        </div>
      )}
    </div>
  );
};

export default LeadScoreIndicator;
