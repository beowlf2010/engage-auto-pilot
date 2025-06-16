
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Activity, Clock, Eye, Mouse, Globe, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { processPendingEnhancedTriggers } from '@/services/enhancedBehavioralService';

const BehavioralTriggersPanel = () => {
  const [triggers, setTriggers] = useState<any[]>([]);
  const [processing, setProcessing] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    processed: 0,
    highUrgency: 0
  });

  useEffect(() => {
    loadTriggers();
    loadStats();
  }, []);

  const loadTriggers = async () => {
    const { data } = await supabase
      .from('enhanced_behavioral_triggers')
      .select(`
        *,
        leads(first_name, last_name, vehicle_interest)
      `)
      .order('created_at', { ascending: false })
      .limit(20);

    setTriggers(data || []);
  };

  const loadStats = async () => {
    const { data: allTriggers } = await supabase
      .from('enhanced_behavioral_triggers')
      .select('processed, urgency_level');

    if (allTriggers) {
      const total = allTriggers.length;
      const pending = allTriggers.filter(t => !t.processed).length;
      const processed = allTriggers.filter(t => t.processed).length;
      const highUrgency = allTriggers.filter(t => ['high', 'critical'].includes(t.urgency_level)).length;

      setStats({ total, pending, processed, highUrgency });
    }
  };

  const handleProcessTriggers = async () => {
    setProcessing(true);
    try {
      await processPendingEnhancedTriggers();
      await loadTriggers();
      await loadStats();
    } catch (error) {
      console.error('Error processing triggers:', error);
    } finally {
      setProcessing(false);
    }
  };

  const getTriggerIcon = (type: string) => {
    const iconMap: Record<string, any> = {
      website_visit: Globe,
      email_open: Eye,
      link_click: Mouse,
      page_view: Activity,
      search_activity: Activity,
      price_alert: AlertTriangle,
      inventory_match: CheckCircle
    };

    const Icon = iconMap[type] || Activity;
    return <Icon className="h-4 w-4" />;
  };

  const getUrgencyColor = (urgency: string) => {
    const colorMap: Record<string, string> = {
      low: 'default',
      medium: 'secondary',
      high: 'destructive',
      critical: 'destructive'
    };
    return colorMap[urgency] || 'default';
  };

  const formatTriggerData = (type: string, data: any) => {
    switch (type) {
      case 'website_visit':
        return `${data.page_type} - ${data.time_spent}s`;
      case 'email_open':
        return `${data.engagement_type} engagement`;
      case 'price_alert':
        return `Price change: $${data.old_price} → $${data.new_price}`;
      default:
        return 'Activity detected';
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Activity className="h-6 w-6 text-blue-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-gray-600">Total Triggers</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-6 w-6 text-yellow-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.pending}</div>
            <div className="text-sm text-gray-600">Pending</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-6 w-6 text-green-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.processed}</div>
            <div className="text-sm text-gray-600">Processed</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-6 w-6 text-red-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.highUrgency}</div>
            <div className="text-sm text-gray-600">High Urgency</div>
          </CardContent>
        </Card>
      </div>

      {/* Triggers List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Behavioral Triggers
            </CardTitle>
            <Button 
              onClick={handleProcessTriggers}
              disabled={processing}
              size="sm"
            >
              {processing ? 'Processing...' : 'Process Triggers'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {triggers.map((trigger) => (
              <div key={trigger.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getTriggerIcon(trigger.trigger_type)}
                  <div>
                    <div className="font-medium">
                      {trigger.leads?.first_name} {trigger.leads?.last_name}
                    </div>
                    <div className="text-sm text-gray-600">
                      {formatTriggerData(trigger.trigger_type, trigger.trigger_data)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">Score: {trigger.trigger_score}</span>
                      <Progress value={trigger.trigger_score} className="w-20 h-2" />
                    </div>
                    <Badge variant={getUrgencyColor(trigger.urgency_level)}>
                      {trigger.urgency_level}
                    </Badge>
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    {new Date(trigger.created_at).toLocaleDateString()}
                  </div>

                  {trigger.processed && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                </div>
              </div>
            ))}

            {triggers.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No behavioral triggers found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BehavioralTriggersPanel;
