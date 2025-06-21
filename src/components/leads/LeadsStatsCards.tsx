
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Clock, 
  MessageSquare, 
  CheckCircle, 
  Bot,
  Calendar
} from 'lucide-react';

interface LeadsStatsCardsProps {
  stats: {
    total: number;
    noContact: number;
    contacted: number;
    responded: number;
    aiEnabled: number;
    fresh: number;
  };
  onCardClick?: (filterType: 'fresh' | 'all' | 'no_contact' | 'contact_attempted' | 'response_received' | 'ai_enabled') => void;
  activeFilter?: string | null;
}

const LeadsStatsCards = ({ stats, onCardClick, activeFilter }: LeadsStatsCardsProps) => {
  const cards = [
    {
      id: 'fresh',
      title: 'Fresh Today',
      value: stats.fresh,
      description: 'New leads today',
      icon: Calendar,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      clickable: true
    },
    {
      id: 'all',
      title: 'Total Leads',
      value: stats.total,
      description: 'All active leads',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      clickable: true
    },
    {
      id: 'no_contact',
      title: 'Need Attention',
      value: stats.noContact,
      description: 'Not contacted yet',
      icon: Clock,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      clickable: true,
      urgent: stats.noContact > 0
    },
    {
      id: 'contact_attempted',
      title: 'Contacted',
      value: stats.contacted,
      description: 'Outreach attempted',
      icon: MessageSquare,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      clickable: true
    },
    {
      id: 'response_received',
      title: 'Engaged',
      value: stats.responded,
      description: 'In conversation',
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      clickable: true
    },
    {
      id: 'ai_enabled',
      title: 'AI Enabled',
      value: stats.aiEnabled,
      description: 'Finn AI active',
      icon: Bot,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      clickable: true
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
      {cards.map((card) => (
        <Card 
          key={card.id}
          className={`cursor-pointer transition-all hover:shadow-md ${
            activeFilter === card.id ? 'ring-2 ring-blue-500 ring-offset-2' : ''
          } ${card.urgent ? 'border-red-200' : ''}`}
          onClick={() => card.clickable && onCardClick?.(card.id as any)}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">
                {card.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <card.icon className={`w-4 h-4 ${card.color}`} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${card.color}`}>
              {card.value}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {card.description}
            </p>
            {card.urgent && card.value > 0 && (
              <Badge variant="destructive" className="mt-2 text-xs">
                Needs Action
              </Badge>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default LeadsStatsCards;
