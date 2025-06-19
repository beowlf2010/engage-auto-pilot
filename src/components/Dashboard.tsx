
import React from 'react';
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
import { useLeads } from '@/hooks/useLeads';
import { useConversationData } from '@/hooks/useConversationData';
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
  const { leads, loading: leadsLoading } = useLeads();
  const { messages } = useConversationData();

  // Calculate stats
  const totalLeads = leads.length;
  const newLeads = leads.filter(lead => lead.status === 'new').length;
  const aiEnabledLeads = leads.filter(lead => lead.aiOptIn).length;
  const unreadMessages = leads.reduce((sum, lead) => sum + (lead.unreadCount || 0), 0);

  const quickActions = [
    {
      title: 'Smart Inbox',
      description: 'View and respond to messages',
      icon: MessageSquare,
      action: () => navigate('/inbox'),
      badge: unreadMessages > 0 ? unreadMessages : null,
      color: 'bg-blue-500'
    },
    {
      title: 'Leads',
      description: 'Manage your leads',
      icon: Users,
      action: () => navigate('/leads'),
      badge: newLeads > 0 ? newLeads : null,
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
            <div className="text-2xl font-bold">{totalLeads}</div>
            <p className="text-xs text-muted-foreground">
              {aiEnabledLeads} with Finn AI enabled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Leads</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{newLeads}</div>
            <p className="text-xs text-muted-foreground">
              Requiring attention
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
              Across all conversations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Automation</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round((aiEnabledLeads / totalLeads) * 100)}%</div>
            <p className="text-xs text-muted-foreground">
              Leads with AI enabled
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
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-medium">New message received</p>
                <p className="text-sm text-muted-foreground">
                  Check your inbox for the latest customer inquiries
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => navigate('/inbox')}>
                View
              </Button>
            </div>

            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-medium">AI insights updated</p>
                <p className="text-sm text-muted-foreground">
                  New predictive analytics are available in AI Monitor
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => navigate('/ai-monitor')}>
                View
              </Button>
            </div>

            <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
              <Users className="w-5 h-5 text-orange-600" />
              <div>
                <p className="font-medium">High-value leads identified</p>
                <p className="text-sm text-muted-foreground">
                  Finn AI has identified leads requiring immediate attention
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => navigate('/leads')}>
                Review
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
