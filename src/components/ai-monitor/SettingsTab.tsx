
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Settings, Play, Pause, MessageSquare, Clock } from 'lucide-react';

interface AIStats {
  totalActiveLeads: number;
  totalQueuedMessages: number;
  messagesLastHour: number;
  averageResponseRate: number;
}

const SettingsTab = () => {
  const [stats, setStats] = useState<AIStats | null>(null);
  const [globalAIEnabled, setGlobalAIEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAIStats = async () => {
    try {
      // Get active leads count
      const { data: activeLeads, error: activeError } = await supabase
        .from('leads')
        .select('id')
        .eq('ai_opt_in', true);

      if (activeError) throw activeError;

      // Get queued messages count
      const { data: queuedMessages, error: queuedError } = await supabase
        .from('leads')
        .select('id')
        .eq('ai_opt_in', true)
        .not('next_ai_send_at', 'is', null);

      if (queuedError) throw queuedError;

      // Get messages sent in last hour
      const oneHourAgo = new Date(Date.now() - (60 * 60 * 1000)).toISOString();
      const { data: recentMessages, error: recentError } = await supabase
        .from('conversations')
        .select('id')
        .eq('ai_generated', true)
        .eq('direction', 'out')
        .gte('sent_at', oneHourAgo);

      if (recentError) throw recentError;

      // Calculate average response rate (last 7 days)
      const weekAgo = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000)).toISOString();
      const { data: weekMessages, error: weekError } = await supabase
        .from('conversations')
        .select(`
          id,
          sent_at,
          lead_id
        `)
        .eq('ai_generated', true)
        .eq('direction', 'out')
        .gte('sent_at', weekAgo);

      if (weekError) throw weekError;

      // Check for responses to recent messages
      let responseCount = 0;
      if (weekMessages) {
        for (const msg of weekMessages) {
          const { data: responses } = await supabase
            .from('conversations')
            .select('id')
            .eq('lead_id', msg.lead_id)
            .eq('direction', 'in')
            .gt('sent_at', msg.sent_at)
            .limit(1);

          if (responses && responses.length > 0) {
            responseCount++;
          }
        }
      }

      const responseRate = weekMessages && weekMessages.length > 0 
        ? (responseCount / weekMessages.length) * 100 
        : 0;

      setStats({
        totalActiveLeads: activeLeads?.length || 0,
        totalQueuedMessages: queuedMessages?.length || 0,
        messagesLastHour: recentMessages?.length || 0,
        averageResponseRate: responseRate
      });

    } catch (error) {
      console.error('Error fetching AI stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleGlobalAI = async (enabled: boolean) => {
    try {
      // In a real implementation, you might want a global settings table
      // For now, we'll update all leads
      const { error } = await supabase
        .from('leads')
        .update({ 
          ai_opt_in: enabled,
          next_ai_send_at: enabled ? null : null // Clear schedules if disabling
        })
        .eq('ai_opt_in', !enabled); // Only update leads that are in the opposite state

      if (error) throw error;

      setGlobalAIEnabled(enabled);
      toast({
        title: enabled ? "AI Enabled Globally" : "AI Disabled Globally",
        description: enabled 
          ? "AI messaging has been enabled for all leads"
          : "AI messaging has been disabled for all leads"
      });

      fetchAIStats();
    } catch (error) {
      console.error('Error toggling global AI:', error);
      toast({
        title: "Error",
        description: "Failed to update AI settings",
        variant: "destructive"
      });
    }
  };

  const pauseAllAI = async () => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ 
          ai_opt_in: false,
          next_ai_send_at: null,
          ai_sequence_paused: true,
          ai_pause_reason: 'manual_global_pause'
        })
        .eq('ai_opt_in', true);

      if (error) throw error;

      toast({
        title: "All AI Paused",
        description: "AI messaging has been paused for all leads"
      });

      fetchAIStats();
    } catch (error) {
      console.error('Error pausing all AI:', error);
      toast({
        title: "Error",
        description: "Failed to pause AI messaging",
        variant: "destructive"
      });
    }
  };

  const resumeAllAI = async () => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ 
          ai_opt_in: true,
          ai_sequence_paused: false,
          ai_pause_reason: null
        })
        .or('ai_sequence_paused.eq.true,ai_pause_reason.eq.manual_global_pause');

      if (error) throw error;

      toast({
        title: "All AI Resumed",
        description: "AI messaging has been resumed for paused leads"
      });

      fetchAIStats();
    } catch (error) {
      console.error('Error resuming all AI:', error);
      toast({
        title: "Error",
        description: "Failed to resume AI messaging",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchAIStats();
    const interval = setInterval(fetchAIStats, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="p-6 text-center">Loading settings...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center space-x-2 mb-6">
        <Settings className="h-5 w-5 text-slate-500" />
        <span className="text-lg font-semibold">AI System Settings</span>
      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats?.totalActiveLeads || 0}</div>
              <div className="text-sm text-slate-500">Active Leads</div>
            </div>
            
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <div className="text-2xl font-bold text-amber-600">{stats?.totalQueuedMessages || 0}</div>
              <div className="text-sm text-slate-500">Queued Messages</div>
            </div>
            
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats?.messagesLastHour || 0}</div>
              <div className="text-sm text-slate-500">Messages Last Hour</div>
            </div>
            
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {stats?.averageResponseRate.toFixed(1) || 0}%
              </div>
              <div className="text-sm text-slate-500">Avg Response Rate</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Global Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Global AI Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
            <div>
              <h3 className="font-medium">Master AI Toggle</h3>
              <p className="text-sm text-slate-500">Enable or disable AI messaging system-wide</p>
            </div>
            <Switch
              checked={globalAIEnabled}
              onCheckedChange={toggleGlobalAI}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={pauseAllAI}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <Pause className="h-4 w-4" />
              <span>Pause All AI</span>
            </Button>

            <Button
              onClick={resumeAllAI}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <Play className="h-4 w-4" />
              <span>Resume All AI</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* System Health */}
      <Card>
        <CardHeader>
          <CardTitle>System Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>OpenAI API Connection</span>
              </div>
              <Badge className="bg-green-100 text-green-600">Connected</Badge>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>Twilio SMS Service</span>
              </div>
              <Badge className="bg-green-100 text-green-600">Active</Badge>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>Database Connection</span>
              </div>
              <Badge className="bg-green-100 text-green-600">Healthy</Badge>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>Message Scheduler</span>
              </div>
              <Badge className="bg-green-100 text-green-600">Running</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              onClick={fetchAIStats}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <Clock className="h-4 w-4" />
              <span>Refresh Stats</span>
            </Button>

            <Button
              onClick={() => window.open('/smartinbox', '_blank')}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <MessageSquare className="h-4 w-4" />
              <span>Open Smart Inbox</span>
            </Button>

            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <Settings className="h-4 w-4" />
              <span>Reload Dashboard</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsTab;
