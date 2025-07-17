import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Shield, Users, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ComplianceStats {
  totalSuppressed: number;
  recentOptOuts: number;
  stopMessagesProcessed: number;
  complianceScore: number;
}

const SMSComplianceMonitor: React.FC = () => {
  const [stats, setStats] = useState<ComplianceStats>({
    totalSuppressed: 0,
    recentOptOuts: 0,
    stopMessagesProcessed: 0,
    complianceScore: 100
  });
  const [loading, setLoading] = useState(true);
  const [recentSuppressions, setRecentSuppressions] = useState<any[]>([]);

  useEffect(() => {
    loadComplianceStats();
  }, []);

  const loadComplianceStats = async () => {
    try {
      setLoading(true);

      // Get total suppressed contacts
      const { data: suppressedContacts } = await supabase
        .from('compliance_suppression_list')
        .select('*')
        .eq('type', 'sms');

      // Get recent opt-outs (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data: recentOptOuts } = await supabase
        .from('compliance_suppression_list')
        .select('*')
        .eq('type', 'sms')
        .gte('created_at', sevenDaysAgo.toISOString());

      // Get STOP messages from conversations
      const { data: stopMessages } = await supabase
        .from('conversations')
        .select('id, body, created_at, leads(first_name, last_name)')
        .eq('direction', 'in')
        .or('body.ilike.%STOP%,body.ilike.%UNSUBSCRIBE%,body.ilike.%QUIT%');

      // Calculate compliance score
      const totalContacts = suppressedContacts?.length || 0;
      const recentOptOutCount = recentOptOuts?.length || 0;
      const complianceScore = Math.max(0, 100 - (recentOptOutCount * 5)); // Reduce score for recent opt-outs

      setStats({
        totalSuppressed: totalContacts,
        recentOptOuts: recentOptOutCount,
        stopMessagesProcessed: stopMessages?.length || 0,
        complianceScore
      });

      // Set recent suppressions for display
      setRecentSuppressions(recentOptOuts?.slice(0, 5) || []);

    } catch (error) {
      console.error('Error loading compliance stats:', error);
      toast.error('Failed to load compliance statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleTestStopMessage = async () => {
    toast.info('STOP message processing is automatically handled by the webhook. When customers reply "STOP", they are immediately added to the suppression list and AI messaging is paused.');
  };

  const getComplianceColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getComplianceBadgeVariant = (score: number) => {
    if (score >= 90) return 'default';
    if (score >= 70) return 'secondary';
    return 'destructive';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            SMS Compliance Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading compliance data...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            SMS Compliance Overview
          </CardTitle>
          <CardDescription>
            Monitor STOP message handling and suppression list management
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{stats.totalSuppressed}</div>
              <div className="text-sm text-muted-foreground">Total Suppressed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.recentOptOuts}</div>
              <div className="text-sm text-muted-foreground">Recent Opt-outs (7d)</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.stopMessagesProcessed}</div>
              <div className="text-sm text-muted-foreground">STOP Messages Detected</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${getComplianceColor(stats.complianceScore)}`}>
                {stats.complianceScore}%
              </div>
              <div className="text-sm text-muted-foreground">Compliance Score</div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Badge variant={getComplianceBadgeVariant(stats.complianceScore)}>
              {stats.complianceScore >= 90 ? 'Excellent Compliance' : 
               stats.complianceScore >= 70 ? 'Good Compliance' : 'Needs Attention'}
            </Badge>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={loadComplianceStats}>
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={handleTestStopMessage}>
                How STOP Works
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {recentSuppressions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Recent Opt-outs
            </CardTitle>
            <CardDescription>
              Latest customers who opted out of SMS messaging
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentSuppressions.map((suppression, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <div className="font-medium">{suppression.contact}</div>
                    <div className="text-sm text-muted-foreground">{suppression.reason}</div>
                    {suppression.details && (
                      <div className="text-xs text-muted-foreground mt-1">{suppression.details}</div>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(suppression.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Compliance Features Active</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>STOP keyword detection enabled</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Automatic suppression list management</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>AI automation pausing for opted-out leads</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Compliance checking before message sending</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Audit trail for all opt-out events</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SMSComplianceMonitor;