
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Bug, RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';

interface DebugLog {
  id: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error';
  component: string;
  action: string;
  data: any;
  error?: string;
}

interface MessageDebugPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  leadId?: string;
}

const MessageDebugPanel: React.FC<MessageDebugPanelProps> = ({
  isOpen,
  onToggle,
  leadId
}) => {
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const { profile } = useAuth();

  // Add debug log function
  const addDebugLog = (level: 'info' | 'warn' | 'error', component: string, action: string, data: any, error?: string) => {
    const log: DebugLog = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      level,
      component,
      action,
      data,
      error
    };
    setLogs(prev => [log, ...prev.slice(0, 49)]); // Keep last 50 logs
  };

  // Expose debug function globally for other components to use
  useEffect(() => {
    (window as any).debugLog = addDebugLog;
    return () => {
      delete (window as any).debugLog;
    };
  }, []);

  const clearLogs = () => {
    setLogs([]);
  };

  const testProfileData = () => {
    addDebugLog('info', 'Debug Panel', 'Profile Test', {
      hasProfile: !!profile,
      profileStructure: profile ? {
        id: typeof profile.id,
        first_name: typeof profile.first_name,
        email: typeof profile.email,
        profileKeys: Object.keys(profile)
      } : null,
      profileData: profile
    });
  };

  const testLeadData = async () => {
    if (!leadId) {
      addDebugLog('warn', 'Debug Panel', 'Lead Test', { error: 'No lead ID provided' });
      return;
    }

    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select(`
          id,
          first_name,
          last_name,
          status,
          phone_numbers (
            number,
            is_primary
          )
        `)
        .eq('id', leadId)
        .single();

      addDebugLog('info', 'Debug Panel', 'Lead Test', {
        leadId,
        leadFound: !!lead,
        error: leadError?.message,
        leadData: lead,
        phoneCount: lead?.phone_numbers?.length || 0,
        primaryPhone: lead?.phone_numbers?.find((p: any) => p.is_primary)?.number
      });
    } catch (error) {
      addDebugLog('error', 'Debug Panel', 'Lead Test', { leadId }, error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'info': return <CheckCircle className="w-4 h-4 text-blue-500" />;
      case 'warn': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Bug className="w-4 h-4 text-gray-500" />;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'info': return 'border-blue-200 bg-blue-50';
      case 'warn': return 'border-yellow-200 bg-yellow-50';
      case 'error': return 'border-red-200 bg-red-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={onToggle}
        className="fixed bottom-4 right-4 z-50"
      >
        <Bug className="w-4 h-4 mr-2" />
        Debug
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 w-96 max-h-96 z-50 shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Bug className="w-4 h-4" />
            Message Debug Panel
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={clearLogs}>
              <RefreshCw className="w-3 h-3" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onToggle}>
              ×
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-2">
        {/* Test Buttons */}
        <div className="flex gap-2 mb-3">
          <Button variant="outline" size="sm" onClick={testProfileData}>
            Test Profile
          </Button>
          <Button variant="outline" size="sm" onClick={testLeadData} disabled={!leadId}>
            Test Lead
          </Button>
        </div>

        {/* Logs */}
        <div className="max-h-48 overflow-y-auto space-y-1">
          {logs.length === 0 ? (
            <div className="text-xs text-gray-500 text-center py-4">
              No debug logs yet. Send a message to see debugging info.
            </div>
          ) : (
            logs.map((log) => (
              <Collapsible key={log.id}>
                <CollapsibleTrigger className={`w-full text-left p-2 rounded border text-xs ${getLevelColor(log.level)}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getLevelIcon(log.level)}
                      <span className="font-medium">{log.component}</span>
                      <span>-</span>
                      <span>{log.action}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {log.timestamp.toLocaleTimeString()}
                      </Badge>
                      <ChevronDown className="w-3 h-3" />
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="px-2 pb-2">
                  <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                    {JSON.stringify(log.data, null, 2)}
                  </pre>
                  {log.error && (
                    <div className="mt-1 text-xs text-red-600 font-medium">
                      Error: {log.error}
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MessageDebugPanel;
