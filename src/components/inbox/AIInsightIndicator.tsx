
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  AlertTriangle, 
  TrendingUp, 
  Clock,
  Target
} from 'lucide-react';

interface AIInsightIndicatorProps {
  leadTemperature?: string;
  urgencyLevel?: string;
  hasRecommendations?: boolean;
  followUpDue?: boolean;
  className?: string;
}

const AIInsightIndicator: React.FC<AIInsightIndicatorProps> = ({
  leadTemperature,
  urgencyLevel,
  hasRecommendations,
  followUpDue,
  className = ''
}) => {
  const getTemperatureIcon = () => {
    switch (leadTemperature) {
      case 'hot': return <TrendingUp className="h-3 w-3 text-red-600" />;
      case 'warm': return <TrendingUp className="h-3 w-3 text-orange-600" />;
      case 'lukewarm': return <TrendingUp className="h-3 w-3 text-yellow-600" />;
      case 'cold': return <TrendingUp className="h-3 w-3 text-blue-600" />;
      default: return null;
    }
  };

  const getUrgencyBadge = () => {
    if (!urgencyLevel) return null;
    
    const colors = {
      critical: 'bg-red-500 text-white',
      high: 'bg-orange-500 text-white',
      medium: 'bg-yellow-500 text-white',
      low: 'bg-green-500 text-white'
    };

    return (
      <Badge className={`text-xs px-1 py-0 ${colors[urgencyLevel as keyof typeof colors] || 'bg-gray-500 text-white'}`}>
        {urgencyLevel}
      </Badge>
    );
  };

  if (!leadTemperature && !urgencyLevel && !hasRecommendations && !followUpDue) {
    return null;
  }

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {/* AI Icon */}
      <Brain className="h-3 w-3 text-blue-600" />
      
      {/* Temperature Indicator */}
      {getTemperatureIcon()}
      
      {/* Urgency Badge */}
      {getUrgencyBadge()}
      
      {/* Recommendations Available */}
      {hasRecommendations && (
        <Target className="h-3 w-3 text-green-600" />
      )}
      
      {/* Follow-up Due */}
      {followUpDue && (
        <Clock className="h-3 w-3 text-orange-600" />
      )}
    </div>
  );
};

export default AIInsightIndicator;
