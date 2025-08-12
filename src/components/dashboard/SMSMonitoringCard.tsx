import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, MessageSquare, CheckCircle, XCircle, AlertCircle, Send } from 'lucide-react';

interface SMSStats {
  total_sent: number;
  delivered: number;
  failed: number;
  pending: number;
  success_rate: number;
}

interface AutomationRun {
  id: string;
  created_at: string;
  status: string;
  leads_processed: number;
  leads_successful: number;
  leads_failed: number;
  source: string;
}

export const SMSMonitoringCard = () => {
  const [stats, setStats] = useState<SMSStats | null>(null);
  const [recentRuns, setRecentRuns] = useState<AutomationRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('Test message from your dealership!');
  const [testing, setTesting] = useState(false);
  const { toast } = useToast();

  const fetchStats = async () => {
    try {
      // Get SMS delivery stats from conversations
      const { data: conversations, error: convoError } = await supabase
        .from('conversations')
        .select('sms_status, sent_at')
        .eq('direction', 'out')
        .not('sms_status', 'is', null)
        .gte('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours

      if (convoError) throw convoError;

      const total = conversations?.length || 0;
      const delivered = conversations?.filter(c => ['delivered', 'sent'].includes(c.sms_status?.toLowerCase())).length || 0;
      const failed = conversations?.filter(c => ['failed', 'undelivered'].includes(c.sms_status?.toLowerCase())).length || 0;
      const pending = conversations?.filter(c => ['queued', 'sending', 'accepted'].includes(c.sms_status?.toLowerCase())).length || 0;

      setStats({
        total_sent: total,
        delivered,
        failed,
        pending,
        success_rate: total > 0 ? (delivered / total) * 100 : 0
      });

      // Get recent automation runs
      const { data: runs, error: runsError } = await supabase
        .from('ai_automation_runs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (runsError) throw runsError;
      setRecentRuns(runs || []);

    } catch (error) {
      console.error('Error fetching SMS stats:', error);
      toast({
        title: "Error",
        description: "Failed to fetch SMS statistics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const sendTestSMS = async () => {
    if (!testPhone || !testMessage) {
      toast({
        title: "Error",
        description: "Please enter both phone number and message",
        variant: "destructive",
      });
      return;
    }

    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-sms', {
        body: {
          to: testPhone,
          message: testMessage
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Success",
          description: `Test SMS sent successfully! (${data.messageSid})`,
        });
        setTestPhone('');
        // Refresh stats after a moment
        setTimeout(fetchStats, 2000);
      } else {
        throw new Error(data.error || 'Failed to send test SMS');
      }
    } catch (error) {
      console.error('Error sending test SMS:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send test SMS",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            SMS Monitoring
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <RefreshCw className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          SMS Monitoring
        </CardTitle>
        <CardDescription>
          Track SMS delivery rates and test Twilio integration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* SMS Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{stats?.total_sent || 0}</div>
            <div className="text-sm text-muted-foreground">Total Sent</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats?.delivered || 0}</div>
            <div className="text-sm text-muted-foreground">Delivered</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${(() => {
              const total = stats?.total_sent || 0;
              const failed = stats?.failed || 0;
              const rate = total > 0 ? (failed / total) * 100 : 0;
              return rate > 10 ? 'text-red-600' : 'text-amber-600';
            })()}`}>{stats?.failed || 0}</div>
            <div className="text-sm text-muted-foreground">
              Failed
              <span className="ml-1 align-middle" title="Turns red only if failure rate > 10% in last 24h">❓</span>
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats?.pending || 0}</div>
            <div className="text-sm text-muted-foreground">Pending</div>
          </div>
        </div>

        {/* Success Rate */}
        <div className="text-center">
          <div className="text-lg font-semibold">
            Success Rate: {stats?.success_rate.toFixed(1) || 0}%
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div 
              className="bg-green-600 h-2 rounded-full transition-all" 
              style={{ width: `${stats?.success_rate || 0}%` }}
            />
          </div>
        </div>

        {/* Test SMS */}
        <div className="border-t pt-4">
          <h4 className="font-semibold mb-3">Test SMS Integration</h4>
          <div className="space-y-3">
            <Input
              placeholder="Phone number (e.g., +15551234567)"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
            />
            <Input
              placeholder="Test message"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
            />
            <Button 
              onClick={sendTestSMS} 
              disabled={testing}
              className="w-full"
            >
              {testing ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send Test SMS
            </Button>
          </div>
        </div>

        {/* Recent Automation Runs */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold">Recent AI Automation Runs</h4>
            <Button variant="outline" size="sm" onClick={fetchStats}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-2">
            {recentRuns.map((run) => (
              <div key={run.id} className="flex items-center justify-between p-2 bg-muted rounded">
                <div className="flex items-center gap-2">
                  {run.status === 'completed' ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : run.status === 'failed' ? (
                    <XCircle className="h-4 w-4 text-red-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                  )}
                  <span className="text-sm">
                    {new Date(run.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={run.leads_successful > 0 ? "default" : "destructive"}>
                    {run.leads_successful || 0} sent
                  </Badge>
                  {run.leads_failed > 0 && (
                    <Badge variant="destructive">
                      {run.leads_failed} failed
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};