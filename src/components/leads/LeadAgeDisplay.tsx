
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface LeadAgeDisplayProps {
  createdAt: string;
  messageCount: number;
}

const LeadAgeDisplay: React.FC<LeadAgeDisplayProps> = ({ createdAt, messageCount }) => {
  const leadDate = new Date(createdAt);
  const now = new Date();
  const daysDiff = Math.floor((now.getTime() - leadDate.getTime()) / (1000 * 60 * 60 * 24));
  
  const getAgeCategory = (days: number) => {
    if (days <= 2) return { category: 'Fresh', color: 'bg-green-100 text-green-800' };
    if (days <= 7) return { category: 'Warm', color: 'bg-yellow-100 text-yellow-800' };
    if (days <= 30) return { category: 'Aging', color: 'bg-orange-100 text-orange-800' };
    return { category: 'Cold', color: 'bg-red-100 text-red-800' };
  };

  const ageInfo = getAgeCategory(daysDiff);
  const timeAgo = formatDistanceToNow(leadDate, { addSuffix: true });

  return (
    <div className="flex flex-col gap-1">
      <Badge className={`text-xs ${ageInfo.color} border-0`}>
        {ageInfo.category} ({daysDiff}d)
      </Badge>
      <div className="flex items-center gap-1 text-xs text-gray-500">
        <Clock className="h-3 w-3" />
        <span>{messageCount} msgs</span>
      </div>
      <div className="text-xs text-gray-400" title={timeAgo}>
        {timeAgo.replace(' ago', '')}
      </div>
    </div>
  );
};

export default LeadAgeDisplay;
