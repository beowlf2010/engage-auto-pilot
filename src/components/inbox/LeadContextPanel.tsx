
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Car, 
  Calendar, 
  Star,
  TrendingUp,
  Bot,
  MessageSquare,
  Clock
} from 'lucide-react';

interface LeadContextPanelProps {
  conversation: {
    leadId: string;
    leadName: string;
    leadPhone: string;
    vehicleInterest: string;
    status: string;
    salespersonName?: string;
    aiOptIn: boolean;
    unreadCount: number;
    lastMessage: string;
    lastMessageTime: string;
  };
}

const LeadContextPanel = ({ conversation }: LeadContextPanelProps) => {
  // Mock engagement score calculation
  const getEngagementScore = () => {
    let score = 0;
    if (conversation.unreadCount > 0) score += 40;
    if (conversation.aiOptIn) score += 30;
    if (conversation.status === 'engaged') score += 30;
    return Math.min(score, 100);
  };

  const engagementScore = getEngagementScore();
  
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 80) return 'default';
    if (score >= 60) return 'secondary';
    return 'destructive';
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <User className="h-5 w-5" />
          Lead Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Lead Info */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">{conversation.leadName}</h3>
            <Badge variant={conversation.status === 'engaged' ? 'default' : 'secondary'}>
              {conversation.status}
            </Badge>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Phone className="h-3 w-3 text-slate-500" />
              <span>{conversation.leadPhone}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Car className="h-3 w-3 text-slate-500" />
              <span>{conversation.vehicleInterest}</span>
            </div>
            
            {conversation.salespersonName && (
              <div className="flex items-center gap-2">
                <User className="h-3 w-3 text-slate-500" />
                <span>Assigned to: {conversation.salespersonName}</span>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Engagement Score */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Engagement Score
          </h4>
          <div className="flex items-center justify-between">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star 
                  key={star} 
                  className={`h-4 w-4 ${engagementScore >= star * 20 ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                />
              ))}
            </div>
            <Badge variant={getScoreBadgeVariant(engagementScore)}>
              {engagementScore}/100
            </Badge>
          </div>
        </div>

        <Separator />

        {/* AI Status */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <Bot className="h-4 w-4" />
            AI Assistant
          </h4>
          <div className="flex items-center justify-between">
            <span className="text-sm">Finn AI Status</span>
            <Badge variant={conversation.aiOptIn ? 'default' : 'secondary'}>
              {conversation.aiOptIn ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          {conversation.aiOptIn && (
            <div className="text-xs text-slate-600 bg-purple-50 p-2 rounded">
              AI is actively monitoring and may send automated responses
            </div>
          )}
        </div>

        <Separator />

        {/* Recent Activity */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Recent Activity
          </h4>
          <div className="space-y-2">
            <div className="text-xs text-slate-600">
              Last message: {conversation.lastMessageTime}
            </div>
            {conversation.unreadCount > 0 && (
              <div className="flex items-center gap-2">
                <MessageSquare className="h-3 w-3 text-red-500" />
                <span className="text-xs text-red-600">
                  {conversation.unreadCount} unread message{conversation.unreadCount > 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Quick Actions */}
        <div className="space-y-3">
          <h4 className="font-medium">Quick Actions</h4>
          <div className="grid grid-cols-1 gap-2">
            <Button variant="outline" size="sm" className="justify-start">
              <Phone className="h-3 w-3 mr-2" />
              Call Lead
            </Button>
            <Button variant="outline" size="sm" className="justify-start">
              <Calendar className="h-3 w-3 mr-2" />
              Schedule Follow-up
            </Button>
            <Button variant="outline" size="sm" className="justify-start">
              <Car className="h-3 w-3 mr-2" />
              View Inventory Match
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LeadContextPanel;
