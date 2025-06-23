
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Filter, MessageSquare, Send, Inbox, AlertCircle } from 'lucide-react';

type FilterType = 'all' | 'inbound' | 'sent' | 'unread';

interface MessageDirectionFilterProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  inboundCount: number;
  sentCount: number;
  totalCount: number;
  unreadCount: number;
  type: 'conversations' | 'messages';
}

const MessageDirectionFilter: React.FC<MessageDirectionFilterProps> = ({
  activeFilter,
  onFilterChange,
  inboundCount,
  sentCount,
  totalCount,
  unreadCount,
  type
}) => {
  const filterOptions = [
    {
      key: 'all' as const,
      label: `All ${type}`,
      icon: Inbox,
      count: totalCount,
      variant: 'outline' as const
    },
    {
      key: 'unread' as const,
      label: 'Unread',
      icon: AlertCircle,
      count: unreadCount,
      variant: 'destructive' as const
    },
    {
      key: 'inbound' as const,
      label: 'Inbound',
      icon: MessageSquare,
      count: inboundCount,
      variant: 'default' as const
    },
    {
      key: 'sent' as const,
      label: 'Sent',
      icon: Send,
      count: sentCount,
      variant: 'secondary' as const
    }
  ];

  return (
    <Card className="mb-4">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">
            Filter {type}
          </span>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          {filterOptions.map((option) => {
            const Icon = option.icon;
            const isActive = activeFilter === option.key;
            
            return (
              <Button
                key={option.key}
                variant={isActive ? option.variant : "outline"}
                size="sm"
                onClick={() => onFilterChange(option.key)}
                className={`flex items-center gap-2 flex-shrink-0 ${
                  isActive ? 'ring-2 ring-blue-200' : ''
                } ${option.key === 'unread' && option.count > 0 ? 'animate-pulse' : ''}`}
              >
                <Icon className="h-3 w-3" />
                <span className="whitespace-nowrap">{option.label}</span>
                <Badge 
                  variant={isActive ? "secondary" : "outline"}
                  className={`text-xs flex-shrink-0 ${
                    option.key === 'unread' && option.count > 0 ? 'bg-red-100 text-red-800 border-red-300' : ''
                  }`}
                >
                  {option.count}
                </Badge>
              </Button>
            );
          })}
        </div>
        
        {activeFilter !== 'all' && (
          <div className="mt-2 text-xs text-gray-500">
            Showing {
              activeFilter === 'inbound' ? inboundCount : 
              activeFilter === 'sent' ? sentCount :
              activeFilter === 'unread' ? unreadCount : totalCount
            } of {totalCount} {type}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MessageDirectionFilter;
