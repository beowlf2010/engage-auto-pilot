
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Clock, 
  MessageSquare, 
  CheckCircle, 
  Bot,
  Calendar,
  Settings,
  ShoppingCart
} from 'lucide-react';

interface LeadsStatsCardsProps {
  stats: {
    total: number;
    noContact: number;
    contacted: number;
    responded: number;
    aiEnabled: number;
    fresh: number;
    soldCustomers?: number;
  };
  onCardClick?: (filterType: 'fresh' | 'all' | 'no_contact' | 'contact_attempted' | 'response_received' | 'ai_enabled' | 'sold_customers') => void;
  activeFilter?: string | null;
}

const LeadsStatsCards = ({ stats, onCardClick, activeFilter }: LeadsStatsCardsProps) => {
  const navigate = useNavigate();
  
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
    },
    {
      id: 'sold_customers',
      title: 'Sold Customers',
      value: stats.soldCustomers || 0,
      description: 'Customer service',
      icon: ShoppingCart,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      clickable: true
    }
  ];

  return (
    <div className="space-y-4">
      {/* Quick Settings Navigation */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-amber-800">SMS Configuration Required</h3>
            <p className="text-sm text-amber-700">Configure your Twilio credentials to enable messaging</p>
          </div>
          <Button 
            onClick={() => navigate('/settings')}
            className="flex items-center space-x-2"
            variant="outline"
          >
            <Settings className="w-4 h-4" />
            <span>Go to Settings</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
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
    </div>
  );
};

export default LeadsStatsCards;
