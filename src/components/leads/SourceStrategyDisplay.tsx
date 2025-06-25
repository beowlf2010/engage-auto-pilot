
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Target, TrendingUp } from 'lucide-react';
import { getLeadSourceData } from '@/services/leadSourceStrategy';

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
  const sourceData = getLeadSourceData(source);
  
  const getCategoryDisplay = (category: string) => {
    switch (category) {
      case 'high_intent_digital': return 'High Intent';
      case 'value_focused': return 'Value Focused';
      case 'credit_ready': return 'Credit Ready';
      case 'direct_inquiry': return 'Direct Inquiry';
      case 'social_discovery': return 'Social Media';
      case 'referral_based': return 'Trusted Source';
      case 'service_related': return 'Service';
      default: return 'Other';
    }
  };

  const getUrgencyDisplay = (urgency: string) => {
    switch (urgency) {
      case 'immediate': return 'Immediate';
      case 'high': return 'High';
      case 'medium': return 'Medium';
      case 'low': return 'Low';
      default: return 'Low';
    }
  };
  
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
      case 'immediate':
      case 'high': return 'bg-red-100 text-red-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'low': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const categoryDisplay = getCategoryDisplay(sourceData.sourceCategory);
  const urgencyDisplay = getUrgencyDisplay(sourceData.urgencyLevel);
  const conversionProb = Math.round(sourceData.conversionProbability * 100);

  return (
    <div className="flex flex-col gap-1">
      <Badge variant="outline" className="text-xs">
        {categoryDisplay}
      </Badge>
      <div className="flex items-center gap-1">
        <Badge className={`text-xs ${getUrgencyColor(urgencyDisplay)} border-0`}>
          {urgencyDisplay}
        </Badge>
      </div>
      <div className="flex items-center gap-1">
        <Badge className={`text-xs ${getIntensityColor(messageIntensity)} border-0`}>
          {messageIntensity}
        </Badge>
      </div>
      <div className="flex items-center gap-1 text-xs text-gray-500">
        <TrendingUp className="h-3 w-3" />
        <span>{conversionProb}%</span>
      </div>
    </div>
  );
};

export default SourceStrategyDisplay;
