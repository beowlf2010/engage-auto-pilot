import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, X, Users } from 'lucide-react';

interface AIInsightBannerProps {
  insightType?: string;
  leadCount: number;
  onClearFilters: () => void;
}

const AIInsightBanner: React.FC<AIInsightBannerProps> = ({
  insightType,
  leadCount,
  onClearFilters
}) => {
  const getInsightInfo = (type?: string) => {
    switch (type) {
      case 'risk':
        return {
          title: 'AI Risk Analysis',
          description: 'Showing leads identified as at-risk by AI analysis',
          color: 'text-red-700 bg-red-50 border-red-200'
        };
      case 'opportunity':
        return {
          title: 'AI Opportunity Detection',
          description: 'Showing high-potential leads identified by AI',
          color: 'text-green-700 bg-green-50 border-green-200'
        };
      case 'engagement':
        return {
          title: 'AI Engagement Analysis',
          description: 'Showing leads requiring engagement attention',
          color: 'text-blue-700 bg-blue-50 border-blue-200'
        };
      default:
        return {
          title: 'AI Insights Filter',
          description: 'Showing leads from AI analysis',
          color: 'text-purple-700 bg-purple-50 border-purple-200'
        };
    }
  };

  const { title, description, color } = getInsightInfo(insightType);

  return (
    <div className={`flex items-center justify-between rounded-lg p-4 border ${color}`}>
      <div className="flex items-center space-x-3">
        <Brain className="h-5 w-5" />
        <div>
          <h3 className="font-semibold text-sm">{title}</h3>
          <p className="text-sm opacity-90">{description}</p>
        </div>
        <Badge variant="secondary" className="bg-white/50">
          <Users className="h-3 w-3 mr-1" />
          {leadCount} leads
        </Badge>
      </div>
      
      <Button
        variant="outline"
        size="sm"
        onClick={onClearFilters}
        className="border-current text-current hover:bg-white/20"
      >
        <X className="h-4 w-4 mr-1" />
        Clear AI Filter
      </Button>
    </div>
  );
};

export default AIInsightBanner;