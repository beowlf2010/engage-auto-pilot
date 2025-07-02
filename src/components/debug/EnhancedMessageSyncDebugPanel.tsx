import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  ChevronDown, 
  Bug, 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  Database, 
  MessageSquare,
  Clock,
  AlertTriangle,
  CheckCircle,
  Circle,
  Activity
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';

interface DebugMetrics {
  connectionHealth: {
    status: 'healthy' | 'degraded' | 'disconnected';
    lastPing: Date | null;
    latency: number | null;
  };
  messageCounts: {
    database: number;
    frontend: number;
    discrepancy: number;
  };
  unreadCounts: {
    database: number;
    frontend: number;
    discrepancy: number;
  };
  selectedLeadMessages: {
    database: number;
    frontend: number;
    lastSync: Date | null;
  };
  performanceMetrics: {
    avgLoadTime: number;
    lastLoadTime: number;
    cacheHitRate: number;
  };
}

interface EnhancedDebugPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  selectedLeadId?: string;
  connectionStatus?: any;
  frontendMessages?: any[];
}

const EnhancedMessageSyncDebugPanel: React.FC<EnhancedDebugPanelProps> = ({
  isOpen,
  onToggle,
  selectedLeadId,
  connectionStatus,
  frontendMessages = []
}) => {
  const [metrics, setMetrics] = useState<DebugMetrics>({
    connectionHealth: {
      status: 'disconnected',
      lastPing: null,
      latency: null
    },
    messageCounts: {
      database: 0,
      frontend: 0,
      discrepancy: 0
    },
    unreadCounts: {
      database: 0,
      frontend: 0,
      discrepancy: 0
    },
    selectedLeadMessages: {
      database: 0,
      frontend: frontendMessages.length,
      lastSync: null
    },
    performanceMetrics: {
      avgLoadTime: 0,
      lastLoadTime: 0,
      cacheHitRate: 0
    }
  });
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const { profile } = useAuth();

  const runDiagnostics = async () => {
    if (!profile) return;

    const startTime = Date.now();

    try {
      console.log('🔍 [ENHANCED DEBUG] Running comprehensive diagnostics...');

      // Test connection health with a simple ping
      const pingStart = Date.now();
      const { error: pingError } = await supabase
        .from('conversations')
        .select('id')
        .limit(1);
      const latency = Date.now() - pingStart;

      // Get total conversation counts
      const { data: allConversations, error: allError } = await supabase
        .from('conversations')
        .select('id, direction, read_at, lead_id')
        .order('sent_at', { ascending: false });

      if (allError) throw allError;

      const dbTotalMessages = allConversations?.length || 0;
      const dbUnreadCount = allConversations?.filter(c => c.direction === 'in' && !c.read_at).length || 0;

      // Get messages for selected lead if available
      let dbSelectedLeadMessages = 0;
      if (selectedLeadId) {
        const { data: leadMessages, error: leadError } = await supabase
          .from('conversations')
          .select('id')
          .eq('lead_id', selectedLeadId);

        if (!leadError) {
          dbSelectedLeadMessages = leadMessages?.length || 0;
        }
      }

      const loadTime = Date.now() - startTime;

      setMetrics(prev => ({
        connectionHealth: {
          status: pingError ? 'disconnected' : latency < 500 ? 'healthy' : 'degraded',
          lastPing: new Date(),
          latency: pingError ? null : latency
        },
        messageCounts: {
          database: dbTotalMessages,
          frontend: 0, // Would need to be passed from parent
          discrepancy: 0
        },
        unreadCounts: {
          database: dbUnreadCount,
          frontend: 0, // Would need to be passed from parent
          discrepancy: 0
        },
        selectedLeadMessages: {
          database: dbSelectedLeadMessages,
          frontend: frontendMessages.length,
          lastSync: new Date()
        },
        performanceMetrics: {
          avgLoadTime: (prev.performanceMetrics.avgLoadTime + loadTime) / 2,
          lastLoadTime: loadTime,
          cacheHitRate: prev.performanceMetrics.cacheHitRate
        }
      }));

      console.log('✅ [ENHANCED DEBUG] Diagnostics completed:', {
        latency,
        dbMessages: dbTotalMessages,
        dbUnread: dbUnreadCount,
        loadTime
      });

    } catch (error) {
      console.error('❌ [ENHANCED DEBUG] Diagnostics failed:', error);
      
      setMetrics(prev => ({
        ...prev,
        connectionHealth: {
          status: 'disconnected',
          lastPing: new Date(),
          latency: null
        }
      }));
    }
  };

  const testRealtimeConnection = async () => {
    console.log('🔗 [ENHANCED DEBUG] Testing realtime connection...');
    
    const testChannel = supabase
      .channel('debug-test-enhanced')
      .subscribe((status) => {
        console.log('🧪 [ENHANCED DEBUG] Test connection status:', status);
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ [ENHANCED DEBUG] Realtime connection test successful');
          supabase.removeChannel(testChannel);
        }
      });
  };

  const forceFullRefresh = () => {
    console.log('🔄 [ENHANCED DEBUG] Forcing full application refresh');
    
    // Clear all caches
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
      });
    }
    
    // Clear local storage
    localStorage.clear();
    sessionStorage.clear();
    
    // Reload page
    window.location.reload();
  };

  // Auto-refresh diagnostics
  useEffect(() => {
    if (autoRefresh && isOpen) {
      const interval = setInterval(runDiagnostics, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, isOpen]);

  // Run diagnostics when panel opens
  useEffect(() => {
    if (isOpen) {
      runDiagnostics();
    }
  }, [isOpen, selectedLeadId]);

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={onToggle}
        className="fixed bottom-4 right-4 z-50 bg-orange-100 border-orange-300 hover:bg-orange-200"
      >
        <Bug className="w-4 h-4 mr-2" />
        Enhanced Debug
      </Button>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'connected':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'disconnected':
      case 'error':
        return <Circle className="w-4 h-4 text-red-500" />;
      default:
        return <Circle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'connected':
        return 'default';
      case 'degraded':
        return 'secondary';
      case 'disconnected':
      case 'error':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96">
      <Card className="border-orange-200 bg-orange-50 shadow-xl">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center">
              <Activity className="w-4 h-4 mr-2" />
              Enhanced Message Debug
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={autoRefresh ? 'bg-green-100' : ''}
              >
                <RefreshCw className={`w-3 h-3 ${autoRefresh ? 'animate-spin' : ''}`} />
              </Button>
              <Button variant="ghost" size="sm" onClick={onToggle}>
                ×
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Connection Health */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-gray-700">Connection Health</h4>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center justify-between text-xs">
                <span>Database:</span>
                <div className="flex items-center gap-1">
                  {getStatusIcon(metrics.connectionHealth.status)}
                  <Badge variant={getStatusColor(metrics.connectionHealth.status) as any} className="text-xs">
                    {metrics.connectionHealth.status}
                  </Badge>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-xs">
                <span>Real-time:</span>
                <div className="flex items-center gap-1">
                  {getStatusIcon(connectionStatus?.status || 'disconnected')}
                  <Badge variant={getStatusColor(connectionStatus?.status) as any} className="text-xs">
                    {connectionStatus?.status || 'unknown'}
                  </Badge>
                </div>
              </div>
            </div>

            {metrics.connectionHealth.latency && (
              <div className="text-xs text-gray-600">
                Latency: {metrics.connectionHealth.latency}ms
              </div>
            )}
          </div>

          {/* Message Counts Comparison */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-gray-700">Message Count Validation</h4>
            
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>DB Total:</span>
                <Badge variant="outline">{metrics.messageCounts.database}</Badge>
              </div>
              <div className="flex justify-between">
                <span>DB Unread:</span>
                <Badge variant="outline">{metrics.unreadCounts.database}</Badge>
              </div>
              
              {selectedLeadId && (
                <div className="flex justify-between border-t pt-1 mt-2">
                  <span>Selected Lead (DB):</span>
                  <Badge variant="outline">{metrics.selectedLeadMessages.database}</Badge>
                </div>
              )}
              
              {selectedLeadId && (
                <div className="flex justify-between">
                  <span>Selected Lead (UI):</span>
                  <Badge variant={
                    metrics.selectedLeadMessages.database === metrics.selectedLeadMessages.frontend 
                      ? "default" 
                      : "destructive"
                  }>
                    {metrics.selectedLeadMessages.frontend}
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-gray-700">Performance</h4>
            
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Last Load:</span>
                <span>{metrics.performanceMetrics.lastLoadTime}ms</span>
              </div>
              
              {metrics.connectionHealth.lastPing && (
                <div className="text-xs text-gray-600">
                  Last check: {metrics.connectionHealth.lastPing.toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button size="sm" onClick={runDiagnostics} className="flex-1">
              <Database className="w-3 h-3 mr-1" />
              Diagnose
            </Button>
            <Button size="sm" onClick={testRealtimeConnection} variant="outline" className="flex-1">
              <Wifi className="w-3 h-3 mr-1" />
              Test RT
            </Button>
          </div>

          {/* Emergency Actions */}
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full">
                <ChevronDown className="w-3 h-3 mr-2" />
                Emergency Actions
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2">
              <Button 
                size="sm" 
                onClick={forceFullRefresh} 
                variant="destructive" 
                className="w-full text-xs"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Force Full Refresh
              </Button>
              
              <div className="text-xs space-y-1 p-2 bg-gray-100 rounded">
                <div>Profile ID: {profile?.id?.slice(0, 8)}...</div>
                <div>Selected Lead: {selectedLeadId?.slice(0, 8) || 'None'}</div>
                <div>Reconnect Attempts: {connectionStatus?.reconnectAttempts || 0}</div>
                <div>Auto Refresh: {autoRefresh ? 'ON' : 'OFF'}</div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedMessageSyncDebugPanel;