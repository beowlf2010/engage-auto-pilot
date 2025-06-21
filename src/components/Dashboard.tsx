import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  MessageSquare, 
  TrendingUp, 
  Calendar,
  Phone,
  Mail,
  CheckCircle,
  Clock,
  ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useConversationData } from '@/hooks/useConversationData';
import { getCorrectLeadCounts } from '@/services/leadStatusTransitionService';
import AIInsightsWidget from './dashboard/AIInsightsWidget';

interface DashboardProps {
  user: {
    id: string;
    role: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
}

const Dashboard = ({ user }: DashboardProps) => {
  const navigate = useNavigate();
  const { messages } = useConversationData();
  const [leadCounts, setLeadCounts] = useState({
    totalLeads: 0,
    newLeads: 0,
    engagedLeads: 0,
    aiEnabledLeads: 0,
    needsAttention: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeadCounts = async () => {
      try {
        const counts = await getCorrectLeadCounts();
        setLeadCounts(counts);
      } catch (error) {
        console.error('Error fetching lead counts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeadCounts();
  }, []);

  const unreadMessages = messages.filter(msg => !msg.readAt && msg.direction === 'in').length;

  const quickActions = [
    {
      title: 'Smart Inbox',
      description: 'View and respond to messages',
      icon: MessageSquare,
      action: () => navigate('/smart-inbox'),
      badge: unreadMessages > 0 ? unreadMessages : null,
      color: 'bg-blue-500'
    },
    {
      title: 'Leads',
      description: 'Manage your leads',
      icon: Users,
      action: () => navigate('/leads'),
      badge: leadCounts.needsAttention > 0 ? leadCounts.needsAttention : null,
      color: 'bg-green-500'
    },
    {
      title: 'AI Monitor',
      description: 'Advanced AI analytics',
      icon: TrendingUp,
      action: () => navigate('/ai-monitor'),
      badge: null,
      color: 'bg-purple-500'
    },
    {
      title: 'Schedule',
      description: 'View appointments',
      icon: Calendar,
      action: () => navigate('/schedule'),
      badge: null,
      color: 'bg-orange-500'
    }
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
          <h1 className="text-2xl font-bold mb-2">Welcome back, {user.firstName}!</h1>
          <p className="text-blue-100">Loading your automotive sales dashboard...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-16 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">
          Welcome back, {user.firstName}!
        </h1>
        <p className="text-blue-100">
          Here's what's happening with your automotive sales today
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leadCounts.totalLeads}</div>
            <p className="text-xs text-muted-foreground">
              {leadCounts.aiEnabledLeads} with Finn AI enabled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Need Attention</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leadCounts.needsAttention}</div>
            <p className="text-xs text-muted-foreground">
              New leads not yet contacted
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engaged</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leadCounts.engagedLeads}</div>
            <p className="text-xs text-muted-foreground">
              Active conversations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unread Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unreadMessages}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting response
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {quickActions.map((action, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-start gap-3 relative"
                    onClick={action.action}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className={`p-2 rounded-lg ${action.color} text-white`}>
                        <action.icon className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <div className="font-medium">{action.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {action.description}
                        </div>
                      </div>
                    </div>
                    {action.badge && (
                      <Badge className="absolute top-2 right-2" variant="destructive">
                        {action.badge}
                      </Badge>
                    )}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Insights Widget */}
        <div className="lg:col-span-1">
          <AIInsightsWidget />
        </div>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {leadCounts.needsAttention > 0 && (
              <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                <Clock className="w-5 h-5 text-orange-600" />
                <div>
                  <p className="font-medium">{leadCounts.needsAttention} new leads need attention</p>
                  <p className="text-sm text-muted-foreground">
                    These leads haven't been contacted yet
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => navigate('/leads')}>
                  Review
                </Button>
              </div>
            )}

            {unreadMessages > 0 && (
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-medium">{unreadMessages} unread messages</p>
                  <p className="text-sm text-muted-foreground">
                    Customer inquiries awaiting response
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => navigate('/smart-inbox')}>
                  View
                </Button>
              </div>
            )}

            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-medium">AI automation working</p>
                <p className="text-sm text-muted-foreground">
                  {leadCounts.aiEnabledLeads} leads have Finn AI enabled and are being nurtured
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => navigate('/ai-monitor')}>
                Monitor
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
