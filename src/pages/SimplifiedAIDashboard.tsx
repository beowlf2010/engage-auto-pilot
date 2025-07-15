import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Bot, 
  Users, 
  MessageSquare, 
  TrendingUp, 
  Settings,
  Play,
  Pause,
  CheckCircle,
  AlertCircle,
  Loader2,
  Search
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { EmergencyControlCard } from '@/components/emergency/EmergencyControlCard';
import { toast } from '@/hooks/use-toast';

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  vehicle_interest?: string;
  ai_opt_in?: boolean;
  ai_stage?: string;
  status: string;
}

interface AIStats {
  totalLeads: number;
  aiEnabled: number;
  activeSequences: number;
  totalMessages: number;
  responseRate: number;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  urgency_level: string;
  created_at: string;
  read_at?: string;
}

const SimplifiedAIDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [aiStats, setAIStats] = useState<AIStats>({
    totalLeads: 0,
    aiEnabled: 0,
    activeSequences: 0,
    totalMessages: 0,
    responseRate: 0
  });

  // Fetch all data
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch leads
      const { data: leadsData } = await supabase
        .from('leads')
        .select('id, first_name, last_name, email, vehicle_interest, ai_opt_in, ai_stage, status')
        .neq('status', 'lost')
        .order('created_at', { ascending: false })
        .limit(100);

      // Fetch notifications
      const { data: notificationsData } = await supabase
        .from('ai_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      // Fetch message stats
      const { data: messageStats } = await supabase
        .from('ai_generated_messages')
        .select('id, response_received')
        .limit(1000);

      if (leadsData) setLeads(leadsData);
      if (notificationsData) setNotifications(notificationsData);

      // Calculate stats
      const totalLeads = leadsData?.length || 0;
      const aiEnabled = leadsData?.filter(l => l.ai_opt_in).length || 0;
      const activeSequences = leadsData?.filter(l => l.ai_opt_in && l.ai_stage === 'scheduled').length || 0;
      const totalMessages = messageStats?.length || 0;
      const responses = messageStats?.filter(m => m.response_received).length || 0;
      const responseRate = totalMessages > 0 ? Math.round((responses / totalMessages) * 100) : 0;

      setAIStats({
        totalLeads,
        aiEnabled,
        activeSequences,
        totalMessages,
        responseRate
      });

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Toggle AI for a lead
  const handleAIToggle = async (leadId: string, enable: boolean) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ 
          ai_opt_in: enable,
          ai_stage: enable ? 'scheduled' : null
        })
        .eq('id', leadId);

      if (error) throw error;

      // Update local state
      setLeads(prev => prev.map(lead => 
        lead.id === leadId 
          ? { ...lead, ai_opt_in: enable, ai_stage: enable ? 'scheduled' : null }
          : lead
      ));

      toast({
        title: "Success",
        description: `AI ${enable ? 'enabled' : 'disabled'} for lead`,
      });
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to update AI status",
        variant: "destructive"
      });
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from('ai_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);

      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n
      ));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Filter leads based on search
  const filteredLeads = leads.filter(lead => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      lead.first_name?.toLowerCase().includes(searchLower) ||
      lead.last_name?.toLowerCase().includes(searchLower) ||
      lead.email?.toLowerCase().includes(searchLower) ||
      lead.vehicle_interest?.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading AI Dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">AI Dashboard</h1>
          <p className="text-muted-foreground">Simplified AI management center</p>
        </div>
        <Button onClick={fetchData} variant="outline">
          <TrendingUp className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Emergency Control & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <EmergencyControlCard />
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aiStats.totalLeads}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Enabled</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aiStats.aiEnabled}</div>
            <p className="text-xs text-muted-foreground">
              {aiStats.totalLeads > 0 ? Math.round((aiStats.aiEnabled / aiStats.totalLeads) * 100) : 0}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sequences</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aiStats.activeSequences}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aiStats.responseRate}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="leads" className="space-y-4">
        <TabsList>
          <TabsTrigger value="leads">Lead Management</TabsTrigger>
          <TabsTrigger value="notifications">
            Notifications {notifications.filter(n => !n.read_at).length > 0 && (
              <Badge variant="destructive" className="ml-2 h-5">
                {notifications.filter(n => !n.read_at).length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* Leads Tab */}
        <TabsContent value="leads" className="space-y-4">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Leads ({filteredLeads.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Vehicle Interest</TableHead>
                    <TableHead>AI Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.slice(0, 20).map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell>
                        <div className="font-medium">{lead.first_name} {lead.last_name}</div>
                      </TableCell>
                      <TableCell>{lead.email}</TableCell>
                      <TableCell>{lead.vehicle_interest || 'Not specified'}</TableCell>
                      <TableCell>
                        <Badge variant={lead.ai_opt_in ? "default" : "secondary"}>
                          {lead.ai_opt_in ? 'Enabled' : 'Disabled'}
                        </Badge>
                        {lead.ai_opt_in && lead.ai_stage && (
                          <Badge variant="outline" className="ml-1">
                            {lead.ai_stage}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant={lead.ai_opt_in ? "destructive" : "default"}
                          onClick={() => handleAIToggle(lead.id, !lead.ai_opt_in)}
                        >
                          {lead.ai_opt_in ? (
                            <>
                              <Pause className="w-3 h-3 mr-1" />
                              Disable
                            </>
                          ) : (
                            <>
                              <Play className="w-3 h-3 mr-1" />
                              Enable
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {notifications.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No notifications</p>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 border rounded-lg ${!notification.read_at ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{notification.title}</h4>
                          <Badge variant={
                            notification.urgency_level === 'high' ? 'destructive' :
                            notification.urgency_level === 'medium' ? 'default' : 'secondary'
                          }>
                            {notification.urgency_level}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(notification.created_at).toLocaleString()}
                        </p>
                      </div>
                      {!notification.read_at && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => markAsRead(notification.id)}
                        >
                          Mark Read
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Messages Sent</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{aiStats.totalMessages}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Response Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{aiStats.responseRate}%</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Active Conversations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{aiStats.activeSequences}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">AI Adoption</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {aiStats.totalLeads > 0 ? Math.round((aiStats.aiEnabled / aiStats.totalLeads) * 100) : 0}%
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SimplifiedAIDashboard;