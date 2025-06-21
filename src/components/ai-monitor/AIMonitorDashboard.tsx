
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bot, 
  MessageSquare, 
  Users, 
  Clock, 
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Calendar,
  CheckCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import MessagePreviewInline from './MessagePreviewInline';
import MessageQueueDashboard from './MessageQueueDashboard';
import SmartAIQueueTab from './SmartAIQueueTab';

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  vehicle_interest: string;
  ai_stage: string;
  ai_messages_sent: number;
  next_ai_send_at: string;
  last_reply_at: string;
  ai_opt_in: boolean;
  pending_human_response: boolean;
}

interface AIStats {
  totalAIEnabled: number;
  messagesSentToday: number;
  leadsDueNow: number;
  avgResponseTime: number;
  conversionRate: number;
}

const AIMonitorDashboard = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<AIStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboardData = async () => {
    try {
      console.log('🔄 [AI MONITOR] Loading dashboard data...');
      
      // Get leads that are due for AI contact
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select('*')
        .eq('ai_opt_in', true)
        .eq('ai_sequence_paused', false)
        .or('next_ai_send_at.is.null,next_ai_send_at.lte.' + new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(20);

      if (leadsError) {
        console.error('❌ [AI MONITOR] Error loading leads:', leadsError);
        return;
      }

      setLeads(leadsData || []);
      console.log(`✅ [AI MONITOR] Loaded ${leadsData?.length || 0} leads due for contact`);

      // Calculate stats
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const { data: statsData } = await supabase
        .from('leads')
        .select('ai_opt_in, ai_messages_sent, created_at, last_reply_at')
        .gte('created_at', todayStart.toISOString());

      const totalAIEnabled = statsData?.filter(l => l.ai_opt_in).length || 0;
      const messagesSentToday = statsData?.reduce((sum, l) => sum + (l.ai_messages_sent || 0), 0) || 0;
      const leadsDueNow = leadsData?.length || 0;

      setStats({
        totalAIEnabled,
        messagesSentToday,
        leadsDueNow,
        avgResponseTime: 2.5, // Mock for now
        conversionRate: 15.8 // Mock for now
      });

    } catch (error) {
      console.error('❌ [AI MONITOR] Error loading dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load AI monitor data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
    toast({
      title: "Refreshed",
      description: "AI monitor data has been updated",
    });
  };

  const handleMessageSent = async () => {
    console.log('🔄 [AI MONITOR] Message sent callback triggered, refreshing...');
    await loadDashboardData();
  };

  useEffect(() => {
    loadDashboardData();
    
    // Auto-refresh every 2 minutes
    const interval = setInterval(loadDashboardData, 120000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Monitor Dashboard</h1>
          <p className="text-muted-foreground">Monitor and manage AI-powered lead engagement</p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Bot className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalAIEnabled}</p>
                  <p className="text-xs text-gray-500">AI Enabled</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.messagesSentToday}</p>
                  <p className="text-xs text-gray-500">Sent Today</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-orange-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.leadsDueNow}</p>
                  <p className="text-xs text-gray-500">Due Now</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.avgResponseTime}h</p>
                  <p className="text-xs text-gray-500">Avg Response</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-indigo-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.conversionRate}%</p>
                  <p className="text-xs text-gray-500">Conversion</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="due-now" className="space-y-4">
        <TabsList>
          <TabsTrigger value="due-now" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Due Now ({leads.length})
          </TabsTrigger>
          <TabsTrigger value="queue">
            <Calendar className="w-4 h-4 mr-2" />
            Message Queue
          </TabsTrigger>
          <TabsTrigger value="smart-queue">
            <Bot className="w-4 h-4 mr-2" />
            Smart Queue
          </TabsTrigger>
        </TabsList>

        {/* Due Now Tab */}
        <TabsContent value="due-now">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <span>Leads Due for AI Contact</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {leads.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No leads due for AI contact at this time</p>
                  <p className="text-sm">All AI sequences are up to date!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {leads.map((lead) => (
                    <div key={lead.id} className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <div className="flex items-center space-x-3">
                          <div>
                            <h4 className="font-medium">
                              {lead.first_name} {lead.last_name}
                            </h4>
                            <p className="text-sm text-gray-600">{lead.vehicle_interest}</p>
                          </div>
                          <Badge variant="outline">
                            {lead.ai_stage || 'initial_contact'}
                          </Badge>
                          <Badge variant="secondary">
                            Messages: {lead.ai_messages_sent || 0}
                          </Badge>
                        </div>
                        <div className="text-right text-sm text-gray-500">
                          {lead.next_ai_send_at ? (
                            <span>Due: {new Date(lead.next_ai_send_at).toLocaleString()}</span>
                          ) : (
                            <span>Ready to send</span>
                          )}
                        </div>
                      </div>
                      
                      <MessagePreviewInline
                        leadId={lead.id}
                        leadName={`${lead.first_name} ${lead.last_name}`}
                        vehicleInterest={lead.vehicle_interest}
                        aiStage={lead.ai_stage || 'initial_contact'}
                        onMessageSent={handleMessageSent}
                        onPreviewFull={() => {
                          console.log(`Opening full preview for ${lead.first_name} ${lead.last_name}`);
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Message Queue Tab */}
        <TabsContent value="queue">
          <MessageQueueDashboard />
        </TabsContent>

        {/* Smart Queue Tab */}
        <TabsContent value="smart-queue">
          <SmartAIQueueTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AIMonitorDashboard;
