
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Bug, RefreshCw, Wifi, WifiOff, Database, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';

interface MessageSyncDebugPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  selectedLeadId?: string;
}

interface SyncStatus {
  realtimeConnected: boolean;
  lastMessageSync: Date | null;
  conversationCounts: {
    database: number;
    frontend: number;
  };
  unreadCounts: {
    database: number;
    frontend: number;
  };
}

const MessageSyncDebugPanel: React.FC<MessageSyncDebugPanelProps> = ({
  isOpen,
  onToggle,
  selectedLeadId
}) => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    realtimeConnected: false,
    lastMessageSync: null,
    conversationCounts: { database: 0, frontend: 0 },
    unreadCounts: { database: 0, frontend: 0 }
  });
  const [isExpanded, setIsExpanded] = useState(false);
  const { profile } = useAuth();

  const checkSyncStatus = async () => {
    if (!profile) return;

    try {
      // Check database conversation count
      const { data: conversations, error } = await supabase
        .from('conversations')
        .select('id, direction, read_at, lead_id')
        .order('sent_at', { ascending: false });

      if (error) {
        console.error('Error checking sync status:', error);
        return;
      }

      const dbConversationCount = conversations?.length || 0;
      const dbUnreadCount = conversations?.filter(c => c.direction === 'in' && !c.read_at).length || 0;

      setSyncStatus(prev => ({
        ...prev,
        conversationCounts: {
          database: dbConversationCount,
          frontend: prev.conversationCounts.frontend
        },
        unreadCounts: {
          database: dbUnreadCount,
          frontend: prev.unreadCounts.frontend
        },
        lastMessageSync: new Date()
      }));

      console.log('🔍 Sync Status Check:', {
        dbConversations: dbConversationCount,
        dbUnread: dbUnreadCount,
        selectedLead: selectedLeadId
      });

    } catch (error) {
      console.error('Error in sync status check:', error);
    }
  };

  const testRealtimeConnection = () => {
    const testChannel = supabase
      .channel('debug-test')
      .subscribe((status) => {
        setSyncStatus(prev => ({
          ...prev,
          realtimeConnected: status === 'SUBSCRIBED'
        }));
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time connection test successful');
          supabase.removeChannel(testChannel);
        }
      });
  };

  const forceRefresh = () => {
    console.log('🔄 Force refreshing message sync');
    window.location.reload();
  };

  useEffect(() => {
    if (isOpen) {
      checkSyncStatus();
      testRealtimeConnection();
    }
  }, [isOpen, profile]);

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
    <div className="fixed bottom-4 right-4 z-50 w-80">
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center">
              <Bug className="w-4 h-4 mr-2" />
              Message Sync Debug
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onToggle}>
              ×
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3">
          {/* Connection Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm">Real-time Connection:</span>
            <Badge variant={syncStatus.realtimeConnected ? "default" : "destructive"}>
              {syncStatus.realtimeConnected ? (
                <><Wifi className="w-3 h-3 mr-1" />Connected</>
              ) : (
                <><WifiOff className="w-3 h-3 mr-1" />Disconnected</>
              )}
            </Badge>
          </div>

          {/* Sync Counts */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>DB Conversations:</span>
              <Badge variant="outline">{syncStatus.conversationCounts.database}</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>DB Unread:</span>
              <Badge variant="outline">{syncStatus.unreadCounts.database}</Badge>
            </div>
          </div>

          {/* Last Sync */}
          {syncStatus.lastMessageSync && (
            <div className="text-xs text-gray-600">
              Last check: {syncStatus.lastMessageSync.toLocaleTimeString()}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button size="sm" onClick={checkSyncStatus} className="flex-1">
              <Database className="w-3 h-3 mr-1" />
              Check DB
            </Button>
            <Button size="sm" onClick={forceRefresh} variant="outline" className="flex-1">
              <RefreshCw className="w-3 h-3 mr-1" />
              Refresh
            </Button>
          </div>

          {/* Detailed Debug Info */}
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full">
                <ChevronDown className="w-3 h-3 mr-2" />
                Detailed Debug
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="text-xs space-y-1 p-2 bg-gray-100 rounded">
                <div>Profile ID: {profile?.id?.slice(0, 8)}...</div>
                <div>Selected Lead: {selectedLeadId?.slice(0, 8) || 'None'}</div>
                <div>User Agent: {navigator.userAgent.slice(0, 50)}...</div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
    </div>
  );
};

export default MessageSyncDebugPanel;
