import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, 
  Clock, 
  DollarSign, 
  Users, 
  Bell, 
  Settings,
  CheckCircle,
  X,
  Zap,
  TrendingDown,
  Package,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface InventoryAlert {
  id: string;
  type: 'low_stock' | 'aging_inventory' | 'price_optimization' | 'lead_opportunity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  vehicle_id?: string;
  alert_data: any;
  actionable: boolean;
  recommended_actions: string[];
  is_active: boolean;
  acknowledged_at?: string;
  created_at: string;
  inventory?: {
    stock_number: string;
    make: string;
    model: string;
    year: number;
    condition: string;
  };
}

const RealTimeAlertsCenter = () => {
  const [alerts, setAlerts] = useState<InventoryAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const { toast } = useToast();

  useEffect(() => {
    loadAlerts();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('inventory-alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'inventory_alerts'
        },
        (payload) => {
          console.log('New alert received:', payload);
          setAlerts(prev => [payload.new as InventoryAlert, ...prev]);
          
          // Show toast notification
          const newAlert = payload.new as InventoryAlert;
          toast({
            title: `${newAlert.severity.toUpperCase()} Alert`,
            description: newAlert.title,
            variant: newAlert.severity === 'critical' ? 'destructive' : 'default'
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadAlerts = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('inventory-alerts', {
        body: { action: 'get_alerts' }
      });

      if (error) throw error;
      setAlerts(data.alerts || []);
    } catch (error) {
      console.error('Error loading alerts:', error);
      toast({
        title: "Error",
        description: "Failed to load alerts",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('inventory-alerts', {
        body: { 
          action: 'analyze_inventory',
          config: {
            lowStockThreshold: 2,
            agingThreshold: 60,
            priceVarianceThreshold: 15,
            leadOpportunityThreshold: 3
          }
        }
      });

      if (error) throw error;
      
      toast({
        title: "Analysis Complete",
        description: `Generated ${data.alertsGenerated} new alerts`
      });
      
      await loadAlerts();
    } catch (error) {
      console.error('Error running analysis:', error);
      toast({
        title: "Error",
        description: "Failed to run inventory analysis",
        variant: "destructive"
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('inventory_alerts')
        .update({ 
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', alertId);

      if (error) throw error;

      setAlerts(prev => prev.map(alert => 
        alert.id === alertId 
          ? { ...alert, acknowledged_at: new Date().toISOString() }
          : alert
      ));

      toast({
        title: "Alert Acknowledged",
        description: "Alert has been marked as acknowledged"
      });
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  const dismissAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('inventory_alerts')
        .update({ is_active: false })
        .eq('id', alertId);

      if (error) throw error;

      setAlerts(prev => prev.filter(alert => alert.id !== alertId));

      toast({
        title: "Alert Dismissed",
        description: "Alert has been dismissed"
      });
    } catch (error) {
      console.error('Error dismissing alert:', error);
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'low_stock': return Package;
      case 'aging_inventory': return Clock;
      case 'price_optimization': return DollarSign;
      case 'lead_opportunity': return Users;
      default: return AlertTriangle;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    if (activeTab === 'all') return true;
    if (activeTab === 'unacknowledged') return !alert.acknowledged_at;
    if (activeTab === 'critical') return alert.severity === 'critical';
    return alert.type === activeTab;
  });

  const alertCounts = {
    total: alerts.length,
    critical: alerts.filter(a => a.severity === 'critical').length,
    unacknowledged: alerts.filter(a => !a.acknowledged_at).length,
    low_stock: alerts.filter(a => a.type === 'low_stock').length,
    aging_inventory: alerts.filter(a => a.type === 'aging_inventory').length,
    price_optimization: alerts.filter(a => a.type === 'price_optimization').length,
    lead_opportunity: alerts.filter(a => a.type === 'lead_opportunity').length
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            Loading alerts...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 text-red-600">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-xl">Real-time Alerts Center</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Monitor inventory issues and opportunities in real-time
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={runAnalysis}
                disabled={analyzing}
                variant="outline"
              >
                {analyzing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Run Analysis
                  </>
                )}
              </Button>
              <Button variant="outline" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Alert Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <div>
                <div className="text-2xl font-bold">{alertCounts.critical}</div>
                <div className="text-xs text-muted-foreground">Critical</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-orange-600" />
              <div>
                <div className="text-2xl font-bold">{alertCounts.unacknowledged}</div>
                <div className="text-xs text-muted-foreground">Unacknowledged</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{alertCounts.low_stock}</div>
                <div className="text-xs text-muted-foreground">Low Stock</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-green-600" />
              <div>
                <div className="text-2xl font-bold">{alertCounts.lead_opportunity}</div>
                <div className="text-xs text-muted-foreground">Opportunities</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts List */}
      <Card>
        <CardHeader>
          <CardTitle>Active Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="all">All ({alertCounts.total})</TabsTrigger>
              <TabsTrigger value="unacknowledged">New ({alertCounts.unacknowledged})</TabsTrigger>
              <TabsTrigger value="critical">Critical ({alertCounts.critical})</TabsTrigger>
              <TabsTrigger value="low_stock">Stock ({alertCounts.low_stock})</TabsTrigger>
              <TabsTrigger value="aging_inventory">Aging ({alertCounts.aging_inventory})</TabsTrigger>
              <TabsTrigger value="lead_opportunity">Leads ({alertCounts.lead_opportunity})</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              <div className="space-y-4">
                {filteredAlerts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <p>No active alerts in this category</p>
                  </div>
                ) : (
                  filteredAlerts.map((alert) => {
                    const Icon = getAlertIcon(alert.type);
                    return (
                      <Alert key={alert.id} className={`border-l-4 ${
                        alert.severity === 'critical' ? 'border-l-red-500' :
                        alert.severity === 'high' ? 'border-l-orange-500' :
                        alert.severity === 'medium' ? 'border-l-yellow-500' :
                        'border-l-blue-500'
                      }`}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <Icon className="h-5 w-5 mt-1" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-medium">{alert.title}</h4>
                                <Badge variant={getSeverityColor(alert.severity) as any}>
                                  {alert.severity}
                                </Badge>
                                {alert.acknowledged_at && (
                                  <Badge variant="outline" className="text-xs">
                                    Acknowledged
                                  </Badge>
                                )}
                              </div>
                              <AlertDescription className="mb-3">
                                {alert.message}
                              </AlertDescription>
                              
                              {alert.inventory && (
                                <div className="text-sm text-muted-foreground mb-3">
                                  Vehicle: {alert.inventory.stock_number} - {alert.inventory.year} {alert.inventory.make} {alert.inventory.model}
                                </div>
                              )}

                              {alert.actionable && alert.recommended_actions.length > 0 && (
                                <div className="mb-3">
                                  <p className="text-sm font-medium mb-2">Recommended Actions:</p>
                                  <ul className="text-sm text-muted-foreground space-y-1">
                                    {alert.recommended_actions.slice(0, 3).map((action, index) => (
                                      <li key={index} className="flex items-center gap-2">
                                        <div className="w-1 h-1 bg-current rounded-full" />
                                        {action}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              
                              <div className="text-xs text-muted-foreground">
                                {new Date(alert.created_at).toLocaleString()}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 ml-4">
                            {!alert.acknowledged_at && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => acknowledgeAlert(alert.id)}
                              >
                                Acknowledge
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => dismissAlert(alert.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Alert>
                    );
                  })
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default RealTimeAlertsCenter;