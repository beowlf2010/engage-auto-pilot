
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Target, TrendingUp } from 'lucide-react';

interface SourceStrategyDisplayProps {
  source: string;
  leadTypeName?: string;
  leadSourceName?: string;
  messageIntensity?: 'gentle' | 'standard' | 'aggressive';
}

const SourceStrategyDisplay: React.FC<SourceStrategyDisplayProps> = ({
  source,
  leadTypeName,
  leadSourceName,
  messageIntensity = 'gentle'
}) => {
  const getSourceCategory = (source: string) => {
    const lowerSource = source.toLowerCase();
    if (lowerSource.includes('autotrader') || lowerSource.includes('cars.com')) {
      return { category: 'High Intent', urgency: 'High', conversionProb: 85 };
    }
    if (lowerSource.includes('referral') || lowerSource.includes('repeat')) {
      return { category: 'Trusted Source', urgency: 'Medium', conversionProb: 70 };
    }
    if (lowerSource.includes('facebook') || lowerSource.includes('social')) {
      return { category: 'Social Media', urgency: 'Low', conversionProb: 45 };
    }
    if (lowerSource.includes('website') || lowerSource.includes('organic')) {
      return { category: 'Organic', urgency: 'Medium', conversionProb: 60 };
    }
    return { category: 'Other', urgency: 'Low', conversionProb: 40 };
  };

  const strategyInfo = getSourceCategory(source);
  
  const getIntensityColor = (intensity: string) => {
    switch (intensity) {
      case 'aggressive': return 'bg-red-100 text-red-800';
      case 'standard': return 'bg-blue-100 text-blue-800';
      case 'gentle': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'High': return 'bg-red-100 text-red-700';
      case 'Medium': return 'bg-yellow-100 text-yellow-700';
      case 'Low': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <Badge variant="outline" className="text-xs">
        {strategyInfo.category}
      </Badge>
      <div className="flex items-center gap-1">
        <Badge className={`text-xs ${getUrgencyColor(strategyInfo.urgency)} border-0`}>
          {strategyInfo.urgency}
        </Badge>
      </div>
      <div className="flex items-center gap-1">
        <Badge className={`text-xs ${getIntensityColor(messageIntensity)} border-0`}>
          {messageIntensity}
        </Badge>
      </div>
      <div className="flex items-center gap-1 text-xs text-gray-500">
        <TrendingUp className="h-3 w-3" />
        <span>{strategyInfo.conversionProb}%</span>
      </div>
    </div>
  );
};

export default SourceStrategyDisplay;
