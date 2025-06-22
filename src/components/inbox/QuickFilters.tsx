
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertCircle, 
  MessageSquareMore, 
  Clock, 
  Star, 
  Bot,
  ArrowDown,
  ArrowUp,
  Eye
} from 'lucide-react';

interface QuickFiltersProps {
  activeFilters: Set<string>;
  onFilterToggle: (filterId: string) => void;
  urgentCount?: number;
  unreadCount?: number;
  actionRequiredCount?: number;
  aiGeneratedCount?: number;
}

const QuickFilters: React.FC<QuickFiltersProps> = ({
  activeFilters,
  onFilterToggle,
  urgentCount = 0,
  unreadCount = 0,
  actionRequiredCount = 0,
  aiGeneratedCount = 0
}) => {
  const filters = [
    {
      id: 'unread',
      label: 'Unread',
      icon: Eye,
      count: unreadCount,
      color: 'blue'
    },
    {
      id: 'urgent',
      label: 'Urgent',
      icon: AlertCircle,
      count: urgentCount,
      color: 'red'
    },
    {
      id: 'action_required',
      label: 'Action Required',
      icon: MessageSquareMore,
      count: actionRequiredCount,
      color: 'orange'
    },
    {
      id: 'ai_generated',
      label: 'AI Messages',
      icon: Bot,
      count: aiGeneratedCount,
      color: 'purple'
    },
    {
      id: 'incoming',
      label: 'Incoming',
      icon: ArrowDown,
      count: 0,
      color: 'green'
    },
    {
      id: 'outgoing',
      label: 'Outgoing',
      icon: ArrowUp,
      count: 0,
      color: 'gray'
    },
    {
      id: 'recent',
      label: 'Recent',
      icon: Clock,
      count: 0,
      color: 'blue'
    }
  ];

  const getColorClasses = (color: string, isActive: boolean) => {
    const baseClasses = "transition-all duration-200";
    
    if (isActive) {
      switch (color) {
        case 'red': return `${baseClasses} bg-red-100 text-red-800 border-red-200 hover:bg-red-200`;
        case 'orange': return `${baseClasses} bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200`;
        case 'purple': return `${baseClasses} bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200`;
        case 'green': return `${baseClasses} bg-green-100 text-green-800 border-green-200 hover:bg-green-200`;
        case 'blue': return `${baseClasses} bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200`;
        default: return `${baseClasses} bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200`;
      }
    }
    
    return `${baseClasses} bg-white text-gray-600 border-gray-200 hover:bg-gray-50`;
  };

  return (
    <div className="flex items-center gap-2 flex-wrap py-2">
      <span className="text-sm font-medium text-gray-700 mr-2">Quick Filters:</span>
      
      {filters.map((filter) => {
        const isActive = activeFilters.has(filter.id);
        const Icon = filter.icon;
        
        return (
          <Button
            key={filter.id}
            variant="outline"
            size="sm"
            onClick={() => onFilterToggle(filter.id)}
            className={getColorClasses(filter.color, isActive)}
          >
            <Icon className="h-3 w-3 mr-1" />
            {filter.label}
            {filter.count > 0 && (
              <Badge 
                variant="secondary" 
                className="ml-1 text-xs px-1"
              >
                {filter.count}
              </Badge>
            )}
          </Button>
        );
      })}
      
      {activeFilters.size > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            activeFilters.forEach(filterId => onFilterToggle(filterId));
          }}
          className="text-gray-500 hover:text-gray-700"
        >
          Clear All
        </Button>
      )}
    </div>
  );
};

export default QuickFilters;
